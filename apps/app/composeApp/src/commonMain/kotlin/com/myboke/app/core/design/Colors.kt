package com.myboke.app.core.design

import androidx.compose.ui.graphics.Color

/**
 * Rangi za brand — zilizopimwa moja kwa moja kutoka logo (§1.2).
 * Tokens hizi ni chanzo kimoja; hakuna hex isiyo hapa.
 */
object MyBokeColors {
    // ── Blue (brand core) ─────────────────────────────────────
    val Blue50 = Color(0xFFEAF1FF)
    val Blue100 = Color(0xFFD3E2FF)
    val Blue200 = Color(0xFFA8C6FF)
    val Blue300 = Color(0xFF7AA7FB)
    val Blue400 = Color(0xFF3D82F2)
    val Blue500 = Color(0xFF0269E9) // PRIMARY
    val Blue600 = Color(0xFF085DC0)
    val Blue700 = Color(0xFF0B37A1) // BRAND DEEP
    val Blue800 = Color(0xFF0A2E86)
    val Blue900 = Color(0xFF072B7A)

    // ── Cyan / Teal ───────────────────────────────────────────
    val Cyan50 = Color(0xFFEFFBFE)
    val Cyan100 = Color(0xFFD6F4FA)
    val Cyan300 = Color(0xFF4FCBE4)
    val Cyan500 = Color(0xFF0A9CBF)
    val Cyan700 = Color(0xFF018E9F)
    val Cyan900 = Color(0xFF045A66)

    // ── Green (success / faida) ───────────────────────────────
    val Green50 = Color(0xFFEDFCF3)
    val Green100 = Color(0xFFD5F5E3)
    val Green300 = Color(0xFF5FD98E)
    val Green500 = Color(0xFF16A760)
    val Green600 = Color(0xFF0E8A50)
    val Green900 = Color(0xFF0A5A36)

    // ── Semantic ──────────────────────────────────────────────
    val Success = Green500
    val Warning = Color(0xFFF59E0B)
    val Warning100 = Color(0xFFFEF3C7)
    val Warning900 = Color(0xFF78350F)
    val Danger = Color(0xFFDC2626)
    val Danger100 = Color(0xFFFEE2E2)
    val Danger900 = Color(0xFF7F1D1D)
    val Info = Cyan500
    val Lime = Color(0xFF73D31C)
    val Purple = Color(0xFF7C5CFC)

    // ── Neutral (light) ───────────────────────────────────────
    val BgLight = Color(0xFFF5F7FB)
    val SurfaceLight = Color(0xFFFFFFFF)
    val Surface2Light = Color(0xFFEEF2FA)
    val BorderLight = Color(0xFFE2E8F4)
    val TextPrimaryLight = Color(0xFF0B1220)
    val TextSecondaryLight = Color(0xFF4A5568)
    val TextMutedLight = Color(0xFF8A94A6)

    // ── Neutral (dark) ────────────────────────────────────────
    val BgDark = Color(0xFF080D18)
    val SurfaceDark = Color(0xFF111A2B)
    val Surface2Dark = Color(0xFF182339)
    val BorderDark = Color(0xFF22304A)
    val TextPrimaryDark = Color(0xFFF2F5FA)
    val TextSecondaryDark = Color(0xFFA8B4C8)
    val TextMutedDark = Color(0xFF6E7C93)

    // ── Gradients (§1.2.1) ────────────────────────────────────
    val BrandGradient = listOf(Blue700, Blue500, Cyan500, Green500)
    val PrimaryGradient = listOf(Blue500, Blue700)
    val SuccessGradient = listOf(Green500, Cyan500)
    val WarmGradient = listOf(Warning, Danger)
    val DeepGradient = listOf(Color(0xFF071B4D), Blue700, Blue800)
}
