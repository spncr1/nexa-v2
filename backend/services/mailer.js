const nodemailer = require('nodemailer')

const REQUIRED_SMTP_ENV = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'MAIL_FROM'
]

function parseSmtpSecure(value) {
    return String(value || '').toLowerCase() === 'true'
}

function missingSmtpConfig() {
    return REQUIRED_SMTP_ENV.filter((key) => !process.env[key])
}

function assertEmailConfiguration() {
    const missing = missingSmtpConfig()

    if (missing.length) {
        const error = new Error(`Missing SMTP configuration: ${missing.join(', ')}`)
        error.code = 'SMTP_CONFIG_MISSING'
        throw error
    }

    const port = Number(process.env.SMTP_PORT)
    if (!Number.isInteger(port) || port <= 0) {
        const error = new Error('SMTP_PORT must be a valid port number')
        error.code = 'SMTP_CONFIG_INVALID'
        throw error
    }
}

function createTransporter() {
    assertEmailConfiguration()

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: parseSmtpSecure(process.env.SMTP_SECURE),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// This is where the magic happens
async function sendPasswordResetEmail({ to, name, resetUrl }) {
    const transporter = createTransporter()
    const displayName = name || 'there'

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: 'Reset your NEXA password',
        text: [
            `Hi ${displayName},`,
            '',
            'We received a request to reset your NEXA password.',
            `Reset your password here: ${resetUrl}`,
            '',
            'This link expires in 60 minutes. If you did not request this, you can ignore this email.',
            'If this email landed in spam or junk, mark it as not spam so future NEXA emails reach your inbox.'
        ].join('\n'),
        html: `
            <p>Hi ${escapeHtml(displayName)},</p>
            <p>We received a request to reset your NEXA password.</p>
            <p>You can reset your password <a href="${escapeHtml(resetUrl)}">here</a>.</p>
            <p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>
            <p>If this email landed in spam or junk, mark it as not spam so future NEXA emails reach your inbox.</p>
        `
    })
}

async function sendEmailVerificationEmail({ to, name, verificationUrl }) {
    const transporter = createTransporter()
    const displayName = name || 'there'

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: 'Confirm your NEXA account',
        text: [
            `Hi ${displayName},`,
            '',
            'Thanks for signing up for NEXA.',
            `Confirm your account here: ${verificationUrl}`,
            '',
            'This link expires in 60 minutes. If you did not create a NEXA account, you can ignore this email.',
            'If this email landed in spam or junk, mark it as not spam so future NEXA emails reach your inbox.'
        ].join('\n'),
        html: `
            <p>Hi ${escapeHtml(displayName)},</p>
            <p>Thanks for signing up for NEXA.</p>
            <p>You can confirm your account <a href="${escapeHtml(verificationUrl)}">here</a>.</p>
            <p>This link expires in 60 minutes. If you did not create a NEXA account, you can ignore this email.</p>
            <p>If this email landed in spam or junk, mark it as not spam so future NEXA emails reach your inbox.</p>
        `
    })
}

function assignmentDueLabel(assignment) {
    if (assignment.daysUntil < 0) return `overdue by ${Math.abs(assignment.daysUntil)} day${Math.abs(assignment.daysUntil) === 1 ? '' : 's'}`;
    if (assignment.daysUntil === 0) return 'due today';
    if (assignment.daysUntil === 1) return 'due tomorrow';
    return `due in ${assignment.daysUntil} days`;
}

function assignmentReminderLines(assignments) {
    return assignments.map((assignment) => {
        const subject = assignment.subjectName || 'Unknown subject';
        const priority = assignment.priority || 'medium';
        const dueDate = assignment.dueDate || 'No due date';
        return `- ${assignment.task} (${subject}) - ${assignmentDueLabel(assignment)}, ${dueDate}, ${priority} priority`;
    });
}

function assignmentReminderHtml(assignments) {
    return assignments.map((assignment) => `
        <li>
            <strong>${escapeHtml(assignment.task)}</strong><br>
            <span>${escapeHtml(assignment.subjectName || 'Unknown subject')}</span><br>
            <span>${escapeHtml(assignmentDueLabel(assignment))} · ${escapeHtml(assignment.dueDate || 'No due date')} · ${escapeHtml(assignment.priority || 'medium')} priority</span>
        </li>
    `).join('')
}

async function sendAssignmentReminderEmail({ to, name, reminderType, assignments }) {
    const transporter = createTransporter()
    const displayName = name || 'there'
    const reminderLabel = reminderType === 'weekly' ? 'Weekly assignment summary' : 'Important assignment reminders'

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: `NEXA: ${reminderLabel}`,
        text: [
            `Hi ${displayName},`,
            '',
            reminderType === 'weekly'
                ? 'Here is your assignment summary for the week.'
                : 'Here are the assignments that need your attention.',
            '',
            ...assignmentReminderLines(assignments),
            '',
            'You can change email reminders from System Settings > Preferences.'
        ].join('\n'),
        html: `
            <p>Hi ${escapeHtml(displayName)},</p>
            <p>${reminderType === 'weekly'
                ? 'Here is your assignment summary for the week.'
                : 'Here are the assignments that need your attention.'}</p>
            <ul>
                ${assignmentReminderHtml(assignments)}
            </ul>
            <p>You can change email reminders from <strong>System Settings &gt; Preferences</strong>.</p>
        `
    })
}

module.exports = {
    assertEmailConfiguration,
    sendAssignmentReminderEmail,
    sendEmailVerificationEmail,
    sendPasswordResetEmail
}
