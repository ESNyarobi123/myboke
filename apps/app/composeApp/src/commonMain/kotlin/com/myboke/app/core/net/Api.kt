package com.myboke.app.core.net

import com.myboke.app.core.model.ApiProblem
import com.myboke.app.core.model.AuthTokens
import com.myboke.app.core.model.BreakEven
import com.myboke.app.core.model.CashFlow
import com.myboke.app.core.model.Category
import com.myboke.app.core.model.CoinBalance
import com.myboke.app.core.model.Customer
import com.myboke.app.core.model.Dashboard
import com.myboke.app.core.model.Debt
import com.myboke.app.core.model.Expense
import com.myboke.app.core.model.ExpiringResponse
import com.myboke.app.core.model.ExportJob
import com.myboke.app.core.model.ExportList
import com.myboke.app.core.model.InvoiceDoc
import com.myboke.app.core.model.InvoiceList
import com.myboke.app.core.model.InvoiceSummary
import com.myboke.app.core.model.Me
import com.myboke.app.core.model.MissionToday
import com.myboke.app.core.model.NotificationItem
import com.myboke.app.core.model.Page
import com.myboke.app.core.model.Plan
import com.myboke.app.core.model.PriceSuggestion
import com.myboke.app.core.model.Product
import com.myboke.app.core.model.ProfitReport
import com.myboke.app.core.model.RestockSuggestion
import com.myboke.app.core.model.Sale
import com.myboke.app.core.model.SalesReport
import com.myboke.app.core.model.Shop
import com.myboke.app.core.model.ShopDayHours
import com.myboke.app.core.model.ShopHoliday
import com.myboke.app.core.model.ShopHolidaysResponse
import com.myboke.app.core.model.ShopSchedule
import com.myboke.app.core.model.StockAlert
import com.myboke.app.core.model.StreakInfo
import com.myboke.app.core.model.TopCustomer
import com.myboke.app.core.model.TopProduct
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.client.statement.readRawBytes
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class ApiException(
    val status: Int,
    val code: String?,
    override val message: String,
) : Exception(message) {
    val isAuth: Boolean get() = status == 401
    val isForbidden: Boolean get() = status == 403
    val isOffline: Boolean get() = status == 0
    val isQuota: Boolean
        get() = status == 402 || (code?.contains("QUOTA", true) == true) ||
            message.contains("kikomo", true) || message.contains("limit", true)
}

object JsonConfig {
    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
        encodeDefaults = false
        coerceInputValues = true
    }
}

/**
 * Hubadilisha `problem+json` ya backend kuwa ujumbe mfupi unaoeleweka kwa mtumiaji.
 * Hutumia `detail` (string au array ya makosa) kwanza, kisha `message`/`error`, mwisho `title`.
 * Bila hii, mtumiaji alikuwa akiona JSON ghafi kama
 * `{type:https://…,status:400,code:VALIDATION_FAILED,…}` kwenye snackbar.
 */
private fun friendlyProblem(problem: ApiProblem?, rawBody: String, status: Int): String {
    fun texts(el: JsonElement?): List<String> = when (el) {
        null -> emptyList()
        is JsonPrimitive -> listOf(el.content)
        is JsonArray -> el.mapNotNull { (it as? JsonPrimitive)?.content }
        else -> emptyList()
    }

    val detail = texts(problem?.detail).map { it.trim() }.filter { it.isNotBlank() }
    val message = listOfNotNull(problem?.messageRaw, problem?.error)
        .map { it.trim() }
        .filter { it.isNotBlank() }
    val title = problem?.title?.trim().orEmpty()

    val combined = when {
        message.isNotEmpty() && detail.isNotEmpty() -> "${message.first()}: ${detail.joinToString(" • ")}"
        message.isNotEmpty() -> message.first()
        detail.isNotEmpty() -> detail.joinToString(" • ")
        title.isNotBlank() -> title
        else -> ""
    }.take(220)

    if (combined.isNotBlank()) return combined

    // Mwisho: jaribu kusoma body kama maandishi, lakini usionyeshe JSON ghafi.
    val fallback = rawBody.trim()
    return if (fallback.isBlank() || fallback.startsWith("{") || fallback.startsWith("[")) {
        "Hitilafu ($status)"
    } else {
        fallback.take(220)
    }
}

