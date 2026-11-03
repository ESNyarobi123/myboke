# FastaPro — Nyaraka Kamili ya App (Uchambuzi wa Kina)

> **Nyaraka hii imeandaliwa kwa uchambuzi wa moja kwa moja wa app halisi kwenye simu (Pixel 7), pamoja na uchambuzi wa kiufundi wa APK/bytecode.**
> Lengo: kuelewa **logic, features, mpangilio, flow, functions, results na goals** za FastaPro kabla ya kuunda app yako.

| Kipengele | Thamani |
|---|---|
| Jina la app | **FastaPro** (jina la Play Store: *Fasta Pro* / *Fasta*) |
| Package | `com.jamalmteri.Fasta` |
| Version | **2.3.2** (versionCode 53) |
| Developer | `jamalmteri` |
| Ilisakinishwa | 2026-10-26 (kutoka Google Play) |
| Backend | Firebase (`dukafasta-3fe3f`) |
| Lugha kuu | Kiswahili (na Kiingereza kwa baadhi ya skrini) |
| Aina | Business / POS / Bookkeeping kwa wafanyabiashara wadogo (Tanzania) |
| Malipo | Snippe (M-Pesa, Airtel, Yas, Halotel) |
| Msaada | WhatsApp +255 684 728 971 |

---

## 1. Muhtasari (Executive Summary)

**FastaPro** ni app ya **usimamizi wa biashara ndogo** (duka) inayokusanya pamoja:

1. **POS / Uuzaji** — kuuza haraka, risiti, punguzo, madeni ya mteja  
2. **Bidhaa & Stock** — bidhaa, barcode, expiry, alert ya stock  
3. **Wateja** — rejista, historia, madeni ya mteja, "win-back"  
4. **Gharama** — matumizi ya kila siku kwa category  
5. **Madeni** — "Owe Me" (wanaonidai) na "I Owe" (ninaowadai)  
6. **Ripoti & Faida** — mapato, faida, faida halisi, margin  
7. **Maduka mengi** — multi-shop kwa subscription  
8. **Wauzaji (Sellers)** — wafanyakazi wenye login yao + commission  
9. **AI Sales Coach** — "misheni" za kila siku za kuongeza mauzo  
10. **DukaCoins** — sarafu za motisha (earn & redeem)  
11. **B2B Demand Intelligence** — data ya bidhaa zinazotafutwa na wateja  
12. **Partner/Referral Program** — mfumo wa commission wa wawakilishi  
13. **Admin Dashboard** — kwa timu ya Fasta (platform admin)  
14. **Offline-first sync** — mauzo yanahifadhiwa mtandaoni baadaye

### Goals za app (kwa nini ipo)
- Kumsaidia mfanyabiashara **kujua faida halisi**, sio tu mauzo
- Kuondoa "kuandika kwenye daftari" → data ya kidijitali
- Kumpa **msukumo wa kila siku** (misheni + coins) badala ya ripoti kavu
- Kukusanya **data ya mahitaji ya soko (demand)** na kuunganisha suppliers (B2B)
- Kufanya pesa kupitia **subscription** (freemium: duka 1 bure, zaidi ya hapo unalipia)

### Results (kile kinachopimwa ndani ya app)
| Metric | Maana |
|---|---|
| Total Sales / Mauzo | Jumla ya mauzo (revenue) |
| Profit After Discount | Faida baada ya punguzo |
| Net Profit (Faida Halisi) | Faida baada ya punguzo − matumizi |
| Profit Margin % | Faida ÷ mauzo |
| Items Sold | Idadi ya bidhaa zilizouzwa |
| Stock Value | Thamani ya stock iliyopo |
| Stock Health % | Asilimia ya stock iliyo salama |
| Low Stock / Out of Stock | Bidhaa zinazoisha / zilizoisha |
| Total Owed to me / I owe | Madeni (receivable / payable) |
| Sales waiting to sync | Mauzo yanayosubiri sync |
| DukaCoins balance | Sarafu zilizopatikana |

---

## 2. Tech Stack (Uchambuzi wa Kiufundi)

Uchambuzi wa APK (`base.apk`, 23.9 MB) na bytecode ya Hermes ulibaini:

| Tabaka | Teknolojia |
|---|---|
| Framework | **Expo SDK 54** + React Native (New Architecture) |
| Router | **expo-router** (typed routes) |
| Engine | **Hermes** bytecode v96 — bundle 5.04 MB, **22,333 functions**, ~44,576 strings |
| Build | EAS Build (projectId `90d9f8f7-…`), **OTA updates** (`u.expo.dev`) |
| Auth/DB | **Firebase** (Auth + Firestore + Hosting `dukafasta-3fe3f.web.app`) |
| Storage local | AsyncStorage (session, cache, offline queue) |
| Malipo | **Snippe** (`initiateSnippeCheckout`, `checkSnippeSubscriptionStatus`) |
| Camera | expo-camera / ML Kit barcode scanning |
| Bluetooth | Thermal printer (ESC/POS) — `buildThermalReceiptEscPos` |
| Files | xlsx (SheetJS) kwa Excel import/export, PDF receipts |
| Sharing | react-native-share (WhatsApp, `wa.me`) |
| Deep link | scheme `myapp` |
| Android | minSdk 24, targetSdk 36, compileSdk 36, ProGuard + minify ON |

**Permissions zinazotumika:** INTERNET, ACCESS_NETWORK_STATE, CAMERA, BLUETOOTH (+CONNECT/SCAN), ACCESS_FINE_LOCATION.  
**Zimezuiwa:** READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_* (app haisomi gallery).

**Modules muhimu zilizopatikana kwenye build:**
`HomeScreen, CompleteSaleScreen, SaleReceiptModal, EditSaleModal, AddProductScreen, ProductScreen, BarcodeScannerModal, UnitTypeModal, CustomerScreen, CustomerListScreen, CustomerRegistrationModal, AddExpenseScreen, DebtsScreen, PaymentModal, ProfitScreen, ReportScreen, SalesReportScreen, SellersScreen, SellerDashboard, SellerExpenseHistoryScreen, ManageShopsScreen, ShopSelectorModal, NotificationsScreen, EnhancedAlertScreen, AnalyticsModal, DukaCoinsScreen, PosterGeneratorScreen, Sales Coach (mission cards), AdminScreen, AdminUserDetailModal, ShopDemandLeadsModal, LostSaleModal, RetentionMessageModal, PromotionImpactCard, ThermalPrinterPickerModal, ForceUpdateModal, RateUsModal, DeleteConfirmModal, SnippePayModal, OfflineSyncBanner, LanguageModal`

