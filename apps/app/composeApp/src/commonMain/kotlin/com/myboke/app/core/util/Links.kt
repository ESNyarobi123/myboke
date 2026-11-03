package com.myboke.app.core.util

/**
 * Hufungua kiungo cha nje (simu, WhatsApp, ramani) kwenye kifaa.
 * Inarudisha `true` ikiwa kifaa kimekubali ombi.
 */
expect fun openExternal(url: String): Boolean

/** Namba ya simu ya kumpigia mteja, ikiwa tayari kwa `tel:`. */
fun telUrl(phone: String): String = "tel:${phone.filter { it.isDigit() || it == '+' }}"

/**
 * Kiungo cha WhatsApp. Namba inatakikana iwe na msimbo wa nchi bila `+`
 * (mf. `255712345678`). Funguo ya ujumbe inaweza kuwa tupu.
 */
fun whatsAppUrl(phone: String, message: String = ""): String {
    val digits = phone.filter { it.isDigit() }
    val base = "https://wa.me/$digits"
    return if (message.isBlank()) base else "$base?text=${urlEncode(message)}"
}

private fun urlEncode(raw: String): String = buildString {
    for (b in raw.encodeToByteArray()) {
        val ch = b.toInt().toChar()
        if (ch.isLetterOrDigit() || ch in "-_.~") {
            append(ch)
        } else {
            append('%')
            append("0123456789ABCDEF"[(b.toInt() shr 4) and 0xF])
            append("0123456789ABCDEF"[b.toInt() and 0xF])
        }
    }
}
