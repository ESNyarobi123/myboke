package com.myboke.app.ui.screens.home

import com.myboke.app.core.i18n.Lang

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.Avatar
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.BarChart
import com.myboke.app.core.design.DeltaPill
import com.myboke.app.core.design.ErrorState
import com.myboke.app.core.design.ListSkeleton
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MoneyCompact
import com.myboke.app.core.design.MoneyText
import com.myboke.app.core.design.ProgressBar
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.Sparkline
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.model.Mission
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money

@Composable
fun HomeScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val dashboard = state.dashboard

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth > 700.dp
        val contentWidth = if (wide) 760.dp else maxWidth

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // ── Header + hero ────────────────────────────────
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF071B4D), Color(0xFF0B37A1), Color(0xFF0269E9)),
                        ),
                    ),
            ) {
                Column(
                    Modifier
                        .widthIn(max = 820.dp)
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 16.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                greeting(t),
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.72f),
                            )
                            Text(
                                state.userName.ifBlank { state.businessName },
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        MbIconButton(
                            MbIcon.Search,
                            onClick = { state.navigate(Page.Products) },
                            tint = Color.White,
                            background = Color.White.copy(alpha = 0.13f),
                            size = 38.dp,
                            iconSize = 19.dp,
                        )
                        Spacer(Modifier.width(8.dp))
                        MbIconButton(
                            MbIcon.Bell,
                            onClick = { state.navigate(Page.Notifications) },
                            tint = Color.White,
                            background = Color.White.copy(alpha = 0.13f),
                            size = 38.dp,
                            iconSize = 19.dp,
                            badge = state.unreadCount,
                        )
                        Spacer(Modifier.width(8.dp))
                        Avatar(state.userName.ifBlank { "MyBoke" }, size = 38.dp)
                    }

                    Spacer(Modifier.height(10.dp))

                    // Shop switcher pill
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color.White.copy(alpha = 0.14f))
                            .clickable { state.navigate(Page.Shops) }
                            .padding(horizontal = 11.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        MbIconView(MbIcon.Store, size = 13.dp, tint = Color.White.copy(alpha = 0.9f))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            state.activeShop?.name ?: t.shopSwitcher,
                            style = MaterialTheme.typography.labelMedium,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.width(3.dp))
                        MbIconView(MbIcon.ChevronDown, size = 13.dp, tint = Color.White.copy(alpha = 0.9f))
                    }

                    if (state.offlineMode) {
                        Spacer(Modifier.height(10.dp))
                        Row(
                            Modifier
                                .clip(RoundedCornerShape(50))
                                .background(Color(0xFFFFC107).copy(alpha = 0.20f))
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                t.demoBadge,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFFFE082),
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // Hero profit
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color.White.copy(alpha = 0.12f))
                            .padding(18.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                t.todaysProfit,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.78f),
                                letterSpacing = 1.2.sp,
                            )
                            Spacer(Modifier.weight(1f))
                            DeltaPill(
                                Money.percentChange(
                                    Money.parse(dashboard?.today?.profit),
                                    Money.parse(dashboard?.today?.profit) * 0.88,
                                ),
                            )
                        }
                        Spacer(Modifier.height(6.dp))
                        MoneyText(
                            value = Money.parse(dashboard?.today?.profit),
                            style = MaterialTheme.typography.displayMedium,
                            color = Color.White,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            t.vsYesterday,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.66f),
                        )
                        Spacer(Modifier.height(12.dp))
                        Sparkline(
                            values = dashboard?.trend?.map { Money.parse(it.profit) }.orEmpty()
                                .ifEmpty { listOf(2.0, 3.4, 2.8, 4.6, 3.9, 5.4, 6.2) },
                            modifier = Modifier.fillMaxWidth().height(46.dp),
                        )
                    }
                }
            }

            Column(
                Modifier
                    .widthIn(max = contentWidth)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                Spacer(Modifier.height(16.dp))

                if (state.dashboardError != null && dashboard == null) {
                    ErrorState(
                        title = t.errorTitle,
                        body = state.dashboardError ?: t.errorBody,
                        retryLabel = t.retry,
                        onRetry = { state.loadDashboard() },
                    )
                } else if (dashboard == null) {
                    ListSkeleton(4)
                } else {
                    // ── KPI 2×2 ──────────────────────────────
                    val kpis = listOf(
                        Kpi(
                            t.sales,
                            Money.parse(dashboard.today.revenue),
                            MbIcon.TrendingUp,
                            c.success,
                            c.successBg,
                            "${Money.format(dashboard.today.salesCount.toDouble(), 0)} ${t.receipt}",
                            true,
                        ),
                        Kpi(
                            t.expenses,
                            Money.parse(dashboard.month.expenses),
                            MbIcon.Wallet,
                            c.warning,
                            c.warningBg,
                            t.thisMonth,
                            true,
                        ),
                        Kpi(
                            t.debts,
                            Money.parse(dashboard.debts.oweMe),
                            MbIcon.Users,
                            c.danger,
                            c.dangerBg,
                            "${Money.format(Money.parse(dashboard.debts.overdue), 0)} ${t.overdue.lowercase()}",
                            true,
                        ),
                        Kpi(
                            t.products,
                            dashboard.stock.products.toDouble(),
                            MbIcon.Box,
                            c.secondary,
                            c.infoBg,
                            "${dashboard.stock.lowStock} ${t.lowStock.lowercase()}",
                            false,
                        ),
                    )

                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            kpis.take(2).forEach { kpi ->
                                Box(Modifier.weight(1f)) { KpiTile(kpi, isMoney = kpi.isMoney) }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            kpis.drop(2).forEach { kpi ->
                                Box(Modifier.weight(1f)) { KpiTile(kpi, isMoney = kpi.isMoney) }
                            }
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // ── Quick actions ────────────────────────
                    SectionHeader(t.quickActions)
                    Spacer(Modifier.height(10.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        QuickAction(MbIcon.Cart, t.navSell, c.primary) { state.selectTab(com.myboke.app.core.data.Tab.Sell) }
                        QuickAction(MbIcon.Box, t.products, c.secondary) { state.navigate(Page.Products) }
                        QuickAction(MbIcon.Users, t.customers, c.success) { state.selectTab(com.myboke.app.core.data.Tab.People) }
                        QuickAction(MbIcon.Wallet, t.expenses, c.warning) { state.navigate(Page.Expenses) }
                        QuickAction(MbIcon.Coins, t.debts, c.danger) { state.navigate(Page.Debts) }
                        QuickAction(MbIcon.Chart, t.reports, c.primaryDeep) { state.selectTab(com.myboke.app.core.data.Tab.Reports) }
                    }

                    Spacer(Modifier.height(20.dp))

                    // ── Weekly chart ─────────────────────────
                    MbCard(Modifier.fillMaxWidth(), padding = 16.dp) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(t.weekSales, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
                                Text(
                                    "TZS ${Money.format(dashboard.trend.sumOf { Money.parse(it.revenue) }, 0)}",
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = c.textPrimary,
                                )
                            }
                            StatusPill(t.thisWeek, BadgeTone.Brand)
                        }
                        Spacer(Modifier.height(14.dp))
                        BarChart(
                            values = dashboard.trend.map { Money.parse(it.revenue) },
                            labels = dashboard.trend.mapIndexed { i, _ ->
                                Dates.dayNameFor(if (dashboard.trend.size == 7) i else i % 7, state.lang)
                            },
                            height = 108.dp,
                        )
                    }

                    Spacer(Modifier.height(20.dp))

                    // ── Alerts ──────────────────────────────
                    val lowCount = state.products.count { it.stockQuantity > 0 && it.stockQuantity <= it.alertLevel }
                    val outCount = state.products.count { it.stockQuantity <= 0 }
                    SectionHeader(t.alerts)
                    Spacer(Modifier.height(10.dp))
                    if (lowCount == 0 && outCount == 0 && Money.parse(dashboard.debts.overdue) <= 0) {
                        MbCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                MbIconView(MbIcon.Check, size = 20.dp, tint = c.success)
                                Spacer(Modifier.width(10.dp))
                                Text(t.alertNone, style = MaterialTheme.typography.bodyMedium, color = c.textSecondary)
                            }
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (lowCount > 0) {
                                AlertRow(
                                    MbIcon.Warning, c.warning, c.warningBg,
                                    "${t.alertLowStock}: $lowCount",
                                    "${t.remaining} ${state.products.filter { it.stockQuantity > 0 && it.stockQuantity <= it.alertLevel }.take(2).joinToString(", ") { it.name }}",
                                ) { state.navigate(Page.Products) }
                            }
                            if (outCount > 0) {
                                AlertRow(
                                    MbIcon.Box, c.danger, c.dangerBg,
                                    "${t.outOfStockLabel}: $outCount",
                                    state.products.filter { it.stockQuantity <= 0 }.take(2).joinToString(", ") { it.name },
                                ) { state.navigate(Page.Products) }
                            }
                            if (Money.parse(dashboard.debts.overdue) > 0) {
                                AlertRow(
                                    MbIcon.Clock, c.danger, c.dangerBg,
                                    "${t.alertOverdueDebt}: TZS ${Money.format(Money.parse(dashboard.debts.overdue), 0)}",
                                    "${t.debtsTitle} — ${t.reminder}",
                                ) { state.navigate(Page.Debts) }
                            }
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // ── Mission ─────────────────────────────
                    val mission = state.missions.firstOrNull { it.status != "COMPLETED" }
                    if (mission != null) {
                        SectionHeader(t.todaysMission, action = t.seeAll) { state.navigate(Page.Growth) }
                        Spacer(Modifier.height(10.dp))
                        MissionCard(mission, state)
                        Spacer(Modifier.height(20.dp))
                    }

                    // ── Recent activity ─────────────────────
                    SectionHeader(
                        t.recentActivity,
                        action = t.seeAll,
                    ) { state.selectTab(com.myboke.app.core.data.Tab.Sell) }
                    Spacer(Modifier.height(8.dp))
                    if (dashboard.recentSales.isEmpty()) {
                        MbCard(Modifier.fillMaxWidth()) {
                            Text(
                                t.emptyHomeBody,
                                style = MaterialTheme.typography.bodyMedium,
                                color = c.textMuted,
                            )
                        }
                    } else {
                        dashboard.recentSales.forEach { sale ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable { state.navigate(Page.Receipt) }
                                    .padding(vertical = 10.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    Modifier
                                        .size(42.dp)
                                        .clip(RoundedCornerShape(13.dp))
                                        .background(c.surface2),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    MbIconView(MbIcon.Receipt, size = 20.dp, tint = c.primary)
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        sale.firstItem ?: sale.receiptNo,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = c.textPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        "${sale.receiptNo} · ${sale.itemCount} ${t.products.lowercase()}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = c.textMuted,
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "TZS ${Money.format(Money.parse(sale.total), 0)}",
                                        style = MaterialTheme.typography.titleMedium.copy(fontFeatureSettings = "tnum"),
                                        color = c.textPrimary,
                                    )
                                    Text(
                                        "+${Money.format(Money.parse(sale.profit), 0)}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = c.successText(),
                                    )
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(28.dp))
                }
            }
        }
    }
}