---

## 3. Roles & Ruhusa (Permissions Model)

App ina **tabaka 4 za watumiaji**:

| Role | Anaweza | Anaona |
|---|---|---|
| **Owner (Mmiliki)** | Kila kitu: maduka, bidhaa, mauzo, gharama, madeni, wateja, wauzaji, ripoti, subscription | Maduka yote aliyonayo |
| **Seller (Muuzaji)** | Kuuza, kuongeza gharama zake, kuona mauzo yake | Duka alilopewa tu (`SellerOwnerAccessGate` inazuia mengine) |
| **Partner** | Kusajili wateja kwa referral code, kuona commission | Dashboard yake ya commission |
| **Admin (Fasta)** | Dashboard ya platform: merchants, partners, demand reports, subscriptions, commissions | Data ya platform (kwa ridhaa ya mfumo) |

**Ushahidi wa skrini:** `Yuni • Mmiliki` (Customers), `Yuni • Owner` (Debts), `Yuni (Mwenye Duka)` (kwenye sale), `Karibu Admin!`, `Seller session restored without seller claims`.

**Seller login:** Owner anaunda seller (jina + simu) → app inazalisha **password** → owner anashare: *"Share this password with the seller to login"*. Seller anaingia na simu/password.

---

## 4. Ramani ya App (Navigation Map)

```
FastaPro
├── SPLASH / AUTH
│   ├── Sign In (email + password, Firebase)
│   ├── Sign Up (email/password + referral code optional)
│   ├── Complete Profile (jina + simu) — "Duka lako tayari limesajiliwa"
│   ├── Seller Login (password ya seller)
│   └── Forgot Password (reCAPTCHA)
│
├── ONBOARDING / SHELL
│   └── Select Shop (ShopSelectorModal) → New Shop → Premium paywall
│
├── TAB 1: NYUMBANI (Home)
│   ├── Header: FastaPro | 🌙 (haifanyi kazi) | 🔔 (haifanyi kazi) | SW/EN
│   ├── Salamu + tarehe
│   ├── Shop switcher ("Yuni — Badili")
│   ├── VITENDO VYA HARAKA (Quick Actions)
│   │   ├── Uza (Sell) ──────────────► Complete Sale
│   │   ├── Wateja (Customers) ──────► Customer List
│   │   ├── Gharama (Expenses) ──────► Add Expense
│   │   ├── Mauzo (Sales) ───────────► Sales Report
│   │   ├── Madeni (Debts) ──────────► Debts Screen
│   │   └── Faida (Profit) ──────────► Business Profit
│   └── HUDUMA MUHIMU (Core Services)
│       ├── Bidhaa (Products) ───────► My Products → Add Product
│       ├── Msaidizi wa Mauzo ───────► Sales Coach (missions sheet)
│       ├── Maduka (Shops) ──────────► My Shops → Premium
│       └── Takwimu (Analytics) ─────► Shop Analytics → DukaCoins
│
├── TAB 2: RIPOTI (Reports)
│   └── Taarifa ya Mapato (Income Report)
│       ├── Month navigator ‹ Novemba 2026 ›
│       ├── Duka Moja / Maduka Yote
│       ├── Shop dropdown
│       ├── KPI: Jumla ya Mauzo | Matumizi | Faida Baada ya Punguzo
│       ├── Card ya mwezi: Mauzo / Matumizi / Faida
│       ├── Faida Halisi (Faida) + maelezo ya formula
│       └── Matumizi ya Mwezi (list)
│
├── TAB 3: WAUZAJI (Sellers)
│   └── Manage Sellers: chagua duka, jina, simu → Add Seller
│
├── TAB 4: TAARIFA (Alerts)
│   └── Taarifa za Stock: search + filters
│       [Zote] [Stock Ndogo] [Inaisha] [Imekwisha]
│
└── TAB 5: PROFAILI (Profile)
    ├── Habari / Jina / "Karibu tena"
    ├── Biashara Yangu: Jina, Kampuni, Simu, Barua Pepe
    ├── Haraka: Rekebisha Wasifu | Badili Lugha | Ondoka
    └── USALAMA WA AKAUNTI: Ondoa Akaunti
```

---

## 5. Mpangilio wa Skrini kwa Skrini

### 5.1 Nyumbani (Home)

![Home Kiswahili](fasta-pro-docs/screens/01-home-kiswahili.png)
![Home English](fasta-pro-docs/screens/02-home-english.png)

**Elements:**
| # | Element | Maelezo |
|---|---|---|
| 1 | `FastaPro` logo (top-left) | Brand text |
| 2 | Ikoni ya mwezi 🌙 | Inaonekana clickable lakini **haifanyi kazi** |
| 3 | Ikoni ya bell 🔔 | Inaonekana clickable lakini **haifanyi kazi** |
| 4 | `SW` / `EN` pill | Hubadilisha lugha (baadhi ya skrini zinahitaji restart) |
| 5 | `Habari za Asubuhi, Yuni 👋` | Salamu kwa wakati (asubuhi/mchana/jioni) + jina |
| 6 | `Jumapili, 1/11/2026` | Tarehe ya leo |
| 7 | Shop card: `Yuni` + `Badili` | Inafungua ShopSelectorModal |
| 8 | `VITENDO VYA HARAKA` | Grid 2×3 ya cards |
| 9 | `HUDUMA MUHIMU` | List ya cards 4 |
| 10 | Bottom nav | Nyumbani • Ripoti • Wauzaji • Taarifa • Profaili |

**Cards za Quick Actions:** Uza (Uza haraka) · Wateja (Simamia wateja) · Gharama (Fuatilia gharama) · Mauzo (Angalia mauzo) · Madeni (Simamia madeni) · Faida (Angalia faida)

