const crypto = require('crypto');
const { pool } = require('../database/db');
const productData = require('../repositories/product-data');
const {
    PRIORITIES,
    WORK_STATUSES,
    STUDY_TYPES,
    cleanString,
    isDateString,
    isTimeString,
    numberOrNull,
    integerOrNull
} = require('../validation/product-validation');

const STORAGE_KEYS = {
    tasks: 'tasksByDate',
    subjects: 'studenthub_subjects',
    assignments: 'studenthub_assignments',
    userName: 'studenthub_user_name',
    semester: 'studenthub_semester_label',
    navCollapsed: 'studenthub_nav_collapsed',
    navGroups: 'studenthub_nav_group_state',
    profileAge: 'studenthub_profile_age',
    profileLocation: 'studenthub_profile_location',
    profileUniversity: 'studenthub_profile_university',
    profileDegree: 'studenthub_profile_degree',
    profileYearLevel: 'studenthub_profile_year_level',
    profileAvatar: 'studenthub_profile_avatar',
    systemPreferences: 'studenthub_system_preferences',
    themeMode: 'studenthub_theme_mode',
    legacyDarkMode: 'darkMode',
    studyQueue: 'studenthub_study_queue',
    studyCompleted: 'studenthub_study_completed_sessions',
    studyFavourites: 'studenthub_study_favourites',
    studyActive: 'studenthub_study_active_session',
    studyWeeklyGoal: 'studenthub_study_weekly_goal',
    studyMonthlyGoal: 'studenthub_study_monthly_goal',
    studySuggestionOverrides: 'studenthub_study_suggestion_overrides'
};

function stableHash(value) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(value || {}))
        .digest('hex');
}

function parseJsonValue(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;

    try {
        return JSON.parse(String(value));
    } catch (error) {
        return fallback;
    }
}

function nowMs() {
    return Date.now();
}

function uniqueById(items) {
    const seen = new Set();
    const unique = [];

    items.forEach((item) => {
        if (!item?.id || seen.has(item.id)) return;
        seen.add(item.id);
        unique.push(item);
    });

    return unique;
}

function normalisePriority(value) {
    const priority = cleanString(value || 'medium', 32).toLowerCase();
    return PRIORITIES.has(priority) ? priority : 'medium';
}

function normaliseWorkStatus(value, done) {
    const status = done === true ? 'completed' : cleanString(value || 'not-started', 32).toLowerCase();
    return WORK_STATUSES.has(status) ? status : 'not-started';
}

function normaliseStudyType(value) {
    const type = cleanString(value || 'standard', 32).toLowerCase();
    return STUDY_TYPES.has(type) ? type : 'standard';
}

function normaliseDate(value) {
    return isDateString(value) && value ? value : null;
}

function normaliseTime(value) {
    return isTimeString(value) && value ? value : null;
}

function normaliseSubjects(storage) {
    const parsed = parseJsonValue(storage[STORAGE_KEYS.subjects], []);
    const seenNames = new Set();

    return uniqueById(
        (Array.isArray(parsed) ? parsed : [])
            .map((subject) => {
                const name = cleanString(subject?.name, 160);
                const lowerName = name.toLowerCase();
                if (!name || seenNames.has(lowerName)) return null;
                seenNames.add(lowerName);

                const createdAt = Number(subject?.createdAt) || nowMs();
                return {
                    id: cleanString(subject?.id || productData.createId('subject'), 160),
                    name,
                    createdAt,
                    updatedAt: Number(subject?.updatedAt) || createdAt
                };
            })
            .filter(Boolean)
    );
}

function normaliseAssignments(storage) {
    const parsed = parseJsonValue(storage[STORAGE_KEYS.assignments], []);

    return uniqueById(
        (Array.isArray(parsed) ? parsed : [])
            .map((assignment) => {
                const task = cleanString(assignment?.task, 260);
                if (!task) return null;

                const weighting = numberOrNull(assignment?.weighting);
                const createdAt = Number(assignment?.createdAt) || nowMs();

                return {
                    id: cleanString(assignment?.id || productData.createId('assignment'), 160),
                    subjectId: cleanString(assignment?.subjectId || assignment?.courseId, 160) || null,
                    task,
                    description: cleanString(assignment?.description ?? assignment?.desc, 5000),
                    priority: normalisePriority(assignment?.priority),
                    status: normaliseWorkStatus(assignment?.status),
                    dueDate: normaliseDate(assignment?.dueDate),
                    weighting: weighting === null || weighting < 0 || weighting > 100 ? null : weighting,
                    createdAt,
                    updatedAt: Number(assignment?.updatedAt) || createdAt
                };
            })
            .filter(Boolean)
    );
}

