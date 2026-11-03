# Indeii Biashara vs MyBoke — Benchmark ya UI/UX na Features

> Chanzo: simu halisi **Pixel 7** (`34271FDH2006TP`), app `com.bukurutechs.indeii` (Indeii Biashara, Flutter),
> APK `base.apk` + `split_config.*` (9.2 MB), `libapp.so` strings, `uiautomator` dumps za skrini zinazofikiwa
> bila kuingia (language picker, onboarding, login, register), na tovuti `indeii.com`.
> Tarehe: 2026-11-02.

---

## 1. Kile tulichokiona kwa macho (skrini halisi)

Indeii ina **FLAG_SECURE** — `adb screencap` inarudisha picha nyeupe tupu kwa skrini zake zote, hivyo
tulitumia `uiautomator dump` (text + bounds) kupata muundo kamili wa skrini.

| Skrini | Yaliyomo | Maoni |
|---|---|---|
| **Language picker** | `Choose language` → **English**, **Kiswahili** pekee | **Lugha 2 pekee.** MyBoke itakuwa na **5** |
| **Onboarding / splash** | `Run your business with clarity` · `Track sales, expenses, purchases, debts, profit, loss, stock, customer` · `Login` · `Join now` | Splash moja tuli; hakuna animation inayoonekana kwenye dump |
| **Login** | `Login to Indeii` · `To get started now, please enter your credentials` · `+255` (country picker) · `Forgot Password?` · `Log in` · `Don't have an account? Register here` | Phone-first; **country code picker** |
| **Register** | `Register with Indeii` · `Grow your business digitally` · `+255` · `Continue` · `I already have an account, log in` | **Hatua nyingi** (phone → OTP → taarifa) |

Brand ya Indeii: kijani `#01994E` + `#101a19`. MyBoke: bluu `#071B4D → #0B37A1 → #0269E9 → #0A9CBF`.

---

## 2. Ramani kamili ya modules za Indeii (kutoka `libapp.so`)

`/ui/pages/*` na `/core/*` zinaonyesha modules **48**:

**Msingi:** auth (login, phone_registration, registration, otp, forgot/reset password, switch_company,
session_manager, secure_token_storage), onboarding (language_picker), home (+ `yearly_review`, `add_branch`),
branches, warehouse, notifications, support, whats_new, tutorials (`Learn Indeii`), subscriptions.

**Uendeshaji:** mauzo/POS (`uza_bidhaa`, `receipt`, **offline POS sync**, `offline_sale_detail`),
bidhaa (`ongeza_bidhaa`, `sajili_bidhaa`, `edit_bidhaa`, `edit_huduma` huduma, `ongeza_kundi`,
**bulk inventory**, `adjust_stock_page`, `stock_transfer_page`, `dispose_bidhaa`, `delete_products_page`),
**purchase orders** (+ `purchase_quantity_approvals`), **supplier returns/refunds**, suppliers (`supplier_360`,
performance, statement), wateja (`client_360`), madeni (`debts`, `debt_client`, `opening_debt_*`),
matumizi (`rekodi_matamizi`, attachments), **documents** (quote/delivery/invoice + PDF + numbering),
**notebook** (memos), **goals**, **haba_haba** (savings/chama), **personal_space** (matumizi ya nyumbani),
**assets/leases**, **shift_closing** (kufunga zamu), **returns**, **recycle_bin** (kurejesha vilivyofutwa),
**parties** (mahusiano), **payments** (history, methods, reconciliation), **maintenance** (delete records).

**Ripoti (13):** mapato, matumizi, manunuzi, mauzo, sales performance, staff performance, top customers,
top products, stock movement v2, inventory aging, inventory health, product profitability, owner funding,
productions, transfers, disposal, prescriptions (duka la dawa), summary story.

**Analytics:** analytics_home, analytics_profit, analytics_sales, business_clarity, business_money
(+ transfer), **capital_health**, payment method contribution, payment method reconciliation.

**Ukuaji:** rewards (achievements, marketplace, spend), marketplace (addons), **shoppe** (duka la mtandaoni:
dashboard, orders, products, preview, quick setup), **campaign** (SMS: send message, buy credits, sender names),
**BNPL** (buy now pay later), referrals.

**Kilimo & mifugo:** kilimo (farms, blocks, nurseries, crop cycles, growth, insight report, expenses),
ufugaji (lifecycle, records, insight report).

**Timu:** team, add/edit, roles, role details, staff_360.

**Mipangilio:** account, **app_lock (PIN + biometrics)**, company, advanced, payment methods, country config.

---

## 3. "AI" ya Indeii ni nini hasa?

Hakuna LLM/chatbot kwenye binary (hakuna `openai`, `gemini`, `llm`, `gpt`). Walichonacho ni
**rules-based advisory**:

- `Why Indeii recommends this` — kila pendekezo linaeleza sababu (explainability).
- `Business insights`, `Business health context`, `Needs attention`.
- `Capital Health` (operations / growth / safety reserves), `RecommendedExposureIndex`.
- `Inventory Health`, `Recommended reorder:`, `Inventory aging`.
- `Summary story page` — ripoti kama hadithi.
- `ProfitInsight`, `ClientInsights`, `Staff360Insight`, `Restaurant Insights`.

**MyBoke ipo mbele hapa:** ina **Assistant ya LLM** (`POST /assistant`) inayojibu maswali ya biashara
kwa lugha ya mtumiaji — Indeii haina chatbot.

---

## 4. Jedwali la ulinganisho

