const PRIORITIES = new Set(['low', 'medium', 'high']);
const WORK_STATUSES = new Set(['not-started', 'in-progress', 'completed']);
const STUDY_TYPES = new Set(['deep', 'standard', 'light', 'custom']);
const STUDY_COLLECTIONS = new Set(['queue', 'completed', 'favourite', 'active']);
const THEME_MODES = new Set(['system', 'light', 'dark']);

function cleanString(value, maxLength = 1000) {
    return String(value || '').trim().slice(0, maxLength);
}

function hasOwn(source, key) {
    return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function isDateString(value) {
    if (value === null || value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTimeString(value) {
    if (value === null || value === '') return true;
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
}

function finish(values, errors) {
    return {
        isValid: Object.keys(errors).length === 0,
        values,
        errors
    };
}

function validateSubjectPayload(body = {}, options = {}) {
    const values = {};
    const errors = {};

    if (!options.partial || hasOwn(body, 'name')) {
        values.name = cleanString(body.name, 160);
        if (!values.name) errors.name = 'Subject name is required.';
    }

    return finish(values, errors);
}

function validateAssignmentPayload(body = {}, options = {}) {
    const values = {};
    const errors = {};

    if (hasOwn(body, 'subjectId') || hasOwn(body, 'courseId')) {
        values.subjectId = cleanString(body.subjectId || body.courseId, 160) || null;
        if (!values.subjectId && !options.partial) {
            errors.subjectId = 'Subject is required.';
        }
    } else if (!options.partial) {
        values.subjectId = null;
        errors.subjectId = 'Subject is required.';
    }

    if (!options.partial || hasOwn(body, 'task')) {
        values.task = cleanString(body.task, 260);
        if (!values.task) errors.task = 'Assignment task is required.';
    }

    if (hasOwn(body, 'description') || hasOwn(body, 'desc')) {
        values.description = cleanString(body.description ?? body.desc, 5000);
    } else if (!options.partial) {
        values.description = '';
    }

    if (!options.partial || hasOwn(body, 'priority')) {
        values.priority = cleanString(body.priority || 'medium', 32).toLowerCase();
        if (!PRIORITIES.has(values.priority)) errors.priority = 'Priority must be low, medium, or high.';
    }

    if (!options.partial || hasOwn(body, 'status')) {
        values.status = cleanString(body.status || 'not-started', 32).toLowerCase();
        if (!WORK_STATUSES.has(values.status)) errors.status = 'Status must be not-started, in-progress, or completed.';
    }

    if (!options.partial || hasOwn(body, 'dueDate')) {
        values.dueDate = body.dueDate || null;
        if (!values.dueDate && !options.partial) {
            errors.dueDate = 'Due date is required.';
        } else if (!isDateString(values.dueDate)) {
            errors.dueDate = 'Due date must be YYYY-MM-DD.';
        }
    }

    if (!options.partial || hasOwn(body, 'weighting')) {
        values.weighting = numberOrNull(body.weighting);
        if (values.weighting === null && !options.partial) {
            errors.weighting = 'Weighting is required.';
        } else if (values.weighting !== null && (values.weighting < 0 || values.weighting > 100)) {
            errors.weighting = 'Weighting must be between 0 and 100.';
        }
    }

    return finish(values, errors);
}

function validateTaskPayload(body = {}, options = {}) {
    const values = {};
    const errors = {};

    if (!options.partial || hasOwn(body, 'title')) {
        values.title = cleanString(body.title, 260);
        if (!values.title) errors.title = 'Task title is required.';
    }

    if (hasOwn(body, 'notes') || !options.partial) {
        values.notes = cleanString(body.notes, 5000);
    }

    if (!options.partial || hasOwn(body, 'priority')) {
        values.priority = cleanString(body.priority || 'medium', 32).toLowerCase();
        if (!PRIORITIES.has(values.priority)) errors.priority = 'Priority must be low, medium, or high.';
    }

    if (!options.partial || hasOwn(body, 'status')) {
        values.status = cleanString(body.status || 'not-started', 32).toLowerCase();
        if (!WORK_STATUSES.has(values.status)) errors.status = 'Status must be not-started, in-progress, or completed.';
    }

    if (!options.partial || hasOwn(body, 'scheduledDate')) {
        values.scheduledDate = body.scheduledDate || null;
        if (!values.scheduledDate && !options.partial) {
            errors.scheduledDate = 'Scheduled date is required.';
        } else if (!isDateString(values.scheduledDate)) {
            errors.scheduledDate = 'Scheduled date must be YYYY-MM-DD.';
        }
    }

    if (!options.partial || hasOwn(body, 'scheduledTime')) {
        values.scheduledTime = body.scheduledTime || null;
        if (!isTimeString(values.scheduledTime)) errors.scheduledTime = 'Scheduled time must be HH:MM.';
    }

    if (hasOwn(body, 'scheduledHour')) {
        values.scheduledHour = integerOrNull(body.scheduledHour);
        if (values.scheduledHour !== null && (values.scheduledHour < 0 || values.scheduledHour > 23)) {
            errors.scheduledHour = 'Scheduled hour must be between 0 and 23.';
        }
    }

    if (hasOwn(body, 'scheduledMinute')) {
        values.scheduledMinute = integerOrNull(body.scheduledMinute);
        if (values.scheduledMinute !== null && (values.scheduledMinute < 0 || values.scheduledMinute > 59)) {
            errors.scheduledMinute = 'Scheduled minute must be between 0 and 59.';
        }
    }

    return finish(values, errors);
}

function validateStudySessionPayload(body = {}, options = {}) {
    const values = {};
    const errors = {};

    if (!options.partial || hasOwn(body, 'title')) {
        values.title = cleanString(body.title, 260);
        if (!values.title) errors.title = 'Session title is required.';
    }

    if (!options.partial || hasOwn(body, 'type')) {
        values.type = cleanString(body.type || 'standard', 32).toLowerCase();
        if (!STUDY_TYPES.has(values.type)) errors.type = 'Study type must be deep, standard, light, or custom.';
    }

    if (!options.partial || hasOwn(body, 'durationSeconds')) {
        values.durationSeconds = integerOrNull(body.durationSeconds);
        if (!values.durationSeconds || values.durationSeconds <= 0) {
            errors.durationSeconds = 'Duration must be a positive number of seconds.';
        }
    }

    if (hasOwn(body, 'durationMinutes')) {
        values.durationMinutes = numberOrNull(body.durationMinutes);
    }

    if (hasOwn(body, 'notes') || !options.partial) {
        values.notes = cleanString(body.notes, 5000);
    }

    if (hasOwn(body, 'collection')) {
        values.collection = cleanString(body.collection, 32).toLowerCase();
        if (!STUDY_COLLECTIONS.has(values.collection)) errors.collection = 'Study collection is invalid.';
    }

    if (hasOwn(body, 'status')) values.status = cleanString(body.status, 32).toLowerCase();
    if (hasOwn(body, 'remainingSeconds')) values.remainingSeconds = integerOrNull(body.remainingSeconds);
    if (hasOwn(body, 'totalSeconds')) values.totalSeconds = integerOrNull(body.totalSeconds);

    return finish(values, errors);
}

function validateStudyGoalPayload(body = {}) {
    const focusBalance = body.focusBalance && typeof body.focusBalance === 'object' ? body.focusBalance : {};
    const values = {
        targetSessions: integerOrNull(body.targetSessions) || 0,
        targetFocusSeconds: integerOrNull(body.targetFocusSeconds) || 0,
        activeDays: integerOrNull(body.activeDays) || 0,
        focusBalance: {
            deep: integerOrNull(focusBalance.deep) || 0,
            standard: integerOrNull(focusBalance.standard) || 0,
            light: integerOrNull(focusBalance.light) || 0
        }
    };
    const errors = {};

    if (values.targetSessions < 0) errors.targetSessions = 'Target sessions cannot be negative.';
    if (values.targetFocusSeconds < 0) errors.targetFocusSeconds = 'Target focus time cannot be negative.';
    if (values.activeDays < 0) errors.activeDays = 'Active days cannot be negative.';

    const balanceValues = Object.values(values.focusBalance);
    if (balanceValues.some((value) => value < 0 || value > 100)) {
        errors.focusBalance = 'Focus balance values must be between 0 and 100.';
    }

    const balanceTotal = balanceValues.reduce((total, value) => total + value, 0);
    if (balanceTotal > 0 && balanceTotal !== 100) {
        errors.focusBalance = 'Focus balance must total 100.';
    }

    return finish(values, errors);
}

function validateProfilePayload(body = {}) {
    return finish({
        age: cleanString(body.age, 32),
        location: cleanString(body.location, 160),
        university: cleanString(body.university, 200),
        degree: cleanString(body.degree, 200),
        yearLevel: cleanString(body.yearLevel, 80),
        semesterLabel: cleanString(body.semesterLabel, 160),
        avatarUrlOrData: String(body.avatarUrlOrData || body.avatar || '').trim()
    }, {});
}

function validatePreferencesPayload(body = {}) {
    const themeMode = cleanString(body.themeMode || 'system', 16);
    const errors = {};

    if (!THEME_MODES.has(themeMode)) {
        errors.themeMode = 'Theme mode must be system, light, or dark.';
    }

    return finish({
        themeMode,
        navCollapsed: Boolean(body.navCollapsed),
        navGroupState: body.navGroupState && typeof body.navGroupState === 'object' ? body.navGroupState : {},
        language: cleanString(body.language || 'en', 16),
        reducedMotion: Boolean(body.reducedMotion),
        notifications: body.notifications !== false,
        systemPreferences: body.systemPreferences && typeof body.systemPreferences === 'object' ? body.systemPreferences : {}
    }, errors);
}

module.exports = {
    PRIORITIES,
    WORK_STATUSES,
    STUDY_TYPES,
    STUDY_COLLECTIONS,
    cleanString,
    hasOwn,
    isDateString,
    isTimeString,
    numberOrNull,
    integerOrNull,
    validateSubjectPayload,
    validateAssignmentPayload,
    validateTaskPayload,
    validateStudySessionPayload,
    validateStudyGoalPayload,
    validateProfilePayload,
    validatePreferencesPayload
};
