package com.myboke.app.core.design

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Alama ya MyBoke: boksi lililo wazi + nguzo zinazopanda (§1.1.1).
 * Nguzo ya juu ni lime; nyingine ni nyeupe.
 */
@Composable
fun MyBokeMark(
    size: Dp = 64.dp,
    boxColor: Color = Color.White,
    accent: Color = MyBokeColors.Lime,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier.size(size)) {
        val s = this.size.minDimension
        val pad = s * 0.12f
        val radius = s * 0.22f
        val stroke = s * 0.085f

        // boksi
        drawRoundRect(
            color = boxColor,
            topLeft = Offset(pad, pad),
            size = Size(s - pad * 2, s - pad * 2),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(radius, radius),
            style = Stroke(width = stroke, cap = StrokeCap.Round),
        )

        // nguzo zinazopanda
        val baseY = s * 0.72f
        val barWidth = s * 0.085f
        val barGap = s * 0.075f
        val startX = s * 0.30f
        val heights = listOf(0.10f, 0.18f, 0.27f, 0.36f)
        heights.forEachIndexed { i, h ->
            val x = startX + i * (barWidth + barGap)
            val top = baseY - s * h
            drawRoundRect(
                color = if (i == heights.lastIndex) accent else boxColor.copy(alpha = 0.92f),
                topLeft = Offset(x, top),
                size = Size(barWidth, baseY - top),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(barWidth / 2, barWidth / 2),
            )
        }

        // mstari wa msingi
        drawLine(
            color = boxColor.copy(alpha = 0.55f),
            start = Offset(s * 0.26f, baseY + s * 0.045f),
            end = Offset(s * 0.74f, baseY + s * 0.045f),
            strokeWidth = s * 0.035f,
            cap = StrokeCap.Round,
        )
    }
}

@Composable
fun MyBokeWordmark(
    modifier: Modifier = Modifier,
    color: Color = Color.White,
    size: Dp = 26.dp,
) {
    Text(
        text = "MyBoke",
        modifier = modifier,
        style = MaterialTheme.typography.headlineMedium.copy(
            fontSize = size.value.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.5).sp,
        ),
        color = color,
    )
}

/** Kadi ya logo yenye gradient — kwa splash/onboarding. */
@Composable
fun MyBokeLogoBadge(size: Dp = 92.dp, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.28f))
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF0B37A1),
                        Color(0xFF0269E9),
                        Color(0xFF0A9CBF),
                        Color(0xFF16A760),
                    ),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        MyBokeMark(size = size * 0.66f)
    }
}

@Composable
fun BrandHeaderRow(name: String, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        MyBokeMark(size = 30.dp)
        Spacer(Modifier.width(8.dp))
        MyBokeWordmark(size = 21.dp, color = MbTheme.colors.textPrimary)
        Spacer(Modifier.width(4.dp))
    }
}
