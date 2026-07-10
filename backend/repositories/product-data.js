const crypto = require('crypto');
const { pool } = require('../database/db');

function createId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function executor(client) {
    return client || pool;
}

async function withTransaction(callback) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

function isFiniteMs(value) {
    const ms = Number(value);
    return Number.isFinite(ms) && ms > 0;
}

function timestampFromMs(value) {
    return isFiniteMs(value) ? new Date(Number(value)) : new Date();
}

function nullableTimestampFromMs(value) {
    return isFiniteMs(value) ? new Date(Number(value)) : null;
}

function msFromRow(row, msField, timestampField) {
    if (isFiniteMs(row[msField])) return Number(row[msField]);
    const value = row[timestampField];
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function dateOnly(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}

function timeOnly(value) {
    if (!value) return null;
    return String(value).slice(0, 5);
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function booleanFromValue(value) {
    return value === true || value === 'true' || value === '1' || value === 1;
}

function rowToSubject(row) {
    return {
        id: row.id,
        name: row.name,
        createdAt: msFromRow(row, 'created_at_ms', 'created_at'),
        updatedAt: msFromRow(row, 'updated_at_ms', 'updated_at')
    };
}

function rowToAssignment(row) {
    return {
        id: row.id,
        courseId: row.subject_id || '',
        task: row.task,
        description: row.description || '',
        desc: row.description || '',
        priority: row.priority,
        status: row.status,
        dueDate: dateOnly(row.due_date),
        weighting: numberOrNull(row.weighting),
        createdAt: msFromRow(row, 'created_at_ms', 'created_at'),
        updatedAt: msFromRow(row, 'updated_at_ms', 'updated_at')
    };
}

function rowToTask(row) {
    const scheduledHour = Number.isInteger(row.scheduled_hour) ? row.scheduled_hour : null;
    const scheduledMinute = Number.isInteger(row.scheduled_minute) ? row.scheduled_minute : null;
    const scheduledTime = timeOnly(row.scheduled_time);

    return {
        id: row.id,
        title: row.title,
        notes: row.notes || '',
        priority: row.priority,
        status: row.status,
        done: Boolean(row.done),
        scheduledHour,
        scheduledMinute,
        scheduledTime,
        scheduledDate: dateOnly(row.scheduled_date),
        createdAt: msFromRow(row, 'created_at_ms', 'created_at'),
        updatedAt: msFromRow(row, 'updated_at_ms', 'updated_at')
    };
}

function rowToStudySession(row) {
    const session = {
        id: row.id,
        title: row.title,
        type: row.type,
        durationSeconds: Number(row.duration_seconds),
        durationMinutes: numberOrNull(row.duration_minutes) || Number(row.duration_seconds) / 60,
        notes: row.notes || '',
        createdAt: msFromRow(row, 'created_at_ms', 'created_at'),
        updatedAt: msFromRow(row, 'updated_at_ms', 'updated_at')
    };

    if (row.status) session.status = row.status;
    if (Number.isInteger(row.remaining_seconds)) session.remainingSeconds = row.remaining_seconds;
    if (Number.isInteger(row.total_seconds)) session.totalSeconds = row.total_seconds;
    if (row.source_assignment_id) session.sourceAssignmentId = row.source_assignment_id;
    if (row.source_session_id) session.sourceSessionId = row.source_session_id;
    if (row.run_id) session.runId = row.run_id;
    if (row.is_repeating) session.isRepeating = true;
    if (row.is_standalone) session.isStandalone = true;
    if (isFiniteMs(row.started_at_ms)) session.startedAt = Number(row.started_at_ms);
    if (isFiniteMs(row.last_tick_at_ms)) session.lastTickAt = Number(row.last_tick_at_ms);
    if (isFiniteMs(row.completed_at_ms)) session.completedAt = Number(row.completed_at_ms);

    return session;
}

function rowToStudyGoal(row) {
    if (!row) return null;

    return {
        targetSessions: Number(row.target_sessions) || 0,
        targetFocusSeconds: Number(row.target_focus_seconds) || 0,
        activeDays: Number(row.active_days) || 0,
        focusBalance: {
            deep: Number(row.focus_deep_percent) || 0,
            standard: Number(row.focus_standard_percent) || 0,
            light: Number(row.focus_light_percent) || 0
        },
        updatedAt: isFiniteMs(row.updated_at_ms)
            ? Number(row.updated_at_ms)
            : msFromRow(row, 'updated_at_ms', 'updated_at')
    };
}

function rowToProfile(row) {
    return {
        age: row?.age || '',
        location: row?.location || '',
        university: row?.university || '',
        degree: row?.degree || '',
        yearLevel: row?.year_level || '',
        semesterLabel: row?.semester_label || '',
        avatarUrlOrData: row?.avatar_url_or_data || ''
    };
}

function rowToPreferences(row) {
    return {
        themeMode: row?.theme_mode || 'system',
        navCollapsed: Boolean(row?.nav_collapsed),
        navGroupState: row?.nav_group_state || {},
        language: row?.language || 'en',
        reducedMotion: Boolean(row?.reduced_motion),
        notifications: row?.notifications !== false,
        systemPreferences: row?.system_preferences || {}
    };
}

async function listSubjects(userId, client) {
    const result = await executor(client).query(
        `SELECT *
         FROM subjects
         WHERE user_id = $1
         ORDER BY created_at_ms NULLS LAST, created_at, lower(name)`,
        [userId]
    );

    return result.rows.map(rowToSubject);
}

async function getSubject(userId, id, client) {
    const result = await executor(client).query(
        `SELECT *
         FROM subjects
         WHERE user_id = $1 AND id = $2
         LIMIT 1`,
        [userId, id]
    );

    return result.rows[0] ? rowToSubject(result.rows[0]) : null;
}

async function createSubject(userId, values, client) {
    const now = Date.now();
    const id = values.id || createId('subject');
    const createdAt = values.createdAt || now;
    const updatedAt = values.updatedAt || createdAt;
    const result = await executor(client).query(
        `INSERT INTO subjects (user_id, id, name, created_at, updated_at, created_at_ms, updated_at_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            userId,
            String(id),
            values.name,
            timestampFromMs(createdAt),
            timestampFromMs(updatedAt),
            createdAt,
            updatedAt
        ]
    );

    return rowToSubject(result.rows[0]);
}

async function upsertSubject(userId, values, client) {
    const now = Date.now();
    const id = values.id || createId('subject');
    const createdAt = values.createdAt || now;
    const updatedAt = values.updatedAt || now;
    const result = await executor(client).query(
        `INSERT INTO subjects (user_id, id, name, created_at, updated_at, created_at_ms, updated_at_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, id) DO UPDATE
         SET name = EXCLUDED.name,
             updated_at = EXCLUDED.updated_at,
             updated_at_ms = EXCLUDED.updated_at_ms
         RETURNING *`,
        [
            userId,
            String(id),
            values.name,
            timestampFromMs(createdAt),
            timestampFromMs(updatedAt),
            createdAt,
            updatedAt
        ]
    );

    return rowToSubject(result.rows[0]);
}

async function updateSubject(userId, id, values) {
    const result = await pool.query(
        `UPDATE subjects
         SET name = COALESCE($3, name),
             updated_at = NOW(),
             updated_at_ms = $4
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        [userId, id, values.name || null, Date.now()]
    );

    return result.rows[0] ? rowToSubject(result.rows[0]) : null;
}

async function deleteSubject(userId, id) {
    const result = await pool.query(
        `DELETE FROM subjects
         WHERE user_id = $1 AND id = $2
         RETURNING id`,
        [userId, id]
    );

    return result.rows[0] || null;
}

async function replaceSubjects(userId, subjects, client) {
    const db = executor(client);
    const ids = subjects.map((subject) => String(subject.id)).filter(Boolean);

    for (const subject of subjects) {
        await upsertSubject(userId, subject, db);
    }

    if (!ids.length) {
        await db.query('DELETE FROM subjects WHERE user_id = $1', [userId]);
        return;
    }

    await db.query(
        'DELETE FROM subjects WHERE user_id = $1 AND NOT (id = ANY($2::text[]))',
        [userId, ids]
    );
}

async function listAssignments(userId, filters = {}, client) {
    const params = [userId];
    const conditions = ['user_id = $1'];

    if (filters.subjectId) {
        params.push(filters.subjectId);
        conditions.push(`subject_id = $${params.length}`);
    }

    if (filters.status) {
        params.push(filters.status);
        conditions.push(`status = $${params.length}`);
    }

    const result = await executor(client).query(
        `SELECT *
         FROM assignments
         WHERE ${conditions.join(' AND ')}
         ORDER BY due_date NULLS LAST, created_at_ms NULLS LAST, created_at DESC`,
        params
    );

    return result.rows.map(rowToAssignment);
}

async function getAssignment(userId, id, client) {
    const result = await executor(client).query(
        `SELECT *
         FROM assignments
         WHERE user_id = $1 AND id = $2
         LIMIT 1`,
        [userId, id]
    );

    return result.rows[0] ? rowToAssignment(result.rows[0]) : null;
}

async function createAssignment(userId, values, client) {
    const now = Date.now();
    const id = values.id || createId('assignment');
    const createdAt = values.createdAt || now;
    const updatedAt = values.updatedAt || createdAt;
    const result = await executor(client).query(
        `INSERT INTO assignments (
            user_id, id, subject_id, task, description, priority, status,
            due_date, weighting, created_at, updated_at, created_at_ms, updated_at_ms
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
            userId,
            String(id),
            values.subjectId || values.courseId || null,
            values.task,
            values.description || values.desc || '',
            values.priority || 'medium',
            values.status || 'not-started',
            values.dueDate || null,
            numberOrNull(values.weighting),
            timestampFromMs(createdAt),
            timestampFromMs(updatedAt),
            createdAt,
            updatedAt
        ]
    );

    return rowToAssignment(result.rows[0]);
}

async function updateAssignment(userId, id, values) {
    const existing = await getAssignment(userId, id);
    if (!existing) return null;

    const next = {
        subjectId: Object.prototype.hasOwnProperty.call(values, 'subjectId') ? values.subjectId : existing.courseId,
        task: Object.prototype.hasOwnProperty.call(values, 'task') ? values.task : existing.task,
        description: Object.prototype.hasOwnProperty.call(values, 'description') ? values.description : existing.description,
        priority: Object.prototype.hasOwnProperty.call(values, 'priority') ? values.priority : existing.priority,
        status: Object.prototype.hasOwnProperty.call(values, 'status') ? values.status : existing.status,
        dueDate: Object.prototype.hasOwnProperty.call(values, 'dueDate') ? values.dueDate : existing.dueDate,
        weighting: Object.prototype.hasOwnProperty.call(values, 'weighting') ? values.weighting : existing.weighting
    };

    const result = await pool.query(
        `UPDATE assignments
         SET subject_id = $3,
             task = $4,
             description = $5,
             priority = $6,
             status = $7,
             due_date = $8,
             weighting = $9,
             updated_at = NOW(),
             updated_at_ms = $10
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        [
            userId,
            id,
            next.subjectId || null,
            next.task,
            next.description || '',
            next.priority,
            next.status,
            next.dueDate || null,
            numberOrNull(next.weighting),
            Date.now()
        ]
    );

    return result.rows[0] ? rowToAssignment(result.rows[0]) : null;
}

async function deleteAssignment(userId, id) {
    const result = await pool.query(
        `DELETE FROM assignments
         WHERE user_id = $1 AND id = $2
         RETURNING id`,
        [userId, id]
    );

    return result.rows[0] || null;
}

async function replaceAssignments(userId, assignments, client) {
    const db = executor(client);
    const subjects = await listSubjects(userId, db);
    const subjectIds = new Set(subjects.map((subject) => subject.id));

    await db.query('DELETE FROM assignments WHERE user_id = $1', [userId]);

    for (const assignment of assignments) {
        await createAssignment(userId, {
            ...assignment,
            subjectId: subjectIds.has(assignment.subjectId || assignment.courseId)
                ? assignment.subjectId || assignment.courseId
                : null
        }, db);
    }
}

async function listTasks(userId, filters = {}, client) {
    const params = [userId];
    const conditions = ['user_id = $1'];

    if (filters.date) {
        params.push(filters.date);
        conditions.push(`scheduled_date = $${params.length}`);
    } else if (filters.from && filters.to) {
        params.push(filters.from, filters.to);
        conditions.push(`scheduled_date BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    const result = await executor(client).query(
        `SELECT *
         FROM tasks
         WHERE ${conditions.join(' AND ')}
         ORDER BY scheduled_date NULLS LAST, scheduled_time NULLS LAST, created_at_ms NULLS LAST, created_at DESC`,
        params
    );

    return result.rows.map(rowToTask);
}

async function getTask(userId, id, client) {
    const result = await executor(client).query(
        `SELECT *
         FROM tasks
         WHERE user_id = $1 AND id = $2
         LIMIT 1`,
        [userId, String(id)]
    );

    return result.rows[0] ? rowToTask(result.rows[0]) : null;
}

async function createTask(userId, values, client) {
    const now = Date.now();
    const id = values.id || createId('task');
    const createdAt = values.createdAt || now;
    const updatedAt = values.updatedAt || createdAt;
    const result = await executor(client).query(
        `INSERT INTO tasks (
            user_id, id, title, notes, priority, status, done,
            scheduled_date, scheduled_time, scheduled_hour, scheduled_minute,
            created_at, updated_at, created_at_ms, updated_at_ms
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
            userId,
            String(id),
            values.title,
            values.notes || '',
            values.priority || 'medium',
            values.status || 'not-started',
            Boolean(values.done || values.status === 'completed'),
            values.scheduledDate || null,
            values.scheduledTime || null,
            Number.isInteger(values.scheduledHour) ? values.scheduledHour : null,
            Number.isInteger(values.scheduledMinute) ? values.scheduledMinute : null,
            timestampFromMs(createdAt),
            timestampFromMs(updatedAt),
            createdAt,
            updatedAt
        ]
    );

    return rowToTask(result.rows[0]);
}

async function updateTask(userId, id, values) {
    const existing = await getTask(userId, id);
    if (!existing) return null;

    const next = {
        title: Object.prototype.hasOwnProperty.call(values, 'title') ? values.title : existing.title,
        notes: Object.prototype.hasOwnProperty.call(values, 'notes') ? values.notes : existing.notes,
        priority: Object.prototype.hasOwnProperty.call(values, 'priority') ? values.priority : existing.priority,
        status: Object.prototype.hasOwnProperty.call(values, 'status') ? values.status : existing.status,
        scheduledDate: Object.prototype.hasOwnProperty.call(values, 'scheduledDate') ? values.scheduledDate : existing.scheduledDate,
        scheduledTime: Object.prototype.hasOwnProperty.call(values, 'scheduledTime') ? values.scheduledTime : existing.scheduledTime,
        scheduledHour: Object.prototype.hasOwnProperty.call(values, 'scheduledHour') ? values.scheduledHour : existing.scheduledHour,
        scheduledMinute: Object.prototype.hasOwnProperty.call(values, 'scheduledMinute') ? values.scheduledMinute : existing.scheduledMinute
    };

    const result = await pool.query(
        `UPDATE tasks
         SET title = $3,
             notes = $4,
             priority = $5,
             status = $6,
             done = $7,
             scheduled_date = $8,
             scheduled_time = $9,
             scheduled_hour = $10,
             scheduled_minute = $11,
             updated_at = NOW(),
             updated_at_ms = $12
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        [
            userId,
            String(id),
            next.title,
            next.notes || '',
            next.priority,
            next.status,
            next.status === 'completed',
            next.scheduledDate || null,
            next.scheduledTime || null,
            Number.isInteger(next.scheduledHour) ? next.scheduledHour : null,
            Number.isInteger(next.scheduledMinute) ? next.scheduledMinute : null,
            Date.now()
        ]
    );

    return result.rows[0] ? rowToTask(result.rows[0]) : null;
}

async function deleteTask(userId, id) {
    const result = await pool.query(
        `DELETE FROM tasks
         WHERE user_id = $1 AND id = $2
         RETURNING id`,
        [userId, String(id)]
    );

    return result.rows[0] || null;
}

async function replaceTasks(userId, tasks, client) {
    const db = executor(client);
    await db.query('DELETE FROM tasks WHERE user_id = $1', [userId]);

    for (const task of tasks) {
        await createTask(userId, task, db);
    }
}

async function listStudySessions(userId, filters = {}, client) {
    const params = [userId];
    const conditions = ['user_id = $1'];

    if (filters.collection) {
        params.push(filters.collection);
        conditions.push(`collection = $${params.length}`);
    }

    const result = await executor(client).query(
        `SELECT *
         FROM study_sessions
         WHERE ${conditions.join(' AND ')}
         ORDER BY collection, queue_position NULLS LAST, completed_at DESC NULLS LAST, created_at_ms NULLS LAST, created_at DESC`,
        params
    );

    return result.rows.map(rowToStudySession);
}

async function getStudySession(userId, id, client) {
    const result = await executor(client).query(
        `SELECT *
         FROM study_sessions
         WHERE user_id = $1 AND id = $2
         LIMIT 1`,
        [userId, id]
    );

    return result.rows[0] ? rowToStudySession(result.rows[0]) : null;
}

async function createStudySession(userId, values, client) {
    const now = Date.now();
    const id = values.id || createId('study_session');
    const createdAt = values.createdAt || now;
    const updatedAt = values.updatedAt || createdAt;
    const completedAtMs = values.completedAt || null;
    const result = await executor(client).query(
        `INSERT INTO study_sessions (
            user_id, id, collection, title, type, duration_seconds, duration_minutes,
            notes, status, queue_position, remaining_seconds, total_seconds,
            source_assignment_id, source_session_id, run_id, is_repeating, is_standalone,
            started_at_ms, last_tick_at_ms, completed_at, completed_at_ms,
            created_at, updated_at, created_at_ms, updated_at_ms
         )
         VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23, $24, $25
         )
         RETURNING *`,
        [
            userId,
            String(id),
            values.collection || 'queue',
            values.title,
            values.type || 'standard',
            Number(values.durationSeconds),
            numberOrNull(values.durationMinutes) || Number(values.durationSeconds) / 60,
            values.notes || '',
            values.status || null,
            Number.isInteger(values.queuePosition) ? values.queuePosition : null,
            Number.isInteger(values.remainingSeconds) ? values.remainingSeconds : null,
            Number.isInteger(values.totalSeconds) ? values.totalSeconds : null,
            values.sourceAssignmentId || null,
            values.sourceSessionId || null,
            values.runId || null,
            Boolean(values.isRepeating || values.isLooping),
            Boolean(values.isStandalone),
            isFiniteMs(values.startedAt) ? Number(values.startedAt) : null,
            isFiniteMs(values.lastTickAt) ? Number(values.lastTickAt) : null,
            nullableTimestampFromMs(completedAtMs),
            isFiniteMs(completedAtMs) ? Number(completedAtMs) : null,
            timestampFromMs(createdAt),
            timestampFromMs(updatedAt),
            createdAt,
            updatedAt
        ]
    );

    return rowToStudySession(result.rows[0]);
}

async function updateStudySession(userId, id, values) {
    const existing = await getStudySession(userId, id);
    if (!existing) return null;

    const next = {
        title: Object.prototype.hasOwnProperty.call(values, 'title') ? values.title : existing.title,
        type: Object.prototype.hasOwnProperty.call(values, 'type') ? values.type : existing.type,
        durationSeconds: Object.prototype.hasOwnProperty.call(values, 'durationSeconds') ? values.durationSeconds : existing.durationSeconds,
        durationMinutes: Object.prototype.hasOwnProperty.call(values, 'durationMinutes') ? values.durationMinutes : existing.durationMinutes,
        notes: Object.prototype.hasOwnProperty.call(values, 'notes') ? values.notes : existing.notes,
        status: Object.prototype.hasOwnProperty.call(values, 'status') ? values.status : existing.status,
        remainingSeconds: Object.prototype.hasOwnProperty.call(values, 'remainingSeconds') ? values.remainingSeconds : existing.remainingSeconds,
        totalSeconds: Object.prototype.hasOwnProperty.call(values, 'totalSeconds') ? values.totalSeconds : existing.totalSeconds
    };

    const result = await pool.query(
        `UPDATE study_sessions
         SET title = $3,
             type = $4,
             duration_seconds = $5,
             duration_minutes = $6,
             notes = $7,
             status = $8,
             remaining_seconds = $9,
             total_seconds = $10,
             updated_at = NOW(),
             updated_at_ms = $11
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        [
            userId,
            id,
            next.title,
            next.type,
            Number(next.durationSeconds),
            numberOrNull(next.durationMinutes) || Number(next.durationSeconds) / 60,
            next.notes || '',
            next.status || null,
            Number.isInteger(next.remainingSeconds) ? next.remainingSeconds : null,
            Number.isInteger(next.totalSeconds) ? next.totalSeconds : null,
            Date.now()
        ]
    );

    return result.rows[0] ? rowToStudySession(result.rows[0]) : null;
}

async function deleteStudySession(userId, id) {
    const result = await pool.query(
        `DELETE FROM study_sessions
         WHERE user_id = $1 AND id = $2
         RETURNING id`,
        [userId, id]
    );

    return result.rows[0] || null;
}

async function replaceStudySessions(userId, collection, sessions, client) {
    const db = executor(client);
    await db.query(
        'DELETE FROM study_sessions WHERE user_id = $1 AND collection = $2',
        [userId, collection]
    );

    for (const [index, session] of sessions.entries()) {
        await createStudySession(userId, {
            ...session,
            collection,
            queuePosition: collection === 'queue' ? index : null
        }, db);
    }
}

async function getActiveStudySession(userId, client) {
    const sessions = await listStudySessions(userId, { collection: 'active' }, client);
    return sessions[0] || null;
}

async function replaceActiveStudySession(userId, session, client) {
    await replaceStudySessions(userId, 'active', session ? [session] : [], client);
    return session ? getActiveStudySession(userId, client) : null;
}

async function listStudyGoals(userId, client) {
    const result = await executor(client).query(
        `SELECT *
         FROM study_goals
         WHERE user_id = $1
         ORDER BY period`,
        [userId]
    );

    return result.rows.reduce((goals, row) => {
        goals[row.period] = rowToStudyGoal(row);
        return goals;
    }, {});
}

async function upsertStudyGoal(userId, period, goal, client) {
    const focusBalance = goal.focusBalance || {};
    const updatedAt = goal.updatedAt || Date.now();
    const result = await executor(client).query(
        `INSERT INTO study_goals (
            user_id, period, target_sessions, target_focus_seconds, active_days,
            focus_deep_percent, focus_standard_percent, focus_light_percent, updated_at, updated_at_ms
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, period) DO UPDATE
         SET target_sessions = EXCLUDED.target_sessions,
             target_focus_seconds = EXCLUDED.target_focus_seconds,
             active_days = EXCLUDED.active_days,
             focus_deep_percent = EXCLUDED.focus_deep_percent,
             focus_standard_percent = EXCLUDED.focus_standard_percent,
             focus_light_percent = EXCLUDED.focus_light_percent,
             updated_at = EXCLUDED.updated_at,
             updated_at_ms = EXCLUDED.updated_at_ms
         RETURNING *`,
        [
            userId,
            period,
            Number(goal.targetSessions) || 0,
            Number(goal.targetFocusSeconds) || 0,
            Number(goal.activeDays) || 0,
            Number(focusBalance.deep) || 0,
            Number(focusBalance.standard) || 0,
            Number(focusBalance.light) || 0,
            timestampFromMs(updatedAt),
            updatedAt
        ]
    );

    return rowToStudyGoal(result.rows[0]);
}

async function deleteStudyGoal(userId, period, client) {
    await executor(client).query(
        'DELETE FROM study_goals WHERE user_id = $1 AND period = $2',
        [userId, period]
    );
}

async function getProfile(userId, client) {
    const result = await executor(client).query(
        'SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1',
        [userId]
    );

    return rowToProfile(result.rows[0]);
}

async function upsertProfile(userId, profile, client) {
    const result = await executor(client).query(
        `INSERT INTO user_profiles (
            user_id, age, location, university, degree, year_level, semester_label, avatar_url_or_data, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET age = EXCLUDED.age,
             location = EXCLUDED.location,
             university = EXCLUDED.university,
             degree = EXCLUDED.degree,
             year_level = EXCLUDED.year_level,
             semester_label = EXCLUDED.semester_label,
             avatar_url_or_data = EXCLUDED.avatar_url_or_data,
             updated_at = NOW()
         RETURNING *`,
        [
            userId,
            profile.age || null,
            profile.location || null,
            profile.university || null,
            profile.degree || null,
            profile.yearLevel || null,
            profile.semesterLabel || null,
            profile.avatarUrlOrData || null
        ]
    );

    return rowToProfile(result.rows[0]);
}

async function getPreferences(userId, client) {
    const result = await executor(client).query(
        'SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1',
        [userId]
    );

    return rowToPreferences(result.rows[0]);
}

async function upsertPreferences(userId, preferences, client) {
    const result = await executor(client).query(
        `INSERT INTO user_preferences (
            user_id, theme_mode, nav_collapsed, nav_group_state, language,
            reduced_motion, notifications, system_preferences, updated_at
         )
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET theme_mode = EXCLUDED.theme_mode,
             nav_collapsed = EXCLUDED.nav_collapsed,
             nav_group_state = EXCLUDED.nav_group_state,
             language = EXCLUDED.language,
             reduced_motion = EXCLUDED.reduced_motion,
             notifications = EXCLUDED.notifications,
             system_preferences = EXCLUDED.system_preferences,
             updated_at = NOW()
         RETURNING *`,
        [
            userId,
            preferences.themeMode || 'system',
            Boolean(preferences.navCollapsed),
            JSON.stringify(preferences.navGroupState || {}),
            preferences.language || 'en',
            Boolean(preferences.reducedMotion),
            preferences.notifications !== false,
            JSON.stringify(preferences.systemPreferences || {})
        ]
    );

    return rowToPreferences(result.rows[0]);
}

async function markAppStateImported(userId, details = {}, client) {
    await executor(client).query(
        `INSERT INTO legacy_state_imports (user_id, source_hash, source_updated_at, imported_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET source_hash = EXCLUDED.source_hash,
             source_updated_at = EXCLUDED.source_updated_at,
             imported_at = NOW()`,
        [
            userId,
            details.sourceHash || null,
            details.sourceUpdatedAt || null
        ]
    );
}

async function getAppStateImport(userId, client) {
    const result = await executor(client).query(
        'SELECT * FROM legacy_state_imports WHERE user_id = $1 LIMIT 1',
        [userId]
    );

    return result.rows[0] || null;
}

async function captureAppStateSnapshot(userId, storage, client) {
    await executor(client).query(
        `INSERT INTO legacy_state_snapshots (user_id, storage)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, JSON.stringify(storage || {})]
    );
}

module.exports = {
    createId,
    withTransaction,
    listSubjects,
    getSubject,
    createSubject,
    updateSubject,
    deleteSubject,
    replaceSubjects,
    listAssignments,
    getAssignment,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    replaceAssignments,
    listTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    replaceTasks,
    listStudySessions,
    getStudySession,
    createStudySession,
    updateStudySession,
    deleteStudySession,
    replaceStudySessions,
    getActiveStudySession,
    replaceActiveStudySession,
    listStudyGoals,
    upsertStudyGoal,
    deleteStudyGoal,
    getProfile,
    upsertProfile,
    getPreferences,
    upsertPreferences,
    getAppStateImport,
    markAppStateImported,
    captureAppStateSnapshot,
    booleanFromValue
};
