package com.myboke.app.core.design

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Seti ndogo ya icons zilizochorwa kwa Canvas — hakuna dependency ya nje,
 * mistari inayofanana (1.8dp, rounded) na ukubwa wa 24dp (§7.2.9).
 */
enum class MbIcon {
    Home, Cart, Chart, Users, Menu,
    Search, Bell, ChevronLeft, ChevronRight, ChevronDown,
    Plus, Close, Check, Trash, Edit, Copy,
    Box, Coins, Store, Wallet, TrendingUp, TrendingDown,
    Warning, Clock, Calendar, Settings, Logout, User,
    Phone, Lock, WifiOff, Refresh, Send, Download, Qr,
    Camera, Filter, Star, Gift, Sparkles, Printer, Card, Truck, Tag, Doc,
    Grid, Scan, ArrowRight, Shield, Moon, Globe, Receipt, Target, Flame,
    Eye, EyeOff,
}

@Composable
fun MbIconView(
    icon: MbIcon,
    size: Dp = 24.dp,
    tint: Color = MbTheme.colors.textPrimary,
    contentDescription: String? = null,
    modifier: Modifier = Modifier,
) {
    val label = contentDescription ?: icon.name
    Canvas(
        modifier = modifier
            .size(size)
            .semantics { this.contentDescription = label },
    ) {
        drawMbIcon(icon, tint)
    }
}

