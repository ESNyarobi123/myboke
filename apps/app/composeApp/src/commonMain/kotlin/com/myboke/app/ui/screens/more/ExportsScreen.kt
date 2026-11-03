package com.myboke.app.ui.screens.more

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbChip
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MbTopBar
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.i18n.Lang

/**
 * Export halisi: inatumia `POST /exports` ya backend (xlsx · csv · json),
 * inasubiri kukamilika, kisha inapakua faili na kuihifadhi kwenye kifaa.
 */
@Composable
fun ExportsScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var format by remember { mutableStateOf("xlsx") }

    LaunchedEffect(Unit) { state.loadExports() }

    val types = listOf(
        Triple("sales", t.navReports, MbIcon.Receipt),
        Triple("products", t.products, MbIcon.Box),
        Triple("stock", "Stock", MbIcon.Grid),
        Triple("expenses", t.expenses, MbIcon.Wallet),
        Triple("debts", t.debts, MbIcon.Card),
        Triple("customers", t.customers, MbIcon.Users),
        Triple("shifts", "Shifts", MbIcon.Clock),
        Triple("all", "Zote (all)", MbIcon.Download),
    )

    Column(Modifier.fillMaxSize()) {
        MbTopBar(t.inv.exportData, onBack = { state.back() })
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Text(t.inv.exportHint, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
            Spacer(Modifier.height(14.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("xlsx", "csv", "json").forEach {
                    MbChip(text = it.uppercase(), selected = format == it, onClick = { format = it })
                }
            }

            Spacer(Modifier.height(16.dp))
            SectionHeader(t.inv.exportData)
            Spacer(Modifier.height(10.dp))

            types.forEach { (key, label, icon) ->
                val busyKey = "$key-$format"
                MbCard(
                    Modifier.fillMaxWidth().padding(bottom = 10.dp),
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
                            MbIconView(icon, size = 18.dp, tint = c.primary)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                label,
                                style = MaterialTheme.typography.titleSmall,
                                color = c.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                "${key}.$format",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                        MbButton(
                            if (state.exportBusy == busyKey) "…" else "Export",
                            onClick = { state.exportData(key, format) },
                            style = MbButtonStyle.Secondary,
                            height = 40.dp,
                            loading = state.exportBusy == busyKey,
                            enabled = state.exportBusy == null,
                            icon = MbIcon.Download,
                        )
                    }
                }
            }

            if (state.exportJobs.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                SectionHeader("Recent exports")
                Spacer(Modifier.height(8.dp))
                state.exportJobs.take(8).forEach { job ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                job.fileName ?: "${job.type}.${job.format}",
                                style = MaterialTheme.typography.bodySmall,
                                color = c.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                "${job.type} · ${job.format.uppercase()} · ${job.rowCount ?: 0} rows",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                        StatusPill(
                            job.status,
                            if (job.status == "DONE") com.myboke.app.core.design.BadgeTone.Success
                            else com.myboke.app.core.design.BadgeTone.Neutral,
                        )
                    }
                }
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}
