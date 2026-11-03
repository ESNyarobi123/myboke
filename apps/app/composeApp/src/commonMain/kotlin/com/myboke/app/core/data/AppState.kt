package com.myboke.app.core.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.myboke.app.core.i18n.Lang
import com.myboke.app.core.i18n.Strings
import com.myboke.app.core.i18n.stringsFor
import com.myboke.app.core.model.CoinBalance
import com.myboke.app.core.model.Customer
import com.myboke.app.core.model.Dashboard
import com.myboke.app.core.model.Debt
import com.myboke.app.core.model.Expense
import com.myboke.app.core.model.ExportJob
import com.myboke.app.core.model.InvoiceDoc
import com.myboke.app.core.model.InvoiceLine
import com.myboke.app.core.model.InvoiceSummary
import com.myboke.app.core.model.InvoiceTemplate
import com.myboke.app.core.model.Me
import com.myboke.app.core.model.Mission
import com.myboke.app.core.model.NotificationItem
import com.myboke.app.core.model.Page as ApiPage
import com.myboke.app.core.model.Product
import com.myboke.app.core.model.Sale
import com.myboke.app.core.model.Shop
import com.myboke.app.core.model.ShopDayHours
import com.myboke.app.core.model.ShopHoliday
import com.myboke.app.core.model.ShopSchedule
import com.myboke.app.core.net.ApiException
import com.myboke.app.core.net.MyBokeApi
import com.myboke.app.core.net.defaultApiBaseUrl
import com.myboke.app.core.net.jsonObj
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.FileSaver
import com.myboke.app.core.util.Money
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.TimeSource

// ─────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────

enum class Stage { Splash, Onboarding, Auth, Main }

enum class Tab { Home, Sell, Reports, People, More }

enum class Page(
    val tab: Tab,
    val parent: Page? = null,
) {
    Home(Tab.Home),
    Sell(Tab.Sell),
    Reports(Tab.Reports),
    People(Tab.People),
    More(Tab.More),

    Products(Tab.More),
    ProductForm(Tab.More, Products),
    Shops(Tab.More),
    ShopSchedule(Tab.More, Shops),
    ShopForm(Tab.More, Shops),
    Debts(Tab.People),
    DebtForm(Tab.People, Debts),
    Expenses(Tab.More),
    ExpenseForm(Tab.More, Expenses),
    CustomerForm(Tab.People, People),
    CustomerDetail(Tab.People, People),
    Growth(Tab.More),
    Settings(Tab.More),
    Profile(Tab.More),
    Assistant(Tab.More),
    Notifications(Tab.Home),
    Receipt(Tab.Sell),
    SyncIssues(Tab.More),
    Backup(Tab.More),
    Invoices(Tab.More),
    InvoiceForm(Tab.More, Invoices),
    InvoiceDetail(Tab.More, Invoices),
    Exports(Tab.More),
}

// ─────────────────────────────────────────────────────────────
// Cart
// ─────────────────────────────────────────────────────────────

data class CartLine(
    val product: Product,
    val quantity: Double,
    val unitPrice: Double,
) {
    val lineTotal: Double get() = quantity * unitPrice
}

