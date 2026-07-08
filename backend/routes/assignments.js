const express = require('express');
const assignments = require('../repositories/product-data');
const { asyncRoute, sendNotFound, sendValidationError } = require('../middleware/api');
const { cleanString, validateAssignmentPayload } = require('../validation/product-validation');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
    res.json({
        assignments: await assignments.listAssignments(req.user.id, {
            subjectId: req.query.subjectId || req.query.courseId || null,
            status: req.query.status || null
        })
    });
}));

router.get('/:id', asyncRoute(async (req, res) => {
    const assignment = await assignments.getAssignment(req.user.id, req.params.id);
    if (!assignment) return sendNotFound(res, 'Assignment');

    return res.json({ assignment });
}));

router.post('/', asyncRoute(async (req, res) => {
    const validation = validateAssignmentPayload(req.body);
    if (!validation.isValid) return sendValidationError(res, validation);

    const assignment = await assignments.createAssignment(req.user.id, validation.values);
    return res.status(201).json({ assignment });
}));

router.put('/', asyncRoute(async (req, res) => {
    const incomingAssignments = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
    const normalizedAssignments = [];
    const errors = {};

    incomingAssignments.forEach((assignment, index) => {
        const validation = validateAssignmentPayload({
            ...assignment,
            subjectId: assignment.subjectId || assignment.courseId,
            description: assignment.description ?? assignment.desc
        });

        if (!validation.isValid) {
            errors[index] = validation.errors;
            return;
        }

        normalizedAssignments.push({
            ...validation.values,
            id: cleanString(assignment.id, 160),
            createdAt: Number(assignment.createdAt) || Date.now(),
            updatedAt: Number(assignment.updatedAt) || Date.now()
        });
    });

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ error: 'Assignments are invalid.', errors });
    }

    await assignments.withTransaction((client) => assignments.replaceAssignments(req.user.id, normalizedAssignments, client));
    return res.json({ assignments: await assignments.listAssignments(req.user.id) });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
    const validation = validateAssignmentPayload(req.body, { partial: true });
    if (!validation.isValid) return sendValidationError(res, validation);

    const assignment = await assignments.updateAssignment(req.user.id, req.params.id, validation.values);
    if (!assignment) return sendNotFound(res, 'Assignment');

    return res.json({ assignment });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
    const deleted = await assignments.deleteAssignment(req.user.id, req.params.id);
    if (!deleted) return sendNotFound(res, 'Assignment');

    return res.status(204).send();
}));

module.exports = router;
