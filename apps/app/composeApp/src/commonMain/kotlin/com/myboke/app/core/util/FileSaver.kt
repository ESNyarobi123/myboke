package com.myboke.app.core.util

/**
 * Kuhifadhi faili zilizopakuliwa (PDF, CSV, JSON) kwenye kifaa.
 * Inarudisha mahali ilipohifadhiwa — kwa kuonyesha kwa mtumiaji.
 */
expect object FileSaver {
    suspend fun save(fileName: String, bytes: ByteArray, mime: String): SaveResult
}

data class SaveResult(
    val ok: Boolean,
    val path: String,
    val message: String? = null,
)
