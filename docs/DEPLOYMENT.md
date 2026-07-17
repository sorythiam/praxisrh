# Déploiement — Railway (API) + Vercel (web)

Guide opérationnel pour déployer/redéployer Praxis. Architecture choisie
(voir `docs/ARCHITECTURE.md` et l'historique de décision) : `apps/api`
(NestJS) sur Railway avec Postgres managé, `apps/web` (Next.js) sur
Vercel. Aucune réécriture de code — c'est exactement le même Dockerfile
que celui utilisé pour le self-hosting Docker Compose
(`infra/docker-compose.yml`).

## 1. Service API sur Railway

Le repo contient déjà `railway.json` à la racine, qui déclare le
builder Dockerfile et son chemin. Railway devrait le détecter
automatiquement dès que le repo est connecté. Si vous devez vérifier ou
saisir les champs manuellement dans l'onglet **Settings** du service :

| Champ | Valeur | Pourquoi |
|---|---|---|
| **Root Directory** | *(laisser vide — racine du repo)* | **Ne pas mettre `apps/api`.** Le Dockerfile a besoin du contexte de build complet du monorepo car `apps/api` dépend de `packages/shared` via un workspace npm (`COPY packages/shared/...` dans le Dockerfile) — un Root Directory limité à `apps/api` casserait ce `COPY`. |
| **Builder** | `Dockerfile` | Détecté automatiquement via `railway.json` (`build.builder: "DOCKERFILE"`). |
| **Dockerfile Path** | `apps/api/Dockerfile` | Déjà déclaré dans `railway.json` (`build.dockerfilePath`). |
| **Build Command** | *(laisser vide)* | Ne s'applique pas avec le builder Dockerfile — le `Dockerfile` contrôle entièrement le build (`RUN npm ci --ignore-scripts`, puis `npm run build --workspace=packages/shared`, `prisma generate`, `npm run build --workspace=apps/api`, dans cet ordre). |
| **Start Command** | *(laisser vide)* | Idem — le `Dockerfile` définit déjà `ENTRYPOINT ["./docker-entrypoint.sh"]` + `CMD ["node", "dist/main.js"]`. Cet entrypoint applique les migrations Prisma (`prisma migrate deploy`) et les politiques RLS (`rls.sql`) **à chaque démarrage du conteneur**, avant de lancer l'API — donc en usage normal (redeploy sur push), aucune commande manuelle de migration n'est nécessaire (voir section 3 pour les cas particuliers). |

## 2. Variables d'environnement

### `apps/api` (service Railway)

| Variable | Description | Exemple / valeur | Type |
|---|---|---|---|
| `DATABASE_URL` | Chaîne de connexion Postgres. | *(auto-injectée)* | **Ne pas définir manuellement** — une fois le plugin Postgres de Railway lié au service API, Railway l'injecte automatiquement (référence `${{Postgres.DATABASE_URL}}`). |
| `JWT_SECRET` | Clé secrète de signature des JWT de session. Une valeur faible ou par défaut compromet l'authentification de tous les tenants. | voir ci-dessous | **Secret à générer** |
| `STORAGE_DIR` | Chemin où sont écrits les fichiers générés (bulletins de paie, documents IPM, selfies intérim). Doit correspondre au point de montage d'un **Volume** Railway attaché à ce service. | `/data/storage` | Fixe |
| `WEB_ORIGIN` | Origine(s) autorisée(s) pour CORS, séparées par des virgules si plusieurs. | `https://praxis.vercel.app` | **URL à remplir après le déploiement Vercel** |
| `PORT` | Port d'écoute de l'API. | *(auto-injectée)* | **Ne pas définir manuellement** — Railway l'injecte automatiquement ; `main.ts` lit déjà `process.env.PORT`. |

**Génération de `JWT_SECRET`** — volontairement pas de valeur toute
faite dans ce document : un secret versionné dans git (même « à usage
unique ») finit tôt ou tard copié tel quel plutôt que régénéré, et git
en garde l'historique indéfiniment même après suppression. Générez-en
une localement à chaque déploiement/rotation, collez-la directement
dans Railway, ne la stockez nulle part ailleurs :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Ne pas oublier le Volume** : dans l'onglet **Volumes** du service
Railway, attachez un volume monté sur le chemin donné à `STORAGE_DIR`
(`/data/storage`). Sans volume, le système de fichiers de Railway est
éphémère — tout document généré disparaît au redeploy suivant.

### `apps/web` (projet Vercel)

| Variable | Description | Exemple / valeur | Type |
|---|---|---|---|
| `API_URL` | URL de base de l'API déployée (sans `/api` final). Utilisée **uniquement côté serveur**, dans `next.config.js` (`rewrites()`), pour proxyfier `/api/*` vers l'API — le navigateur n'appelle jamais directement cette URL. | `https://praxis-api-production.up.railway.app` | **URL à remplir après le déploiement Railway** |

C'est bien `API_URL`, **pas** `NEXT_PUBLIC_API_URL` : cette variable
n'est lue que côté serveur (dans `rewrites()`, exécuté par le serveur
Next.js/Vercel, jamais dans le bundle JS envoyé au navigateur), donc le
préfixe `NEXT_PUBLIC_` — qui expose une variable au code client — n'est
ni nécessaire ni souhaitable ici. Aucune autre variable d'environnement
n'est utilisée par `apps/web` (vérifié : c'est la seule occurrence de
`process.env` dans son code).

