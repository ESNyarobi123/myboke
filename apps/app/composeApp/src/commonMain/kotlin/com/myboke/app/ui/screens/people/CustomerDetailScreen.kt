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
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MbTopBar
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.model.Customer
import com.myboke.app.core.model.Debt
import com.myboke.app.core.model.Sale
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money
import com.myboke.app.core.util.openExternal
import com.myboke.app.core.util.telUrl
import com.myboke.app.core.util.whatsAppUrl

/**
 * Client 360 — wasifu mmoja unaokusanya kila kitu kuhusu mteja:
 * deni, manunuzi, pointi za uaminifu na mawasiliano ya haraka.
 * Ni zaidi ya orodha ya wateja ya Indeii: inaonyesha thamani ya mteja
 * na hatua zinazofuata badala ya data tupu.
 */
@Composable
fun CustomerDetailScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val customer = state.customers.firstOrNull { it.id == state.openCustomerId }

    if (customer == null) {
        Column(Modifier.fillMaxSize()) {
            MbTopBar(t.client.title, onBack = { state.back() })
            EmptyState(
                icon = MbIcon.Users,
                title = t.client.title,
                body = t.errorBody,
                actionLabel = t.back,
                onAction = { state.back() },
            )
        }
        return
    }

    val debts = state.debts.filter {
        (it.customerId != null && it.customerId == customer.id) ||
            (it.customerId == null && it.personName.equals(customer.name, ignoreCase = true))
    }
    val openDebts = debts.filter { it.status != "PAID" }
    val sales = state.recentSales.filter { it.customerId == customer.id }
    val totalSpend = sales.sumOf { Money.parse(it.total) }
    val lastSale = sales.maxByOrNull { it.saleDate }
    val outstanding = openDebts.sumOf { it.remaining }

    var payingDebt by remember { mutableStateOf<Debt?>(null) }
    var amount by remember { mutableStateOf("") }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
            MbTopBar(t.client.title, onBack = { state.back() })

            // ── Kichwa cha wasifu ──────────────────────────────
            Box(
                Modifier
                    .padding(horizontal = 16.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(Brush.linearGradient(c.primaryGradient)),
            ) {
                Column(Modifier.padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(customer.name, size = 58.dp)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                customer.name,
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(3.dp))
                            Text(
                                customer.phone ?: t.client.settled,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.White.copy(alpha = 0.8f),
                            )
                        }
                        StatusPill(
                            if (outstanding > 0) t.oweMe else t.client.settled,
                            if (outstanding > 0) BadgeTone.Danger else BadgeTone.Success,
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        HeroStat(
                            t.debtsTitle,
                            "TZS ${Money.format(outstanding, 0)}",
                            Modifier.weight(1f),
                        )
                        HeroStat(
                            t.client.totalSpend,
                            "TZS ${Money.format(totalSpend, 0)}",
                            Modifier.weight(1f),
                        )
                        HeroStat(
                            t.loyaltyPoints,
                            "${customer.loyaltyPoints}",
                            Modifier.weight(1f),
                        )
                    }
                }
            }

            Spacer(Modifier.height(14.dp))

            // ── Mawasiliano ya haraka ─────────────────────────
            Row(
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                QuickAction(MbIcon.Phone, t.client.call, Modifier.weight(1f)) {
                    customer.phone?.let { openExternal(telUrl(it)) }
                }
                QuickAction(MbIcon.Send, t.client.message, Modifier.weight(1f)) {
                    customer.phone?.let {
                        val msg = if (outstanding > 0) {
                            "${customer.name}, salio lako ni TZS ${Money.format(outstanding, 0)}. Asante kwa kufanya biashara nasi!"
                        } else {
                            "${customer.name}, asante kwa kufanya biashara nasi!"
                        }
                        openExternal(whatsAppUrl(it, msg))
                    }
                }
                QuickAction(MbIcon.Cart, t.client.newSale, Modifier.weight(1f), accent = true) {
                    state.startSaleFor(customer.id)
                }
            }

            Spacer(Modifier.height(18.dp))

            // ── Taarifa za msingi ─────────────────────────────
            MbCard(Modifier.padding(horizontal = 16.dp)) {
                Column(Modifier.padding(14.dp)) {
                    InfoLine(t.client.creditLimit, customer.creditLimit?.let { "TZS ${Money.format(Money.parse(it), 0)}" } ?: "—")
                    if (customer.email != null) {
                        Spacer(Modifier.height(8.dp))
                        InfoLine("Email", customer.email)
                    }
                    Spacer(Modifier.height(8.dp))
                    InfoLine(
                        t.client.lastPurchase,
                        lastSale?.saleDate?.take(10) ?: t.client.noSales,
                    )
                    if (!customer.notes.isNullOrBlank()) {
                        Spacer(Modifier.height(8.dp))
                        InfoLine(t.inv.notes, customer.notes)
                    }
                }
            }

            Spacer(Modifier.height(18.dp))

            // ── Madeni ────────────────────────────────────────
            SectionHeader(
                "${t.client.openDebts} (${openDebts.size})",
                modifier = Modifier.padding(horizontal = 16.dp),
                action = t.addDebt,
            ) { state.navigate(Page.DebtForm) }

            if (openDebts.isEmpty()) {
                MbCard(Modifier.padding(16.dp)) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        MbIconView(MbIcon.Check, size = 18.dp, tint = c.successText())
                        Spacer(Modifier.width(10.dp))
                        Text(t.client.settled, style = MaterialTheme.typography.bodyMedium, color = c.textSecondary)
                    }
                }
            } else {
                openDebts.forEach { debt ->
                    DebtCard(debt = debt, payLabel = t.recordPayment, onPay = {
                        payingDebt = debt
                        amount = Money.format(debt.remaining, 0).replace(",", "")
                    })
                }
            }

            Spacer(Modifier.height(18.dp))

            // ── Manunuzi ya hivi karibuni ─────────────────────
            SectionHeader(
                "${t.client.purchases} (${sales.size})",
                modifier = Modifier.padding(horizontal = 16.dp),
            )

            if (sales.isEmpty()) {
                MbCard(Modifier.padding(16.dp)) {
                    Text(
                        t.client.noSales,
                        style = MaterialTheme.typography.bodyMedium,
                        color = c.textMuted,
                        modifier = Modifier.padding(14.dp),
                    )
                }
            } else {
                sales.sortedByDescending { it.saleDate }.take(10).forEach { sale ->
                    SaleRow(sale)
                }
            }

            Spacer(Modifier.height(30.dp))
        }
    }

    val debtToPay = payingDebt
    if (debtToPay != null) {
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
                    "${debtToPay.personName} · TZS ${Money.format(debtToPay.remaining, 0)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = c.textMuted,
                )
                Spacer(Modifier.height(14.dp))
                MbTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = t.amount,
                    keyboardType = KeyboardType.Number,
                )
                Spacer(Modifier.height(12.dp))
                MbButton(
                    t.save,
                    onClick = {
                        state.payDebt(debtToPay.id, amount) { payingDebt = null }
                    },
                    fullWidth = true,
                )
                Spacer(Modifier.height(6.dp))
                MbButton(
                    t.cancel,
                    onClick = { payingDebt = null },
                    style = MbButtonStyle.Ghost,
                    fullWidth = true,
                    height = 42.dp,
                )
            }
        }
    }
}