| Uwezo | Indeii | MyBoke (sasa) | Pengo / Hatua |
|---|---|---|---|
| Lugha | 2 (EN, SW) | 2 (SW, EN) | **Nyongeza: ES, FR, AR + RTL** |
| Splash / onboarding | 1 splash tuli + onboarding | Splash + onboarding hatua 4 | **Splash mpya ya animation + hali ya kikao** |
| Login | Simu + namba ya nchi, forgot password | Simu/email + password | Ongeza country code picker + forgot |
| Register | Hatua nyingi + OTP ya SMS | Hatua moja | Ongeza OTP (backend `auth/otp` ipo?) |
| App lock | PIN + biometrics | Hakuna | **Ongeza** (muhimu kwa faragha) |
| Multi-shop/branch | Branches + warehouse | Shops (multi-shop) | Sawa; warehouse haipo |
| POS | POS + offline sync + hold | POS + hold + offline | Sawa |
| Bidhaa | Bulk import + labels + variants + groups | Import, labels, variants, bundles | Sawa kwa kiasi |
| Purchase orders | Ndiyo | **Ndiyo** (`purchase-orders`) | Sawa |
| Suppliers | supplier 360 + statement + returns | Suppliers + payments + ledger | Sawa |
| Wateja | client_360 | Orodha + madeni; hakuna ukurasa wa 360 | **Ongeza Client 360** |
| Madeni | Madeni + opening debt | Madeni + malipo + overdue | Sawa |
| Matumizi | Matumizi + attachments | Matumizi + recurring | Sawa |
| Ripoti | 13 ripoti | 16 endpoints (cash-flow, break-even, budgets, stock…) | **Tunazidi kwa cash-flow/break-even/budgets** |
| Analytics | capital health, exposure, reconciliation | analytics module | Ongeza "business health" rahisi |
| Documents | Quote/delivery/invoice + numbering | Ankara (invoice) + PDF + templates | Ongeza quote/delivery note |
| Notebook / goals | Ndiyo | Hakuna | Ongeza baadaye |
| Haba Haba / personal space | Ndiyo | Hakuna | Si kipaumbele |
| Rewards | Achievements + marketplace | BokeCoins + missions + streaks | Sawa (tunazidi kwa missions) |
| Online shop | Shoppe (dashboard+orders) | Hakuna | Baadaye |
| SMS campaigns | Ndiyo | Hakuna | Baadaye |
| BNPL | Ndiyo | Hakuna | Baadaye |
| Kilimo/mifugo | Ndiyo | Hakuna | Baadaye (niche) |
| AI assistant | Hakuna (rules tu) | **LLM Assistant** | **Tunazidi** |
| Offline | POS offline + sync | Offline mode + sync queue | Sawa |
| Backup/export | Documents + recycle bin | Backup/restore + exports (XLSX/CSV/JSON/PDF) | **Tunazidi** |
| Recycle bin | Ndiyo | Hakuna | Ongeza (soft delete ipo?) |

---

## 5. Mapungufu ya UX ya Indeii ambayo MyBoke inaweza kushinda

1. **Lugha 2 pekee** — MyBoke: 5 lugha + RTL Arabic.
2. **Hakuna chatbot** — MyBoke ina Assistant ya AI.
3. **Splash tuli** — fursa ya splash yenye brand motion.
4. **Register inahitaji OTP ya SMS** — MyBoke inaweza ruhusu `email` au `demo` (haraka kuanza).
5. **Ripoti nyingi zimefichwa kwenye orodha ndefu** — MyBoke: dashibodi moja yenye vichujio vya kipindi.
6. **Bei/plan** — hakuna uhakika; MyBoke ina plan/free tier.

---

## 6. Kile tutakachotekeleza mara moja (kwa mpango huu)

1. **Lugha 5 + RTL** — `Lang.EN, SW, ES, FR, AR`, kila string imetafsiriwa (222 za UI + 40 za ankara).
2. **Language picker** — sheet/dropdown yenye jina la asili (`English`, `Español`, `Français`, `العربية`,
   `Kiswahili`), flag, na uchaguzi wa papo hapo.
3. **Splash screen mpya** — gradient inayotembea, logo reveal, shimmer, na transition laini.
4. **Login/Register** — country code picker, kuonyesha/ficha password, uimara wa password,
   hali za loading/error, na ujumbe wa makosa kwa lugha iliyochaguliwa.
5. **Client 360** — ukurasa wa mteja: jumla ya mauzo, madeni, historia, pointi.
6. **App lock** — PIN ya tarakimu 4 (na biometric pale inapowezekana).


---

## 7. Hali ya utekelezaji (3 Nov 2026)

| Kipengele cha mpango (§6) | Hali | Ushahidi |
|---|---|---|
| Lugha 5 + RTL | ✅ | `Lang` SW/EN/ES/FR/AR · Auth 51 keys × 5 · 0 missing |
| Language picker | ✅ | Onboarding / Auth / More · `LanguagePickerOverlay` |
| Splash mpya | ✅ | `SplashScreen` + `holdSplash(1600)` · Pixel 7 |
| Login/Register | ✅ | Country picker 13 · strength · SMS reset 8-char · `PhoneTest` 9/9 |
| Client 360 | ✅ | `CustomerDetailScreen` · SW/EN/AR-RTL |
| App lock (PIN) | ✅ | `PinLockScreen` · cold start + background · Pixel 7 |
| Maduka: hours · holidays · QR | ✅ | `ShopScheduleTest` 3/3 · `ShopScreenshotTest` 1/1 |
| Desktop tests | ✅ | **32/32** passed |
| Android debug build | ✅ | `assembleDebug` BUILD SUCCESSFUL |

**Hitimisho:** MyBoke sasa inazidi Indeii kwenye lugha, splash, app lock, Client 360, AI assistant, na saa/QR za duka.
