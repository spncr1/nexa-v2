const express = require('express');
const subjects = require('../repositories/product-data');
const { asyncRoute, sendNotFound, sendValidationError } = require('../middleware/api');
const { cleanString, validateSubjectPayload } = require('../validation/product-validation');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
    res.json({ subjects: await subjects.listSubjects(req.user.id) });
}));

router.post('/', asyncRoute(async (req, res) => {
    const validation = validateSubjectPayload(req.body);
    if (!validation.isValid) return sendValidationError(res, validation);

    const subject = await subjects.createSubject(req.user.id, validation.values);
    return res.status(201).json({ subject });
}));

router.put('/', asyncRoute(async (req, res) => {
    const incomingSubjects = Array.isArray(req.body?.subjects) ? req.body.subjects : [];
    const normalizedSubjects = [];
    const errors = {};

    incomingSubjects.forEach((subject, index) => {
        const validation = validateSubjectPayload(subject);
        if (!validation.isValid) {
            errors[index] = validation.errors;
            return;
        }

        normalizedSubjects.push({
            ...validation.values,
            id: cleanString(subject.id, 160),
            createdAt: Number(subject.createdAt) || Date.now(),
            updatedAt: Number(subject.updatedAt) || Date.now()
        });
    });

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ error: 'Subjects are invalid.', errors });
    }

    await subjects.withTransaction((client) => subjects.replaceSubjects(req.user.id, normalizedSubjects, client));
    return res.json({ subjects: await subjects.listSubjects(req.user.id) });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
    const validation = validateSubjectPayload(req.body, { partial: true });
    if (!validation.isValid) return sendValidationError(res, validation);

    const subject = await subjects.updateSubject(req.user.id, req.params.id, validation.values);
    if (!subject) return sendNotFound(res, 'Subject');

    return res.json({ subject });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
    const deleted = await subjects.deleteSubject(req.user.id, req.params.id);
    if (!deleted) return sendNotFound(res, 'Subject');

    return res.status(204).send();
}));

module.exports = router;
