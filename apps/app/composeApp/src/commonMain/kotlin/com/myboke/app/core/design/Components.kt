package com.myboke.app.core.design

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.util.Money

// ─────────────────────────────────────────────────────────────
// Mack ya msingi
// ─────────────────────────────────────────────────────────────

@Composable
fun GradientBrush(colors: List<Color>): Brush =
    Brush.linearGradient(
        colors = colors,
        start = Offset.Zero,
        end = Offset.Infinite,
    )

@Composable
fun MbCard(
    modifier: Modifier = Modifier,
    padding: Dp = 16.dp,
    onClick: (() -> Unit)? = null,
    background: Color = MbTheme.colors.surface,
    bordered: Boolean = true,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(background, shape)
            .then(
                if (bordered) {
                    Modifier.border(1.dp, MbTheme.colors.border, shape)
                } else Modifier
            )
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(padding),
        content = content,
    )
}

@Composable
fun GradientCard(
    colors: List<Color>,
    modifier: Modifier = Modifier,
    padding: Dp = 20.dp,
    radius: Dp = 22.dp,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(radius)
    Column(
        modifier = modifier
            .clip(shape)
            .background(GradientBrush(colors), shape)
            .padding(padding),
        content = content,
    )
}

// ─────────────────────────────────────────────────────────────
// Vifungo
// ─────────────────────────────────────────────────────────────

enum class MbButtonStyle { Primary, Secondary, Ghost, Danger, Success, Dark }

