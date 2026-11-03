package com.myboke.app.core.net

import android.os.Build

/**
 * Emulator → host machine (`10.0.2.2`).
 * Simu halisi → API ya uzalishaji (`apiboke.yunigo.online`).
 * Mtumiaji bado anaweza kubadilisha seva kwenye Mipangilio.
 */
actual fun defaultApiBaseUrl(): String {
    val fp = Build.FINGERPRINT
    val isEmulator = fp.startsWith("generic") ||
        fp.contains("emulator", ignoreCase = true) ||
        fp.contains("sdk_gphone", ignoreCase = true) ||
        Build.PRODUCT.contains("sdk", ignoreCase = true) ||
        Build.MODEL.contains("Emulator", ignoreCase = true)
    return if (isEmulator) "http://10.0.2.2:4000/v1" else "https://apiboke.yunigo.online/v1"
}