class AppState(
    private val scope: CoroutineScope,
) {
    init {
        // Huruhusu safu ya Android kuarifu app inapoingia nyuma.
        activeState = this
    }

    val api = MyBokeApi(
        // Seva iliyowekwa na mtumiaji (mf. IP ya kompyuta kwenye mtandao mmoja).
        baseUrl = Prefs.getString("apiBase")?.takeIf { it.isNotBlank() } ?: defaultApiBaseUrl(),
    )

    /** URL ya seva inayotumika sasa (kwa kuonyesha kwenye Mipangilio). */
    val apiBaseUrl: String get() = api.baseUrl

    /** Inabadilisha seva na kuihifadhi kwa kikao kijacho. */
    fun setApiBase(url: String) {
        val clean = url.trim().trimEnd('/')
        if (clean.isBlank()) {
            Prefs.putString("apiBase", "")
            api.baseUrl = defaultApiBaseUrl()
            return
        }
        val withScheme = if (clean.startsWith("http")) clean else "https://$clean"
        Prefs.putString("apiBase", withScheme)
        api.baseUrl = withScheme
    }

    // ── Mapendeleo ────────────────────────────────────────────
    var lang by mutableStateOf(Lang.fromCode(Prefs.getString("lang")))
        private set
    var dark by mutableStateOf(Prefs.getString("dark") == "1")
        private set

    val t: Strings get() = stringsFor(lang)

    // ── Session ───────────────────────────────────────────────
    var stage by mutableStateOf(Stage.Splash)
        private set
    var page by mutableStateOf(Page.Home)
        private set
    
    var userName by mutableStateOf(Prefs.getString("userName") ?: "")
        private set
    var businessName by mutableStateOf(Prefs.getString("businessName") ?: "")
        private set
    var role by mutableStateOf(Prefs.getString("role") ?: "OWNER")
        private set
    var shops = mutableStateListOf<Shop>()
    var activeShop by mutableStateOf<Shop?>(null)
        private set
    var offlineMode by mutableStateOf(false)
        private set
    var isDemo by mutableStateOf(false)
        private set
    var authLoading by mutableStateOf(false)
        private set
    var authError by mutableStateOf<String?>(null)
        private set

    /** Onyesha kosa la fomu kabla ya mtandao (uthibitisho wa haraka). */
    fun showAuthError(message: String?) {
        authError = message
    }

    val canSeeReports: Boolean get() = role == "OWNER" || role == "MANAGER"
    val canManage: Boolean get() = role == "OWNER" || role == "MANAGER"

    // ── Data ──────────────────────────────────────────────────
    var dashboard by mutableStateOf<Dashboard?>(null)
        private set
    var dashboardLoading by mutableStateOf(false)
        private set
    var dashboardError by mutableStateOf<String?>(null)
        private set

    var products = mutableStateListOf<Product>()
        private set
    var productsLoading by mutableStateOf(false)
        private set
    var productsError by mutableStateOf<String?>(null)
        private set

    var customers = mutableStateListOf<Customer>()
        private set
    var customersLoading by mutableStateOf(false)
        private set
    var customersError by mutableStateOf<String?>(null)
        private set

    var debts = mutableStateListOf<Debt>()
        private set
    var debtsLoading by mutableStateOf(false)
        private set

    var expenses = mutableStateListOf<Expense>()
        private set
    var expensesLoading by mutableStateOf(false)
        private set

    var missions = mutableStateListOf<Mission>()
        private set
    var coins by mutableStateOf(CoinBalance())
        private set

    var notifications = mutableStateListOf<NotificationItem>()
        private set
    var unreadCount by mutableStateOf(0)
        private set

    var recentSales = mutableStateListOf<Sale>()
        private set
    var salesLoading by mutableStateOf(false)
        private set

    var topProducts = mutableStateListOf<com.myboke.app.core.model.TopProduct>()
        private set
    var topCustomers = mutableStateListOf<com.myboke.app.core.model.TopCustomer>()
        private set
    var cashFlow by mutableStateOf<com.myboke.app.core.model.CashFlow?>(null)
        private set
    /** Kipindi kilichochaguliwa kwenye Ripoti: siku 7 / 30 / 90. */
    var reportDays by mutableStateOf(7)
        private set
    var reportProfit by mutableStateOf<com.myboke.app.core.model.ProfitReport?>(null)
        private set
    var reportSales by mutableStateOf<com.myboke.app.core.model.SalesReport?>(null)
        private set

    // ── Ankara (Invoices) ─────────────────────────────────────
    var invoices = mutableStateListOf<InvoiceDoc>()
        private set
    var invoiceSummary by mutableStateOf<InvoiceSummary?>(null)
        private set
    var invoicesLoading by mutableStateOf(false)
        private set
    var invoiceFilter by mutableStateOf<String?>(null)
    var selectedInvoice by mutableStateOf<InvoiceDoc?>(null)
        private set
    var invoiceBusy by mutableStateOf(false)
        private set

    // ── Exports ───────────────────────────────────────────────
    var exportJobs = mutableStateListOf<ExportJob>()
        private set
    var exportBusy by mutableStateOf<String?>(null)
        private set

    // ── Cart (POS) ────────────────────────────────────────────
    var cart = mutableStateListOf<CartLine>()
        private set
    var cartCustomerId by mutableStateOf<String?>(null)

    /** Mteja anayeonyeshwa kwenye ukurasa wa Client 360. */
    var openCustomerId by mutableStateOf<String?>(null)
        private set

    fun openCustomer(id: String) {
        openCustomerId = id
        page = Page.CustomerDetail
    }

    /** Anza mauzo mapya yakiwa yameshachagua mteja huyu. */
    fun startSaleFor(customerId: String) {
        clearCart()
        cartCustomerId = customerId
        page = Page.Sell
    }
    var discountInput by mutableStateOf("")
    var payLater by mutableStateOf(false)
    var paymentMethod by mutableStateOf("CASH")
    var checkoutLoading by mutableStateOf(false)
    var lastSale by mutableStateOf<Sale?>(null)
        private set

    var snackbar by mutableStateOf<String?>(null)
        private set

    var pendingSync by mutableStateOf(0)
        private set

    // ── Maisha ────────────────────────────────────────────────
    /** Muda wa chini wa splash: brand ionekane bila kuruka haraka. */
    private val splashAt = TimeSource.Monotonic.markNow()

    private suspend fun holdSplash() {
        val minimum = 1600.milliseconds
        val elapsed = splashAt.elapsedNow()
        if (elapsed < minimum) delay(minimum - elapsed)
    }

    fun start() {
        wireTokenRefresh()
        scope.launch { boot() }
    }

    private suspend fun boot() {
        val token = Prefs.getString("token")
        val onboardingDone = Prefs.getString("onboardingDone") == "1"
        if (token.isNullOrBlank()) {
            holdSplash()
            stage = if (onboardingDone) Stage.Auth else Stage.Onboarding
            return
        }
        api.token = token
        Prefs.getString("refreshToken")?.takeIf { it.isNotBlank() }?.let { api.refreshToken = it }
        wireTokenRefresh()
        offlineMode = Prefs.getString("offline") == "1"
        userName = Prefs.getString("userName") ?: ""
        businessName = Prefs.getString("businessName") ?: ""
        role = Prefs.getString("role") ?: "OWNER"
        if (offlineMode) {
            loadOfflineSample()
            holdSplash()
            locked = pinSet
            stage = Stage.Main
            return
        }
        runCatching { api.me() }
            .onSuccess { me ->
                applyIdentity(me)
                holdSplash()
                // Kila kuanza upya: funga ikiwa PIN imewekwa.
                locked = pinSet
                stage = Stage.Main
                refreshAll()
            }
            .onFailure { error ->
                // Kikao kimeisha (401) → safisha token ili tusizunguke kwenye mzigo huo.
                if ((error as? ApiException)?.isAuth == true) {
                    clearSession()
                }
                holdSplash()
                stage = Stage.Auth
            }
    }

    fun completeOnboarding() {
        Prefs.putString("onboardingDone", "1")
        stage = Stage.Auth
    }

    fun goToAuth() {
        stage = Stage.Auth
    }

    fun switchLang(next: Lang) {
        lang = next
        Prefs.putString("lang", next.code)
        if (!offlineMode) {
            scope.launch { runCatching { api.updateLocale(next.code) } }
        }
    }

    fun toggleDark() {
        dark = !dark
        Prefs.putString("dark", if (dark) "1" else "0")
    }

    fun navigate(target: Page) {
        page = target
    }

    fun back() {
        page = page.parent ?: when (page.tab) {
            Tab.Home -> Page.Home
            Tab.Sell -> Page.Home
            Tab.Reports -> Page.Home
            Tab.People -> Page.Home
            Tab.More -> Page.Home
        }
    }

    fun selectTab(tab: Tab) {
        page = when (tab) {
            Tab.Home -> Page.Home
            Tab.Sell -> Page.Sell
            Tab.Reports -> Page.Reports
            Tab.People -> Page.People
            Tab.More -> Page.More
        }
    }

    fun showSnack(message: String) {
        snackbar = message
        scope.launch {
            delay(3200)
            if (snackbar == message) snackbar = null
        }
    }

    fun selectShop(shop: Shop) {
        activeShop = shop
        refreshAll()
    }

    // ── App lock (PIN) ────────────────────────────────────────
    /**
     * Kufunga app kwa PIN ya tarakimu 4. Ni kinga ya faragha ya kifaa
     * (mtu mwingine asione mauzo/madeni), si badala ya nenosiri la akaunti.
     * Hash ni ya mwelekeo mmoja wa haraka (FNV-1a) — haitoshi kwa usalama
     * mkubwa, lakini haihifadhi PIN wazi kwenye kifaa.
     */
    var pinSet by mutableStateOf(!Prefs.getString("pinHash").isNullOrBlank())
        private set
    var locked by mutableStateOf(!Prefs.getString("pinHash").isNullOrBlank())
        private set
    var pinError by mutableStateOf(false)
        private set

    private fun hashPin(code: String): String {
        var h = 0x811C9DC5u
        for (b in "myboke:${code.trim()}".encodeToByteArray()) {
            h = h xor (b.toInt() and 0xFF).toUInt()
            h *= 0x01000193u
        }
        return h.toString(16)
    }

    /** Inathibitisha PIN; ikikosea `pinError` inawaka kwa sekunde 2. */
    fun unlock(code: String): Boolean {
        val stored = Prefs.getString("pinHash")
        val ok = !stored.isNullOrBlank() && stored == hashPin(code)
        if (ok) {
            locked = false
            pinError = false
        } else {
            pinError = true
            scope.launch {
                delay(1600)
                pinError = false
            }
        }
        return ok
    }

    /** Inathibitisha PIN bila kufungua app (kwa kubadilisha PIN). */
    fun checkPin(code: String): Boolean {
        val stored = Prefs.getString("pinHash")
        return !stored.isNullOrBlank() && stored == hashPin(code)
    }

    fun setPin(code: String) {
        Prefs.putString("pinHash", hashPin(code))
        pinSet = true
        locked = false
        showSnack(t.auth.pinSetDone)
    }

    /** Inazima app lock baada ya kuthibitisha PIN ya sasa. */
    fun removePin(code: String): Boolean {
        val stored = Prefs.getString("pinHash")
        if (stored.isNullOrBlank() || stored != hashPin(code)) {
            pinError = true
            scope.launch {
                delay(1600)
                pinError = false
            }
            return false
        }
        Prefs.putString("pinHash", "")
        pinSet = false
        locked = false
        showSnack(t.auth.pinRemoved)
        return true
    }

    fun lockNow() {
        if (pinSet && stage == Stage.Main) locked = true
    }

    /**
     * Huitwa app inapoingia nyuma (background). Tunafunga mara moja ikiwa PIN
     * imewekwa ili mtu asione data akiichukua simu.
     */
    fun onBackground() {
        if (pinSet && stage == Stage.Main && !isDemo) locked = true
    }

    // ── Auth ──────────────────────────────────────────────────
    fun login(identifier: String, password: String, onDone: () -> Unit = {}) {
        authLoading = true
        authError = null
        scope.launch {
            runCatching { api.login(identifier, password) }
                .onSuccess { tokens ->
                    tokens.accessToken?.let { saveSession(it, tokens.refreshToken) }
                    // Jina na biashara huja kutoka seva — si prefs za zamani.
                    runCatching { api.me() }.onSuccess { applyIdentity(it) }
                    authLoading = false
                    stage = Stage.Main
                    refreshAll()
                    onDone()
                }
                .onFailure { error ->
                    authLoading = false
                    authError = (error as? ApiException)?.message ?: t.errorBody
                }
        }
    }

    fun register(
        name: String,
        phone: String,
        password: String,
        business: String,
        businessType: String?,
    ) {
        authLoading = true
        authError = null
        scope.launch {
            runCatching { api.register(name, phone, password, business, businessType) }
                .onSuccess { tokens ->
                    tokens.accessToken?.let { saveSession(it, tokens.refreshToken) }
                    userName = name
                    businessName = business
                    Prefs.putString("userName", name)
                    Prefs.putString("businessName", business)
                    Prefs.putString("onboardingDone", "1")
                    // Chukua wanachama/maduka halisi kutoka seva.
                    runCatching { api.me() }.onSuccess { applyIdentity(it) }
                    authLoading = false
                    stage = Stage.Main
                    refreshAll()
                }
                .onFailure { error ->
                    authLoading = false
                    authError = (error as? ApiException)?.message ?: t.errorBody
                }
        }
    }

    /** Inatuma msimbo wa kurejesha neno la siri. `onSent` inaitwa ikiwa ombi limefanikiwa. */
    fun forgotPassword(identifier: String, onSent: (devToken: String?) -> Unit = {}) {
        authLoading = true
        authError = null
        scope.launch {
            runCatching { api.forgotPassword(identifier) }
                .onSuccess { res ->
                    authLoading = false
                    onSent(res["devToken"]?.jsonPrimitive?.contentOrNull)
                }
                .onFailure { error ->
                    authLoading = false
                    authError = (error as? ApiException)?.message ?: t.errorBody
                }
        }
    }

    /** Inakamilisha urejeshaji wa neno la siri kwa msimbo wa SMS. */
    fun resetPassword(token: String, password: String, onDone: () -> Unit = {}) {
        authLoading = true
        authError = null
        scope.launch {
            runCatching { api.resetPassword(token, password) }
                .onSuccess {
                    authLoading = false
                    onDone()
                    showSnack(t.auth.resetDone)
                }
                .onFailure { error ->
                    authLoading = false
                    authError = (error as? ApiException)?.message ?: t.errorBody
                }
        }
    }

    /** Demo: jaribu backend; kama haipo, ingia kwa data ya mfano (offline). */
    fun startDemo() {
        authLoading = true
        authError = null
        scope.launch {
            runCatching { api.demo() }
                .onSuccess { tokens ->
                    tokens.accessToken?.let { saveSession(it, tokens.refreshToken) }
                    isDemo = true
                    // Sasisha jina la biashara/mtumiaji kutoka seva (si prefs za zamani).
                    runCatching { api.me() }.onSuccess { applyIdentity(it) }
                    authLoading = false
                    stage = Stage.Main
                    refreshAll()
                }
                .onFailure {
                    enterOfflineDemo()
                    authLoading = false
                }
        }
    }

    fun enterOfflineDemo() {
        offlineMode = true
        isDemo = true
        userName = "Salma Ally"
        businessName = "Duka la Salma"
        role = "OWNER"
        Prefs.putString("offline", "1")
        Prefs.putString("onboardingDone", "1")
        Prefs.putString("userName", userName)
        Prefs.putString("businessName", businessName)
        Prefs.putString("role", role)
        Prefs.putString("token", "offline-token")
        Prefs.putString("refreshToken", "")
        api.refreshToken = null
        loadOfflineSample()
        stage = Stage.Main
    }

    /** Inaweka taarifa za mtumiaji/biashara na kuzihifadhi kwa kikao kijacho. */
    private fun applyIdentity(me: Me) {
        userName = me.name
        Prefs.putString("userName", me.name)
        val membership = me.memberships.firstOrNull()
        role = membership?.role ?: "OWNER"
        Prefs.putString("role", role)
        businessName = membership?.business?.name ?: businessName
        Prefs.putString("businessName", businessName)
        val shopList = membership?.business?.shops.orEmpty()
        if (shopList.isNotEmpty()) {
            shops.clear()
            shops.addAll(shopList)
            activeShop = shopList.first()
        }
    }

    /** Inasafisha kikao (token + kumbukumbu) bila kuonyesha ujumbe. */
    private fun clearSession() {
        api.token = null
        api.refreshToken = null
        Prefs.putString("token", "")
        Prefs.putString("refreshToken", "")
        Prefs.putString("offline", "0")
        offlineMode = false
        isDemo = false
        clearData()
    }

    private fun saveSession(token: String, refreshToken: String? = null) {
        api.token = token
        refreshToken?.takeIf { it.isNotBlank() }?.let { api.refreshToken = it }
        offlineMode = false
        Prefs.putString("token", token)
        refreshToken?.takeIf { it.isNotBlank() }?.let { Prefs.putString("refreshToken", it) }
        Prefs.putString("offline", "0")
        Prefs.putString("onboardingDone", "1")
    }

    /** Hifadhi tokens mpya zinazopatikana wakati wa refresh ya kiotomatiki. */
    private fun wireTokenRefresh() {
        api.onTokensRefreshed = { access, refresh ->
            Prefs.putString("token", access)
            refresh?.takeIf { it.isNotBlank() }?.let { Prefs.putString("refreshToken", it) }
        }
    }

    fun logout() {
        clearSession()
        stage = Stage.Auth
        page = Page.Home
    }

    private fun clearData() {
        dashboard = null
        products.clear()
        customers.clear()
        debts.clear()
        expenses.clear()
        missions.clear()
        recentSales.clear()
        cart.clear()
        shops.clear()
        activeShop = null
        invoices.clear()
        invoiceSummary = null
        selectedInvoice = null
        exportJobs.clear()
    }

    private fun loadOfflineSample() {
        shops.clear()
        shops.addAll(SampleData.shops)
        activeShop = SampleData.shops.first()
        dashboard = SampleData.dashboard()
        products.clear()
        products.addAll(SampleData.products)
        customers.clear()
        customers.addAll(SampleData.customers)
        debts.clear()
        debts.addAll(SampleData.debts)
        expenses.clear()
        expenses.addAll(SampleData.expenses)
        missions.clear()
        missions.addAll(SampleData.missions().missions)
        coins = SampleData.coins()
        unreadCount = 3
        pendingSync = 2
        notifications.clear()
        notifications.addAll(SampleData.notifications())
        topProducts.clear()
        topProducts.addAll(SampleData.topProducts())
        topCustomers.clear()
        topCustomers.addAll(SampleData.topCustomers())
        cashFlow = SampleData.cashFlow()
        invoices.clear()
        invoices.addAll(SampleData.invoices())
        invoiceSummary = InvoiceSummary(
            count = invoices.size,
            outstanding = Money.format(invoices.filter { it.isOpen }.sumOf { it.balanceValue }, 2),
            overdue = Money.format(invoices.filter { it.status == "OVERDUE" }.sumOf { it.balanceValue }, 2),
            paid = Money.format(invoices.filter { it.status == "PAID" }.sumOf { it.totalValue }, 2),
            draft = invoices.count { it.status == "DRAFT" },
        )
    }

    // ── Refresh ───────────────────────────────────────────────
    fun refreshAll() {
        if (offlineMode) return
        loadDashboard()
        loadCustomers()
        loadDebts()
        loadExpenses()
        loadGrowth()
        loadNotifications()
        // Duka linapaswa kujulikana kwanza — ndipo stock ya bidhaa inakuja.
        loadShops { loadProducts() }
        loadRecentSales()
        loadReports()
        loadInvoices()
    }

    fun loadDashboard() {
        if (offlineMode) return
        dashboardLoading = true
        dashboardError = null
        scope.launch {
            runCatching { api.dashboard(activeShop?.id) }
                .onSuccess { dashboard = it }
                .onFailure { dashboardError = (it as? ApiException)?.message ?: t.errorBody }
            dashboardLoading = false
        }
    }

    fun loadShops(onLoaded: (() -> Unit)? = null) {
        if (offlineMode) return
        scope.launch {
            runCatching { api.shops() }
                .onSuccess { list ->
                    shops.clear()
                    shops.addAll(list)
                    if (activeShop == null || list.none { it.id == activeShop?.id }) {
                        activeShop = list.firstOrNull()
                    }
                    onLoaded?.invoke()
                }
                .onFailure { onLoaded?.invoke() }
        }
    }

    fun loadProducts() {
        if (offlineMode) return
        productsLoading = true
        productsError = null
        scope.launch {
            runCatching { api.products(shopId = activeShop?.id) }
                .onSuccess { page ->
                    products.clear()
                    products.addAll(page.data)
                }
                .onFailure { productsError = (it as? ApiException)?.message ?: t.errorBody }
            productsLoading = false
        }
    }

    fun loadCustomers() {
        if (offlineMode) return
        customersLoading = true
        customersError = null
        scope.launch {
            runCatching { api.customers() }
                .onSuccess { page ->
                    customers.clear()
                    customers.addAll(page.data)
                }
                .onFailure { customersError = (it as? ApiException)?.message ?: t.errorBody }
            customersLoading = false
        }
    }

    fun loadDebts() {
        if (offlineMode) return
        debtsLoading = true
        scope.launch {
            runCatching { api.debts() }
                .onSuccess { page ->
                    debts.clear()
                    debts.addAll(page.data)
                }
            debtsLoading = false
        }
    }

    fun loadExpenses() {
        if (offlineMode) return
        expensesLoading = true
        scope.launch {
            runCatching { api.expenses() }
                .onSuccess { page ->
                    expenses.clear()
                    expenses.addAll(page.data)
                }
            expensesLoading = false
        }
    }

    fun loadRecentSales() {
        if (offlineMode) return
        salesLoading = true
        scope.launch {
            runCatching { api.sales(shopId = activeShop?.id, limit = 15) }
                .onSuccess { page ->
                    recentSales.clear()
                    recentSales.addAll(page.data)
                }
            salesLoading = false
        }
    }

    fun loadReports(days: Int = reportDays) {
        reportDays = days
        val to = Dates.isoDate(Dates.now())
        val from = Dates.isoDate(Dates.now() - (days - 1) * 86_400_000L)
        loadReportsRange(from, to)
    }

    fun loadReportsRange(from: String, to: String) {
        if (offlineMode) return
        scope.launch {
            runCatching { api.profit(from, to) }.onSuccess { reportProfit = it }
            runCatching { api.salesReport(from, to) }.onSuccess { reportSales = it }
            runCatching { api.topProducts(from, to) }.onSuccess {
                topProducts.clear()
                topProducts.addAll(it)
            }
            runCatching { api.topCustomers(from, to) }.onSuccess {
                topCustomers.clear()
                topCustomers.addAll(it)
            }
            runCatching { api.cashFlow(from, to) }.onSuccess { cashFlow = it }
        }
    }

    fun loadGrowth() {
        if (offlineMode) return
        scope.launch {
            runCatching { api.missionsToday() }
                .onSuccess { today ->
                    missions.clear()
                    missions.addAll(today.missions)
                }
            runCatching { api.coins() }.onSuccess { coins = it }
        }
    }

    fun loadNotifications() {
        if (offlineMode) return
        scope.launch {
            runCatching { api.notifications() }
                .onSuccess { page: ApiPage<NotificationItem> ->
                    notifications.clear()
                    notifications.addAll(page.data)
                    unreadCount = page.data.count { it.readAt == null }
                }
        }
    }

    fun markNotificationsRead() {
        unreadCount = 0
        if (offlineMode) return
        scope.launch { runCatching { api.markAllRead() } }
    }

    // ── Cart ──────────────────────────────────────────────────
    fun addToCart(product: Product) {
        val existing = cart.indexOfFirst { it.product.id == product.id }
        if (existing >= 0) {
            val line = cart[existing]
            cart[existing] = line.copy(quantity = line.quantity + 1)
        } else {
            cart.add(
                CartLine(
                    product = product,
                    quantity = 1.0,
                    unitPrice = Money.parse(product.sellingPrice),
                ),
            )
        }
    }

    fun setQuantity(productId: String, quantity: Double) {
        val index = cart.indexOfFirst { it.product.id == productId }
        if (index < 0) return
        if (quantity <= 0) {
            cart.removeAt(index)
        } else {
            cart[index] = cart[index].copy(quantity = quantity)
        }
    }

    fun removeFromCart(productId: String) {
        cart.removeAll { it.product.id == productId }
    }

    fun clearCart() {
        cart.clear()
        cartCustomerId = null
        discountInput = ""
        payLater = false
        paymentMethod = "CASH"
    }

    val cartSubtotal: Double get() = cart.sumOf { it.lineTotal }
    val cartDiscount: Double get() = Money.parse(discountInput).coerceAtMost(cartSubtotal)
    val cartTotal: Double get() = (cartSubtotal - cartDiscount).coerceAtLeast(0.0)
    val cartCount: Int get() = cart.size

    fun checkout(onSuccess: (Sale) -> Unit) {
        if (cart.isEmpty()) return
        checkoutLoading = true
        val shopId = activeShop?.id

        if (offlineMode || shopId == null) {
            val local = Sale(
                id = "local-${Dates.now()}",
                receiptNo = "MB-${(1000..9999).random()}",
                total = Money.format(cartTotal, 2),
                subtotal = Money.format(cartSubtotal, 2),
                discount = Money.format(cartDiscount, 2),
                saleDate = Dates.isoDate(Dates.now()),
                paymentMethod = if (payLater) "CREDIT" else paymentMethod,
                items = cart.map {
                    com.myboke.app.core.model.SaleItem(
                        productId = it.product.id,
                        name = it.product.name,
                        quantity = it.quantity.toString(),
                        price = Money.format(it.unitPrice, 2),
                        lineTotal = Money.format(it.lineTotal, 2),
                    )
                },
                payments = if (payLater) emptyList() else listOf(
                    com.myboke.app.core.model.Payment(
                        method = paymentMethod,
                        amount = Money.format(cartTotal, 2),
                    ),
                ),
            )
            scope.launch {
                delay(400)
                checkoutLoading = false
                lastSale = local
                clearCart()
                showSnack(t.saleSaved)
                onSuccess(local)
            }
            return
        }

        scope.launch {
            val payload = jsonObj(
                "shopId" to shopId,
                "customerId" to cartCustomerId,
                "discount" to if (cartDiscount > 0) Money.plain(cartDiscount, 2) else null,
                "paymentMethod" to if (payLater) "CREDIT" else paymentMethod,
                "items" to cart.map { line ->
                    jsonObj(
                        "productId" to line.product.id,
                        "quantity" to line.quantity.toString(),
                        "price" to Money.plain(line.unitPrice, 2),
                    )
                },
                "idempotencyKey" to "app-${Dates.now()}-${cart.size}",
            )
            runCatching { api.createSale(payload) }
                .onSuccess { sale ->
                    checkoutLoading = false
                    lastSale = sale
                    clearCart()
                    showSnack(t.saleSaved)
                    loadDashboard()
                    loadProducts()
                    loadRecentSales()
                    onSuccess(sale)
                }
                .onFailure { error ->
                    checkoutLoading = false
                    val apiError = error as? ApiException
                    if (apiError?.isOffline == true) {
                        pendingSync += 1
                        showSnack(t.offlineBody)
                    } else {
                        showSnack(apiError?.message ?: t.errorBody)
                    }
                }
        }
    }

    // ── Products CRUD ─────────────────────────────────────────
    fun saveProduct(
        id: String?,
        name: String,
        sellingPrice: String,
        buyingPrice: String,
        stock: String,
        categoryId: String?,
        barcode: String?,
        onDone: () -> Unit,
    ) {
        if (offlineMode || activeShop?.id == null) {
            val existingIndex = products.indexOfFirst { it.id == id }
            val product = Product(
                id = id ?: "local-p-${Dates.now()}",
                name = name,
                barcode = barcode,
                buyingPrice = Money.format(Money.parse(buyingPrice), 2),
                sellingPrice = Money.format(Money.parse(sellingPrice), 2),
                stock = listOf(com.myboke.app.core.model.StockLevel(quantity = stock.ifBlank { "0" })),
            )
            if (existingIndex >= 0) products[existingIndex] = product else products.add(0, product)
            showSnack(t.save)
            onDone()
            return
        }
        scope.launch {
            val payload = jsonObj(
                "name" to name,
                "sellingPrice" to Money.plain(Money.parse(sellingPrice), 2),
                "buyingPrice" to Money.plain(Money.parse(buyingPrice), 2),
                "categoryId" to categoryId,
                "barcode" to barcode?.takeIf { it.isNotBlank() },
                "initialStock" to stock.takeIf { it.isNotBlank() },
                "shopId" to activeShop?.id,
            )
            runCatching {
                if (id == null) api.createProduct(payload) else api.updateProduct(id, payload)
            }.onSuccess {
                showSnack(t.save)
                loadProducts()
                onDone()
            }.onFailure {
                showSnack((it as? ApiException)?.message ?: t.errorBody)
            }
        }
    }

    fun deleteProduct(id: String, onDone: () -> Unit = {}) {
        if (offlineMode) {
            products.removeAll { it.id == id }
            showSnack(t.delete)
            onDone()
            return
        }
        scope.launch {
            runCatching { api.deleteProduct(id) }
                .onSuccess { loadProducts(); showSnack(t.delete); onDone() }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    // ── Customers / debts ─────────────────────────────────────
    fun addCustomer(name: String, phone: String?, onDone: () -> Unit) {
        if (offlineMode) {
            customers.add(0, Customer("local-c-${Dates.now()}", name, phone))
            showSnack(t.save)
            onDone()
            return
        }
        scope.launch {
            runCatching { api.createCustomer(name, phone?.takeIf { it.isNotBlank() }) }
                .onSuccess { loadCustomers(); showSnack(t.save); onDone() }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun addDebt(
        type: String,
        personName: String,
        personPhone: String?,
        amount: String,
        dueDate: String?,
        onDone: () -> Unit,
    ) {
        if (offlineMode) {
            debts.add(
                0,
                Debt(
                    id = "local-d-${Dates.now()}",
                    type = type,
                    personName = personName,
                    personPhone = personPhone,
                    originalAmount = Money.format(Money.parse(amount), 2),
                    paidAmount = "0.00",
                    dueDate = dueDate,
                    status = "OPEN",
                ),
            )
            showSnack(t.save)
            onDone()
            return
        }
        scope.launch {
            runCatching {
                api.createDebt(type, personName, personPhone?.takeIf { it.isNotBlank() }, Money.plain(Money.parse(amount), 2), null, dueDate)
            }.onSuccess { loadDebts(); showSnack(t.save); onDone() }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun payDebt(id: String, amount: String, onDone: () -> Unit = {}) {
        if (offlineMode) {
            val index = debts.indexOfFirst { it.id == id }
            if (index >= 0) {
                val debt = debts[index]
                val paid = Money.parse(debt.paidAmount) + Money.parse(amount)
                debts[index] = debt.copy(
                    paidAmount = Money.format(paid, 2),
                    status = if (paid >= Money.parse(debt.originalAmount)) "PAID" else "PARTIAL",
                )
            }
            showSnack(t.save)
            onDone()
            return
        }
        scope.launch {
            runCatching { api.payDebt(id, Money.plain(Money.parse(amount), 2)) }
                .onSuccess { loadDebts(); loadDashboard(); showSnack(t.save); onDone() }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    // ── Expenses ──────────────────────────────────────────────
    fun addExpense(
        name: String,
        amount: String,
        category: String,
        isRecurring: Boolean,
        onDone: () -> Unit,
    ) {
        if (offlineMode || activeShop?.id == null) {
            expenses.add(
                0,
                Expense(
                    id = "local-e-${Dates.now()}",
                    name = name,
                    amount = Money.format(Money.parse(amount), 2),
                    category = category,
                    isRecurring = isRecurring,
                ),
            )
            showSnack(t.save)
            onDone()
            return
        }
        scope.launch {
            runCatching {
                api.createExpense(
                    name = name,
                    amount = Money.plain(Money.parse(amount), 2),
                    category = category,
                    shopId = activeShop!!.id,
                    isRecurring = isRecurring,
                    recurEvery = if (isRecurring) "MONTHLY" else null,
                )
            }.onSuccess { loadExpenses(); loadDashboard(); showSnack(t.save); onDone() }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    // ── Shops ─────────────────────────────────────────────────
    // ── Saa za kazi · likizo · QR (B7/B8) ─────────────────────
    var schedule by mutableStateOf<ShopSchedule?>(null)
        private set
    var holidays by mutableStateOf<List<ShopHoliday>>(emptyList())
        private set
    var scheduleLoading by mutableStateOf(false)
        private set
    var qrBytes by mutableStateOf<ByteArray?>(null)
        private set

    /** Hupakia saa za kazi, likizo na hali ya kufunguka kwa duka. */
    fun loadSchedule(shopId: String? = activeShop?.id) {
        val id = shopId ?: return
        if (offlineMode) return
        scheduleLoading = true
        scope.launch {
            runCatching {
                val sch = api.shopSchedule(id)
                val hol = api.shopHolidays(id)
                sch to hol
            }
                .onSuccess { (sch, hol) ->
                    schedule = sch
                    holidays = hol
                }
                .onFailure { schedule = null }
            scheduleLoading = false
        }
    }

    /** Huhifadhi saa za kazi za siku zote kwa ombi moja. */
    fun saveHours(hours: Map<String, ShopDayHours>) {
        val shop = activeShop ?: return
        if (offlineMode) {
            showSnack(t.save)
            return
        }
        scope.launch {
            runCatching { api.updateShop(shop.id, businessHours = hours) }
                .onSuccess {
                    showSnack(t.shop.hoursSaved)
                    loadShops { loadSchedule(shop.id) }
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun addHoliday(date: String, reason: String?) {
        val shop = activeShop ?: return
        if (offlineMode) return
        scope.launch {
            runCatching { api.addShopHoliday(shop.id, date, reason) }
                .onSuccess {
                    showSnack(t.shop.holidaySaved)
                    loadSchedule(shop.id)
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun removeHoliday(holidayId: String) {
        val shop = activeShop ?: return
        if (offlineMode) return
        scope.launch {
            runCatching { api.removeShopHoliday(shop.id, holidayId) }
                .onSuccess {
                    holidays = holidays.filterNot { it.id == holidayId }
                    loadSchedule(shop.id)
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun loadQr() {
        val shop = activeShop ?: return
        if (offlineMode) {
            showSnack(t.inv.pdfNeedsNetwork)
            return
        }
        scope.launch {
            runCatching { api.shopQrPng(shop.id) }
                .onSuccess { qrBytes = it }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun clearQr() {
        qrBytes = null
    }

    fun downloadQr() {
        val shop = activeShop ?: return
        val bytes = qrBytes ?: return
        scope.launch {
            val saved = FileSaver.save("qr-${shop.name}.png", bytes, "image/png")
            showSnack(if (saved.ok) "${t.inv.savedTo}: ${saved.path}" else (saved.message ?: t.errorBody))
        }
    }

    fun addShop(name: String, address: String?, onDone: () -> Unit) {
        if (offlineMode) {
            val shop = Shop("local-s-${Dates.now()}", name, address)
            shops.add(shop)
            showSnack(t.save)
            onDone()
            return
        }
        scope.launch {
            runCatching { api.createShop(name, address) }
                .onSuccess { loadShops { loadProducts() }; showSnack(t.save); onDone() }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    // ── Missions / assistant ──────────────────────────────────
    fun completeMission(mission: Mission) {
        if (offlineMode) {
            val index = missions.indexOfFirst { it.id == mission.id }
            if (index >= 0) missions[index] = missions[index].copy(status = "COMPLETED")
            coins = coins.copy(balance = coins.balance + mission.coinsReward, earned = coins.earned + mission.coinsReward)
            showSnack("+${mission.coinsReward} ${t.coins}")
            return
        }
        scope.launch {
            runCatching { api.completeMission(mission.id) }
                .onSuccess {
                    loadGrowth()
                    showSnack("+${mission.coinsReward} ${t.coins}")
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    var assistantAnswer by mutableStateOf<String?>(null)
    var assistantLoading by mutableStateOf(false)

    fun askAssistant(question: String) {
        assistantLoading = true
        assistantAnswer = null
        if (offlineMode) {
            scope.launch {
                delay(900)
                assistantLoading = false
                assistantAnswer = offlineAnswer(question)
            }
            return
        }
        scope.launch {
            runCatching { api.assistant(question, lang.code) }
                .onSuccess { json ->
                    assistantLoading = false
                    assistantAnswer = json["answer"]?.jsonPrimitive?.content
                        ?: json["message"]?.jsonPrimitive?.content
                        ?: json.toString()
                }
                .onFailure {
                    assistantLoading = false
                    assistantAnswer = offlineAnswer(question)
                }
        }
    }

    private fun offlineAnswer(question: String): String {
        val q = question.lowercase()
        val d = dashboard
        return when {
            q.contains("faida") || q.contains("profit") -> {
                "Faida ya leo ni TZS ${d?.today?.profit ?: "0"} " +
                    "(mauzo TZS ${d?.today?.revenue ?: "0"}). Margin ya mwezi ni " +
                    "${Money.format(d?.month?.marginPercent ?: 0.0, 1)}%. Bidhaa inayoongoza ni Unga wa Sembe 1kg."
            }
            q.contains("deni") || q.contains("debt") -> {
                "Unadaiwa TZS ${d?.debts?.oweMe ?: "0"}; kati yake TZS ${d?.debts?.overdue ?: "0"} imechelewa. " +
                    "Mteja Juma Hassan ana deni lililochelewa — tuma kumbusho la ngazi 2."
            }
            q.contains("stock") || q.contains("bidhaa") -> {
                "Bidhaa ${d?.stock?.lowStock ?: 0} zina stock ndogo na ${d?.stock?.outOfStock ?: 0} zimeisha. " +
                    "Pendekezo: ongeza Sukari 1kg (zimebaki 9) kabla ya wikendi."
            }
            else -> {
                "Kwa leo: mauzo ${d?.today?.salesCount ?: 0}, faida TZS ${d?.today?.profit ?: "0"}. " +
                    "Una coins ${coins.balance}. Endelea hivyo — streak yako ni siku 3!"
            }
        }
    }

    // ── Ankara (Invoices) ─────────────────────────────────────
    fun loadInvoices() {
        if (offlineMode) return
        invoicesLoading = true
        scope.launch {
            runCatching { api.invoices(status = invoiceFilter) }
                .onSuccess { result ->
                    invoices.clear()
                    invoices.addAll(result.data)
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
            runCatching { api.invoiceSummary() }.onSuccess { invoiceSummary = it }
            invoicesLoading = false
        }
    }

    fun filterInvoices(status: String?) {
        invoiceFilter = status
        loadInvoices()
    }

    fun openInvoice(invoice: InvoiceDoc) {
        selectedInvoice = invoice
        navigate(Page.InvoiceDetail)
    }

    fun openInvoice(id: String) {
        val local = invoices.firstOrNull { it.id == id }
        if (local != null) selectedInvoice = local
        navigate(Page.InvoiceDetail)
        if (!offlineMode) {
            scope.launch {
                runCatching { api.invoice(id) }
                    .onSuccess { selectedInvoice = it }
            }
        }
    }

    /** Tengeneza ankara. `lines` = (maelezo, idadi, bei). */
    fun createInvoice(
        customerName: String,
        customerPhone: String?,
        customerAddress: String?,
        dueDate: String?,
        discount: String,
        taxRate: String,
        template: InvoiceTemplate,
        lines: List<Triple<String, Double, Double>>,
        notes: String? = null,
        onDone: (InvoiceDoc) -> Unit = {},
    ) {
        if (customerName.isBlank()) {
            showSnack(t.inv.needsItems)
            return
        }
        // Safisha mistari: chukua tu yenye idadi na bei halali, na usiache maelezo matupu.
        val cleanLines = lines
            .filter { it.second > 0 && it.third > 0 }
            .map { if (it.first.isBlank()) Triple("Bidhaa", it.second, it.third) else it }

        if (cleanLines.isEmpty()) {
            showSnack(t.inv.needsItems)
            return
        }

        invoiceBusy = true

        if (offlineMode) {
            val subtotal = cleanLines.sumOf { it.second * it.third }
            val disc = Money.parse(discount).coerceAtMost(subtotal)
            val tax = (subtotal - disc) * Money.parse(taxRate) / 100.0
            val total = subtotal - disc + tax
            val doc = InvoiceDoc(
                id = "local-inv-${Dates.now()}",
                number = "INV-${(1000..9999).random()}",
                customerName = customerName,
                customerPhone = customerPhone,
                customerAddress = customerAddress,
                dueDate = dueDate,
                status = "DRAFT",
                template = template.key,
                issueDate = Dates.isoDate(Dates.now()),
                subtotal = Money.format(subtotal, 2),
                discount = Money.format(disc, 2),
                taxRate = Money.format(Money.parse(taxRate), 2),
                taxAmount = Money.format(tax, 2),
                total = Money.format(total, 2),
                balance = Money.format(total, 2),
                notes = notes,
                items = cleanLines.map {
                    InvoiceLine(
                        description = it.first,
                        quantity = it.second.toString(),
                        unitPrice = Money.format(it.third, 2),
                        lineTotal = Money.format(it.second * it.third, 2),
                    )
                },
            )
            scope.launch {
                delay(300)
                invoices.add(0, doc)
                invoiceBusy = false
                showSnack(t.inv.created)
                onDone(doc)
            }
            return
        }

        scope.launch {
            val payload = jsonObj(
                "customerName" to customerName,
                "customerPhone" to customerPhone,
                "customerAddress" to customerAddress,
                "dueDate" to dueDate,
                "discount" to Money.parse(discount),
                "taxRate" to Money.parse(taxRate),
                "template" to template.key,
                "notes" to notes,
                "shopId" to activeShop?.id,
                "items" to cleanLines.map { line ->
                    jsonObj(
                        "description" to line.first,
                        "quantity" to line.second,
                        "unitPrice" to line.third,
                    )
                },
            )
            runCatching { api.createInvoice(payload) }
                .onSuccess { doc ->
                    invoiceBusy = false
                    invoices.add(0, doc)
                    selectedInvoice = doc
                    showSnack(t.inv.created)
                    loadInvoices()
                    onDone(doc)
                }
                .onFailure {
                    invoiceBusy = false
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    fun payInvoice(invoice: InvoiceDoc, amount: String) {
        if (invoice.id.startsWith("local-")) {
            val paid = Money.parse(invoice.amountPaid) + Money.parse(amount)
            val status = if (paid >= Money.parse(invoice.total)) "PAID" else "PARTIAL"
            val updated = invoice.copy(
                amountPaid = Money.format(paid, 2),
                status = status,
                balance = Money.format(Money.parse(invoice.total) - paid, 2),
            )
            replaceInvoice(updated)
            showSnack(t.inv.paymentSaved)
            return
        }
        invoiceBusy = true
        scope.launch {
            runCatching { api.payInvoice(invoice.id, Money.plain(Money.parse(amount), 2)) }
                .onSuccess {
                    invoiceBusy = false
                    replaceInvoice(it)
                    showSnack(t.inv.paymentSaved)
                    loadInvoices()
                }
                .onFailure {
                    invoiceBusy = false
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    fun sendInvoice(invoice: InvoiceDoc) {
        if (invoice.id.startsWith("local-")) {
            replaceInvoice(invoice.copy(status = "SENT"))
            showSnack(t.inv.sent)
            return
        }
        scope.launch {
            runCatching { api.sendInvoice(invoice.id) }
                .onSuccess {
                    replaceInvoice(it)
                    showSnack(t.inv.sent)
                    loadInvoices()
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun voidInvoice(invoice: InvoiceDoc) {
        if (invoice.id.startsWith("local-")) {
            replaceInvoice(invoice.copy(status = "VOID"))
            return
        }
        scope.launch {
            runCatching { api.voidInvoice(invoice.id) }
                .onSuccess {
                    replaceInvoice(it)
                    showSnack(t.inv.voided)
                    loadInvoices()
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun deleteInvoice(invoice: InvoiceDoc, onDone: () -> Unit = {}) {
        if (invoice.id.startsWith("local-")) {
            invoices.removeAll { it.id == invoice.id }
            onDone()
            return
        }
        scope.launch {
            runCatching { api.deleteInvoice(invoice.id) }
                .onSuccess {
                    invoices.removeAll { it.id == invoice.id }
                    showSnack(t.inv.deleted)
                    onDone()
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    private fun replaceInvoice(updated: InvoiceDoc) {
        val index = invoices.indexOfFirst { it.id == updated.id }
        if (index >= 0) invoices[index] = updated else invoices.add(0, updated)
        if (selectedInvoice?.id == updated.id) selectedInvoice = updated
    }

    /** Ankara moja kwa moja kutoka mauzo yaliyokwisha. */
    fun invoiceFromSale(sale: Sale) {
        if (offlineMode || sale.id.startsWith("local-")) {
            navigate(Page.InvoiceForm)
            return
        }
        invoiceBusy = true
        scope.launch {
            runCatching { api.invoiceFromSale(sale.id) }
                .onSuccess { doc ->
                    invoiceBusy = false
                    invoices.add(0, doc)
                    selectedInvoice = doc
                    showSnack(t.inv.created)
                    navigate(Page.InvoiceDetail)
                }
                .onFailure {
                    invoiceBusy = false
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    /** Pakua ankara kama PDF (template iliyochaguliwa) na ihifadhi kwenye kifaa. */
    fun downloadInvoicePdf(invoice: InvoiceDoc, template: InvoiceTemplate = InvoiceTemplate.Modern) {
        if (invoice.id.startsWith("local-") || offlineMode) {
            showSnack(t.inv.pdfNeedsNetwork)
            return
        }
        invoiceBusy = true
        scope.launch {
            runCatching { api.invoicePdf(invoice.id, template.key) }
                .onSuccess { bytes ->
                    invoiceBusy = false
                    val saved = FileSaver.save(
                        "ankara-${invoice.number}.pdf",
                        bytes,
                        "application/pdf",
                    )
                    showSnack(if (saved.ok) "${t.inv.savedTo}: ${saved.path}" else (saved.message ?: t.errorBody))
                }
                .onFailure {
                    invoiceBusy = false
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    // ── Exports ───────────────────────────────────────────────
    fun loadExports() {
        if (offlineMode) return
        scope.launch {
            runCatching { api.exports() }
                .onSuccess {
                    exportJobs.clear()
                    exportJobs.addAll(it.data)
                }
        }
    }

    /**
     * Export halisi: hutengeneza faili backend (xlsx/csv/json), inasubiri
     * kukamilika, kisha inapakua na kuihifadhi kwenye kifaa.
     */
    fun exportData(
        type: String,
        format: String = "xlsx",
        from: String? = null,
        to: String? = null,
    ) {
        val key = "$type-${format}"
        if (offlineMode) {
            showSnack(t.inv.exportNeedsNetwork)
            return
        }
        exportBusy = key
        scope.launch {
            runCatching {
                var job = api.createExport(
                    type = type,
                    format = format,
                    from = from,
                    to = to,
                    shopId = activeShop?.id,
                )
                var attempts = 0
                while (job.status != "DONE" && job.status != "FAILED" && attempts < 25) {
                    delay(600)
                    job = api.exportJob(job.id)
                    attempts++
                }
                job
            }.onSuccess { job ->
                if (job.status != "DONE") {
                    exportBusy = null
                    showSnack(job.error ?: t.inv.exportFailed)
                    return@onSuccess
                }
                runCatching { api.downloadExport(job.id) }
                    .onSuccess { bytes ->
                        exportBusy = null
                        val name = job.fileName ?: "myboke-$type.${if (format == "xlsx") "xlsx" else format}"
                        val mime = when (format) {
                            "csv" -> "text/csv"
                            "json" -> "application/json"
                            else -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        }
                        val saved = FileSaver.save(name, bytes, mime)
                        showSnack(
                            if (saved.ok) "${t.inv.savedTo}: ${saved.path}"
                            else (saved.message ?: t.errorBody),
                        )
                        exportJobs.add(0, job)
                    }
                    .onFailure {
                        exportBusy = null
                        showSnack((it as? ApiException)?.message ?: t.errorBody)
                    }
            }.onFailure {
                exportBusy = null
                showSnack((it as? ApiException)?.message ?: t.errorBody)
            }
        }
    }

    /** Export ya bidhaa ya moja kwa moja (xlsx/csv). */
    fun downloadProductExport(format: String = "xlsx") {
        if (offlineMode) {
            showSnack(t.inv.exportNeedsNetwork)
            return
        }
        exportBusy = "products-$format"
        scope.launch {
            runCatching { api.productExportFile(format) }
                .onSuccess { bytes ->
                    exportBusy = null
                    val name = "bidhaa.${if (format == "csv") "csv" else "xlsx"}"
                    val saved = FileSaver.save(name, bytes, if (format == "csv") "text/csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    showSnack(if (saved.ok) "${t.inv.savedTo}: ${saved.path}" else (saved.message ?: t.errorBody))
                }
                .onFailure {
                    exportBusy = null
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    /** Lebo za barcode kama PDF. */
    fun downloadProductLabels() {
        if (offlineMode) {
            showSnack(t.inv.pdfNeedsNetwork)
            return
        }
        exportBusy = "labels"
        scope.launch {
            runCatching { api.productLabelsPdf() }
                .onSuccess { bytes ->
                    exportBusy = null
                    val saved = FileSaver.save("lebo-bidhaa.pdf", bytes, "application/pdf")
                    showSnack(if (saved.ok) "${t.inv.savedTo}: ${saved.path}" else (saved.message ?: t.errorBody))
                }
                .onFailure {
                    exportBusy = null
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    /** Template ya CSV ya ku-import bidhaa. */
    fun downloadImportTemplate() {
        if (offlineMode) {
            showSnack(t.inv.exportNeedsNetwork)
            return
        }
        exportBusy = "template"
        scope.launch {
            runCatching { api.productImportTemplate() }
                .onSuccess { bytes ->
                    exportBusy = null
                    val saved = FileSaver.save("template-bidhaa.csv", bytes, "text/csv")
                    showSnack(if (saved.ok) "${t.inv.savedTo}: ${saved.path}" else (saved.message ?: t.errorBody))
                }
                .onFailure {
                    exportBusy = null
                    showSnack((it as? ApiException)?.message ?: t.errorBody)
                }
        }
    }

    /** Risiti ya mauzo kama PDF halisi. */
    fun downloadReceiptPdf(sale: Sale) {
        if (offlineMode) {
            showSnack(t.inv.pdfNeedsNetwork)
            return
        }
        scope.launch {
            runCatching { api.receiptPdf(sale.id) }
                .onSuccess { bytes ->
                    val saved = FileSaver.save(
                        "risiti-${sale.receiptNo.ifBlank { sale.id }}.pdf",
                        bytes,
                        "application/pdf",
                    )
                    showSnack(if (saved.ok) "${t.inv.savedTo}: ${saved.path}" else (saved.message ?: t.errorBody))
                }
                .onFailure { showSnack((it as? ApiException)?.message ?: t.errorBody) }
        }
    }

    fun dismissSnack() {
        snackbar = null
    }
}

/** AppState inayoendelea — hutumika kwa matukio ya mfumo (background lock). */
var activeState: AppState? = null
    private set

/** Hifadhi ndogo ya mapendeleo (token, lugha, theme). */
expect object Prefs {
    fun getString(key: String): String?
    fun putString(key: String, value: String)
}

fun JsonObject.stringField(key: String): String? =
    this[key]?.jsonPrimitive?.content
