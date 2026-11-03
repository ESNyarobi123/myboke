package com.myboke.app.ui.screens.invoices

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.EmptyState
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
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.i18n.Lang
import com.myboke.app.core.model.InvoiceDoc
import com.myboke.app.core.model.InvoiceTemplate
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money

// ─────────────────────────────────────────────────────────────
// Muundo wa kuonyesha ankara (form preview + detail)
// ─────────────────────────────────────────────────────────────

data class InvoiceLineView(
    val description: String,
    val quantity: Double,
    val unitPrice: Double,
    /**
     * Maandishi ghafi ya idadi (`"1.5"`, `"12"`) yanayohifadhiwa kwenye fomu.
     * Bila hii, `value` inafomatiwa upya kila herufi → nukta za desimali hupotea.
     */
    val qtyText: String = if (quantity > 0 && quantity % 1.0 == 0.0) {
        quantity.toInt().toString()
    } else if (quantity > 0) {
        quantity.toString()
    } else {
        ""
    },
    /**
     * Maandishi ghafi ya bei (`"2500"`, `"25,000"`) yanayohifadhiwa kwenye fomu.
     * Bila hii, kufomati kwa koma kunasogeza cursor → namba hupinduka
     * (mf. kuandika `2500` kwa kasi kunaleta `25,025,000`).
     */
    val priceText: String = if (unitPrice > 0) Money.format(unitPrice, 0) else "",
)

data class InvoiceView(
    val businessName: String,
    val shopName: String?,
    val number: String,
    val status: String,
    val customerName: String,
    val customerPhone: String?,
    val customerAddress: String?,
    val issueDate: String,
    val dueDate: String?,
    val lines: List<InvoiceLineView>,
    val discount: Double,
    val taxRate: Double,
    val notes: String?,
    val template: InvoiceTemplate,
) {
    val subtotal: Double get() = lines.sumOf { it.quantity * it.unitPrice }
    val taxAmount: Double get() = (subtotal - discount).coerceAtLeast(0.0) * taxRate / 100.0
    val total: Double get() = (subtotal - discount).coerceAtLeast(0.0) + taxAmount
}

private fun InvoiceDoc.toView(state: AppState, template: InvoiceTemplate) = InvoiceView(
    businessName = state.businessName.ifBlank { "MyBoke" },
    shopName = state.activeShop?.name,
    number = number,
    status = status,
    customerName = customerName.ifBlank { "—" },
    customerPhone = customerPhone,
    customerAddress = customerAddress,
    issueDate = issueDate.take(10).ifBlank { Dates.isoDate(Dates.now()) },
    dueDate = dueDate?.take(10),
    lines = items.map {
        InvoiceLineView(
            description = it.description,
            quantity = Money.parse(it.quantity),
            unitPrice = Money.parse(it.unitPrice),
        )
    },
    discount = Money.parse(discount),
    taxRate = Money.parse(taxRate),
    notes = notes,
    template = template,
)

private fun statusTone(status: String): BadgeTone = when (status) {
    "PAID" -> BadgeTone.Success
    "PARTIAL", "SENT" -> BadgeTone.Info
    "OVERDUE" -> BadgeTone.Danger
    "VOID" -> BadgeTone.Neutral
    else -> BadgeTone.Warning
}

private fun statusLabel(state: AppState, status: String): String = when (status) {
    "PAID" -> state.t.inv.paid
    "OVERDUE" -> state.t.inv.overdue
    "PARTIAL" -> "PARTIAL"
    "VOID" -> "VOID"
    "SENT" -> "SENT"
    else -> "DRAFT"
}

// ─────────────────────────────────────────────────────────────
// Orodha ya ankara
// ─────────────────────────────────────────────────────────────