private data class Kpi(
    val label: String,
    val value: Double,
    val icon: MbIcon,
    val tint: Color,
    val bg: Color,
    val hint: String,
    val isMoney: Boolean,
)

@Composable
private fun KpiTile(kpi: Kpi, isMoney: Boolean) {
    val c = MbTheme.colors
    MbCard(Modifier.fillMaxWidth(), padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(30.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(kpi.bg),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(kpi.icon, size = 16.dp, tint = kpi.tint)
            }
            Spacer(Modifier.weight(1f))
            Text(
                kpi.label.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.6.sp),
                color = c.textMuted,
            )
        }
        Spacer(Modifier.height(10.dp))
        if (isMoney) {
            MoneyCompact(kpi.value, style = MaterialTheme.typography.headlineSmall)
        } else {
            Text(
                Money.format(kpi.value, 0),
                style = MaterialTheme.typography.headlineSmall,
                color = c.textPrimary,
            )
        }
        Spacer(Modifier.height(2.dp))
        Text(
            kpi.hint,
            style = MaterialTheme.typography.labelSmall,
            color = c.textMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun QuickAction(icon: MbIcon, label: String, tint: Color, onClick: () -> Unit) {
    val c = MbTheme.colors
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 2.dp, horizontal = 2.dp),
    ) {
        Box(
            Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(15.dp))
                .background(tint.copy(alpha = 0.11f)),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(icon, size = 22.dp, tint = tint)
        }
        Spacer(Modifier.height(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            color = c.textSecondary,
            maxLines = 1,
        )
    }
}

