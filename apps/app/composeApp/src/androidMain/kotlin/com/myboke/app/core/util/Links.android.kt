package com.myboke.app.core.util

import android.content.Intent
import android.net.Uri
import com.myboke.app.core.data.AndroidPrefsHolder

actual fun openExternal(url: String): Boolean {
    val ctx = AndroidPrefsHolder.context ?: return false
    return runCatching {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        ctx.startActivity(intent)
        true
    }.getOrDefault(false)
}
