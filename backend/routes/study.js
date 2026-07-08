const express = require('express');
const study = require('../repositories/product-data');
const { asyncRoute, sendNotFound, sendValidationError } = require('../middleware/api');
const {
    STUDY_COLLECTIONS,
    validateStudyGoalPayload,
    validateStudySessionPayload
} = require('../validation/product-validation');

const router = express.Router();

router.get('/sessions', asyncRoute(async (req, res) => {
    const collection = req.query.collection || null;
    if (collection && !STUDY_COLLECTIONS.has(collection)) {
        return res.status(422).json({ error: 'Study collection is invalid.' });
    }

    res.json({
        sessions: await study.listStudySessions(req.user.id, { collection })
    });
}));

router.post('/sessions', asyncRoute(async (req, res) => {
    const validation = validateStudySessionPayload(req.body);
    if (!validation.isValid) return sendValidationError(res, validation);

    const session = await study.createStudySession(req.user.id, {
        ...validation.values,
        collection: validation.values.collection || 'queue'
    });
    return res.status(201).json({ session });
}));

router.put('/sessions', asyncRoute(async (req, res) => {
    const collection = req.body?.collection;
    const incomingSessions = Array.isArray(req.body?.sessions) ? req.body.sessions : [];
    const normalizedSessions = [];
    const errors = {};

    if (!STUDY_COLLECTIONS.has(collection) || collection === 'active') {
        return res.status(422).json({ error: 'Study collection must be queue, completed, or favourite.' });
    }

    incomingSessions.forEach((session, index) => {
        const validation = validateStudySessionPayload({ ...session, collection });
        if (!validation.isValid) {
            errors[index] = validation.errors;
            return;
        }

        normalizedSessions.push({
            ...session,
            ...validation.values,
            id: session.id,
            collection,
            queuePosition: collection === 'queue' ? index : null,
            createdAt: Number(session.createdAt) || Date.now(),
            updatedAt: Number(session.updatedAt) || Date.now()
        });
    });

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ error: 'Study sessions are invalid.', errors });
    }

    await study.withTransaction((client) => study.replaceStudySessions(req.user.id, collection, normalizedSessions, client));
    return res.json({ sessions: await study.listStudySessions(req.user.id, { collection }) });
}));

router.patch('/sessions/:id', asyncRoute(async (req, res) => {
    const validation = validateStudySessionPayload(req.body, { partial: true });
    if (!validation.isValid) return sendValidationError(res, validation);

    const session = await study.updateStudySession(req.user.id, req.params.id, validation.values);
    if (!session) return sendNotFound(res, 'Study session');

    return res.json({ session });
}));

router.delete('/sessions/:id', asyncRoute(async (req, res) => {
    const deleted = await study.deleteStudySession(req.user.id, req.params.id);
    if (!deleted) return sendNotFound(res, 'Study session');

    return res.status(204).send();
}));

router.get('/active-session', asyncRoute(async (req, res) => {
    res.json({ session: await study.getActiveStudySession(req.user.id) });
}));

router.put('/active-session', asyncRoute(async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0 || req.body.session === null) {
        await study.replaceActiveStudySession(req.user.id, null);
        return res.json({ session: null });
    }

    const body = req.body.session && typeof req.body.session === 'object' ? req.body.session : req.body;
    const validation = validateStudySessionPayload(body);
    if (!validation.isValid) return sendValidationError(res, validation);

    const session = await study.replaceActiveStudySession(req.user.id, {
        ...body,
        ...validation.values,
        collection: 'active'
    });

    return res.json({ session });
}));

router.delete('/active-session', asyncRoute(async (req, res) => {
    await study.replaceActiveStudySession(req.user.id, null);
    return res.status(204).send();
}));

router.get('/goals', asyncRoute(async (req, res) => {
    res.json({ goals: await study.listStudyGoals(req.user.id) });
}));

router.put('/goals/:period', asyncRoute(async (req, res) => {
    const period = req.params.period === 'month' ? 'month' : req.params.period === 'week' ? 'week' : null;
    if (!period) {
        return res.status(422).json({ error: 'Study goal period must be week or month.' });
    }

    const validation = validateStudyGoalPayload(req.body);
    if (!validation.isValid) return sendValidationError(res, validation);

    const goal = await study.upsertStudyGoal(req.user.id, period, {
        ...validation.values,
        updatedAt: Date.now()
    });

    return res.json({ goal });
}));

router.delete('/goals/:period', asyncRoute(async (req, res) => {
    const period = req.params.period === 'month' ? 'month' : req.params.period === 'week' ? 'week' : null;
    if (!period) {
        return res.status(422).json({ error: 'Study goal period must be week or month.' });
    }

    await study.deleteStudyGoal(req.user.id, period);
    return res.status(204).send();
}));

module.exports = router;
