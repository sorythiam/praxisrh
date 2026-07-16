# Praxis — notes pour Claude Code

Monorepo npm workspaces : `apps/api` (NestJS + Prisma + PostgreSQL),
`apps/web` (Next.js App Router), `packages/shared` (types/enums/DTO
helpers partagés, compilé en CommonJS et consommé via
`@praxis/shared`).

## Build du monorepo

`packages/shared` doit être compilé (`tsc`) avant que `apps/api` ou
`apps/web` puissent résoudre `@praxis/shared` — son `dist/` n'est pas
versionné (`.gitignore`). C'est géré automatiquement par :

- un `postinstall` à la racine qui compile `packages/shared` juste après
  `npm install` (couvre le cas où l'installeur de la plateforme de build
  tourne depuis la racine du repo, ex. Vercel) ;
- un `postinstall` propre à `packages/shared` qui fait la même chose (couvre
  le cas où une plateforme installe uniquement le sous-dossier déployé,
  ex. Railway/Render avec un *Root Directory* pointant sur `apps/api`) ;
- un `postinstall` dans `apps/api` qui lance `prisma generate` (sans quoi
  le client Prisma reste vide/non typé sur un environnement de build
  distant, ce qui déclenche en cascade des erreurs `Property 'x' does not
  exist on type '{}'` un peu partout).

`npm run build` à la racine orchestre l'ordre correct
(`shared` → `api` → `web`) pour un build local complet.

**Piège Docker** : `apps/api/Dockerfile` et `apps/web/Dockerfile` ont un
stage `deps` qui ne copie que les `package.json` (pas le code source,
pas les `tsconfig.json`) avant de lancer `npm ci` — c'est fait exprès,
pour profiter du cache Docker sur les dépendances. Si ce `npm ci` lançait
les `postinstall` ci-dessus, ils échoueraient (rien à compiler, pas de
`tsconfig.json` présent à ce stage). D'où `npm ci --ignore-scripts` dans
ce stage précis ; le stage `build` qui suit copie le code source complet
et relance explicitement les mêmes étapes (`build --workspace=...`,
`prisma:generate`), donc rien n'est perdu. Ne jamais retirer ce
`--ignore-scripts` sans revérifier que le stage `deps` ne recopie pas
aussi le code source.

## Conventions

- **Avant chaque push** : `npm run build` (tous workspaces) et les tests
  d'isolation multi-tenant (`npm run test:e2e --workspace=apps/api`)
  doivent passer en local. Aucun push si le build échoue.
- Isolation tenant à deux couches (extension Prisma + RLS Postgres) —
  voir `docs/ARCHITECTURE.md`. Toute nouvelle table tenant-scopée doit
  être ajoutée à `apps/api/src/core/prisma/tenant-scoped.models.ts` ET à
  `apps/api/prisma/rls.sql`.
- Ne jamais utiliser `any` ou désactiver `strict`/`noImplicitAny` pour
  faire passer un build — corriger le typage réel. En pratique, la
  quasi-totalité des erreurs de typage rencontrées sur cette base de
  code viennent d'un client Prisma non généré ou de `@praxis/shared` non
  compilé, pas d'un vrai problème de typage — vérifier `npm run build`
  après un `npm install` propre avant de conclure à un bug de typage.
