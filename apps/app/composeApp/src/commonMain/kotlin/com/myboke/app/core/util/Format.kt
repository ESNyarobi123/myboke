package com.myboke.app.core.util

import com.myboke.app.core.i18n.Lang
import kotlin.math.abs
import kotlin.math.roundToLong

/** Pesa daima kama string yenye comma, sio floating point (§7.2.1). */
object Money {
    fun parse(raw: String?): Double {
        if (raw.isNullOrBlank()) return 0.0
        val cleaned = raw.replace(",", "").replace(" ", "").trim()
        return cleaned.toDoubleOrNull() ?: 0.0
    }

    fun format(value: Double, decimals: Int = 2): String {
        val rounded: Double = if (decimals == 0) {
            value.roundToLong().toDouble()
        } else {
            val factor = pow10(decimals)
            (value * factor).roundToLong() / factor
        }
        val negative = rounded < 0
        val whole = abs(rounded)
        val intPart = whole.toLong()
        val fracPart = ((abs(rounded) - intPart) * pow10(decimals)).roundToLong()
        val grouped = group(intPart)
        val body = if (decimals == 0) {
            grouped
        } else {
            grouped + "." + fracPart.toString().padStart(decimals, '0')
        }
        return if (negative) "-$body" else body
    }

    /**
     * Namba tupu bila koma — kwa kutuma kwenye API.
     * Backend hukagua `^\d{1,15}(\.\d{1,2})?$`, hivyo `"1,500.00"` hukataliwa;
     * tumia `plain()` kwa payload zote za pesa.
     */
    fun plain(value: Double, decimals: Int = 2): String = format(value, decimals).replace(",", "")

    fun formatShort(value: Double): String {
        val a = abs(value)
        return when {
            a >= 1_000_000_000 -> format(value / 1_000_000_000, 1) + "B"
            a >= 1_000_000 -> format(value / 1_000_000, 1) + "M"
            a >= 10_000 -> format(value / 1000, 0) + "K"
            else -> format(value, 0)
        }
    }

    fun withCurrency(value: Double, currency: String = "TZS", decimals: Int = 2): String =
        "$currency ${format(value, decimals)}"

    private fun group(n: Long): String {
        val s = n.toString()
        if (s.length <= 3) return s
        val sb = StringBuilder()
        var count = 0
        for (i in s.length - 1 downTo 0) {
            sb.append(s[i])
            count += 1
            if (count % 3 == 0 && i != 0) sb.append(',')
        }
        return sb.reverse().toString()
    }

    private fun pow10(n: Int): Double {
        var r = 1.0
        repeat(n) { r *= 10 }
        return r
    }

    fun percentChange(current: Double, previous: Double): Double =
        if (previous == 0.0) {
            if (current == 0.0) 0.0 else 100.0
        } else {
            ((current - previous) / previous) * 100.0
        }
}

/** Tarehe za EAT bila tegemezi ya nje (msingi ni epoch millis UTC). */
object Dates {
    private const val DAY_MS = 86_400_000L

    private val monthsSw = listOf(
        "Januari", "Februari", "Machi", "Aprili", "Mei", "Juni",
        "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba",
    )
    private val monthsEn = listOf(
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    )
    private val daysSw = listOf(
        "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi", "Jumapili",
    )
    private val daysEn = listOf(
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    )
    private val shortDays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

    // ── Majina kwa lugha zote (ES, FR, AR) ────────────────────
    private val monthsEs = listOf(
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    )
    private val daysEs = listOf(
        "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
    )
    private val shortDaysEs = listOf("lun", "mar", "mié", "jue", "vie", "sáb", "dom")

    private val monthsFr = listOf(
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    )
    private val daysFr = listOf(
        "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
    )
    private val shortDaysFr = listOf("lun", "mar", "mer", "jeu", "ven", "sam", "dim")

    private val monthsAr = listOf(
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    )
    private val daysAr = listOf(
        "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد",
    )
    private val shortDaysAr = listOf("اثن", "ثلا", "أرب", "خمي", "جمع", "سبت", "أحد")