@Composable
fun InvoicesScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val summary = state.invoiceSummary

    LaunchedEffect(Unit) {
        if (!state.offlineMode && state.invoices.isEmpty()) state.loadInvoices()
    }

    Column(Modifier.fillMaxSize()) {
        MbTopBar(
            title = t.inv.title,
            onBack = { state.back() },
            actions = {
                MbIconButton(MbIcon.Plus, onClick = { state.navigate(com.myboke.app.core.data.Page.InvoiceForm) })
            },
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            if (summary != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InvoiceStat(
                        label = t.inv.outstanding,
                        value = Money.parse(summary.outstanding),
                        color = c.primary,
                        modifier = Modifier.weight(1f),
                    )
                    InvoiceStat(
                        label = t.inv.overdue,
                        value = Money.parse(summary.overdue),
                        color = c.danger,
                        modifier = Modifier.weight(1f),
                    )
                    InvoiceStat(
                        label = t.inv.paid,
                        value = Money.parse(summary.paid),
                        color = c.success,
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.height(14.dp))
            }

            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                val filters = listOf(
                    null to t.all,
                    "DRAFT" to "DRAFT",
                    "SENT" to "SENT",
                    "PAID" to t.inv.paid,
                    "OVERDUE" to t.inv.overdue,
                )
                filters.forEach { (key, label) ->
                    MbChip(
                        text = label,
                        selected = state.invoiceFilter == key,
                        onClick = { state.filterInvoices(key) },
                    )
                }
            }

            Spacer(Modifier.height(14.dp))

            if (state.invoices.isEmpty()) {
                EmptyState(
                    icon = MbIcon.Doc,
                    title = t.inv.empty,
                    body = t.inv.emptyBody,
                    actionLabel = t.inv.newInvoice,
                    onAction = { state.navigate(com.myboke.app.core.data.Page.InvoiceForm) },
                )
            } else {
                state.invoices.forEach { invoice ->
                    InvoiceRow(state, invoice)
                    Spacer(Modifier.height(10.dp))
                }
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}

@Composable
private fun InvoiceStat(
    label: String,
    value: Double,
    color: Color,
    modifier: Modifier = Modifier,
) {
    val c = MbTheme.colors
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(c.surface)
            .border(1.dp, c.border, RoundedCornerShape(14.dp))
            .padding(12.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = c.textMuted, maxLines = 1)
        Spacer(Modifier.height(4.dp))
        Text(
            "TZS ${Money.formatShort(value)}",
            style = MaterialTheme.typography.titleMedium.copy(fontFeatureSettings = "tnum"),
            color = color,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun InvoiceRow(state: AppState, invoice: InvoiceDoc) {
    val t = state.t
    val c = MbTheme.colors
    val template = InvoiceTemplate.entries.firstOrNull { it.key == invoice.template } ?: InvoiceTemplate.Modern

    MbCard(
        Modifier.fillMaxWidth(),
        onClick = { state.openInvoice(invoice) },
        padding = 14.dp,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(c.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.Doc, size = 18.dp, tint = c.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    invoice.customerName.ifBlank { invoice.number },
                    style = MaterialTheme.typography.titleSmall,
                    color = c.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "${invoice.number} · ${invoice.issueDate.take(10)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                    maxLines = 1,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "TZS ${Money.format(invoice.totalValue, 0)}",
                    style = MaterialTheme.typography.titleSmall.copy(fontFeatureSettings = "tnum"),
                    color = c.textPrimary,
                )
                Spacer(Modifier.height(4.dp))
                StatusPill(statusLabel(state, invoice.status), statusTone(invoice.status))
            }
        }
        if (invoice.dueDate != null && invoice.isOpen) {
            Spacer(Modifier.height(8.dp))
            Text(
                "${t.inv.dueDate}: ${invoice.dueDate!!.take(10)} · ${template.key}",
                style = MaterialTheme.typography.labelSmall,
                color = c.textMuted,
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Fomu ya ankara mpya
// ─────────────────────────────────────────────────────────────

@Composable
fun InvoiceFormScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val scope = rememberScrollState()

    var customer by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf(Dates.isoDate(Dates.now()).take(10)) }
    var discount by remember { mutableStateOf("") }
    var taxRate by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var template by remember { mutableStateOf(InvoiceTemplate.Modern) }

    val lines = remember {
        mutableStateListOf(
            InvoiceLineView("", 1.0, 0.0),
        )
    }

    val draft = InvoiceView(
        businessName = state.businessName.ifBlank { "MyBoke" },
        shopName = state.activeShop?.name,
        number = "INV-${Dates.now().toString().takeLast(4)}",
        status = "DRAFT",
        customerName = customer.ifBlank { t.inv.customer },
        customerPhone = phone.ifBlank { null },
        customerAddress = address.ifBlank { null },
        issueDate = Dates.isoDate(Dates.now()).take(10),
        dueDate = dueDate.ifBlank { null },
        lines = lines,
        discount = Money.parse(discount),
        taxRate = Money.parse(taxRate),
        notes = notes.ifBlank { null },
        template = template,
    )

    Column(Modifier.fillMaxSize()) {
        MbTopBar(t.inv.newInvoice, onBack = { state.back() })
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(scope)
                .padding(horizontal = 16.dp),
        ) {
            MbTextField(customer, { customer = it }, t.inv.customer, placeholder = "Mama Salma")
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MbTextField(phone, { phone = it }, "Simu", Modifier.weight(1f), placeholder = "0713 000 000")
                MbTextField(dueDate, { dueDate = it }, t.inv.dueDate, Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            MbTextField(address, { address = it }, "Anwani", placeholder = "Kariakoo, Dar")

            Spacer(Modifier.height(18.dp))
            SectionHeader(
                t.inv.addItem,
                action = t.inv.addItem,
                onAction = { lines.add(InvoiceLineView("", 1.0, 0.0)) },
            )

            lines.forEachIndexed { index, line ->
                Spacer(Modifier.height(10.dp))
                MbCard(Modifier.fillMaxWidth(), padding = 12.dp) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${index + 1}.",
                            style = MaterialTheme.typography.labelMedium,
                            color = c.textMuted,
                        )
                        Spacer(Modifier.width(8.dp))
                        MbTextField(
                            line.description,
                            { lines[index] = line.copy(description = it) },
                            t.inv.itemDesc,
                            Modifier.weight(1f),
                            placeholder = "Unga wa Sembe 1kg",
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MbTextField(
                            line.qtyText,
                            {
                                lines[index] = line.copy(
                                    qtyText = it,
                                    quantity = it.replace(',', '.').toDoubleOrNull() ?: 0.0,
                                )
                            },
                            t.inv.qty,
                            Modifier.weight(1f),
                        )
                        MbTextField(
                            line.priceText,
                            {
                                lines[index] = line.copy(
                                    priceText = it,
                                    unitPrice = Money.parse(it),
                                )
                            },
                            t.inv.price,
                            Modifier.weight(1f),
                            prefix = "TZS",
                        )
                        MbIconButton(
                            MbIcon.Trash,
                            onClick = { if (lines.size > 1) lines.removeAt(index) },
                            tint = c.danger,
                            background = c.dangerBg,
                            size = 42.dp,
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            MbButton(
                t.inv.addItem,
                onClick = { lines.add(InvoiceLineView("", 1.0, 0.0)) },
                style = MbButtonStyle.Secondary,
                icon = MbIcon.Plus,
                fullWidth = true,
                height = 44.dp,
            )

            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MbTextField(
                    discount,
                    { discount = it },
                    t.inv.discount,
                    Modifier.weight(1f),
                    prefix = "TZS",
                )
                MbTextField(taxRate, { taxRate = it }, t.inv.vat, Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            MbTextField(notes, { notes = it }, t.inv.notes, maxLines = 3)

            Spacer(Modifier.height(20.dp))
            SectionHeader(t.inv.template, subtitle = "modern · classic · minimal")
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                InvoiceTemplate.entries.forEach { option ->
                    TemplateThumb(
                        template = option,
                        selected = template == option,
                        label = when (option) {
                            InvoiceTemplate.Modern -> t.inv.templateModern
                            InvoiceTemplate.Classic -> t.inv.templateClassic
                            InvoiceTemplate.Minimal -> t.inv.templateMinimal
                        },
                        modifier = Modifier.weight(1f),
                        onClick = { template = option },
                    )
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionHeader(t.inv.preview)
            Spacer(Modifier.height(10.dp))
            InvoicePaper(draft, compact = true)

            Spacer(Modifier.height(16.dp))
            MbCard(Modifier.fillMaxWidth()) {
                TotalLine(t.inv.qty.let { "Subtotal" }, draft.subtotal)
                if (draft.discount > 0) TotalLine(t.inv.discount, -draft.discount)
                if (draft.taxAmount > 0) TotalLine("VAT ${Money.format(draft.taxRate, 0)}%", draft.taxAmount)
                Spacer(Modifier.height(6.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "JUMLA",
                        style = MaterialTheme.typography.titleSmall,
                        color = c.textPrimary,
                        modifier = Modifier.weight(1f),
                    )
                    MoneyText(draft.total, style = MaterialTheme.typography.titleLarge)
                }
            }

            Spacer(Modifier.height(16.dp))
            MbButton(
                t.inv.create,
                onClick = {
                    state.createInvoice(
                        customerName = customer,
                        customerPhone = phone.ifBlank { null },
                        customerAddress = address.ifBlank { null },
                        dueDate = dueDate.ifBlank { null },
                        discount = discount,
                        taxRate = taxRate,
                        template = template,
                        lines = lines.map { Triple(it.description, it.quantity, it.unitPrice) },
                        notes = notes.ifBlank { null },
                    ) { created ->
                        state.openInvoice(created)
                    }
                },
                loading = state.invoiceBusy,
                fullWidth = true,
                icon = MbIcon.Check,
            )
            Spacer(Modifier.height(28.dp))
        }
    }
}

@Composable
private fun TotalLine(label: String, value: Double) {
    val c = MbTheme.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = c.textMuted, modifier = Modifier.weight(1f))
        Text(
            "TZS ${Money.format(value, 2)}",
            style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum"),
            color = c.textPrimary,
        )
    }
}

@Composable
private fun TemplateThumb(
    template: InvoiceTemplate,
    selected: Boolean,
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val c = MbTheme.colors
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(c.surface)
            .border(
                if (selected) 2.dp else 1.dp,
                if (selected) c.primary else c.border,
                RoundedCornerShape(14.dp),
            )
            .clickable(onClick = onClick)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(54.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White),
        ) {
            when (template) {
                InvoiceTemplate.Modern -> {
                    Box(Modifier.fillMaxWidth().height(16.dp).background(Color(0xFF0269E9)))
                    Column(Modifier.padding(start = 6.dp, top = 22.dp)) {
                        repeat(2) {
                            Box(
                                Modifier
                                    .width(28.dp)
                                    .height(3.dp)
                                    .background(Color(0xFFE2E8F4)),
                            )
                            Spacer(Modifier.height(3.dp))
                        }
                    }
                }
                InvoiceTemplate.Classic -> {
                    Box(
                        Modifier
                            .padding(3.dp)
                            .fillMaxWidth()
                            .height(48.dp)
                            .border(1.dp, Color(0xFF0B37A1)),
                    )
                    Column(Modifier.padding(start = 9.dp, top = 8.dp)) {
                        repeat(3) {
                            Box(Modifier.width(24.dp).height(2.dp).background(Color(0xFFC9CDD4)))
                            Spacer(Modifier.height(3.dp))
                        }
                    }
                }
                InvoiceTemplate.Minimal -> {
                    Box(Modifier.padding(top = 6.dp, start = 6.dp).width(20.dp).height(2.dp).background(Color(0xFF111111)))
                    Column(Modifier.padding(start = 6.dp, top = 22.dp)) {
                        repeat(3) {
                            Box(Modifier.width(34.dp).height(1.dp).background(Color(0xFFEAEAEA)))
                            Spacer(Modifier.height(4.dp))
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = if (selected) c.primary else c.textMuted,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Detail ya ankara
// ─────────────────────────────────────────────────────────────

@Composable
fun InvoiceDetailScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val invoice = state.selectedInvoice

    var template by remember(invoice?.id) {
        mutableStateOf(
            InvoiceTemplate.entries.firstOrNull { it.key == invoice?.template }
                ?: InvoiceTemplate.Modern,
        )
    }
    var payAmount by remember(invoice?.id) { mutableStateOf("") }

    Column(Modifier.fillMaxSize()) {
        MbTopBar(
            invoice?.number ?: t.inv.title,
            onBack = { state.back() },
            actions = {
                if (invoice != null) {
                    MbIconButton(
                        MbIcon.Download,
                        onClick = { state.downloadInvoicePdf(invoice, template) },
                    )
                }
            },
        )

        if (invoice == null) {
            EmptyState(MbIcon.Doc, t.inv.empty, t.inv.emptyBody)
            return@Column
        }

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusPill(statusLabel(state, invoice.status), statusTone(invoice.status))
                Spacer(Modifier.width(8.dp))
                Text(
                    "${t.inv.balance}: TZS ${Money.format(invoice.balanceValue, 0)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = c.textMuted,
                )
            }

            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                InvoiceTemplate.entries.forEach { option ->
                    MbChip(
                        text = when (option) {
                            InvoiceTemplate.Modern -> t.inv.templateModern
                            InvoiceTemplate.Classic -> t.inv.templateClassic
                            InvoiceTemplate.Minimal -> t.inv.templateMinimal
                        },
                        selected = template == option,
                        onClick = { template = option },
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            InvoicePaper(invoice.toView(state, template))

            Spacer(Modifier.height(16.dp))
            if (invoice.isOpen) {
                MbCard(Modifier.fillMaxWidth()) {
                    Text(t.inv.markPaid, style = MaterialTheme.typography.titleSmall, color = c.textPrimary)
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MbTextField(
                            payAmount,
                            { payAmount = it },
                            t.inv.balance,
                            Modifier.weight(1f),
                            prefix = "TZS",
                            placeholder = Money.format(invoice.balanceValue, 0),
                        )
                        Spacer(Modifier.width(8.dp))
                        MbButton(
                            t.save,
                            onClick = {
                                state.payInvoice(
                                    invoice,
                                    payAmount.ifBlank { Money.format(invoice.balanceValue, 2) },
                                )
                                payAmount = ""
                            },
                            loading = state.invoiceBusy,
                            height = 46.dp,
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Spacer(Modifier.height(10.dp))
                MbButton(
                    t.inv.downloadPdf,
                    onClick = { state.downloadInvoicePdf(invoice, template) },
                    style = MbButtonStyle.Secondary,
                    icon = MbIcon.Download,
                    fullWidth = true,
                    loading = state.invoiceBusy,
                    height = 46.dp,
                )
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MbButton(
                        t.inv.send,
                        onClick = { state.sendInvoice(invoice) },
                        style = MbButtonStyle.Secondary,
                        icon = MbIcon.Send,
                        modifier = Modifier.weight(1f),
                        height = 46.dp,
                    )
                    MbButton(
                        t.inv.void,
                        onClick = { state.voidInvoice(invoice) },
                        style = MbButtonStyle.Ghost,
                        modifier = Modifier.weight(1f),
                        height = 46.dp,
                    )
                }
            } else {
                MbButton(
                    t.inv.downloadPdf,
                    onClick = { state.downloadInvoicePdf(invoice, template) },
                    icon = MbIcon.Download,
                    fullWidth = true,
                    loading = state.invoiceBusy,
                )
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Karatasi ya ankara (templates tatu zilizoundwa)
// ─────────────────────────────────────────────────────────────

@Composable
fun InvoicePaper(view: InvoiceView, compact: Boolean = false) {
    val c = MbTheme.colors
    val shape = RoundedCornerShape(18.dp)
    Box(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Color.White)
            .border(1.dp, c.border, shape),
    ) {
        when (view.template) {
            InvoiceTemplate.Modern -> ModernPaper(view, compact)
            InvoiceTemplate.Classic -> ClassicPaper(view, compact)
            InvoiceTemplate.Minimal -> MinimalPaper(view, compact)
        }
    }
}

private const val INK = 0xFF0B1220
private const val MUTED = 0xFF6B7688

@Composable
private fun ModernPaper(view: InvoiceView, compact: Boolean) {
    Column(Modifier.fillMaxWidth()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(listOf(Color(0xFF0269E9), Color(0xFF0B37A1))),
                )
                .padding(horizontal = 16.dp, vertical = if (compact) 12.dp else 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(if (compact) 26.dp else 32.dp).clip(CircleShape).background(Color.White),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        initialsOf(view.businessName),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = if (compact) 9.sp else 11.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                        color = Color(0xFF0269E9),
                    )
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        view.businessName,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (!compact && view.shopName != null) {
                        Text(
                            view.shopName,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFD6E6FF),
                            maxLines = 1,
                        )
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "ANKARA",
                        style = (if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.headlineSmall)
                            .copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                        color = Color.White,
                    )
                    Text(view.number, style = MaterialTheme.typography.labelSmall, color = Color(0xFFD6E6FF))
                }
            }
        }
        Box(Modifier.fillMaxWidth().height(5.dp).background(Color(0xFF73D31C)))

        Column(Modifier.padding(16.dp)) {
            Row {
                Column(Modifier.weight(1f)) {
                    Text("MTEJA", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = Color(MUTED))
                    Text(
                        view.customerName,
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                        color = Color(INK),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    val sub = listOfNotNull(view.customerPhone, view.customerAddress).joinToString(" · ")
                    if (sub.isNotBlank()) {
                        Text(sub, style = MaterialTheme.typography.labelSmall, color = Color(MUTED), maxLines = 2)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    PaperMeta("Tarehe", view.issueDate)
                    PaperMeta("Malipo", view.dueDate ?: "—")
                    PaperMeta("Hali", view.status)
                }
            }

            Spacer(Modifier.height(12.dp))
            PaperTable(view, headerBg = Color(0xFFEAF1FF), headerFg = Color(0xFF0269E9), rowRule = Color(0xFFDCE4F2), compact = compact)
            Spacer(Modifier.height(10.dp))
            PaperTotals(view, accent = Color(0xFF0269E9), boxed = true)
            if (!view.notes.isNullOrBlank()) {
                Spacer(Modifier.height(10.dp))
                Text(view.notes, style = MaterialTheme.typography.labelSmall, color = Color(MUTED))
            }
        }
    }
}

@Composable
private fun ClassicPaper(view: InvoiceView, compact: Boolean) {
    Column(Modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(
                    view.businessName,
                    style = MaterialTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold),
                    color = Color(INK),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    view.shopName ?: "Tanzania",
                    style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Serif),
                    color = Color(MUTED),
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "ANKARA",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                    ),
                    color = Color(0xFF0B37A1),
                )
                Text(
                    view.number,
                    style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Serif),
                    color = Color(MUTED),
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Box(Modifier.fillMaxWidth().height(2.dp).background(Color(0xFF0B37A1)))
        Spacer(Modifier.height(12.dp))

        Row {
            Column(Modifier.weight(1f)) {
                Text("ANWANI YA MTEJA", style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Serif), color = Color(MUTED))
                Text(
                    view.customerName,
                    style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold),
                    color = Color(INK),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                listOfNotNull(view.customerPhone, view.customerAddress).forEach {
                    Text(it, style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Serif), color = Color(MUTED))
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                PaperMeta("TAREHE", view.issueDate, serif = true)
                PaperMeta("MALIPO", view.dueDate ?: "—", serif = true)
            }
        }

        Spacer(Modifier.height(12.dp))
        PaperTable(
            view,
            headerBg = Color(0xFFF3F4F6),
            headerFg = Color(INK),
            rowRule = Color(0xFFC9CDD4),
            compact = compact,
            bordered = true,
            serif = true,
        )
        Spacer(Modifier.height(10.dp))
        PaperTotals(view, accent = Color(0xFF0B37A1), boxed = true, serif = true)
    }
}

@Composable
private fun MinimalPaper(view: InvoiceView, compact: Boolean) {
    Column(Modifier.padding(18.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Text(
                view.businessName.uppercase(),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                ),
                color = Color(INK),
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "Ankara",
                    style = (if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.headlineSmall)
                        .copy(fontWeight = FontWeight.Light),
                    color = Color(INK),
                )
                Text(view.number, style = MaterialTheme.typography.labelSmall, color = Color(MUTED))
            }
        }
        Spacer(Modifier.height(14.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(Color(INK)))
        Spacer(Modifier.height(12.dp))

        Row {
            Column(Modifier.weight(1f)) {
                Text("KWA", style = MaterialTheme.typography.labelSmall, color = Color(MUTED))
                Text(
                    view.customerName,
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                    color = Color(INK),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            PaperMeta("TAREHE", view.issueDate)
            Spacer(Modifier.width(14.dp))
            PaperMeta("MALIPO", view.dueDate ?: "—")
        }

        Spacer(Modifier.height(14.dp))
        PaperTable(view, headerBg = null, headerFg = Color(MUTED), rowRule = Color(0xFFEAEAEA), compact = compact)
        Spacer(Modifier.height(8.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(Color(INK)))
        Spacer(Modifier.height(8.dp))
        PaperTotals(view, accent = Color(INK), boxed = false)
    }
}

@Composable
private fun PaperMeta(label: String, value: String, serif: Boolean = false) {
    Column(horizontalAlignment = Alignment.End) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontFamily = if (serif) FontFamily.Serif else FontFamily.Default,
            ),
            color = Color(MUTED),
        )
        Text(
            value,
            style = MaterialTheme.typography.labelMedium.copy(
                fontFamily = if (serif) FontFamily.Serif else FontFamily.Default,
                fontWeight = FontWeight.Medium,
            ),
            color = Color(INK),
            maxLines = 1,
        )
    }
}

@Composable
private fun PaperTable(
    view: InvoiceView,
    headerBg: Color?,
    headerFg: Color,
    rowRule: Color,
    compact: Boolean,
    bordered: Boolean = false,
    serif: Boolean = false,
) {
    val family = if (serif) FontFamily.Serif else FontFamily.Default
    Column(Modifier.fillMaxWidth()) {
        Row(
            Modifier
                .fillMaxWidth()
                .then(if (headerBg != null) Modifier.background(headerBg) else Modifier)
                .padding(vertical = 6.dp, horizontal = 6.dp),
        ) {
            Text(
                "MAELEZO",
                style = MaterialTheme.typography.labelSmall.copy(fontFamily = family, fontWeight = FontWeight.Bold),
                color = headerFg,
                modifier = Modifier.weight(1f),
            )
            Text(
                "IDADI",
                style = MaterialTheme.typography.labelSmall.copy(fontFamily = family, fontWeight = FontWeight.Bold),
                color = headerFg,
                textAlign = TextAlign.End,
                modifier = Modifier.width(38.dp),
            )
            Text(
                "BEI",
                style = MaterialTheme.typography.labelSmall.copy(fontFamily = family, fontWeight = FontWeight.Bold),
                color = headerFg,
                textAlign = TextAlign.End,
                modifier = Modifier.width(64.dp),
            )
            Text(
                "JUMLA",
                style = MaterialTheme.typography.labelSmall.copy(fontFamily = family, fontWeight = FontWeight.Bold),
                color = headerFg,
                textAlign = TextAlign.End,
                modifier = Modifier.width(72.dp),
            )
        }
        view.lines.forEach { line ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .then(if (bordered) Modifier.border(0.5.dp, rowRule) else Modifier)
                    .padding(vertical = 6.dp, horizontal = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    line.description.ifBlank { "—" },
                    style = MaterialTheme.typography.labelMedium.copy(fontFamily = family),
                    color = Color(INK),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    fmtQty(line.quantity),
                    style = MaterialTheme.typography.labelMedium.copy(fontFamily = family),
                    color = Color(MUTED),
                    textAlign = TextAlign.End,
                    modifier = Modifier.width(38.dp),
                )
                Text(
                    Money.format(line.unitPrice, 0),
                    style = MaterialTheme.typography.labelMedium.copy(fontFamily = family),
                    color = Color(MUTED),
                    textAlign = TextAlign.End,
                    modifier = Modifier.width(64.dp),
                    maxLines = 1,
                )
                Text(
                    Money.format(line.quantity * line.unitPrice, 0),
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontFamily = family,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = Color(INK),
                    textAlign = TextAlign.End,
                    modifier = Modifier.width(72.dp),
                    maxLines = 1,
                )
            }
            if (!bordered) {
                Box(Modifier.fillMaxWidth().height(0.5.dp).background(rowRule))
            }
        }
    }
}

@Composable
private fun PaperTotals(view: InvoiceView, accent: Color, boxed: Boolean, serif: Boolean = false) {
    val family = if (serif) FontFamily.Serif else FontFamily.Default
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.End) {
        PaperTotalRow("Jumla ndogo", view.subtotal, family)
        if (view.discount > 0) PaperTotalRow("Punguzo", -view.discount, family)
        if (view.taxAmount > 0) PaperTotalRow("VAT ${Money.format(view.taxRate, 0)}%", view.taxAmount, family)
        Spacer(Modifier.height(4.dp))
        Row(
            Modifier
                .then(
                    if (boxed) {
                        Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(accent)
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    } else {
                        Modifier.padding(vertical = 4.dp)
                    },
                )
                .widthIn(min = 170.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "JUMLA",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontFamily = family,
                    fontWeight = FontWeight.Bold,
                ),
                color = if (boxed) Color.White else accent,
                modifier = Modifier.weight(1f),
            )
            Text(
                "TZS ${Money.format(view.total, 2)}",
                style = MaterialTheme.typography.labelLarge.copy(
                    fontFamily = family,
                    fontWeight = FontWeight.Bold,
                ),
                color = if (boxed) Color.White else accent,
            )
        }
    }
}

@Composable
private fun PaperTotalRow(label: String, value: Double, family: FontFamily) {
    Row(Modifier.padding(vertical = 1.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall.copy(fontFamily = family),
            color = Color(MUTED),
            textAlign = TextAlign.End,
            modifier = Modifier.width(110.dp),
        )
        Text(
            Money.format(value, 2),
            style = MaterialTheme.typography.labelSmall.copy(fontFamily = family, fontFeatureSettings = "tnum"),
            color = Color(INK),
            textAlign = TextAlign.End,
            modifier = Modifier.width(86.dp),
        )
    }
}

private fun fmtQty(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else Money.format(value, 2)

private fun initialsOf(name: String): String =
    name.split(' ').filter { it.isNotBlank() }.take(2)
        .map { it.first().uppercaseChar() }
        .joinToString("")
