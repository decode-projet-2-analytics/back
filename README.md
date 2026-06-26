# Backend — Decode Analytics

API REST Express + TypeScript, base MongoDB (Mongoose).

## Prérequis

- Node.js
- Docker + Docker Compose

## Variables d'environnement

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

| Variable     | Description                    | Exemple local                                                                 |
| ------------ | ------------------------------ | ----------------------------------------------------------------------------- |
| `PORT`       | Port HTTP du serveur           | `3000`                                                                        |
| `JWT_SECRET` | Secret de signature JWT        | `change-me-in-local`                                                          |
| `MONGO_URL`  | URI de connexion MongoDB       | `mongodb://root:password@127.0.0.1:27019/decode?authSource=admin`           |

### URL MongoDB selon le contexte

| Contexte                         | Host dans `MONGO_URL`     |
| -------------------------------- | ------------------------- |
| Dev local (`npm run dev`)        | `@127.0.0.1:27019`        |
| Backend dans Docker (`compose`)  | `@mongo:27017`            |

En Docker, `MONGO_URL` est déjà définie dans `compose.yml` — pas besoin de la modifier dans `.env`.

## Migrations

Le schéma MongoDB (collections, indexes) est versionné avec [migrate-mongo](https://github.com/seppevs/migrate-mongo). Les fichiers se trouvent dans `migrations/` ; l'historique est stocké en base dans la collection `changelog`.

**Workflow local (obligatoire après un clone ou sur une base vide) :**

```bash
docker compose up -d mongo
npm run migrate:up
npm run dev
```

| Commande | Description |
| -------- | ----------- |
| `npm run migrate:up` | Applique les migrations en attente |
| `npm run migrate:down` | Annule la dernière migration |
| `npm run migrate:status` | Affiche l'état des migrations |
| `npm run migrate:create <nom>` | Crée un nouveau fichier de migration |
| `npm run d:s:u` | Alias de `migrate:up` |

Vérifier les indexes appliqués :

```bash
docker compose exec mongo mongosh -u root -p password --authenticationDatabase admin decode --eval "db.users.getIndexes(); db.apps.getIndexes()"
```

## Modèles Mongoose

Les modèles se trouvent dans `src/models/` :

| Modèle | Collection | Rôle |
| ------ | ---------- | ---- |
| `User` | `users` | Webmasters et admins (auth plateforme) |
| `App`  | `apps`  | Applications SDK (APP_ID, secret hashé, URLs CORS) |

Relation : un `User` possède plusieurs `App` via `App.ownerId` → `User._id`.

**Test manuel (création user + app en base) :**

```bash
npm run test:models
```

Le script crée un webmaster de test (`test-webmaster@example.com`), une app associée, vérifie le hash bcrypt et le virtual populate `user.apps`.

**Nettoyage des données de test :**

```bash
npm run test:models:clean
```

Vérifier le contenu en base :

```bash
docker compose exec mongo mongosh -u root -p password --authenticationDatabase admin decode --eval "db.users.find().pretty(); db.apps.find().pretty()"
```

## Auth — register, login, refresh

Routes publiques (sans JWT) sous `/api/v1/auth/`.

### Utilisateurs de test (dev)

Pour tester le login sans passer par la validation admin :

```bash
npm run seed:auth
```

| Email | Mot de passe | Rôle | Statut |
| ----- | ------------ | ---- | ------ |
| `admin@decode.local` | `TestPassword123!` | admin | validated |
| `webmaster@decode.local` | `TestPassword123!` | webmaster | validated |

### `POST /api/v1/auth/register`

Inscription webmaster — compte créé en `pending`, **pas de JWT**.

**Body :** `email`, `password` (≥ 8 car.), `companyName`, `kbisDocument`, `contactPhone`, `websiteUrl`

**201 :**
```json
{ "message": "Compte créé, en attente de validation" }
```

| Code | Cas |
| ---- | --- |
| `422` | Champs invalides (`error.details`) |
| `409` | Email déjà utilisé |

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contact@masociete.fr",
    "password": "MonMotDePasse123!",
    "companyName": "Ma Société SAS",
    "kbisDocument": "/uploads/kbis.pdf",
    "contactPhone": "0612345678",
    "websiteUrl": "https://masociete.fr"
  }'
```

### `POST /api/v1/auth/login`

**Body :** `{ "email", "password" }`

**200 :**
```json
{ "accessToken": "...", "refreshToken": "..." }
```

| Token | Durée | Usage |
| ----- | ----- | ----- |
| `accessToken` | 15 min | Header `Authorization: Bearer <token>` |
| `refreshToken` | 7 j | Body de `/auth/refresh` (type JWT dédié) |

| Code | Cas |
| ---- | --- |
| `401` | Email ou mot de passe incorrect |
| `403` | Compte `pending` ou `rejected` |
| `422` | Champs invalides |

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decode.local","password":"TestPassword123!"}'
```

### `POST /api/v1/auth/refresh`

**Body :** `{ "refreshToken": "..." }`

**200 :**
```json
{ "accessToken": "..." }
```

| Code | Cas |
| ---- | --- |
| `401` | Refresh token invalide ou expiré |
| `403` | Compte webmaster non validé |

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken du login>"}'
```

Validateurs : `src/lib/validators/register.ts`, `src/lib/validators/login.ts`  
JWT : `src/lib/jwt.ts` — secret via `JWT_SECRET` dans `.env`

## Démarrage rapide (local)

Depuis la racine du projet :

```bash
cd back
git pull
cp .env.example .env   # première fois uniquement
npm install
docker compose up -d mongo
npm run migrate:up
npm run dev
```

Vérification :

```bash
curl http://localhost:3000/api/v1/health
```

Réponse attendue :

```json
{ "status": "ok", "version": "v1", "mongo": "connected" }
```

## Démarrage via Docker

```bash
docker compose up -d
curl http://localhost:3008/api/v1/health/
```

Le backend écoute sur le port **3008** (mapping `3008:3000`).