@Composable
private fun AlertRow(
    icon: MbIcon,
    tint: Color,
    bg: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    val c = MbTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(c.surface)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(34.dp).clip(RoundedCornerShape(11.dp)).background(bg),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(icon, size = 17.dp, tint = tint)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
            Text(
                subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = c.textMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        MbIconView(MbIcon.ChevronRight, size = 15.dp, tint = c.textMuted)
    }
}

@Composable
private fun MissionCard(mission: Mission, state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF16A760), Color(0xFF0A9CBF))))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.Target, size = 20.dp, tint = Color.White)
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    mission.title,
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    mission.description ?: t.earnCoins,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.82f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.2f))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MbIconView(MbIcon.Coins, size = 13.dp, tint = Color(0xFFFDE68A))
                Spacer(Modifier.width(4.dp))
                Text("+${mission.coinsReward}", style = MaterialTheme.typography.labelMedium, color = Color.White)
            }
        }
        Spacer(Modifier.height(12.dp))
        ProgressBar(
            progress = when (mission.status) {
                "COMPLETED" -> 1f
                "ACTIVE" -> 0.55f
                else -> 0.2f
            },
            color = Color.White,
            track = Color.White.copy(alpha = 0.25f),
            height = 6.dp,
        )
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${state.coins.balance} ${t.coins}",
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.9f),
            )
            Spacer(Modifier.weight(1f))
            Box(
                Modifier
                    .clip(RoundedCornerShape(9.dp))
                    .background(Color.White)
                    .clickable { state.completeMission(mission) }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    t.done,
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                    color = Color(0xFF0E8A50),
                )
            }
        }
    }
}

private fun greeting(t: com.myboke.app.core.i18n.Strings): String {
    val hour = (Dates.now() / 3_600_000L + 3) % 24
    return when {
        hour < 12 -> t.greetMorning
        hour < 17 -> t.greetAfternoon
        else -> t.greetEvening
    }
}