**Cards za Core Services:** Bidhaa (Simamia bidhaa) · Msaidizi wa Mauzo (Misheni za leo — hiari) · Maduka (Simamia maduka) · Takwimu (Angalia takwimu)

> **Note:** Hakuna dashboard ya namba (mauzo ya leo n.k.) kwenye Home — Home ni "launcher" tu. Namba zote ziko kwenye Ripoti/Takwimu. Hii ni **fursa ya kuboresha** kwenye app yako.

---

### 5.2 Uza / Complete Sale (POS)

![Complete Sale](fasta-pro-docs/screens/03-complete-sale.png)

**Header:** ← Back · `Complete Sale` · jina la duka (`Yuni`) · `SW | EN`

**Chips 6 (mfumo wa haraka):**
| Chip | Icon | Kazi |
|---|---|---|
| 1 | `󰐙` (discount) | **Punguzo / Discount** — thamani `—` ikiwa hakuna |
| 2 | `󰁲` (money) | **Kiasi / Amount** — thamani `—` |
| 3 | `Customer Ask` | **Ombi la Mteja** — mteja aliomba bidhaa usiyonayo (inapata DukaCoins + demand data) |
| 4 | `Yuni (Mwenye Duka)` | **Seller** anayefanya mauzo |
| 5 | `Cash Payment` | **Njia ya malipo** (Cash / M-Pesa n.k.) |
| 6 | `Leo` | **Tarehe** ya mauzo |

**Cart:**
- `Items to Sell (0)` + ikoni ya kuongeza bidhaa
- Empty state: `Empty Cart` / `Add products to start selling`

**Flow ya kuuza (kutoka UI + build):**
```
1. Bonyeza "Items to Sell" / + → chagua bidhaa (search / barcode scan)
2. Kila item: quantity, bei, (unit type: pcs/kg/l/m/pkt)
3. Weka discount (kiasi au asilimia) — "discountTooHigh" inazuia punguzo kupita kiasi
4. Chagua mteja (au "Customer Ask" kama hana bidhaa)
5. Chagua seller (default = mwenye duka)
6. Chagua njia ya malipo (Cash Payment, n.k.)
7. Chagua tarehe (Leo default)
8. Hifadhi mauzo → stock inapungua (applyLocalStockAfterSale)
9. Risiti (SaleReceiptModal) → Share WhatsApp / Print thermal / PDF
10. Kama offline → "saleQueuedOffline" (inasubiri sync)
```

**Logic ndani ya sale:**
- `buildSaleRecord`, `buildSaleUpdates`, `buildEditStockDeltas`, `buildStockRestoreUpdates`
- `calculateProfitFromSale`, `calculateDiscountImpact`
- Kufuta mauzo → bidhaa **zinarudishwa stock** (`buildStockRestoreUpdates`) kwa uthibitisho: *"Are you sure you want to delete this sale?"* na *"N unit(s) will be returned to stock"*
- `EditSaleModal` — kubadilisha mauzo (stock deltas zinarekebishwa)

---

### 5.3 Bidhaa (Products)

![Products](fasta-pro-docs/screens/13-bidhaa-products.png)
![Add Product](fasta-pro-docs/screens/14-add-product.png)

**My Products:**
- Header: ← · `My Products` · `Total: N products` · lugha · `+`
- Shop context: `Yuni`
- Search: `Search products...`
- Empty: `No products` / `Start adding your products`

**Add Product — fields:**
| Field | Lazima? | Maelezo |
|---|---|---|
| Product Name | ✔ | `Enter product name` |
| Product Barcode | ✖ | `Scan or type barcode here` + kitufe cha Scanner |
| Product Category | ✔ | `Example: Food, Clothing, Electronics` |
| Unit Type | ✔ | Default `Pieces / pcs` — modal ya units |
| Buying Price | ✔ | 0 |
| Selling Price | ✔ | 0 |
| Quantity | ✔ | `Enter product quantity` |
| Product Description | ✖ | text area |
| Stock Alert Level | ✖ | `Default: - pcs`, `10% ya idadi ya awali` |
| Product Expiry | ✖ | Toggle `Does this product have an expiry date?` → expiry date |

**Bottom actions:** `Add Product` · `Download Excel Template` · `Upload Excel` · `Clear All`
**Maelezo:** *"For Excel upload, use headers: Product Name, Buying Price, Selling Price, Stock, Barcode."*

**Unit Types (modal):**
| Unit | Symbol | Decimals? |
|---|---|---|
| Pieces | pcs | Hapana (whole numbers) |
| Kilograms | kg | Ndiyo |
| Grams | g | Ndiyo |
| Liters | l | Ndiyo |
| Meters | m | Ndiyo |
| Packets | pkt | Hapana |

![Unit Type](fasta-pro-docs/screens/16-unit-type.png)

**Validation zilizopatikana:** `Bei ya kununua si sahihi`, `Bei ya kuuza si sahihi`, `Expiry date must be in the future`, `Bidhaa haijapatikana`, duplicate check (`buildProductDedupKey`, `Error checking product existence`).

**Price change:** App ina flow ya `Mabadiliko ya Bei` (bei ya zamani / mpya, `Bei imeongezeka` / `Bei imeshuka`), `Bei Mpya ya Kuinunua`, `Badili Bei ya Kuuza` — inaonekana kama feature ya kurekodi history ya mabadiliko ya bei.

---

### 5.4 Wateja (Customers)

![Customers](fasta-pro-docs/screens/06-wateja-customers.png)
![Add Customer](fasta-pro-docs/screens/07-add-customer.png)

- Header: ← · `Wateja` · `+`
- Context: `Yuni • Mmiliki`
- Search: `Tafuta mteja...`
- Empty: `Hakuna wateja waliopatikana`

**Ongeza Mteja (modal):** `Jina la Mteja` · `Namba ya Simu` · `Ghairi` | `Hifadhi`

**Features za ziada (kutoka build):**
- `Hariri Mteja` / `Futa Mteja`
- **Historia ya Malipo** (`payment history`) — malipo ya madeni
- **Customer credit / balance** (`customerCurrentDebt`, `customerBalance`)
- **Rudisha Mteja (Win-Back)** — kutuma ujumbe wa WhatsApp kwa mteja aliyepotea (`buildWinBackMessage`, `Rudisha Mteja WhatsApp`)
- Dedup ya wateja (`buildCustomerDedupKey`)

