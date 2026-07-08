const express = require('express');
const preferencesRepository = require('../repositories/product-data');
const { asyncRoute, sendValidationError } = require('../middleware/api');
const { validatePreferencesPayload } = require('../validation/product-validation');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
    res.json({ preferences: await preferencesRepository.getPreferences(req.user.id) });
}));

router.patch('/', asyncRoute(async (req, res) => {
    const current = await preferencesRepository.getPreferences(req.user.id);
    const validation = validatePreferencesPayload({ ...current, ...req.body });
    if (!validation.isValid) return sendValidationError(res, validation);

    const preferences = await preferencesRepository.upsertPreferences(req.user.id, validation.values);
    return res.json({ preferences });
}));

module.exports = router;
