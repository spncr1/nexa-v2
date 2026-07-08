const express = require('express');
const tasks = require('../repositories/product-data');
const { asyncRoute, sendNotFound, sendValidationError } = require('../middleware/api');
const { cleanString, isDateString, validateTaskPayload } = require('../validation/product-validation');

const router = express.Router();

function groupTasksByDate(list) {
    return list.reduce((grouped, task) => {
        const key = task.scheduledDate || 'unscheduled';
        if (!Array.isArray(grouped[key])) grouped[key] = [];
        grouped[key].push(task);
        return grouped;
    }, {});
}

router.get('/', asyncRoute(async (req, res) => {
    const { date, from, to } = req.query;

    if (date && !isDateString(date)) {
        return res.status(422).json({ error: 'Date must be YYYY-MM-DD.' });
    }

    if ((from || to) && (!isDateString(from) || !isDateString(to))) {
        return res.status(422).json({ error: 'Date range must use YYYY-MM-DD.' });
    }

    const taskList = await tasks.listTasks(req.user.id, { date, from, to });
    return res.json({
        tasks: taskList,
        tasksByDate: groupTasksByDate(taskList)
    });
}));

router.post('/', asyncRoute(async (req, res) => {
    const validation = validateTaskPayload(req.body);
    if (!validation.isValid) return sendValidationError(res, validation);

    const task = await tasks.createTask(req.user.id, validation.values);
    return res.status(201).json({ task });
}));

function flattenTasksPayload(body = {}) {
    if (Array.isArray(body.tasks)) {
        return body.tasks;
    }

    const tasksByDate = body.tasksByDate && typeof body.tasksByDate === 'object' ? body.tasksByDate : {};
    return Object.entries(tasksByDate).flatMap(([scheduledDate, list]) => {
        if (!Array.isArray(list)) return [];
        return list.map((task) => ({ ...task, scheduledDate }));
    });
}

router.put('/', asyncRoute(async (req, res) => {
    const incomingTasks = flattenTasksPayload(req.body);
    const normalizedTasks = [];
    const errors = {};

    incomingTasks.forEach((task, index) => {
        const validation = validateTaskPayload(task);
        if (!validation.isValid) {
            errors[index] = validation.errors;
            return;
        }

        normalizedTasks.push({
            ...validation.values,
            id: cleanString(task.id, 160),
            done: validation.values.status === 'completed',
            createdAt: Number(task.createdAt) || Date.now(),
            updatedAt: Number(task.updatedAt) || Date.now()
        });
    });

    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ error: 'Tasks are invalid.', errors });
    }

    await tasks.withTransaction((client) => tasks.replaceTasks(req.user.id, normalizedTasks, client));
    const taskList = await tasks.listTasks(req.user.id);
    return res.json({
        tasks: taskList,
        tasksByDate: groupTasksByDate(taskList)
    });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
    const validation = validateTaskPayload(req.body, { partial: true });
    if (!validation.isValid) return sendValidationError(res, validation);

    const task = await tasks.updateTask(req.user.id, req.params.id, validation.values);
    if (!task) return sendNotFound(res, 'Task');

    return res.json({ task });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
    const deleted = await tasks.deleteTask(req.user.id, req.params.id);
    if (!deleted) return sendNotFound(res, 'Task');

    return res.status(204).send();
}));

module.exports = router;
