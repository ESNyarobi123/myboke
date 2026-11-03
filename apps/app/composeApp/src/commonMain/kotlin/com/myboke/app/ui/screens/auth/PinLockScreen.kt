package com.myboke.app.ui.screens.auth

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.LanguagePill
import com.myboke.app.core.design.LanguagePickerOverlay
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MyBokeMark
import com.myboke.app.core.design.MyBokeWordmark
import com.myboke.app.core.i18n.Lang

private val LockBase = Color(0xFF04122F)
private val LockMid = Color(0xFF0B37A1)
private val LockAccent = Color(0xFF34E0A1)

/** Tarakimu za Kiarabu kwa kuonyesha (Kiarabu hutumia ٠١٢٣٤٥٦٧٨٩). */
private fun digit(ch: Char, lang: Lang): String {
    if (lang != Lang.AR) return ch.toString()
    val idx = ch - '0'
    return if (idx in 0..9) "٠١٢٣٤٥٦٧٨٩"[idx].toString() else ch.toString()
}

private fun localized(code: String, lang: Lang): String =
    code.map { digit(it, lang) }.joinToString("")

/**
 * Skrini ya kufuli: inaonekana kila app inapofunguliwa ikiwa PIN imewekwa.
 * Ina keypad kubwa (rahisi kwa kidole kimoja) na hali ya hitilafu inayotikisika.
 */
@Composable
fun PinLockScreen(state: AppState) {
    val t = state.t
    val lang = state.lang
    var code by remember { mutableStateOf("") }
    var showLang by remember { mutableStateOf(false) }

    // Tikisa vidokezo PIN inapokosewa — bila kuathiri layout (offsets pekee).
    val shakeX = remember { Animatable(0f) }
    LaunchedEffect(state.pinError) {
        if (state.pinError) {
            listOf(-16f, 13f, -10f, 7f, -3f, 0f).forEach { x ->
                shakeX.snapTo(x)
                kotlinx.coroutines.delay(48)
            }
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(LockBase, LockMid, Color(0xFF0269E9)))),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                MyBokeMark(size = 24.dp)
                Spacer(Modifier.width(8.dp))
                MyBokeWordmark(size = 17.dp, color = Color.White)
                Spacer(Modifier.weight(1f))
                LanguagePill(current = lang, onClick = { showLang = true })
            }

            Spacer(Modifier.weight(0.6f))

            Box(
                Modifier
                    .size(66.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White.copy(alpha = 0.12f))
                    .border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.Lock, size = 30.dp, tint = Color.White)
            }
            Spacer(Modifier.height(16.dp))
            Text(
                t.auth.enterPin,
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                state.userName.ifBlank { t.auth.enterPinSub },
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(22.dp))

            // Vidokezo 4
            Row(
                Modifier.offset { IntOffset(shakeX.value.dp.roundToPx(), 0) },
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                repeat(4) { i ->
                    val filled = i < code.length
                    Box(
                        Modifier
                            .size(if (filled) 15.dp else 13.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    state.pinError -> MbTheme.colors.danger
                                    filled -> LockAccent
                                    else -> Color.White.copy(alpha = 0.22f)
                                },
                            ),
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                if (state.pinError) t.auth.pinWrong else "",
                style = MaterialTheme.typography.labelMedium,
                color = Color(0xFFFFB4B4),
                modifier = Modifier.height(18.dp),
            )

            Spacer(Modifier.weight(0.4f))

            // Keypad 3×4
            Column(
                Modifier.widthIn(max = 330.dp).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                listOf("123", "456", "789").forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { d ->
                            KeypadKey(digit(d, lang), Modifier.weight(1f)) {
                                if (state.pinError) return@KeypadKey
                                if (code.length < 4) {
                                    code += d
                                    if (code.length == 4) {
                                        val entered = code
                                        code = ""
                                        state.unlock(entered)
                                    }
                                }
                            }
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.weight(1f))
                    KeypadKey(digit('0', lang), Modifier.weight(1f)) {
                        if (state.pinError) return@KeypadKey
                        if (code.length < 4) code += "0"
                        if (code.length == 4) {
                            val entered = code
                            code = ""
                            state.unlock(entered)
                        }
                    }
                    KeypadKey("\u232B", Modifier.weight(1f), accent = LockAccent) {
                        if (code.isNotEmpty()) code = code.dropLast(1)
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            Text(
                t.logout,
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.6f),
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { state.logout() }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            )
            Spacer(Modifier.height(18.dp))
        }
    }

    if (showLang) {
        LanguagePickerOverlay(
            current = lang,
            title = t.auth.languageTitle,
            subtitle = t.auth.languageSub,
            cancelLabel = t.cancel,
            onPick = {
                state.switchLang(it)
                showLang = false
            },
            onDismiss = { showLang = false },
        )
    }
}

@Composable
private fun KeypadKey(
    label: String,
    modifier: Modifier = Modifier,
    accent: Color? = null,
    onClick: () -> Unit,
) {
    Box(
        modifier
            .height(58.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (accent != null) accent.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.10f),
            )
            .border(
                1.dp,
                if (accent != null) accent.copy(alpha = 0.4f) else Color.White.copy(alpha = 0.14f),
                RoundedCornerShape(16.dp),
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = if (accent != null) accent else Color.White,
        )
    }
}

/**
 * Kidirisha cha kuweka / kuzima PIN. Hatua: PIN mpya → rudia → imehifadhiwa.
 * Kuzima kunahitaji PIN ya sasa.
 */
