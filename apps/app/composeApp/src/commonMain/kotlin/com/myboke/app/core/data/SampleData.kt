package com.myboke.app.core.data

import com.myboke.app.core.model.InvoiceDoc
import com.myboke.app.core.model.InvoiceLine

import com.myboke.app.core.model.CoinBalance
import com.myboke.app.core.model.Category
import com.myboke.app.core.model.Customer
import com.myboke.app.core.model.Dashboard
import com.myboke.app.core.model.Debt
import com.myboke.app.core.model.Expense
import com.myboke.app.core.model.Mission
import com.myboke.app.core.model.MissionToday
import com.myboke.app.core.model.PeriodTotals
import com.myboke.app.core.model.Product
import com.myboke.app.core.model.RecentSale
import com.myboke.app.core.model.Shop
import com.myboke.app.core.model.StockLevel
import com.myboke.app.core.model.StockTotals
import com.myboke.app.core.model.DebtTotals
import com.myboke.app.core.model.TrendPoint
import com.myboke.app.core.util.Dates

/**
 * Data ya mfano — hutumika kwenye hali ya offline/demo ili app ionekane
 * kamili bila backend (na kwa screenshot tests).
 */
object SampleData {
    val shops = listOf(
        Shop(id = "shop-1", name = "Duka Kuu — Kariakoo", address = "Kariakoo, Dar es Salaam", phone = "0712345678"),
        Shop(id = "shop-2", name = "Tawi la Mwenge", address = "Mwenge, Dar es Salaam", phone = "0765432109"),
    )

    // Makundi ya bidhaa (categories)
    private val catVinywaji = Category("cat-1", "Vinywaji")
    private val catNafaka = Category("cat-2", "Nafaka")
    private val catMafuta = Category("cat-3", "Mafuta & Viungo")
    private val catUsafi = Category("cat-4", "Usafi")
    private val catMayai = Category("cat-5", "Mayai & Mkate")
    private val catNyumbani = Category("cat-6", "Nyumbani")

    val products = listOf(
        Product("p1", "Coca-Cola 500ml", "5449000000996", sku = "VIN-001", buyingPrice = "1200.00", sellingPrice = "1800.00", alertLevel = 12, unitType = "BOTTLE", unitSymbol = "chupa", categoryId = "cat-1", category = catVinywaji, stock = listOf(StockLevel(quantity = "48"))),
        Product("p2", "Unga wa Sembe 1kg", sku = "NAF-001", buyingPrice = "1900.00", sellingPrice = "2400.00", alertLevel = 10, unitType = "KG", unitSymbol = "kg", categoryId = "cat-2", category = catNafaka, stock = listOf(StockLevel(quantity = "84"))),
        Product("p3", "Sukari 1kg", "6001234500012", sku = "NAF-002", buyingPrice = "2800.00", sellingPrice = "3200.00", alertLevel = 15, unitType = "KG", unitSymbol = "kg", categoryId = "cat-2", category = catNafaka, stock = listOf(StockLevel(quantity = "9"))),
        Product("p4", "Mafuta ya Kupikia 1L", sku = "MAF-001", buyingPrice = "4200.00", sellingPrice = "5500.00", alertLevel = 8, unitType = "LITRE", unitSymbol = "lita", categoryId = "cat-3", category = catMafuta, stock = listOf(StockLevel(quantity = "23"))),
        Product("p5", "Sabuni ya Kufulia 1kg", sku = "USA-001", buyingPrice = "1800.00", sellingPrice = "2500.00", alertLevel = 6, unitType = "PACK", unitSymbol = "pakiti", categoryId = "cat-4", category = catUsafi, stock = listOf(StockLevel(quantity = "31"))),
        Product("p6", "Chai ya Majani 100g", sku = "VIN-002", buyingPrice = "1200.00", sellingPrice = "2000.00", alertLevel = 10, unitType = "PACK", unitSymbol = "pakiti", categoryId = "cat-1", category = catVinywaji, stock = listOf(StockLevel(quantity = "52"))),
        Product("p7", "Maziwa Fresh 500ml", sku = "VIN-003", buyingPrice = "1400.00", sellingPrice = "2000.00", alertLevel = 12, unitType = "BOTTLE", unitSymbol = "chupa", categoryId = "cat-1", category = catVinywaji, stock = listOf(StockLevel(quantity = "0")), hasExpiry = true, expiryDate = "2026-11-06T00:00:00.000Z"),
        Product("p8", "Mayai (trei)", sku = "MAY-001", buyingPrice = "9000.00", sellingPrice = "11500.00", alertLevel = 4, unitType = "TRAY", unitSymbol = "trei", categoryId = "cat-5", category = catMayai, stock = listOf(StockLevel(quantity = "14"))),
        Product("p9", "Battery AA (pair)", sku = "NYU-001", buyingPrice = "600.00", sellingPrice = "1000.00", alertLevel = 20, unitType = "PAIR", unitSymbol = "pair", categoryId = "cat-6", category = catNyumbani, stock = listOf(StockLevel(quantity = "120"))),
        Product("p10", "Mkate wa mkono", sku = "MAY-002", buyingPrice = "800.00", sellingPrice = "1200.00", alertLevel = 15, unitType = "PCS", unitSymbol = "kimoja", categoryId = "cat-5", category = catMayai, stock = listOf(StockLevel(quantity = "18")), hasExpiry = true, expiryDate = "2026-11-03T00:00:00.000Z"),
        Product("p11", "Vimto 500ml", sku = "VIN-004", buyingPrice = "1500.00", sellingPrice = "2200.00", alertLevel = 10, unitType = "BOTTLE", unitSymbol = "chupa", categoryId = "cat-1", category = catVinywaji, stock = listOf(StockLevel(quantity = "7"))),
        Product("p12", "Mchele 1kg", sku = "NAF-003", buyingPrice = "2600.00", sellingPrice = "3300.00", alertLevel = 10, unitType = "KG", unitSymbol = "kg", categoryId = "cat-2", category = catNafaka, stock = listOf(StockLevel(quantity = "40"))),
    )