expect fun defaultApiBaseUrl(): String

/** Msaidizi wa kuunda JSON body bila serializer maalum. */
fun jsonObj(vararg pairs: Pair<String, Any?>): JsonObject = buildJsonObject {
    for ((key, value) in pairs) {
        when (value) {
            null -> {}
            is JsonElement -> put(key, value)
            is Number -> put(key, JsonPrimitive(value))
            is Boolean -> put(key, JsonPrimitive(value))
            is List<*> -> {
                val arr = kotlinx.serialization.json.JsonArray(
                    value.filterNotNull().map { item ->
                        when (item) {
                            is JsonElement -> item
                            is Number -> JsonPrimitive(item)
                            is Boolean -> JsonPrimitive(item)
                            else -> JsonPrimitive(item.toString())
                        }
                    },
                )
                put(key, arr)
            }
            else -> put(key, JsonPrimitive(value.toString()))
        }
    }
}

class MyBokeApi(
    var baseUrl: String = defaultApiBaseUrl(),
) {
    private val client = HttpClient {
        expectSuccess = false
        install(ContentNegotiation) { json(JsonConfig.json) }
        install(HttpTimeout) {
            requestTimeoutMillis = 25_000
            connectTimeoutMillis = 12_000
            socketTimeoutMillis = 25_000
        }
        defaultRequest { contentType(ContentType.Application.Json) }
    }

    var token: String? = null

    /** Refresh token — hutumika kupata access token mpya kimya kimya bila kumtoa mtumiaji. */
    var refreshToken: String? = null

    /** Huitwa kila token mpya inapopatikana ili ihifadhiwe kwenye kifaa. */
    var onTokensRefreshed: ((access: String, refresh: String?) -> Unit)? = null

    private var refreshing = false

    private fun fullUrl(path: String, query: Map<String, String?>): String {
        val base = baseUrl.trimEnd('/') + path
        val qs = query.entries.filter { it.value != null }
            .joinToString("&") { "${it.key}=${it.value}" }
        return if (qs.isEmpty()) base else "$base?$qs"
    }

    /** Tuma ombi moja (bila retry). */
    private suspend fun send(
        path: String,
        method: String,
        body: JsonElement?,
        query: Map<String, String?>,
        auth: Boolean,
    ): HttpResponse {
        val url = fullUrl(path, query)
        return try {
            when (method) {
                "POST" -> client.post(url) {
                    if (auth) token?.let { header("Authorization", "Bearer $it") }
                    if (body != null) setBody(body)
                }
                "PATCH" -> client.patch(url) {
                    if (auth) token?.let { header("Authorization", "Bearer $it") }
                    if (body != null) setBody(body)
                }
                "DELETE" -> client.delete(url) {
                    if (auth) token?.let { header("Authorization", "Bearer $it") }
                }
                else -> client.get(url) {
                    if (auth) token?.let { header("Authorization", "Bearer $it") }
                }
            }
        } catch (e: Exception) {
            throw ApiException(0, "NETWORK", "Hakuna mtandao. Angalia connection yako.")
        }
    }

    /**
     * Badilisha access token kwa kutumia refresh token.
     * Huitwa kiotomatiki ombi linapokataliwa kwa 401 (token imeisha muda).
     */
    suspend fun refreshAccessToken(): Boolean {
        val rt = refreshToken?.takeIf { it.isNotBlank() } ?: return false
        if (refreshing) return false
        refreshing = true
        return try {
            val response = client.post(fullUrl("/auth/refresh", emptyMap())) {
                setBody(jsonObj("refreshToken" to rt))
            }
            if (response.status.value !in 200..299) return false
            val tokens = response.body<AuthTokens>()
            val access = tokens.accessToken ?: return false
            token = access
            tokens.refreshToken?.takeIf { it.isNotBlank() }?.let { refreshToken = it }
            onTokensRefreshed?.invoke(access, refreshToken)
            true
        } catch (e: Exception) {
            false
        } finally {
            refreshing = false
        }
    }

    private suspend inline fun <reified T> call(
        path: String,
        method: String = "GET",
        body: JsonElement? = null,
        query: Map<String, String?> = emptyMap(),
        auth: Boolean = true,
    ): T {
        var response = send(path, method, body, query, auth)
        // Token imeisha muda? Jaribu kuibadilisha kisha rudia ombi mara moja.
        if (response.status.value == 401 && auth && refreshAccessToken()) {
            response = send(path, method, body, query, auth)
        }

        if (response.status.value !in 200..299) {
            val text = runCatching { response.bodyAsText() }.getOrDefault("")
            val problem = runCatching { JsonConfig.json.decodeFromString<ApiProblem>(text) }.getOrNull()
            throw ApiException(
                status = response.status.value,
                code = problem?.code,
                message = friendlyProblem(problem, text, response.status.value),
            )
        }

        return response.body()
    }

    /** Pakua faili (PDF/CSV/XLSX) kama bytes. */
    private suspend fun callBytes(
        path: String,
        query: Map<String, String?> = emptyMap(),
    ): ByteArray {
        var response = send(path, "GET", null, query, auth = true)
        if (response.status.value == 401 && refreshAccessToken()) {
            response = send(path, "GET", null, query, auth = true)
        }
        if (response.status.value !in 200..299) {
            val text = runCatching { response.bodyAsText() }.getOrDefault("")
            throw ApiException(response.status.value, "DOWNLOAD_FAILED", text.take(200))
        }
        return response.readRawBytes()
    }

    // ── Auth ──────────────────────────────────────────────────
    suspend fun register(
        name: String,
        phone: String,
        password: String,
        businessName: String,
        businessType: String? = null,
        shopName: String? = null,
    ): AuthTokens = call(
        "/auth/register",
        method = "POST",
        auth = false,
        body = jsonObj(
            "name" to name,
            "phone" to phone,
            "password" to password,
            "businessName" to businessName,
            "businessType" to businessType,
            "shopName" to shopName,
            "acceptsTerms" to true,
        ),
    )

    suspend fun login(identifier: String, password: String): AuthTokens = call(
        "/auth/login",
        method = "POST",
        auth = false,
        body = jsonObj(
            "identifier" to identifier,
            "password" to password,
            "deviceId" to "myboke-app",
        ),
    )

    suspend fun demo(): AuthTokens = call("/auth/demo", method = "POST", auth = false)

    suspend fun me(): Me = call("/auth/me")

    suspend fun updateLocale(locale: String): JsonObject = call(
        "/auth/me/locale",
        method = "PATCH",
        body = jsonObj("locale" to locale),
    )

    /** Inatuma msimbo wa kurejesha neno la siri (SMS/email). */
    suspend fun forgotPassword(identifier: String): JsonObject = call(
        "/auth/password/forgot",
        method = "POST",
        auth = false,
        body = jsonObj("identifier" to identifier),
    )

    /** Inabadilisha neno la siri kwa kutumia msimbo uliotumwa. */
    suspend fun resetPassword(token: String, password: String): JsonObject = call(
        "/auth/password/reset",
        method = "POST",
        auth = false,
        body = jsonObj("token" to token, "password" to password),
    )

    // ── Dashboard / ripoti ────────────────────────────────────
    suspend fun dashboard(shopId: String?): Dashboard =
        call("/reports/dashboard", query = mapOf("shopId" to shopId))

    suspend fun topProducts(from: String? = null, to: String? = null): List<TopProduct> =
        call("/reports/top-products", query = mapOf("from" to from, "to" to to))

    suspend fun topCustomers(from: String? = null, to: String? = null): List<TopCustomer> =
        call("/reports/top-customers", query = mapOf("from" to from, "to" to to))

    suspend fun cashFlow(from: String? = null, to: String? = null): CashFlow =
        call("/reports/cash-flow", query = mapOf("from" to from, "to" to to))

    suspend fun breakEven(from: String? = null, to: String? = null): BreakEven =
        call("/reports/break-even", query = mapOf("from" to from, "to" to to))

    suspend fun profit(from: String? = null, to: String? = null): ProfitReport =
        call("/reports/profit", query = mapOf("from" to from, "to" to to))

    suspend fun salesReport(from: String? = null, to: String? = null): SalesReport =
        call("/reports/sales", query = mapOf("from" to from, "to" to to))

    // ── Bidhaa ────────────────────────────────────────────────
    suspend fun products(shopId: String? = null, q: String? = null, limit: Int = 100): Page<Product> =
        call("/products", query = mapOf("shopId" to shopId, "q" to q, "limit" to "$limit"))

    suspend fun createProduct(payload: JsonObject): Product =
        call("/products", method = "POST", body = payload)

    suspend fun updateProduct(id: String, payload: JsonObject): Product =
        call("/products/$id", method = "PATCH", body = payload)

    suspend fun deleteProduct(id: String): JsonObject =
        call("/products/$id", method = "DELETE")

    suspend fun stockAlerts(shopId: String? = null): List<StockAlert> =
        call("/stock/alerts", query = mapOf("shopId" to shopId))

    suspend fun expiring(days: Int = 30): ExpiringResponse =
        call("/products/expiring", query = mapOf("days" to "$days"))

    suspend fun categories(): List<Category> = call("/categories")

    // ── Mauzo ─────────────────────────────────────────────────
    suspend fun createSale(payload: JsonObject): Sale =
        call("/sales", method = "POST", body = payload)

    suspend fun sales(shopId: String? = null, limit: Int = 20): Page<Sale> =
        call("/sales", query = mapOf("shopId" to shopId, "limit" to "$limit"))

    suspend fun sale(id: String): Sale = call("/sales/$id")

    fun receiptUrl(saleId: String, format: String = "html"): String =
        baseUrl.trimEnd('/') + "/sales/$saleId/receipt?format=$format"

    suspend fun holdSale(label: String, shopId: String, payload: JsonObject): JsonObject =
        call(
            "/sales/hold",
            method = "POST",
            body = jsonObj("label" to label, "shopId" to shopId, "payload" to payload),
        )

    // ── Wateja / madeni ───────────────────────────────────────
    suspend fun customers(q: String? = null, limit: Int = 100): Page<Customer> =
        call("/customers", query = mapOf("q" to q, "limit" to "$limit"))

    suspend fun createCustomer(name: String, phone: String?, creditLimit: String? = null): Customer =
        call(
            "/customers",
            method = "POST",
            body = jsonObj("name" to name, "phone" to phone, "creditLimit" to creditLimit),
        )

    suspend fun debts(type: String? = null, status: String? = null): Page<Debt> =
        call("/debts", query = mapOf("type" to type, "status" to status, "limit" to "100"))

    suspend fun createDebt(
        type: String,
        personName: String,
        personPhone: String?,
        amount: String,
        description: String?,
        dueDate: String?,
    ): Debt = call(
        "/debts",
        method = "POST",
        body = jsonObj(
            "type" to type,
            "personName" to personName,
            "personPhone" to personPhone,
            "originalAmount" to amount,
            "description" to description,
            "dueDate" to dueDate,
        ),
    )

    suspend fun payDebt(id: String, amount: String, method: String = "CASH"): JsonObject =
        call("/debts/$id/payments", method = "POST", body = jsonObj("amount" to amount, "method" to method))

    suspend fun remindDebt(id: String): JsonObject =
        call("/debts/$id/remind", method = "POST", body = jsonObj())

    // ── Gharama ───────────────────────────────────────────────
    suspend fun expenses(): Page<Expense> = call("/expenses", query = mapOf("limit" to "60"))

    suspend fun createExpense(
        name: String,
        amount: String,
        category: String,
        shopId: String,
        notes: String? = null,
        isRecurring: Boolean = false,
        recurEvery: String? = null,
    ): Expense = call(
        "/expenses",
        method = "POST",
        body = jsonObj(
            "name" to name,
            "amount" to amount,
            "category" to category,
            "shopId" to shopId,
            "notes" to notes,
            "isRecurring" to isRecurring,
            "recurEvery" to recurEvery,
        ),
    )

    // ── Maduka ────────────────────────────────────────────────
    suspend fun shops(): List<Shop> = call("/shops")

    suspend fun createShop(name: String, address: String? = null, phone: String? = null): Shop =
        call("/shops", method = "POST", body = jsonObj("name" to name, "address" to address, "phone" to phone))

    suspend fun updateShop(
        id: String,
        name: String? = null,
        address: String? = null,
        phone: String? = null,
        businessHours: Map<String, ShopDayHours>? = null,
    ): Shop = call(
        "/shops/$id",
        method = "PATCH",
        body = buildJsonObject {
            if (name != null) put("name", name)
            if (address != null) put("address", address)
            if (phone != null) put("phone", phone)
            if (businessHours != null) {
                put(
                    "businessHours",
                    kotlinx.serialization.json.JsonObject(
                        businessHours.mapValues { (_, v) ->
                            buildJsonObject {
                                if (v.closed == true) put("closed", true)
                                v.open?.let { put("open", it) }
                                v.close?.let { put("close", it) }
                            }
                        },
                    ),
                )
            }
        },
    )

    /** Saa za kazi, likizo na hali ya kufunguka kwa sasa. */
    suspend fun shopSchedule(id: String): ShopSchedule = call("/shops/$id/schedule")

    suspend fun shopHolidays(id: String): List<ShopHoliday> =
        call<ShopHolidaysResponse>("/shops/$id/holidays").data

    suspend fun addShopHoliday(id: String, date: String, reason: String?): ShopHoliday =
        call("/shops/$id/holidays", method = "POST", body = jsonObj("date" to date, "reason" to reason))

    suspend fun removeShopHoliday(id: String, holidayId: String): JsonObject =
        call("/shops/$id/holidays/$holidayId", method = "DELETE")

    /** PNG ya QR ya duka — tayari kupakuliwa/kuchapishwa. */
    suspend fun shopQrPng(id: String): ByteArray =
        callBytes("/shops/$id/qr", query = mapOf("format" to "png"))

    // ── Ukuaji ────────────────────────────────────────────────
    suspend fun missionsToday(): MissionToday = call("/missions/today")

    suspend fun completeMission(id: String): JsonObject =
        call("/missions/$id/complete", method = "POST", body = jsonObj("note" to "Imekamilika"))

    suspend fun coins(): CoinBalance = call("/coins/balance")

    suspend fun restockSuggestions(): List<RestockSuggestion> = call("/growth/restock-suggestions")

    suspend fun priceSuggestions(): List<PriceSuggestion> = call("/growth/price-suggestions")

    suspend fun streaks(): StreakInfo = call("/growth/streaks")

    suspend fun assistant(message: String, locale: String): JsonObject =
        call("/growth/assistant/chat", method = "POST", body = jsonObj("message" to message, "locale" to locale))

    // ── Taarifa / plans ───────────────────────────────────────
    suspend fun notifications(): Page<NotificationItem> =
        call("/notifications", query = mapOf("limit" to "30"))

    suspend fun markAllRead(): JsonObject =
        call("/notifications/read-all", method = "PATCH", body = jsonObj())

    suspend fun plans(): List<Plan> = call("/plans", auth = false)

    suspend fun appConfig(): JsonObject = call("/app/config", auth = false)

    // ── Ankara (Invoices) ─────────────────────────────────────
    suspend fun invoices(
        status: String? = null,
        q: String? = null,
        limit: Int = 50,
    ): InvoiceList = call(
        "/invoices",
        query = mapOf(
            "status" to status,
            "q" to q,
            "limit" to limit.toString(),
        ),
    )

    suspend fun invoiceSummary(): InvoiceSummary = call("/invoices/summary")

    suspend fun invoice(id: String): InvoiceDoc = call("/invoices/$id")

    suspend fun createInvoice(payload: JsonObject): InvoiceDoc =
        call("/invoices", method = "POST", body = payload)

    suspend fun updateInvoice(id: String, payload: JsonObject): InvoiceDoc =
        call("/invoices/$id", method = "PATCH", body = payload)

    suspend fun sendInvoice(id: String): InvoiceDoc =
        call("/invoices/$id/send", method = "POST", body = jsonObj())

    suspend fun payInvoice(id: String, amount: String, method: String = "CASH"): InvoiceDoc =
        call(
            "/invoices/$id/payments",
            method = "POST",
            // Tuma namba tupu: koma za "2,500.00" zinavunja validation ya backend.
            body = jsonObj(
                "amount" to (amount.replace(",", "").trim().toDoubleOrNull() ?: 0.0),
                "method" to method,
            ),
        )

    suspend fun voidInvoice(id: String): InvoiceDoc =
        call("/invoices/$id/void", method = "POST", body = jsonObj())

    suspend fun deleteInvoice(id: String): JsonObject =
        call("/invoices/$id", method = "DELETE")

    suspend fun invoicePdf(id: String, template: String): ByteArray =
        callBytes("/invoices/$id/pdf", mapOf("template" to template))

    suspend fun invoiceFromSale(saleId: String): InvoiceDoc =
        call("/invoices/from-sale/$saleId", method = "POST", body = jsonObj())

    // ── Exports (PDF/CSV/XLSX/JSON) ───────────────────────────
    suspend fun createExport(
        type: String,
        format: String = "xlsx",
        from: String? = null,
        to: String? = null,
        shopId: String? = null,
    ): ExportJob = call(
        "/exports",
        method = "POST",
        body = jsonObj(
            "type" to type,
            "format" to format,
            "from" to from,
            "to" to to,
            "shopId" to shopId,
        ),
    )

    suspend fun exportJob(id: String): ExportJob = call("/exports/$id")

    suspend fun exports(limit: Int = 20): ExportList =
        call("/exports", query = mapOf("limit" to limit.toString()))

    suspend fun downloadExport(id: String): ByteArray = callBytes("/exports/$id/download")

    /** Lebo za barcode za bidhaa (PDF). */
    suspend fun productLabelsPdf(
        ids: String? = null,
        size: String = "40x30",
        format: String = "code128",
        copies: Int = 1,
    ): ByteArray = callBytes(
        "/products/labels",
        mapOf(
            "ids" to ids,
            "size" to size,
            "format" to format,
            "copies" to copies.toString(),
        ),
    )

    /** Bidhaa zote kama faili (xlsx/csv) — download ya moja kwa moja. */
    suspend fun productExportFile(format: String = "xlsx"): ByteArray =
        callBytes("/products/export", mapOf("format" to format))

    /** Template ya CSV ya ku-import bidhaa. */
    suspend fun productImportTemplate(): ByteArray =
        callBytes("/products/import/template")

    /** Risiti ya mauzo kama PDF. */
    suspend fun receiptPdf(saleId: String, width: Int = 80): ByteArray =
        callBytes("/sales/$saleId/receipt", mapOf("format" to "pdf", "width" to width.toString()))
}
