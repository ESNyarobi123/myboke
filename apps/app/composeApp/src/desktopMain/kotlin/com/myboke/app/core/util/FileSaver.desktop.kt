package com.myboke.app.core.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.awt.Desktop
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

actual object FileSaver {
    actual suspend fun save(
        fileName: String,
        bytes: ByteArray,
        mime: String,
    ): SaveResult = withContext(Dispatchers.IO) {
        runCatching {
            val dir = downloadDir()
            dir.mkdirs()
            val target = uniqueFile(dir, fileName)
            Files.write(target.toPath(), bytes)
            // Fungua folda moja kwa moja (macOS/Linux/Windows wakati inawezekana)
            runCatching {
                if (Desktop.isDesktopSupported()) {
                    Desktop.getDesktop().open(target.parentFile)
                }
            }
            SaveResult(true, target.absolutePath)
        }.getOrElse { error ->
            SaveResult(false, "", error.message ?: "Imeshindikana kuhifadhi faili")
        }
    }

    private fun downloadDir(): File {
        val home = System.getProperty("user.home") ?: "."
        val downloads = File(home, "Downloads")
        return if (downloads.parentFile?.exists() == true) downloads else File(home, "MyBoke")
    }

    private fun uniqueFile(dir: File, name: String): File {
        var candidate = File(dir, name)
        if (!candidate.exists()) return candidate
        val dot = name.lastIndexOf('.')
        val base = if (dot > 0) name.substring(0, dot) else name
        val ext = if (dot > 0) name.substring(dot) else ""
        var i = 2
        while (candidate.exists()) {
            candidate = File(dir, "$base-$i$ext")
            i++
        }
        return candidate
    }
}