    /** Majina ya miezi/kwa siku kulingana na lugha iliyochaguliwa. */
    fun monthsOf(lang: Lang): List<String> = when (lang) {
        Lang.SW -> monthsSw
        Lang.EN -> monthsEn
        Lang.ES -> monthsEs
        Lang.FR -> monthsFr
        Lang.AR -> monthsAr
    }

    fun daysOf(lang: Lang): List<String> = when (lang) {
        Lang.SW -> daysSw
        Lang.EN -> daysEn
        Lang.ES -> daysEs
        Lang.FR -> daysFr
        Lang.AR -> daysAr
    }

    fun shortDaysOf(lang: Lang): List<String> = when (lang) {
        Lang.SW -> shortDays
        Lang.EN -> shortDays
        Lang.ES -> shortDaysEs
        Lang.FR -> shortDaysFr
        Lang.AR -> shortDaysAr
    }

    /** Tarehe ndefu kwa lugha yoyote: "Jumatatu, 3 Novemba 2026". */
    fun dateLongFor(epochMs: Long, lang: Lang): String {
        val p = parts(epochMs)
        return "${daysOf(lang)[p.weekday]}, ${p.day} ${monthsOf(lang)[p.month - 1]} ${p.year}"
    }

    /** Mwezi + mwaka kwa lugha yoyote. */
    fun monthYearFor(epochMs: Long, lang: Lang): String {
        val p = parts(epochMs)
        return "${monthsOf(lang)[p.month - 1]} ${p.year}"
    }

    /** Jina la siku kwa lugha yoyote (Mon=0). */
    fun dayNameFor(index: Int, lang: Lang): String = shortDaysOf(lang)[index.coerceIn(0, 6)]

    /** Muda uliopita kwa lugha yoyote. */
    fun relativeFor(epochMs: Long, lang: Lang): String {
        val diff = now() - epochMs
        val mins = diff / 60_000
        return when {
            mins < 1 -> when (lang) {
                Lang.SW -> "sasa hivi"
                Lang.EN -> "just now"
                Lang.ES -> "ahora mismo"
                Lang.FR -> "à l'instant"
                Lang.AR -> "الآن"
            }
            mins < 60 -> when (lang) {
                Lang.SW -> "dakika $mins zilizopita"
                Lang.EN -> "$mins min ago"
                Lang.ES -> "hace $mins min"
                Lang.FR -> "il y a $mins min"
                Lang.AR -> "قبل $mins دقيقة"
            }
            mins < 1440 -> {
                val h = mins / 60
                when (lang) {
                    Lang.SW -> "saa $h zilizopita"
                    Lang.EN -> "$h h ago"
                    Lang.ES -> "hace $h h"
                    Lang.FR -> "il y a $h h"
                    Lang.AR -> "قبل $h ساعة"
                }
            }
            mins < 2880 -> when (lang) {
                Lang.SW -> "jana"
                Lang.EN -> "yesterday"
                Lang.ES -> "ayer"
                Lang.FR -> "hier"
                Lang.AR -> "أمس"
            }
            else -> dateShort(epochMs)
        }
    }

    /** Sehemu za tarehe kwa saa za EAT (UTC+3). */
    data class Parts(
        val year: Int,
        val month: Int,
        val day: Int,
        val hour: Int,
        val minute: Int,
        val weekday: Int, // 0 = Jumatatu
    )