function normaliseTasks(storage) {
    const parsed = parseJsonValue(storage[STORAGE_KEYS.tasks], {});
    const tasks = [];

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return tasks;
    }

    Object.entries(parsed).forEach(([dateKey, list]) => {
        if (!isDateString(dateKey) || !Array.isArray(list)) return;

        list.forEach((task) => {
            const title = cleanString(task?.title, 260);
            if (!title) return;

            const scheduledHour = integerOrNull(task?.scheduledHour);
            const scheduledMinute = integerOrNull(task?.scheduledMinute);
            const scheduledTime = normaliseTime(task?.scheduledTime);
            const createdAt = Number(task?.createdAt) || nowMs();

            tasks.push({
                id: cleanString(task?.id || productData.createId('task'), 160),
                title,
                notes: cleanString(task?.notes, 5000),
                priority: normalisePriority(task?.priority),
                status: normaliseWorkStatus(task?.status, task?.done),
                done: task?.done === true || task?.status === 'completed',
                scheduledDate: dateKey,
                scheduledTime,
                scheduledHour: scheduledHour !== null && scheduledHour >= 0 && scheduledHour <= 23 ? scheduledHour : null,
                scheduledMinute: scheduledMinute !== null && scheduledMinute >= 0 && scheduledMinute <= 59 ? scheduledMinute : null,
                createdAt,
                updatedAt: Number(task?.updatedAt) || createdAt
            });
        });
    });

    return uniqueById(tasks);
}

function normaliseStudySession(session, collection, index = null) {
    const title = cleanString(session?.title, 260);
    const durationSeconds = integerOrNull(session?.durationSeconds || session?.totalSeconds);

    if (!title || !durationSeconds || durationSeconds <= 0) {
        return null;
    }

    const createdAt = Number(session?.createdAt) || nowMs();

    return {
        id: cleanString(session?.id || productData.createId('study_session'), 160),
        collection,
        title,
        type: normaliseStudyType(session?.type),
        durationSeconds,
        durationMinutes: numberOrNull(session?.durationMinutes) || durationSeconds / 60,
        notes: cleanString(session?.notes, 5000),
        status: cleanString(session?.status, 32) || null,
        queuePosition: Number.isInteger(index) ? index : null,
        remainingSeconds: integerOrNull(session?.remainingSeconds),
        totalSeconds: integerOrNull(session?.totalSeconds),
        sourceAssignmentId: cleanString(session?.sourceAssignmentId, 160) || null,
        sourceSessionId: cleanString(session?.sourceSessionId, 160) || null,
        runId: cleanString(session?.runId, 160) || null,
        isRepeating: session?.isRepeating === true || session?.isLooping === true,
        isStandalone: session?.isStandalone === true,
        startedAt: Number(session?.startedAt) || null,
        lastTickAt: Number(session?.lastTickAt) || null,
        completedAt: Number(session?.completedAt) || null,
        createdAt,
        updatedAt: Number(session?.updatedAt) || createdAt
    };
}

function normaliseStudyList(storage, key, collection) {
    const parsed = parseJsonValue(storage[key], []);
    return uniqueById(
        (Array.isArray(parsed) ? parsed : [])
            .map((session, index) => normaliseStudySession(session, collection, index))
            .filter(Boolean)
    );
}

function normaliseStudyActive(storage) {
    const parsed = parseJsonValue(storage[STORAGE_KEYS.studyActive], null);
    return parsed && typeof parsed === 'object'
        ? normaliseStudySession(parsed, 'active')
        : null;
}

function normaliseStudyGoal(storage, key) {
    const parsed = parseJsonValue(storage[key], null);
    if (!parsed || typeof parsed !== 'object') return null;

    const focusBalance = parsed.focusBalance && typeof parsed.focusBalance === 'object'
        ? parsed.focusBalance
        : {};

    return {
        targetSessions: Math.max(0, integerOrNull(parsed.targetSessions) || 0),
        targetFocusSeconds: Math.max(0, integerOrNull(parsed.targetFocusSeconds) || 0),
        activeDays: Math.max(0, integerOrNull(parsed.activeDays) || 0),
        focusBalance: {
            deep: Math.max(0, integerOrNull(focusBalance.deep) || 0),
            standard: Math.max(0, integerOrNull(focusBalance.standard) || 0),
            light: Math.max(0, integerOrNull(focusBalance.light) || 0)
        },
        updatedAt: Number(parsed.updatedAt) || nowMs()
    };
}

