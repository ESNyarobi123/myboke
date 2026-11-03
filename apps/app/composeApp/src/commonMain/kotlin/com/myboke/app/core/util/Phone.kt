package com.myboke.app.core.util

/**
 * Namba za simu za kimataifa (§7.1).
 *
 * Backend inahifadhi namba ya Tanzania kwa mtindo wa ndani (`0712 345 678`),
 * na namba za nje kwa mtindo wa kimataifa bila `+` (`254712345678`).
 * Hapa tunatoa kanuni moja ya kusafisha na kuthibitisha namba kabla ya kutuma.
 *
 * Mfumo unalenga Afrika Mashariki na Kusini, lakini orodha inaweza kuongezwa
 * bila kubadilisha mahali popote panapotumia [PhoneFieldState].
 */
enum class Country(
    val iso: String,
    val dial: String,
    /** Jina la nchi kwa kuonyesha. */
    val title: String,
    /** Idadi ya tarakimu za namba ya ndani (bila msimbo wa nchi). */
    val nationalLength: Int,
    /** Tarakimu za mwanzo zinazoruhusiwa kwa simu za mkononi. */
    val mobilePrefixes: Set<Char>,
) {
    TZ("TZ", "+255", "Tanzania", 9, setOf('6', '7')),
    KE("KE", "+254", "Kenya", 9, setOf('1', '7')),
    UG("UG", "+256", "Uganda", 9, setOf('3', '7')),
    RW("RW", "+250", "Rwanda", 9, setOf('7', '8')),
    BI("BI", "+257", "Burundi", 8, setOf('6', '7')),
    CD("CD", "+243", "DR Congo", 9, setOf('8', '9')),
    ZM("ZM", "+260", "Zambia", 9, setOf('7', '9')),
    MW("MW", "+265", "Malawi", 9, setOf('8', '9')),
    MZ("MZ", "+258", "Mozambique", 9, setOf('2', '8')),
    ZA("ZA", "+27", "South Africa", 9, setOf('6', '7', '8')),
    NG("NG", "+234", "Nigeria", 10, setOf('7', '8', '9')),
    GB("GB", "+44", "United Kingdom", 10, setOf('7')),
    US("US", "+1", "United States", 10, setOf('2', '3', '4', '5', '6', '7', '8', '9')),
    ;

    /** Tarakimu za msimbo wa nchi bila `+`, mf. `255`. */
    val dialDigits: String get() = dial.removePrefix("+")

    companion object {
        val default: Country = TZ
        fun fromIso(iso: String?): Country =
            entries.firstOrNull { it.iso.equals(iso, ignoreCase = true) } ?: default
    }
}

object Phone {
    /** Tarakimu pekee kutoka kwa maandishi yoyote. */
    fun digits(raw: String): String = raw.filter { it.isDigit() }

    /**
     * Namba ya ndani (national significant number): haina `+`, haina `0` ya mwanzo
     * na haina msimbo wa nchi. Mf. `+255 712 345 678` → `712345678`.
     */
    fun national(raw: String, country: Country): String {
        var d = digits(raw)
        if (d.isEmpty()) return ""
        // Msimbo wa nchi umewekwa mwanzo (mf. 255712345678)
        if (d.length > country.nationalLength && d.startsWith(country.dialDigits)) {
            d = d.removePrefix(country.dialDigits)
        }
        // Namba ya ndani yenye `0` ya mwanzo (mf. 0712345678)
        while (d.length > country.nationalLength && d.startsWith("0")) {
            d = d.substring(1)
        }
        return d
    }

    /** Namba kamili kwa `tel:`/WhatsApp: `+255712345678`. */
    fun e164(raw: String, country: Country): String {
        val n = national(raw, country)
        return if (n.isEmpty()) "" else country.dial + n
    }

    /**
     * Muundo unaotumwa kwa backend: Tanzania huhifadhiwa kwa `0` ya mwanzo,
     * nchi nyingine kwa msimbo wa nchi bila `+`.
     */
    fun forBackend(raw: String, country: Country): String {
        val n = national(raw, country)
        if (n.isEmpty()) return ""
        return if (country == Country.TZ) "0$n" else country.dialDigits + n
    }

    /** Inathibitisha namba ya simu ya mkononi ya nchi husika. */
    fun isValid(raw: String, country: Country): Boolean {
        val n = national(raw, country)
        if (n.length != country.nationalLength) return false
        return country.mobilePrefixes.contains(n.first())
    }

    /** Vikao vya 3-3-3 (au 4-4 kwa namba za tarakimu 8) kwa urahisi wa kusoma. */
    private fun group(n: String): String {
        if (n.length == 8) return "${n.take(4)} ${n.drop(4)}"
        val chunks = n.chunked(3).toMutableList()
        // Kikundi cha mwisho chenye tarakimu 1 au 2 kiunganishwe na kilichotangulia.
        if (chunks.size > 1 && chunks.last().length < 3) {
            val tail = chunks.removeAt(chunks.lastIndex)
            chunks[chunks.lastIndex] = chunks.last() + tail
        }
        return chunks.joinToString(" ")
    }

    /** Muundo wa kuonyesha: `0712 345 678` (TZ) au `+254 712 345 678`. */
    fun pretty(raw: String, country: Country): String {
        val n = national(raw, country)
        if (n.isEmpty()) return ""
        val grouped = group(n)
        return if (country == Country.TZ) "0$grouped" else "${country.dial} $grouped"
    }

    /**
     * Inatambua kama maandishi ni namba ya simu (si barua pepe) na kuirejesha
     * kwa muundo wa backend. Hii inatumika kwenye sehemu ya "simu au barua pepe".
     */
    fun looksLikePhone(raw: String): Boolean {
        val d = digits(raw)
        return raw.isNotBlank() && !raw.contains("@") && d.length >= 7
    }

    /** Nchi inayowezekana kutokana na namba iliyoandikwa (kwa login ya kimataifa). */
    fun guessCountry(raw: String): Country? {
        val d = digits(raw)
        if (d.isEmpty()) return null
        if (d.startsWith("0")) return Country.TZ
        return Country.entries
            .filter { d.length > it.nationalLength && d.startsWith(it.dialDigits) }
            .maxByOrNull { it.dialDigits.length }
    }
}
