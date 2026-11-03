package com.myboke.app.core.data

import android.content.Context

/** Context huwekwa na MainActivity kabla ya composable yoyote. */
object AndroidPrefsHolder {
    var context: Context? = null
}

actual object Prefs {
    private fun prefs() = AndroidPrefsHolder.context
        ?.getSharedPreferences("myboke", Context.MODE_PRIVATE)

    actual fun getString(key: String): String? = prefs()?.getString(key, null)

    actual fun putString(key: String, value: String) {
        prefs()?.edit()?.apply {
            if (value.isEmpty()) remove(key) else putString(key, value)
            apply()
        }
    }
}
