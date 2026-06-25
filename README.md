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

## Démarrage rapide (local)

Depuis la racine du projet :

```bash
cd back
git pull
cp .env.example .env   # première fois uniquement
npm install
docker compose up -d mongo
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