Pensez à définir `API_URL` pour les trois environnements Vercel
(Production, Preview, Development) si vous utilisez les Preview
Deployments, sans quoi les previews de PR continueront de pointer vers
`http://localhost:4000` par défaut.

## 3. Migrations Prisma

**En usage normal, rien à faire manuellement** : `docker-entrypoint.sh`
exécute `prisma migrate deploy` puis applique `prisma/rls.sql` à chaque
démarrage du conteneur Railway (les deux sont idempotents — un
redémarrage sans nouvelle migration ne fait rien).

Pour un cas particulier (vérifier une migration avant un déploiement,
inspecter l'état de la base) depuis votre machine :

1. Dans le dashboard Railway, ouvrez le plugin **Postgres** → onglet
   **Variables** (ou **Connect**) → copiez **`DATABASE_PUBLIC_URL`**
   (⚠️ pas `DATABASE_URL` tout court : cette dernière utilise un hôte
   `*.railway.internal`, résolu uniquement entre services à l'intérieur
   du réseau privé Railway — inutilisable depuis votre machine locale).
2. Depuis la racine du repo :

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL copiée à l'étape 1>" npm run prisma:deploy --workspace=apps/api
```

### Seed initial (règles pays + données de démo)

`prisma/seed.ts` fait deux choses en une seule commande : il insère les
`CountryRuleSet` (Sénégal et Côte d'Ivoire — nécessaires au calcul de
paie/congés dès qu'un tenant existe dans ce pays) **et** crée un tenant
de démonstration complet (entreprise fictive, 6 comptes de test avec le
mot de passe `Demo1234!`, adhérent IPM, mission intérim...). Si vous ne
voulez que les règles pays sans le tenant de démo sur votre instance de
production, il faudra scinder `seed.ts` — non fait à ce stade puisque
non demandé.

Pour exécuter le seed tel quel (à ne lancer qu'une fois, il est
idempotent grâce aux `upsert` mais recréer le tenant de démo sur une
instance de production n'a d'intérêt que pour vérifier que tout
fonctionne) :

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" npm run prisma:seed --workspace=apps/api
```

## 4. Frontend Vercel

- **Root Directory** : `apps/web`
- **Framework Preset** : Next.js (détecté automatiquement)
- **Variable d'environnement** : `API_URL` — voir section 2 ci-dessus.
- **Build/Install Command** : laissez les valeurs par défaut de Vercel
  (`next build` / `npm install`). Vercel détecte les workspaces npm à la
  racine du repo et y lance `npm install` avant de construire
  `apps/web` — c'est ce qui déclenche le `postinstall` racine qui
  compile `packages/shared` avant que `next build` en ait besoin (voir
  `docs/ARCHITECTURE.md` et `CLAUDE.md`). Ne changez pas cette
  détection automatique en forçant un Install Command scopé à
  `apps/web` uniquement, sinon `@praxis/shared` redevient introuvable.

## 5. Checklist de vérification post-déploiement

1. **API accessible** : ouvrez `https://<domaine-railway>/api/auth/me`
   directement dans le navigateur (ou `curl -i`). Attendu : une réponse
   JSON `401 Unauthorized` — pas de timeout, pas de 502/504. Une erreur
   réseau à ce stade indique un problème de build/démarrage du
   conteneur ou de port, pas encore de problème applicatif.
2. **Frontend accessible** : ouvrez `https://<domaine-vercel>/` — la
   page marketing doit s'afficher.
3. **Chaîne complète (le test le plus décisif)** : allez sur
   `https://<domaine-vercel>/subscribe`, remplissez le formulaire
   (nom d'entreprise, admin, mot de passe) et soumettez. Un succès
   prouve que : le rewrite Next.js a bien résolu `API_URL`, l'API
   Railway a répondu, et l'écriture en base Postgres via
   `DATABASE_URL` a réussi — vous êtes redirigé vers `/app`.
4. **Authentification sur une session fraîche** : déconnectez-vous puis
   reconnectez-vous sur `/login` avec le compte créé à l'étape 3 — 
   confirme que le JWT signé avec `JWT_SECRET` est correctement vérifié
   indépendamment de la session du navigateur qui l'a émis.
5. **Persistance réelle en base** : dans le dashboard Railway, ouvrez le
   plugin Postgres → onglet **Data** (ou connectez-vous avec
   `DATABASE_PUBLIC_URL` via `psql`) et vérifiez que la table `tenants`
   contient bien la ligne créée à l'étape 3 — confirme que ce n'est pas
   une réponse mise en cache ou simulée.
