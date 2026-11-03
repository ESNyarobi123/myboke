# MyBoke — Backend API

NestJS 11 · Prisma 6 · PostgreSQL 16 · Swagger/OpenAPI.

Nyaraka kamili: [`../../MYBOKE_MASTER_SPEC.md`](../../MYBOKE_MASTER_SPEC.md)

## Kuanza (haraka)

```bash
# 1. Kutoka root ya repo
docker compose up -d

# 2. Backend
cd apps/backend
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:push      # au: pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

- API: <http://localhost:3000/v1>
- Swagger: <http://localhost:3000/docs>
- Health: <http://localhost:3000/v1/health>

## Endpoints zilizopo

| Kundi | Base | Hali |
|---|---|---|
| Health | `/v1/health` | ✅ |
| Auth | `/v1/auth` | ✅ register · login · refresh · logout · me |
| Businesses | `/v1/businesses` | ✅ current · update · members · invite |
| Shops | `/v1/shops` | ✅ CRUD · health |
| Products | `/v1/products` | ✅ CRUD · barcode · categories · stock adjust · low-stock |
| Sales | `/v1/sales` | ✅ create (idempotent) · list · get · receipt (VAT+EFD) · refund · void · payments · attach EFD |
| Customers | `/v1/customers` | ✅ CRUD |
| Debts | `/v1/debts` | ✅ CRUD · payments · summary · whatsapp remind |
| Expenses | `/v1/expenses` | ✅ CRUD · summary |
| Reports | `/v1/reports` | ✅ dashboard · sales · profit · top-products · stock |

## Kanuni

- Pesa ni `string` kwenye JSON (`"12400.00"`), `DECIMAL(18,2)` kwenye DB.
- `businessId` inatoka kwenye JWT — haiimbwi kwenye URL.
- `POST /sales` inaunga mkono `Idempotency-Key` kwa offline retry.
- Makosa yote ni `application/problem+json` (RFC 7807).

## Muundo

```
src/
├── common/      guards · decorators · filters · utils
├── infra/       prisma
└── modules/     auth · businesses · shops · products · sales
                 customers · debts · expenses · reports · health
```

## Mtiririko wa jaribio (curl)

```bash
# 1. Usajili
curl -X POST http://localhost:3000/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Salma","phone":"0712345678","password":"Nguvu2026","businessName":"Duka la Salma"}'

# 2. Tumia accessToken
export TOKEN="<accessToken>"

# 3. Ongeza bidhaa
curl -X POST http://localhost:3000/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Soda 500ml","buyingPrice":"800.00","sellingPrice":"1200.00","initialStock":"50"}'

# 4. Uza
curl -X POST http://localhost:3000/v1/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"shopId":"<shopId>","items":[{"productId":"<productId>","quantity":"2"}]}'

# 5. Dashboard
curl "http://localhost:3000/v1/reports/dashboard" -H "Authorization: Bearer $TOKEN"
```
