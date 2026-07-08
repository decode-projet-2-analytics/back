#!/usr/bin/env node
const User = require('../models/user');
const connection = require('../lib/db');

const EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@decode.local').toLowerCase().trim();
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

async function main() {
    let user = await User.findOne({ where: { email: EMAIL } });

    if (user) {
        if (user.role !== 'Admin' || user.status !== 'validated') {
            await user.update({ role: 'Admin', status: 'validated' });
            console.log(`Admin mis à jour : ${EMAIL}`);
        } else {
            console.log(`Admin déjà présent : ${EMAIL}`);
        }
    } else {
        user = await User.create({
            lastname: 'Admin',
            firstname: 'Decode',
            email: EMAIL,
            password: PASSWORD,
            role: 'Admin',
            status: 'validated',
            companyName: 'Decode',
            websiteUrl: 'https://decode.local',
        });
        console.log(`Admin créé : ${EMAIL}`);
        console.log(`Mot de passe : ${PASSWORD}`);
    }

    console.log(`id: ${user.id}`);
}

main()
    .then(() => connection.close())
    .catch((error) => {
        console.error(error);
        connection.close().finally(() => process.exit(1));
    });