@Composable
fun MbButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: MbButtonStyle = MbButtonStyle.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: MbIcon? = null,
    fullWidth: Boolean = false,
    height: Dp = 50.dp,
) {
    val c = MbTheme.colors
    val shape = RoundedCornerShape(14.dp)
    val (bg, fg, border) = when (style) {
        MbButtonStyle.Primary -> Triple(c.primary, c.onPrimary, null)
        MbButtonStyle.Secondary -> Triple(Color.Transparent, c.primary, c.primary)
        MbButtonStyle.Ghost -> Triple(Color.Transparent, c.textSecondary, null)
        MbButtonStyle.Danger -> Triple(c.danger, Color.White, null)
        MbButtonStyle.Success -> Triple(c.success, Color.White, null)
        MbButtonStyle.Dark -> Triple(c.textPrimary, c.surface, null)
    }
    val bgModifier = when (style) {
        MbButtonStyle.Primary -> Modifier.background(GradientBrush(c.primaryGradient), shape)
        MbButtonStyle.Success -> Modifier.background(GradientBrush(c.successGradient), shape)
        else -> Modifier.background(bg, shape)
    }

    Box(
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .heightIn(min = height)
            .clip(shape)
            .then(bgModifier)
            .then(if (border != null) Modifier.border(1.2.dp, border, shape) else Modifier)
            .clickable(enabled = enabled && !loading, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = fg,
                )
                Spacer(Modifier.width(10.dp))
            } else if (icon != null) {
                MbIconView(icon, size = 19.dp, tint = if (enabled) fg else fg.copy(alpha = 0.5f))
                Spacer(Modifier.width(8.dp))
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                color = if (enabled) fg else fg.copy(alpha = 0.5f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun MbIconButton(
    icon: MbIcon,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = MbTheme.colors.textPrimary,
    background: Color = Color.Transparent,
    size: Dp = 42.dp,
    iconSize: Dp = 21.dp,
    badge: Int = 0,
    contentDescription: String? = null,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(background)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        MbIconView(icon, size = iconSize, tint = tint, contentDescription = contentDescription)
        if (badge > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 5.dp, end = 5.dp)
                    .size(15.dp)
                    .clip(CircleShape)
                    .background(MbTheme.colors.danger),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (badge > 9) "9+" else "$badge",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp),
                    color = Color.White,
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Pesa (§7.2.1)
// ─────────────────────────────────────────────────────────────

@Composable
fun MoneyText(
    value: Double,
    modifier: Modifier = Modifier,
    currency: String = "TZS",
    style: TextStyle = MaterialTheme.typography.headlineLarge,
    color: Color = MbTheme.colors.textPrimary,
    showDecimals: Boolean = false,
    currencyStyle: TextStyle? = null,
) {
    Row(modifier = modifier, verticalAlignment = Alignment.Bottom) {
        Text(
            text = currency,
            style = currencyStyle ?: MaterialTheme.typography.labelMedium,
            color = color.copy(alpha = 0.7f),
            modifier = Modifier.padding(bottom = 3.dp, end = 5.dp),
        )
        Text(
            text = Money.format(value, if (showDecimals) 2 else 0),
            style = style.copy(fontFeatureSettings = "tnum"),
            color = color,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun MoneyCompact(
    value: Double,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.titleLarge,
    color: Color = MbTheme.colors.textPrimary,
) {
    Text(
        text = "TZS ${Money.formatShort(value)}",
        style = style.copy(fontFeatureSettings = "tnum"),
        color = color,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

// ─────────────────────────────────────────────────────────────
// Badges (§7.2.2)
// ─────────────────────────────────────────────────────────────

enum class BadgeTone { Neutral, Success, Warning, Danger, Info, Brand }

@Composable
fun StatusPill(
    text: String,
    tone: BadgeTone = BadgeTone.Neutral,
    modifier: Modifier = Modifier,
    icon: MbIcon? = null,
) {
    val c = MbTheme.colors
    val (bg, fg) = when (tone) {
        BadgeTone.Success -> c.successBg to c.successText()
        BadgeTone.Warning -> c.warningBg to c.warningText()
        BadgeTone.Danger -> c.dangerBg to c.dangerText()
        BadgeTone.Info -> c.infoBg to c.infoText()
        BadgeTone.Brand -> c.primary.copy(alpha = 0.12f) to c.primary
        BadgeTone.Neutral -> c.surface2 to c.textSecondary
    }
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            MbIconView(icon, size = 12.dp, tint = fg)
            Spacer(Modifier.width(4.dp))
        }
        Text(text, style = MaterialTheme.typography.labelSmall, color = fg, maxLines = 1)
    }
}

@Composable
fun DeltaPill(deltaPercent: Double, modifier: Modifier = Modifier) {
    val positive = deltaPercent >= 0
    val c = MbTheme.colors
    val bg = if (positive) Color.White.copy(alpha = 0.18f) else c.danger.copy(alpha = 0.25f)
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 7.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MbIconView(
            if (positive) MbIcon.TrendingUp else MbIcon.TrendingDown,
            size = 12.dp,
            tint = Color.White,
        )
        Spacer(Modifier.width(3.dp))
        Text(
            text = "${if (positive) "+" else ""}${Money.format(deltaPercent, 0)}%",
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Inputs (§7.2.7)
// ─────────────────────────────────────────────────────────────

@Composable
fun MbTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    password: Boolean = false,
    prefix: String? = null,
    leadingIcon: MbIcon? = null,
    maxLines: Int = 1,
    enabled: Boolean = true,
) {
    val c = MbTheme.colors
    var visible by remember { mutableStateOf(false) }
    Column(modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = if (error != null) c.danger else c.textSecondary,
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            placeholder = placeholder?.let {
                { Text(it, style = MaterialTheme.typography.bodyMedium, color = c.textMuted) }
            },
            leadingIcon = leadingIcon?.let {
                {
                    MbIconView(it, size = 19.dp, tint = c.textMuted)
                }
            },
            prefix = prefix?.let { { Text(it, style = MaterialTheme.typography.bodyMedium, color = c.textMuted) } },
            textStyle = LocalTextStyle.current.copy(
                fontSize = 15.sp,
                color = c.textPrimary,
            ),
            singleLine = maxLines == 1,
            maxLines = maxLines,
            isError = error != null,
            visualTransformation = if (password && !visible) {
                PasswordVisualTransformation()
            } else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
            shape = RoundedCornerShape(13.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = c.primary,
                unfocusedBorderColor = c.border,
                focusedContainerColor = c.surface,
                unfocusedContainerColor = c.surface,
                cursorColor = c.primary,
                errorBorderColor = c.danger,
            ),
            trailingIcon = if (password) {
                {
                    MbIconButton(
                        icon = if (visible) MbIcon.Shield else MbIcon.Lock,
                        onClick = { visible = !visible },
                        size = 36.dp,
                        tint = c.textMuted,
                        iconSize = 18.dp,
                    )
                }
            } else null,
        )
        if (error != null) {
            Spacer(Modifier.height(4.dp))
            Text(error, style = MaterialTheme.typography.labelSmall, color = c.danger)
        }
    }
}

@Composable
fun MbChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: MbIcon? = null,
) {
    val c = MbTheme.colors
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(11.dp))
            .background(if (selected) c.primary else c.surface2)
            .border(
                1.dp,
                if (selected) c.primary else c.border,
                RoundedCornerShape(11.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            MbIconView(icon, size = 14.dp, tint = if (selected) c.onPrimary else c.textSecondary)
            Spacer(Modifier.width(5.dp))
        }
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) c.onPrimary else c.textSecondary,
            maxLines = 1,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Vichwa na sehemu
// ─────────────────────────────────────────────────────────────

@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    action: String? = null,
    subtitle: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleLarge, color = MbTheme.colors.textPrimary)
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MbTheme.colors.textMuted)
            }
        }
        if (action != null && onAction != null) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onAction)
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(action, style = MaterialTheme.typography.labelMedium, color = MbTheme.colors.primary)
                Spacer(Modifier.width(2.dp))
                MbIconView(MbIcon.ChevronRight, size = 14.dp, tint = MbTheme.colors.primary)
            }
        }
    }
}