---

### 5.5 Gharama (Expenses)

![Add Expense](fasta-pro-docs/screens/08-add-expense.png)

- Header: ← · `Add Expense` · `Record new expense` · lugha
- Shop: `Adding expense to: Yuni`
- **Expense Name** * — `e.g., Lunch expense`
- **Expense Amount** * — `0` + `TZS`
- **Category** * — grid: `Food` · `Transport` · `Bills` · `Shopping` · `Fees` · `Others` + custom text `Or write your custom category...`
- **Date** — default leo (date picker)
- **Additional Notes** — text area
- **Add Expense** button

> Gharama ndizo zinazoondolewa kwenye faida: `Net Profit = Profit After Discount − Expenses`.

---

### 5.6 Mauzo / Sales Report

![Sales Report](fasta-pro-docs/screens/09-sales-report.png)

- Header: ← · `Sales Report` · duka · `SW | EN`
- Date card: `Sunday, 1 November 2026` (date picker ya Android)
- `0 sales` · `SALES Tsh 0` · `PROFIT Tsh 0`
- Empty: `No sales` / `No sales recorded for this date.`
- Kila sale kwenye list: `SaleCard` (item name, qty, bei, faida) → kubonyeza inafungua risiti/maelezo

**Actions kwa sale moja:** `SaleReceiptModal` (risiti), `EditSaleModal`, delete (confirm + restock).

---

### 5.7 Madeni (Debts)

![Debts](fasta-pro-docs/screens/10-madeni-debts.png)
![Add Debt](fasta-pro-docs/screens/11-add-debt.png)

- Header: ← · `Debts` · `+`
- Context: `Yuni • Owner`
- Tabs: **`Owe Me`** (wanaonidai) | **`I Owe`** (ninaowadai)
- Search: `Search debts...`
- Totals: `Total owed to me` · `Total I owe`
- Empty: `No Debts` / `No debts have been added yet.`

**Add Debt (modal):** `Select Customer` · `Amount` · `Description` · `Save`

**Features za ziada:**
- `PaymentModal` — kurekodi malipo ya deni (`record payment`), `paidAmount`, `dueDate`
- **Kumbusha Madeni** (`buildDebtReminderMessage`) — ujumbe wa WhatsApp wenye ngazi:
  - *"…natumai uko salama. Kumbusho la upole: deni lako ni TSh …"*
  - *"…deni lako limefikia TSh …"*
  - *"…huu ni ukumbusho wa MWISHO: deni lako ni TSh …"*
- `Madeni Yaliyochelewa: Tsh …` (overdue)
- Uthibitisho: *"Ongeza nambari ya simu ya mteja kwanza kwenye ukurasa wa Madeni."*

---

### 5.8 Faida (Business Profit)

![Profit](fasta-pro-docs/screens/12-faida-profit.png)

- Header: ← · `Business Profit` · duka · 🌐
- **Filters:** `Day` · `Week` · `Month` · `Range`
- Date navigator: `‹ Today • Tap to change ›`
- **Total Profit** (kubwa) + `N% Profit Margin` + `N Sales Count`
- **Total Revenue** · **Items Sold**
- Chart area: `No Data` / `No sales for this period`

---

### 5.9 Ripoti (Income Report)

![Income Report](fasta-pro-docs/screens/21-ripoti-income-report.png)

- Header: ← · `Taarifa ya Mapato` · refresh ⟳ · 🌐 SW
- **Month navigator:** `‹ Novemba 2026 ›`
- **Toggle:** `Duka Moja` | `Maduka Yote`
- **Shop dropdown:** `Yuni`
- Period label: `Siku 7 Zilizopita`
- **KPI 3:** `Jumla ya Mauzo` · `Matumizi` · `Faida Baada ya Punguzo` (kila moja: `Hakuna shughuli` / `0 TZS`)
- **Card ya mwezi (Novemba 2026):** `Mauzo ya Mwezi` · `Matumizi ya Mwezi` · `Faida Baada ya Punguzo`
- **Faida Halisi (Faida)** — namba kubwa + maelezo: *"Faida Halisi Baada ya Punguzo - Matumizi"*
- **Matumizi ya Mwezi** — list ya gharama; empty: `Hakuna matumizi ya Novemba`

---

### 5.10 Takwimu (Shop Analytics)

![Analytics](fasta-pro-docs/screens/17-analytics.png)
![Charts](fasta-pro-docs/screens/18-analytics-charts.png)

- Header: ← · `Shop Analytics` · refresh ⟳ · lugha
- Toggle: `Select Single Shop` | `Show All Shops` + dropdown
- **Performance Analytics:** `Total Revenue` · `Total Profit` · `Total Expenses` · `Net Profit`
- **Requested Items This Month** + `N DukaCoins` + `Open Wallet →`
  - `Customers asked for these — consider restocking`
  - Empty: `No customer requests this month`
- **Real-Time Stock Value:** `Current Value` (`0 TZS`) · `Updated: 10:14:09 AM` · `Stock Health 0.0%` · `Low Stock N` · `Out of Stock N`
- **Compare with:** `Nov 1, 2026` (date compare picker)
- **Revenue Trend (Last 7 Days)** — bar chart Mon–Sun (axis 0.0 → 10.0)
- **Stock Flow** — chart; `No stock data for this date` + `Try Again`
- **Bottom:** `Download PDF` · `Recommendations` → modal (`• Increase product prices` + OK)

---

### 5.11 DukaCoins Wallet

![DukaCoins](fasta-pro-docs/screens/19-dukacoins-wallet.png)

- Header: ← · `DukaCoins Wallet` · duka · refresh
- **Your balance** + `0`
- `Earn coins by logging products customers asked for`
- **REDEEM DUKACOINS:**
  | Reward | Maelezo | Status |
  |---|---|---|
  | Upgrade with AI Pro | Available via Sales Coach → Promote Product | `Soon` |
  | Stock Discount | Vouchers with onboarded B2B suppliers | `Soon` |
  | Buy Bundle/Airtime | Coming soon | `Soon` |