    private fun parts(epochMs: Long, offsetHours: Int = 3): Parts {
        val shifted = epochMs + offsetHours * 3_600_000L
        var days = shifted / DAY_MS
        var rem = shifted % DAY_MS
        if (rem < 0) {
            rem += DAY_MS
            days -= 1
        }
        val hour = (rem / 3_600_000L).toInt()
        val minute = ((rem % 3_600_000L) / 60_000L).toInt()

        // Zeller-like conversion kutoka siku za epoch (1970-01-01 = Alhamisi)
        var y = 1970
        var d = days
        while (true) {
            val yearDays = if (isLeap(y)) 366 else 365
            if (d >= yearDays) {
                d -= yearDays
                y += 1
            } else break
        }
        val monthLengths = if (isLeap(y)) {
            intArrayOf(31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
        } else {
            intArrayOf(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
        }
        var m = 0
        while (m < 12 && d >= monthLengths[m]) {
            d -= monthLengths[m]
            m += 1
        }
        return Parts(
            year = y,
            month = m + 1,
            day = (d + 1).toInt(),
            hour = hour,
            minute = minute,
            weekday = weekdayOf(days),
        )
    }

    private fun weekdayOf(epochDays: Long): Int {
        // 1970-01-01 ilikuwa Alhamisi (index 3 kwa Jumatatu=0)
        val idx = ((epochDays + 3) % 7).toInt()
        return if (idx < 0) idx + 7 else idx
    }

    private fun isLeap(y: Int): Boolean =
        (y % 4 == 0 && y % 100 != 0) || y % 400 == 0

    fun now(): Long = currentTimeMillis()

    fun dateLong(epochMs: Long, swahili: Boolean = true): String {
        val p = parts(epochMs)
        return if (swahili) {
            "${daysSw[p.weekday]}, ${p.day} ${monthsSw[p.month - 1]} ${p.year}"
        } else {
            "${daysEn[p.weekday]}, ${p.day} ${monthsEn[p.month - 1]} ${p.year}"
        }
    }

    fun dateShort(epochMs: Long): String {
        val p = parts(epochMs)
        return "${p.day.toString().padStart(2, '0')}/${p.month.toString().padStart(2, '0')}/${p.year}"
    }

    fun monthYear(epochMs: Long, swahili: Boolean = true): String {
        val p = parts(epochMs)
        return if (swahili) "${monthsSw[p.month - 1]} ${p.year}" else "${monthsEn[p.month - 1]} ${p.year}"
    }

    fun dayName(index: Int): String = shortDays[index.coerceIn(0, 6)]

    fun timeHm(epochMs: Long): String {
        val p = parts(epochMs)
        return "${p.hour.toString().padStart(2, '0')}:${p.minute.toString().padStart(2, '0')}"
    }

    fun relative(epochMs: Long, swahili: Boolean = true): String {
        val diff = now() - epochMs
        val mins = diff / 60_000
        return when {
            mins < 1 -> if (swahili) "sasa hivi" else "just now"
            mins < 60 -> if (swahili) "dakika $mins zilizopita" else "$mins min ago"
            mins < 1440 -> {
                val h = mins / 60
                if (swahili) "saa $h zilizopita" else "$h h ago"
            }
            mins < 2880 -> if (swahili) "jana" else "yesterday"
            else -> dateShort(epochMs)
        }
    }

    /** Mwanzo wa siku (EAT) kwa epoch millis. */
    fun startOfDay(epochMs: Long = now()): Long {
        val shifted = epochMs + 3 * 3_600_000L
        val dayStart = (shifted / DAY_MS) * DAY_MS
        return dayStart - 3 * 3_600_000L
    }

    fun startOfWeek(epochMs: Long = now()): Long {
        val p = parts(epochMs)
        return startOfDay(epochMs) - p.weekday * DAY_MS
    }

    fun startOfMonth(epochMs: Long = now()): Long {
        val p = parts(epochMs)
        return startOfDay(epochMs) - (p.day - 1) * DAY_MS
    }

    fun daysAgo(n: Int, from: Long = now()): Long = startOfDay(from) - n * DAY_MS

    fun isoDate(epochMs: Long): String {
        val p = parts(epochMs)
        return "${p.year}-${p.month.toString().padStart(2, '0')}-${p.day.toString().padStart(2, '0')}"
    }
}

/** Saa ya sasa — expect/actual kwa kila platform. */
expect fun currentTimeMillis(): Long
