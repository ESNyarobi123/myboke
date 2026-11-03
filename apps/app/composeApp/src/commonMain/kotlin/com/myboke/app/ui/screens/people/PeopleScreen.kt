package com.myboke.app.ui.screens.people

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.Avatar
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.EmptyState
import com.myboke.app.core.design.ListSkeleton
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
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.model.Debt
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money

private enum class PeopleTab { Customers, Debts }

@Composable
fun PeopleScreen(state: AppState, startOnDebts: Boolean = false) {
    val t = state.t
    val c = MbTheme.colors
    var tab by remember(startOnDebts) {
        mutableStateOf(if (startOnDebts) PeopleTab.Debts else PeopleTab.Customers)
    }
    var query by remember { mutableStateOf("") }
    var payingDebt by remember { mutableStateOf<Debt?>(null) }
    var paymentAmount by remember { mutableStateOf("") }

    val filteredCustomers = state.customers.filter {
        query.isBlank() || it.name.contains(query, ignoreCase = true) || (it.phone?.contains(query) == true)
    }
    val oweMe = state.debts.filter { it.type == "OWE_ME" && it.status != "PAID" }.sumOf { it.remaining }
    val iOwe = state.debts.filter { it.type == "I_OWE" && it.status != "PAID" }.sumOf { it.remaining }
    val overdue = state.debts.filter {
        it.status != "PAID" && it.dueDate != null && it.dueDate < Dates.isoDate(Dates.now())
    }.sumOf { it.remaining }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
            MbTopBar(t.customers) {
                MbIconButton(MbIcon.Search, onClick = { }, tint = c.textSecondary)
                MbIconButton(
                    if (tab == PeopleTab.Customers) MbIcon.User else MbIcon.Coins,
                    onClick = {
                        state.navigate(if (tab == PeopleTab.Customers) Page.CustomerForm else Page.DebtForm)
                    },
                    tint = c.primary,
                    background = c.primary.copy(alpha = 0.1f),
                )
            }

            // ── Segmented ───────────────────────────────────
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(c.surface2)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                SegmentedItem(t.customers, tab == PeopleTab.Customers, Modifier.weight(1f)) {
                    tab = PeopleTab.Customers
                }
                SegmentedItem(t.debtsTitle, tab == PeopleTab.Debts, Modifier.weight(1f)) {
                    tab = PeopleTab.Debts
                }
            }

            Spacer(Modifier.height(14.dp))

            if (tab == PeopleTab.Customers) {
                Box(Modifier.padding(horizontal = 16.dp)) {
                    MbTextField(query, { query = it }, t.searchCustomer, leadingIcon = MbIcon.Search)
                }
                Spacer(Modifier.height(12.dp))

                if (state.customersLoading && state.customers.isEmpty()) {
                    ListSkeleton(5)
                } else if (filteredCustomers.isEmpty()) {
                    EmptyState(
                        icon = MbIcon.Users,
                        title = t.emptyCustomersTitle,
                        body = t.emptyCustomersBody,
                        actionLabel = t.addCustomer,
                        onAction = { state.navigate(Page.CustomerForm) },
                    )
                } else {
                    filteredCustomers.forEach { customer ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable { state.openCustomer(customer.id) }
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Avatar(customer.name, size = 44.dp)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    customer.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = c.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    customer.phone ?: "${customer.loyaltyPoints} ${t.loyaltyPoints}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = c.textMuted,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                if (customer.outstanding > 0) {
                                    Text(
                                        "TZS ${Money.format(customer.outstanding, 0)}",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = c.dangerText(),
                                    )
                                    Text(
                                        t.oweMe,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = c.textMuted,
                                    )
                                } else {
                                    StatusPill(t.noDebt, BadgeTone.Neutral)
                                }
                            }
                        }
                    }
                }
            } else {
                // ── Madeni ──────────────────────────────────
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    DebtSummary(t.oweMe, oweMe, c.success, Modifier.weight(1f))
                    DebtSummary(t.iOwe, iOwe, c.warning, Modifier.weight(1f))
                    DebtSummary(t.overdue, overdue, c.danger, Modifier.weight(1f))
                }

                Spacer(Modifier.height(16.dp))
                SectionHeader(
                    t.debtsTitle,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    action = t.addDebt,
                ) { state.navigate(Page.DebtForm) }
                Spacer(Modifier.height(8.dp))

                if (state.debts.isEmpty()) {
                    EmptyState(
                        icon = MbIcon.Wallet,
                        title = t.emptyDebtsTitle,
                        body = t.emptyDebtsBody,
                        actionLabel = t.addDebt,
                        onAction = { state.navigate(Page.DebtForm) },
                    )
                } else {
                    state.debts.forEach { debt ->
                        DebtRow(
                            debt = debt,
                            state = state,
                            onPay = {
                                payingDebt = debt
                                paymentAmount = Money.format(debt.remaining, 0).replace(",", "")
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(30.dp))
        }
    }

    // ── Payment dialog ──────────────────────────────────────
    if (payingDebt != null) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable { payingDebt = null },
            contentAlignment = Alignment.Center,
        ) {
            Column(
                Modifier
                    .padding(24.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(c.surface)
                    .clickable(enabled = false) {}
                    .padding(18.dp),
            ) {
                Text(t.recordPayment, style = MaterialTheme.typography.headlineSmall, color = c.textPrimary)
                Spacer(Modifier.height(4.dp))
                Text(
                    payingDebt?.personName ?: "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = c.textMuted,
                )
                Spacer(Modifier.height(14.dp))
                MbTextField(
                    value = paymentAmount,
                    onValueChange = { paymentAmount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    label = t.amount,
                    prefix = "TZS",
                    keyboardType = KeyboardType.Decimal,
                )
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MbButton(
                        t.cancel,
                        onClick = { payingDebt = null },
                        style = MbButtonStyle.Ghost,
                        modifier = Modifier.weight(1f),
                    )
                    MbButton(
                        t.save,
                        onClick = {
                            payingDebt?.let { debt ->
                                state.payDebt(debt.id, paymentAmount)
                            }
                            payingDebt = null
                        },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun SegmentedItem(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = MbTheme.colors
    Box(
        modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) c.surface else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            color = if (selected) c.textPrimary else c.textMuted,
        )
    }
}

@Composable
private fun DebtSummary(label: String, value: Double, tint: Color, modifier: Modifier = Modifier) {
    val c = MbTheme.colors
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(c.surface)
            .padding(12.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
        Spacer(Modifier.height(4.dp))
        Text(
            Money.formatShort(value),
            style = MaterialTheme.typography.titleLarge,
            color = tint,
            maxLines = 1,
        )
    }
}

@Composable
private fun DebtRow(debt: Debt, state: AppState, onPay: () -> Unit) {
    val t = state.t
    val c = MbTheme.colors
    val overdue = debt.status != "PAID" && debt.dueDate != null && debt.dueDate < Dates.isoDate(Dates.now())
    val tone = when {
        debt.status == "PAID" -> BadgeTone.Success
        overdue -> BadgeTone.Danger
        debt.status == "PARTIAL" -> BadgeTone.Warning
        else -> BadgeTone.Info
    }
    val label = when {
        debt.status == "PAID" -> t.paid
        overdue -> "${t.overdue}"
        debt.status == "PARTIAL" -> t.partial
        else -> t.due
    }

    MbCard(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp),
        padding = 14.dp,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (debt.type == "OWE_ME") c.successBg else c.warningBg,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(
                    if (debt.type == "OWE_ME") MbIcon.TrendingUp else MbIcon.TrendingDown,
                    size = 19.dp,
                    tint = if (debt.type == "OWE_ME") c.successText() else c.warningText(),
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    debt.personName,
                    style = MaterialTheme.typography.titleMedium,
                    color = c.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    debt.description ?: if (debt.type == "OWE_ME") t.oweMe else t.iOwe,
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            StatusPill(label, tone)
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "TZS ${Money.format(debt.remaining, 0)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = c.textPrimary,
                )
                Text(
                    "${t.due}: ${debt.dueDate?.take(10) ?: "—"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (overdue) c.dangerText() else c.textMuted,
                )
            }
            if (debt.status != "PAID") {
                Row(
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(c.primary.copy(alpha = 0.1f))
                        .clickable(onClick = onPay)
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MbIconView(MbIcon.Card, size = 14.dp, tint = c.primary)
                    Spacer(Modifier.width(5.dp))
                    Text(t.recordPayment, style = MaterialTheme.typography.labelMedium, color = c.primary)
                }
            }
        }
    }
}