    val customers = listOf(
        Customer("c1", "Mama Salma", "0713000001", creditLimit = "80000.00", loyaltyPoints = 120, debts = listOf(Debt("d1", "OWE_ME", "Mama Salma", "0713000001", "32000.00", "10000.00", status = "PARTIAL"))),
        Customer("c2", "Juma Hassan", "0713000002", creditLimit = "50000.00", loyaltyPoints = 65, debts = listOf(Debt("d2", "OWE_ME", "Juma Hassan", "0713000002", "18000.00", "0.00", dueDate = "2026-10-25T00:00:00.000Z", status = "OVERDUE"))),
        Customer("c3", "Neema Peter", "0713000003", loyaltyPoints = 240),
        Customer("c4", "Baba Amina", "0713000004", creditLimit = "120000.00", loyaltyPoints = 45),
        Customer("c5", "Khidir Mwinyi", "0713000005", loyaltyPoints = 12),
    )

    val debts = listOf(
        Debt("d1", "OWE_ME", "Mama Salma", "0713000001", "32000.00", "10000.00", description = "Mkopo wa unga na sukari", dueDate = "2026-11-08T00:00:00.000Z", status = "PARTIAL", customerId = "c1"),
        Debt("d2", "OWE_ME", "Juma Hassan", "0713000002", "18000.00", "0.00", description = "Vinywaji kwa sherehe", dueDate = "2026-10-25T00:00:00.000Z", status = "OVERDUE", customerId = "c2"),
        Debt("d3", "OWE_ME", "Baba Amina", "0713000004", "45000.00", "45000.00", description = "Oda ya duka la mbali", status = "PAID", customerId = "c4"),
        Debt("d4", "I_OWE", "Mkulima Juma", "0713000009", "60000.00", "20000.00", description = "Malipo ya mzigo wa unga", dueDate = "2026-11-15T00:00:00.000Z", status = "PARTIAL"),
    )

