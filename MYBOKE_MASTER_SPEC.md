# MyBoke — Master Specification
### Mfumo wa Usimamizi wa Biashara · Product + Backend + Client Spec

| | |
|---|---|
| **Jina la bidhaa** | **MyBoke** |
| **Tagline** | *Biashara yako, kwa mpangilio.* |
| **Aina** | Business OS / POS / Bookkeeping kwa wafanyabiashara wadogo na wa kati (Tanzania & Afrika Mashariki) |
| **Backend** | **NestJS + Swagger/OpenAPI + PostgreSQL + Prisma + Redis** |
| **Client** | **Kotlin Multiplatform** (Android · iOS · Desktop) + Compose Multiplatform UI |
| **Brand** | Gradient `Deep Blue → Cyan → Green` (kutoka logo ya Connect Solutions) |
| **Lugha** | Kiswahili (default) · English |
| **Sarafu** | TZS (default) · configurable |
| **Toleo la nyaraka** | v1.0 — 1 Novemba 2026 |

> **Nyaraka hii ni chanzo kimoja cha ukweli (single source of truth).**
> Inaunganisha: brand, features, UX, business rules, backend API contract, database schema, na client architecture.
> Uchambuzi wa awali wa FastaPro (app iliyochunguzwa kwenye simu) uko kwenye [`docs/01-fastapro-reference-analysis.md`](docs/01-fastapro-reference-analysis.md).

---

## Hali ya Utekelezaji (1 Nov 2026)

Backend **imekamilika** — `apps/backend` (NestJS 11 · Prisma 6 · PostgreSQL 16).

| Tabaka | Hali |
|---|---|
| NestJS 11 + Swagger (`/docs`) + problem+json | ✅ 206 paths, kila operation ina summary |
| Prisma 6 + PostgreSQL 16 (models 50+) + migration baseline | ✅ `prisma migrate deploy` inafanya kazi |
| Auth (register · OTP · login · PIN · refresh rotation · logout-all · me · **2FA/TOTP** · **demo mode**) | ✅ imejaribiwa |
| Multi-tenancy (`businessId` kutoka JWT) + RBAC guards | ✅ imejaribiwa |
| Shops (majira · holidays · QR) · Products (variants · bundles · quick keys · labels PDF · **expiry alerts**) | ✅ imejaribiwa |
| Stock (adjust · transfer · count · valuation · alerts) | ✅ imejaribiwa |
| Sales (idempotent · receipt PDF · refund · void · split payments · held sales · loyalty) | ✅ imejaribiwa |
| Customers (segments · loyalty ledger · birthdays · campaigns) · Debts (ngazi 3 za kumbusho) · Expenses (recurring) | ✅ imejaribiwa |
| Reports (dashboard · sales · profit · stock · cash-flow · break-even · budgets · snapshots) | ✅ imejaribiwa |
| Analytics (overview · trends · compare · categories · shops) | ✅ imejaribiwa |
| Growth (missions · coins · demand · posters · assistant · streaks · restock/price suggestions) | ✅ imejaribiwa |
| Sync `/sync/push` `/sync/pull` `/sync/state` (+ conflicts, purge) | ✅ imejaribiwa |
| Billing (plans · checkout · invoices) + Snippe webhook (HMAC + idempotency) | ✅ imejaribiwa |
| Partners · Admin (impersonation · jobs · subscriptions · feedback) | ✅ imejaribiwa |
| Jobs (`@nestjs/schedule`, EAT) + manual triggers `POST /admin/jobs/:name/run` | ✅ imejaribiwa |
| Platform (AuditLog · API keys · Webhooks HMAC · Feedback · Daily digest · **Backup & Restore**) | ✅ imejaribiwa |
| Exports (async job + status + download) · Import (dry-run + progress) | ✅ imejaribiwa |
| PDPA (`GET /auth/me/export` JSON/PDF · `DELETE /auth/me`) | ✅ imejaribiwa |
| Rate limiting (100/min · auth 10/min kwa majaribio yaliyoshindikana) | ✅ imejaribiwa |
| Observability (`GET /metrics` Prometheus · `X-Request-Id` · JSON logs) | ✅ imejaribiwa |
| Push (FCM) + in-app notifications + devices | ✅ (FCM key ya hiari; dev = console) |
| Mipaka ya plan (maduka · wauzaji · bidhaa 50 kwa Bure) | ✅ imejaribiwa |
| Docker (`apps/backend/Dockerfile` + compose `api`) · lint · typecheck | ✅ |
| Unit tests (money · VAT · discount · EFD · date boundaries EAT · push · TOTP) | ✅ 25/25 zinapita |
| E2E suite (`test/e2e/api.e2e.mjs`) | ✅ 243/243 zinapita |
| KMP client · UI | ⏳ Phase 2 |

**Imethibitishwa kwa mtihani wa mwisho hadi mwisho:**
mauzo `3×1200 + 2×2000 − 500 = 7,100` · faida `1,900` · stock `50 → 44` · refund → stock `47` · idempotency inarudisha sale moja · dashboard/profit zinaondoa mauzo yaliyorudishwa · split payment `CASH 2000 + MPESA 600 = 2600` (MIXED) · credit limit inazuia deni linalozidi kikomo.

**VAT (imejaribiwa):** `472,000 gross → 400,000 net + 72,000 VAT (18%)`.
**EFD (imejaribiwa):** namba ya risiti + msimbo wa uthibitisho wa herufi 10.
**Unit tests:** `25 passed` — pesa, faida, punguzo, VAT, EFD code, mipaka ya tarehe EAT, push adapter, TOTP/2FA.
**E2E:** `243 passed, 0 failed` — inashughulikia catalog yote ya §10.6 pamoja na nyongeza za §10.6.1.

**Kuendesha:**
```bash
cd apps/backend
pnpm prisma:generate && pnpm prisma:deploy
pnpm dev                # http://localhost:4000/v1 · /docs
pnpm lint && pnpm typecheck && pnpm test
node test/e2e/api.e2e.mjs   # server lazima iwe hai
```

### Client ya KMP (2 Nov 2026)

| Tabaka | Hali |
|---|---|
| Splash yenye animation + muda wa chini `holdSplash()` (1.6s) | ✅ imejaribiwa kwenye Pixel 7 |
| Lugha **5**: Kiswahili · English · Español · Français · العربية (+ RTL kamili) | ✅ 290 funguo × 5 lugha, 0 zilizokosekana |
| Kiteuzi cha lugha (bottom sheet) kwenye onboarding, auth na Mipangilio | ✅ |
| RTL bila kuanzisha upya (`LocalLayoutDirection`) | ✅ imethibitishwa (`الرئيسية` upande wa kulia) |
| Onboarding hatua 4 + auth (login/register) + demo | ✅ imejaribiwa |
| Namba za simu: kiteuzi cha nchi (13 nchi), kusafisha na kuhakiki | ✅ `PhoneTest` 9/9 |
| Uimara wa neno la siri (Dhaifu/Wastani/Imara) | ✅ |
| Urejeshaji wa neno la siri (msimbo wa herufi 8) | ✅ imejaribiwa kifaa + API |
| Seva inayoweza kubadilishwa (Mipangilio → Seva) + emulator/real detection | ✅ `http://192.168.0.15:4000/v1` |
| `platform` ya UI: dashibodi, POS, bidhaa, wateja, madeni, ripoti, ankara, n.k. | ✅ inapanga + inapata data halisi |
| **Kufuli ya app (PIN 4)** — inafunga kwenye kuanza upya *na* app inapoingia nyuma; kubadilisha/kuzima PIN | ✅ imethibitishwa kwenye Pixel 7 |
| **Client 360** — wasifu mmoja: deni, jumla ya manunuzi, pointi, kikomo, mawasiliano (simu/WhatsApp), mauzo ya karibuni, malipo ya deni ndani ya ukurasa | ✅ imethibitishwa (SW/EN/AR-RTL) |
| **Maduka: saa za kazi · likizo · QR PNG** (`ShopScheduleScreen` + `ShopQrSheet`) | ✅ `ShopScheduleTest` 3/3 + `ShopScreenshotTest` 1/1 |

**Ushahidi wa mwisho (2 Nov 2026):**
- `assembleDebug` → BUILD SUCCESSFUL; APK imesakinishwa kwenye Pixel 7.
- `desktopTest` → inapita; `PhoneTest` 9/9.
- Usajili halisi kupitia app: `0714445555` → akaunti `Neema Juma` + biashara + duka (`/auth/me` imethibitisha).
- Login halisi → dashibodi halisi yenye `0` (akaunti mpya).
- Reset: `forgot` → msimbo `QDR25RK6` (dev) → `reset` → login kwa neno jipya ✅.
- Lugha zote 5 zimeonekana kwenye kifaa; Kiarabu kinaonyesha RTL na tarakimu za Kiarabu (`١٠`).

**Marekebisho ya 2 Nov (backend):**
- `POST /auth/password/forgot` sasa inatengeneza **msimbo wa herufi 8** (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), inahifadhi hash yake, inabatilisha misimbo ya zamani, na SMS inapata msimbo ule ule unaohakikiwa (awali SMS ilitumwa `token.slice(0,8)` wakati hash ilikuwa ya token yote — urejeshaji haukufanya kazi).
- `POST /auth/password/reset` inasoma msimbo kwa herufi kubwa; DTO inahakiki urefu 6–64.
- **Migongano ya njia imeondolewa:** ankara za usajili zipo `GET /billing/invoices` (awali `GET /invoices` iligongana na ankara za mauzo). `downloadUrl` isiyo halali imeondolewa.
- E2E: **243/243** zinapita.




---

## Jedwali la Maudhui

