const express = require('express');
const profileRepository = require('../repositories/product-data');
const { asyncRoute, sendValidationError } = require('../middleware/api');
const { validateProfilePayload } = require('../validation/product-validation');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
    res.json({ profile: await profileRepository.getProfile(req.user.id) });
}));

router.patch('/', asyncRoute(async (req, res) => {
    const current = await profileRepository.getProfile(req.user.id);
    const validation = validateProfilePayload({ ...current, ...req.body });
    if (!validation.isValid) return sendValidationError(res, validation);

    const profile = await profileRepository.upsertProfile(req.user.id, validation.values);
    return res.json({ profile });
}));

module.exports = router;
