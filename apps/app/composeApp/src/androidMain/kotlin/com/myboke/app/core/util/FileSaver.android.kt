package com.myboke.app.core.util

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.myboke.app.core.data.AndroidPrefsHolder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

actual object FileSaver {
    actual suspend fun save(
        fileName: String,
        bytes: ByteArray,
        mime: String,
    ): SaveResult = withContext(Dispatchers.IO) {
        val context = AndroidPrefsHolder.context
            ?: return@withContext SaveResult(false, "", "Programu haijaanza vizuri")

        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveToDownloads(context, fileName, bytes, mime)
            } else {
                saveToAppDir(context, fileName, bytes)
            }
        }.getOrElse { error ->
            SaveResult(false, "", error.message ?: "Imeshindikana kuhifadhi faili")
        }
    }

    private fun saveToDownloads(
        context: Context,
        fileName: String,
        bytes: ByteArray,
        mime: String,
    ): SaveResult {
        val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
            put(MediaStore.Downloads.MIME_TYPE, mime)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(collection, values)
            ?: return saveToAppDir(context, fileName, bytes)

        resolver.openOutputStream(uri)?.use { it.write(bytes) }
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        return SaveResult(true, "Downloads/$fileName")
    }

    private fun saveToAppDir(
        context: Context,
        fileName: String,
        bytes: ByteArray,
    ): SaveResult {
        val root = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            ?: context.filesDir
        val dir = File(root, "MyBoke").apply { mkdirs() }
        val file = File(dir, fileName)
        file.writeBytes(bytes)
        return SaveResult(true, file.absolutePath)
    }
}
