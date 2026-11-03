# MyBoke

> **Biashara yako, kwa mpangilio.**

Mfumo wa usimamizi wa biashara (POS + hesabu + madeni + ripoti) kwa wafanyabiashara
wa Tanzania na Afrika Mashariki.

```
Deep Blue #0B37A1  →  Royal Blue #0269E9  →  Cyan #0A9CBF  →  Green #16A760
```

## Muundo

```
myboke/
├── MYBOKE_MASTER_SPEC.md          ← chanzo kimoja cha ukweli
├── apps/
│   └── backend/                   ← NestJS + Prisma + PostgreSQL + Swagger
├── docs/
│   ├── 01-fastapro-reference-analysis.md
│   └── assets/myboke-palette.png
├── docker-compose.yml             ← postgres · redis · minio
└── pnpm-workspace.yaml
```

## Kuanza

```bash
pnpm install
docker compose up -d postgres redis
cd apps/backend && cp .env.example .env
pnpm prisma:push && pnpm prisma:seed && pnpm dev
```

| Huduma | URL |
|---|---|
| API | <http://localhost:4000/v1> |
| Swagger | <http://localhost:4000/docs> |
| Health | <http://localhost:4000/v1/health> |

## Hali

- ✅ Backend core (auth, tenancy, catalog, sales, debts, expenses, reports)
- ⏳ Offline sync · queues · billing · admin
- ⏳ Kotlin Multiplatform client (Android · iOS · Desktop)

Tazama [`MYBOKE_MASTER_SPEC.md`](MYBOKE_MASTER_SPEC.md) kwa roadmap kamili.
