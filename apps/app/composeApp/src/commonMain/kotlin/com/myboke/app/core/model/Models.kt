package com.myboke.app.core.model

import com.myboke.app.core.util.Money

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class AuthTokens(
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val tokenType: String? = null,
    val expiresIn: Long? = null,
    val consent: Boolean? = null,
    val demo: Boolean? = null,
    val businessName: String? = null,
    val expiresAt: String? = null,
)

@Serializable
data class Me(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val locale: String = "sw",
    val avatarUrl: String? = null,
    val isVerified: Boolean = false,
    val memberships: List<Membership> = emptyList(),
)

@Serializable
data class Membership(
    val id: String,
    val businessId: String,
    val role: String = "CASHIER",
    val shopIds: List<String> = emptyList(),
    val business: Business? = null,
)

@Serializable
data class Business(
    val id: String,
    val name: String,
    val currency: String = "TZS",
    val tin: String? = null,
    val vatEnabled: Boolean = false,
    val vatNumber: String? = null,
    val shops: List<Shop> = emptyList(),
    val subscription: Subscription? = null,
)

@Serializable
data class Subscription(
    val id: String? = null,
    val planId: String? = null,
    val status: String? = null,
    val endsAt: String? = null,
    val plan: Plan? = null,
)

@Serializable
data class Plan(
    val id: String,
    val name: String,
    val priceMonthly: String? = null,
    val maxShops: Int? = null,
    val maxSellers: Int? = null,
    val maxProducts: Int? = null,
)

@Serializable
data class Shop(
    val id: String,
    val name: String,
    val address: String? = null,
    val phone: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val isActive: Boolean = true,
    val qrToken: String? = null,
    val businessHours: Map<String, BusinessHours>? = null,
)

@Serializable
data class BusinessHours(
    val open: String? = null,
    val close: String? = null,
    val closed: Boolean? = null,
)

@Serializable
data class ShopDayHours(
    val open: String? = null,
    val close: String? = null,
    val closed: Boolean? = null,
) {
    val label: String get() = if (closed == true) "—" else "${open ?: "08:00"} – ${close ?: "20:00"}"
}

@Serializable
data class ShopHoliday(
    val id: String,
    val date: String,
    val reason: String? = null,
)

@Serializable
data class ShopSchedule(
    val shopId: String,
    val day: String = "",
    val isOpen: Boolean = false,
    val reason: String? = null,
    val today: ShopDayHours? = null,
    val hours: Map<String, ShopDayHours> = emptyMap(),
    val upcomingHolidays: List<ShopHoliday> = emptyList(),
)

@Serializable
data class Product(
    val id: String,
    val name: String,
    val barcode: String? = null,
    val sku: String? = null,
    val buyingPrice: String = "0.00",
    val sellingPrice: String = "0.00",
    val alertLevel: Int = 5,
    val unitType: String = "PCS",
    val unitSymbol: String = "pcs",
    val categoryId: String? = null,
    val category: Category? = null,
    val supplierId: String? = null,
    val imageUrl: String? = null,
    val hasExpiry: Boolean = false,
    val expiryDate: String? = null,
    val isActive: Boolean = true,
    val variantLabel: String? = null,
    val stock: List<StockLevel> = emptyList(),
) {
    val stockQuantity: Double
        get() = stock.sumOf { Money.parse(it.quantity) }

    val profitPerUnit: Double
        get() = Money.parse(sellingPrice) - Money.parse(buyingPrice)
}

@Serializable
data class StockLevel(
    val id: String? = null,
    val shopId: String? = null,
    val productId: String? = null,
    val quantity: String = "0",
)

@Serializable
data class Category(
    val id: String,
    val name: String,
)

@Serializable
data class Customer(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val notes: String? = null,
    val creditLimit: String? = null,
    val loyaltyPoints: Int = 0,
    val birthday: String? = null,
    val debts: List<Debt> = emptyList(),
) {
    val outstanding: Double
        get() = debts
            .filter { it.status != "PAID" }
            .sumOf {
                Money.parse(it.originalAmount) -
                    Money.parse(it.paidAmount)
            }
}

@Serializable
data class Debt(
    val id: String,
    val type: String = "OWE_ME",
    val personName: String,
    val personPhone: String? = null,
    val originalAmount: String = "0.00",
    val paidAmount: String = "0.00",
    val description: String? = null,
    val dueDate: String? = null,
    val status: String = "OPEN",
    val customerId: String? = null,
    val customer: CustomerRef? = null,
) {
    val remaining: Double
        get() = Money.parse(originalAmount) - Money.parse(paidAmount)
}

@Serializable
data class CustomerRef(
    val id: String,
    val name: String,
    val phone: String? = null,
)