- **EARN HISTORY** — `No transactions yet. Log a customer request to earn coins.`

**Types za transaction (kutoka build):** `DukaCoins — Earned` / `Umepata`, `DukaCoins — Redeemed` / `Imetumika`, `DukaCoins — Customer request:` / `Ombi la Mteja:`, `DukaCoins — AI Poster (Pro)`.

---

### 5.12 Msaidizi wa Mauzo (Sales Coach)

![Sales Coach](fasta-pro-docs/screens/20-sales-coach.png)

Bottom sheet: `Sales Coach` / `Today's missions — optional` / `Habari Yuni!` / `No new missions today. Keep up the good work!`

**Mission types zilizopatikana kwenye build:**
| Mission | Kazi |
|---|---|
| Promote Product | Ku-promote bidhaa inayouzwa vizuri / mpya (AI Poster) |
| Win Back Customer | Kumrudisha mteja aliyepotea (WhatsApp message) |
| Collect Debt | Kukumbusha deni la mteja |
| Price Change | Kushauri mabadiliko ya bei (bei imeshuka/imepanda) |
| Retention Message | Kutuma ujumbe kwa wateja |
| Restock / Demand | Kuongeza bidhaa zinazotafutwa |

**Uthibitisho wa logic:**
- `buildFallbackMissions`, `filterMissionsAgainstContext` (misheni inachujwa kwa data halisi)
- *"Taarifa za sasa haziendani na misheni hii. Rudi kwenye Msaidizi wa Mauzo na uchague hatua nyingine."*
- *"Mteja huyu hafai kwa misheni hii sasa (hakuna historia ya ununuzi au nambari ya simu)."*
- `buildCoachReasonText` — maelezo kwa nini misheni inapendekezwa

**Measurement loop (AI inapima matokeo):**
- *"After the promotion, sales were … units / siku 7"*
- *"After the message, the customer made …"*
- *"After the message, there were no new purchases in the next 7 days."*
- *"FastaPro itaonyesha matokeo baada ya siku 7."*
→ Hii ni **A/B impact tracking** (PromotionImpactCard, RetentionImpactCard, `buildImpactRecord`).

---

### 5.13 Maduka (My Shops) & Premium

![My Shops](fasta-pro-docs/screens/27-my-shops.png)
![Premium](fasta-pro-docs/screens/28-premium-paywall.png)

**My Shops:**
- Header: ← · `My Shops` · `+`
- Shop card: jina `Yuni` · `Active Shop` ✓ · `Created: 5 days ago`
- `Assigned Sellers:` → `No sellers assigned.`
- Shortcuts 4: `Products` · `Sales` · `Expenses` · `Reports`

**Shop Selector (modal):** `Select Shop` → shop + ✓ | `+ New Shop`

**Ukibonyeza `+ New Shop` ukiwa umefikia kikomo → Premium Paywall:**

| Plan | Bei / mwezi | Maduka |
|---|---|---|
| **Starter** | 10,000 TZS | 1 duka |
| **Growth** (Popular) | 25,000 TZS | 3 maduka |
| **Premium** | 50,000 TZS | 6 maduka |

- **Billing period:** 1 Month · 3 Months · 6 Months · 1 Year
- **Jumla:** linear (mfano Growth: 25,000 / 75,000 / 150,000 / 300,000 TZS)
- **Malipo:** `M-Pesa • Airtel • Yas • Halotel` kupitia **Snippe**
- CTA: `Pay for Plan — 25,000 TZS • 1 Month`
- `Contact Us` → WhatsApp `+255 684 728 971`
- Ujumbe: *"You have reached your shop limit on your current plan. Upgrade now to add more shops!"*

**Subscription logic:** `calculateSubscriptionTotal`, `buildSubscriptionAccessPayload`, `checkSnippeSubscriptionStatus`, `buildSnippePaymentKey`, `isValidSnippePhone`, `formatSnippePhone`; malipo yanathibitishwa kwa **payment key** (kuzuia duplicate).

---

### 5.14 Wauzaji (Manage Sellers)

![Sellers](fasta-pro-docs/screens/22-wauzaji-sellers.png)

- Header: ← · `Manage Sellers` · refresh
- `Add New Seller`
- `Chagua Duka *` (dropdown)
- `Enter seller name` · `Phone Number (07...)`
- `Add Seller`
- Empty: `No sellers found` / `Use the form above to add your first seller.`

**Baada ya kuongeza:** seller anapata **password** (owner anashare) — *"Share this password with the seller to login"*.

**Seller features (build):** `SellerDashboard` (stock listener), `SellerPerformanceCard` (top seller), `SellerExpenseHistoryScreen`, `SellerServiceSuspendedScreen` (subscription imeisha), commission.

---

### 5.15 Taarifa (Alerts)

![Alerts](fasta-pro-docs/screens/23-taarifa-alerts.png)

- Header: `Taarifa za Stock` · shop dropdown `Yuni` · count `0` · 🌐 SW
- Search: `Tafuta bidhaa...`
- Filters: `Zote` · `Stock Ndogo` · `Inaisha` · `Imekwisha`
- Empty: `Hakuna taarifa kwa sasa` / `Kila kitu kiko salama — hakuna taarifa za stock au muda wa kuisha.`

**Alert cards:** `AlertProductCard`, `LimitedStockPill`, `renderExpiringProductCard`, `expiryBadge` (`Inaisha siku N`), `Low Stock Products`.

---

### 5.16 Profaili (Profile)

![Profile](fasta-pro-docs/screens/24-profile.png)
![Edit Profile](fasta-pro-docs/screens/25-edit-profile.png)

- Header: ← · `Mimi` · ✏️
- `Habari` / `Yuni` / `Karibu tena`
- **Biashara Yangu:** `Jina Lako`, `Jina la Kampuni`, `Namba ya Simu` (255678165524), `Barua Pepe` (yuni@gmail.com)
- **Haraka:** `Rekebisha Wasifu` · `Badili Lugha` · `Ondoka`
- **USALAMA WA AKAUNTI:** `Ondoa Akaunti` — *"Kitendo hiki hakiwezi kutenduliwa. Tumia tu ukiwa na uhakika."*

