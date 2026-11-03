package com.myboke.app.ui.screens.reports

import androidx.compose.foundation.background
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.BarChart
import com.myboke.app.core.design.EmptyState
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MbTopBar
import com.myboke.app.core.design.MoneyCompact
import com.myboke.app.core.design.MoneyText
import com.myboke.app.core.design.ProgressBar
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money

@Composable
fun ReportsScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var period by remember {
        mutableStateOf(
            when (state.reportDays) {
                7 -> 0
                30 -> 1
                90 -> 2
                else -> 3
            },
        )
    }
    var customOpen by remember { mutableStateOf(false) }
    var customFrom by remember { mutableStateOf("") }
    var customTo by remember { mutableStateOf("") }

    if (!state.canSeeReports) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            MbTopBar(t.reports)
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(30.dp)) {
                    Box(
                        Modifier.size(76.dp).clip(CircleShape).background(c.surface2),
                        contentAlignment = Alignment.Center,
                    ) {
                        MbIconView(MbIcon.Lock, size = 34.dp, tint = c.textMuted)
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(t.reportForbidden, style = MaterialTheme.typography.titleLarge, color = c.textPrimary, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    Spacer(Modifier.height(6.dp))
                    Text(t.reportForbiddenBody, style = MaterialTheme.typography.bodyMedium, color = c.textMuted, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
            }
        }
        return
    }

    val dashboard = state.dashboard
    val report = state.reportProfit
    val periods = listOf(t.last7, t.last30, t.last90, t.custom)

    LaunchedEffect(Unit) { state.loadReports(state.reportDays) }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 760.dp).fillMaxWidth()) {
            MbTopBar(
                title = t.reports,
                subtitle = Dates.monthYearFor(Dates.now(), state.lang),
            ) {
                MbIconView(MbIcon.Filter, size = 20.dp, tint = c.textSecondary)
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                periods.forEachIndexed { index, label ->
                    StatusPill(
                        text = label,
                        tone = if (period == index) BadgeTone.Brand else BadgeTone.Neutral,
                        modifier = Modifier.clickable {
                            period = index
                            when (index) {
                                0 -> state.loadReports(7)
                                1 -> state.loadReports(30)
                                2 -> state.loadReports(90)
                                else -> {
                                    customFrom = Dates.isoDate(Dates.now() - 29 * 86_400_000L)
                                    customTo = Dates.isoDate(Dates.now())
                                    customOpen = true
                                }
                            }
                        },
                    )
                }
            }

            Spacer(Modifier.height(14.dp))

            // ── Kadi kuu ────────────────────────────────────
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(18.dp))
                        .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF0B37A1), Color(0xFF0269E9))))
                        .padding(16.dp),
                ) {
                    Text(t.income, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f))
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "TZS ${Money.format(Money.parse(report?.revenue ?: dashboard?.month?.revenue), 0)}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${state.reportSales?.totals?.count ?: dashboard?.month?.salesCount ?: 0} ${t.sales.lowercase()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.7f),
                    )
                }
                Column(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(18.dp))
                        .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF16A760), Color(0xFF0A9CBF))))
                        .padding(16.dp),
                ) {
                    Text(t.profit, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.78f))
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "TZS ${Money.format(Money.parse(report?.grossProfit ?: dashboard?.month?.profit), 0)}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${t.margin} ${Money.format(report?.marginPercent ?: dashboard?.month?.marginPercent ?: 0.0, 1)}%",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.75f),
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniStat(t.expenses, Money.parse(report?.expenses ?: dashboard?.month?.expenses), MbIcon.Wallet, c.warning, Modifier.weight(1f))
                MiniStat(t.net, Money.parse(report?.netProfit ?: dashboard?.month?.netProfit), MbIcon.TrendingUp, c.success, Modifier.weight(1f))
            }

            Spacer(Modifier.height(20.dp))

            // ── Chart ───────────────────────────────────────
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                SectionHeader(t.weekSales, subtitle = periods[period])
                Spacer(Modifier.height(14.dp))
                val daily = state.cashFlow?.daily.orEmpty().takeLast(14)
                BarChart(
                    values = if (daily.isNotEmpty()) {
                        daily.map { Money.parse(it.`in`) }
                    } else {
                        dashboard?.trend?.map { Money.parse(it.revenue) }.orEmpty()
                    },
                    labels = if (daily.isNotEmpty()) {
                        daily.map { it.date.takeLast(2) }
                    } else {
                        dashboard?.trend?.mapIndexed { i, _ -> Dates.dayNameFor(i, state.lang) }.orEmpty()
                    },
                    height = 130.dp,
                )
            }

            Spacer(Modifier.height(20.dp))

            // ── Cash flow ───────────────────────────────────
            val flow = state.cashFlow
            SectionHeader(t.cashFlow, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(10.dp))
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(t.inLabel, style = MaterialTheme.typography.labelSmall, color = c.successText())
                        Text(
                            "TZS ${Money.formatShort(Money.parse(flow?.inflow))}",
                            style = MaterialTheme.typography.titleLarge,
                            color = c.textPrimary,
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(t.outLabel, style = MaterialTheme.typography.labelSmall, color = c.dangerText())
                        Text(
                            "TZS ${Money.formatShort(Money.parse(flow?.outflow))}",
                            style = MaterialTheme.typography.titleLarge,
                            color = c.textPrimary,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(t.net, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
                        MoneyCompact(
                            Money.parse(flow?.net),
                            style = MaterialTheme.typography.titleLarge,
                            color = c.successText(),
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
                val inflow = Money.parse(flow?.inflow).coerceAtLeast(1.0)
                ProgressBar(
                    progress = (Money.parse(flow?.net) / inflow).toFloat().coerceIn(0f, 1f),
                    height = 7.dp,
                    color = c.success,
                )
                Spacer(Modifier.height(14.dp))
                flow?.breakdown?.take(4)?.forEach { line ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(if (line.type == "IN") c.success else c.danger),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            line.label,
                            style = MaterialTheme.typography.bodySmall,
                            color = c.textSecondary,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            "${if (line.type == "IN") "+" else "−"} ${Money.formatShort(Money.parse(line.amount))}",
                            style = MaterialTheme.typography.labelMedium,
                            color = if (line.type == "IN") c.successText() else c.dangerText(),
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // ── Top bidhaa ──────────────────────────────────
            SectionHeader(t.topProducts, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(10.dp))
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                val items = state.topProducts
                if (items.isEmpty()) {
                    Text(t.emptyTitle, style = MaterialTheme.typography.bodyMedium, color = c.textMuted)
                } else {
                    val maxRevenue = items.maxOfOrNull { Money.parse(it.revenue) } ?: 1.0
                    items.take(5).forEachIndexed { index, item ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(26.dp).clip(CircleShape).background(c.primary.copy(alpha = 0.1f)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "${index + 1}",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = c.primary,
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    item.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = c.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Spacer(Modifier.height(5.dp))
                                ProgressBar(
                                    progress = (Money.parse(item.revenue) / maxRevenue).toFloat().coerceIn(0.04f, 1f),
                                    height = 5.dp,
                                    color = if (index == 0) c.success else c.primary,
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            Text(
                                "${Money.formatShort(Money.parse(item.revenue))}",
                                style = MaterialTheme.typography.labelMedium,
                                color = c.textSecondary,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // ── Wateja ──────────────────────────────────────
            SectionHeader(t.topCustomers, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(10.dp))
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                val items = state.topCustomers
                if (items.isEmpty()) {
                    Text(t.emptyTitle, style = MaterialTheme.typography.bodyMedium, color = c.textMuted)
                } else {
                    items.take(4).forEach { customer ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(36.dp).clip(CircleShape).background(c.successBg),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    customer.name.split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.take(2).joinToString(""),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = c.successText(),
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(customer.name, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                                Text(
                                    "${customer.orders} ${t.sales.lowercase()}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = c.textMuted,
                                )
                            }
                            Text(
                                "TZS ${Money.formatShort(Money.parse(customer.revenue))}",
                                style = MaterialTheme.typography.titleMedium,
                                color = c.textPrimary,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // ── Export ──────────────────────────────────────
            SectionHeader(t.analytics, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(10.dp))
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                ExportTile(MbIcon.Download, "Excel", Modifier.weight(1f)) {
                    state.exportData("sales", "xlsx")
                }
                ExportTile(MbIcon.Doc, "CSV", Modifier.weight(1f)) {
                    state.exportData("sales", "csv")
                }
                ExportTile(MbIcon.Send, "JSON", Modifier.weight(1f)) {
                    state.exportData("all", "json")
                }
            }

            Spacer(Modifier.height(30.dp))
        }
    }

    if (customOpen) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable { customOpen = false },
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
                Text(t.custom, style = MaterialTheme.typography.headlineSmall, color = c.textPrimary)
                Spacer(Modifier.height(12.dp))
                MbTextField(
                    value = customFrom,
                    onValueChange = { customFrom = it },
                    label = "${t.dateFrom} (YYYY-MM-DD)",
                )
                Spacer(Modifier.height(10.dp))
                MbTextField(
                    value = customTo,
                    onValueChange = { customTo = it },
                    label = "${t.dateTo} (YYYY-MM-DD)",
                )
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MbButton(
                        t.cancel,
                        onClick = { customOpen = false },
                        style = MbButtonStyle.Ghost,
                        modifier = Modifier.weight(1f),
                    )
                    MbButton(
                        t.save,
                        onClick = {
                            val from = customFrom.trim()
                            val to = customTo.trim()
                            if (from.length == 10 && to.length == 10 && to >= from) {
                                state.loadReportsRange(from, to)
                                customOpen = false
                            } else {
                                state.showSnack(t.errorBody)
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun MiniStat(label: String, value: Double, icon: MbIcon, tint: Color, modifier: Modifier = Modifier) {
    val c = MbTheme.colors
    MbCard(modifier, padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MbIconView(icon, size = 15.dp, tint = tint)
            Spacer(Modifier.width(6.dp))
            Text(label.uppercase(), style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.5.sp), color = c.textMuted)
        }
        Spacer(Modifier.height(8.dp))
        MoneyCompact(value, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun ExportTile(icon: MbIcon, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = MbTheme.colors
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(c.surface)
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MbIconView(icon, size = 20.dp, tint = c.primary)
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = c.textSecondary)
    }
}