@Composable
fun MbTopBar(
    title: String,
    onBack: (() -> Unit)? = null,
    subtitle: String? = null,
    actions: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit = {},
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            MbIconButton(MbIcon.ChevronLeft, onClick = onBack, iconSize = 22.dp)
            Spacer(Modifier.width(4.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.headlineSmall,
                color = MbTheme.colors.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MbTheme.colors.textMuted)
            }
        }
        actions()
    }
}

// ─────────────────────────────────────────────────────────────
// Hali (§7.5)
// ─────────────────────────────────────────────────────────────

@Composable
fun EmptyState(
    icon: MbIcon,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    val c = MbTheme.colors
    Column(
        modifier = modifier.fillMaxWidth().padding(horizontal = 28.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(76.dp)
                .clip(CircleShape)
                .background(c.surface2),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(icon, size = 34.dp, tint = c.textMuted)
        }
        Spacer(Modifier.height(16.dp))
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            color = c.textPrimary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            body,
            style = MaterialTheme.typography.bodyMedium,
            color = c.textMuted,
            textAlign = TextAlign.Center,
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(18.dp))
            MbButton(actionLabel, onAction, icon = MbIcon.Plus)
        }
    }
}

@Composable
fun ErrorState(
    title: String,
    body: String,
    retryLabel: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = MbTheme.colors
    Column(
        modifier = modifier.fillMaxWidth().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(70.dp).clip(CircleShape).background(c.dangerBg),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(MbIcon.Warning, size = 32.dp, tint = c.danger)
        }
        Spacer(Modifier.height(14.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
        Spacer(Modifier.height(4.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium, color = c.textMuted, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        MbButton(retryLabel, onRetry, style = MbButtonStyle.Secondary, icon = MbIcon.Refresh)
    }
}

@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    height: Dp = 16.dp,
    radius: Dp = 8.dp,
) {
    val c = MbTheme.colors
    val transition = rememberInfiniteTransition()
    val alpha by transition.animateFloat(
        initialValue = 0.45f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
    )
    Box(
        modifier = modifier
            .height(height)
            .clip(RoundedCornerShape(radius))
            .background(c.surface2.copy(alpha = alpha * 0.9f)),
    )
}

@Composable
fun ListSkeleton(rows: Int = 5) {
    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(rows) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MbTheme.colors.surface2),
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SkeletonBox(Modifier.fillMaxWidth(0.55f), height = 13.dp)
                    SkeletonBox(Modifier.fillMaxWidth(0.32f), height = 11.dp)
                }
                Spacer(Modifier.width(12.dp))
                SkeletonBox(Modifier.width(60.dp), height = 14.dp)
            }
        }
    }
}

