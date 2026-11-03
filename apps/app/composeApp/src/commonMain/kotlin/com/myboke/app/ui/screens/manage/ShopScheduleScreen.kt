package com.myboke.app.ui.screens.manage

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.BadgeTone
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
import com.myboke.app.core.model.ShopDayHours
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.decodeImage

/** Siku za wiki kwa mpangilio wa backend (`mon` … `sun`). */
private val DAY_KEYS = listOf("mon", "tue", "wed", "thu", "fri", "sat", "sun")

/**
 * Saa za kazi za duka: kila siku ina kitufe cha kufungua/kufunga na saa.
 * Huhifadhi kwa ombi moja (`PATCH /shops/:id`) ili mabadiliko yote
 * yawe ya atomiki — hakuna hali nusu-imehifadhiwa.
 */
@Composable
fun ShopScheduleScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val s = t.shop
    val dayLabels = listOf(s.dayMon, s.dayTue, s.dayWed, s.dayThu, s.dayFri, s.daySat, s.daySun)

    LaunchedEffect(state.activeShop?.id) { state.loadSchedule() }

    val draft = remember(state.schedule, state.activeShop?.id) {
        mutableStateMapOf<String, ShopDayHours>().apply {
            DAY_KEYS.forEach { key ->
                put(key, state.schedule?.hours?.get(key) ?: ShopDayHours(open = "08:00", close = "20:00"))
            }
        }
    }
    var editing by remember { mutableStateOf<String?>(null) }
    var holidayDialog by remember { mutableStateOf(false) }
    var holidayDate by remember { mutableStateOf(Dates.isoDate(Dates.now())) }
    var holidayReason by remember { mutableStateOf("") }

    val schedule = state.schedule
    val summary = schedule?.today

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
            MbTopBar(s.schedule, onBack = { state.back() }) {
                MbIconButton(
                    MbIcon.Check,
                    onClick = { state.saveHours(draft.toMap()) },
                    tint = c.onPrimary,
                    background = c.primary,
                )
            }

            // ── Hali ya sasa ──────────────────────────────────
            MbCard(Modifier.padding(horizontal = 16.dp)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(46.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(
                                if (schedule?.isOpen == true) c.successBg else c.dangerBg,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        MbIconView(
                            if (schedule?.isOpen == true) MbIcon.Check else MbIcon.Clock,
                            size = 21.dp,
                            tint = if (schedule?.isOpen == true) c.successText() else c.danger,
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (schedule?.isOpen == true) s.openNow else s.closedNow,
                            style = MaterialTheme.typography.titleMedium,
                            color = c.textPrimary,
                        )
                        Text(
                            schedule?.reason ?: summary?.label ?: s.scheduleSub,
                            style = MaterialTheme.typography.labelSmall,
                            color = c.textMuted,
                        )
                    }
                    StatusPill(
                        if (schedule?.isOpen == true) s.openNow else s.closed,
                        if (schedule?.isOpen == true) BadgeTone.Success else BadgeTone.Danger,
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            SectionHeader(s.schedule, subtitle = s.scheduleSub, modifier = Modifier.padding(horizontal = 16.dp))

            MbCard(Modifier.padding(horizontal = 16.dp)) {
                Column(Modifier.padding(vertical = 4.dp)) {
                    DAY_KEYS.forEachIndexed { index, key ->
                        val row = draft[key] ?: ShopDayHours()
                        val isClosed = row.closed == true
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable { editing = key }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                dayLabels[index],
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isClosed) c.textMuted else c.textPrimary,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                if (isClosed) s.closed else "${row.open ?: "08:00"} – ${row.close ?: "20:00"}",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (isClosed) c.textMuted else c.textSecondary,
                            )
                            Spacer(Modifier.width(10.dp))
                            Switch(
                                checked = !isClosed,
                                onCheckedChange = { on ->
                                    draft[key] = row.copy(closed = !on)
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = c.primary,
                                ),
                                modifier = Modifier.size(width = 44.dp, height = 26.dp),
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            MbButton(
                s.saveHours,
                onClick = { state.saveHours(draft.toMap()) },
                modifier = Modifier.padding(horizontal = 16.dp),
                fullWidth = true,
            )

            Spacer(Modifier.height(22.dp))

            // ── Likizo ────────────────────────────────────────
            SectionHeader(
                "${s.holidays} (${state.holidays.size})",
                subtitle = s.holidaysSub,
                modifier = Modifier.padding(horizontal = 16.dp),
                action = s.addHoliday,
            ) { holidayDialog = true }

            if (state.holidays.isEmpty()) {
                MbCard(Modifier.padding(horizontal = 16.dp)) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        MbIconView(MbIcon.Calendar, size = 18.dp, tint = c.textMuted)
                        Spacer(Modifier.width(10.dp))
                        Text(s.noHolidays, style = MaterialTheme.typography.bodyMedium, color = c.textMuted)
                    }
                }
            } else {
                state.holidays.forEach { holiday ->
                    MbCard(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                        Row(
                            Modifier.fillMaxWidth().padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                Modifier.size(38.dp).clip(RoundedCornerShape(11.dp))
                                    .background(c.warning.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center,
                            ) {
                                MbIconView(MbIcon.Calendar, size = 18.dp, tint = c.warning)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    holiday.date.take(10),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = c.textPrimary,
                                )
                                Text(
                                    holiday.reason ?: s.holidays,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = c.textMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            MbIconButton(MbIcon.Trash, onClick = { state.removeHoliday(holiday.id) }, tint = c.danger)
                        }
                    }
                }
            }

            Spacer(Modifier.height(30.dp))
        }
    }

    // ── Kidirisha cha saa ────────────────────────────────────
    val editingKey = editing
    if (editingKey != null) {
        val index = DAY_KEYS.indexOf(editingKey)
        val row = draft[editingKey] ?: ShopDayHours()
        var open by remember(editingKey) { mutableStateOf(row.open ?: "08:00") }
        var close by remember(editingKey) { mutableStateOf(row.close ?: "20:00") }

        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable { editing = null },
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
                Text(
                    if (index >= 0) dayLabels[index] else s.schedule,
                    style = MaterialTheme.typography.headlineSmall,
                    color = c.textPrimary,
                )
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MbTextField(
                        value = open,
                        onValueChange = { open = it },
                        label = s.open,
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                    )
                    MbTextField(
                        value = close,
                        onValueChange = { close = it },
                        label = s.close,
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.height(14.dp))
                MbButton(
                    t.save,
                    onClick = {
                        draft[editingKey] = ShopDayHours(
                            open = normalizeTime(open),
                            close = normalizeTime(close),
                            closed = false,
                        )
                        editing = null
                    },
                    fullWidth = true,
                )
                Spacer(Modifier.height(6.dp))
                MbButton(
                    t.cancel,
                    onClick = { editing = null },
                    style = MbButtonStyle.Ghost,
                    fullWidth = true,
                    height = 42.dp,
                )
            }
        }
    }

    // ── Kidirisha cha likizo ─────────────────────────────────
    if (holidayDialog) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable { holidayDialog = false },
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
                Text(s.addHoliday, style = MaterialTheme.typography.headlineSmall, color = c.textPrimary)
                Spacer(Modifier.height(14.dp))
                MbTextField(
                    value = holidayDate,
                    onValueChange = { holidayDate = it },
                    label = s.holidayDate,
                    keyboardType = KeyboardType.Number,
                )
                Spacer(Modifier.height(10.dp))
                MbTextField(
                    value = holidayReason,
                    onValueChange = { holidayReason = it },
                    label = s.holidayReason,
                )
                Spacer(Modifier.height(14.dp))
                MbButton(
                    t.save,
                    onClick = {
                        if (holidayDate.length >= 10) {
                            state.addHoliday(holidayDate.take(10), holidayReason.ifBlank { null })
                            holidayDialog = false
                            holidayReason = ""
                        }
                    },
                    fullWidth = true,
                )
                Spacer(Modifier.height(6.dp))
                MbButton(
                    t.cancel,
                    onClick = { holidayDialog = false },
                    style = MbButtonStyle.Ghost,
                    fullWidth = true,
                    height = 42.dp,
                )
            }
        }
    }
}

