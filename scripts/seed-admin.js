#!/usr/bin/env node

/**
 * Bootstrap seeder : comptes de base + application de démonstration.
 *
 * Crée (idempotent) :
 *   - un Admin      (admin@decode.local / Admin123!)
 *   - un Webmaster  (demo@decode.local  / Demo1234!)
 *   - l'application "Site vitrine SDK", propriétaire = le Webmaster,
 *     avec l'origine du site vitrine dans les URLs autorisées (CORS).
 *
 * Le Webmaster est propriétaire de l'app, donc il la voit directement dans son
 * dashboard (les Admins, eux, voient toutes les applications).
 */

const User = require('../models/user');
const Application = require('../models/application');
const connection = require('../lib/db');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@decode.local').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

const WEBMASTER_EMAIL = (process.env.SEED_WEBMASTER_EMAIL ?? 'demo@decode.local').toLowerCase().trim();
const WEBMASTER_PASSWORD = process.env.SEED_WEBMASTER_PASSWORD ?? 'Demo1234!';

const APP_NAME = process.env.SEED_APP_NAME ?? 'Site vitrine SDK';
const APP_URL = process.env.SEED_APP_URL ?? 'http://localhost:4321';

async function ensureUser(email, password, role, identity) {
    let user = await User.findOne({ where: { email } });

    if (user) {
        if (user.role !== role || user.status !== 'validated') {
            await user.update({ role, status: 'validated' });
            console.log(`${role} mis à jour : ${email} (id ${user.id})`);
        } else {
            console.log(`${role} déjà présent : ${email} (id ${user.id})`);
        }
        return user;
    }

    user = await User.create({
        ...identity,
        email,
        password,
        role,
        status: 'validated',
    });
    console.log(`${role} créé : ${email} / ${password} (id ${user.id})`);
    return user;
}

async function ensureApplication(name, ownerId, url) {
    let app = await Application.findOne({ where: { name, ownerId } });

    if (app) {
        const urls = new Set(app.allowedUrls ?? []);
        if (!urls.has(url)) {
            await app.update({ allowedUrls: [...urls, url] });
            console.log(`URL autorisée ajoutée à "${name}" : ${url}`);
        }
        console.log(`Application déjà présente : ${name} (id ${app.id}, appId ${app.appId})`);
        return app;
    }

    app = await Application.create({ name, ownerId, allowedUrls: [url] });
    console.log(`Application créée : ${name} (id ${app.id})`);
    return app;
}

async function main() {
    await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'Admin', {
        firstname: 'Decode',
        lastname: 'Admin',
        companyName: 'Decode',
        websiteUrl: 'https://decode.local',
    });

    const webmaster = await ensureUser(WEBMASTER_EMAIL, WEBMASTER_PASSWORD, 'Webmaster', {
        firstname: 'Demo',
        lastname: 'Viewer',
    });

    const app = await ensureApplication(APP_NAME, webmaster.id, APP_URL);

    console.log('\n--- Récapitulatif ---');
    console.log(`Admin     : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`Webmaster : ${WEBMASTER_EMAIL} / ${WEBMASTER_PASSWORD}`);
    console.log(`App       : ${APP_NAME}`);
    console.log(`appId     : ${app.appId}  (à mettre dans showcase/.env → PUBLIC_SDK_APP_ID)`);
}

main()
    .then(() => connection.close())
    .catch((error) => {
        console.error(error);
        connection.close().finally(() => process.exit(1));
    });
