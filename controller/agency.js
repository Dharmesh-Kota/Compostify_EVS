const User = require("../models/user.js");
const Points = require("../models/userPoints.js");
const Agency = require("../models/compostAgency.js");
const History = require("../models/history.js");
const Transaction = require("../models/transaction.js");

// Send the pending requests data to the agency home page
module.exports.queue = async (req, res) => {
    try {
        let queue = await Transaction.find({ status: 'pending', receiver: req.user.username }, {sender: 1, quantity: 1});
        return res.render('supply_requests_agency', {
            title: "Compsostify | Supply Requests",
            requests: queue
        });
    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}

// Confirm the supplies request sent by a user
module.exports.cofirm_supplies = async (req, res) => {
    try {
        console.log(req.body);
        await Transaction.findOneAndUpdate(
            { sender: req.body.sender, receiver: req.user.username, quantity: req.body.quantity, status: 'pending' },
            { $set: { status: 'accepted' } },
            { new: true }
          );

          const existingPoints = await Points.findOne({
            user: req.body.sender,
            "availablePoints.agency": req.user.username
        });

        if (existingPoints) {
            // If the document exists, update the points
            await Points.findOneAndUpdate(
                {
                    user: req.body.sender,
                    "availablePoints.agency": req.user.username
                },
                {
                    $inc: { "availablePoints.$.points": req.body.quantity * 10 }
                },
                {
                    new: true
                }
            );
        } else {
            // If the document does not exist, create a new entry
            await Points.findOneAndUpdate(
                {
                    user: req.body.sender
                },
                {
                    $addToSet: {
                        availablePoints: {
                            agency: req.user.username,
                            points: req.body.quantity * 10
                        }
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            );
        }

        req.flash('success', 'Supply accepted!');
        return res.redirect('back');

    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}

// Reject the supplies request sent by a user
module.exports.reject_reward = async (req, res) => {
    try {
        await Transaction.findOneAndUpdate(
            { sender: req.body.sender, receiver: req.user.username, quantity: req.body.quantity },
            { $set: { status: 'rejected' } },
            { new: true }
          );

        req.flash('success', 'Supply rejected!');
        return res.status(200).json({ message: 'Request rejected!'});

    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}

// Get the history of rewards redeemed by different users
module.exports.history = async (req, res) => {
    try {
        let history = await History.find({ sender: req.user.username }, {receiver: 1, reward: 1, createdAt: 1});
        if (history) {
            return res.render('agency_history', {
                title: "Compsostify | Reward History",
                history: history
            });
        }
    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}

// Get the list of rewards by composit Agency
module.exports.rewards = async (req, res) => {
    try {
        let rewards = await Agency.findOne({ user: req.user.username }, { reward: 1 });
        if (!rewards) {
            rewards = [];
        } else {
            rewards = rewards.reward;
        }
        return res.render('agency_rewards', {
            title: "Compsostify | Rewards",
            rewards: rewards
        });
    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}

// Add a reward for the composite agency
module.exports.add_reward = async (req, res) => {
    try {
        await Agency.findOneAndUpdate(
            { user: req.user.username },
            { 
              $addToSet: { reward: { name: req.body.name, point: req.body.point } }
            },
            { upsert: true, new: true }
          );

        req.flash('success', 'New reward added!');
        return res.redirect('back');

    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}

// Delete a reward
module.exports.delete_reward = async (req, res) => {
    try {
        const { name, point } = req.body;

        // Find and update the user's reward array to remove the specified reward
        await Agency.findOneAndUpdate(
            { user: req.user.username },
            { 
              $pull: { reward: { name: name, point: point } }
            },
            { new: true }
        );

        req.flash('success', 'Reward deleted successfully!');
        return res.redirect('back');
    } catch (error) {
        console.log('Error: ', error.message);
        return res.redirect('back');
    }
}