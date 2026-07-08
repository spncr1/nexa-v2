const productData = require('../repositories/product-data');
const { pool } = require('../database/db');
const { sendAssignmentReminderEmail } = require('./mailer');

const EMAIL_REMINDER_TYPES = new Set(['important', 'weekly']);
const DEFAULT_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
let schedulerTimer = null;
let lastSchedulerErrorCode = '';

function parseDateOnly(value) {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
    return new Date(Date.UTC(year, month - 1, day));
}

function todayUtc() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysUntilDate(dateValue, fromDate = todayUtc()) {
    const target = parseDateOnly(dateValue);
    if (!target) return null;
    return Math.round((target - fromDate) / 86400000);
}

function mondayOfWeek(date) {
    const result = new Date(date);
    const day = result.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setUTCDate(result.getUTCDate() + diff);
    return result;
}

function formatPeriodKey(reminderType, now = todayUtc()) {
    if (reminderType === 'weekly') {
        const monday = mondayOfWeek(now);
        return monday.toISOString().slice(0, 10);
    }

    return now.toISOString().slice(0, 10);
}

function priorityRank(priority) {
    const value = String(priority || '').toLowerCase();
    if (value === 'high') return 3;
    if (value === 'medium') return 2;
    return 1;
}

function isIncomplete(assignment) {
    return String(assignment?.status || '').toLowerCase() !== 'completed';
}

function reminderPreference(preferences) {
    const value = preferences?.systemPreferences?.emailReminders;
    return EMAIL_REMINDER_TYPES.has(value) ? value : 'off';
}

function shouldIncludeAssignment(assignment, reminderType, fromDate) {
    if (!isIncomplete(assignment)) return false;

    const daysUntil = daysUntilDate(assignment.dueDate, fromDate);
    if (daysUntil === null) return false;

    if (reminderType === 'weekly') {
        return daysUntil >= -7 && daysUntil <= 7;
    }

    return daysUntil < 0
        || daysUntil <= 3
        || (String(assignment.priority || '').toLowerCase() === 'high' && daysUntil <= 14);
}

function buildReminderItems(assignments, subjects, reminderType, fromDate = todayUtc()) {
    const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

    return assignments
        .map((assignment) => ({
            ...assignment,
            daysUntil: daysUntilDate(assignment.dueDate, fromDate),
            subjectName: subjectNameById.get(assignment.courseId) || 'Unknown subject'
        }))
        .filter((assignment) => shouldIncludeAssignment(assignment, reminderType, fromDate))
        .sort((a, b) => {
            const daysDiff = a.daysUntil - b.daysUntil;
            if (daysDiff !== 0) return daysDiff;

            const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
            if (priorityDiff !== 0) return priorityDiff;

            return String(a.task || '').localeCompare(String(b.task || ''));
        })
        .slice(0, 12);
}

function summarizeItems(items) {
    return items.map((item) => ({
        id: item.id,
        task: item.task,
        subjectName: item.subjectName,
        dueDate: item.dueDate,
        daysUntil: item.daysUntil,
        priority: item.priority,
        status: item.status
    }));
}

async function hasDelivery(userId, reminderType, periodKey) {
    const result = await pool.query(
        `SELECT 1
         FROM email_reminder_deliveries
         WHERE user_id = $1
           AND reminder_type = $2
           AND period_key = $3
         LIMIT 1`,
        [userId, reminderType, periodKey]
    );

    return Boolean(result.rows[0]);
}

async function recordDelivery(userId, reminderType, periodKey, itemCount) {
    await pool.query(
        `INSERT INTO email_reminder_deliveries (user_id, reminder_type, period_key, item_count)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reminder_type, period_key) DO UPDATE
         SET sent_at = NOW(),
             item_count = EXCLUDED.item_count`,
        [userId, reminderType, periodKey, itemCount]
    );
}

async function sendAssignmentReminderDigest(user, options = {}) {
    const preferences = await productData.getPreferences(user.id);
    const reminderType = reminderPreference(preferences);

    if (reminderType === 'off') {
        const error = new Error('Email reminders are off.');
        error.code = 'EMAIL_REMINDERS_DISABLED';
        throw error;
    }

    const now = todayUtc();
    const periodKey = formatPeriodKey(reminderType, now);

    if (!options.force && await hasDelivery(user.id, reminderType, periodKey)) {
        return {
            sent: false,
            skipped: 'already_sent',
            reminderType,
            periodKey,
            recipientEmail: user.email,
            itemCount: 0,
            items: []
        };
    }

    const [assignments, subjects] = await Promise.all([
        productData.listAssignments(user.id),
        productData.listSubjects(user.id)
    ]);
    const items = buildReminderItems(assignments, subjects, reminderType, now);

    if (!items.length) {
        return {
            sent: false,
            skipped: 'no_items',
            reminderType,
            periodKey,
            recipientEmail: user.email,
            itemCount: 0,
            items: []
        };
    }

    await sendAssignmentReminderEmail({
        to: user.email,
        name: user.name,
        reminderType,
        periodKey,
        assignments: items
    });
    await recordDelivery(user.id, reminderType, periodKey, items.length);

    return {
        sent: true,
        reminderType,
        periodKey,
        recipientEmail: user.email,
        itemCount: items.length,
        items: summarizeItems(items)
    };
}

async function listUsersWithEmailReminders() {
    const result = await pool.query(
        `SELECT u.id, u.name, u.email
         FROM users u
         INNER JOIN user_preferences p ON p.user_id = u.id
         WHERE p.system_preferences->>'emailReminders' IN ('important', 'weekly')
         ORDER BY u.id`
    );

    return result.rows;
}

async function sendDueAssignmentReminderDigests() {
    const users = await listUsersWithEmailReminders();
    const results = [];

    for (const user of users) {
        try {
            results.push({
                userId: user.id,
                ...(await sendAssignmentReminderDigest(user))
            });
        } catch (error) {
            results.push({
                userId: user.id,
                sent: false,
                error: error.code || error.message || 'UNKNOWN'
            });
        }
    }

    return results;
}

function startEmailReminderScheduler(options = {}) {
    if (schedulerTimer || process.env.EMAIL_REMINDER_SCHEDULER === 'false') return;

    const intervalMs = Number(options.intervalMs || process.env.EMAIL_REMINDER_INTERVAL_MS || DEFAULT_SCHEDULER_INTERVAL_MS);
    const run = () => {
        sendDueAssignmentReminderDigests().catch((error) => {
            const code = error.code || error.message || 'UNKNOWN';
            if (code !== lastSchedulerErrorCode) {
                console.error('Email reminder scheduler failed:', code);
                lastSchedulerErrorCode = code;
            }
        });
    };

    schedulerTimer = setInterval(run, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_SCHEDULER_INTERVAL_MS);
    setTimeout(run, Number(options.initialDelayMs || process.env.EMAIL_REMINDER_INITIAL_DELAY_MS || 30000));
}

module.exports = {
    sendAssignmentReminderDigest,
    sendDueAssignmentReminderDigests,
    startEmailReminderScheduler
};