**Hariri Wasifu (modal):** `Jina Lako` · `Jina la Kampuni` · `Namba ya Simu` · `Hifadhi` (barua pepe **haiwezi** kubadilishwa hapa).

**Chagua Lugha (modal):** 🇹🇿 `Kiswahili` · 🇺🇸 `English` · `Ghairi`

![Language](fasta-pro-docs/screens/26-language-modal.png)

---

## 6. Flows Muhimu — Hatua kwa Hatua

### 6.1 Sign Up / Onboarding (kutoka build strings)
```
1. Karibu → Sign Up (email + password, optional referral code)
   ✗ "You cannot use your own referral code to sign up."
2. Verify / Complete profile:
   "Kamilisha jina lako na nambari ya simu tu. Duka lako tayari limesajiliwa."
   → jina + simu (duka la kwanza linatengenezwa automatically)
3. Select Shop → Home
4. Subscription ya bure: duka 1 tu. Kujenga duka la pili → Premium
```

### 6.2 Login
```
Email + password (Firebase, reCAPTCHA)
├── Forgot password → reset email
└── Seller: phone/password iliyoshare na owner
    ✗ "Session ya muuzaji si sahihi. Tafadhali ingia tena."
```

### 6.3 Kuuza (POS) — flow kamili
```
Home → Uza
→ [optional] Customer Ask (kama bidhaa haipo) → Save (Earn Coins)
→ + Items → chagua bidhaa / scan barcode
→ quantity + bei + unit
→ discount (optional)
→ chagua mteja
→ seller (default mwenye duka)
→ njia ya malipo (Cash Payment…)
→ tarehe (Leo)
→ Hifadhi
   ├── stock inapungua
   ├── kama ana deni → "Mauzo yamehifadhiwa! Deni la Tsh …"
   └── kama offline → queue → "Mauzo 1 yanasubiri kusync"
→ Risiti: Share WhatsApp | Print (Bluetooth thermal) | PDF
```

### 6.4 Kuongeza Bidhaa
```
Bidhaa → + → jaza fields → Add Product
├── Barcode → camera scanner (ML Kit)
├── Excel → Download Template → Upload Excel (headers: Product Name, Buying Price, Selling Price, Stock, Barcode)
└── Expiry → toggle → tarehe
```

### 6.5 Deni
```
Madeni → + → Select Customer → Amount → Description → Save
→ PaymentModal kurekodi malipo (paidAmount)
→ Kumbusha Madeni → WhatsApp (ngazi 3 za ujumbe)
```

### 6.6 Subscription
```
Maduka → + New Shop → Premium screen
→ chagua plan (Starter/Growth/Premium)
→ chagua muda (1/3/6/12 months)
→ Pay for Plan → Snippe → USSD push (M-Pesa/Airtel/Yas/Halotel)
→ checkSnippeSubscriptionStatus → activate
```

### 6.7 Partner / Referral
```
Partner Program:
├── Unda Partner Mpya (jina → referral code auto-generated)
├── Sajili Partner / Share code
├── Mteja anajisajili na code → partner anapata commission
└── Commissions Pending → "Commission inaonekana baada ya mteja kulipa subscription kupitia Snippe."
```

### 6.8 Offline Sync
```
Mauzo yanarekodiwa locally (AsyncStorage queue)
→ OfflineSyncBanner: "N sales waiting to sync"
→ mtandao ukirejea → "N sales synced"
→ "N sale(s) synced" / "Mauzo 1 yamesawazishwa"
```

---

## 7. Business Logic & Formula

### 7.1 Faida (Profit)
```
Faida ya bidhaa       = (Selling Price − Buying Price) × Quantity
Faida Baada ya Punguzo = Σ Faida ya bidhaa − Discounts
Faida Halisi (Net)     = Faida Baada ya Punguzo − Matumizi (Expenses)
Profit Margin %        = (Faida ÷ Mauzo) × 100
Items Sold             = Σ quantity za sale items
```
Uthibitisho: *"Faida Halisi Baada ya Punguzo - Matumizi"* na `calculateProfit`, `calculateProfitFromSale`, `calculateDiscountImpact`.

### 7.2 Stock
```
Stock Value      = Σ (quantity × buyingPrice)
Stock Health %   = (bidhaa zenye stock nzuri ÷ jumla) × 100
Default Alert    = 10% ya idadi ya awali
Statuses         = Stock Ndogo | Inaisha (expiry) | Imekwisha
```
- Sale → `applyLocalStockAfterSale` (punguza)
- Delete sale → `buildStockRestoreUpdates` (rudisha)
- Edit sale → `buildEditStockDeltas` (rekebisha tofauti)

### 7.3 Madeni
```
Deni la mteja (customerCurrentDebt) = Σ debts − Σ payments
Salio (customerBalance) = malipo − madeni
Aina: Owe Me (receivable) | I Owe (payable)
Overdue = dueDate < leo
```

### 7.4 DukaCoins
```
Earn  : ku-log "Customer Request" (bidhaa mteja aliyoomba usiyonayo)
Spend : AI Pro Poster | Stock Discount (B2B voucher) | Airtime (soon)
Balance = Σ earned − Σ redeemed
```

### 7.5 Subscription & Limits
```
Free    : duka 1
Starter : 10,000 TZS/mwezi → duka 1
Growth  : 25,000 TZS/mwezi → maduka 3
Premium : 50,000 TZS/mwezi → maduka 6

Total = bei ya mwezi × idadi ya miezi (linear, hakuna discount kwa muda mrefu)
```

### 7.6 Commission (Partner)
```
Commission = % ya subscription iliyolipwa na mteja aliyesajiliwa kupitia referral
Inaonekana baada ya malipo kuthibitishwa (Snippe)
```

---

## 8. Data Model (inayokadiriwa kutoka build)

