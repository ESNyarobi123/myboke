package com.myboke.app.core.data

import java.util.prefs.Preferences

actual object Prefs {
    private val node: Preferences = Preferences.userRoot().node("com.myboke.app")

    actual fun getString(key: String): String? = node.get(key, null)

    actual fun putString(key: String, value: String) {
        if (value.isEmpty()) node.remove(key) else node.put(key, value)
        // Andika mara moja — vinginevyo kufunga app kwa ghafla kunapoteza kikao.
        runCatching { node.flush() }
    }
}
