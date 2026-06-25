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
