package com.myboke.app.core.design

import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.myboke.app.core.i18n.Lang

/**
 * Kichaguzi cha lugha (§7.4). Kinaonyesha lugha zote kwa jina la asili ili
 * mtumiaji asihitaji kujua Kiingereza kuchagua lugha yake.
 * Kinaonekana kama bottom-sheet yenye animation laini.
 */
@Composable
fun LanguagePickerOverlay(
    current: Lang,
    title: String,
    subtitle: String,
    cancelLabel: String,
    onPick: (Lang) -> Unit,
    onDismiss: () -> Unit,
) {
    val c = MbTheme.colors
    var appeared by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { appeared = true }
    val scrim by animateFloatAsState(if (appeared) 0.5f else 0f, tween(180))
    val lift by animateFloatAsState(if (appeared) 0f else 1f, tween(260))

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = scrim))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            Modifier
                .widthIn(max = 560.dp)
                .fillMaxWidth()
                .scale(scaleX = 1f, scaleY = 1f - lift * 0.06f)
                .clip(RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp))
                .background(c.surface)
                .clickable(enabled = false) {}
                .padding(horizontal = 18.dp)
                .padding(top = 10.dp, bottom = 22.dp),
        ) {
            // Kipini cha sheet
            Box(
                Modifier
                    .align(Alignment.CenterHorizontally)
                    .width(42.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(c.border),
            )
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.headlineSmall, color = c.textPrimary)
                    Spacer(Modifier.height(2.dp))
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
                }
                MbIconButton(MbIcon.Close, onClick = onDismiss, size = 34.dp, iconSize = 16.dp, tint = c.textMuted)
            }
            Spacer(Modifier.height(14.dp))

            Lang.entries.forEach { lang ->
                val selected = lang == current
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (selected) c.primary.copy(alpha = 0.10f) else c.surface2)
                        .border(
                            width = if (selected) 1.4.dp else 1.dp,
                            color = if (selected) c.primary else Color.Transparent,
                            shape = RoundedCornerShape(14.dp),
                        )
                        .clickable { onPick(lang) }
                        .padding(horizontal = 13.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(11.dp))
                            .background(
                                if (selected) {
                                    Brush.linearGradient(c.primaryGradient)
                                } else {
                                    Brush.linearGradient(listOf(c.surface, c.surface))
                                },
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            lang.badge,
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                            color = if (selected) c.onPrimary else c.textSecondary,
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            lang.nativeName,
                            style = MaterialTheme.typography.titleMedium,
                            color = if (selected) c.primary else c.textPrimary,
                        )
                        Text(
                            lang.englishName,
                            style = MaterialTheme.typography.labelSmall,
                            color = c.textMuted,
                        )
                    }
                    if (lang.isRtl) {
                        Text(
                            "RTL",
                            style = MaterialTheme.typography.labelSmall,
                            color = c.textMuted,
                            modifier = Modifier.padding(end = 8.dp),
                        )
                    }
                    Box(
                        Modifier
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(if (selected) c.primary else Color.Transparent)
                            .border(1.4.dp, if (selected) c.primary else c.border, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (selected) MbIconView(MbIcon.Check, size = 12.dp, tint = c.onPrimary)
                    }
                }
            }

            Spacer(Modifier.height(4.dp))
            MbButton(cancelLabel, onClick = onDismiss, style = MbButtonStyle.Ghost, fullWidth = true, height = 44.dp)
        }
    }
}

/** Kitufe kidogo cha lugha kinachoonekana kwenye header ya auth/onboarding. */
@Composable
fun LanguagePill(
    current: Lang,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = Color.White,
    background: Color = Color.White.copy(alpha = 0.14f),
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(11.dp))
            .background(background)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        MbIconView(MbIcon.Globe, size = 14.dp, tint = tint)
        Spacer(Modifier.width(6.dp))
        Text(
            current.badge,
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
            color = tint,
        )
        Spacer(Modifier.width(3.dp))
        MbIconView(MbIcon.ChevronDown, size = 12.dp, tint = tint.copy(alpha = 0.85f))
    }
}

/** Kitufe cha lugha kwa skrini nyeupe (Mipangilio/More) — kikubwa zaidi. */
@Composable
fun LanguageCard(
    current: Lang,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = MbTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(c.surface)
            .border(1.dp, c.border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(c.primary.copy(alpha = 0.10f)),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(MbIcon.Globe, size = 20.dp, tint = c.primary)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
            Text(
                "${current.nativeName} · ${current.englishName}",
                style = MaterialTheme.typography.bodySmall,
                color = c.textMuted,
            )
        }
        Box(
            Modifier
                .clip(RoundedCornerShape(9.dp))
                .background(c.primary.copy(alpha = 0.12f))
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            Text(
                current.badge,
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = c.primary,
            )
        }
        Spacer(Modifier.width(6.dp))
        MbIconView(MbIcon.ChevronDown, size = 15.dp, tint = c.textMuted)
    }
}

/** Picha ndogo ya lugha (bendera ya maandishi) kwa orodha ndefu. */
@Composable
fun LangBadge(lang: Lang, selected: Boolean, modifier: Modifier = Modifier) {
    val c = MbTheme.colors
    Box(
        modifier
            .size(30.dp)
            .clip(CircleShape)
            .background(if (selected) c.primary else c.surface2),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            lang.badge,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = if (selected) c.onPrimary else c.textMuted,
        )
    }
}

@Composable
internal fun SheetDim(alpha: Float, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().alpha(alpha).background(Color.Black))
}
