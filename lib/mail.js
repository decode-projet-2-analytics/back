const nodemailer = require('nodemailer');

let transporter = null;
const MAILTRAP_SEND_ENDPOINT = 'https://send.api.mailtrap.io/api/send';

function parseBoolean(value, defaultValue) {
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
}

function isMailConfigured() {
    return Boolean(resolveMailProvider());
}

function getMailtrapApiToken(env = process.env) {
    return env.MAILTRAP_API_TOKEN?.trim()
        || env.MAILTRAP_API_KEY?.trim()
        || env.MAILTRIP_API_TOKEN?.trim();
}

function resolveMailProvider(env = process.env) {
    const mailFrom = env.MAIL_FROM?.trim();
    const user = env.SMTP_USER?.trim();
    const pass = env.SMTP_PASS?.trim();

    if (env.SMTP_HOST && mailFrom && user && pass && !user.includes('your-mailtrap') && !pass.includes('your-mailtrap')) {
        return { type: 'smtp' };
    }

    const apiToken = getMailtrapApiToken(env);

    if (apiToken && mailFrom) {
        return {
            type: 'mailtrap-api',
            token: apiToken,
            endpoint: env.MAILTRAP_API_ENDPOINT?.trim() || MAILTRAP_SEND_ENDPOINT,
        };
    }

    return null;
}

function getTransporter() {
    const provider = resolveMailProvider();
    if (provider?.type !== 'smtp') {
        throw new Error('Mail is not configured');
    }

    if (!transporter) {
        const authMethod = process.env.SMTP_AUTH_METHOD?.trim();

        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: parseBoolean(process.env.SMTP_SECURE, false),
            requireTLS: parseBoolean(process.env.SMTP_REQUIRE_TLS, false),
            ...(authMethod ? { authMethod } : {}),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    return transporter;
}

function parseMailAddress(value) {
    const text = String(value ?? '').trim();
    const match = text.match(/^(.+?)\s*<([^>]+)>$/);
    if (!match) return { email: text };
    return {
        name: match[1].trim().replace(/^"|"$/g, ''),
        email: match[2].trim(),
    };
}

function normalizeRecipients(to) {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map(parseMailAddress);
}

async function sendMail({ to, subject, text, html }) {
    const provider = resolveMailProvider();

    if (!provider) {
        throw new Error('Mail is not configured');
    }

    if (provider.type === 'mailtrap-api') {
        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${provider.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: parseMailAddress(process.env.MAIL_FROM),
                to: normalizeRecipients(to),
                subject,
                text,
                html,
            }),
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Mailtrap API rejected email with status ${response.status}${body ? `: ${body}` : ''}`);
        }

        return response.json().catch(() => ({}));
    }

    return getTransporter().sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
        html,
    });
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
    const { subject, text, html } = buildRegistrationPendingContent(data);

    await sendMail({
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
    const { subject, text, html } = buildStatusUpdateContent(data);

    await sendMail({
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

function buildTeamInvitationContent(data) {
    const subject = `Invitation à rejoindre ${data.applicationName} sur Decode Analytics`;

    const text = [
        'Bonjour,',
        '',
        `${data.inviterEmail} vous invite à rejoindre l'application "${data.applicationName}" sur Decode Analytics.`,
        `Rôle proposé : ${data.role}`,
        '',
        `Accepter l'invitation : ${data.acceptUrl}`,
        '',
        `Cette invitation expire le ${data.expiresAt.toLocaleDateString('fr-FR')}.`,
        '',
        '— L\'équipe Decode Analytics',
    ].join('\n');

    const html = `
        <p>Bonjour,</p>
        <p><strong>${data.inviterEmail}</strong> vous invite à rejoindre l'application <strong>${data.applicationName}</strong> sur Decode Analytics.</p>
        <p>Rôle proposé : <strong>${data.role}</strong></p>
        <p><a href="${data.acceptUrl}">Accepter l'invitation</a></p>
        <p>Cette invitation expire le ${data.expiresAt.toLocaleDateString('fr-FR')}.</p>
    `.trim();

    return { subject, text, html };
}

async function sendTeamInvitationEmail(data) {
    const { subject, text, html } = buildTeamInvitationContent(data);

    await sendMail({
        to: data.email,
        subject,
        text,
        html,
    });
}

function sendTeamInvitationEmailSafe(data) {
    void sendTeamInvitationEmail(data).catch((err) => {
        console.error('[mail] Team invitation failed:', err);
    });
}

module.exports = {
    isMailConfigured,
    resolveMailProvider,
    parseMailAddress,
    normalizeRecipients,
    sendMail,
    sendRegistrationPendingEmail,
    sendRegistrationPendingEmailSafe,
    sendStatusUpdateEmail,
    sendStatusUpdateEmailSafe,
    sendTeamInvitationEmail,
    sendTeamInvitationEmailSafe,
};