    val expenses = listOf(
        Expense("e1", "Kodi ya duka", "250000.00", "Bills", isRecurring = true, recurEvery = "MONTHLY"),
        Expense("e2", "Umeme (LUKU)", "45000.00", "Bills"),
        Expense("e3", "Usafiri wa mzigo", "18000.00", "Transport"),
        Expense("e4", "Mshahara wa msaidizi", "150000.00", "Fees", isRecurring = true, recurEvery = "MONTHLY"),
        Expense("e5", "Chakula cha mchana", "12000.00", "Food"),
    )

    fun dashboard(): Dashboard {
        val trend = listOf(
            "2026-10-26" to 182000.0, "2026-10-27" to 145000.0, "2026-10-28" to 210000.0,
            "2026-10-29" to 168000.0, "2026-10-30" to 240000.0, "2026-10-31" to 196000.0,
            "2026-11-01" to 268500.0,
        ).map { (d, v) -> TrendPoint(d, v.toString(), (v * 0.32).toString()) }

        return Dashboard(
            today = PeriodTotals(
                salesCount = 24,
                revenue = "268500.00",
                profit = "78920.00",
                expenses = "12000.00",
                netProfit = "66920.00",
                marginPercent = 29.4,
            ),
            month = PeriodTotals(
                salesCount = 486,
                revenue = "5480000.00",
                profit = "1620000.00",
                expenses = "495000.00",
                netProfit = "1125000.00",
                marginPercent = 29.6,
            ),
            debts = DebtTotals(oweMe = "122000.00", iOwe = "60000.00", overdue = "18000.00"),
            stock = StockTotals(products = 12, trackedItems = 12, lowStock = 3, outOfStock = 1),
            trend = trend,
            recentSales = listOf(
                RecentSale("s1", "MB-1042", "14200.00", "4300.00", itemCount = 4, firstItem = "Unga wa Sembe 1kg"),
                RecentSale("s2", "MB-1041", "6800.00", "1900.00", itemCount = 2, firstItem = "Coca-Cola 500ml"),
                RecentSale("s3", "MB-1040", "32500.00", "9800.00", itemCount = 6, firstItem = "Mayai (trei)"),
                RecentSale("s4", "MB-1039", "4100.00", "1200.00", itemCount = 1, firstItem = "Mkate wa mkono"),
                RecentSale("s5", "MB-1038", "11800.00", "3400.00", itemCount = 3, firstItem = "Mafuta ya Kupikia 1L"),
            ),
        )
    }

    fun missions(): MissionToday = MissionToday(
        missions = listOf(
            Mission("m1", "FIRST_SALE", "Uza bidhaa 3 leo", "Anza siku kwa mauzo matatu", 20, "PENDING"),
            Mission("m2", "STOCK_COUNT", "Hesabu stock ya rafu", "Angalia bidhaa 5 zinazoisha", 15, "ACTIVE"),
            Mission("m3", "DEBT_FOLLOW", "Fuatilia deni 1", "Tuma kumbusho kwa mteja mmoja", 10, "COMPLETED"),
        ),
        coins = CoinBalance(balance = 340, earned = 420, spent = 80),
    )

    fun coins(): CoinBalance = CoinBalance(balance = 340, earned = 420, spent = 80)

    fun topProducts() = listOf(
        com.myboke.app.core.model.TopProduct("p2", "Unga wa Sembe 1kg", "142", "340800.00"),
        com.myboke.app.core.model.TopProduct("p1", "Coca-Cola 500ml", "120", "216000.00"),
        com.myboke.app.core.model.TopProduct("p8", "Mayai (trei)", "48", "552000.00"),
        com.myboke.app.core.model.TopProduct("p3", "Sukari 1kg", "96", "307200.00"),
    )

    fun topCustomers() = listOf(
        com.myboke.app.core.model.TopCustomer("c3", "Neema Peter", "0713000003", 28, "412000.00", "14714.00"),
        com.myboke.app.core.model.TopCustomer("c1", "Mama Salma", "0713000001", 21, "356000.00", "16952.00"),
        com.myboke.app.core.model.TopCustomer("c4", "Baba Amina", "0713000004", 14, "289000.00", "20642.00"),
    )