function normaliseProfile(storage) {
    return {
        age: cleanString(storage[STORAGE_KEYS.profileAge], 32),
        location: cleanString(storage[STORAGE_KEYS.profileLocation], 160),
        university: cleanString(storage[STORAGE_KEYS.profileUniversity], 200),
        degree: cleanString(storage[STORAGE_KEYS.profileDegree], 200),
        yearLevel: cleanString(storage[STORAGE_KEYS.profileYearLevel], 80),
        semesterLabel: cleanString(storage[STORAGE_KEYS.semester], 160),
        avatarUrlOrData: String(storage[STORAGE_KEYS.profileAvatar] || '').trim()
    };
}

function normalisePreferences(storage) {
    const systemPreferences = parseJsonValue(storage[STORAGE_KEYS.systemPreferences], {});
    const navGroupState = parseJsonValue(storage[STORAGE_KEYS.navGroups], {});
    const rawThemeMode = cleanString(storage[STORAGE_KEYS.themeMode], 16);
    const legacyDarkMode = storage[STORAGE_KEYS.legacyDarkMode] === '1';
    const themeMode = ['system', 'light', 'dark'].includes(rawThemeMode)
        ? rawThemeMode
        : legacyDarkMode ? 'dark' : 'light';

    return {
        themeMode,
        navCollapsed: storage[STORAGE_KEYS.navCollapsed] === '1',
        navGroupState: navGroupState && typeof navGroupState === 'object' ? navGroupState : {},
        language: cleanString(systemPreferences.language || 'en', 16),
        reducedMotion: Boolean(systemPreferences.reducedMotion),
        notifications: systemPreferences.notifications !== false,
        privateActivity: Boolean(systemPreferences.privateActivity),
        systemPreferences: systemPreferences && typeof systemPreferences === 'object' ? systemPreferences : {}
    };
}

async function replaceStructuredDataFromStorage(userId, storage, options = {}) {
    const safeStorage = storage && typeof storage === 'object' ? storage : {};
    const sourceHash = stableHash(safeStorage);

    await productData.withTransaction(async (client) => {
        if (options.captureSnapshot) {
            await productData.captureAppStateSnapshot(userId, safeStorage, client);
        }

        await productData.replaceAssignments(userId, [], client);
        await productData.replaceSubjects(userId, normaliseSubjects(safeStorage), client);
        await productData.replaceAssignments(userId, normaliseAssignments(safeStorage), client);
        await productData.replaceTasks(userId, normaliseTasks(safeStorage), client);
        await productData.replaceStudySessions(
            userId,
            'queue',
            normaliseStudyList(safeStorage, STORAGE_KEYS.studyQueue, 'queue'),
            client
        );
        await productData.replaceStudySessions(
            userId,
            'completed',
            normaliseStudyList(safeStorage, STORAGE_KEYS.studyCompleted, 'completed'),
            client
        );
        await productData.replaceStudySessions(
            userId,
            'favourite',
            normaliseStudyList(safeStorage, STORAGE_KEYS.studyFavourites, 'favourite'),
            client
        );
        await productData.replaceActiveStudySession(userId, normaliseStudyActive(safeStorage), client);

        const weeklyGoal = normaliseStudyGoal(safeStorage, STORAGE_KEYS.studyWeeklyGoal);
        const monthlyGoal = normaliseStudyGoal(safeStorage, STORAGE_KEYS.studyMonthlyGoal);

        if (weeklyGoal) {
            await productData.upsertStudyGoal(userId, 'week', weeklyGoal, client);
        } else {
            await productData.deleteStudyGoal(userId, 'week', client);
        }

        if (monthlyGoal) {
            await productData.upsertStudyGoal(userId, 'month', monthlyGoal, client);
        } else {
            await productData.deleteStudyGoal(userId, 'month', client);
        }

        await productData.upsertProfile(userId, normaliseProfile(safeStorage), client);
        await productData.upsertPreferences(userId, normalisePreferences(safeStorage), client);
        await productData.markAppStateImported(userId, {
            sourceHash,
            sourceUpdatedAt: options.sourceUpdatedAt || null
        }, client);
    });
}

async function importUserAppStateIfNeeded(userId, options = {}) {
    const existingImport = await productData.getAppStateImport(userId);
    if (existingImport && !options.force) {
        return false;
    }

    let result;

    try {
        result = await pool.query(
            `SELECT storage, updated_at
             FROM user_app_state
             WHERE user_id = $1
             LIMIT 1`,
            [userId]
        );
    } catch (error) {
        if (error.code === '42P01') {
            return false;
        }

        throw error;
    }

    const row = result.rows[0];
    const storage = row?.storage && typeof row.storage === 'object' ? row.storage : {};

    await replaceStructuredDataFromStorage(userId, storage, {
        sourceUpdatedAt: row?.updated_at || null,
        captureSnapshot: true
    });

    return true;
}

module.exports = {
    STORAGE_KEYS,
    replaceStructuredDataFromStorage,
    importUserAppStateIfNeeded
};
