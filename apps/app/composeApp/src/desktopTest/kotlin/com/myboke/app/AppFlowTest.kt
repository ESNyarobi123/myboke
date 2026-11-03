package com.myboke.app

import com.myboke.app.core.data.AppState
import com.myboke.app.core.i18n.Lang
import com.myboke.app.core.model.InvoiceTemplate
import com.myboke.app.core.util.Money
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Mtihani wa mifereji ya biashara (bila UI): cart, malipo, madeni, gharama, maduka.
 * Unatumia hali ya demo ya nje ya mtandao — hakuna backend inayohitajika.
 */
class AppFlowTest {

    private fun demo(): AppState =
        AppState(CoroutineScope(Dispatchers.Unconfined)).also { it.enterOfflineDemo() }

    @Test
    fun demo_seeds_products_customers_debts_and_sales() {
        val s = demo()
        assertTrue(s.products.isNotEmpty(), "Bidhaa za demo zinapaswa kuwepo")
        assertTrue(s.customers.isNotEmpty(), "Wateja wa demo wanapaswa kuwepo")
        assertTrue(s.debts.isNotEmpty(), "Madeni ya demo yanapaswa kuwepo")
        assertTrue(s.dashboard?.recentSales?.isNotEmpty() == true, "Mauzo ya demo yanapaswa kuwepo")
        assertTrue(s.dashboard != null, "Dashibodi inapaswa kupakiwa")
    }


    @Test
    fun invoice_creation_computes_vat_and_balance_offline() = runBlocking {
        val s = demo()
        s.createInvoice(
            customerName = "Bi. Asha",
            customerPhone = "0712111222",
            customerAddress = null,
            dueDate = "2026-11-20",
            discount = "1000",
            taxRate = "18",
            template = InvoiceTemplate.Classic,
            lines = listOf(
                Triple("Unga wa Sembe 1kg", 3.0, 2400.0),
                Triple("Sukari 1kg", 2.0, 3200.0),
            ),
        )
        delay(500)
        val doc = s.invoices.first()
        assertEquals("Bi. Asha", doc.customerName)
        assertEquals("13,600.00", doc.subtotal, "Subtotal ya bidhaa mbili")
        assertEquals("14,868.00", doc.total, "Subtotal 13600 − 1000 + VAT 18%")
        assertEquals("classic", doc.template)
        assertEquals(2, doc.items.size)
        assertTrue(doc.balanceValue > 0)
    }

    @Test
    fun invoice_payment_updates_status_and_balance() = runBlocking {
        val s = demo()
        s.createInvoice(
            customerName = "Juma",
            customerPhone = null,
            customerAddress = null,
            dueDate = null,
            discount = "0",
            taxRate = "0",
            template = InvoiceTemplate.Modern,
            lines = listOf(Triple("Sukari 1kg", 2.0, 3200.0)),
        )
        delay(400)
        val draft = s.invoices.first()
        s.payInvoice(draft, "6400")
        delay(200)
        val paid = s.invoices.first()
        assertEquals("PAID", paid.status)
        assertEquals(0.0, paid.balanceValue)
        assertEquals("6,400.00", paid.amountPaid)
    }

    @Test
    fun demo_seeds_designed_invoice_samples() {
        val s = demo()
        assertTrue(s.invoices.size >= 3, "Ankara za mfano zinapaswa kuwepo")
        assertTrue(s.invoices.any { it.template == "modern" })
        assertTrue(s.invoices.any { it.template == "classic" })
        assertTrue(s.invoices.any { it.template == "minimal" })
        assertNotNull(s.invoiceSummary)
        assertTrue(s.invoiceSummary!!.count >= 3)
    }

    @Test
    fun offline_export_is_blocked_with_clear_message() {
        val s = demo()
        s.exportData("sales", "csv")
        assertTrue(s.snackbar?.isNotBlank() == true, "Offline export inatoa ujumbe")
    }

    @Test
    fun cart_totals_apply_quantity_and_discount() {
        val s = demo()
        val a = s.products[0]
        val b = s.products[1]
        s.addToCart(a)
        s.addToCart(a)
        s.addToCart(b)

        val expectedSubtotal = (a.sellingPrice.toDouble() * 2) + b.sellingPrice.toDouble()
        assertEquals(2, s.cartCount)
        assertEquals(expectedSubtotal, s.cartSubtotal, 0.01)

        s.setQuantity(a.id, 3.0)
        assertEquals(3.0, s.cart.first { it.product.id == a.id }.quantity)

        s.discountInput = "500"
        assertEquals(500.0, s.cartDiscount, 0.01)
        assertEquals(s.cartSubtotal - 500.0, s.cartTotal, 0.01)

        s.removeFromCart(b.id)
        assertEquals(1, s.cartCount)
        s.clearCart()
        assertEquals(0, s.cartCount)
        assertEquals(0.0, s.cartTotal, 0.01)
    }

