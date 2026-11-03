package com.myboke.app.core.design

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Palette kamili yenye light/dark. Skrini hazitumii hex moja kwa moja —
 * zinapata rangi kupitia `MbTheme.colors` (§7.2.10).
 */
@Immutable
data class MbPalette(
    val isDark: Boolean,
    val bg: Color,
    val surface: Color,
    val surface2: Color,
    val border: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val textInverse: Color,
    val primary: Color,
    val primaryDeep: Color,
    val onPrimary: Color,
    val secondary: Color,
    val success: Color,
    val successBg: Color,
    val warning: Color,
    val warningBg: Color,
    val danger: Color,
    val dangerBg: Color,
    val info: Color,
    val infoBg: Color,
    val lime: Color,
    val brandGradient: List<Color>,
    val primaryGradient: List<Color>,
    val successGradient: List<Color>,
    val warmGradient: List<Color>,
    val heroGradient: List<Color>,
    val chartPositive: Color,
    val chartAccent: Color,
    val chartGrid: Color,
) {
    fun successText(): Color = if (isDark) MyBokeColors.Green300 else MyBokeColors.Green900
    fun dangerText(): Color = if (isDark) Color(0xFFFCA5A5) else MyBokeColors.Danger900
    fun warningText(): Color = if (isDark) Color(0xFFFCD34D) else MyBokeColors.Warning900
    fun infoText(): Color = if (isDark) MyBokeColors.Cyan100 else MyBokeColors.Cyan900
}

val LightPalette = MbPalette(
    isDark = false,
    bg = MyBokeColors.BgLight,
    surface = MyBokeColors.SurfaceLight,
    surface2 = MyBokeColors.Surface2Light,
    border = MyBokeColors.BorderLight,
    textPrimary = MyBokeColors.TextPrimaryLight,
    textSecondary = MyBokeColors.TextSecondaryLight,
    textMuted = MyBokeColors.TextMutedLight,
    textInverse = Color.White,
    primary = MyBokeColors.Blue500,
    primaryDeep = MyBokeColors.Blue700,
    onPrimary = Color.White,
    secondary = MyBokeColors.Cyan500,
    success = MyBokeColors.Green500,
    successBg = MyBokeColors.Green100,
    warning = MyBokeColors.Warning,
    warningBg = MyBokeColors.Warning100,
    danger = MyBokeColors.Danger,
    dangerBg = MyBokeColors.Danger100,
    info = MyBokeColors.Cyan500,
    infoBg = MyBokeColors.Cyan100,
    lime = MyBokeColors.Lime,
    brandGradient = MyBokeColors.BrandGradient,
    primaryGradient = MyBokeColors.PrimaryGradient,
    successGradient = MyBokeColors.SuccessGradient,
    warmGradient = MyBokeColors.WarmGradient,
    heroGradient = MyBokeColors.PrimaryGradient,
    chartPositive = MyBokeColors.Green500,
    chartAccent = MyBokeColors.Cyan500,
    chartGrid = MyBokeColors.BorderLight,
)

val DarkPalette = MbPalette(
    isDark = true,
    bg = MyBokeColors.BgDark,
    surface = MyBokeColors.SurfaceDark,
    surface2 = MyBokeColors.Surface2Dark,
    border = MyBokeColors.BorderDark,
    textPrimary = MyBokeColors.TextPrimaryDark,
    textSecondary = MyBokeColors.TextSecondaryDark,
    textMuted = MyBokeColors.TextMutedDark,
    textInverse = Color.White,
    primary = MyBokeColors.Blue400,
    primaryDeep = MyBokeColors.Blue800,
    onPrimary = Color.White,
    secondary = MyBokeColors.Cyan300,
    success = MyBokeColors.Green300,
    successBg = Color(0xFF0B3B26),
    warning = Color(0xFFFBBF24),
    warningBg = Color(0xFF3B2A08),
    danger = Color(0xFFF87171),
    dangerBg = Color(0xFF3D1414),
    info = MyBokeColors.Cyan300,
    infoBg = Color(0xFF07303A),
    lime = MyBokeColors.Lime,
    brandGradient = MyBokeColors.BrandGradient,
    primaryGradient = listOf(MyBokeColors.Blue400, MyBokeColors.Blue700),
    successGradient = MyBokeColors.SuccessGradient,
    warmGradient = MyBokeColors.WarmGradient,
    heroGradient = listOf(MyBokeColors.Blue700, MyBokeColors.Blue900),
    chartPositive = MyBokeColors.Green300,
    chartAccent = MyBokeColors.Cyan300,
    chartGrid = MyBokeColors.BorderDark,
)

/** Nafasi (dp) — grid ya 4dp. */
object MbSpacing {
    val xxs = 2
    val xs = 4
    val sm = 8
    val md = 12
    val lg = 16
    val xl = 20
    val xxl = 24
    val xxxl = 32
    val huge = 40

    // Radii
    val radiusSm = 10
    val radiusMd = 14
    val radiusLg = 20
    val radiusXl = 28
    val radiusPill = 999

    // Touch target (§7.2.9)
    val touch = 48
}

val MbTypography = androidx.compose.material3.Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.5).sp,
    ),
    displayMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.4).sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
        letterSpacing = (-0.3).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 13.5.sp,
        lineHeight = 19.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        letterSpacing = 0.2.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.5.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.3.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 10.5.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp,
    ),
)

val LocalMbPalette = staticCompositionLocalOf { LightPalette }

/** Kichwa cha msimbo wa rangi — `MbTheme.colors.primary`. */
object MbTheme {
    val colors: MbPalette
        @Composable get() = LocalMbPalette.current
}

@Composable
fun MbThemeProvider(dark: Boolean, content: @Composable () -> Unit) {
    val palette = if (dark) DarkPalette else LightPalette
    CompositionLocalProvider(
        LocalMbPalette provides palette,
        content = content,
    )
}

/** Theme kamili: palette ya MyBoke + Material3 (typography, rangi za msingi). */
@Composable
fun MyBokeTheme(dark: Boolean, content: @Composable () -> Unit) {
    val palette = if (dark) DarkPalette else LightPalette
    val scheme = androidx.compose.material3.darkColorScheme(
        primary = palette.primary,
        onPrimary = palette.onPrimary,
        secondary = palette.secondary,
        background = palette.bg,
        surface = palette.surface,
        onSurface = palette.textPrimary,
        onBackground = palette.textPrimary,
        error = palette.danger,
    ).let {
        if (dark) it else androidx.compose.material3.lightColorScheme(
            primary = palette.primary,
            onPrimary = palette.onPrimary,
            secondary = palette.secondary,
            background = palette.bg,
            surface = palette.surface,
            onSurface = palette.textPrimary,
            onBackground = palette.textPrimary,
            error = palette.danger,
        )
    }
    CompositionLocalProvider(LocalMbPalette provides palette) {
        androidx.compose.material3.MaterialTheme(
            colorScheme = scheme,
            typography = MbTypography,
            content = content,
        )
    }
}
