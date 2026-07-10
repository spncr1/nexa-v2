(function () {
    const LOGIN_PATH = '/login';
    const ME_ENDPOINT = '/api/me';
    const MISC_PREFIX = 'nexa_misc:';

    const KEYS = {
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

    const PROFILE_KEYS = new Set([
        KEYS.semester,
        KEYS.profileAge,
        KEYS.profileLocation,
        KEYS.profileUniversity,
        KEYS.profileDegree,
        KEYS.profileYearLevel,
        KEYS.profileAvatar
    ]);

    const PREFERENCE_KEYS = new Set([
        KEYS.navCollapsed,
        KEYS.navGroups,
        KEYS.systemPreferences,
        KEYS.themeMode,
        KEYS.legacyDarkMode
    ]);

    const STRUCTURED_KEYS = new Set([
        KEYS.tasks,
        KEYS.subjects,
        KEYS.assignments,
        KEYS.studyQueue,
        KEYS.studyCompleted,
        KEYS.studyFavourites,
        KEYS.studyActive,
        KEYS.studyWeeklyGoal,
        KEYS.studyMonthlyGoal,
        ...PROFILE_KEYS,
        ...PREFERENCE_KEYS
    ]);

    let currentUser = null;
    let storageState = {};
    let saveTimer = null;
    let savePromise = Promise.resolve();
    const pendingKeys = new Set();

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });

        if (response.status === 401) {
            window.location.href = LOGIN_PATH;
            throw new Error('Not authenticated');
        }

        if (response.status === 204) return null;

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    function parseJson(key, fallback) {
        try {
            const raw = storageState[key];
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`Failed to parse ${key}:`, error);
            return fallback;
        }
    }

    function setJson(key, value) {
        storageState[key] = JSON.stringify(value);
    }

    function loadMiscStorage() {
        try {
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (!key || !key.startsWith(MISC_PREFIX)) continue;
                storageState[key.slice(MISC_PREFIX.length)] = window.localStorage.getItem(key);
            }
        } catch (error) {
            console.warn('Failed to load browser-only storage:', error);
        }
    }

    function saveMiscKey(key) {
        if (STRUCTURED_KEYS.has(key) || key === KEYS.userName) return;

        try {
            const storageKey = `${MISC_PREFIX}${key}`;
            if (Object.prototype.hasOwnProperty.call(storageState, key)) {
                window.localStorage.setItem(storageKey, storageState[key]);
            } else {
                window.localStorage.removeItem(storageKey);
            }
        } catch (error) {
            console.warn(`Failed to save browser-only key ${key}:`, error);
        }
    }

    function profilePayload() {
        return {
            age: storageState[KEYS.profileAge] || '',
            location: storageState[KEYS.profileLocation] || '',
            university: storageState[KEYS.profileUniversity] || '',
            degree: storageState[KEYS.profileDegree] || '',
            yearLevel: storageState[KEYS.profileYearLevel] || '',
            semesterLabel: storageState[KEYS.semester] || '',
            avatarUrlOrData: storageState[KEYS.profileAvatar] || ''
        };
    }

    function preferencesPayload() {
        const systemPreferences = parseJson(KEYS.systemPreferences, {});
        const deadlineReminderLevel = systemPreferences.deadlineReminderLevel || 'important';
        const emailReminders = systemPreferences.emailReminders || 'off';
        const hasNotificationPreference = Boolean(systemPreferences.studyTimerAlerts)
            || deadlineReminderLevel !== 'off'
            || emailReminders !== 'off';

        return {
            themeMode: storageState[KEYS.themeMode] || (storageState[KEYS.legacyDarkMode] === '1' ? 'dark' : 'light'),
            navCollapsed: storageState[KEYS.navCollapsed] === '1',
            navGroupState: parseJson(KEYS.navGroups, {}),
            language: systemPreferences.language || 'en-AU',
            reducedMotion: Boolean(systemPreferences.reducedMotion),
            notifications: hasNotificationPreference,
            systemPreferences
        };
    }

    async function saveStructuredKey(key) {
        if (key === KEYS.subjects) {
            await fetchJson('/api/subjects', {
                method: 'PUT',
                body: JSON.stringify({ subjects: parseJson(KEYS.subjects, []) })
            });
            return;
        }

        if (key === KEYS.assignments) {
            await fetchJson('/api/assignments', {
                method: 'PUT',
                body: JSON.stringify({ assignments: parseJson(KEYS.assignments, []) })
            });
            return;
        }

        if (key === KEYS.tasks) {
            await fetchJson('/api/tasks', {
                method: 'PUT',
                body: JSON.stringify({ tasksByDate: parseJson(KEYS.tasks, {}) })
            });
            return;
        }

        const studyCollections = {
            [KEYS.studyQueue]: 'queue',
            [KEYS.studyCompleted]: 'completed',
            [KEYS.studyFavourites]: 'favourite'
        };

        if (studyCollections[key]) {
            await fetchJson('/api/study/sessions', {
                method: 'PUT',
                body: JSON.stringify({
                    collection: studyCollections[key],
                    sessions: parseJson(key, [])
                })
            });
            return;
        }

        if (key === KEYS.studyActive) {
            if (!Object.prototype.hasOwnProperty.call(storageState, key)) {
                await fetchJson('/api/study/active-session', { method: 'DELETE' });
                return;
            }

            await fetchJson('/api/study/active-session', {
                method: 'PUT',
                body: JSON.stringify({ session: parseJson(key, null) })
            });
            return;
        }

        if (key === KEYS.studyWeeklyGoal || key === KEYS.studyMonthlyGoal) {
            const period = key === KEYS.studyMonthlyGoal ? 'month' : 'week';
            if (!Object.prototype.hasOwnProperty.call(storageState, key)) {
                await fetchJson(`/api/study/goals/${period}`, { method: 'DELETE' });
                return;
            }

            await fetchJson(`/api/study/goals/${period}`, {
                method: 'PUT',
                body: JSON.stringify(parseJson(key, {}))
            });
            return;
        }

        if (PROFILE_KEYS.has(key)) {
            await fetchJson('/api/profile', {
                method: 'PATCH',
                body: JSON.stringify(profilePayload())
            });
            return;
        }

        if (PREFERENCE_KEYS.has(key)) {
            await fetchJson('/api/preferences', {
                method: 'PATCH',
                body: JSON.stringify(preferencesPayload())
            });
            return;
        }

        saveMiscKey(key);
    }

    function scheduleSave(key) {
        if (key) pendingKeys.add(key);

        if (saveTimer) {
            window.clearTimeout(saveTimer);
        }

        saveTimer = window.setTimeout(() => {
            const keysToSave = Array.from(pendingKeys);
            pendingKeys.clear();

            savePromise = keysToSave.reduce(
                (promise, pendingKey) => promise.then(() => saveStructuredKey(pendingKey)),
                savePromise
            ).catch((error) => {
                console.error('Failed to persist app data:', error);
            });
        }, 150);
    }

    function flushPendingSaves() {
        if (saveTimer) {
            window.clearTimeout(saveTimer);
            saveTimer = null;
        }

        const keysToSave = Array.from(pendingKeys);
        pendingKeys.clear();

        if (keysToSave.length) {
            savePromise = keysToSave.reduce(
                (promise, pendingKey) => promise.then(() => saveStructuredKey(pendingKey)),
                savePromise
            ).catch((error) => {
                console.error('Failed to persist app data:', error);
            });
        }

        return savePromise;
    }

    function getItem(key) {
        return Object.prototype.hasOwnProperty.call(storageState, key)
            ? storageState[key]
            : null;
    }

    function setItem(key, value) {
        storageState[key] = String(value);
        scheduleSave(key);
    }

    function removeItem(key) {
        delete storageState[key];
        scheduleSave(key);
    }

    function clear() {
        Object.keys(storageState).forEach((key) => {
            delete storageState[key];
            scheduleSave(key);
        });

        if (currentUser?.name) {
            storageState[KEYS.userName] = currentUser.name;
        }
    }

    function key(index) {
        return Object.keys(storageState)[index] || null;
    }

    function groupTasksByDate(tasks = []) {
        return tasks.reduce((grouped, task) => {
            const dateKey = task.scheduledDate;
            if (!dateKey) return grouped;
            if (!Array.isArray(grouped[dateKey])) grouped[dateKey] = [];

            const taskForStorage = { ...task };
            delete taskForStorage.scheduledDate;
            grouped[dateKey].push(taskForStorage);
            return grouped;
        }, {});
    }

    async function init() {
        const user = await fetchJson(ME_ENDPOINT);
        currentUser = user;
        loadMiscStorage();

        const [
            subjectsPayload,
            assignmentsPayload,
            tasksPayload,
            queuePayload,
            completedPayload,
            favouritesPayload,
            activePayload,
            goalsPayload,
            profilePayloadResult,
            preferencesPayloadResult
        ] = await Promise.all([
            fetchJson('/api/subjects'),
            fetchJson('/api/assignments'),
            fetchJson('/api/tasks'),
            fetchJson('/api/study/sessions?collection=queue'),
            fetchJson('/api/study/sessions?collection=completed'),
            fetchJson('/api/study/sessions?collection=favourite'),
            fetchJson('/api/study/active-session'),
            fetchJson('/api/study/goals'),
            fetchJson('/api/profile'),
            fetchJson('/api/preferences')
        ]);

        storageState[KEYS.userName] = currentUser?.name || '';
        setJson(KEYS.subjects, subjectsPayload.subjects || []);
        setJson(KEYS.assignments, assignmentsPayload.assignments || []);
        setJson(KEYS.tasks, tasksPayload.tasksByDate || groupTasksByDate(tasksPayload.tasks || []));
        setJson(KEYS.studyQueue, queuePayload.sessions || []);
        setJson(KEYS.studyCompleted, completedPayload.sessions || []);
        setJson(KEYS.studyFavourites, favouritesPayload.sessions || []);

        if (activePayload.session) {
            setJson(KEYS.studyActive, activePayload.session);
        }

        if (goalsPayload.goals?.week) {
            setJson(KEYS.studyWeeklyGoal, goalsPayload.goals.week);
        }

        if (goalsPayload.goals?.month) {
            setJson(KEYS.studyMonthlyGoal, goalsPayload.goals.month);
        }

        const profile = profilePayloadResult.profile || {};
        storageState[KEYS.semester] = profile.semesterLabel || '';
        storageState[KEYS.profileAge] = profile.age || '';
        storageState[KEYS.profileLocation] = profile.location || '';
        storageState[KEYS.profileUniversity] = profile.university || '';
        storageState[KEYS.profileDegree] = profile.degree || '';
        storageState[KEYS.profileYearLevel] = profile.yearLevel || '';
        if (profile.avatarUrlOrData) storageState[KEYS.profileAvatar] = profile.avatarUrlOrData;

        const preferences = preferencesPayloadResult.preferences || {};
        storageState[KEYS.themeMode] = preferences.themeMode || 'system';
        storageState[KEYS.legacyDarkMode] = preferences.themeMode === 'dark' ? '1' : '0';
        storageState[KEYS.navCollapsed] = preferences.navCollapsed ? '1' : '0';
        setJson(KEYS.navGroups, preferences.navGroupState || {});
        setJson(KEYS.systemPreferences, preferences.systemPreferences || {});
    }

    window.NexaAppStorage = {
        ready: init(),
        getCurrentUser: () => currentUser,
        setCurrentUser: (user) => {
            currentUser = user;
            if (currentUser?.name) storageState[KEYS.userName] = currentUser.name;
        },
        getItem,
        setItem,
        removeItem,
        clear,
        key,
        get length() {
            return Object.keys(storageState).length;
        },
        flush: flushPendingSaves
    };
})();