@Composable
private fun HeroStat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.14f))
            .padding(vertical = 10.dp, horizontal = 10.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = Color.White.copy(alpha = 0.7f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(3.dp))
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun QuickAction(
    icon: MbIcon,
    label: String,
    modifier: Modifier = Modifier,
    accent: Boolean = false,
    onClick: () -> Unit,
) {
    val c = MbTheme.colors
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (accent) c.primary.copy(alpha = 0.10f) else c.surface2)
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MbIconView(icon, size = 20.dp, tint = if (accent) c.primary else c.textSecondary)
        Spacer(Modifier.height(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = if (accent) c.primary else c.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun InfoLine(label: String, value: String) {
    val c = MbTheme.colors
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = c.textMuted, modifier = Modifier.weight(1f))
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = c.textPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun DebtCard(debt: Debt, payLabel: String, onPay: () -> Unit) {
    val c = MbTheme.colors
    val overdue = debt.dueDate != null && debt.dueDate < Dates.isoDate(Dates.now())
    MbCard(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
        Row(
            Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (overdue) c.dangerBg else c.warning.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(
                    if (overdue) MbIcon.Warning else MbIcon.Wallet,
                    size = 18.dp,
                    tint = if (overdue) c.danger else c.warning,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "TZS ${Money.format(debt.remaining, 0)}",
                    style = MaterialTheme.typography.titleMedium,
                    color = if (overdue) c.dangerText() else c.textPrimary,
                )
                Text(
                    debt.description ?: debt.dueDate ?: "—",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            PayPill(payLabel, onPay)
        }
    }
}

/** Kitufe kidogo cha "Lipa" ndani ya kadi ya deni. */
@Composable
private fun PayPill(label: String, onPay: () -> Unit) {
    val c = MbTheme.colors
    Box(
        Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(c.primary)
            .clickable(onClick = onPay)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = Color.White)
    }
}

@Composable
private fun SaleRow(sale: Sale) {
    val c = MbTheme.colors
    MbCard(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(c.successBg),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.Receipt, size = 17.dp, tint = c.successText())
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    sale.receiptNo.ifBlank { sale.id.take(8) },
                    style = MaterialTheme.typography.bodyMedium,
                    color = c.textPrimary,
                )
                Text(
                    "${sale.saleDate.take(10)} · ${sale.paymentMethod}",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                )
            }
            Text(
                "TZS ${Money.format(Money.parse(sale.total), 0)}",
                style = MaterialTheme.typography.titleSmall,
                color = c.textPrimary,
            )
        }
    }
}