@Composable
fun SyncBanner(pending: Int, synced: Boolean, pendingLabel: String, syncedLabel: String) {
    val c = MbTheme.colors
    val bg = if (synced) c.successBg else c.infoBg
    val fg = if (synced) c.successText() else c.infoText()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MbIconView(
            if (synced) MbIcon.Check else MbIcon.WifiOff,
            size = 15.dp,
            tint = fg,
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = if (synced) syncedLabel else "$pending $pendingLabel",
            style = MaterialTheme.typography.labelMedium,
            color = fg,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Chati
// ─────────────────────────────────────────────────────────────

@Composable
fun Sparkline(
    values: List<Double>,
    modifier: Modifier = Modifier,
    color: Color = Color.White,
    bandColor: Color = Color.White.copy(alpha = 0.22f),
) {
    Canvas(modifier) {
        if (values.size < 2) return@Canvas
        val max = values.maxOrNull()?.takeIf { it > 0 } ?: 1.0
        val stepX = size.width / (values.size - 1)
        val pts = values.mapIndexed { i, v ->
            Offset(i * stepX, size.height - (v / max).toFloat() * size.height)
        }
        val line = Path().apply {
            moveTo(pts.first().x, pts.first().y)
            pts.drop(1).forEach { lineTo(it.x, it.y) }
        }
        val area = Path().apply {
            moveTo(pts.first().x, size.height)
            pts.forEach { lineTo(it.x, it.y) }
            lineTo(pts.last().x, size.height)
            close()
        }
        drawPath(area, bandColor)
        drawPath(line, color, style = Stroke(width = 2.4f, cap = StrokeCap.Round))
        drawCircle(color, radius = 3.2f, center = pts.last())
    }
}

@Composable
fun BarChart(
    values: List<Double>,
    labels: List<String>,
    modifier: Modifier = Modifier,
    barColor: Color = MbTheme.colors.primary,
    highlightLast: Boolean = true,
    height: Dp = 120.dp,
) {
    val c = MbTheme.colors
    val max = (values.maxOrNull() ?: 0.0).takeIf { it > 0 } ?: 1.0
    Column(modifier) {
        Row(
            modifier = Modifier.fillMaxWidth().height(height),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            values.forEachIndexed { i, value ->
                val fraction = (value / max).toFloat().coerceIn(0.02f, 1f)
                val isLast = highlightLast && i == values.lastIndex
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom,
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(height * fraction)
                            .clip(RoundedCornerShape(topStart = 7.dp, topEnd = 7.dp, bottomStart = 2.dp, bottomEnd = 2.dp))
                            .background(if (isLast) barColor else barColor.copy(alpha = 0.35f)),
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            labels.forEachIndexed { i, label ->
                val isLast = highlightLast && i == labels.lastIndex
                Text(
                    text = label,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isLast) c.textPrimary else c.textMuted,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
fun ProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    height: Dp = 8.dp,
    color: Color = MbTheme.colors.primary,
    track: Color = MbTheme.colors.surface2,
) {
    Box(
        modifier = modifier
            .height(height)
            .clip(RoundedCornerShape(50))
            .background(track),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .height(height)
                .clip(RoundedCornerShape(50))
                .background(color),
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Zingine
// ─────────────────────────────────────────────────────────────

@Composable
fun Avatar(name: String, size: Dp = 38.dp) {
    val initials = name.trim().split(" ")
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(GradientBrush(MbColorsAvatar)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials.ifBlank { "M" },
            style = MaterialTheme.typography.labelLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold,
        )
    }
}

private val MbColorsAvatar = listOf(MyBokeColors.Blue500, MyBokeColors.Cyan500)

@Composable
fun DividerLine(modifier: Modifier = Modifier, color: Color = MbTheme.colors.border) {
    Box(modifier.fillMaxWidth().height(1.dp).background(color))
}

@Composable
fun SettingRow(
    icon: MbIcon,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    trailing: String? = null,
    iconTint: Color = MbTheme.colors.primary,
    iconBg: Color = MbTheme.colors.primary.copy(alpha = 0.10f),
    onClick: (() -> Unit)? = null,
) {
    val c = MbTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(iconBg),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(icon, size = 20.dp, tint = iconTint)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
            }
        }
        if (trailing != null) {
            Text(trailing, style = MaterialTheme.typography.labelMedium, color = c.textMuted)
            Spacer(Modifier.width(6.dp))
        }
        if (onClick != null) {
            MbIconView(MbIcon.ChevronRight, size = 16.dp, tint = c.textMuted)
        }
    }
}

@Composable
fun MbScaffoldBackground(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MbTheme.colors.bg,
    ) { content() }
}

@Composable
fun PressableCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    background: Color = MbTheme.colors.surface,
    radius: Dp = 18.dp,
    content: @Composable androidx.compose.foundation.layout.BoxScope.() -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(radius))
            .background(background)
            .border(1.dp, MbTheme.colors.border, RoundedCornerShape(radius))
            .clickable(interactionSource = interaction, indication = null, onClick = onClick),
        content = content,
    )
}