    @Test
    fun checkout_produces_receipt_and_clears_cart() = runBlocking<Unit> {
        val s = demo()
        s.addToCart(s.products[0])
        s.addToCart(s.products[1])
        val total = s.cartTotal

        var produced: String? = null
        s.checkout { produced = it.receiptNo }
        delay(900)

        val sale = s.lastSale
        assertNotNull(sale, "Risiti inapaswa kuundwa")
        assertEquals(0, s.cartCount, "Cart inapaswa kusafishwa baada ya malipo")
        assertEquals(Money.format(total, 2), sale.total)
        assertEquals(2, sale.items.size)
        assertNotNull(produced)
    }

    @Test
    fun customer_debt_payment_updates_outstanding() {
        val s = demo()
        val debt = s.debts.first()
        val before = debt.remaining
        s.payDebt(debt.id, "1000")
        val after = s.debts.first { it.id == debt.id }
        assertTrue(after.remaining < before, "Salio linapaswa kupungua")
        assertEquals("PARTIAL", after.status)
    }

    @Test
    fun expense_shop_and_customer_creation_work_offline() {
        val s = demo()
        val expensesBefore = s.expenses.size
        val shopsBefore = s.shops.size
        val customersBefore = s.customers.size

        s.addExpense(name = "Umeme", amount = "25000", category = "UTILITIES", isRecurring = false) {}
        s.addShop(name = "Duka la Pili", address = "Kariakoo") {}
        s.addCustomer("Juma Mwinyi", "0713000111") {}

        assertEquals(expensesBefore + 1, s.expenses.size)
        assertEquals(shopsBefore + 1, s.shops.size)
        assertEquals(customersBefore + 1, s.customers.size)
    }

    @Test
    fun language_and_theme_preferences_toggle() {
        val s = demo()
        s.switchLang(Lang.EN)
        assertEquals(Lang.EN, s.lang)
        s.switchLang(Lang.SW)
        assertEquals(Lang.SW, s.lang)

        val before = s.dark
        s.toggleDark()
        assertTrue(s.dark != before)
        s.toggleDark()
    }

    @Test
    fun money_plain_is_safe_for_api_payloads() {
        // Backend hukagua `^\d{1,15}(\.\d{1,2})?$` — koma huvunja validation.
        assertEquals("2500.00", Money.plain(2500.0, 2))
        assertEquals("1234567.50", Money.plain(1_234_567.5, 2))
        assertEquals("0.00", Money.plain(0.0, 2))
        assertTrue(!Money.plain(9200.0).contains(","))
        val regex = Regex("""^\d{1,15}(\.\d{1,2})?$""")
        assertTrue(regex.matches(Money.plain(9200.0)))
    }

    @Test
    fun invoice_rejects_empty_item_lines_without_calling_api() = runBlocking<Unit> {
        val s = demo()
        val before = s.invoices.size
        // Mistari yenye bei 0/idadi 0 huchujwa; hakuna items → lazima isitume ombi ovu.
        s.createInvoice(
            customerName = "Mteja",
            customerPhone = null,
            customerAddress = null,
            dueDate = null,
            discount = "0",
            taxRate = "0",
            template = InvoiceTemplate.Modern,
            lines = listOf(Triple("", 1.0, 0.0)),
        )
        delay(300)
        assertEquals(before, s.invoices.size, "Hakuna ankara tupu inayopaswa kuundwa")
        assertTrue(s.snackbar?.isNotBlank() == true, "Mtumiaji anapewa ujumbe wa kueleweka")
    }

    @Test
    fun invoice_line_view_keeps_raw_editable_text() {
        // Fomu hutumia maandishi ghafi; hii inazuia `2500` kugeuka `25,025,000`
        // wakati wa kufomati kwa koma kila herufi.
        val line = com.myboke.app.ui.screens.invoices.InvoiceLineView(
            description = "Sukari 1kg",
            quantity = 1.5,
            unitPrice = 2500.0,
        )
        assertEquals("1.5", line.qtyText)
        assertEquals("2,500", line.priceText)
        assertEquals(1.5, line.quantity)
        assertEquals(2500.0, line.unitPrice)
    }
}
