package com.myboke.app.ui.screens.manage

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.EmptyState
import com.myboke.app.core.design.GradientCard
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbChip
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MbTopBar
import com.myboke.app.core.design.MoneyText
import com.myboke.app.core.design.ProgressBar
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money

// ─────────────────────────────────────────────────────────────
// Maduka
// ─────────────────────────────────────────────────────────────

@Composable
fun ShopsScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var adding by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var showQr by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        Column(Modifier.widthIn(max = 640.dp).fillMaxWidth()) {
            MbTopBar(t.shops, onBack = { state.back() }) {
                MbIconButton(
                    MbIcon.Plus,
                    onClick = { adding = !adding },
                    tint = c.onPrimary,
                    background = c.primary,
                )
            }
            Column(Modifier.verticalScroll(rememberScrollState())) {
                if (adding) {
                    MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                        Text(t.shops, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
                        Spacer(Modifier.height(10.dp))
                        MbTextField(name, { name = it }, t.shopName, leadingIcon = MbIcon.Store)
                        Spacer(Modifier.height(10.dp))
                        MbTextField(address, { address = it }, "Mahali")
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            MbButton(t.cancel, { adding = false }, style = MbButtonStyle.Ghost, modifier = Modifier.weight(1f))
                            MbButton(
                                t.save,
                                {
                                    if (name.trim().length >= 2) {
                                        state.addShop(name.trim(), address.ifBlank { null }) {
                                            adding = false
                                            name = ""
                                            address = ""
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }

                state.shops.forEach { shop ->
                    val active = shop.id == state.activeShop?.id
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.surface)
                            .border(
                                1.4.dp,
                                if (active) c.primary else c.border,
                                RoundedCornerShape(16.dp),
                            )
                            .clickable { state.selectShop(shop) }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).background(c.primary.copy(alpha = 0.09f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            MbIconView(MbIcon.Store, size = 21.dp, tint = c.primary)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(shop.name, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                            Text(
                                shop.address ?: shop.phone ?: "—",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                        if (active) {
                            Box(
                                Modifier.size(24.dp).clip(CircleShape).background(c.primary),
                                contentAlignment = Alignment.Center,
                            ) {
                                MbIconView(MbIcon.Check, size = 13.dp, tint = Color.White)
                            }
                            Spacer(Modifier.width(8.dp))
                        }
                        MbIconButton(
                            MbIcon.Clock,
                            onClick = { state.selectShop(shop); state.navigate(Page.ShopSchedule) },
                            tint = c.textSecondary,
                        )
                    }
                }

                Spacer(Modifier.height(14.dp))
                MbCard(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    background = c.infoBg,
                    bordered = false,
                ) {
                    Row(
                        Modifier.clickable { showQr = true },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(42.dp).clip(RoundedCornerShape(12.dp))
                                .background(c.infoText().copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            MbIconView(MbIcon.Qr, size = 21.dp, tint = c.infoText())
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(t.shop.qrTitle, style = MaterialTheme.typography.titleMedium, color = c.infoText())
                            Text(
                                t.shop.qrSub,
                                style = MaterialTheme.typography.labelSmall,
                                color = c.infoText().copy(alpha = 0.8f),
                            )
                        }
                        MbIconView(MbIcon.ChevronRight, size = 16.dp, tint = c.infoText())
                    }
                }
                Spacer(Modifier.height(10.dp))
                MbButton(
                    t.shop.schedule,
                    onClick = { state.navigate(Page.ShopSchedule) },
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MbButtonStyle.Secondary,
                    icon = MbIcon.Clock,
                    fullWidth = true,
                )
                Spacer(Modifier.height(30.dp))
            }
        }
    }

    if (showQr) {
        ShopQrSheet(state = state, onClose = { showQr = false })
    }
}

// ─────────────────────────────────────────────────────────────
// Gharama
// ─────────────────────────────────────────────────────────────

@Composable
fun ExpensesScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val total = state.expenses.sumOf { Money.parse(it.amount) }
    val recurring = state.expenses.count { it.isRecurring }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 640.dp).fillMaxWidth()) {
            MbTopBar(t.expensesTitle, onBack = { state.back() }) {
                MbIconButton(
                    MbIcon.Plus,
                    onClick = { state.navigate(Page.ExpenseForm) },
                    tint = c.onPrimary,
                    background = c.primary,
                )
            }

            GradientCard(
                colors = listOf(Color(0xFFF59E0B), Color(0xFFDC2626)),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            ) {
                Text(t.expenses.uppercase(), style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f), letterSpacing = 1.sp)
                Spacer(Modifier.height(6.dp))
                MoneyText(total, style = MaterialTheme.typography.displayMedium, color = Color.White)
                Spacer(Modifier.height(6.dp))
                Row {
                    StatusPill("$recurring ${t.recurring}", BadgeTone.Neutral)
                }
            }

            Spacer(Modifier.height(16.dp))

            if (state.expenses.isEmpty()) {
                EmptyState(
                    icon = MbIcon.Wallet,
                    title = t.emptyExpensesTitle,
                    body = t.emptyExpensesBody,
                    actionLabel = t.addExpense,
                    onAction = { state.navigate(Page.ExpenseForm) },
                )
            } else {
                state.expenses.forEach { expense ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(c.surface)
                            .padding(13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(c.warningBg),
                            contentAlignment = Alignment.Center,
                        ) {
                            MbIconView(MbIcon.Wallet, size = 18.dp, tint = c.warningText())
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(expense.name, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                            Text(
                                "${expense.category} · ${expense.date.take(10).ifBlank { Dates.isoDate(Dates.now()) }}",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "TZS ${Money.format(Money.parse(expense.amount), 0)}",
                                style = MaterialTheme.typography.titleMedium,
                                color = c.textPrimary,
                            )
                            if (expense.isRecurring) {
                                StatusPill(t.recurring, BadgeTone.Warning)
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
fun ExpenseFormScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Bills") }
    var recurring by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val categories = listOf("Bills", "Food", "Transport", "Shopping", "Fees", "Others")

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
            MbTopBar(t.addExpense, onBack = { state.back() })
            Column(Modifier.padding(horizontal = 16.dp)) {
                MbTextField(name, { name = it }, t.expenseName, placeholder = "Mf. Umeme wa duka", leadingIcon = MbIcon.Wallet)
                Spacer(Modifier.height(12.dp))
                MbTextField(
                    amount, { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    "${t.amount} *", prefix = "TZS", keyboardType = KeyboardType.Decimal,
                )
                Spacer(Modifier.height(14.dp))
                Text(t.expenseCategory, style = MaterialTheme.typography.labelMedium, color = c.textSecondary)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    categories.forEach { cat ->
                        MbChip(cat, category == cat, { category = cat })
                    }
                }
                Spacer(Modifier.height(14.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(c.surface)
                        .clickable { recurring = !recurring }
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MbIconView(MbIcon.Refresh, size = 18.dp, tint = c.primary)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(t.recurring, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                        Text("Kila mwezi", style = MaterialTheme.typography.labelSmall, color = c.textMuted)
                    }
                    Box(
                        Modifier
                            .size(width = 46.dp, height = 26.dp)
                            .clip(CircleShape)
                            .background(if (recurring) c.primary else c.surface2)
                            .padding(3.dp),
                    ) {
                        Box(
                            Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                                .align(if (recurring) Alignment.CenterEnd else Alignment.CenterStart),
                        )
                    }
                }
                if (error != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(error ?: "", style = MaterialTheme.typography.labelMedium, color = c.danger)
                }
                Spacer(Modifier.height(18.dp))
                MbButton(
                    t.save,
                    onClick = {
                        if (name.trim().length < 2 || Money.parse(amount) <= 0) {
                            error = t.errorBody
                        } else {
                            state.addExpense(name.trim(), amount, category, recurring) { state.back() }
                        }
                    },
                    fullWidth = true,
                    height = 52.dp,
                    icon = MbIcon.Check,
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Deni / Mteja
// ─────────────────────────────────────────────────────────────

@Composable
fun DebtFormScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var type by remember { mutableStateOf("OWE_ME") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var due by remember { mutableStateOf(Dates.isoDate(Dates.now() + 7 * 86_400_000L)) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
            MbTopBar(t.addDebt, onBack = { state.back() })
            Column(Modifier.padding(horizontal = 16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MbChip(t.oweMe, type == "OWE_ME", { type = "OWE_ME" })
                    MbChip(t.iOwe, type == "I_OWE", { type = "I_OWE" })
                }
                Spacer(Modifier.height(14.dp))
                MbTextField(name, { name = it }, "${t.personName} *", leadingIcon = MbIcon.User)
                Spacer(Modifier.height(12.dp))
                MbTextField(phone, { phone = it }, "Simu", keyboardType = KeyboardType.Phone, leadingIcon = MbIcon.Phone)
                Spacer(Modifier.height(12.dp))
                MbTextField(
                    amount, { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    "${t.amount} *", prefix = "TZS", keyboardType = KeyboardType.Decimal,
                )
                Spacer(Modifier.height(12.dp))
                MbTextField(due, { due = it }, t.dueDate, placeholder = "2026-11-15")
                Spacer(Modifier.height(18.dp))
                MbButton(
                    t.save,
                    onClick = {
                        if (name.trim().length >= 2 && Money.parse(amount) > 0) {
                            state.addDebt(type, name.trim(), phone.ifBlank { null }, amount, due) { state.back() }
                        } else {
                            state.showSnack(t.errorBody)
                        }
                    },
                    fullWidth = true,
                    height = 52.dp,
                    icon = MbIcon.Check,
                )
            }
        }
    }
}

@Composable
fun CustomerFormScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
            MbTopBar(t.addCustomer, onBack = { state.back() })
            Column(Modifier.padding(horizontal = 16.dp)) {
                MbTextField(name, { name = it }, "${t.personName} *", leadingIcon = MbIcon.User)
                Spacer(Modifier.height(12.dp))
                MbTextField(phone, { phone = it }, "Simu", keyboardType = KeyboardType.Phone, leadingIcon = MbIcon.Phone)
                Spacer(Modifier.height(18.dp))
                MbButton(
                    t.save,
                    onClick = {
                        if (name.trim().length >= 2) {
                            state.addCustomer(name.trim(), phone.ifBlank { null }) { state.back() }
                        } else {
                            state.showSnack(t.errorBody)
                        }
                    },
                    fullWidth = true,
                    height = 52.dp,
                    icon = MbIcon.Check,
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    "Wateja wanakusaidia kufuatilia madeni na kumpa pointi",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Ukuaji / BokeCoins
// ─────────────────────────────────────────────────────────────

@Composable
fun GrowthScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 640.dp).fillMaxWidth()) {
            MbTopBar(t.coins, onBack = { state.back() })

            GradientCard(
                colors = listOf(Color(0xFF0B37A1), Color(0xFF0269E9), Color(0xFF0A9CBF)),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(50.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.16f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        MbIconView(MbIcon.Coins, size = 26.dp, tint = Color(0xFFFDE68A))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("BALANCE", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f), letterSpacing = 1.sp)
                        Text(
                            "${state.coins.balance}",
                            style = MaterialTheme.typography.displayMedium,
                            color = Color.White,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        StatusPill("${state.coins.earned} earned", BadgeTone.Neutral)
                        Spacer(Modifier.height(4.dp))
                        StatusPill("${state.coins.spent} spent", BadgeTone.Neutral)
                    }
                }
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MbIconView(MbIcon.Flame, size = 16.dp, tint = Color(0xFFFDE68A))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "${t.streaks}: 3 ${t.days}",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.92f),
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "Level 2",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.8f),
                    )
                }
                Spacer(Modifier.height(8.dp))
                ProgressBar(
                    progress = (state.coins.balance / 500f).coerceIn(0f, 1f),
                    color = Color(0xFF73D31C),
                    track = Color.White.copy(alpha = 0.22f),
                    height = 7.dp,
                )
            }

            Spacer(Modifier.height(20.dp))
            SectionHeader(t.missions, modifier = Modifier.padding(horizontal = 16.dp), subtitle = t.todaysMission)
            Spacer(Modifier.height(10.dp))

            if (state.missions.isEmpty()) {
                EmptyState(
                    icon = MbIcon.Target,
                    title = t.missions,
                    body = t.earnCoins,
                )
            } else {
                state.missions.forEach { mission ->
                    val done = mission.status == "COMPLETED"
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.surface)
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp))
                                .background(if (done) c.successBg else c.primary.copy(alpha = 0.09f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            MbIconView(
                                if (done) MbIcon.Check else MbIcon.Target,
                                size = 19.dp,
                                tint = if (done) c.successText() else c.primary,
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(mission.title, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                            Text(
                                mission.description ?: "",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        if (done) {
                            StatusPill(t.done, BadgeTone.Success)
                        } else {
                            Row(
                                Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(c.successBg)
                                    .clickable { state.completeMission(mission) }
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                MbIconView(MbIcon.Coins, size = 13.dp, tint = c.successText())
                                Spacer(Modifier.width(4.dp))
                                Text("+${mission.coinsReward}", style = MaterialTheme.typography.labelMedium, color = c.successText())
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionHeader(t.restockSuggestions, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(10.dp))
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                val low = state.products
                    .filter { it.stockQuantity <= it.alertLevel }
                    .sortedBy { it.stockQuantity }
                    .take(4)
                if (low.isEmpty()) {
                    Text(t.alertNone, style = MaterialTheme.typography.bodyMedium, color = c.textMuted)
                } else {
                    low.forEach { product ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            MbIconView(MbIcon.Warning, size = 16.dp, tint = c.warning)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                product.name,
                                style = MaterialTheme.typography.bodyMedium,
                                color = c.textPrimary,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                "${product.stockQuantity.toInt()} ${product.unitSymbol}",
                                style = MaterialTheme.typography.labelMedium,
                                color = c.warningText(),
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionHeader(t.priceSuggestions, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(10.dp))
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), background = c.infoBg, bordered = false) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MbIconView(MbIcon.TrendingUp, size = 18.dp, tint = c.infoText())
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Bidhaa 2 zinaweza kuongeza bei kwa 5% bila kupunguza mauzo",
                        style = MaterialTheme.typography.bodyMedium,
                        color = c.infoText(),
                    )
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Risiti
// ─────────────────────────────────────────────────────────────

@Composable
fun ReceiptScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val sale = state.lastSale

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 520.dp).fillMaxWidth()) {
            MbTopBar(t.receipt, onBack = { state.back() })
            if (sale == null) {
                EmptyState(
                    icon = MbIcon.Receipt,
                    title = t.receipt,
                    body = t.emptyTitle,
                    actionLabel = t.startSelling,
                    onAction = { state.selectTab(com.myboke.app.core.data.Tab.Sell) },
                )
            } else {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(c.surface)
                        .border(1.dp, c.border, RoundedCornerShape(20.dp))
                        .padding(18.dp),
                ) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            com.myboke.app.core.design.MyBokeLogoBadge(size = 52.dp)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                state.businessName.ifBlank { "MyBoke" },
                                style = MaterialTheme.typography.titleLarge,
                                color = c.textPrimary,
                            )
                            Text(
                                state.activeShop?.name ?: "",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
                    Spacer(Modifier.height(12.dp))
                    ReceiptMeta(t.receipt.uppercase(), sale.receiptNo)
                    ReceiptMeta("Tarehe", sale.saleDate.take(10).ifBlank { Dates.isoDate(Dates.now()) })
                    ReceiptMeta(t.payment, sale.paymentMethod)
                    Spacer(Modifier.height(12.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
                    Spacer(Modifier.height(12.dp))

                    sale.items.forEach { item ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(item.name, style = MaterialTheme.typography.bodyMedium, color = c.textPrimary)
                                Text(
                                    "${item.quantity} × TZS ${Money.format(Money.parse(item.price), 0)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = c.textMuted,
                                )
                            }
                            Text(
                                Money.format(Money.parse(item.lineTotal), 0),
                                style = MaterialTheme.typography.bodyMedium,
                                color = c.textPrimary,
                            )
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
                    Spacer(Modifier.height(10.dp))
                    ReceiptTotal(t.subtotal, Money.parse(sale.subtotal))
                    if (Money.parse(sale.discount) > 0) {
                        ReceiptTotal(t.discount, -Money.parse(sale.discount))
                    }
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(t.total, style = MaterialTheme.typography.labelLarge, color = c.textPrimary)
                        Spacer(Modifier.weight(1f))
                        MoneyText(
                            Money.parse(sale.total),
                            style = MaterialTheme.typography.headlineMedium,
                            color = c.primary,
                        )
                    }
                    Spacer(Modifier.height(14.dp))
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            QrPlaceholder(seed = sale.id.ifBlank { sale.receiptNo }, tint = c.textPrimary)
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Scan kuthibitisha risiti",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    MbButton(
                        t.inv.downloadPdf,
                        { if (sale != null) state.downloadReceiptPdf(sale) },
                        style = MbButtonStyle.Secondary,
                        icon = MbIcon.Download,
                        modifier = Modifier.weight(1f),
                        height = 44.dp,
                    )
                    MbButton(
                        t.inv.fromSale,
                        { if (sale != null) state.invoiceFromSale(sale) },
                        style = MbButtonStyle.Secondary,
                        icon = MbIcon.Doc,
                        modifier = Modifier.weight(1f),
                        height = 44.dp,
                        loading = state.invoiceBusy,
                    )
                }
                Spacer(Modifier.height(10.dp))
                Box(Modifier.padding(horizontal = 16.dp)) {
                    MbButton(
                        t.startSelling,
                        { state.selectTab(com.myboke.app.core.data.Tab.Sell) },
                        fullWidth = true,
                        icon = MbIcon.Cart,
                    )
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
private fun ReceiptMeta(label: String, value: String) {
    val c = MbTheme.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
        Spacer(Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.labelMedium, color = c.textPrimary)
    }
}

@Composable
private fun ReceiptTotal(label: String, value: Double) {
    val c = MbTheme.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = c.textSecondary)
        Spacer(Modifier.weight(1f))
        Text(
            "${if (value < 0) "−" else ""}TZS ${Money.format(kotlin.math.abs(value), 0)}",
            style = MaterialTheme.typography.bodySmall,
            color = c.textSecondary,
        )
    }
}

/** QR ya kuiga yenye pattern thabiti kutoka seed (kwa preview). */
@Composable
fun QrPlaceholder(seed: String, tint: Color, size: androidx.compose.ui.unit.Dp = 96.dp) {
    androidx.compose.foundation.Canvas(Modifier.size(size)) {
        val cells = 21
        val cell = this.size.width / cells
        var hash = seed.hashCode()
        for (row in 0 until cells) {
            for (col in 0 until cells) {
                hash = hash * 31 + row * 17 + col * 7
                val on = (hash and 3) != 0
                if (on) {
                    drawRect(
                        color = tint,
                        topLeft = androidx.compose.ui.geometry.Offset(col * cell, row * cell),
                        size = androidx.compose.ui.geometry.Size(cell, cell),
                    )
                }
            }
        }
        // vitatu vya kona
        fun finder(x: Int, y: Int) {
            drawRect(tint, androidx.compose.ui.geometry.Offset(x * cell, y * cell), androidx.compose.ui.geometry.Size(cell * 7, cell * 7))
            drawRect(Color.White, androidx.compose.ui.geometry.Offset((x + 1) * cell, (y + 1) * cell), androidx.compose.ui.geometry.Size(cell * 5, cell * 5))
            drawRect(tint, androidx.compose.ui.geometry.Offset((x + 2) * cell, (y + 2) * cell), androidx.compose.ui.geometry.Size(cell * 3, cell * 3))
        }
        finder(0, 0)
        finder(14, 0)
        finder(0, 14)
    }
}