private fun DrawScope.drawMbIcon(icon: MbIcon, tint: Color) {
    val s = size.minDimension / 24f
    fun p(x: Float, y: Float) = Offset(x * s, y * s)
    val stroke = Stroke(width = 1.8f * s, cap = StrokeCap.Round, join = androidx.compose.ui.graphics.StrokeJoin.Round)

    fun line(x1: Float, y1: Float, x2: Float, y2: Float) =
        drawLine(tint, p(x1, y1), p(x2, y2), strokeWidth = 1.8f * s, cap = StrokeCap.Round)

    fun poly(vararg coords: Float, close: Boolean = false) {
        if (coords.size < 4) return
        val path = Path()
        var i = 0
        var first = true
        while (i + 1 < coords.size) {
            val x = coords[i] * s
            val y = coords[i + 1] * s
            if (first) {
                path.moveTo(x, y)
                first = false
            } else {
                path.lineTo(x, y)
            }
            i += 2
        }
        if (close) path.close()
        drawPath(path, tint, style = stroke)
    }

    fun circle(cx: Float, cy: Float, r: Float, filled: Boolean = false) {
        drawCircle(
            tint,
            radius = r * s,
            center = p(cx, cy),
            style = if (filled) androidx.compose.ui.graphics.drawscope.Fill else stroke,
        )
    }

    fun roundRect(l: Float, t: Float, r: Float, b: Float, rad: Float = 3f) {
        drawRoundRect(
            tint,
            topLeft = p(l, t),
            size = Size((r - l) * s, (b - t) * s),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(rad * s, rad * s),
            style = stroke,
        )
    }

    when (icon) {
        MbIcon.Home -> {
            poly(3.5f, 10.5f, 12f, 3.5f, 20.5f, 10.5f)
            poly(5.5f, 9.6f, 5.5f, 20.2f, 18.5f, 20.2f, 18.5f, 9.6f)
            roundRect(9.8f, 13.4f, 14.2f, 20.2f, 1.2f)
        }
        MbIcon.Cart -> {
            poly(2.8f, 4f, 5f, 4f, 7.2f, 15.2f, 18.4f, 15.2f, 20.6f, 7.4f, 5.9f, 7.4f)
            circle(8.4f, 19f, 1.5f, filled = true)
            circle(17.4f, 19f, 1.5f, filled = true)
        }
        MbIcon.Chart -> {
            line(3.5f, 20.4f, 20.5f, 20.4f)
            roundRect(5.2f, 12.6f, 8.4f, 19.2f, 1f)
            roundRect(10.4f, 8.2f, 13.6f, 19.2f, 1f)
            roundRect(15.6f, 4.4f, 18.8f, 19.2f, 1f)
        }
        MbIcon.Users -> {
            circle(9f, 8.2f, 3.4f)
            poly(3f, 20.2f, 3f, 17.6f, 3.4f, 15.4f, 6.4f, 13.9f, 11.6f, 13.9f, 14.6f, 15.4f, 15f, 17.6f, 15f, 20.2f)
            poly(16.2f, 6.1f, 18.2f, 7.4f, 18.4f, 9.6f, 17.2f, 11.2f)
            poly(17.6f, 13.9f, 19.4f, 14.6f, 20.8f, 16.2f, 21f, 18.2f, 21f, 20.2f)
        }
        MbIcon.Menu, MbIcon.Grid -> {
            roundRect(3.6f, 3.6f, 10.2f, 10.2f, 2f)
            roundRect(13.8f, 3.6f, 20.4f, 10.2f, 2f)
            roundRect(3.6f, 13.8f, 10.2f, 20.4f, 2f)
            roundRect(13.8f, 13.8f, 20.4f, 20.4f, 2f)
        }
        MbIcon.Search -> {
            circle(10.6f, 10.6f, 6.4f)
            line(15.4f, 15.4f, 20.6f, 20.6f)
        }
        MbIcon.Bell -> {
            poly(6.2f, 16.6f, 6.2f, 10.6f, 7.2f, 7.7f, 9.6f, 5.9f, 12f, 5.5f, 14.4f, 5.9f, 16.8f, 7.7f, 17.8f, 10.6f, 17.8f, 16.6f)
            line(5.2f, 16.8f, 18.8f, 16.8f)
            poly(10.2f, 19.6f, 11.2f, 20.8f, 12.8f, 20.8f, 13.8f, 19.6f)
            line(12f, 3.6f, 12f, 5.4f)
        }
        MbIcon.ChevronLeft -> poly(14.6f, 5.4f, 8.4f, 12f, 14.6f, 18.6f)
        MbIcon.ChevronRight -> poly(9.4f, 5.4f, 15.6f, 12f, 9.4f, 18.6f)
        MbIcon.ChevronDown -> poly(5.4f, 9.4f, 12f, 15.6f, 18.6f, 9.4f)
        MbIcon.Plus -> {
            line(12f, 4.8f, 12f, 19.2f)
            line(4.8f, 12f, 19.2f, 12f)
        }
        MbIcon.Close -> {
            line(5.6f, 5.6f, 18.4f, 18.4f)
            line(18.4f, 5.6f, 5.6f, 18.4f)
        }
        MbIcon.Check -> poly(4.8f, 12.4f, 9.6f, 17.2f, 19.2f, 6.8f)
        MbIcon.Eye -> {
            poly(2.6f, 12f, 5.4f, 8.2f, 8.6f, 6.4f, 12f, 5.8f, 15.4f, 6.4f, 18.6f, 8.2f, 21.4f, 12f)
            poly(21.4f, 12f, 18.6f, 15.8f, 15.4f, 17.6f, 12f, 18.2f, 8.6f, 17.6f, 5.4f, 15.8f, 2.6f, 12f)
            circle(12f, 12f, 3.1f)
        }
        MbIcon.EyeOff -> {
            poly(2.6f, 12f, 5.4f, 8.2f, 8.6f, 6.4f, 12f, 5.8f, 15.4f, 6.4f, 18.6f, 8.2f, 21.4f, 12f)
            poly(21.4f, 12f, 18.6f, 15.8f, 15.4f, 17.6f, 12f, 18.2f, 8.6f, 17.6f, 5.4f, 15.8f, 2.6f, 12f)
            circle(12f, 12f, 3.1f)
            line(3.4f, 3.4f, 20.6f, 20.6f)
        }
        MbIcon.Trash -> {
            line(4f, 6.6f, 20f, 6.6f)
            poly(6.4f, 6.6f, 7.4f, 20f, 16.6f, 20f, 17.6f, 6.6f)
            poly(9.4f, 6.6f, 9.4f, 4.2f, 14.6f, 4.2f, 14.6f, 6.6f)
            line(10.4f, 10.2f, 10.4f, 16.4f)
            line(13.6f, 10.2f, 13.6f, 16.4f)
        }
        MbIcon.Edit -> {
            poly(4f, 20f, 4.6f, 15.8f, 15.8f, 4.6f, 19.4f, 8.2f, 8.2f, 19.4f, 4f, 20f)
            line(13.4f, 7f, 17f, 10.6f)
        }
        MbIcon.Copy -> {
            roundRect(8.6f, 8.6f, 20f, 20f, 2.4f)
            poly(15.4f, 5.6f, 15.4f, 4.2f, 4.2f, 4.2f, 4.2f, 15.4f, 5.6f, 15.4f)
        }
        MbIcon.Box -> {
            poly(3.6f, 8f, 12f, 3.6f, 20.4f, 8f, 20.4f, 16.4f, 12f, 20.8f, 3.6f, 16.4f, 3.6f, 8f)
            poly(3.6f, 8f, 12f, 12.4f, 20.4f, 8f)
            line(12f, 12.4f, 12f, 20.8f)
        }
        MbIcon.Coins -> {
            drawOval(
                tint,
                topLeft = p(4.6f, 4.2f),
                size = Size(11.4f * s, 5.6f * s),
                style = stroke,
            )
            poly(4.6f, 4.2f, 4.6f, 10.6f, 7.2f, 11.6f, 10.4f, 12f, 14.2f, 11.4f, 16f, 10.6f, 16f, 4.2f)
            poly(7.6f, 12.4f, 7.6f, 14.8f, 9.4f, 16.1f, 11.6f, 16.8f, 13.6f, 16.6f, 15.2f, 16.1f, 17f, 15.1f, 19.4f, 16.4f)
            circle(16.6f, 16.6f, 1.2f, filled = true)
        }
        MbIcon.Store -> {
            poly(3.4f, 9.4f, 4.6f, 4.2f, 19.4f, 4.2f, 20.6f, 9.4f)
            poly(3.4f, 9.4f, 3.4f, 19.6f, 20.6f, 19.6f, 20.6f, 9.4f)
            poly(9.4f, 19.6f, 9.4f, 14f, 14.6f, 14f, 14.6f, 19.6f)
            line(3.4f, 9.4f, 20.6f, 9.4f)
        }
        MbIcon.Wallet -> {
            roundRect(3.2f, 6f, 20.8f, 19f, 3.2f)
            poly(3.2f, 9.6f, 17.4f, 9.6f, 20.8f, 9.6f)
            poly(3.2f, 9.6f, 6.4f, 4.4f, 17.2f, 6.2f)
            circle(16.6f, 14.4f, 1.3f, filled = true)
        }
        MbIcon.TrendingUp -> {
            poly(3.6f, 16.8f, 9.4f, 11f, 13f, 14.6f, 20.4f, 7.2f)
            poly(15.4f, 7.2f, 20.4f, 7.2f, 20.4f, 12.2f)
        }
        MbIcon.TrendingDown -> {
            poly(3.6f, 7.2f, 9.4f, 13f, 13f, 9.4f, 20.4f, 16.8f)
            poly(15.4f, 16.8f, 20.4f, 16.8f, 20.4f, 11.8f)
        }
        MbIcon.Warning -> {
            poly(12f, 3.4f, 21.4f, 20.4f, 2.6f, 20.4f, 12f, 3.4f)
            line(12f, 9.4f, 12f, 14.2f)
            circle(12f, 17.2f, 1.05f, filled = true)
        }
        MbIcon.Clock -> {
            circle(12f, 12f, 8.6f)
            poly(12f, 6.8f, 12f, 12.4f, 16.2f, 14.6f)
        }
        MbIcon.Calendar -> {
            roundRect(3.6f, 5.4f, 20.4f, 20f, 2.6f)
            line(3.6f, 10f, 20.4f, 10f)
            line(8.2f, 3.2f, 8.2f, 7f)
            line(15.8f, 3.2f, 15.8f, 7f)
            circle(8.4f, 14.2f, 0.9f, filled = true)
            circle(12f, 14.2f, 0.9f, filled = true)
            circle(15.6f, 14.2f, 0.9f, filled = true)
        }
        MbIcon.Settings -> {
            circle(12f, 12f, 3.2f)
            circle(12f, 12f, 8.2f)
            line(12f, 2.6f, 12f, 4.4f)
            line(12f, 19.6f, 12f, 21.4f)
            line(2.6f, 12f, 4.4f, 12f)
            line(19.6f, 12f, 21.4f, 12f)
            line(5.4f, 5.4f, 6.7f, 6.7f)
            line(17.3f, 17.3f, 18.6f, 18.6f)
            line(18.6f, 5.4f, 17.3f, 6.7f)
            line(6.7f, 17.3f, 5.4f, 18.6f)
        }
        MbIcon.Logout -> {
            poly(14.4f, 4.2f, 5.2f, 4.2f, 5.2f, 19.8f, 14.4f, 19.8f)
            line(11.4f, 12f, 20.8f, 12f)
            poly(17.4f, 8.8f, 20.8f, 12f, 17.4f, 15.2f)
        }
        MbIcon.User -> {
            circle(12f, 8.2f, 3.9f)
            poly(4.4f, 20.4f, 4.4f, 17.6f, 5.2f, 15.6f, 8.4f, 14.2f, 15.6f, 14.2f, 18.8f, 15.6f, 19.6f, 17.6f, 19.6f, 20.4f)
        }
        MbIcon.Phone -> {
            poly(6.2f, 3.6f, 9.4f, 3.6f, 10.8f, 8.2f, 8.6f, 9.8f, 13.4f, 15.2f, 15.8f, 13.2f, 20.4f, 14.4f, 20.4f, 17.8f, 18.4f, 20.4f, 9.4f, 19f, 4.8f, 14.4f, 3.6f, 5.4f, 6.2f, 3.6f)
        }
        MbIcon.Lock -> {
            roundRect(4.6f, 10.4f, 19.4f, 20.6f, 3f)
            poly(7.8f, 10.4f, 7.8f, 7.8f, 9f, 5.4f, 12f, 4.2f, 15f, 5.4f, 16.2f, 7.8f, 16.2f, 10.4f)
            line(12f, 14.4f, 12f, 16.6f)
        }
        MbIcon.WifiOff -> {
            poly(3.2f, 8.4f, 12f, 5.2f, 20.8f, 8.4f)
            poly(6.2f, 12.2f, 12f, 10f, 17.8f, 12.2f)
            poly(9.2f, 16f, 12f, 14.8f, 14.8f, 16f)
            circle(12f, 19.6f, 1.2f, filled = true)
            line(3.8f, 3.6f, 20.2f, 20.4f)
        }
        MbIcon.Refresh -> {
            drawArc(
                tint, startAngle = 40f, sweepAngle = 280f, useCenter = false,
                topLeft = p(4f, 4f), size = Size(16f * s, 16f * s), style = stroke,
            )
            poly(16.4f, 2.8f, 20.4f, 5.4f, 17f, 8.8f)
        }
        MbIcon.Send -> {
            poly(3.4f, 11.6f, 21f, 3.6f, 14.6f, 20.6f, 11.6f, 13.2f, 3.4f, 11.6f)
            line(11.6f, 13.2f, 21f, 3.6f)
        }
        MbIcon.Download -> {
            line(12f, 3.8f, 12f, 15.2f)
            poly(7.4f, 10.8f, 12f, 15.4f, 16.6f, 10.8f)
            poly(4.2f, 17.4f, 4.2f, 20.4f, 19.8f, 20.4f, 19.8f, 17.4f)
        }
        MbIcon.Qr -> {
            roundRect(3.4f, 3.4f, 9.4f, 9.4f, 1.6f)
            roundRect(14.6f, 3.4f, 20.6f, 9.4f, 1.6f)
            roundRect(3.4f, 14.6f, 9.4f, 20.6f, 1.6f)
            roundRect(14.6f, 14.6f, 20.6f, 20.6f, 1.6f)
        }
        MbIcon.Camera -> {
            roundRect(3f, 7.4f, 21f, 20.2f, 3f)
            poly(8.4f, 7.4f, 9.6f, 4.4f, 14.4f, 4.4f, 15.6f, 7.4f)
            circle(12f, 13.6f, 3.6f)
        }
        MbIcon.Filter -> {
            poly(3.4f, 5.2f, 20.6f, 5.2f, 14f, 12.6f, 14f, 20.2f, 10f, 17.6f, 10f, 12.6f, 3.4f, 5.2f)
        }
        MbIcon.Star -> {
            poly(12f, 3.4f, 14.6f, 9.4f, 21f, 10f, 16.2f, 14.2f, 17.6f, 20.4f, 12f, 17f, 6.4f, 20.4f, 7.8f, 14.2f, 3f, 10f, 9.4f, 9.4f, 12f, 3.4f)
        }
        MbIcon.Gift -> {
            roundRect(4.2f, 10.2f, 19.8f, 20.2f, 2.2f)
            line(3.2f, 10.2f, 20.8f, 10.2f)
            line(12f, 10.2f, 12f, 20.2f)
            poly(12f, 10.2f, 8.2f, 10.2f, 6.4f, 8.6f, 6.6f, 6.4f, 8.6f, 5.4f, 10.6f, 6.4f, 12f, 10.2f)
            poly(12f, 10.2f, 15.8f, 10.2f, 17.6f, 8.6f, 17.4f, 6.4f, 15.4f, 5.4f, 13.4f, 6.4f, 12f, 10.2f)
        }
        MbIcon.Sparkles -> {
            poly(12f, 3.4f, 13.4f, 8.6f, 18.6f, 10f, 13.4f, 11.4f, 12f, 16.6f, 10.6f, 11.4f, 5.4f, 10f, 10.6f, 8.6f, 12f, 3.4f)
            poly(18.4f, 14.2f, 19.2f, 16.8f, 21.6f, 17.6f, 19.2f, 18.4f, 18.4f, 20.8f, 17.6f, 18.4f, 15.2f, 17.6f, 17.6f, 16.8f, 18.4f, 14.2f)
            poly(6f, 15.4f, 6.6f, 17.4f, 8.6f, 18f, 6.6f, 18.6f, 6f, 20.6f, 5.4f, 18.6f, 3.4f, 18f, 5.4f, 17.4f, 6f, 15.4f)
        }
        MbIcon.Printer -> {
            poly(7.2f, 8.2f, 7.2f, 3.8f, 16.8f, 3.8f, 16.8f, 8.2f)
            roundRect(3.6f, 8.2f, 20.4f, 16.4f, 2.4f)
            roundRect(7.2f, 13f, 16.8f, 20.4f, 1.6f)
            circle(17.6f, 11f, 0.9f, filled = true)
        }
        MbIcon.Card -> {
            roundRect(2.8f, 5.4f, 21.2f, 18.8f, 3f)
            line(2.8f, 9.8f, 21.2f, 9.8f)
            line(6f, 14.2f, 10.2f, 14.2f)
        }
        MbIcon.Truck -> {
            poly(2.8f, 6.4f, 14.4f, 6.4f, 14.4f, 17.2f, 2.8f, 17.2f, 2.8f, 6.4f)
            poly(14.4f, 10f, 18.6f, 10f, 21.2f, 13f, 21.2f, 17.2f, 14.4f, 17.2f)
            circle(6.6f, 19.2f, 1.9f)
            circle(17.8f, 19.2f, 1.9f)
        }
        MbIcon.Tag -> {
            poly(3.4f, 11.2f, 11.2f, 3.4f, 20.6f, 3.4f, 20.6f, 12.8f, 12.8f, 20.6f, 3.4f, 11.2f)
            circle(16.4f, 7.6f, 1.4f, filled = true)
        }
        MbIcon.Doc -> {
            poly(5.4f, 2.8f, 14.4f, 2.8f, 18.6f, 7f, 18.6f, 21.2f, 5.4f, 21.2f, 5.4f, 2.8f)
            poly(14.4f, 2.8f, 14.4f, 7.2f, 18.6f, 7.2f)
            line(8.4f, 12f, 15.4f, 12f)
            line(8.4f, 15.8f, 15.4f, 15.8f)
        }
        MbIcon.Scan -> {
            poly(3.6f, 8f, 3.6f, 3.6f, 8f, 3.6f)
            poly(16f, 3.6f, 20.4f, 3.6f, 20.4f, 8f)
            poly(20.4f, 16f, 20.4f, 20.4f, 16f, 20.4f)
            poly(8f, 20.4f, 3.6f, 20.4f, 3.6f, 16f)
            line(3.6f, 12f, 20.4f, 12f)
        }
        MbIcon.ArrowRight -> {
            line(3.8f, 12f, 20f, 12f)
            poly(14.8f, 6.8f, 20f, 12f, 14.8f, 17.2f)
        }
        MbIcon.Shield -> {
            poly(12f, 2.8f, 20.4f, 6f, 20.4f, 12.4f, 18.6f, 17f, 12f, 21.4f, 5.4f, 17f, 3.6f, 12.4f, 3.6f, 6f, 12f, 2.8f)
            poly(8.6f, 12f, 11f, 14.4f, 15.6f, 9.6f)
        }
        MbIcon.Moon -> {
            poly(20f, 14.6f, 18.2f, 19f, 13.6f, 21.2f, 8.8f, 20.4f, 5.4f, 17.2f, 4.4f, 12.6f, 6.2f, 8.4f, 10.2f, 5.8f, 14.8f, 5.8f, 18.6f, 8f, 18f, 10.2f, 15.4f, 10.4f, 12.4f, 12.6f, 11.4f, 15.6f, 13.2f, 18.2f, 16.4f, 19f, 18f, 17.4f, 20f, 14.6f)
        }
        MbIcon.Globe -> {
            circle(12f, 12f, 8.8f)
            drawOval(
                tint, topLeft = p(8f, 3.2f), size = Size(8f * s, 17.6f * s), style = stroke,
            )
            line(3.3f, 12f, 20.7f, 12f)
            drawArc(tint, 0f, 180f, false, p(3.3f, 6.4f), Size(17.4f * s, 11.2f * s), style = stroke)
            drawArc(tint, 180f, 180f, false, p(3.3f, 6.4f), Size(17.4f * s, 11.2f * s), style = stroke)
        }
        MbIcon.Receipt -> {
            poly(5.2f, 2.8f, 18.8f, 2.8f, 18.8f, 21.2f, 16f, 19f, 14.4f, 21.2f, 12f, 19f, 10f, 21.2f, 8f, 19f, 5.2f, 21.2f, 5.2f, 2.8f)
            line(8.4f, 7.4f, 15.6f, 7.4f)
            line(8.4f, 11f, 15.6f, 11f)
            line(8.4f, 14.6f, 13f, 14.6f)
        }
        MbIcon.Target -> {
            circle(12f, 12f, 8.6f)
            circle(12f, 12f, 4.8f)
            circle(12f, 12f, 1.3f, filled = true)
        }
        MbIcon.Flame -> {
            poly(12f, 2.8f, 15.6f, 8.4f, 18.8f, 12.6f, 18.4f, 17f, 15.4f, 20.4f, 12f, 21.4f, 8.2f, 20.4f, 5.4f, 17f, 5.4f, 12.8f, 8f, 9.4f, 10.4f, 6.6f, 11.4f, 10.2f, 12f, 2.8f)
        }
    }
}

/** Rect helper inayotumika na chati (Canvas). */
internal fun DrawScope.drawRoundRectHelper(
    color: Color,
    l: Float,
    t: Float,
    r: Float,
    b: Float,
    radius: Float,
    style: androidx.compose.ui.graphics.drawscope.DrawStyle,
) {
    drawRoundRect(
        color,
        topLeft = Offset(l, t),
        size = Size(r - l, b - t),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(radius, radius),
        style = style,
    )
}

internal fun DrawScope.clipRectOrNull(): Rect? = null