    fun alertCounts(products: List<Product>): Triple<Int, Int, Int> {
        val low = products.count { it.stockQuantity > 0 && it.stockQuantity <= it.alertLevel }
        val out = products.count { it.stockQuantity <= 0 }
        return Triple(low, out, 2)
    }

    fun notifications() = listOf(
        com.myboke.app.core.model.NotificationItem("n1", "DEBT", "Deni limechelewa", "Juma Hassan — TZS 18,000 imechelewa siku 7", null, nowIso()),
        com.myboke.app.core.model.NotificationItem("n2", "STOCK", "Stock ndogo", "Sukari 1kg zimebaki 9 — ongeza kabla ya wikendi", null, nowIso()),
        com.myboke.app.core.model.NotificationItem("n3", "MISSION", "Mission ya leo", "Uza bidhaa 3 upate +20 BokeCoins", null, nowIso()),
    )

    fun nowIso(): String = Dates.isoDate(Dates.now())

    fun cashFlow(): com.myboke.app.core.model.CashFlow = com.myboke.app.core.model.CashFlow(
        inflow = "5480000.00",
        outflow = "1938000.00",
        net = "3542000.00",
        breakdown = listOf(
            com.myboke.app.core.model.CashFlowLine("Mauzo ya bidhaa", "IN", "5260000.00"),
            com.myboke.app.core.model.CashFlowLine("Malipo ya madeni", "IN", "220000.00"),
            com.myboke.app.core.model.CashFlowLine("Gharama za uendeshaji", "OUT", "495000.00"),
            com.myboke.app.core.model.CashFlowLine("Manunuzi ya stock", "OUT", "1383000.00"),
            com.myboke.app.core.model.CashFlowLine("Mishahara", "OUT", "60000.00"),
        ),
    )

    fun invoices(): List<InvoiceDoc> {
        val today = Dates.isoDate(Dates.now())
        return listOf(
            InvoiceDoc(
                id = "local-inv-1",
                number = "INV-2026-0003",
                customerName = "Mama Salma",
                customerPhone = "0713000001",
                customerAddress = "Kariakoo, Dar es Salaam",
                status = "SENT",
                template = "modern",
                issueDate = today,
                dueDate = today,
                subtotal = "16000.00",
                discount = "1000.00",
                taxRate = "18.00",
                taxAmount = "2700.00",
                total = "17700.00",
                balance = "17700.00",
                notes = "Asante kwa biashara yako.",
                items = listOf(
                    InvoiceLine(description = "Unga wa Sembe 1kg", quantity = "4", unitPrice = "2400.00", lineTotal = "9600.00"),
                    InvoiceLine(description = "Sukari 1kg", quantity = "2", unitPrice = "3200.00", lineTotal = "6400.00"),
                ),
            ),
            InvoiceDoc(
                id = "local-inv-2",
                number = "INV-2026-0002",
                customerName = "Juma Hassan",
                customerPhone = "0713000002",
                status = "OVERDUE",
                template = "classic",
                issueDate = today,
                dueDate = today,
                subtotal = "34500.00",
                discount = "0.00",
                taxRate = "0.00",
                taxAmount = "0.00",
                total = "34500.00",
                amountPaid = "10000.00",
                balance = "24500.00",
                items = listOf(
                    InvoiceLine(description = "Mayai (trei)", quantity = "3", unitPrice = "11500.00", lineTotal = "34500.00"),
                ),
            ),
            InvoiceDoc(
                id = "local-inv-3",
                number = "INV-2026-0001",
                customerName = "Neema Peter",
                customerPhone = "0713000003",
                status = "PAID",
                template = "minimal",
                issueDate = today,
                dueDate = today,
                subtotal = "11000.00",
                discount = "0.00",
                taxRate = "0.00",
                taxAmount = "0.00",
                total = "11000.00",
                amountPaid = "11000.00",
                balance = "0.00",
                items = listOf(
                    InvoiceLine(description = "Mafuta ya Kupikia 1L", quantity = "2", unitPrice = "5500.00", lineTotal = "11000.00"),
                ),
            ),
        )
    }

}
