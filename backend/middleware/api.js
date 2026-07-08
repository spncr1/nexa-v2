const { formatDbError } = require('../database/db');

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function sendValidationError(res, validation) {
    return res.status(422).json({
        error: Object.values(validation.errors)[0] || 'Request is invalid.',
        errors: validation.errors
    });
}

function sendNotFound(res, label = 'Record') {
    return res.status(404).json({ error: `${label} not found.` });
}

function apiErrorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    if (error.code === '23505') {
        return res.status(409).json({ error: 'That record already exists.' });
    }

    if (error.code === '23503') {
        return res.status(422).json({ error: 'Related record does not exist.' });
    }

    if (error.code === '23514') {
        return res.status(422).json({ error: 'Request does not meet database rules.' });
    }

    if (error.code === 'EMAIL_REMINDERS_DISABLED') {
        return res.status(409).json({ error: 'Email reminders are turned off.' });
    }

    if (error.code === 'SMTP_CONFIG_MISSING' || error.code === 'SMTP_CONFIG_INVALID') {
        return res.status(503).json({ error: 'Email delivery is not configured on this server.' });
    }

    console.error('API request failed:', formatDbError(error));
    return res.status(500).json({ error: 'Could not complete that request right now.' });
}

module.exports = {
    asyncRoute,
    sendValidationError,
    sendNotFound,
    apiErrorHandler
};
