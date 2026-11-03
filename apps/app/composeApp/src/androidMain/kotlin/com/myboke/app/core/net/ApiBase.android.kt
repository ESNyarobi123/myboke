package com.myboke.app.core.net

import android.os.Build

/**
 * Kwenye emulator host inaonekana kama `10.0.2.2`; kwenye simu halisi
 * tunatumia seva ya uzalishaji. Mtumiaji anaweza kubadilisha seva
 * (mf. IP ya kompyuta kwenye Wi-Fi moja) kupitia Mipangilio.
 */
actual fun defaultApiBaseUrl(): String {
    val fp = Build.FINGERPRINT
    val isEmulator = fp.startsWith("generic") ||
        fp.contains("emulator", ignoreCase = true) ||
        fp.contains("sdk_gphone", ignoreCase = true) ||
        Build.PRODUCT.contains("sdk", ignoreCase = true) ||
        Build.MODEL.contains("Emulator", ignoreCase = true)
    return if (isEmulator) "http://10.0.2.2:4000/v1" else "https://api.myboke.co.tz/v1"
}