@Serializable
data class Sale(
    val id: String,
    val receiptNo: String = "",
    val total: String = "0.00",
    val subtotal: String = "0.00",
    val discount: String = "0.00",
    val profit: String = "0.00",
    val saleDate: String = "",
    val paymentMethod: String = "CASH",
    val status: String = "COMPLETED",
    val customerId: String? = null,
    val items: List<SaleItem> = emptyList(),
    val payments: List<Payment> = emptyList(),
    val efdReceiptNo: String? = null,
    val efdVerificationCode: String? = null,
)

@Serializable
data class SaleItem(
    val id: String? = null,
    val productId: String? = null,
    val name: String = "",
    val quantity: String = "1",
    val price: String = "0.00",
    val lineTotal: String = "0.00",
    val costPrice: String? = null,
)

@Serializable
data class Payment(
    val id: String? = null,
    val method: String = "CASH",
    val amount: String = "0.00",
    val reference: String? = null,
    val paidAt: String? = null,
)

@Serializable
data class Page<T>(
    val data: List<T> = emptyList(),
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
)

@Serializable
data class Dashboard(
    val today: PeriodTotals = PeriodTotals(),
    val month: PeriodTotals = PeriodTotals(),
    val debts: DebtTotals = DebtTotals(),
    val stock: StockTotals = StockTotals(),
    val trend: List<TrendPoint> = emptyList(),
    val recentSales: List<RecentSale> = emptyList(),
)

@Serializable
data class PeriodTotals(
    val salesCount: Int = 0,
    val revenue: String = "0.00",
    val profit: String = "0.00",
    val expenses: String = "0.00",
    val netProfit: String = "0.00",
    val marginPercent: Double = 0.0,
)

@Serializable
data class DebtTotals(
    val oweMe: String = "0.00",
    val iOwe: String = "0.00",
    val overdue: String = "0.00",
)

@Serializable
data class StockTotals(
    val products: Int = 0,
    val trackedItems: Int = 0,
    val lowStock: Int = 0,
    val outOfStock: Int = 0,
)

@Serializable
data class TrendPoint(
    val date: String = "",
    val revenue: String = "0.00",
    val profit: String = "0.00",
)

@Serializable
data class RecentSale(
    val id: String,
    val receiptNo: String = "",
    val total: String = "0.00",
    val profit: String = "0.00",
    val saleDate: String = "",
    val itemCount: Int = 0,
    val firstItem: String? = null,
)

@Serializable
data class Expense(
    val id: String,
    val name: String,
    val amount: String = "0.00",
    val category: String = "OTHER",
    val date: String = "",
    val notes: String? = null,
    val isRecurring: Boolean = false,
    val recurEvery: String? = null,
    val shopId: String? = null,
)

@Serializable
data class Mission(
    val id: String,
    val type: String = "",
    val title: String = "",
    val description: String? = null,
    val coinsReward: Int = 0,
    val status: String = "PENDING",
    val dueAt: String? = null,
)

@Serializable
data class MissionToday(
    val missions: List<Mission> = emptyList(),
    val coins: CoinBalance? = null,
)

@Serializable
data class CoinBalance(
    val balance: Int = 0,
    val earned: Int = 0,
    val spent: Int = 0,
    val currency: String = "gold",
)

@Serializable
data class AlertItem(
    val productId: String? = null,
    val productName: String? = null,
    val shopName: String? = null,
    val quantity: String? = null,
    val alertLevel: Int? = null,
    val outOfStock: Boolean = false,
)

@Serializable
data class StockAlert(
    val productId: String,
    val name: String = "",
    val unit: String = "pcs",
    val total: String = "0",
    val alertLevel: Int = 0,
    val severity: String = "LOW",
    val shopId: String? = null,
)

@Serializable
data class ExpiringProduct(
    val productId: String,
    val productName: String = "",
    val expiryDate: String = "",
    val daysLeft: Int = 0,
    val expired: Boolean = false,
    val quantity: String = "0",
    val alert: String = "OK",
)

@Serializable
data class ExpiringResponse(
    val days: Int = 30,
    val total: Int = 0,
    val expired: Int = 0,
    val critical: Int = 0,
    val atRiskValue: String = "0.00",
    val data: List<ExpiringProduct> = emptyList(),
)

@Serializable
data class RestockSuggestion(
    val productId: String = "",
    val name: String = "",
    val currentStock: String = "0",
    val suggestedQuantity: String = "0",
    val reason: String? = null,
)

@Serializable
data class PriceSuggestion(
    val productId: String = "",
    val name: String = "",
    val currentPrice: String = "0.00",
    val suggestedPrice: String = "0.00",
    val reason: String? = null,
)

@Serializable
data class StreakInfo(
    val current: Int = 0,
    val longest: Int = 0,
    val badges: List<String> = emptyList(),
)

@Serializable
data class TopProduct(
    val productId: String? = null,
    val name: String = "",
    val quantity: String = "0",
    val revenue: String = "0.00",
)