```
users/{uid}
  ├── name, phone, email, companyName, role (owner|seller|admin|partner)
  ├── activeShopId, shopIds[]
  └── referralCode, referredBy

shops/{shopId}
  ├── ownerId, name, createdAt
  ├── sellerIds[]
  └── subscription { plan, status, startDate, endDate }

shops/{shopId}/products/{productId}
  ├── name, barcode, category, unitType, unitSymbol
  ├── buyingPrice, sellingPrice, quantity
  ├── alertLevel, hasExpiry, expiryDate, description
  └── createdAt, updatedAt

shops/{shopId}/sales/{saleId}
  ├── saleDate, saleDateISO, items[{productId, name, qty, price, buyingPrice}]
  ├── customerId, customerName, customerPhone
  ├── sellerId, sellerName, paymentMethod
  ├── discountAmount, total, profit
  └── createdAt, synced

shops/{shopId}/expenses/{expenseId}
  └── name, amount, category, date, notes, sellerId

shops/{shopId}/customers/{customerId}
  └── name, phone, balance, currentDebt, createdAt

shops/{shopId}/debts/{debtId}
  └── type(oweMe|iOwe), personName, amount, paidAmount, description, dueDate

shops/{shopId}/sellers/{sellerId}
  └── name, phone, password, commissionRate, active

lostSales / demand
  └── productName, shopId, ward, createdAt   ← huunda B2B Demand Report

coins/{uid}/transactions
  └── type(earned|redeemed), amount, reason, createdAt

partners/{partnerId}
  └── name, type, code, ownerId, commissionRate, status

notifications
  └── userId, type(stock|expiry|debt|subscription|mission), title, body, read
```

---

## 9. Design System / UI Patterns

| Kipengele | Uchambuzi |
|---|---|
| Rangi kuu | Light theme, bg `#ECEEF5`-ish, cards nyeupe, accent **green** (FastaPro brand) |
| Type | Sans-serif (Expo fonts), titles bold ~28–34px, body 14–16px |
| Icons | **Material Design Icons (MDI)** — `󰏗`, `󰳴`, `󰡉`, `󱧜`, `󰞱`, `󰗤`, `󰔵` |
| Cards | Rounded ~16–20px, soft shadow, gradient icon circles |
| Navigation | 5 bottom tabs + stack modals (bottom sheets) |
| Empty states | Kila skrini ina icon + title + maelezo |
| Language toggle | `SW` / `EN` kwenye header ya skrini nyingi + Profile |
| Currency | `TZS` / `TSh` (mchanganyiko), namba kubwa zina comma |
| Feedback | Toast/modal (`Seller Added!`, `Mteja ameongezwa`, `Bidhaa haijapatikana`) |

---

## 10. Integrations & Permissions (zinazohitajika kwenye app yako)

| Integration | Matumizi |
|---|---|
| **Firebase Auth** | Email/password, sessions, roles |
| **Firestore** | Real-time data, collections zote |
| **Firebase Hosting** | `dukafasta-3fe3f.web.app` (labda admin/reports) |
| **Snippe** | Mobile money checkout (M-Pesa, Airtel, Yas, Halotel) |
| **WhatsApp (wa.me)** | Risiti, kumbusho la deni, win-back, support |
| **ML Kit / expo-camera** | Barcode scanning |
| **Bluetooth ESC/POS** | Thermal printer receipts |
| **SheetJS (xlsx)** | Bulk product import/export |
| **PDF** | Risiti na ripoti |
| **AsyncStorage** | Offline queue + cache |
| **EAS Update** | OTA updates bila Play Store |

---

## 11. Mapungufu & Matatizo Niliyoyaona (Gaps)

| # | Tatizo | Ushahidi | Athari |
|---|---|---|---|
| 1 | **Header icons hazifanyi kazi** (🌙 na 🔔) | Tap haileti screen yoyote | Confusing UX |
| 2 | **Lugha haibadiliki papo hapo** kwenye skrini zilizo-cache | Home/Reports zilibaki Kiswahili baada ya kuchagua EN; zilibadilika baada ya restart | Inahitaji app restart |
| 3 | **Mchanganyiko wa lugha** kwenye skrini moja | `10% ya idadi ya awali` ndani ya form ya Kiingereza; `Habari Yuni!` ndani ya sheet ya Kiingereza; `Mauzo` vs `Sales` | Sio consistent i18n |
| 4 | **Skrini ya Sale ni Kiingereza pekee** | `Complete Sale`, `Empty Cart`, `Cash Payment` | Wateja wa Kiswahili wanachanganyikiwa |
| 5 | **Hakuna dashboard ya haraka** Home | Home ni launcher tu | Mtumiaji haoni mauzo ya leo mara moja |
| 6 | **Ripoti "Last 7 Days" ni static label** | Haibadiliki kwa tap | Inaonekana kama filter lakini sio |
| 7 | **Maandishi ya "Manage Sellers" ni Kiingereza** | `Add New Seller`, `Chagua Duka *` | Mchanganyiko |
| 8 | **Accessibility ya bounds** (RN) | `uiautomator` inarudisha bounds zisizo sahihi kwa Text nodes | Inaathiri testing/automation |
| 9 | **Recommendations ni generic** | `• Increase product prices` | AI bado ni ya msingi |
| 10 | **DukaCoins rewards zote "Soon"** | Redeem 3 zote `Soon` | Motisha haijakamilika |
| 11 | **Feature flags / experiments** zipo kwenye build | `Feature flags cannot be overridden…` | Inaonyesha dev inajaribu features |

---

## 12. Feature Inventory (Orodha Kamili)

### Uuzaji (Sales)
- [x] POS cart, quantity, unit types, decimals
- [x] Discount (amount / %, with guard `discountTooHigh`)
- [x] Customer selection + walk-in
- [x] Seller attribution
- [x] Payment method
- [x] Sale date (backdating)
- [x] Receipt (WhatsApp share, PDF, thermal print)
- [x] Edit sale, delete sale (restock)
- [x] Offline queue + auto sync
- [x] Customer request / lost sale logging → DukaCoins

### Bidhaa (Inventory)
- [x] CRUD bidhaa
- [x] Barcode scan + manual
- [x] Category (free text)
- [x] Unit types 6 (pcs, kg, g, l, m, pkt)
- [x] Buying/selling price + price change history
- [x] Quantity + stock alert level (default 10%)
- [x] Expiry date + expiry alerts
- [x] Excel template download + bulk upload
- [x] Stock value + stock health