1. [Brand & Identity](#1-brand--identity)
2. [Vision, Malengo na Watumiaji](#2-vision-malengo-na-watumiaji)
3. [Kanuni za Bidhaa & Tofauti](#3-kanuni-za-bidhaa--tofauti)
4. [Dhana za Msingi (Domain Glossary)](#4-dhana-za-msingi-domain-glossary)
5. [Orodha Kamili ya Features](#5-orodha-kamili-ya-features)
6. [Ramani ya Skrini & Flows](#6-ramani-ya-skrini--flows)
7. [UI/UX — Maboresho na Mifumo](#7-uiux--maboresho-na-mifumo)
8. [Business Rules & Formula](#8-business-rules--formula)
9. [System Architecture](#9-system-architecture)
10. [Backend Design (NestJS)](#10-backend-design-nestjs)
11. [Database Schema (Prisma)](#11-database-schema-prisma)
12. [Kotlin Multiplatform Client](#12-kotlin-multiplatform-client)
13. [Mahitaji Yasiyo ya Kazi (NFR)](#13-mahitaji-yasiyo-ya-kazi-nfr)
14. [Roadmap](#14-roadmap)
15. [Repo Structure & Dev Setup](#15-repo-structure--dev-setup)
16. [Maamuzi Yaliyo Wazi](#16-maamuzi-yaliyo-wazi)
17. [Uzingatiaji wa Sheria (Tanzania)](#17-uzingatiaji-wa-sheria-tanzania)
18. [Vifaa & Uchapishaji](#18-vifaa--uchapishaji)
19. [Import / Export](#19-import--export)
20. [Telemetry & Analytics Events](#20-telemetry--analytics-events)
21. [Testing & QA](#21-testing--qa)
22. [DevOps, Deployment & DR](#22-devops-deployment--dr)
23. [Support & Ops Runbook](#23-support--ops-runbook)
24. [Viambatisho](#24-viambatisho)

---

# 1. Brand & Identity

## 1.1 Jina

**MyBoke** — neno "boke" linatokana na *"boke/boksi"* → duka, biashara ndogo, "kibanda cha biashara".
Maana ya kibiashara: **"biashara yangu ipo kwenye mpangilio mmoja"**.

| Matumizi | Umbizo |
|---|---|
| Jina la app / logo | `MyBoke` (M na B kubwa, hakuna nafasi) |
| Play Store / App Store | `MyBoke — Biashara Yako` |
| Package / bundle ID | `com.myboke.app` |
| Backend domain | `api.myboke.co.tz` |
| Admin domain | `admin.myboke.co.tz` |
| Marketing | `myboke.co.tz` |
| Deep link scheme | `myboke://` |
| Support | `support@myboke.co.tz` · WhatsApp `+255 …` |

## 1.1.1 Alama ya MyBoke (Logo)

Rangi zimetolewa kutoka logo uliyotoa (Connect Solutions). Alama ya MyBoke ni **boksi lililo wazi** — "boke" — likiwa na nguzo zinazopanda (biashara inayokua).

<img src="docs/assets/myboke-logo.png" alt="MyBoke logo" width="180" />

| Faili | Matumizi |
|---|---|
| [`docs/assets/myboke-logo.svg`](docs/assets/myboke-logo.svg) | Chanzo (vector, 512×512) |
| `docs/assets/icon-1024.png` | App Store |
| `docs/assets/icon-512.png` | Play Store |
| `docs/assets/icon-192.png` | Android xxxhdpi / PWA |
| `docs/assets/icon-144.png` | Android xxhdpi |
| `docs/assets/icon-96.png` | Android xhdpi |
| `docs/assets/icon-72.png` | Android hdpi |
| `docs/assets/icon-48.png` | Android mdpi / favicon |

**Kanuni za alama:**
- Background ni gradient ya brand (135°); kamwe usitumie nyeupe.
- Alama ni nyeupe + `lime #73D31C` kwa nguzo ya juu pekee.
- Radius ya pembe: 22% ya upana (112/512).
- Nafasi ya usalama (safe zone): 12% pande zote.
- Usiongeze maandishi ndani ya icon — jina linaonekana chini ya icon.
- Toleo la monochrome (kwa Android themed icons): boksi jeupe pekee, hakuna gradient.

## 1.2 Rangi (kutoka logo halisi)

Logo ya brand ina **gradient ya safu moja** kuanzia bluu ya kina → cyan → kijani.
Rangi zilizopimwa moja kwa moja kutoka kwenye picha (pixel sampling):

![MyBoke Brand Palette](docs/assets/myboke-palette.png)

| Sampuli | Hex | Matumizi ya msingi |
|---|---|---|
| **Deep Blue** | `#0B37A1` | Rangi kuu ya brand, headers, text yenye nguvu |
| **Royal Blue** | `#0269E9` | Primary button, links, icons za vitendo |
| **Cyan** | `#0A9CBF` | Secondary accent, charts, info states |
| **Green** | `#16A760` | Success, faida, mauzo mazuri, CTA mbadala |
| **Lime** | `#73D31C` | Micro-accent pekee (badge, sparkline) |

### 1.2.1 Gradient Kuu (brand signature)

```css
--mb-gradient-brand: linear-gradient(135deg, #0B37A1 0%, #0269E9 35%, #0A9CBF 65%, #16A760 100%);
--mb-gradient-primary: linear-gradient(135deg, #0269E9 0%, #0B37A1 100%);
--mb-gradient-success: linear-gradient(135deg, #16A760 0%, #0A9CBF 100%);
--mb-gradient-warm:   linear-gradient(135deg, #F59E0B 0%, #DC2626 100%);
```

**Tumia gradient wapi:** splash screen, app icon background, onboarding hero, balance/profit cards, mission cards, premium paywall, primary CTA yenye nguvu.
**Usitumie gradient wapi:** body background, list items, form fields, long text blocks (inasumbua kusoma).

### 1.2.2 Palettes Kamili (Design Tokens)

**Blue (brand core)**
| Token | Hex | Matumizi |
|---|---|---|
| `blue.50` | `#EAF1FF` | Background ya selected state, chip |
| `blue.100` | `#D3E2FF` | Hover light, info banner bg |
| `blue.200` | `#A8C6FF` | Disabled accent, chart grid |
| `blue.300` | `#7AA7FB` | Sparkline, secondary chart |
| `blue.400` | `#3D82F2` | Hover state ya primary |
| `blue.500` | `#0269E9` | **PRIMARY** — buttons, active tabs, links |
| `blue.600` | `#085DC0` | Pressed state |
| `blue.700` | `#0B37A1` | **BRAND DEEP** — headers, logo, dark CTA |
| `blue.800` | `#0A2E86` | Dark mode primary |
| `blue.900` | `#072B7A` | Deepest, splash |

**Cyan / Teal**
| Token | Hex | Matumizi |
|---|---|---|
| `cyan.100` | `#D6F4FA` | Info card bg |
| `cyan.300` | `#4FCBE4` | Chart accent |
| `cyan.500` | `#0A9CBF` | **SECONDARY** — info, charts, analytics |
| `cyan.700` | `#018E9F` | Pressed |
| `cyan.900` | `#045A66` | Dark text on cyan-100 |

**Green (success / profit)**
| Token | Hex | Matumizi |
|---|---|---|
| `green.100` | `#D5F5E3` | Success bg, faida badge |
| `green.300` | `#5FD98E` | Chart positive |
| `green.500` | `#16A760` | **SUCCESS** — faida, mauzo mazuri, "imehifadhiwa" |
| `green.600` | `#0E8A50` | Pressed |
| `green.900` | `#0A5A36` | Dark text on green-100 |

**Semantic**
| Token | Hex | Matumizi |
|---|---|---|
| `success` | `#16A760` | Faida, imefanikiwa |
| `warning` | `#F59E0B` | Stock ndogo, inaisha |
| `danger` | `#DC2626` | Hasara, imekwisha, delete, deni limechelewa |
| `info` | `#0A9CBF` | Taarifa, tips |
| `lime` | `#73D31C` | Micro-accent pekee |

**Neutral (light mode)**
| Token | Hex | Matumizi |
|---|---|---|
| `bg` | `#F5F7FB` | App background |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surface-2` | `#EEF2FA` | Inputs, chips za sekondari |
| `border` | `#E2E8F4` | Dividers, borders |
| `text.primary` | `#0B1220` | Maandishi makuu |
| `text.secondary` | `#4A5568` | Maelezo |
| `text.muted` | `#8A94A6` | Placeholder, meta |
| `text.inverse` | `#FFFFFF` | Juu ya rangi |

**Neutral (dark mode)**
| Token | Hex |
|---|---|
| `bg` | `#080D18` |
| `surface` | `#111A2B` |
| `surface-2` | `#182339` |
| `border` | `#22304A` |
| `text.primary` | `#F2F5FA` |
| `text.secondary` | `#A8B4C8` |
| `text.muted` | `#6E7C93` |

### 1.2.3 Sheria za Matumizi ya Rangi (Rules)

1. **60-30-10:** 60% neutral (bg/surface), 30% blue, 10% green/cyan accent.
2. **Rangi moja ya action kwa skrini.** Primary action = `blue.500`. Secondary = outline. Destructive = `danger` pekee.
3. **Faida/success** daima `green` — **kamera moja ya rangi** kwa "chanya".
4. **Hasara/deni/danger** daima `danger` — usitumie nyekundu kwa decoration.
5. **Gradient ni ya hero pekee** — max `1` gradient kwa skrini.
6. **Contrast:** text yote ≥ 4.5:1 (WCAG AA). Juu ya `blue.500`/`blue.700` tumia `text.inverse`.
7. Usitumie `lime` kwa text — ni kwa badge/dot pekee.

## 1.3 Typography

| Nafasi | Font | Ukubwa | Uzito | Line-height |
|---|---|---|---|---|
| Display | Plus Jakarta Sans | 32–40 | 800 | 1.15 |
| H1 | Plus Jakarta Sans | 26–30 | 700 | 1.2 |
| H2 | Plus Jakarta Sans | 20–22 | 700 | 1.25 |
| H3 / Card title | Plus Jakarta Sans | 16–18 | 600 | 1.3 |
| Body | Inter | 14–15 | 400 | 1.5 |
| Body strong | Inter | 14–15 | 600 | 1.5 |
| Caption / Meta | Inter | 12–13 | 500 | 1.4 |
| Label | Inter | 11–12 | 700, letter-spacing 0.08em, UPPERCASE | 1.3 |
| Number / Money | Inter (tabular-nums) | 18–36 | 700–800 | 1.1 |

> **Muhimu:** namba za pesa zitumie `fontFeatureSettings = "tnum"` (tabular figures) ili safu zilingane.

## 1.4 Iconografia & Shapes

- **Icons:** Material Symbols Rounded (outlined), stroke 2.
- **Radius:** `sm 8` · `md 12` · `lg 16` · `xl 20` · `2xl 24` · `full 999`.
- **Elevation:** `sm shadow(0,1,2, .06)` · `md shadow(0,4,12, .08)` · `lg shadow(0,8,24, .10)`.
- **Spacing scale:** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48.
- **Touch target:** ≥ 48dp (Android) / ≥ 44pt (iOS).
- **Icons za module (zilizotumika FastaPro, tunaendelea nazo kwa mfumo sawa):**
  Nyumbani · Ripoti · Wauzaji · Taarifa · Profaili · Uza · Wateja · Gharama · Mauzo · Madeni · Faida · Bidhaa · Duka · Takwimu · Sarafu

## 1.5 Sauti ya Brand (Tone of Voice)

| Sifa | Mfano |
|---|---|
| Rahisi | "Uza bidhaa 3 kwa dakika moja." |
| Inatia moyo | "Umefanya vizuri leo — faida imeongezeka 12%." |
| Haituhumi | "Stock ya soda imeisha. Ungependa kuongeza?" |
| Kiswahili kwanza | Maneno ya kawaida ya dukani, sio ya benki |
| Haiitaji maelezo | Kila kitufe kinaeleweka bila mwongozo |

**Maneno tunayotumia:** Duka · Bidhaa · Mauzo · Faida · Deni · Mteja · Muuzaji · Risiti · Stock
**Maneno tunayakwepa:** *Transaction, Entity, Ledger, SKU (tumia "Msimbo wa bidhaa"), Invoice* — isipokuwa kwenye nyaraka za kiufundi.

---

# 2. Vision, Malengo na Watumiaji

## 2.1 Vision

> **Kila mfanyabiashara wa Afrika Mashariki awe na "ofisi" yake mfukoni — bila kuandika daftari, bila kukisia faida.**

## 2.2 Malengo ya Bidhaa (Goals)

| # | Goal | Kipimo cha Mafanikio |
|---|---|---|
| G1 | Mfanyabiashara **ajue faida halisi** kila siku | 80% ya watumiaji wanaotumia app siku 7 wanaona faida ≥ mara 1 |
| G2 | **Kuuza kuchukue sekunde < 30** | Median time-to-sale < 30s |
| G3 | **Kufanya kazi bila internet** | 100% ya mauzo yanarekodiwa offline na kusync |
| G4 | **Kupunguza madeni yaliyochelewa** | 30% kupungua kwa overdue baada ya siku 60 |
| G5 | **Kukusanya data ya mahitaji (demand)** | ≥ 1M demand records/mwezi mwaka wa 2 |
| G6 | **Kujiendesha kifedha** | Conversion ya free → paid ≥ 8% |

## 2.3 Personas

### P1 — Mama Salma · Duka la vyakula, Kinondoni
- Simu: Android ya kati (2–3 GB RAM), internet ya bundle
- Sasa: daftari + kikokotoo cha simu
- Anaogopa: "app itanichanganya", "itahitaji internet"
- Anahitaji: kuuza haraka, kujua faida, kujua nani ana deni
- **Design implication:** onboarding < 3 dakika, offline kwanza, buttons kubwa, Kiswahili

### P2 — Juma · Maduka 3 (vyakula, vipodozi, vipuri)
- Ana wafanyakazi 2
- Anaogopa: wizi wa stock, kukosa kujua duka lipi linafanya vizuri
- Anahitaji: multi-shop, wauzaji tofauti, ripoti kwa duka, stock transfer
- **Design implication:** shop switcher kila mahali, dashboard iliyogawanywa kwa duka

### P3 — Neema · Muuzaji (mhudumu)
- Hana interest na ripoti ndefu
- Anahitaji: kufungua, kuuza, kufunga zamu
- **Design implication:** seller mode rahisi, hakuna menyu ya ripoti

### P4 — Daudi · Mfanyabiashara wa jumla (supplier)
- Anahitaji kujua bidhaa zipi zinatafutwa madukani
- **Design implication:** B2B demand report, leads

### P5 — Fasta/Partner · Wakala wa maeneo
- Anasajili wafanyabiashara na kupata commission
- **Design implication:** referral code, commission dashboard

## 2.4 Success Metrics (North Star + supporting)

**North Star Metric:** **Idadi ya mauzo yaliyorekodiwa kwa wiki** (Weekly Recorded Sales — WRS).
Hii inapima: app inatumika kweli, sio kusakinishwa tu.

**Supporting metrics:**

| Kundi | Metric | Lengo la Mwaka 1 |
|---|---|---|
| Activation | % waliokamilisha onboarding + sale ya kwanza saa 24 | ≥ 55% |
| Engagement | WRS kwa duka | ≥ 20 |
| Retention | D30 retention | ≥ 40% |
| Reliability | Sync success rate | ≥ 99.5% |
| Performance | API p95 | < 250 ms |
| Monetization | Free → Paid | ≥ 8% |
| Quality | Crash-free sessions | ≥ 99.7% |

---

# 3. Kanuni za Bidhaa & Tofauti

## 3.1 Kanuni 8 (Product Principles)

1. **Offline ni kawaida, sio hitilafu.** App haipaswi kumwambia "hakuna internet" kama kizuizi.
2. **Namba moja inatosha.** Kila skrini ina jibu moja la namba moja (`Faida ya leo: 12,400 TZS`).
3. **Sekunde 30 kwa mauzo.** Flow ya kuuza ni fupi kuliko ya kuangalia ripoti.
4. **Kiswahili kwanza, English kama chaguo** — sio mchanganyiko.
5. **Hakuna kitufe kinachokosa kazi.** Kila kitufe kinaenda mahali.
6. **Data ya mtumiaji ni yake.** Export, backup, delete — vyote vinapatikana.
7. **Hesabu ni takatifu.** Pesa ni `DECIMAL`, sio `float`. Kila sale inahesabiwa mara moja tu (idempotency).
8. **Msaidizi asikae kimya.** AI inapendekeza hatua inayofuata, sio ripoti tupu.

## 3.2 Tofauti Yetu vs FastaPro

| FastaPro (kama ilivyo) | MyBoke (tutakavyo) |
|---|---|
| Home ni launcher tupu | **Home ipo na dashboard ya leo** (mauzo, faida, deni, stock alerts) |
| Header icons hazifanyi kazi | Kila kitufe kina kazi au hakipo |
| Lugha inahitaji restart | **Switch ya papo hapo** (state-driven, hakuna restart) |
| Mchanganyiko wa lugha kwenye skrini | **i18n kamili** — hakuna string iliyobaki hardcoded |
| Filters ni static (`Last 7 Days` label) | **Filters zote zinafanya kazi** (7/30/90/custom) |
| Rewards zote "Soon" | Rewards zinazofanya kazi tangu siku 1 (au hazipo) |
| Search ni ya skrini moja | **Global search** (bidhaa, mteja, sale, deni) |
| Hakuna returns/refunds | **Returns & refunds** kamili |
| Hakuna suppliers/PO | **Suppliers + Purchase Orders** (B2B) |
| Hakuna stock transfer | **Stock transfer** kati ya maduka |
| Ripoti kwenye app tu | **Export Excel/PDF + API ya ripoti** |
| Hakuna audit | **Audit log** kwa kila mabadiliko ya pesa |
| Backend: Firebase (vendor lock-in) | **Postgres inayomilikiwa** — export, SQL, BI yoyote |
| Haiwezi kutumika desktop | **KMP: Android + iOS + Desktop** |

---

# 4. Dhana za Msingi (Domain Glossary)

| Neno | Maana | Entity |
|---|---|---|
| **Biashara** | Tenant / kampuni ya mtumiaji. Inaweza kuwa na maduka mengi | `Business` |
| **Duka** | Sehemu moja ya biashara (branch). Stock yake, mauzo yake, wafanyakazi wake | `Shop` |
| **Mwanachama** | Mtumiaji ndani ya biashara (OWNER, MANAGER, CASHIER) | `Membership` |
| **Bidhaa** | Item inayouzwa | `Product` |
| **Stock** | Idadi ya bidhaa iliyopo. Ni batili ndani ya duka | `StockLevel` |
| **Mauzo (Sale)** | Muamala mmoja wa kuuza (unaweza kuwa na items nyingi) | `Sale`, `SaleItem` |
| **Risiti** | Hati ya mauzo (PDF, WhatsApp, au thermal print) | `Receipt` |
| **Gharama** | Fedha iliyotoka kwa ajili ya biashara | `Expense` |
| **Deni** | Fedha inayodaiwa au inadaiwa | `Debt` |
| **Malipo** | Fedha iliyolipwa kwa deni au kwa mauzo ya mkopo | `Payment` |
| **Mteja** | Mnunuzi anayerekodiwa | `Customer` |
| **Muuzaji** | Mhudumu anayeuza kwa niaba ya biashara | `Membership` role CASHIER |
| **Zamu (Shift)** | Kipindi cha kufanya kazi cha muuzaji (cash drawer) | `Shift` |
| **Faida** | Mauzo − gharama ya bidhaa − punguzo | computed |
| **Faida Halisi** | Faida − matumizi | computed |
| **Sarafu (BokeCoins)** | Motisha kwa matendo mazuri ndani ya app | `CoinTransaction` |
| **Misheni** | Kazi ya kila siku inayopendekezwa na AI | `Mission` |
| **Mahitaji (Demand)** | Bidhaa ambayo mteja aliomba lakini haipo | `DemandRecord` |
| **Mpango (Plan)** | Subscription ya biashara | `Plan`, `Subscription` |
| **Wakala (Partner)** | Mtu anayesajili wateja kwa commission | `Partner` |

> **Muhimu:** `Business` = tenant. Mipaka yote ya data inaanzia hapa. `Shop` ni chini yake.

---

# 5. Orodha Kamili ya Features

Alama: ✅ = ipo kwenye FastaPro · 🆕 = mpya kwa MyBoke · 🔧 = ipo FastaPro lakini tunaboresha

## 5.1 Uthibitisho & Usajili (Auth)

| # | Feature | Hali |
|---|---|---|
| A1 | Usajili kwa email + password | ✅ |
| A2 | Usajili kwa **namba ya simu + OTP** (bila email) | 🆕 |
| A3 | Login kwa email au simu | 🔧 |
| A4 | Kusahau password (email/SMS) — msimbo wa herufi 8, torati moja | ✅ |
| A5 | Biometric login (fingerprint/face) | 🆕 |
| A6 | Refresh token rotation + kifaa kimoja au vingi | 🆕 |
| A7 | Login ya muuzaji kwa PIN (sio password ndefu) | 🔧 |
| A8 | Mwaliko wa mwanachama kwa simu (SMS/WhatsApp) | 🆕 |
| A9 | Onboarding wizard hatua 4 (biashara → duka → bidhaa ya kwanza → sale ya kwanza) | 🆕 |
| A10 | Demo mode (data ya mfano, bila usajili) | 🆕 |
| A11 | Kufuta akaunti (na data export kabla) | 🔧 |
| A12 | 2FA kwa OWNER (optional) | 🆕 |

## 5.2 Duka & Biashara (Tenant)

| # | Feature | Hali |
|---|---|---|
| B1 | Biashara moja, maduka mengi | ✅ |
| B2 | Shop switcher ya haraka (global) | 🔧 |
| B3 | Kuongeza/kuhariri/kufuta duka | ✅ |
| B4 | **Stock transfer kati ya maduka** | 🆕 |
| B5 | **Ripoti ya kulinganisha maduka** | 🆕 |
| B6 | Mipaka ya maduka kwa plan | ✅ |
| B7 | Saa za kazi za duka + likizo | 🆕 |
| B8 | Location (GPS) + QR ya duka | 🆕 |

## 5.3 Bidhaa & Stock

| # | Feature | Hali |
|---|---|---|
| C1 | CRUD bidhaa | ✅ |
| C2 | Barcode scan + manual | ✅ |
| C3 | Category (free text + suggested) | 🔧 |
| C4 | Unit types (pcs, kg, g, l, m, pkt) + custom | 🔧 |
| C5 | Buying/selling price | ✅ |
| C6 | **Price history + mabadiliko ya bei** | 🔧 |
| C7 | Stock alert level (default 10% ya awali) | ✅ |
| C8 | Expiry date + alerts | ✅ |
| C9 | Excel import (template) | ✅ |
| C10 | Excel/CSV export | 🆕 |
| C11 | **Print barcode labels** | 🆕 |
| C12 | **Stock adjustments** (hasara, uharibifu, hesabu) na sababu | 🆕 |
| C13 | **Stock take / inventory count** (hesabu ya mwisho wa mwezi) | 🆕 |
| C14 | Bidhaa nyingi kwa barcode moja (variants: size/color) | 🆕 |
| C15 | **Bundle / kifurushi** (bidhaa 2+ zinauzwa pamoja) | 🆕 |
| C16 | Picha ya bidhaa | 🆕 |
| C17 | Supplier wa bidhaa | 🆕 |

## 5.4 Uuzaji (POS)

| # | Feature | Hali |
|---|---|---|
| D1 | Cart ya haraka | ✅ |
| D2 | Quantity + unit + decimals | ✅ |
| D3 | Discount (kiasi au %) na kinga ya kikomo | ✅ |
| D4 | Kuchagua mteja au walk-in | ✅ |
| D5 | Muuzaji anayeuza (attribution) | ✅ |
| D6 | Njia ya malipo (Cash, M-Pesa, Mix) | 🔧 |
| D7 | Tarehe ya mauzo (backdating) | ✅ |
| D8 | Risiti: WhatsApp, PDF, thermal print | ✅ |
| D9 | Kuhariri / kufuta mauzo (na kurudisha stock) | ✅ |
| D10 | **Returns & refunds** (bidhaa moja au zote) | 🆕 |
| D11 | **Mauzo ya mkopo** (deni moja kwa moja kwenye sale) | 🔧 |
| D12 | **Split payment** (cash + M-Pesa kwa sale moja) | 🆕 |
| D13 | **Hold / park sale** (mteja amesahau pesa) | 🆕 |
| D14 | **Shift / cash drawer** (kuanza & kufunga zamu + Z-report) | 🆕 |
| D15 | Offline queue + auto sync | ✅ |
| D16 | **Voice input** (sema jina la bidhaa kwa Kiswahili) | 🆕 |
| D17 | **Quick keys** (bidhaa 8 zinazouzwa zaidi kwenye POS) | 🆕 |
| D18 | **Ombi la Mteja** (bidhaa haipo → demand + coins) | ✅ |
| D19 | **Kurasa ya risiti**: jina la duka, TIN, VAT, namba ya simu, QR | 🆕 |

## 5.5 Wateja (CRM)

| # | Feature | Hali |
|---|---|---|
| E1 | Rejista (jina + simu) | ✅ |
| E2 | Search / edit / delete | ✅ |
| E3 | Salio la deni | ✅ |
| E4 | Historia ya malipo | ✅ |
| E5 | Win-back message (WhatsApp) | ✅ |
| E6 | Dedup | ✅ |
| E7 | **Customer credit limit** (kinga ya deni kupita kiasi) | 🆕 |
| E8 | **Loyalty points** (pointi kwa kila ununuzi) | 🆕 |
| E9 | **Customer segments** (wazuri, waliopotea, wapya) | 🆕 |
| E10 | **Bulk WhatsApp campaign** (ujumbe kwa kundi) | 🆕 |
| E11 | **Customer statement** (PDF ya madeni yote) | 🆕 |
| E12 | Tarehe ya kuzaliwa + greetings | 🆕 |

## 5.6 Fedha (Finance)

| # | Feature | Hali |
|---|---|---|
| F1 | Gharama (6 categories + custom) | ✅ |
| F2 | Madeni: Owe Me / I Owe | ✅ |
| F3 | Malipo ya deni | ✅ |
| F4 | Overdue debts | ✅ |
| F5 | Kumbusho la deni (ngazi 3) | ✅ |
| F6 | Faida: day/week/month/range | ✅ |
| F7 | Ripoti ya mapato (mwezi, kwa duka / maduka yote) | ✅ |
| F8 | Faida halisi = faida − matumizi | ✅ |
| F9 | **Recurring expenses** (kodi, umeme, mshahara) | 🆕 |
| F10 | **Cash flow statement** (fedha iliyoingia vs iliyotoka) | 🆕 |
| F11 | **Break-even analysis** | 🆕 |
| F12 | **Budget per category** + tahadhari | 🆕 |
| F13 | **Supplier payments** (tunadaiwa na suppliers) | 🆕 |
| F14 | VAT / TIN support (optional) | 🆕 |

## 5.7 Ripoti & Takwimu

| # | Feature | Hali |
|---|---|---|
| G1 | Income report ya mwezi | ✅ |
| G2 | Shop analytics | ✅ |
| G3 | Revenue trend (7 siku) | 🔧 (7/30/90) |
| G4 | Stock flow chart | ✅ |
| G5 | Stock value + stock health % | ✅ |
| G6 | Recommendations | 🔧 (zenye data halisi) |
| G7 | Download PDF | ✅ |
| G8 | **Export Excel/CSV** | 🆕 |
| G9 | **Top products / top customers / top sellers** | 🆕 |
| G10 | **Kulinganisha vipindi** (mwezi huu vs uliopita) | 🆕 |
| G11 | **Ripoti ya kila siku kwa WhatsApp/email** (opt-in) | 🆕 |
| G12 | **Dashboard ya desktop / web** (kwa KMP desktop) | 🆕 |

## 5.8 Ukuaji (Growth) — AI + Motisha

| # | Feature | Hali |
|---|---|---|
| H1 | Sales Coach missions | ✅ |
| H2 | Impact measurement (siku 7) | ✅ |
| H3 | BokeCoins wallet | ✅ |
| H4 | AI poster generator | ✅ |
| H5 | B2B demand report | ✅ |
| H6 | Demand leaderboard kwa ward | ✅ |
| H7 | Partner program + commission | ✅ |
| H8 | Referral codes | ✅ |
| H9 | **Rewards zinazofanya kazi** (airtime, discount voucher) | 🆕 |
| H10 | **AI chat assistant** (uliza "faida yangu wiki hii?") | 🆕 |
| H11 | **Restock suggestions** (kwa kutumia demand + msimu) | 🆕 |
| H12 | **Price suggestions** (margin + demand) | 🆕 |
| H13 | **Streaks & badges** (siku 7 mfululizo) | 🆕 |

## 5.9 Platform

| # | Feature | Hali |
|---|---|---|
| I1 | Multi-shop | ✅ |
| I2 | Wauzaji wenye login yao | ✅ |
| I3 | Subscription (Snippe) | ✅ |
| I4 | Admin dashboard | ✅ |
| I5 | Notifications | ✅ |
| I6 | Force update | ✅ |
| I7 | Rate us | ✅ |
| I8 | Offline mode | ✅ |
| I9 | OTA updates | 🔧 (KMP: in-app update) |
| I10 | Kiswahili/English | 🔧 (kamili, papo hapo) |
| I11 | **Dark mode** | 🆕 |
| I12 | **Accessibility** (text kubwa, high contrast) | 🆕 |
| I13 | **Audit log** | 🆕 |
| I14 | **Backup & restore** (export data yote) | 🆕 |
| I15 | **Multi-device sync** | 🆕 |
| I16 | **Webhooks / API keys** kwa waendelezaji | 🆕 |
| I17 | **Desktop app** (KMP) | 🆕 |
| I18 | **Tablet layout** (POS kwenye tablet) | 🆕 |

---

# 6. Ramani ya Skrini & Flows

## 6.1 Navigation Map (mpya)

```
MyBoke
├── SPLASH → ONBOARDING (mara ya kwanza)
│   ├── 1. Karibu (brand gradient)
│   ├── 2. Biashara yako (jina, aina)
│   ├── 3. Duka la kwanza (jina, mahali)
│   ├── 4. Bidhaa ya kwanza (jina, bei, stock)
│   └── 5. Sale ya kwanza → Home 🎉
│
├── AUTH
│   ├── Ingia (simu/email + password/PIN)
│   ├── Jisajili (simu + OTP)
│   ├── S sahau password
│   └── Demo mode
│
├── MAIN SHELL (bottom nav 5)
│   ├── 🏠 NYUMBANI  ← DASHBOARD MPYA
│   │   ├── Header: MyBoke | search 🔍 | notifications 🔔 | avatar
│   │   ├── Shop switcher pill
│   │   ├── HERO: Faida ya leo (gradient card)
│   │   ├── KPI grid 2×2: Mauzo · Gharama · Madeni · Bidhaa
│   │   ├── Quick actions (6)
│   │   ├── "Hii leo" — chart ndogo ya wiki
│   │   ├── Tahadhari (stock ndogo, deni limechelewa, expiry)
│   │   ├── Mission ya leo (1 card)
│   │   └── Shughuli za hivi karibuni (5)
│   │
│   ├── 🧾 UZA (center FAB-style tab)
│   │   └── Complete Sale (POS)
│   │
│   ├── 📊 RIPOTI
│   │   ├── Income Report
│   │   ├── Sales Report
│   │   ├── Profit
│   │   ├── Analytics
│   │   └── Export center
│   │
│   ├── 👥 WATEJA/WAUZAJI (segmented)
│   │   ├── Wateja
│   │   ├── Wauzaji
│   │   └── Madeni
│   │
│   └── ⚙️ ZAIDI (More)
│       ├── Bidhaa
│       ├── Maduka
│       ├── Taarifa
│       ├── BokeCoins
│       ├── Msaidizi (AI)
│       ├── Subscription
│       ├── Mipangilio
│       └── Profaili
│
└── MODALS / SHEETS
    ├── GlobalSearch
    ├── NotificationsSheet
    ├── ShopSelector
    ├── ProductPicker (POS)
    ├── BarcodeScanner
    ├── PaymentSheet
    ├── ReceiptPreview
    ├── MissionSheet
    ├── LanguageSheet
    ├── ExportSheet
    └── ConfirmDialog
```

### Mabadiliko muhimu vs FastaPro

| FastaPro | MyBoke |
|---|---|
| Tabs: Nyumbani · Ripoti · Wauzaji · Taarifa · Profaili | Tabs: Nyumbani · **Uza** · Ripoti · Wateja · Zaidi |
| Home ni launcher | Home ni **dashboard** |
| Kuuza ni card ndani ya Home | Kuuza ni **tab ya kati** (daima sekunde 1 away) |
| Bidhaa/Maduka/Takwimu ziko Home | Ziko **Zaidi** (ili Home ibaki safi) |
| Hakuna global search | Search kwenye header (kila mahali) |
| Taarifa ni tab | Taarifa ni **sheet** + badge ya namba |

## 6.2 Screen Specs (muundo wa kila skrini)

### S1 · Onboarding (4 hatua)

| Kipengele | Maelezo |
|---|---|
| Background | Gradient `--mb-gradient-brand` |
| Hatua indicator | Dots 4, inayotumika = white, zilizopita = white 60% |
| Hatua 1 | "Karibu MyBoke" + "Biashara yako, kwa mpangilio." + CTA `Anza` |
| Hatua 2 | `Jina la biashara` · `Aina ya biashara` (chips: Duka la vyakula, Vipodozi, Nguo, Vipuri, Mengine) |
| Hatua 3 | `Jina la duka` · `Mahali` (optional) |
| Hatua 4 | `Bidhaa ya kwanza` (jina, bei ya kuuza, stock) → `Anza kuuza` |
| Skip | "Nitaongeza baadaye" (inaleta Home tupu yenye mwongozo) |
| API | `POST /auth/register`, `POST /businesses`, `POST /shops`, `POST /products` |

### S2 · Home (Dashboard) 🆕

| Eneo | Maudhui |
|---|---|
| Header | `MyBoke` (logo) · search 🔍 · bell 🔔 (badge) · avatar |
| Shop pill | `Yuni` ▾ — inafungua ShopSelector |
| Hero card (gradient) | Label `FAIDA YA LEO` · namba kubwa `12,400 TZS` · delta `↑ 12% vs jana` · sparkline ndogo |
| KPI grid 2×2 | `Mauzo` `45,000` · `Gharama` `8,200` · `Madeni` `32,000` · `Bidhaa` `128` |
| Quick actions | Uza · Bidhaa · Wateja · Gharama · Madeni · Ripoti |
| "Wiki hii" | Bar chart siku 7 (Mon–Sun) |
| Tahadhari | Cards: `Stock ndogo: 3` · `Inaisha: 1` · `Deni limechelewa: 2` |
| Mission ya leo | Card moja + `Ona zote` |
| Shughuli | Sale 5 za mwisho (time, item, kiasi, faida) |
| Empty state | "Anza kuuza" card + checklist 3 hatua |
| API | `GET /dashboard/summary?shopId=` |

### S3 · Complete Sale (POS)

Layout (mobile): header → chips → cart → **sticky bottom bar**
Layout (tablet/desktop): cart kushoto, product grid kulia, summary mwisho

| Eneo | Maelezo |
|---|---|
| Header | ← `Uza` · duka · `SW/EN` |
| Chips row (scroll) | Punguzo · Kiasi · **Mteja** · Muuzaji · Malipo · Tarehe |
| Cart | Items + steppers (− / qty / +) + swipe-to-delete |
| Quick keys | Bidhaa 8 zinazouzwa zaidi (grid 4×2) |
| Search / scan | Search bar + camera icon |
| Bottom bar | `Jumla Ndogo` / `Punguzo` / **`Jumla`** + button `Hifadhi & Risiti` |
| Hold sale | Icon ya `‖` kuhifadhi cart |
| Empty | "Cart ni tupu" + `Ongeza bidhaa` + quick keys |
| Validation | discount ≤ subtotal; qty > 0; stock inatosha (warning, sio block kwa services) |
| Offline | Banner `Nimehifadhi kwenye simu — itasawazishwa` |
| API | `POST /sales` (idempotent kwa `Idempotency-Key`) |

### S4 · Product Picker (sheet)

Search + barcode + category chips + list yenye stock badge + "haipo? Ombi la Mteja".

### S5 · Payment Sheet

| Kipengele | Maelezo |
|---|---|
| Jumla | Kubwa, `text.primary` |
| Njia | Cash · M-Pesa · Airtel · Mix (split) |
| Split | Mistari 2: Cash `X` + M-Pesa `Y` = Jumla |
| Mkopo | Toggle `Mteja atalipa baadaye` → chagua mteja + due date |
| Change | Kama cash > jumla → `Chenji: X` |
| CTA | `Kamilisha` |
| API | `POST /sales` au `POST /sales/:id/payments` |

### S6 · Receipt Preview

- Preview ya risiti (jina la duka, TIN, tarehe, items, jumla, malipo, chenji, QR ya kuthibitisha)
- Actions: `Tuma WhatsApp` · `Pakua PDF` · `Chapisha (Bluetooth)` · `Share`
- API: `GET /sales/:id/receipt?format=pdf|html`

### S7 · Bidhaa (Products)

- Header: `Bidhaa` · `Jumla: N` · filter (Zote / Stock ndogo / Zimeisha / Zinaisha) · `+`
- Search
- List: jina, category, stock badge, bei ya kuuza, faida kwa unit
- Swipe: Hariri · Badilisha stock · Futa
- Bulk: `Import Excel` · `Export` · `Print labels`
- API: `GET /products`, `POST /products/import`

### S8 · Add/Edit Product

Fields: Jina* · Barcode (+scan) · Category* · Unit* · Bei ya kununua* · Bei ya kuuza* · Stock* · Alert level · Expiry toggle+date · Picha · Supplier · Description
Bottom: `Hifadhi` · `Download template` · `Upload Excel` · `Clear`

### S9 · Stock Adjustment (sheet) 🆕

Sababu: `Hasara` · `Uharibifu` · `Kuisha muda` · `Hesabu (stock take)` · `Kurudisha` · `Nyingine`
+ qty (+/−) + maelezo → husababisha `StockMovement`.

### S10 · Wateja

List + search + filter segments. Card: jina, simu, deni (badge), purchases count, last visit.
Detail: tabs `Muhtasari` · `Manunuzi` · `Madeni` · `Malipo` · `Maelezo`.
Actions: `Tuma ujumbe` · `Ongeza deni` · `Rekodi malipo` · `Statement PDF`.

### S11 · Gharama

Add Expense: jina* · kiasi* · category* (Food/Transport/Bills/Shopping/Fees/Others/custom) · tarehe · maelezo · **recurring toggle** 🆕
List: grouped by siku, total kwa category.

### S12 · Madeni

Tabs `Wanaonidai` / `Ninawadai`. Totals juu. Cards zenye due date + status (kijani/njano/nyekundu).
Actions: `Rekodi malipo` · `Kumbusha WhatsApp` · `Hariri` · `Futa`.

### S13 · Faida (Profit)

Filters `Siku` · `Wiki` · `Mwezi` · `Range` (zote zinafanya kazi).
Hero: `Faida` kubwa + margin % + sales count.
Cards: `Mauzo` · `Gharama ya bidhaa` · `Matumizi` · `Faida halisi`.
Chart: trend kwa kipindi. Orodha ya sales.

### S14 · Ripoti (Reports hub)

- `Mapato` (income) · `Mauzo` · `Faida` · `Analytics` · `Stock` · `Madeni`
- Period picker (7/30/90/custom) — **inafanya kazi**
- Shop selector (duka moja / yote)
- `Export` → PDF / Excel / CSV
- API: `GET /reports/*`, `POST /exports`

### S15 · Analytics

Performance cards · Demand ya mwezi · Stock value/health · Compare · Revenue trend · Stock flow · `Pakua PDF` · `Mapendekezo` (yenye data halisi).

### S16 · BokeCoins

Balance (gradient card) · jinsi ya kupata · rewards zinazofanya kazi · historia.

### S17 · Msaidizi (AI Coach)

Mission cards (title, sababu, CTA, impact baada ya siku 7) + `Uliza AI` chat 🆕.

### S18 · Maduka

List ya maduka + `Active` badge + wauzaji waliopewa + shortcuts + `+ Duka jipya` (→ paywall kama kikomo).

### S19 · Premium / Subscription

Plans 3 · billing 1/3/6/12 · total · `Lipa` → Snippe · `Wasiliana nasi`.

### S20 · Wauzaji

Add seller (duka, jina, simu) → **PIN** (sio password ndefu) → share.
List: jina, duka, mauzo ya leo, hali.
Detail: mauzo, gharama, zamu, commission.
🆕 **Shift management**: `Anza zamu` / `Funga zamu` + Z-report.

### S21 · Taarifa

Filters: Zote · Stock ndogo · Inaisha · Zimeisha · Madeni · Subscription.
Grouped kwa aina, swipe-to-dismiss, `Soma zote`.

### S22 · Profaili & Mipangilio

Profaili (jina, kampuni, simu, email) · `Rekebisha` · `Lugha` · `Dark mode` · `Saizi ya maandishi` · `Backup` · `Export data` · `Vifaa` · `Ondoka` · `Ondoa akaunti`.

### S23 · Global Search 🆕

Search moja inayotafuta: bidhaa, wateja, mauzo (kwa risiti #), madeni, gharama.
Matokeo yamegawanywa kwa aina + `Tazama zote`.

---

# 7. UI/UX — Maboresho na Mifumo

## 7.1 Marekebisho ya Makosa ya FastaPro (moja kwa moja)

| # | Tatizo la FastaPro | Suluhisho la MyBoke |
|---|---|---|
| 1 | Header icons (🌙, 🔔) hazifanyi kazi | 🔔 = NotificationsSheet yenye badge; 🌙 imeondolewa (dark mode iko Mipangilio) |
| 2 | Lugha inahitaji restart | `AppLanguageState` (StateFlow) → `CompositionLocal` → recompose papo hapo |
| 3 | Mchanganyiko wa lugha (`10% ya idadi ya awali` kwenye form ya EN) | Strings 100% kwenye `i18n/`; CI inakataza string literals kwenye composables |
| 4 | `Last 7 Days` ni label tuli | `PeriodSelector` yenye state halisi (7/30/90/custom) |
| 5 | Home haina namba | Dashboard kamili (S2) |
| 6 | Rewards zote "Soon" | Rewards zinazofanya kazi au hazionyeshwi |
| 7 | Recommendations generic (`• Increase product prices`) | Recommendations zinazotokana na data (margin, demand, stock turnover) |
| 8 | Filters static | Kila filter ina state na query |
| 9 | Hakuna search ya global | GlobalSearch (S23) |
| 10 | Empty states tupu | Empty state yenye **hatua inayofuata** (CTA) |

## 7.2 Mifumo ya UX (Pattern Library)

### 7.2.1 Money Display
```
TZS 12,400        ← kiasi cha kawaida
TZS 1,250,000     ← kikubwa (comma)
+12%              ← delta (green)
−8%               ← delta (danger)
```
- Daima `tabular-nums`.
- `TZS` ndogo (0.8em), namba kubwa.
- Hasara/deni: `−` mbele na rangi `danger`.

### 7.2.2 Status Badges
| Hali | Rangi | Mfano |
|---|---|---|
| Imelipwa / Salama | `green.100` / `green.900` | `Imelipwa` |
| Inasubiri | `amber` | `Inasubiri` |
| Imechelewa | `danger.100` / `danger` | `Imechelewa siku 3` |
| Stock ndogo | `amber` | `Zimebaki 4` |
| Imeisha | `danger` | `Imeisha` |
| Inaisha (expiry) | `amber` | `Siku 5` |
| Mpya | `blue.100` | `Mpya` |

### 7.2.3 Empty States (formula)
```
[Icon 64dp, muted]
Kichwa kifupi (16sp, 600)
Maelezo mafupi (14sp, muted)
[CTA button]   ← LAZIMA iwe na hatua
```
Mfano: `Hakuna bidhaa` / `Ongeza bidhaa yako ya kwanza kuanza kuuza` / `[ + Ongeza bidhaa ]`

### 7.2.4 Loading
- **Skeletons** (sio spinners) kwa list na cards.
- Spinner ndogo kwa button pekee.
- `Pull-to-refresh` kwenye kila list.

### 7.2.5 Errors
```
[Icon]
Imeshindwa kupakia
Angalia mtandao wako au jaribu tena
[Jaribu tena]  [Fanya offline]   ← offline inaruhusu kuendelea
```
- Offline ni **hali**, sio kosa: banner ya bluu yenye `N itasawazishwa`.

### 7.2.6 Confirmations
- Destructive: dialog yenye jina la kitu (`Futa bidhaa "Soda 500ml"?`) + `Ghairi` / `Futa` (danger).
- Undo: snackbar `Imeondolewa · TENGUA` kwa sekunde 5.

### 7.2.7 Forms
- Label juu, placeholder mfano, `*` kwa lazima.
- Validation **inline** chini ya field, sio dialog.
- Keyboard type sahihi (`number`, `phone`, `decimal`).
- Numeric keypad yenye `,` na `.` kwa bei.
- Autosave draft kwa Add Product.

### 7.2.8 Offline Banner
```
[☁︎✕] Nimehifadhi kwenye simu · 3 zinasubiri kusawazisha     [Angalia]
```
Rangi: `blue.100` bg / `blue.900` text. Inakuwa `green.100` ikisync.

### 7.2.9 Accessibility
- Min touch 48dp.
- Contrast ≥ 4.5:1.
- `contentDescription` kwa kila icon.
- Font scale inaunga mkono hadi 200%.
- Haptic feedback kwa vitendo muhimu (POS, save).

### 7.2.10 Dark Mode
- Tokens zote zina light/dark.
- Gradient inabaki lakini inapunguzwa `opacity 0.85`.
- Charts zinatumia `cyan.300` / `green.300` (angavu zaidi).

## 7.3 Micro-interactions

| Tukio | Feedback |
|---|---|
| Ongeza kwenye cart | Item inaingia kwa slide + haptic + jumla inahesabu juu |
| Hifadhi sale | Check mark animation + "Imehifadhiwa" + risiti inajitokeza |
| Sync | Banner inageuka kijani + namba inapungua |
| Mission complete | Confetti ndogo (lime + green) + coins +20 |
| Pull-to-refresh | Brand gradient spinner |

## 7.4 i18n Rules (sheria kali)

1. Strings **zote** ziko `composeResources/values/strings.xml` (sw) na `values-en/`.
2. **Hakuna** string literal kwenye composable (isipokuwa namba/currency).
3. `Locale` inabadilishwa kwa `AppLocaleState` bila restart.
4. Tarehe: `Jumapili, 1 Novemba 2026` (sw) / `Sunday, 1 November 2026` (en).
5. Pesa: `TZS 12,400` (sw) / `TZS 12,400` (en) — sarafu haitafsiriki.
6. CI check: grep ya `Text("` yenye maneno ya Kiswahili → fail.

## 7.5 Matrix ya Hali za Skrini (State Matrix)

Kila skrini **LAZIMA** itoe hali 6 hizi. Skrini isiyo na hali zote = haijakamilika.

| Hali | Kionekani | Hatua inayofuata |
|---|---|---|
| **Loading** | Skeleton 3–5 mistari (sio spinner) | — |
| **Empty** | Icon + kichwa + maelezo | **CTA** ya kuongeza |
| **Error (recoverable)** | Icon + sababu | `Jaribu tena` |
| **Error (offline)** | Banner bluu, sio kosa | `Endelea offline` |
| **Forbidden** | Icon 🔒 + "Huna ruhusa" | `Rudi` |
| **Quota reached** | Icon + plan inayohitajika | `Panda plan` |

### 7.5.1 Hali ya Ruhusa (Permission Denied) 🆕
CASHIER akifungua ripoti:
```
🔒
Ripoti hazipo kwa akaunti yako
Uliza mmiliki wa duka akupatie ruhusa
[ Rudi nyumbani ]
```
> Kanuni: **ficha** kitu ambacho hakiwezi kufanywa, badala ya kukionyesha kisha kukataza.
> Menu inaonyesha vitu 4, sio 14 yenye 10 zilizofungwa.

### 7.5.2 Hali ya Kikomo cha Plan (Quota) 🆕
```
📦
Umefikia maduka 1 ya plan Bure
Growth inakupa maduka 3, wauzaji 10 na analytics
[ Panda Growth — 25,000 TZS/mwezi ]   [ Baadaye ]
```
> Onyesha **nambari halisi** (`maduka 1`), sio `kikomo kimefikiwa`.

### 7.5.3 Hali ya Mgongano wa Sync 🆕
```
⚠️
Bidhaa "Soda 500ml" ilibadilishwa kwenye kifaa kingine
Bei yako: 1,200 TZS   ·   Server: 1,500 TZS
[ Tumia ya server ]   [ Tumia yangu ]   [ Linganisha ]
```
Skrini ya `Sync Issues` inaorodhesha migongano yote + `Suluhisha zote`.

### 7.5.4 Hali ya Kifaa (Hardware) 🆕
| Hali | Ujumbe |
|---|---|
| Hakuna printer | `Hakuna printa iliyounganishwa` + `Unganisha` |
| Printer imeunganishwa | `Printer: XP-58 ✓` + `Jaribu kuchapisha` |
| Print imeshindikana | `Haikuchapishwa` + `Hifadhi PDF` + `Jaribu tena` |
| Hakuna camera permission | `Ruhusu kamera kusoma barcode` + `Fungua mipangilio` |

### 7.5.5 Desktop Keyboard Shortcuts 🆕
| Kitufe | Kazi |
|---|---|
| `F2` | Search bidhaa |
| `F4` | Maliza mauzo |
| `F5` | Refresh |
| `Esc` | Funga sheet |
| `Ctrl/Cmd + K` | Global search |
| `Ctrl/Cmd + N` | Ongeza mpya |
| `Ctrl/Cmd + P` | Chapisha |
| `1`–`8` | Quick keys za POS |

## 7.6 Onboarding ya Hatua 4 — Ukaguzi wa Kina

| Hatua | Eneo | Uthibitisho | Ruhusa ya kuruka |
|---|---|---|---|
| 1. Karibu | Hakuna input | — | `Ruka` inaruhusu |
| 2. Biashara | Jina (lazima) · Aina (chip 6) | Jina ≥ 2 herufi | Hapana |
| 3. Duka | Jina (imejazwa `Duka Kuu`) · Mahali | Jina ≥ 2 | Ndiyo |
| 4. Bidhaa | Jina · Bei ya kuuza · Stock | Bei > 0 | `Nitaongeza baadaye` |
| 5. Sale | Chagua bidhaa → `Maliza` | — | `Nenda moja kwa moja` |

**Kanuni:**
- Hakuna skrini inayohitaji kuandika zaidi ya sehemu 3.
- Kila hatua ina `Nyuma`.
- Maendeleo yanahifadhiwa (`OnboardingDraft`) — app ikifungwa inaendelea hapo.
- Hatua 5 ikikamilika → celebration + `+100 BokeCoins`.

---

# 8. Business Rules & Formula

## 8.1 Pesa (Money)

> **Kanuni:** Pesa **HAITUMII** `float`/`double`. Tumia `DECIMAL(18,2)` kwenye DB na `Long` (minor units) au `BigDecimal` kwenye code.

```kotlin
// KMP: przechowywanie kama minor units (senti)
@JvmInline value class Money(val minor: Long) {
    val tzs: BigDecimal get() = BigDecimal(minor).movePointLeft(2)
}
```

| Rule | Maelezo |
|---|---|
| M1 | Kila kiasi kwenye DB ni `DECIMAL(18,2)` |
| M2 | API inatumia `string` kwa decimals (`"12400.00"`) — sio JSON number |
| M3 | Rounding: `HALF_UP` kwa 2 decimals, mara moja tu mwishoni |
| M4 | Discount inatumika kabla ya kodi, baada ya subtotal |
| M5 | Malipo yote yana `idempotencyKey` |

## 8.2 Faida

```
lineProfit     = (sellingPrice − buyingPrice) × qty − lineDiscount
saleSubtotal   = Σ (sellingPrice × qty)
saleDiscount   = min(requestedDiscount, saleSubtotal - 1)     // kinga
saleTotal      = saleSubtotal − saleDiscount
saleCost       = Σ (buyingPrice × qty)
saleGrossProfit= saleTotal − saleCost
```

```
grossProfit    = Σ saleGrossProfit (kipindi)
netProfit      = grossProfit − Σ expenses (kipindi)
marginPct      = grossProfit / saleTotal × 100
```

## 8.3 Stock

```
stockValue     = Σ (qty × buyingPrice)
stockHealth    = (products with qty > alertLevel) / totalProducts × 100
lowStock       = qty > 0 AND qty <= alertLevel
outOfStock     = qty = 0
expiringSoon   = hasExpiry AND expiryDate BETWEEN today AND today + 30d
alertLevelDefault = max(1, round(initialQty × 0.10))
```

**Stock movements (`StockMovement`):**
```
IN     ← purchase, transfer_in, return, adjustment(+)
OUT    ← sale, transfer_out, damage, expiry, adjustment(−)
```
Kila movement ina `reason`, `refType`, `refId` → audit kamili.

**Uthibitisho:** `stock = Σ movements` — tunarekebisha kwa hesabu (stock take) ikiwa hautofautiani.

## 8.4 Madeni

```
debtBalance  = originalAmount − Σ payments
isOverdue    = dueDate < today AND debtBalance > 0
overdueDays  = today − dueDate
totalOwedToMe = Σ debts(oweMe).balance
totalIOwe     = Σ debts(iOwe).balance
customerDebt  = Σ debts(customer).balance
```

**Ngazi za kumbusho (WhatsApp):**
| Siku | Ujumbe |
|---|---|
| 0 (siku ya due) | "Habari {jina}, natumai uko salama. Kumbusho la upole: deni lako ni TSh {kiasi}." |
| +7 | "…deni lako limefikia TSh {kiasi}. Tafadhali lipa mapema." |
| +14 | "…huu ni ukumbusho wa MWISHO: deni lako ni TSh {kiasi}." |

## 8.5 Subscription & Mipaka

| Plan | Bei/mwezi | Maduka | Wauzaji | Vipengele |
|---|---|---|---|---|
| **Bure** | 0 | 1 | 1 | POS, bidhaa 50, ripoti za msingi |
| **Starter** | 10,000 TZS | 1 | 3 | Bidhaa ∞, export, WhatsApp receipts |
| **Growth** | 25,000 TZS | 3 | 10 | Multi-shop, analytics, AI coach |
| **Premium** | 50,000 TZS | 6 | ∞ | Demand reports, API, priority support |

```
total = monthlyPrice × months      // linear, hakuna discount
```
> 🆕 **Pendekezo:** ongeza discount ndogo kwa muda mrefu (mf. 3m −5%, 12m −15%) — inaongeza cash-flow na retention.

## 8.6 BokeCoins

| Tukio | Coins |
|---|---|
| Ku-log Ombi la Mteja | +10 |
| Sale ya kwanza ya siku | +2 |
| Mission complete | +20 … +50 |
| Kumaliza onboarding | +100 |
| Kukamilisha hesabu ya stock | +15 |
| **Kutumia** | |
| AI Poster | −50 |
| Airtime 1,000 TZS | −500 |
| Discount voucher | −300 |

```
balance = Σ earned − Σ redeemed        // kamwe haishuki chini ya 0
```

## 8.7 Commission (Partner)

```
commission = subscriptionAmount × partnerRate     // default 10%
status     = PENDING → APPROVED → PAID
```
Inaonekana tu baada ya malipo kuthibitishwa (webhook ya Snippe).

## 8.8 Shift / Cash Drawer 🆕

```
expectedCash = openingFloat + Σ cashSales − Σ cashRefunds − Σ cashExpenses
difference   = countedCash − expectedCash
```
Z-report inaonyesha: mauzo, njia za malipo, matumizi, tofauti ya cash.

---

# 9. System Architecture

## 9.1 Muhtasari

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS (Kotlin Multiplatform)                             │
│  Android · iOS · Desktop                                    │
│  Compose UI · Ktor · SQLDelight · Koin                      │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS / JSON  (+ ETag, Idempotency-Key)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  EDGE                                                       │
│  Cloudflare / Nginx → TLS, WAF, rate limit, gzip/brotli     │
└───────────────┬─────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────┐
│  API — NestJS (Node 22 LTS)                                 │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │ Auth     │ Tenancy  │ Catalog  │ Sales    │ Finance   │  │
│  ├──────────┼──────────┼──────────┼──────────┼───────────┤  │
│  │ Sync     │ Reports  │ Growth   │ Billing  │ Admin     │  │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘  │
│  Guards: JWT · RBAC · TenantScope · Throttler               │
│  Pipes: Zod/class-validator · Decimal pipe                  │
│  Swagger: /docs (OpenAPI 3.1)                               │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐
│ PostgreSQL │ │   Redis    │ │  BullMQ    │ │  S3 / MinIO  │
│ 16 (primary│ │ cache,     │ │ jobs:      │ │ files:       │
│ + replica) │ │ rate limit │ │ reports,   │ │ receipts,    │
│ Prisma     │ │ sessions   │ │ sync, ai   │ │ posters      │
└────────────┘ └────────────┘ └────────────┘ └──────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL                                                   │
│  Snippe (mobile money) · SMS/WhatsApp · FCM push · S3 CDN   │
└─────────────────────────────────────────────────────────────┘
```

## 9.2 Uamuzi wa Msingi (ADR-001): Kwa nini Postgres, sio Firebase

| Kigezo | Firebase (FastaPro) | Postgres + NestJS (MyBoke) |
|---|---|---|
| Query za ripoti | Ngumu, expensive | SQL yenye nguvu, indexes |
| Multi-tenant filtering | Rules za Firestore | `businessId` + RLS |
| Gharama kwa user wengi | Inapanda kwa reads | Inapanda kwa compute (nafuu) |
| Vendor lock-in | Kikubwa | Hakuna (export SQL) |
| Transactions | Limited | Kamili (ACID) |
| Ushirikiano wa BI | Ngumu | Direct |
| Auth | Firebase Auth | JWT + OTP (tunamiliki) |
| Real-time | Rahisi | SSE/WebSocket (baadaye) |

**Uamuzi:** **PostgreSQL** kama chanzo cha ukweli. Real-time si lazima kwa POS; sync ya pull inatosha.

---

# 10. Backend Design (NestJS)

## 10.1 Stack

| Tabaka | Uchaguzi | Sababu |
|---|---|---|
| Runtime | **Node.js 22 LTS** | Stable, ecosystem kubwa |
| Framework | **NestJS 11** | Modules, DI, guards, decorators |
| API Docs | **@nestjs/swagger** (OpenAPI 3.1) | `/docs` + `openapi.json` → client generation |
| ORM | **Prisma 6** | Type-safe, migrations, easy |
| DB | **PostgreSQL 16** | ACID, JSONB, full-text search |
| Cache | **Redis 7** | Sessions, rate limit, cached reports |
| Queue | **BullMQ** | Reports, exports, sync jobs, AI calls |
| Auth | **JWT (access 15m) + Refresh (30d, rotating)** | Standard, offline-friendly |
| Validation | **Zod** + `nestjs-zod` | Types + runtime |
| Files | **S3-compatible** (MinIO dev, R2/S3 prod) | Cheap, presigned URLs |
| Logging | **pino** (structured JSON) | Fast, searchable |
| Observability | OpenTelemetry + Sentry | Traces + errors |
| Rate limit | `@nestjs/throttler` + Redis | Protection |
| Testing | Jest + Supertest + Testcontainers | Real DB tests |
| Package manager | **pnpm** | Fast, strict |

## 10.2 Module Map

```
src/
├── main.ts                    # bootstrap, swagger, helmet, cors
├── app.module.ts
├── common/
│   ├── guards/                # JwtAuthGuard, RolesGuard, TenantGuard
│   ├── decorators/            # @CurrentUser, @Tenant, @Roles, @Public
│   ├── interceptors/          # TenantContext, Logging, Transform
│   ├── filters/               # AllExceptionsFilter (problem+json)
│   ├── pipes/                 # ZodValidation, DecimalPipe
│   ├── errors/                # AppError codes
│   └── utils/                 # money, dates, ids (ulid)
├── config/                    # env schema (zod)
├── infra/
│   ├── prisma/                # PrismaService, RLS helpers
│   ├── redis/
│   ├── queue/                 # queue registry
│   └── storage/               # S3 presign
├── modules/
│   ├── auth/                  # register, login, otp, refresh, pin
│   ├── users/
│   ├── businesses/            # tenant CRUD, members, invites
│   ├── shops/
│   ├── products/              # + categories, variants, bundles
│   ├── stock/                 # movements, adjustments, transfers
│   ├── sales/                 # sales, items, payments, refunds
│   ├── shifts/                # cash drawer, Z-report
│   ├── customers/
│   ├── debts/
│   ├── expenses/
│   ├── suppliers/             # + purchase orders
│   ├── payments/              # manual payments, allocations
│   ├── sync/                  # push/pull protocol
│   ├── reports/               # sales, profit, stock, debt, export
│   ├── analytics/             # dashboards, trends
│   ├── growth/                # missions, coins, demand, posters
│   ├── billing/               # plans, subscriptions, snippe
│   ├── partners/              # referral, commission
│   ├── notifications/         # in-app, push, whatsapp
│   ├── admin/                 # platform admin
│   ├── uploads/
│   └── health/
└── jobs/                      # processors
```

## 10.3 Multi-tenancy & RBAC

**Model:** Shared DB, shared schema, `businessId` kwenye kila jedwali la biashara.
**Ulinzi wa tabaka 3:**

1. **JWT** ina `sub` (userId), `bid` (businessId), `role`, `shops[]`.
2. **`TenantGuard`** inaweka `request.tenant = { businessId, role, shopIds }`.
3. **Prisma middleware** inaongeza `where: { businessId }` kiotomatiki kwa models za tenant.
4. (Optional prod) **Postgres RLS** kwa defense-in-depth.

**Roles:**

| Role | Ruhusa |
|---|---|
| `OWNER` | Kila kitu ndani ya business. Billing. Kufuta business. |
| `MANAGER` | Bidhaa, mauzo, wateja, gharama, ripoti. **Hana** billing/wauzaji-kuongeza. |
| `CASHIER` | Mauzo tu + gharama zake + shift yake. Anaona bidhaa. |
| `PARTNER` | Nje ya business: commission yake, referral code yake. |
| `SUPER_ADMIN` | Platform: businesses zote, partners, demand, subscriptions. |

**Matrix ya ruhusa (mfano):**

| Action | OWNER | MANAGER | CASHIER |
|---|---|---|---|
| `sale:create` | ✅ | ✅ | ✅ |
| `sale:delete` | ✅ | ✅ | ❌ |
| `sale:refund` | ✅ | ✅ | ❌ |
| `product:write` | ✅ | ✅ | ❌ |
| `expense:create` | ✅ | ✅ | ✅ (zake) |
| `report:read` | ✅ | ✅ | ❌ |
| `member:invite` | ✅ | ❌ | ❌ |
| `billing:manage` | ✅ | ❌ | ❌ |
| `shop:create` | ✅ | ❌ | ❌ |

## 10.4 Auth Flow

```
Usajili:
POST /auth/register { phone, password?, name }
  → user (unverified) + OTP kwa SMS
POST /auth/otp/verify { phone, code }
  → tokens { access, refresh } + user

Login:
POST /auth/login { phone|email, password }  → tokens
POST /auth/login/pin  { memberId, pin }      → tokens (CASHIER)

Refresh:
POST /auth/refresh { refreshToken }  → tokens mpya (rotate + revoke ya zamani)

Logout:
POST /auth/logout { refreshToken }  → revoke
```

**Otomatiki:**
- Access token: 15 min, `jti`, ina `bid`, `role`, `shops[]`
- Refresh: 30 siku, rotating, inahifadhiwa hashed (SHA-256) kwenye `RefreshToken`
- Kifaa: `deviceId` + `userAgent` + `lastSeenAt` → `Device`
- PIN ya cashier: 4–6 digits, bcrypt, `failedAttempts` + lockout
- Biometric: refresh token kwenye `EncryptedSharedPreferences`/Keychain

## 10.5 API Conventions

| Kanuni | Maelezo |
|---|---|
| Base | `https://api.myboke.co.tz/v1` |
| Versioning | URL prefix `/v1` |
| Format | JSON, `camelCase` |
| Decimals | `string` (`"12400.00"`) |
| Dates | ISO-8601 UTC (`2026-11-01T07:04:00Z`) |
| IDs | **ULID** (sortable, offline-friendly) |
| Pagination | `?cursor=<ulid>&limit=50` → `{ data, nextCursor, hasMore }` |
| Filtering | `?shopId=&from=&to=&status=` |
| Sorting | `?sort=-createdAt` |
| Errors | RFC 7807 `application/problem+json` |
| Idempotency | `Idempotency-Key` header kwa POST za pesa |
| Concurrency | `If-Match` + `version` kwa updates |
| Rate limit | `X-RateLimit-*` headers |
| Docs | Swagger UI `/docs`, JSON `/docs-json` |

**Error body:**
```json
{
  "type": "https://api.myboke.co.tz/errors/insufficient-stock",
  "title": "Stock haitoshi",
  "status": 409,
  "code": "INSUFFICIENT_STOCK",
  "detail": "Soda 500ml: zimebaki 2, umeomba 5",
  "instance": "/v1/sales",
  "meta": { "productId": "01J...", "available": 2, "requested": 5 }
}
```

## 10.6 Endpoint Catalog

> Kila endpoint ina `@ApiOperation`, `@ApiResponse`, na example kwenye Swagger.

### Auth
| Method | Path | Roles |
|---|---|---|
| POST | `/auth/register` | public |
| POST | `/auth/otp/send` | public |
| POST | `/auth/otp/verify` | public |
| POST | `/auth/login` | public |
| POST | `/auth/login/pin` | public |
| POST | `/auth/refresh` | public |
| POST | `/auth/logout` | auth |
| POST | `/auth/password/forgot` | public |
| POST | `/auth/password/reset` | public |
| GET | `/auth/me` | auth |

### Businesses & Members
| Method | Path | Roles |
|---|---|---|
| POST | `/businesses` | auth |
| GET | `/businesses` | auth |
| GET | `/businesses/:id` | OWNER/MANAGER |
| PATCH | `/businesses/:id` | OWNER |
| GET | `/businesses/:id/members` | OWNER/MANAGER |
| POST | `/businesses/:id/members/invite` | OWNER/MANAGER |
| PATCH | `/businesses/:id/members/:memberId` | OWNER |
| DELETE | `/businesses/:id/members/:memberId` | OWNER |
| POST | `/businesses/:id/members/:memberId/pin` | OWNER |

### Shops
| Method | Path | Roles |
|---|---|---|
| GET | `/shops` | auth |
| POST | `/shops` | OWNER |
| GET | `/shops/:id` | auth |
| PATCH | `/shops/:id` | OWNER/MANAGER |
| DELETE | `/shops/:id` | OWNER |
| GET | `/shops/:id/health` | OWNER/MANAGER |

### Products & Categories
| Method | Path | Roles |
|---|---|---|
| GET | `/products` | auth |
| POST | `/products` | OWNER/MANAGER |
| GET | `/products/:id` | auth |
| PATCH | `/products/:id` | OWNER/MANAGER |
| DELETE | `/products/:id` | OWNER/MANAGER |
| GET | `/products/search?q=` | auth |
| GET | `/products/barcode/:code` | auth |
| POST | `/products/import` | OWNER/MANAGER |
| GET | `/products/export` | OWNER/MANAGER |
| POST | `/products/:id/price-change` | OWNER/MANAGER |
| GET | `/products/:id/price-history` | OWNER/MANAGER |
| CRUD | `/categories` | OWNER/MANAGER |
| CRUD | `/suppliers` | OWNER/MANAGER |

### Stock
| Method | Path | Roles |
|---|---|---|
| GET | `/stock` | auth |
| GET | `/stock/movements` | OWNER/MANAGER |
| POST | `/stock/adjust` | OWNER/MANAGER |
| POST | `/stock/transfer` | OWNER |
| POST | `/stock/count` | OWNER/MANAGER |
| GET | `/stock/alerts` | auth |

### Sales
| Method | Path | Roles |
|---|---|---|
| POST | `/sales` | auth (idempotent) |
| GET | `/sales` | auth |
| GET | `/sales/:id` | auth |
| PATCH | `/sales/:id` | OWNER/MANAGER |
| DELETE | `/sales/:id` | OWNER/MANAGER |
| POST | `/sales/:id/refund` | OWNER/MANAGER |
| POST | `/sales/:id/payments` | auth |
| GET | `/sales/:id/receipt` | auth (`?format=pdf\|html`) |
| POST | `/sales/:id/share` | auth |

### Shifts
| Method | Path | Roles |
|---|---|---|
| POST | `/shifts/open` | CASHIER |
| GET | `/shifts/current` | CASHIER |
| POST | `/shifts/:id/close` | CASHIER |
| GET | `/shifts/:id/z-report` | OWNER/MANAGER/CASHIER |

### Customers & Debts
| Method | Path | Roles |
|---|---|---|
| CRUD | `/customers` | auth |
| GET | `/customers/:id/ledger` | auth |
| GET | `/customers/:id/statement` | auth |
| CRUD | `/debts` | auth |
| POST | `/debts/:id/payments` | auth |
| POST | `/debts/:id/remind` | auth |
| GET | `/debts/summary` | auth |

### Expenses
| Method | Path | Roles |
|---|---|---|
| CRUD | `/expenses` | auth |
| GET | `/expenses/summary` | OWNER/MANAGER |

### Sync
| Method | Path | Roles |
|---|---|---|
| POST | `/sync/push` | auth |
| GET | `/sync/pull?since=` | auth |
| GET | `/sync/state` | auth |

### Reports & Analytics
| Method | Path | Roles |
|---|---|---|
| GET | `/reports/summary` | OWNER/MANAGER |
| GET | `/reports/sales` | OWNER/MANAGER |
| GET | `/reports/profit` | OWNER/MANAGER |
| GET | `/reports/stock` | OWNER/MANAGER |
| GET | `/reports/debts` | OWNER/MANAGER |
| GET | `/reports/top` | OWNER/MANAGER |
| POST | `/exports` | OWNER/MANAGER |
| GET | `/exports/:id` | OWNER/MANAGER |
| GET | `/dashboard/summary` | auth |
| GET | `/analytics/overview` | OWNER/MANAGER |
| GET | `/analytics/trends` | OWNER/MANAGER |
| GET | `/analytics/compare` | OWNER/MANAGER |

### Growth
| Method | Path | Roles |
|---|---|---|
| GET | `/missions/today` | auth |
| POST | `/missions/:id/complete` | auth |
| GET | `/missions/:id/impact` | auth |
| GET | `/coins/balance` | auth |
| GET | `/coins/transactions` | auth |
| POST | `/coins/redeem` | auth |
| POST | `/demand` | auth |
| GET | `/demand/report` | OWNER/MANAGER |
| POST | `/posters` | OWNER/MANAGER |
| GET | `/recommendations` | OWNER/MANAGER |
| POST | `/assistant/chat` | auth |

### Billing
| Method | Path | Roles |
|---|---|---|
| GET | `/plans` | public |
| GET | `/subscriptions/current` | OWNER |
| POST | `/subscriptions/checkout` | OWNER |
| GET | `/subscriptions/checkout/:ref` | OWNER |
| POST | `/webhooks/snippe` | public (signature) |
| GET | `/invoices` | OWNER |

### Partners & Admin
| Method | Path | Roles |
|---|---|---|
| GET | `/partners/me` | PARTNER |
| GET | `/partners/me/commissions` | PARTNER |
| POST | `/referrals/validate` | public |
| GET | `/admin/overview` | SUPER_ADMIN |
| GET | `/admin/businesses` | SUPER_ADMIN |
| GET | `/admin/partners` | SUPER_ADMIN |
| POST | `/admin/partners` | SUPER_ADMIN |
| POST | `/admin/commissions/:id/settle` | SUPER_ADMIN |
| GET | `/admin/demand/report` | SUPER_ADMIN |
| GET | `/admin/subscriptions` | SUPER_ADMIN |

### Misc
| Method | Path | Roles |
|---|---|---|
| POST | `/uploads/presign` | auth |
| GET | `/notifications` | auth |
| PATCH | `/notifications/:id/read` | auth |
| POST | `/devices` | auth (FCM token) |
| GET | `/health` | public |
| GET | `/health/ready` | public |
| GET | `/docs` | (internal / secured) |

### 10.6.1 Nyongeza zilizotekelezwa (Nov 2026)

Endpoints zilizoongezwa juu ya catalog ya msingi — zote zipo kwenye Swagger na E2E.

**Auth & Config**

| Method | Path | Roles |
|---|---|---|
| PATCH | `/auth/me/locale` | auth |
| POST | `/auth/password/change` | auth |
| POST | `/auth/logout/all` | auth |
| DELETE | `/auth/me` | auth (PDPA) |
| GET | `/auth/me/export?format=pdf` | auth (PDPA) |
| GET | `/app/config` | public (force update · VAT · features · limits) |
| POST | `/auth/demo` | public (A10 — demo tenant, siku 1) |
| GET | `/auth/2fa/status` | auth |
| POST | `/auth/2fa/setup` | OWNER |
| POST | `/auth/2fa/enable` | OWNER |
| POST | `/auth/2fa/disable` | OWNER |

**Businesses & Shops**

| Method | Path | Roles |
|---|---|---|
| GET · PATCH | `/businesses/current` | OWNER |
| GET | `/businesses/current/members` | OWNER/MANAGER |
| POST | `/businesses/current/members/invite` | OWNER/MANAGER |
| DELETE | `/businesses/current/members/:memberId` | OWNER |
| GET | `/shops/:id/schedule` | auth |
| GET · POST | `/shops/:id/holidays` | OWNER/MANAGER |
| DELETE | `/shops/:id/holidays/:holidayId` | OWNER/MANAGER |
| GET | `/shops/:id/qr` | auth |

**Products · Bundles · Suppliers**

| Method | Path | Roles |
|---|---|---|
| GET | `/products/import/template` | OWNER/MANAGER |
| POST | `/products/import/dry-run` | OWNER/MANAGER |
| GET | `/products/import/:jobId` | OWNER/MANAGER |
| GET | `/products/labels` (PDF) | OWNER/MANAGER |
| GET | `/products/quick-keys` | auth |
| GET | `/products/low-stock` | auth |
| GET | `/products/expiring?days=30` | auth (C8 — expiry alerts) |
| POST · GET | `/products/:id/variants` | OWNER/MANAGER |
| GET | `/products/:id/movements` | auth |
| POST | `/products/:id/stock` | OWNER/MANAGER |
| CRUD | `/products/categories` | OWNER/MANAGER |
| CRUD | `/categories` | OWNER/MANAGER |
| CRUD | `/bundles` | OWNER/MANAGER |
| GET | `/suppliers/:id/ledger` | OWNER/MANAGER |
| POST · GET | `/suppliers/:id/payments` | OWNER/MANAGER |
| CRUD | `/purchase-orders` (+ `/send`, `/receive`) | OWNER/MANAGER |

**Stock · Sales · Shifts**

| Method | Path | Roles |
|---|---|---|
| GET | `/stock/valuation` | OWNER/MANAGER |
| POST · GET | `/sales/hold` | auth |
| GET · DELETE | `/sales/held` · `/sales/held/:id` | auth |
| POST | `/sales/:id/void` | OWNER/MANAGER |
| POST | `/sales/:id/efd` | auth |
| GET | `/shifts` | OWNER/MANAGER |
| GET | `/backup` | OWNER (I14 — backup kamili JSON) |
| POST | `/backup/restore` (+ `?dryRun=true`) | OWNER (I14 — merge restore) |

**Customers · Expenses · Reports**

| Method | Path | Roles |
|---|---|---|
| GET | `/customers/segments` | auth |
| GET | `/customers/birthdays` | auth |
| GET | `/customers/:id/loyalty` | auth |
| POST | `/customers/campaigns` | OWNER/MANAGER |
| GET | `/expenses/recurring` | OWNER/MANAGER |
| POST | `/expenses/recurring/run` | OWNER/MANAGER |
| GET | `/reports/daily-snapshots` | OWNER/MANAGER |
| GET | `/reports/cash-flow` | OWNER/MANAGER |
| GET | `/reports/break-even` | OWNER/MANAGER |
| GET | `/reports/dashboard` | OWNER/MANAGER |
| GET | `/reports/top-products` | OWNER/MANAGER |
| CRUD | `/reports/budgets` | OWNER |
| GET | `/analytics/categories` | OWNER/MANAGER |
| GET | `/analytics/shops` | OWNER/MANAGER |

**Growth**

| Method | Path | Roles |
|---|---|---|
| GET | `/growth/streaks` | auth |
| GET | `/growth/restock-suggestions` | OWNER/MANAGER |
| GET | `/growth/price-suggestions` | OWNER/MANAGER |
| GET | `/missions` | auth |

**Build · Sync · Platform · Admin**

| Method | Path | Roles |
|---|---|---|
| GET | `/exports` | OWNER/MANAGER |
| GET | `/exports/:id/download` | OWNER/MANAGER |
| GET | `/sync/operations` | auth |
| POST | `/sync/purge` | OWNER |
| GET | `/audit-logs` · `/audit-logs/:id` | OWNER/SUPER_ADMIN |
| CRUD | `/api-keys` | OWNER |
| CRUD | `/webhooks` (+ `/test`, `/deliveries`) | OWNER |
| POST | `/feedback` | auth |
| GET | `/admin/feedback` | SUPER_ADMIN |
| GET · POST · DELETE | `/digest` | OWNER |
| GET | `/admin/me` | SUPER_ADMIN |
| GET | `/admin/sync-issues` | SUPER_ADMIN |
| GET | `/admin/jobs` · POST `/admin/jobs/:name/run` | SUPER_ADMIN |
| POST | `/admin/businesses/:id/impersonate` | SUPER_ADMIN |
| POST | `/admin/subscriptions/:id/extend` | SUPER_ADMIN |
| CRUD | `/partners` (admin) | SUPER_ADMIN/OWNER |
| GET | `/metrics` · `/metrics/summary` | public (au `METRICS_TOKEN`) |
| GET | `/uploads/local/:key` | public (dev fallback) |

**Kanuni za ziada zilizowekwa:**
- Rate limit: `100 req/min` kwa kila IP (`THROTTLE_LIMIT`), na `/auth/*` inahesabu **majaribio yaliyoshindikana** tu — `10/min` kwa IP+kitambulisho (`THROTTLE_AUTH_LIMIT`) dhidi ya brute force.
- Kila jibu lina `X-Request-Id`; log ni JSON (`requestId`, `method`, `route`, `status`, `durationMs`).
- Export ni **async**: `POST /exports` → `QUEUED/RUNNING`, `GET /exports/:id` → `status` + `url` + `expiresAt` (dakika 60).
- Split payment: `payments[]` kwenye sale → `paymentMethod = MIXED`; jumla isizidi total.
- Kumbusho la plan: siku **7, 3, 1** kabla ya kuisha (job `billing`).
- Mission mpya → notification ya `GROWTH`.

## 10.7 Sync Protocol (offline-first)

**Mkakati:** client ni **source of truth kwa matukio** (sales, expenses, debts), server ni source of truth kwa catalog ikiwa nyingi.

### Push
```http
POST /v1/sync/push
Idempotency-Key: <deviceId>:<batchUlid>
{
  "deviceId": "01J...",
  "lastServerCursor": "01J...",
  "operations": [
    {
      "opId": "01JLOCAL0001",
      "entity": "sale",
      "action": "create",
      "clientTs": "2026-11-01T07:00:00Z",
      "payload": { "...": "sale object with client-generated ULID" }
    },
    {
      "opId": "01JLOCAL0002",
      "entity": "product",
      "action": "update",
      "baseVersion": 7,
      "payload": { "sellingPrice": "1500.00" }
    }
  ]
}
```

Response:
```json
{
  "results": [
    { "opId": "01JLOCAL0001", "status": "applied", "serverId": "01J...", "version": 1 },
    { "opId": "01JLOCAL0002", "status": "conflict", "conflict": {
        "current": { "sellingPrice": "1600.00", "version": 8 },
        "strategy": "server-wins",
        "resolution": "pending-user" } }
  ],
  "serverCursor": "01J...",
  "nextPushAfterMs": 0
}
```

### Pull
```http
GET /v1/sync/pull?since=01J...&limit=500
→ { changes: [ { entity, id, action, version, payload } ], serverCursor, hasMore }
```

### Conflict rules
| Entity | Strategy |
|---|---|
| `sale`, `expense`, `payment`, `stockMovement` | **Append-only** → hakuna conflict (ULID + idempotency) |
| `product`, `customer`, `debt` | **Version-based** → server-wins + client notification |
| `shop`, `settings` | server-wins |
| `stock quantity` | **Server-authoritative** (calculated kutoka movements) |

### Offline guarantees
1. Kila entity ina ULID **iliyotengenezwa client** → hakuna duplicate kwa retry.
2. Kila op ina `opId` → server inarekodi kwenye `SyncOperation` (idempotent).
3. Client inahifadhi `outbox` (SQLDelight) na `lastServerCursor`.
4. Sync inaendesha: on-app-start, on-network-restore, kila dakika 2 (foreground), na manual.
5. Kama server inakataa op (validation), client inaonyesha `Sync Issues` screen.

## 10.8 Jobs (scheduler)

> Utekelezaji: `@nestjs/schedule` (`apps/backend/src/modules/jobs`), saa za `Africa/Nairobi` (EAT).
> Kila job inaweza kuendeshwa kwa mkono: `POST /v1/admin/jobs/:name/run` (SUPER_ADMIN).

| Kazi | Job | Trigger |
|---|---|---|
| `exports` | Tengeneza PDF/Excel (async ndani ya API) | `POST /exports` |
| `reports` | Pre-compute ripoti + `DailySnapshot` | Cron 01:00 EAT |
| `expenses` | Tengeneza gharama zinazojirudia | Cron 06:30 EAT |
| `notifications` | Madeni yaliyochelewa + stock ndogo/imeisha | Cron 07:00 EAT |
| `billing` | Subscription expiry + kumbusho siku 7/3/1 | Cron 06:00 EAT |
| `growth-missions` | Tengeneza missions za leo + notification | Cron 05:00 EAT |
| `growth-impact` | Pima impact ya mission (siku 7) | Cron 05:30 EAT |
| `digest` | Daily digest ya mfanyabiashara (WhatsApp/email) | Cron 07:30 EAT |
| `maintenance` | Cleanup tokens, OTP, sync ops, audit, notifications | Cron 02:00 EAT |
| `ai` | Poster/assistant | On-demand (request) |

## 10.9 Payments (Snippe)

```
POST /subscriptions/checkout { planId, months, phone }
  → { reference, checkoutUrl }
     (server inatengeneza PaymentKey ya kipekee)

Webhook POST /webhooks/snippe
  → verify HMAC signature
  → idempotent (paymentKey unique)
  → activate subscription + invoice + partner commission
```

**Ulinzi:**
- Signature verification (`X-Snippe-Signature`)
- Replay protection (`paymentKey` unique + timestamp window)
- Webhook inarudisha `200` haraka; processing kwenye queue
- Retry policy ya Snippe: idempotent by `paymentKey`

## 10.10 Notifications

| Aina | Njia |
|---|---|
| Sale imehifadhiwa (offline → synced) | in-app |
| Stock ndogo / imeisha | in-app + push |
| Expiry inakaribia | push (07:00) |
| Deni limechelewa | in-app + WhatsApp (manual) |
| Subscription inaisha (7, 3, 1 siku) | push + SMS |
| Ripoti ya kila siku | WhatsApp/email (opt-in) |
| Mission mpya | push (06:00) |

## 10.11 Security

| Eneo | Hatua |
|---|---|
| Transport | TLS 1.3 pekee, HSTS |
| Auth | JWT short-lived + rotating refresh, PIN lockout |
| Passwords | Argon2id (au bcrypt cost 12) |
| PII | Simu/email encrypted at rest (pgcrypto) au app-level |
| RBAC | Guards + tenant scope kwenye kila query |
| Input | Zod validation, SQL injection = Prisma |
| Rate limit | 100 req/min/user, 10/min auth endpoints |
| Uploads | Presigned, size limit, MIME allowlist, virus scan (ClamAV optional) |
| Audit | `AuditLog` kwa kila write ya pesa |
| Secrets | Env vars + secret manager (sio kwenye repo) |
| Backups | PITR (WAL) + daily snapshot, 30 siku |
| GDPR-ish | Export data, delete account, data retention policy |

## 10.12 Performance Targets

| Kipimo | Lengo |
|---|---|
| `GET /dashboard/summary` p95 | < 200 ms |
| `POST /sales` p95 | < 250 ms |
| `GET /products` (100) p95 | < 150 ms |
| `POST /sync/push` (50 ops) p95 | < 500 ms |
| DB connections | PgBouncer, pool 20/service |
| Cache | Redis kwa dashboard + plans (TTL 60s) |
| Indexes | `(businessId, shopId, createdAt)` kwa sales; GIN kwa product search |

---

# 11. Database Schema (Prisma)

```prisma
// ─────────────────────────────────────────────────────────────
// MyBoke — Prisma schema (core)
// ─────────────────────────────────────────────────────────────

generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

// ── Tenancy ──────────────────────────────────────────────────
model Business {
  id           String   @id @default(cuid())   // hifadhi ULID string
  name         String
  type         String?                          // grocery, cosmetics…
  currency     String   @default("TZS")
  country      String   @default("TZ")
  timezone     String   @default("Africa/Dar_es_Salaam")
  tin          String?
  vatEnabled   Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships  Membership[]
  shops        Shop[]
  subscription Subscription?
  products     Product[]
  sales        Sale[]
  expenses     Expense[]
  debts        Debt[]
  customers    Customer[]
  suppliers    Supplier[]
  partners     Partner[]
  auditLogs    AuditLog[]

  @@index([createdAt])
}

model User {
  id            String   @id @default(cuid())
  phone         String?  @unique
  email         String?  @unique
  passwordHash  String?
  name          String
  avatarUrl     String?
  locale        String   @default("sw")
  isVerified    Boolean  @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  memberships   Membership[]
  refreshTokens RefreshToken[]
  devices       Device[]
  coinTx        CoinTransaction[]
  missions      Mission[]
  notifications Notification[]
}

model Membership {
  id          String   @id @default(cuid())
  businessId  String
  userId      String
  role        Role     @default(CASHIER)
  pinHash     String?             // kwa CASHIER login
  shopIds     String[]            // maduka aliyopewa
  isActive    Boolean  @default(true)
  invitedAt   DateTime?
  joinedAt    DateTime @default(now())

  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([businessId, userId])
  @@index([businessId, role])
}

enum Role { OWNER MANAGER CASHIER PARTNER SUPER_ADMIN }

model RefreshToken {
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String   @unique
  deviceId   String?
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Device {
  id         String   @id @default(cuid())
  userId     String
  deviceId   String
  platform   String   // android | ios | desktop
  appVersion String?
  fcmToken   String?
  lastSeenAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, deviceId])
}

// ── Shops ────────────────────────────────────────────────────
model Shop {
  id          String   @id @default(cuid())
  businessId  String
  name        String
  address     String?
  phone       String?
  lat         Float?
  lng         Float?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  products    Product[]
  stock       StockLevel[]
  sales       Sale[]
  expenses    Expense[]
  shifts      Shift[]

  @@index([businessId])
}

// ── Catalog ──────────────────────────────────────────────────
model Category {
  id         String    @id @default(cuid())
  businessId String
  name       String
  icon       String?
  createdAt  DateTime  @default(now())
  products   Product[]
  @@unique([businessId, name])
}

model Supplier {
  id         String    @id @default(cuid())
  businessId String
  name       String
  phone      String?
  notes      String?
  business   Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  products   Product[]
  purchases  PurchaseOrder[]
  @@index([businessId])
}

model Product {
  id           String   @id @default(cuid())
  businessId   String
  categoryId   String?
  supplierId   String?
  name         String
  barcode      String?
  sku          String?
  unitType     UnitType @default(PCS)
  unitSymbol   String   @default("pcs")
  buyingPrice  Decimal  @db.Decimal(18, 2)
  sellingPrice Decimal  @db.Decimal(18, 2)
  alertLevel   Int      @default(5)
  hasExpiry    Boolean  @default(false)
  expiryDate   DateTime?
  description  String?
  imageUrl     String?
  isActive     Boolean  @default(true)
  version      Int      @default(1)      // kwa sync conflicts
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  category     Category? @relation(fields: [categoryId], references: [id])
  supplier     Supplier? @relation(fields: [supplierId], references: [id])
  stock        StockLevel[]
  movements    StockMovement[]
  saleItems    SaleItem[]
  priceHistory PriceHistory[]

  @@unique([businessId, barcode])
  @@index([businessId, isActive])
  @@index([businessId, name])
}

enum UnitType { PCS KG G L M PKT }

model StockLevel {
  id        String  @id @default(cuid())
  shopId    String
  productId String
  quantity  Decimal @db.Decimal(18, 3) @default(0)
  updatedAt DateTime @updatedAt

  shop      Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([shopId, productId])
  @@index([shopId, quantity])
}

model StockMovement {
  id         String        @id @default(cuid())
  shopId     String
  productId  String
  type       MovementType
  quantity   Decimal       @db.Decimal(18, 3)   // + in, - out
  reason     String?
  refType    String?       // sale | purchase | transfer | adjustment | count
  refId      String?
  userId     String?
  createdAt  DateTime      @default(now())

  product    Product       @relation(fields: [productId], references: [id])
  @@index([shopId, productId, createdAt])
}

enum MovementType { IN OUT ADJUST }

model PriceHistory {
  id          String   @id @default(cuid())
  productId   String
  field       String   // buyingPrice | sellingPrice
  oldValue    Decimal  @db.Decimal(18, 2)
  newValue    Decimal  @db.Decimal(18, 2)
  reason      String?
  changedBy   String?
  createdAt   DateTime @default(now())
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
}

// ── Sales ────────────────────────────────────────────────────
model Sale {
  id           String   @id @default(cuid())   // ULID kutoka client kwa offline
  businessId   String
  shopId       String
  receiptNo    String
  customerId   String?
  sellerId     String?
  shiftId      String?
  saleDate     DateTime @default(now())
  subtotal     Decimal  @db.Decimal(18, 2)
  discount     Decimal  @db.Decimal(18, 2) @default(0)
  total        Decimal  @db.Decimal(18, 2)
  costTotal    Decimal  @db.Decimal(18, 2) @default(0)
  profit       Decimal  @db.Decimal(18, 2) @default(0)
  paymentMethod PaymentMethod @default(CASH)
  status       SaleStatus @default(COMPLETED)
  note         String?
  idempotencyKey String? @unique
  syncedAt     DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  shop         Shop     @relation(fields: [shopId], references: [id])
  items        SaleItem[]
  payments     Payment[]

  @@index([businessId, shopId, saleDate])
  @@index([businessId, createdAt])
}

enum SaleStatus { COMPLETED REFUNDED PARTIAL_REFUND VOIDED }
enum PaymentMethod { CASH MPESA AIRTEL MIXED CREDIT }

model SaleItem {
  id         String  @id @default(cuid())
  saleId     String
  productId  String?
  name       String         // snapshot
  quantity   Decimal @db.Decimal(18, 3)
  unitSymbol String   @default("pcs")
  price      Decimal @db.Decimal(18, 2)
  buyingPrice Decimal @db.Decimal(18, 2)
  discount   Decimal @db.Decimal(18, 2) @default(0)
  lineTotal  Decimal @db.Decimal(18, 2)
  refundedQty Decimal @db.Decimal(18, 3) @default(0)

  sale       Sale    @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product    Product? @relation(fields: [productId], references: [id])
  @@index([saleId])
}

// ── Payments ─────────────────────────────────────────────────
model Payment {
  id          String   @id @default(cuid())
  businessId  String
  saleId      String?
  debtId      String?
  amount      Decimal  @db.Decimal(18, 2)
  method      PaymentMethod
  reference   String?          // M-Pesa ref
  paidAt      DateTime @default(now())
  recordedBy  String?

  sale        Sale?    @relation(fields: [saleId], references: [id])
  debt        Debt?    @relation(fields: [debtId], references: [id])
  @@index([businessId, paidAt])
}

// ── Customers & Debts ────────────────────────────────────────
model Customer {
  id            String   @id @default(cuid())
  businessId    String
  name          String
  phone         String?
  email         String?
  creditLimit   Decimal? @db.Decimal(18, 2)
  loyaltyPoints Int      @default(0)
  notes         String?
  birthday      DateTime?
  createdAt     DateTime @default(now())

  business      Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  debts         Debt[]

  @@unique([businessId, phone])
  @@index([businessId, name])
}

model Debt {
  id             String   @id @default(cuid())
  businessId     String
  customerId     String?
  type           DebtType @default(OWE_ME)
  personName     String
  personPhone    String?
  originalAmount Decimal  @db.Decimal(18, 2)
  paidAmount     Decimal  @db.Decimal(18, 2) @default(0)
  description    String?
  dueDate        DateTime?
  status         DebtStatus @default(OPEN)
  lastReminderAt DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  business       Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  customer       Customer? @relation(fields: [customerId], references: [id])
  payments       Payment[]

  @@index([businessId, status, dueDate])
}

enum DebtType { OWE_ME I_OWE }
enum DebtStatus { OPEN PARTIAL PAID OVERDUE WRITTEN_OFF }

// ── Expenses ─────────────────────────────────────────────────
model Expense {
  id          String   @id @default(cuid())
  businessId  String
  shopId      String
  name        String
  amount      Decimal  @db.Decimal(18, 2)
  category    String
  date        DateTime @default(now())
  notes       String?
  isRecurring Boolean  @default(false)
  recurEvery  String?   // monthly | weekly
  createdBy   String?
  createdAt   DateTime @default(now())

  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  shop        Shop     @relation(fields: [shopId], references: [id])
  @@index([businessId, shopId, date])
}

// ── Shifts ───────────────────────────────────────────────────
model Shift {
  id           String   @id @default(cuid())
  shopId       String
  userId       String
  openingFloat Decimal  @db.Decimal(18, 2) @default(0)
  countedCash  Decimal? @db.Decimal(18, 2)
  openedAt     DateTime @default(now())
  closedAt     DateTime?
  shop         Shop     @relation(fields: [shopId], references: [id])
  @@index([shopId, openedAt])
}

// ── Suppliers / Purchase orders ──────────────────────────────
model PurchaseOrder {
  id          String   @id @default(cuid())
  businessId  String
  supplierId  String
  shopId      String
  status      POStatus @default(DRAFT)
  total       Decimal  @db.Decimal(18, 2)
  orderedAt   DateTime @default(now())
  receivedAt  DateTime?
  supplier    Supplier @relation(fields: [supplierId], references: [id])
  @@index([businessId])
}
enum POStatus { DRAFT SENT RECEIVED CANCELLED }

// ── Growth ───────────────────────────────────────────────────
model CoinTransaction {
  id        String   @id @default(cuid())
  userId    String
  amount    Int                // + earned, - redeemed
  reason    String
  refType   String?
  refId     String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
}

model Mission {
  id          String   @id @default(cuid())
  businessId  String
  userId      String
  type        String            // promote | winback | collect | price | restock
  title       String
  description String
  reason      String
  payload     Json
  coinsReward Int      @default(20)
  status      MissionStatus @default(PENDING)
  dueAt       DateTime
  completedAt DateTime?
  impactAt    DateTime?
  impact      Json?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([businessId, userId, status])
}
enum MissionStatus { PENDING ACTIVE COMPLETED SKIPPED EXPIRED }

model DemandRecord {
  id          String   @id @default(cuid())
  businessId  String
  shopId      String
  productName String
  ward        String?
  createdAt   DateTime @default(now())
  @@index([productName, createdAt])
}

model Partner {
  id             String   @id @default(cuid())
  businessId     String?
  name           String
  phone          String?
  code           String   @unique
  type           String?          // agent | reseller
  commissionRate Decimal  @db.Decimal(5, 2) @default(10)
  isActive       Boolean  @default(true)
  business       Business? @relation(fields: [businessId], references: [id])
  commissions    Commission[]
  @@index([code])
}

model Commission {
  id          String   @id @default(cuid())
  partnerId   String
  invoiceId   String?
  amount      Decimal  @db.Decimal(18, 2)
  status      CommissionStatus @default(PENDING)
  createdAt   DateTime @default(now())
  settledAt   DateTime?
  partner     Partner  @relation(fields: [partnerId], references: [id])
}
enum CommissionStatus { PENDING APPROVED PAID REJECTED }

// ── Billing ──────────────────────────────────────────────────
model Plan {
  id           String   @id
  name         String
  monthlyPrice Decimal  @db.Decimal(18, 2)
  maxShops     Int
  maxSellers   Int
  features     Json
  isActive     Boolean  @default(true)
}

model Subscription {
  id         String   @id @default(cuid())
  businessId String   @unique
  planId     String
  status     SubStatus @default(ACTIVE)
  startsAt   DateTime @default(now())
  endsAt     DateTime
  autoRenew  Boolean  @default(false)
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  invoices   Invoice[]
  @@index([status, endsAt])
}
enum SubStatus { TRIAL ACTIVE PAST_DUE EXPIRED CANCELLED }

model Invoice {
  id             String   @id @default(cuid())
  subscriptionId String
  amount         Decimal  @db.Decimal(18, 2)
  months         Int
  paymentKey     String   @unique      // idempotency ya Snippe
  reference      String?
  status         InvoiceStatus @default(PENDING)
  paidAt         DateTime?
  createdAt      DateTime @default(now())
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  @@index([status])
}
enum InvoiceStatus { PENDING PAID FAILED REFUNDED }

// ── Sync / audit ─────────────────────────────────────────────
model SyncOperation {
  id         String   @id @default(cuid())
  deviceId   String
  opId       String
  entity     String
  action     String
  status     String
  error      String?
  createdAt  DateTime @default(now())
  @@unique([deviceId, opId])
  @@index([createdAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  businessId String?
  userId     String?
  action     String
  entity     String
  entityId   String
  before     Json?
  after      Json?
  ip         String?
  createdAt  DateTime @default(now())
  business   Business? @relation(fields: [businessId], references: [id])
  @@index([businessId, createdAt])
}

// ── Notifications ────────────────────────────────────────────
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String
  data      Json?
  readAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt])
}
```

---

# 12. Kotlin Multiplatform Client

## 12.1 Stack

| Tabaka | Uchaguzi |
|---|---|
| Language | **Kotlin 2.x** |
| UI | **Compose Multiplatform** (Android, iOS, Desktop) |
| Networking | **Ktor Client** (OkHttp / Darwin / CIO) |
| Serialization | **kotlinx.serialization** |
| DI | **Koin** |
| Local DB | **SQLDelight** (`multiplatform-settings` kwa prefs) |
| Async | **kotlinx.coroutines** + Flow |
| Dates | **kotlinx-datetime** |
| Images | **Coil 3** (multiplatform) |
| Navigation | **Voyager** au `androidx.navigation` (CMP) |
| Charts | Custom Compose canvas (au `koalaplot`) |
| Camera/Barcode | `expect/actual` → ML Kit (Android) / AVFoundation (iOS) |
| Bluetooth print | `expect/actual` → Android BT / iOS ExternalAccessory |
| Push | `expect/actual` → FCM (Android) / APNs (iOS) |
| Secure storage | `expect/actual` → EncryptedSharedPrefs / Keychain |
| Testing | kotlin.test + Turbine + MockK |

## 12.2 Module Structure

```
myboke/
├── composeApp/                    # Compose UI + navigation
│   ├── commonMain/
│   │   ├── ui/
│   │   │   ├── theme/             # MyBokeTheme, colors, typography
│   │   │   ├── components/        # MbButton, MbCard, MbTextField, MoneyText…
│   │   │   ├── screens/
│   │   │   │   ├── home/
│   │   │   │   ├── pos/
│   │   │   │   ├── products/
│   │   │   │   ├── customers/
│   │   │   │   ├── debts/
│   │   │   │   ├── expenses/
│   │   │   │   ├── reports/
│   │   │   │   ├── analytics/
│   │   │   │   ├── shops/
│   │   │   │   ├── sellers/
│   │   │   │   ├── growth/
│   │   │   │   ├── billing/
│   │   │   │   └── settings/
│   │   │   ├── sheets/
│   │   │   └── navigation/
│   │   └── i18n/                  # AppStrings (sw/en)
│   ├── androidMain/
│   ├── iosMain/
│   └── desktopMain/
│
├── core/
│   ├── model/                     # domain models (pure Kotlin)
│   ├── domain/                    # use cases (CalculateProfit, BuildReceipt…)
│   ├── network/                   # Ktor client, API services
│   ├── database/                  # SQLDelight schema + DAOs
│   ├── sync/                      # outbox, push/pull engine
│   ├── datastore/                 # settings, session
│   └── design/                    # tokens (shared with UI)
│
├── feature/                       # optional modularization
├── shared/                        # expect/actual interfaces
└── backend/                       # NestJS (repo tofauti au folder)
```

## 12.3 Design System kwenye Compose

```kotlin
// core/design/MyBokeColors.kt
object MyBokeColors {
    // Brand
    val Blue50  = Color(0xFFEAF1FF)
    val Blue100 = Color(0xFFD3E2FF)
    val Blue200 = Color(0xFFA8C6FF)
    val Blue300 = Color(0xFF7AA7FB)
    val Blue400 = Color(0xFF3D82F2)
    val Blue500 = Color(0xFF0269E9)   // PRIMARY
    val Blue600 = Color(0xFF085DC0)
    val Blue700 = Color(0xFF0B37A1)   // BRAND DEEP
    val Blue800 = Color(0xFF0A2E86)
    val Blue900 = Color(0xFF072B7A)

    val Cyan100 = Color(0xFFD6F4FA)
    val Cyan300 = Color(0xFF4FCBE4)
    val Cyan500 = Color(0xFF0A9CBF)   // SECONDARY
    val Cyan700 = Color(0xFF018E9F)

    val Green100 = Color(0xFFD5F5E3)
    val Green300 = Color(0xFF5FD98E)
    val Green500 = Color(0xFF16A760)  // SUCCESS
    val Green600 = Color(0xFF0E8A50)

    val Lime400  = Color(0xFF73D31C)

    // Semantic
    val Success = Green500
    val Warning = Color(0xFFF59E0B)
    val Danger  = Color(0xFFDC2626)
    val Info    = Cyan500

    // Light surfaces
    val Bg        = Color(0xFFF5F7FB)
    val Surface   = Color(0xFFFFFFFF)
    val Surface2  = Color(0xFFEEF2FA)
    val Border    = Color(0xFFE2E8F4)
    val TextPrimary   = Color(0xFF0B1220)
    val TextSecondary = Color(0xFF4A5568)
    val TextMuted     = Color(0xFF8A94A6)

    // Dark surfaces
    val DarkBg        = Color(0xFF080D18)
    val DarkSurface   = Color(0xFF111A2B)
    val DarkSurface2  = Color(0xFF182339)
    val DarkBorder    = Color(0xFF22304A)
    val DarkTextPrimary   = Color(0xFFF2F5FA)
    val DarkTextSecondary = Color(0xFFA8B4C8)
    val DarkTextMuted     = Color(0xFF6E7C93)

    // Brand gradient (Compose)
    val BrandGradient = listOf(Blue700, Blue500, Cyan500, Green500)
}

// Gradient helper
fun Modifier.brandGradient(shape: Shape = RoundedCornerShape(20.dp)) = this
    .background(Brush.linearGradient(MyBokeColors.BrandGradient), shape)
```

```kotlin
@Composable
fun MyBokeTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (dark) darkColors(
        primary = MyBokeColors.Blue400, onPrimary = Color.White,
        secondary = MyBokeColors.Cyan300, background = MyBokeColors.DarkBg,
        surface = MyBokeColors.DarkSurface, onSurface = MyBokeColors.DarkTextPrimary,
        error = MyBokeColors.Danger
    ) else lightColors(
        primary = MyBokeColors.Blue500, onPrimary = Color.White,
        secondary = MyBokeColors.Cyan500, background = MyBokeColors.Bg,
        surface = MyBokeColors.Surface, onSurface = MyBokeColors.TextPrimary,
        error = MyBokeColors.Danger
    )
    MaterialTheme(colorScheme = colors, typography = MyBokeTypography, content = content)
}
```

## 12.4 Local DB & Sync (SQLDelight)

```sql
-- core/database/MyBoke.sq
CREATE TABLE product (
  id TEXT PRIMARY KEY,
  businessId TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  buyingPrice TEXT NOT NULL,
  sellingPrice TEXT NOT NULL,
  alertLevel INTEGER NOT NULL,
  version INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  syncState TEXT NOT NULL DEFAULT 'SYNCED' -- SYNCED | PENDING | CONFLICT
);

CREATE TABLE sale (
  id TEXT PRIMARY KEY,
  shopId TEXT NOT NULL,
  total TEXT NOT NULL,
  saleDate INTEGER NOT NULL,
  syncState TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE outbox (
  opId TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  baseVersion INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Sync engine (mzunguko):**
```
1. Angalia network (ConnectivityObserver)
2. Soma outbox (order by createdAt ASC)
3. Tuma batch → POST /sync/push
4. Weka matokeo (applied → delete outbox, conflict → flag)
5. Pull changes → GET /sync/pull?since=cursor
6. Apply kwa DB (transaction)
7. Update cursor + UI state
```

## 12.5 expect/actual Matrix

| Uwezo | commonMain | androidMain | iosMain | desktopMain |
|---|---|---|---|---|
| Barcode scan | `interface Scanner` | `MlKitScanner` | `AVCaptureScanner` | `—` |
| Thermal print | `interface Printer` | `BluetoothEscPos` | `ExternalAccessory` | `USB/Network` |
| Push | `interface PushService` | FCM | APNs | `—` |
| Secure store | `interface SecureStore` | `EncryptedSharedPrefs` | Keychain | File (dev) |
| Biometric | `interface Biometrics` | BiometricPrompt | LocalAuthentication | `—` |
| Share | `interface Sharer` | Intent | UIActivityVC | Desktop share |
| File pick | `interface FilePicker` | ActivityResult | UIDocumentPicker | AWT FileDialog |
| Locale | `interface LocaleProvider` | LocaleList | NSLocale | JVM Locale |

---

# 13. Mahitaji Yasiyo ya Kazi (NFR)

| Eneo | Lengo |
|---|---|
| **Availability** | 99.9% kwa mwezi (≈ 43 min downtime) |
| **API p95** | < 250 ms (read), < 400 ms (write) |
| **App startup** | < 2s kwenye Android ya kati (cold) |
| **App size** | < 40 MB (Android), < 60 MB (iOS) |
| **Offline** | 100% ya POS inafanya kazi bila internet |
| **Sync** | Batch 50 ops < 2s (4G) |
| **Scale target Y1** | 50,000 businesses · 500k sales/siku |
| **Scale target Y3** | 500,000 businesses · 5M sales/siku |
| **Data retention** | Sales ∞ · logs 90 siku · audit 2 miaka |
| **Backup** | PITR 7 siku + daily snapshot 30 siku |
| **Security** | OWASP ASVS L2 |
| **Accessibility** | WCAG 2.1 AA |
| **Localization** | sw, en (+ swahili ya Congo/Kenya baadaye) |

**Uwezo wa DB:**
- Partitioning ya `sales` kwa mwezi (`created_at`) ikiwa > 40M rows
- Read replicas kwa reports
- Materialized views kwa dashboard
- `pg_trgm` kwa product search

---

# 14. Roadmap

## Phase 0 — Foundation (Wiki 1–2)
- [ ] Repo, CI/CD, Docker Compose
- [ ] NestJS skeleton + Swagger + health
- [ ] Prisma schema + migrations
- [ ] Auth (register, OTP, login, refresh)
- [ ] Tenancy (Business, Membership, guards)
- [ ] Design tokens + Compose theme

## Phase 1 — MVP POS (Wiki 3–7)
- [ ] Products CRUD + categories + units
- [ ] Stock levels + movements
- [ ] **Sales API + POS UI** (offline-ready)
- [ ] Customers
- [ ] Receipts (PDF + WhatsApp share)
- [ ] Dashboard summary
- [ ] i18n (sw/en) kamili

## Phase 2 — Finance (Wiki 8–10)
- [ ] Expenses
- [ ] Debts + payments + reminders
- [ ] Profit + reports
- [ ] Export (PDF/Excel)

## Phase 3 — Offline & Sync (Wiki 10–12)
- [ ] SQLDelight schema
- [ ] Outbox + push/pull
- [ ] Conflict handling + Sync Issues screen
- [ ] Sync observability

## Phase 4 — Growth (Wiki 13–16)
- [ ] BokeCoins
- [ ] Missions + impact
- [ ] Demand records + report
- [ ] Recommendations (data-driven)
- [ ] AI assistant

## Phase 5 — Monetization & Admin (Wiki 17–19)
- [ ] Plans + subscriptions
- [ ] Snippe integration + webhooks
- [ ] Admin dashboard
- [ ] Partner program + commissions

## Phase 6 — Scale & Delight (Wiki 20–24)
- [ ] Desktop app (CMP)
- [ ] Tablet POS layout
- [ ] Dark mode + accessibility audit
- [ ] Shift/cash drawer + Z-report
- [ ] Suppliers + purchase orders
- [ ] Returns/refunds
- [ ] Stock transfer

---

# 15. Repo Structure & Dev Setup

```
myboke/
├── apps/
│   ├── backend/               # NestJS
│   │   ├── prisma/
│   │   ├── src/
│   │   ├── test/
│   │   └── Dockerfile
│   └── mobile/                # Kotlin Multiplatform
│       ├── composeApp/
│       ├── core/
│       └── gradle/
├── packages/
│   └── shared-types/          # DTOs (generated kutoka OpenAPI)
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/                   # (baadaye)
│   └── nginx/
├── docs/
│   ├── 01-fastapro-reference-analysis.md
│   ├── 02-api.md
│   ├── 03-design-system.md
│   └── 04-adr/
├── package.json
└── pnpm-workspace.yaml
```

## 15.1 Dev Setup (backend)

```bash
# 1. Mahitaji: Node 22+, pnpm 9+, Docker
pnpm install

# 2. Hifadhidata (porti zimehamishwa ili zisigongane na services za mfumo)
docker compose up -d postgres redis

# 3. Env
cp apps/backend/.env.example apps/backend/.env

# 4. Schema + seed
pnpm --filter @myboke/backend prisma:push
pnpm --filter @myboke/backend prisma:seed

# 5. Endesha
pnpm --filter @myboke/backend dev
# API     → http://localhost:4000/v1
# Swagger → http://localhost:4000/docs
```

> **Porti:** Postgres `5544` · Redis `6380` · MinIO `9000/9001` · API `4000`.
> Tumia porti hizi ili kuepuka kugongana na Postgres/Redis vilivyowekwa kwenye mashine (5432/6379) au app nyingine kwenye 3000.

## 15.2 `.env.example`

```bash
NODE_ENV=development
PORT=4000
API_PREFIX=v1
CORS_ORIGINS=*
DATABASE_URL=postgresql://myboke:myboke@localhost:5544/myboke?schema=public
REDIS_URL=redis://localhost:6380
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me_2
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=myboke-dev
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
SNIPPE_API_KEY=
SNIPPE_WEBHOOK_SECRET=
SMS_PROVIDER=beem
SMS_API_KEY=
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
```

## 15.3 OpenAPI → Kotlin Client

```bash
# Tengeneza DTOs za Kotlin kutoka Swagger
openapi-generator-cli generate \
  -i http://localhost:3000/docs-json \
  -g kotlin \
  -o apps/mobile/core/network/generated \
  --library jvm-ktor \
  --additional-properties=serializationLibrary=kotlinx_serialization
```

---

# 16. Maamuzi Yaliyo Wazi

| # | Uamuzi | Chaguo | Pendekezo |
|---|---|---|---|
| D1 | Backend | NestJS · Fastify+TS · Go | **NestJS** (speed ya dev + Swagger) |
| D2 | DB | Postgres · MySQL · Mongo | **Postgres** |
| D3 | Local DB | SQLDelight · Room-KMP · Realm | **SQLDelight** |
| D4 | Auth | JWT tofauti · Firebase Auth · Keycloak | **JWT yetu** (offline-friendly) |
| D5 | Payments | Snippe · Selcom · M-Pesa direct | **Snippe** + fallback |
| D6 | SMS | Beem · Africa's Talking · Twilio | **Beem** (TZ) |
| D7 | Hosting | Fly.io · Railway · VPS · AWS | **Hetzner/Fly** mwanzo, AWS baadaye |
| D8 | WhatsApp | wa.me links · BSP API (Meta) | **wa.me** MVP → BSP Phase 4 |
| D9 | AI | OpenAI · Gemini · local | **Gemini/OpenAI** kupitia backend proxy |
| D10 | Pricing ya muda mrefu | Linear · discount | **Ongeza discount** (3m −5%, 12m −15%) |
| D11 | Plan ya bure | 1 duka · trial | **Free tier** (1 duka, bidhaa 50) — inasaidia acquisition |

---

# 17. Uzingatiaji wa Sheria (Tanzania)

> Hii ni sehemu iliyokosekana kwenye rasimu ya kwanza. Kwa POS ya Tanzania, **si hiari**.

## 17.1 Sheria Muhimu

| Sheria | Inahusu | Athari kwa MyBoke |
|---|---|---|
| **Personal Data Protection Act, 2022** (PDPA) | Data ya watu binafsi | Ridhaa, haki ya kufuta, kumbukumbu ya matumizi |
| **TRA — VAT Act / EFD** | Risiti za kielektroniki kwa walioandikishwa VAT | EFD integration au muunganisho wa mfumo |
| **Business Licensing Act** | Leseni ya biashara | Sehemu ya leseni kwenye profaili |
| **Electronic Transactions Act, 2015** | Sahihi & mikataba ya kielektroniki | Masharti ya huduma (ToS) |
| **Bank of Tanzania** (malipo) | Uhamishaji wa fedha | Snippe ndiye mtoa huduma wa leseni |

## 17.2 PDPA 2022 — Mahitaji

| # | Hitaji | Utekelezaji |
|---|---|---|
| P1 | **Ridhaa ya wazi** | Onboarding ina checkbox (haijachaguliwa awali) + kiungo cha sera |
| P2 | **Haki ya kufikia data** | `GET /me/export` → JSON + PDF |
| P3 | **Haki ya kufuta** | `DELETE /me` → soft-delete siku 30, kisha purge |
| P4 | **Kumbukumbu ya usindikaji** | `AuditLog` + `ConsentRecord` |
| P5 | **Uhamishaji nje ya nchi** | Data ya TZ ibaki TZ/Afrika Mashariki kama inawezekana |
| P6 | **Notisi ya uvunjaji** | Kiolezo cha taarifa ndani ya saa 72 |
| P7 | **Afisa wa ulinzi wa data** | Jina + barua pepe kwenye sera |
| P8 | **Uwekaji wa data kwa muda** | Angalia §17.5 |

**Entities mpya:**
```prisma
model ConsentRecord {
  id         String   @id @default(cuid())
  userId     String
  purpose    String   // marketing | analytics | whatsapp
  granted    Boolean
  version    String   // toleo la sera
  ip         String?
  createdAt  DateTime @default(now())
  @@index([userId, purpose])
}
```

## 17.3 TRA / EFD — Risiti za Kielektroniki

**Ukweli:** biashara iliyoandikishwa VAT **LAZIMA** itoe risiti ya EFD. Bila hiyo, MyBoke haiwezi kutumika kwa biashara kubwa.

### Mikakati mitatu (kwa mpangilio wa muda)

| Awamu | Mbinu | Maelezo |
|---|---|---|
| **MVP** | Uwanja wa EFD kwa mkono | `efdReceiptNo` + `efdVerificationCode` kwenye `Sale`; mtumiaji anaingiza |
| **Phase 5** | Muunganisho wa mfumo (VFD) | API ya mtoa huduma aliyethibitishwa na TRA |
| **Phase 6** | Printa ya EFD | Integration ya vifaa (ESC/POS + module) |

**Sehemu mpya kwenye `Sale`:**
```prisma
efdReceiptNo        String?
efdVerificationCode String?
efdIssuedAt         DateTime?
```
Na kwenye `Business`: `vatNumber`, `efdSerial`, `isVatRegistered`.

### Muundo wa risiti ya VAT
```
────────────────────────────────
DUKA LA SALMA
TIN: 123-456-789   VAT: 40012345
EFD Serial: TZ0001234
Risiti: MB-20261101-0007
Tarehe: 01/11/2026 14:32
────────────────────────────────
Soda 500ml   2 pcs × 1,200   2,400.00
Unga 1kg     1 pcs × 2,000   2,000.00
────────────────────────────────
Jumla ndogo                  4,400.00
VAT (18%)                      792.00
Jumla                        4,400.00
────────────────────────────────
Malipo: M-Pesa  4,400.00
Chenji: 0.00
EFD Code: A1B2C3D4E5
────────────────────────────────
Asante! Karibu tena.
```

### Hesabu ya VAT (bei inajumuisha VAT)
```
grossInclusive = total
netOfVat       = grossInclusive / (1 + vatRate)      // vatRate = 0.18
vatAmount      = grossInclusive − netOfVat
```
> **Muhimu:** bei za dukani Tanzania ni **zilizojumuisha VAT**. Usiongeze VAT juu ya bei ya mteja.

## 17.4 Risiti — Mahitaji ya Kisheria

Kila risiti **LAZIMA** iwe na:
1. Jina la biashara
2. TIN
3. Namba ya EFD (kama imeandikishwa)
4. Namba ya risiti ya kipekee
5. Tarehe na saa
6. Bidhaa, kiasi, bei
7. Jumla
8. VAT (kama imeandikishwa)
9. Njia ya malipo
10. Namba ya simu ya duka

**Uhifadhi:** risiti zihifadhiwe **miaka 5** (mahitaji ya kodi), hata baada ya kufuta akaunti.

## 17.5 Sera ya Uhifadhi wa Data

| Data | Muda | Baada ya hapo |
|---|---|---|
| Mauzo & risiti | Miaka 5 (kodi) | Archive (cold storage) |
| Gharama | Miaka 5 | Archive |
| Madeni yaliyolipwa | Miaka 5 | Archive |
| Audit log | Miaka 2 | Purge |
| Sync operations | Siku 90 | Purge |
| Refresh tokens | Siku 30 | Purge |
| Notifications | Siku 90 | Purge |
| Picha za bidhaa | Maisha ya bidhaa | Purge |

---

# 18. Vifaa & Uchapishaji

## 18.1 Printa za Thermal (ESC/POS)

**Printa zinazosaidiwa:** Xprinter XP-58/XP-80, Goojprt PT-210, Rongta RP58, Epson TM-T20/TM-m30, Black Copper BC-58.

| Kipengele | Thamani |
|---|---|
| Protocol | ESC/POS |
| Interface | Bluetooth Classic (SPP) · USB · Network |
| Ukubwa | 58mm (32 herufi) · 80mm (48 herufi) |
| Encoding | CP437 / CP850 (Kiswahili ni ASCII — hakuna tatizo) |
| Logo | `GS v 0` raster bitmap (1-bit) |

### 18.1.1 Muundo wa risiti (58mm, herufi 32)

```
        DUKA LA SALMA
    Kinondoni, Dar es Salaam
        0712 345 678
   TIN 123-456-789  VAT 40012345
--------------------------------
Risiti: MB-20261101-0007
01/11/2026 14:32    Muuzaji: Juma
--------------------------------
Soda 500ml
  2 x 1,200.00        2,400.00
Unga Sembe 1kg
  1 x 2,000.00        2,000.00
--------------------------------
Jumla ndogo           4,400.00
Punguzo                   0.00
VAT (18%)               792.00
JUMLA                 4,400.00
--------------------------------
Malipo: M-Pesa        4,400.00
Chenji                    0.00
--------------------------------
EFD: TZ0001234
Code: A1B2C3D4E5
--------------------------------
     Asante! Karibu tena
      myboke.co.tz
```

### 18.1.2 Mfululizo wa amri

| Hatua | Amri | Maelezo |
|---|---|---|
| 1. Anzisha | `ESC @` (0x1B 0x40) | Reset |
| 2. Panga kati | `ESC a 1` | Center align |
| 3. Herufi kubwa | `ESC ! 0x08` | Bold |
| 4. Chapisha | Text + `\n` | UTF-8 → CP437 |
| 5. Kata | `GS V 66 0` | Partial cut |
| 6. Fungua drawer | `ESC p 0 25 250` | Cash drawer |

### 18.1.3 Uunganishaji (Bluetooth)
```
1. Omba ruhusa: BLUETOOTH_CONNECT (Android 12+)
2. Scan SPP devices (~4s)
3. Chagua printa → bond
4. Jaribio: chapisha risiti ya mtihani
5. Hifadhi MAC address kwenye settings
```
**Kushindikana:** rudisha `Hifadhi PDF` kama njia mbadala — **kamwe** usizuie mauzo kwa sababu ya printa.

## 18.2 Lebo za Barcode

| Kipengele | Thamani |
|---|---|
| Formats | EAN-13 · Code128 · QR |
| Ukubwa wa lebo | 40×30mm · 50×25mm · 38×25mm |
| Yaliyomo | Jina (kifupi) · Bei · Barcode · Jina la duka |
| Printa | Ile ile ya thermal au label printer (TSPL) |

## 18.3 Vifaa Vingine

| Kifaa | Matumizi | Interface |
|---|---|---|
| Cash drawer | Shift/cash | RJ11 kupitia printa (`ESC p`) |
| Barcode scanner | POS | HID (keyboard wedge) — hakuna driver |
| Scale (mizani) | Kg | Bluetooth SPP / manual |
| Tablet | POS ya duka | Android |

> **Kanuni:** kila kifaa ni **hiari**. App inafanya kazi 100% bila kifaa chochote.

---

# 19. Import / Export

## 19.1 Import ya Bidhaa (Excel/CSV)

### Template (lazima)
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Jina* | Barcode | Category | Unit | Bei ya kununua* | Bei ya kuuza* | Stock | Alert |

### Sheria
| # | Sheria |
|---|---|
| I1 | Safu 1 = vichwa (vinapitwa) |
| I2 | Mistari mitupu inapitwa |
| I3 | Kikomo: **5,000** mistari kwa faili |
| I4 | Ukubwa: **10 MB** |
| I5 | Barcode inayojirudia → tengeneza mpya au sasisha (chaguo) |
| I6 | Jina tupu → kosa la mstari (haizuii wengine) |
| I7 | Bei si namba → kosa la mstari |
| I8 | Unit isiyojulikana → `pcs` + onyo |
| I9 | **Dry-run** kwanza: onyesha `itapokelewa 120, itashindikana 3` |
| I10 | Matokeo: CSV ya makosa (`mstari, sababu`) |

### Mtiririko wa UI
```
1. Chagua faili        → 2. Ramani safu (auto-detect)
3. Dry-run + hakiki    → 4. Tekeleza (progress bar)
5. Muhtasari: ✓ 120  ✗ 3   →  [Pakua makosa CSV]
```

**API:**
```
POST /products/import/dry-run    (multipart)
POST /products/import            (multipart, idempotent)
GET  /products/import/:jobId     (progress)
```

## 19.2 Export

| Aina | Formats | Kikomo |
|---|---|---|
| Bidhaa | XLSX · CSV | 50,000 |
| Mauzo | XLSX · CSV · PDF | 100,000 / kipindi cha miaka 2 |
| Gharama | XLSX · CSV | 50,000 |
| Madeni | XLSX · CSV · PDF | 10,000 |
| Ripoti (dashboard) | PDF | — |
| Data yote (PDPA) | JSON (zip) | Async, kiungo cha siku 7 |

**Kanuni:** export kubwa ni **async** (BullMQ) → `GET /exports/:id` inarudisha `{ status, url }` yenye presigned URL ya dakika 60.

---

# 20. Telemetry & Analytics Events

## 20.1 Kanuni

1. Hakuna **PII** kwenye events (hakuna majina, simu, bei halisi).
2. Kila event ina `businessId` (hashed), `appVersion`, `platform`, `locale`.
3. Ridhaa (PDPA) inaheshimiwa: analytics off = hakuna events.
4. Events zinatumwa **batched** (kila sekunde 30 / events 20).

## 20.2 Orodha ya Events

| Event | Sifa | Kwa nini |
|---|---|---|
| `app_open` | cold/warm | Retention |
| `onboarding_step` | step, completed | Funnel |
| `sale_completed` | items, durationMs, offline | North star (WRS) |
| `sale_failed` | code, offline | Reliability |
| `product_created` | via (manual/import/scan) | Activation |
| `import_completed` | rows, errors | Quality |
| `sync_push` | ops, ms, failed | Sync health |
| `sync_conflict` | entity | Data quality |
| `debt_reminded` | tier (1/2/3) | Feature use |
| `report_viewed` | type, period | Engagement |
| `mission_completed` | type, coins | Growth loop |
| `paywall_shown` | trigger | Monetization |
| `subscription_started` | plan, months | Revenue |
| `search_used` | hits (0 / 1+) | Search quality |
| `receipt_shared` | channel | Distribution |
| `print_attempted` | success, printer | Hardware |

## 20.3 Funnel Muhimu

```
app_open → onboarding_step(1..5) → product_created → sale_completed
                                                        ↓
                                              day2_return → day7_return → paid
```

**Lengo:** `app_open → sale_completed` ndani ya saa 24 ≥ **55%**.

---

# 21. Testing & QA

## 21.1 Piramidi

```
        ▲  E2E (Playwright/Supertest)  ~15
       ╱ ╲
      ╱   ╲  Integration (Testcontainers + Postgres)  ~80
     ╱─────╲
    ╱       ╲ Unit (Jest / kotlin.test)  ~300
   ╱─────────╲
```

## 21.2 Backend — Testi za Lazima

| Aina | Kipimo | Mfano |
|---|---|---|
| Unit | Money & formula | `lineProfit`, `clampDiscount`, `receiptNo` |
| Unit | Date boundaries | `startOfDayEAT` kwa 23:59 na 00:01 |
| Integration | Sales transaction | Kuuza → stock inapungua → movement inarekodiwa |
| Integration | Idempotency | POST mara 2 → sale 1 |
| Integration | Tenant isolation | Business A haoni bidhaa za B |
| Integration | Stock guard | Kuuza 5 wakati zipo 2 → 409 `INSUFFICIENT_STOCK` |
| Integration | Refund | Stock inarudi, ripoti inaondoa |
| Integration | RBAC | CASHIER → `DELETE /sales` → 403 |
| Integration | Auth rotation | Refresh → token ya zamani haifanyi kazi |
| E2E | Onboarding → sale → report | Mtiririko kamili |

### 21.2.1 Testi ya Tenant Isolation (muhimu zaidi)
```ts
it('haionyeshi bidhaa za biashara nyingine', async () => {
  const a = await createBusinessWithUser();
  const b = await createBusinessWithUser();
  await createProduct(a.token, { name: 'A-1' });
  await createProduct(b.token, { name: 'B-1' });

  const res = await request(app).get('/v1/products').set(auth(a.token));
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0].name).toBe('A-1');
});

it('inarudisha 404 kwa ID ya biashara nyingine', async () => {
  const p = await createProduct(b.token, { name: 'B-1' });
  const res = await request(app)
    .get(`/v1/products/${p.id}`)
    .set(auth(a.token));
  expect(res.status).toBe(404);   // sio 403 — usifichue uwepo
});
```

## 21.3 Client — Testi

| Aina | Zana | Kipimo |
|---|---|---|
| Unit | `kotlin.test` | Use cases (hesabu, validation) |
| State | Turbine | ViewModel flows |
| DB | SQLDelight in-memory | DAOs, migrations |
| Sync | Mock engine | Push/pull, conflicts |
| UI | Compose test | Onboarding, POS flow |
| Screenshot | Paparazzi/Roborazzi | Regressions za theme |

## 21.4 QA ya Kifaa

| Kifaa | Kwa nini |
|---|---|
| Android 8 (2GB RAM) | Kikomo cha chini |
| Android 14 (high-end) | Kawaida |
| iPhone SE (ndogo) | Layout |
| Tablet 10" | POS ya meza |
| Network 2G/edge | Offline |
| Network 0 (airplane) | Offline kamili |

## 21.5 Kabla ya Kutolewa (Checklist)

- [ ] `pnpm typecheck` + `pnpm test` zote zinaPITA
- [ ] Migration inaendelea bila data loss
- [ ] Swagger ina update
- [ ] Tenant isolation tests zinaPITA
- [ ] i18n: hakuna string hardcoded
- [ ] Contrast check (WCAG AA)
- [ ] Offline test kwenye kifaa halisi
- [ ] Rollback plan imeandikwa
- [ ] Backup ya DB imethibitishwa

---

# 22. DevOps, Deployment & DR

## 22.1 Mazingira

| Mazingira | Madhumuni | Data |
|---|---|---|
| `local` | Maendeleo | Docker, seeded |
| `staging` | Ukaguzi | Data ya mfano |
| `production` | Watumiaji | Halisi |

## 22.2 Topology ya Uzalishaji

```
Cloudflare (DNS, WAF, cache, TLS)
        │
        ▼
   Load Balancer
        │
   ┌────┴────┐
   ▼         ▼
 API ×2   API ×3   (containers, stateless)
   │         │
   └────┬────┘
        ▼
   PgBouncer
        │
   ┌────┴──────────┬────────────┐
   ▼               ▼            ▼
Postgres       Postgres      Redis
primary        replica       (cache + queue)
   │
   └── WAL → S3 (PITR)
```

## 22.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
on: [pull_request, push]

jobs:
  backend:
    - pnpm install --frozen-lockfile
    - pnpm typecheck
    - pnpm lint
    - docker compose up -d postgres redis    # services
    - pnpm prisma migrate deploy
    - pnpm test --coverage
    - pnpm build

  security:
    - pnpm audit --audit-level=high
    - trivy image scan

  deploy:
    if: branch == main
    - build & push image (tag = git sha)
    - run migrations (job tofauti, kabla ya deploy)
    - rolling deploy (max 1 unavailable)
    - smoke test /v1/health/ready
    - auto-rollback kama smoke test inashindikana
```

**Kanuni:**
1. Migrations ziende **kabla** ya code mpya (backward-compatible).
2. Deploy ni **rolling**, hakuna downtime.
3. Kila release ina tag + changelog.
4. Rollback = deploy ya image ya awali (dakika 2).

## 22.4 Observability

| Tabaka | Zana | Kipimo |
|---|---|---|
| Logs | pino → Loki | Structured JSON, `requestId` |
| Metrics | Prometheus → Grafana | RPS, p95, error rate, pool |
| Traces | OpenTelemetry | Request → DB → queue |
| Errors | Sentry | Stack + release + user (hashed) |
| Uptime | Better Stack | `/health` kila dakika |
| DB | pg_stat_statements | Slow queries > 200ms |

### 22.4.1 Alerts (lazima)
| Alert | Kizingiti | Hatua |
|---|---|---|
| API error rate | > 2% kwa dakika 5 | Page on-call |
| API p95 | > 800ms kwa dakika 10 | Warn |
| DB connections | > 80% ya pool | Warn |
| Queue backlog | > 1,000 jobs | Warn |
| Sync failure rate | > 1% | Warn |
| Disk | > 80% | Warn |
| Webhook failures | > 5 mfululizo | Page |

## 22.5 Backup & DR

| Kipengele | Sera |
|---|---|
| **PITR** | WAL archives → S3, RPO **5 dakika** |
| **Snapshot** | Kila siku 02:00 EAT, hifadhi siku 30 |
| **Snapshot ya wiki** | Hifadhi miezi 12 |
| **RTO** | ≤ 2 saa |
| **Jaribio la restore** | Kila mwezi (staging) |
| **Backups za mtumiaji** | Export ya JSON inapatikana kila wakati |

**Hakuna backup = hakuna biashara.** Jaribio la restore ni sehemu ya DoD.

## 22.6 Gharama (makadirio, 50,000 biashara)

| Kipengele | Ukubwa | /mwezi |
|---|---|---|
| API (2–4 vCPU) | 2 instances | $60 |
| Postgres (managed) | 4 vCPU / 16GB | $120 |
| Redis | 1GB | $20 |
| S3 + CDN | 500GB | $25 |
| Monitoring | — | $30 |
| **Jumla** | | **≈ $255** |

Revenue @ 8% conversion × 25,000 TZS ≈ **$12,000/mwezi** → margin nzuri sana.

---

# 23. Support & Ops Runbook

## 23.1 Njia za Msaada
| Njia | Wakati |
|---|---|
| WhatsApp (Biashara) | 08:00–20:00 EAT |
| Simu | 09:00–18:00 EAT |
| Email | Saa 24 |
| Chat ndani ya app | Phase 4 |

## 23.2 Maswali Yanayoulizwa Mara kwa Mara (kwa wateja)

| Swali | Jibu |
|---|---|
| "Data yangu iko wapi?" | `Mipangilio → Backup → Pakua data` |
| "Nimesahau password" | Login → `Sahau password` → SMS |
| "Muuzaji hawezi kuingia" | Angalia PIN + `isActive` + shop assignment |
| "Risiti haichapishwi" | Angalia printa + tumia `Hifadhi PDF` |
| "Nimeuza vibaya" | `Mauzo` → chagua → `Rudisha` (refund) |
| "Stock hailingani" | `Bidhaa` → `Rekebisha stock` → sababu `Hesabu` |

## 23.3 Runbook za Kiufundi

| Tatizo | Ukaguzi | Suluhisho |
|---|---|---|
| API 5xx | Sentry + logs | Rollback |
| DB slow | `pg_stat_activity` | Kill query + index |
| Queue imekwama | BullMQ dashboard | Restart worker |
| Sync inashindikana | `SyncOperation.status` | Replay batch |
| Webhook Snippe | Logs + signature | Retry kutoka dashboard |
| Disk full | `df -h` | Archive logs + expand |

## 23.4 Msaada wa Ndani (Admin)
- `GET /admin/businesses?q=` — tafuta biashara
- `POST /admin/businesses/:id/impersonate` — ingia kama (audit-logged, saa 1)
- `POST /admin/subscriptions/:id/extend` — ongeza siku
- `GET /admin/sync-issues` — migongano inayojirudia

---

# 24. Viambatisho

## A. Design Tokens (JSON)

```json
{
  "color": {
    "brand": {
      "deep":   "#0B37A1",
      "primary":"#0269E9",
      "cyan":   "#0A9CBF",
      "green":  "#16A760",
      "lime":   "#73D31C"
    },
    "blue": {"50":"#EAF1FF","100":"#D3E2FF","200":"#A8C6FF","300":"#7AA7FB",
             "400":"#3D82F2","500":"#0269E9","600":"#085DC0","700":"#0B37A1",
             "800":"#0A2E86","900":"#072B7A"},
    "cyan": {"100":"#D6F4FA","300":"#4FCBE4","500":"#0A9CBF","700":"#018E9F"},
    "green":{"100":"#D5F5E3","300":"#5FD98E","500":"#16A760","600":"#0E8A50"},
    "semantic": {"success":"#16A760","warning":"#F59E0B","danger":"#DC2626","info":"#0A9CBF"},
    "light": {"bg":"#F5F7FB","surface":"#FFFFFF","surface2":"#EEF2FA","border":"#E2E8F4",
              "textPrimary":"#0B1220","textSecondary":"#4A5568","textMuted":"#8A94A6"},
    "dark":  {"bg":"#080D18","surface":"#111A2B","surface2":"#182339","border":"#22304A",
              "textPrimary":"#F2F5FA","textSecondary":"#A8B4C8","textMuted":"#6E7C93"}
  },
  "gradient": {
    "brand":   ["#0B37A1", "#0269E9", "#0A9CBF", "#16A760"],
    "primary": ["#0269E9", "#0B37A1"],
    "success": ["#16A760", "#0A9CBF"]
  },
  "radius": {"sm":8,"md":12,"lg":16,"xl":20,"2xl":24,"full":999},
  "space":  [4,8,12,16,20,24,32,40,48],
  "shadow": {
    "sm": "0 1px 2px rgba(11,18,32,.06)",
    "md": "0 4px 12px rgba(11,18,32,.08)",
    "lg": "0 8px 24px rgba(11,18,32,.10)"
  },
  "font": {
    "display": "Plus Jakarta Sans",
    "body": "Inter",
    "mono": "JetBrains Mono"
  }
}
```

## B. Error Codes

| Code | HTTP | Maana |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Input si sahihi |
| `UNAUTHENTICATED` | 401 | Token haipo/imeisha |
| `FORBIDDEN` | 403 | Hana ruhusa |
| `NOT_FOUND` | 404 | Haipo |
| `CONFLICT` | 409 | Version conflict / duplicate |
| `INSUFFICIENT_STOCK` | 409 | Stock haitoshi |
| `SHOP_LIMIT_REACHED` | 402 | Plan imefikia kikomo |
| `SUBSCRIPTION_EXPIRED` | 402 | Subscription imeisha |
| `IDEMPOTENCY_REPLAY` | 200 | Op ilishafanyika (return previous) |
| `RATE_LIMITED` | 429 | Muda mwingi |
| `PAYMENT_FAILED` | 402 | Malipo hayakufanikiwa |
| `SYNC_CONFLICT` | 409 | Server-wins, maelezo kwenye meta |
| `INTERNAL` | 500 | Hitilafu ya server |

## C. Marejeleo

- Uchambuzi wa FastaPro: [`docs/01-fastapro-reference-analysis.md`](docs/01-fastapro-reference-analysis.md)
- Picha za skrini za FastaPro: `fasta-pro-docs/screens/`
- APK na disassembly: `_fasta_capture/`
- Backend inayofanya kazi: [`apps/backend/README.md`](apps/backend/README.md)
- Palette ya brand: [`docs/assets/myboke-palette.png`](docs/assets/myboke-palette.png)

## D. Vyanzo vya Kisheria

| Sheria | Kiungo |
|---|---|
| PDPA 2022 | <https://www.tcratz.go.tz> |
| TRA — VAT & EFD | <https://www.tra.go.tz> |
| Electronic Transactions Act 2015 | <https://www.tcratz.go.tz> |

> **Tahadhari:** hii ni tafsiri ya kiufundi, sio ushauri wa kisheria. Kabla ya kuzindua kwa biashara za VAT, wasiliana na mwanasheria wa Tanzania.

---

**Mwisho wa nyaraka.**
Toleo: **v1.1** · 1 Novemba 2026
Mabadiliko ya v1.1: hali za skrini (§7.5), onboarding ya kina (§7.6), uzingatiaji wa sheria (§17), vifaa na ESC/POS (§18), import/export (§19), telemetry (§20), testing (§21), DevOps na DR (§22), runbook (§23).
