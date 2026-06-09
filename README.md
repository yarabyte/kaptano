# Kaptano

SaaS multi-tenant pour la capture de leads en salon professionnel avec relance WhatsApp automatique.

## Stack

- **apps/web** — Next.js 14, Tailwind, shadcn/ui, Supabase Auth
- **apps/worker** — Express, BullMQ, WaSender
- **packages/db** — Prisma + PostgreSQL
- **packages/shared** — Zod schemas, types, constantes

## Démarrage

### Prérequis

- Node.js 20+
- pnpm 9+
- PostgreSQL (Supabase recommandé)
- Redis (pour le worker)

### Installation

```bash
pnpm install
cp .env.example .env
# Renseigner DATABASE_URL, DIRECT_URL, Supabase, etc.

pnpm db:generate
pnpm db:push   # ou db:migrate

pnpm dev       # web + worker via Turborepo
```

### Services Docker (worker + Redis)

```bash
docker compose up -d redis
pnpm --filter @kaptano/worker dev
```

## Structure des routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/signup` | Inscription exposant |
| `/dashboard` | Espace exposant |
| `/c/[qrToken]` | Capture publique PWA |
| `/r/[messageJobId]` | Redirection catalogue trackée |
| `/platform` | Back-office admin |

## Variables d'environnement

Voir `.env.example`.

## Ordre de construction

Le projet suit la spec fonctionnelle : monorepo → auth → stands/catalogues → capture offline → worker WhatsApp → billing Stripe.
