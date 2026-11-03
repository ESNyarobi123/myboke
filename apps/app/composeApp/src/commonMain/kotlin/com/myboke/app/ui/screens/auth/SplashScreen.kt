package com.myboke.app.ui.screens.auth

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.MyBokeMark
import com.myboke.app.core.design.MyBokeWordmark
import com.myboke.app.core.util.Dates

/**
 * Splash yenye brand motion: gradient inayotembea, mwanga unaopumua, logo inayopanda
 * kwa spring, shimmer inayopita kwenye badge, na dots zinazopiga zamu.
 * Haiondoi splash mpaka AppState iwe tayari (tazama `AppState.boot`).
 */
@Composable
fun SplashScreen(state: AppState) {
    val t = state.t
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }

    val logoScale by animateFloatAsState(
        targetValue = if (shown) 1f else 0.72f,
        animationSpec = spring(dampingRatio = 0.58f, stiffness = Spring.StiffnessLow),
    )
    val logoAlpha by animateFloatAsState(if (shown) 1f else 0f, tween(420))
    val titleAlpha by animateFloatAsState(if (shown) 1f else 0f, tween(620, delayMillis = 220))
    val titleShift by animateFloatAsState(if (shown) 0f else 18f, tween(620, delayMillis = 220))
    val tagAlpha by animateFloatAsState(if (shown) 1f else 0f, tween(620, delayMillis = 420))

    val infinite = rememberInfiniteTransition(label = "splash")
    val drift by infinite.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(7000, easing = LinearEasing), RepeatMode.Reverse),
        label = "drift",
    )
    val shimmer by infinite.animateFloat(
        initialValue = -0.6f,
        targetValue = 1.6f,
        animationSpec = infiniteRepeatable(tween(2100, easing = LinearEasing)),
        label = "shimmer",
    )
    val pulse by infinite.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1100, easing = LinearEasing), RepeatMode.Restart),
        label = "pulse",
    )

    Box(Modifier.fillMaxSize().background(Brush.linearGradient(SplashBase))) {
        // ── Mandhari: gradient + mwanga unaotembea ─────────────
        Canvas(Modifier.fillMaxSize()) {
            drawRect(
                Brush.linearGradient(
                    colors = SplashBase,
                    start = Offset(size.width * drift * 0.35f, 0f),
                    end = Offset(size.width * (0.85f + drift * 0.25f), size.height),
                ),
            )
            val glowCenter = Offset(
                size.width * (0.78f - drift * 0.18f),
                size.height * (0.16f + drift * 0.05f),
            )
            val glowRadius = size.minDimension * 0.85f
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        SplashGlow.copy(alpha = 0.42f + 0.16f * drift),
                        Color.Transparent,
                    ),
                    center = glowCenter,
                    radius = glowRadius,
                ),
                radius = glowRadius,
                center = glowCenter,
            )
            // Mviringo mwembamba unaopumua chini
            val lowCenter = Offset(size.width * 0.2f, size.height * 1.02f)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(SplashGlow2.copy(alpha = 0.30f * (1f - drift * 0.5f)), Color.Transparent),
                    center = lowCenter,
                    radius = size.minDimension * 0.75f,
                ),
                radius = size.minDimension * 0.75f,
                center = lowCenter,
            )
        }

        Column(
            Modifier.fillMaxSize().systemBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(0.dp))
            Column(
                Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier
                        .size(124.dp)
                        .scale(logoScale)
                        .alpha(logoAlpha)
                        .clip(RoundedCornerShape(36.dp))
                        .background(Color.White.copy(alpha = 0.13f)),
                    contentAlignment = Alignment.Center,
                ) {
                    MyBokeMark(size = 78.dp)
                    // Shimmer inayopita juu ya badge
                    Box(
                        Modifier
                            .matchParentSize()
                            .offset(x = (shimmer * 190).dp)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.White.copy(alpha = 0.22f),
                                        Color.Transparent,
                                    ),
                                    start = Offset.Zero,
                                    end = Offset(140f, 160f),
                                ),
                            ),
                    )
                }
                Spacer(Modifier.height(24.dp))
                Column(
                    Modifier.alpha(titleAlpha).offset(y = titleShift.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    MyBokeWordmark(size = 42.dp)
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    t.tagline,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White.copy(alpha = 0.84f),
                    modifier = Modifier.alpha(tagAlpha),
                )
                Spacer(Modifier.height(34.dp))
                Row(
                    Modifier.alpha(tagAlpha),
                    horizontalArrangement = Arrangement.spacedBy(7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    repeat(3) { i ->
                        // Kila dot inapiga zamu kwa phase tofauti
                        val phase = (pulse + i * 0.22f) % 1f
                        val strength = if (phase < 0.5f) phase * 2f else (1f - phase) * 2f
                        Box(
                            Modifier
                                .size(if (i == 1) 8.dp else 6.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.32f + 0.6f * strength)),
                        )
                    }
                }
                Spacer(Modifier.height(18.dp))
                Text(
                    t.loading,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                    color = Color.White.copy(alpha = 0.52f + 0.2f * pulse),
                    modifier = Modifier.alpha(tagAlpha),
                )
            }

            Column(
                Modifier.padding(bottom = 26.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "© ${Dates.isoDate(Dates.now()).take(4)} MyBoke",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.55f),
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "biashara yako · Tanzania",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.32f),
                )
            }
        }
    }
}

private val SplashBase = listOf(
    Color(0xFF04122F),
    Color(0xFF071B4D),
    Color(0xFF0B37A1),
    Color(0xFF0269E9),
)
private val SplashGlow = Color(0xFF16D3E8)
private val SplashGlow2 = Color(0xFF0A9CBF)
