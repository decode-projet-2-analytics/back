# Backend — Decode Analytics

API REST sous `/api/v1/`.

**Stack :** Express, PostgreSQL/Sequelize, MongoDB (sync hooks), JWT, Nodemailer, Umzug, Docker Compose.

Config dans `compose.yml` — pas de `.env`.

## Démarrage

```bash
cd back && npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:3008/api/v1/ |
| Postgres | 127.0.0.1:5432 |
| MongoDB | 127.0.0.1:27019 |

## Sync Postgres → Mongo

Hooks Sequelize sur les 7 modèles → collections `sync_*` :

`users`, `applications`, `tags`, `tunnels`, `widgets`, `sessions`, `events`

## Variables (`compose.yml`)

`DATABASE_URL`, `MONGO_URL`, `JWT_SECRET`, `SMTP_*`, `MAIL_FROM`, `MAIL_TEST_TO`

SMTP : credentials Mailtrap dans `compose.yml`, puis `npm run test:mail` dans le conteneur.

## Migrations

```bash
docker compose exec backend npm run migrate:up
docker compose exec backend npm run migrate:down
docker compose exec backend npm run migrate:status
```

Reset : `docker compose down -v && docker compose up`

## Auth — `/api/v1/auth/`

| Route | |
|-------|---|
| `POST /register` | Inscription webmaster (`pending`) |
| `POST /login` | `accessToken` + `refreshToken` |
| `POST /refresh` | Nouveau access token |
| `POST /logout` | Bearer requis |

## CRUD — `createCrudRouter`

| Ressource | Route | Auth |
|-----------|-------|------|
| Users | `/api/v1/users` | oui |
| Applications | `/api/v1/applications` | oui |
| Tags | `/api/v1/tags` | oui |
| Tunnels | `/api/v1/tunnels` | oui |
| Widgets | `/api/v1/widgets` | oui |
| Sessions | `/api/v1/sessions` | oui |
| Events | `/api/v1/events` | non |

## Scripts

```bash
npm run dev
npm run migrate:up
npm run migrate:down
npm run migrate:status
npm run d:s:u
npm run test:mail
```
