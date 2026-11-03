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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.util.Country
import com.myboke.app.core.util.Phone

/**
 * Kichaguzi cha nchi kwa namba za simu. Kinaonyesha msimbo wa nchi na
 * mifano ya namba halali ili mtumiaji asikosee muundo.
 */
@Composable
fun CountryPickerOverlay(
    current: Country,
    title: String,
    subtitle: String,
    cancelLabel: String,
    onPick: (Country) -> Unit,
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

            Column(
                Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                Country.entries.forEach { country ->
                    val selected = country == current
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
                            .clickable { onPick(country) }
                            .padding(horizontal = 13.dp, vertical = 11.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(11.dp))
                                .background(if (selected) c.primary else c.surface),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                country.iso,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = if (selected) c.onPrimary else c.textSecondary,
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                country.title,
                                style = MaterialTheme.typography.titleMedium,
                                color = if (selected) c.primary else c.textPrimary,
                            )
                            Text(
                                "${country.dial} · 0${"•".repeat(country.nationalLength)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = c.textMuted,
                            )
                        }
                        if (selected) MbIconView(MbIcon.Check, size = 15.dp, tint = c.primary)
                    }
                }
            }

            Spacer(Modifier.height(4.dp))
            MbButton(cancelLabel, onClick = onDismiss, style = MbButtonStyle.Ghost, fullWidth = true, height = 44.dp)
        }
    }
}

/**
 * Sehemu ya namba ya simu yenye kichaguzi cha nchi kilichounganishwa.
 * Inatumia [Phone] kusafisha namba na kuonyesha muundo unaosomeka.
 */
@Composable
fun MbPhoneField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    country: Country,
    onCountryClick: () -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    error: String? = null,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Next,
) {
    val c = MbTheme.colors
    val ring = if (error != null) c.danger else c.border
    Column(modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = if (error != null) c.danger else c.textSecondary,
        )
        Spacer(Modifier.height(6.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(13.dp))
                .background(c.surface)
                .border(1.dp, ring, RoundedCornerShape(13.dp)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Kichaguzi cha nchi
            Row(
                Modifier
                    .clip(RoundedCornerShape(13.dp))
                    .clickable(enabled = enabled, onClick = onCountryClick)
                    .padding(horizontal = 10.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    country.dial,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = c.textPrimary,
                )
                Spacer(Modifier.width(4.dp))
                MbIconView(MbIcon.ChevronDown, size = 13.dp, tint = c.textMuted)
            }
            Box(Modifier.width(1.dp).height(24.dp).background(c.border))
            Spacer(Modifier.width(10.dp))
            Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (value.isEmpty() && placeholder != null) {
                    Text(
                        placeholder,
                        style = MaterialTheme.typography.bodyMedium,
                        color = c.textMuted,
                    )
                }
                BasicTextField(
                    value = value,
                    onValueChange = { onValueChange(Phone.digits(it).take(15)) },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
                    enabled = enabled,
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 15.sp,
                        color = c.textPrimary,
                    ),
                    cursorBrush = SolidColor(c.primary),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = imeAction),
                )
            }
            Spacer(Modifier.width(12.dp))
        }
        if (error != null) {
            Spacer(Modifier.height(4.dp))
            Text(error, style = MaterialTheme.typography.labelSmall, color = c.danger)
        }
    }
}

/** Kitufe kidogo kinachoonyesha nchi iliyochaguliwa (kwa skrini nyingine). */
@Composable
fun CountryPill(country: Country, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = MbTheme.colors
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(11.dp))
            .background(c.surface2)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(
            country.iso,
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
            color = c.textSecondary,
        )
        Spacer(Modifier.width(5.dp))
        Text(country.dial, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
        Spacer(Modifier.width(3.dp))
        MbIconView(MbIcon.ChevronDown, size = 12.dp, tint = c.textMuted.copy(alpha = 0.85f))
    }
}
