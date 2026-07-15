# Backend — Decode Analytics

API REST sous `/api/v1/`.

**Stack :** Express, PostgreSQL/Sequelize, MongoDB (sync hooks), JWT, Nodemailer, Umzug, Docker Compose.

Config dans `compose.yml`, avec surcharge locale possible via `back/.env`.

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

Mail : `compose.yml` utilise le SMTP Mailtrap avec configuration Gemail

Avant de lancer Docker, fournir le token SMTP Mailtrap et une adresse expediteur verifiee dans Mailtrap.

Option recommandee : creer `back/.env` depuis `.env.example` :

```bash
cp .env.example .env
```

Puis renseigner :

```dotenv
SMTP_USER=api
MAILTRAP_API_TOKEN=<YOUR_API_TOKEN>
MAIL_FROM="Private Person <hello@decode-analytics.fr>"
MAIL_TEST_TO="A Test User <avidan.benguigui@ecole-decode.fr>"
```

Valeurs a remplacer avant execution :

| Placeholder | Valeur attendue |
|-------------|-----------------|
| `<YOUR_API_TOKEN>` | Le token API Mailtrap Sending valide |
| `hello@decode-analytics.fr` | Une adresse expediteur autorisee/verifiee dans Mailtrap |
| `avidan.benguigui@ecole-decode.fr` | Le destinataire du mail de test, si besoin |

Le login SMTP Mailtrap Sending est `api`. Le mot de passe SMTP est injecte depuis `MAILTRAP_API_TOKEN`.

Recreer ensuite le container pour injecter les nouvelles variables :

```bash
docker compose up -d --force-recreate backend
```

Option ponctuelle sans `.env` :

```bash
export MAILTRAP_API_TOKEN="mt_live_xxx"
export MAIL_FROM="Private Person <hello@decode-analytics.fr>"
export MAIL_TEST_TO="A Test User <avidan.benguigui@ecole-decode.fr>"
docker compose up -d --force-recreate backend
```

Tester l'envoi depuis le conteneur :

```bash
docker compose exec backend npm run test:mail
```

Le script envoie le message de test `Hello from Mailtrap`. Les logs d'envoi se consultent ici : https://mailtrap.io/sending/email_logs

Sans `MAILTRAP_API_TOKEN`, le backend demarre mais les emails ne sont pas configures.

## Migrations

```bash
docker compose exec backend npm run migrate:up
docker compose exec backend npm run migrate:down
docker compose exec backend npm run migrate:status
```

Depuis le host, `npm run migrate:up` utilise par défaut `postgres://postgres:postgres@127.0.0.1:5432/decode` si `DATABASE_URL` n'est pas défini.

Reset : `docker compose down -v && docker compose up`

## Auth — `/api/v1/auth/`

| Route | |
|-------|---|
| `POST /register` | Inscription webmaster (`pending`) |
| `POST /login` | `accessToken` + `refreshToken` |
| `POST /refresh` | Nouveau access token |
| `POST /logout` | Bearer requis |

### Inscription par invitation

Un utilisateur invite peut creer son compte depuis un lien d'invitation d'equipe.

- `POST /auth/register` accepte un champ optionnel `invitationToken`.
- Si le token est valide, non expire, et correspond a l'email inscrit :
  - le compte est cree avec `status = validated` ;
  - l'invitation passe en `accepted` ;
  - une entree `ApplicationMember` est creee avec le role invite (`admin` ou `member`).
- Sans invitation, l'inscription garde le fonctionnement normal : compte `Webmaster` en `pending`, validation admin requise.
- Le role global utilisateur reste `Webmaster` pour l'acces au backoffice ; les droits fins sont portes par le role applicatif.

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

## User Story 3 — Credentials et interconnexions

Chaque application expose :

- `appId` : identifiant public utilise par le SDK frontend.
- `appSecret` : secret serveur affiche une seule fois a la generation, puis stocke hashe en base.
- `allowedUrls` : liste des origines autorisees pour les appels SDK navigateur.

Routes principales :

| Route | Droit applicatif | Description |
|-------|------------------|-------------|
| `GET /applications` | authentifie | Liste les applications accessibles ; l'Admin global voit l'inventaire complet |
| `GET /applications/:id` | `member` ou plus | Detail d'une application accessible ; interdit a l'Admin global sans impersonation |
| `PATCH /applications/:id` | `admin` ou `owner` | Modifie le nom et les URLs autorisees |
| `POST /applications/:id/secret` | `admin` ou `owner` | Genere un nouveau `APP_SECRET` |
| `DELETE /applications/:id/secret` | `admin` ou `owner` | Revoque le `APP_SECRET` |
| `GET /applications/:id/role` | `member` ou plus | Retourne le role applicatif courant |

Le SDK frontend s'authentifie avec `APP_ID` et applique les regles CORS. Le SDK backend envoie `APP_ID` + `APP_SECRET` via les headers `x-app-id` et `x-app-secret`; le secret est compare avec le hash stocke.

### Evenements du SDK serveur

`POST /api/v1/server-events` est reserve aux backends des sites clients. La
requete doit fournir les headers `x-app-id` et `x-app-secret`, ainsi que :

```json
{
  "type": "purchase",
  "tagSlug": "purchase_confirmed",
  "sessionId": "visitor-session-12",
  "payload": { "amount": 49.99, "currency": "EUR" },
  "metadata": { "source": "showcase" }
}
```

`type`, `tagSlug` et `sessionId` sont obligatoires. Le TAG doit etre actif et
appartenir a l'application authentifiee. Une creation reussie retourne `201`.
Les champs invalides retournent `400`, les credentials invalides `401`, et un
TAG introuvable `404`.

## Gestion d'equipe par application

Les roles applicatifs sont :

| Role | Capacites |
|------|-----------|
| `owner` | Tous les droits, dont suppression de l'application et modification/suppression des sessions |
| `admin` | Gere configuration, credentials, equipe, tags, tunnels et widgets |
| `member` | Acces strictement en lecture aux donnees de l'application |

Routes d'equipe :

| Route | Droit applicatif | Description |
|-------|------------------|-------------|
| `GET /applications/:id/team` | `member` ou plus | Liste le proprietaire et les membres actifs |
| `GET /applications/:id/invitations` | `admin` ou `owner` | Liste les invitations en attente |
| `POST /applications/:id/invitations` | `admin` ou `owner` | Invite un ou plusieurs emails |
| `PATCH /applications/:id/members/:memberId` | `admin` ou `owner` | Change le role d'un membre |
| `DELETE /applications/:id/members/:memberId` | `admin` ou `owner` | Revoque un membre |
| `DELETE /applications/:id/invitations/:invitationId` | `admin` ou `owner` | Annule une invitation |
| `POST /team-invitations/:token/accept` | utilisateur connecte | Accepte une invitation pour son email |

Les membres simples sont en lecture seule. Les ecritures de configuration, credentials, equipe, tags, tunnels et widgets exigent `admin` ou `owner`. Seul l'owner peut supprimer l'application ou modifier/supprimer ses sessions. La creation et l'alimentation des sessions et evenements restent reservees au SDK. Ces restrictions sont appliquees cote API, pas seulement dans l'interface.

## Scripts

```bash
npm run dev
npm run migrate:up
npm run migrate:down
npm run migrate:status
npm run d:s:u
npm run test:mail
```