/** "830" → "08:30", "2030" → "20:30", "8:30" → "08:30". */
internal fun normalizeTime(raw: String): String {
    val digits = raw.filter { it.isDigit() }
    val h: Int
    val m: Int
    when {
        digits.length <= 2 -> {
            h = digits.toIntOrNull() ?: 8
            m = 0
        }
        digits.length == 3 -> {
            h = digits.take(1).toIntOrNull() ?: 8
            m = digits.drop(1).toIntOrNull() ?: 0
        }
        else -> {
            h = digits.take(2).toIntOrNull() ?: 8
            m = digits.drop(2).take(2).toIntOrNull() ?: 0
        }
    }
    return "${h.coerceIn(0, 23).toString().padStart(2, '0')}:${m.coerceIn(0, 59).toString().padStart(2, '0')}"
}

/**
 * Karatasi ya QR ya duka: inaonyesha PNG halisi kutoka seva, na
 * inaruhusu kuipakua ili kuchapisha au kuweka kwenye mlango.
 */
@Composable
fun ShopQrSheet(state: AppState, onClose: () -> Unit) {
    val t = state.t
    val c = MbTheme.colors
    val s = t.shop

    LaunchedEffect(Unit) { state.loadQr() }

    val bitmap = remember(state.qrBytes) { state.qrBytes?.let { decodeImage(it) } }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .clickable(onClick = onClose),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier
                .padding(22.dp)
                .widthIn(max = 420.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(c.surface)
                .clickable(enabled = false) {}
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(s.qrTitle, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
            Spacer(Modifier.height(4.dp))
            Text(
                s.qrSub,
                style = MaterialTheme.typography.bodySmall,
                color = c.textMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(16.dp))

            Box(
                Modifier
                    .size(230.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color.White)
                    .border(1.dp, c.border, RoundedCornerShape(18.dp))
                    .padding(12.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap,
                        contentDescription = s.qrTitle,
                        contentScale = ContentScale.Fit,
                        filterQuality = FilterQuality.None,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        MbIconView(MbIcon.Qr, size = 42.dp, tint = c.textMuted)
                        Spacer(Modifier.height(6.dp))
                        Text(t.loading, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
                    }
                }
            }

            if (state.activeShop != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    state.activeShop?.name ?: "",
                    style = MaterialTheme.typography.titleSmall,
                    color = c.textPrimary,
                )
            }

            Spacer(Modifier.height(16.dp))
            MbButton(
                s.downloadQr,
                onClick = { state.downloadQr() },
                icon = MbIcon.Download,
                fullWidth = true,
                enabled = bitmap != null,
            )
            Spacer(Modifier.height(6.dp))
            MbButton(
                t.close,
                onClick = onClose,
                style = MbButtonStyle.Ghost,
                fullWidth = true,
                height = 42.dp,
            )
        }
    }

    androidx.compose.runtime.DisposableEffect(Unit) {
        onDispose { state.clearQr() }
    }
}