@Serializable
data class TopCustomer(
    val customerId: String? = null,
    val name: String = "",
    val phone: String? = null,
    val orders: Int = 0,
    val revenue: String = "0.00",
    val averageBasket: String = "0.00",
)

@Serializable
data class CashFlow(
    val from: String = "",
    val to: String = "",
    val inflow: String = "0.00",
    val outflow: String = "0.00",
    val net: String = "0.00",
    val breakdown: List<CashFlowLine> = emptyList(),
    val daily: List<CashFlowDay> = emptyList(),
)

@Serializable
data class CashFlowDay(
    val date: String = "",
    val `in`: String = "0.00",
    val out: String = "0.00",
    val net: String = "0.00",
)

@Serializable
data class CashFlowLine(
    val label: String = "",
    val type: String = "IN",
    val amount: String = "0.00",
)

@Serializable
data class SalesTotals(
    val count: Int = 0,
    val revenue: String = "0.00",
    val profit: String = "0.00",
    val averageSale: String = "0.00",
)

@Serializable
data class SalesReport(
    val totals: SalesTotals = SalesTotals(),
)

@Serializable
data class ProfitReport(
    val revenue: String = "0.00",
    val costOfGoods: String = "0.00",
    val grossProfit: String = "0.00",
    val expenses: String = "0.00",
    val netProfit: String = "0.00",
    val marginPercent: Double = 0.0,
    val isLoss: Boolean = false,
)

@Serializable
data class BreakEven(
    val breakEvenRevenue: String = "0.00",
    val fixedCosts: String = "0.00",
    val marginPercent: Double = 0.0,
    val currentRevenue: String = "0.00",
    val reached: Boolean = false,
)

@Serializable
data class ApiProblem(
    val statusCode: Int? = null,
    val code: String? = null,
    @SerialName("message") val messageRaw: String? = null,
    val error: String? = null,
    val title: String? = null,
    val detail: JsonElement? = null,
)

@Serializable
data class NotificationItem(
    val id: String,
    val type: String = "",
    val title: String = "",
    val body: String = "",
    val readAt: String? = null,
    val createdAt: String = "",
)

@Serializable
data class HeldSale(
    val id: String,
    val label: String = "",
    val payload: String? = null,
    val createdAt: String = "",
)

// ═════════════════════════════════════════════════════════════
// ANKARA (Invoice) — business → customer
// ═════════════════════════════════════════════════════════════

@Serializable
data class InvoiceLine(
    val id: String? = null,
    val productId: String? = null,
    val description: String = "",
    val quantity: String = "0",
    val unitPrice: String = "0",
    val lineTotal: String = "0",
)

@Serializable
data class InvoiceDoc(
    val id: String,
    val number: String = "",
    val customerId: String? = null,
    val customerName: String = "",
    val customerPhone: String? = null,
    val customerAddress: String? = null,
    val status: String = "DRAFT",
    val template: String = "modern",
    val issueDate: String = "",
    val dueDate: String? = null,
    val subtotal: String = "0.00",
    val discount: String = "0.00",
    val taxRate: String = "0.00",
    val taxAmount: String = "0.00",
    val total: String = "0.00",
    val amountPaid: String = "0.00",
    val balance: String = "0.00",
    val currency: String = "TZS",
    val notes: String? = null,
    val terms: String? = null,
    val items: List<InvoiceLine> = emptyList(),
) {
    val totalValue: Double get() = Money.parse(total)
    val balanceValue: Double get() = Money.parse(balance).takeIf { it > 0 } ?: Money.parse(total) - Money.parse(amountPaid)
    val isOpen: Boolean get() = status != "PAID" && status != "VOID"
}

@Serializable
data class InvoiceMeta(
    val count: Int = 0,
    val outstanding: String = "0.00",
    val overdue: Int = 0,
)

@Serializable
data class InvoiceList(
    val data: List<InvoiceDoc> = emptyList(),
    val meta: InvoiceMeta = InvoiceMeta(),
)

@Serializable
data class InvoiceSummary(
    val count: Int = 0,
    val outstanding: String = "0.00",
    val overdue: String = "0.00",
    val paid: String = "0.00",
    val draft: Int = 0,
)

/** Template za ankara zilizoundwa (zinapatana na backend invoice.util.ts). */
enum class InvoiceTemplate(val key: String) {
    Modern("modern"),
    Classic("classic"),
    Minimal("minimal"),
}

// ═════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════

@Serializable
data class ExportJob(
    val id: String,
    val type: String = "",
    val format: String = "xlsx",
    val status: String = "QUEUED",
    val progress: Int = 0,
    val rowCount: Int? = null,
    val fileName: String? = null,
    val error: String? = null,
    val url: String? = null,
    val createdAt: String = "",
)

@Serializable
data class ExportList(
    val data: List<ExportJob> = emptyList(),
    val count: Int = 0,
)


@Serializable
data class ShopHolidaysResponse(
    val shopId: String? = null,
    val data: List<ShopHoliday> = emptyList(),
)