### Wateja (CRM)
- [x] Register (jina + simu)
- [x] Search, edit, delete
- [x] Debt/credit balance
- [x] Payment history
- [x] Win-back message (WhatsApp)
- [x] Dedup

### Fedha (Finance)
- [x] Expenses (6 categories + custom)
- [x] Debts (Owe Me / I Owe)
- [x] Debt payments + overdue
- [x] Debt reminders (3 escalation levels)
- [x] Profit (day/week/month/range)
- [x] Income report (monthly, per shop / all shops)
- [x] Net profit formula

### Ukuaji (Growth)
- [x] Sales Coach missions (AI)
- [x] Mission impact measurement (7-day)
- [x] DukaCoins wallet
- [x] AI poster generator (Pro)
- [x] B2B demand report (CSV/PDF)
- [x] Demand leaderboard by ward
- [x] Partner program + commission
- [x] Referral codes

### Platform
- [x] Multi-shop (with plan limits)
- [x] Sellers with own login
- [x] Subscriptions (Snippe)
- [x] Admin dashboard
- [x] Push/local notifications
- [x] Force update modal
- [x] Rate us
- [x] Offline mode
- [x] OTA updates
- [x] Swahili/English

---

## 13. Mapendekezo kwa App Utakayo Unda

Kama lengo lako ni kuunda app kama hii (au bora), hizi ni funzo muhimu:

### 13.1 Features za kuanza nazo (MVP)
1. **POS rahisi** — bidhaa → cart → malipo → risiti (WhatsApp)
2. **Bidhaa + stock** — na alert ya kuisha
3. **Gharama** — category
4. **Faida** — formula ya wazi (mauzo − gharama za bidhaa − matumizi)
5. **Madeni** — Owe Me / I Owe + kumbusho la WhatsApp
6. **Offline-first** — hii ni **lazima** kwa soko la Tanzania

### 13.2 Features za kujitofautisha
- **AI Coach yenye data halisi** (sio generic) — mission + impact tracking wa siku 7
- **DukaCoins** — motisha halisi (sio "Soon" milele)
- **B2B Demand** — data ya bidhaa zinazotafutwa kwa ward → mauzo ya data kwa suppliers
- **Seller app mode** — mfanyakazi anaona mauzo yake tu + commission
- **Multi-shop** — kwa wamiliki wa maduka mengi

### 13.3 Mapendekezo ya kiufundi
| Uamuzi | Pendekezo |
|---|---|
| Framework | React Native + Expo (kama Fasta) au Flutter |
| Backend | Firebase (haraka) au Supabase/Postgres (nafuu kwa scale) |
| Offline | SQLite/WatermelonDB + sync queue (bora kuliko AsyncStorage) |
| i18n | **i18n moja kwa moja** — usianze na hardcoded strings |
| Malipo | Snippe / Selcom / M-Pesa API + webhook verification |
| Printing | ESC/POS Bluetooth + PDF fallback |
| Analytics | Firestore events + dashboard ya admin |
| Testing | Detox/Maestro kwa flows muhimu |

### 13.4 Vitu vya kuepuka (kutoka makosa ya Fasta)
1. Usiweke buttons zisizofanya kazi (header icons)
2. Usichanganye lugha kwenye skrini moja
3. Hakikisha language switch inatumika **papo hapo** (context re-render)
4. Weka **dashboard ya leo** kwenye Home (mauzo, faida, madeni)
5. Fanya filters zifanye kazi (usianze na static labels)
6. Kamilisha rewards kabla ya kuzitangaza

---

## 14. Nyongeza: Orodha ya Screens Zilizopatikana kwenye Build

```
Screens: Home, CompleteSale, SaleReceipt(modal), EditSale(modal), AddProduct,
Product, BarcodeScanner(modal), UnitType(modal), StockDatePicker(modal),
CustomerList, Customer, CustomerRegistration(modal), AddExpense, Debts,
Payment(modal), Profit, Report, SalesReport, Sellers, SellerDashboard,
SellerExpenseHistory, SellerServiceSuspended, ManageShops, ShopSelector(modal),
Notifications, EnhancedAlert, Analytics(modal), DukaCoins, PosterGenerator,
Admin, AdminUserDetail(modal), ShopDemandLeads(modal), LostSale(modal),
RetentionMessage(modal), SendMessage(modal), DeleteConfirm(modal),
ThermalPrinterPicker(modal), SnippePay(modal), ForceUpdate(modal), RateUs(modal),
Language(modal), OfflineSyncBanner
```

---

## 15. Hitimisho

**FastaPro ni app iliyokomaa kiasi** (v2.3.2, 22k functions, multi-role, multi-shop, subscriptions, AI coach) inayolenga **wafanyabiashara wadogo wa Tanzania** kwa:

- **Kiswahili kwanza** (lakini i18n haijakamilika)
- **Offline-first** (muhimu kwa mtandao wa TZ)
- **Data-driven growth** (AI coach + demand data)
- **Monetization ya wazi** (10K/25K/50K TZS kwa mwezi)

**Udhaifu mkubwa:** consistency ya lugha, buttons zisizofanya kazi, rewards ambazo hazijakamilika, na Home isiyo na muhtasari wa namba.

**Fursa kwako:** kama utaunda app yenye **POS rahisi + offline imara + dashboard ya leo + AI inayofanya kazi kweli**, unaweza kushindana vizuri kwenye soko hili.

---

### Viambatisho (Artifacts)
- Picha za skrini: `fasta-pro-docs/screens/` (30 picha)
- APK: `_fasta_capture/fasta_base.apk`
- Bytecode disassembly: `_fasta_capture/disasm_full` (62 MB)
- String table: `_fasta_capture/strings.txt`, `_fasta_capture/app_strings.txt`
- UI dumps: `_fasta_capture/dumps/`

> ⚠️ **Kumbuka:** Baadhi ya sehemu (mfano risiti, print, subscription checkout, admin) hazikuweza kufanyiwa majaribio ya moja kwa moja kwa sababu akaunti ya jaribio ilikuwa **haina bidhaa/mauzo**, na kuepuka kufanya mabadiliko ya data au malipo halisi. Sehemu hizo zimeandikwa kwa **ushahidi wa UI labels + build strings** (zimewekwa alama wazi).
