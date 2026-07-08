const express = require('express');
const { asyncRoute } = require('../middleware/api');
const { sendAssignmentReminderDigest } = require('../services/reminders');

const router = express.Router();

router.post('/email-digest', asyncRoute(async (req, res) => {
    const result = await sendAssignmentReminderDigest(req.user, {
        force: req.body?.force === true
    });

    res.json(result);
}));

module.exports = router;