@Composable
fun PinSetupDialog(state: AppState, onClose: () -> Unit) {
    val t = state.t
    val c = MbTheme.colors
    var step by remember { mutableStateOf(if (state.pinSet) 0 else 1) }
    var current by remember { mutableStateOf("") }
    var first by remember { mutableStateOf("") }
    var second by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

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
                .widthIn(max = 440.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(c.surface)
                .clickable(enabled = false) {}
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(38.dp).clip(RoundedCornerShape(11.dp))
                        .background(c.primary.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center,
                ) {
                    MbIconView(MbIcon.Lock, size = 19.dp, tint = c.primary)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.auth.appLock, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
                    Text(t.auth.appLockSub, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
                }
            }
            Spacer(Modifier.height(16.dp))

            when (step) {
                0 -> {
                    Text(t.auth.currentPin, style = MaterialTheme.typography.labelMedium, color = c.textSecondary)
                    Spacer(Modifier.height(8.dp))
                    PinDots(current, error != null) { if (it.length <= 4) current = it }
                    if (error != null) {
                        Spacer(Modifier.height(6.dp))
                        Text(error ?: "", style = MaterialTheme.typography.labelSmall, color = c.danger)
                    }
                    Spacer(Modifier.height(14.dp))
                    MbButton(
                        t.auth.changePin,
                        onClick = {
                            if (state.checkPin(current)) {
                                error = null
                                current = ""
                                step = 1
                            } else {
                                error = t.auth.pinWrong
                            }
                        },
                        fullWidth = true,
                        height = 46.dp,
                    )
                    Spacer(Modifier.height(6.dp))
                    MbButton(
                        t.auth.appLockOff,
                        onClick = {
                            if (state.removePin(current)) onClose() else error = t.auth.pinWrong
                        },
                        style = MbButtonStyle.Ghost,
                        fullWidth = true,
                        height = 42.dp,
                    )
                    Spacer(Modifier.height(6.dp))
                    MbButton(t.cancel, onClick = onClose, style = MbButtonStyle.Ghost, fullWidth = true, height = 38.dp)
                }
                1 -> {
                    Text(t.auth.setPinTitle, style = MaterialTheme.typography.labelMedium, color = c.textSecondary)
                    Spacer(Modifier.height(4.dp))
                    Text(t.auth.setPinSub, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
                    Spacer(Modifier.height(8.dp))
                    PinDots(first, error != null) { if (it.length <= 4) first = it }
                    if (error != null) {
                        Spacer(Modifier.height(6.dp))
                        Text(error ?: "", style = MaterialTheme.typography.labelSmall, color = c.danger)
                    }
                    Spacer(Modifier.height(14.dp))
                    MbButton(
                        t.next,
                        onClick = {
                            if (first.length == 4) {
                                error = null
                                step = 2
                            } else {
                                error = t.auth.setPinSub
                            }
                        },
                        fullWidth = true,
                        height = 46.dp,
                    )
                    Spacer(Modifier.height(6.dp))
                    MbButton(t.cancel, onClick = onClose, style = MbButtonStyle.Ghost, fullWidth = true, height = 42.dp)
                }
                else -> {
                    Text(t.auth.confirmPin, style = MaterialTheme.typography.labelMedium, color = c.textSecondary)
                    Spacer(Modifier.height(8.dp))
                    PinDots(second, error != null) { if (it.length <= 4) second = it }
                    if (error != null) {
                        Spacer(Modifier.height(6.dp))
                        Text(error ?: "", style = MaterialTheme.typography.labelSmall, color = c.danger)
                    }
                    Spacer(Modifier.height(14.dp))
                    MbButton(
                        t.save,
                        onClick = {
                            when {
                                second.length != 4 -> error = t.auth.pinMismatch
                                first != second -> {
                                    error = t.auth.pinMismatch
                                    second = ""
                                }
                                else -> {
                                    state.setPin(first)
                                    onClose()
                                }
                            }
                        },
                        fullWidth = true,
                        height = 46.dp,
                    )
                    Spacer(Modifier.height(6.dp))
                    MbButton(
                        t.back,
                        onClick = { step = 1; second = ""; error = null },
                        style = MbButtonStyle.Ghost,
                        fullWidth = true,
                        height = 42.dp,
                    )
                }
            }
        }
    }
}

/**
 * Sehemu ya kuingiza tarakimu 4 kwa vidokezo + uwanja usioonekana.
 * Inatumia `MbTextField`-kama styling lakini tarakimu zinaonekana kubwa.
 */
@Composable
private fun PinDots(value: String, hasError: Boolean, onChange: (String) -> Unit) {
    val c = MbTheme.colors
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(c.surface2)
                .border(
                    width = 1.4.dp,
                    color = if (hasError) c.danger else c.border,
                    shape = RoundedCornerShape(14.dp),
                )
                .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(4) { i ->
                Box(
                    Modifier
                        .padding(horizontal = 7.dp)
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                hasError && i < value.length -> c.danger
                                i < value.length -> c.primary
                                else -> c.border
                            },
                        ),
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        NumberPad(value, onChange)
    }
}

@Composable
private fun NumberPad(value: String, onChange: (String) -> Unit) {
    val c = MbTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("123", "456", "789").forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { d ->
                    Box(
                        Modifier
                            .weight(1f)
                            .height(46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(c.surface2)
                            .clickable { if (value.length < 4) onChange(value + d) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(d.toString(), style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.weight(1f))
            Box(
                Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(c.surface2)
                    .clickable { if (value.length < 4) onChange(value + "0") },
                contentAlignment = Alignment.Center,
            ) {
                Text("0", style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
            }
            Box(
                Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(c.surface2)
                    .clickable { if (value.isNotEmpty()) onChange(value.dropLast(1)) },
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.ChevronLeft, size = 18.dp, tint = c.textSecondary)
            }
        }
    }
}
