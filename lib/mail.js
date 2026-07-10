const nodemailer = require('nodemailer');

let transporter = null;

function parseBoolean(value, defaultValue) {
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
}

function isMailConfigured() {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!user || !pass || user.includes('your-mailtrap') || pass.includes('your-mailtrap')) {
        return false;
    }

    return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function getTransporter() {
    if (!isMailConfigured()) {
        throw new Error('Mail is not configured');
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: parseBoolean(process.env.SMTP_SECURE, false),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    return transporter;
}

function buildRegistrationPendingContent(data) {
    const subject = 'Inscription reçue — en attente de validation';

    const optionalLines = [
        data.companyName ? `- Société : ${data.companyName}` : null,
        data.websiteUrl ? `- Site web : ${data.websiteUrl}` : null,
    ].filter(Boolean);

    const text = [
        'Bonjour,',
        '',
        'Nous avons bien reçu votre demande d\'inscription sur Decode Analytics.',
        'Votre compte est en attente de validation par un administrateur.',
        '',
        'Récapitulatif :',
        ...optionalLines,
        `- Email : ${data.email}`,
        `- Téléphone : ${data.contactPhone}`,
        '',
        '— L\'équipe Decode Analytics',
    ].join('\n');

    const optionalHtml = [
        data.companyName ? `<li><strong>Société :</strong> ${data.companyName}</li>` : '',
        data.websiteUrl ? `<li><strong>Site web :</strong> ${data.websiteUrl}</li>` : '',
    ].join('');

    const html = `
        <p>Bonjour,</p>
        <p>Votre compte est <strong>en attente de validation</strong>.</p>
        <ul>
            ${optionalHtml}
            <li><strong>Email :</strong> ${data.email}</li>
            <li><strong>Téléphone :</strong> ${data.contactPhone}</li>
        </ul>
    `.trim();

    return { subject, text, html };
}

async function sendRegistrationPendingEmail(data) {
    if (!isMailConfigured()) {
        console.warn('[mail] SMTP not configured — registration email skipped');
        return;
    }

    const { subject, text, html } = buildRegistrationPendingContent(data);

    await getTransporter().sendMail({
        from: process.env.MAIL_FROM,
        to: data.email,
        subject,
        text,
        html,
    });
}

function sendRegistrationPendingEmailSafe(data) {
    void sendRegistrationPendingEmail(data).catch((err) => {
        console.error('[mail] Registration confirmation failed:', err);
    });
}

function buildStatusUpdateContent(data) {
    const isValidated = data.status === 'validated';

    const subject = isValidated
        ? 'Votre compte Decode Analytics a été validé'
        : 'Votre compte Decode Analytics a été refusé';

    const text = [
        'Bonjour,',
        '',
        isValidated
            ? 'Bonne nouvelle ! Votre compte a été validé par un administrateur. Vous pouvez dès maintenant vous connecter.'
            : 'Votre demande d\'inscription a été refusée par un administrateur.',
        ...(data.reason ? ['', `Motif : ${data.reason}`] : []),
        '',
        '— L\'équipe Decode Analytics',
    ].join('\n');

    const html = isValidated
        ? `<p>Bonjour,</p><p>Votre compte est <strong>validé</strong>. Vous pouvez vous connecter.</p>`
        : `<p>Bonjour,</p><p>Votre compte a été <strong>refusé</strong>.${data.reason ? ` <br>Motif : ${data.reason}` : ''}</p>`;

    return { subject, text, html };
}

async function sendStatusUpdateEmail(data) {
    if (!isMailConfigured()) {
        console.warn('[mail] SMTP not configured — status update email skipped');
        return;
    }

    const { subject, text, html } = buildStatusUpdateContent(data);

    await getTransporter().sendMail({
        from: process.env.MAIL_FROM,
        to: data.email,
        subject,
        text,
        html,
    });
}

function sendStatusUpdateEmailSafe(data) {
    void sendStatusUpdateEmail(data).catch((err) => {
        console.error('[mail] Status update email failed:', err);
    });
}

module.exports = {
    isMailConfigured,
    sendRegistrationPendingEmail,
    sendRegistrationPendingEmailSafe,
    sendStatusUpdateEmail,
    sendStatusUpdateEmailSafe,
};
