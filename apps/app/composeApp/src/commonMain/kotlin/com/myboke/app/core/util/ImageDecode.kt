package com.myboke.app.core.util

import androidx.compose.ui.graphics.ImageBitmap

/**
 * Hupamba picha (PNG/JPEG) kuwa `ImageBitmap` ya Compose.
 * Hutumika kuonyesha QR ya duka iliyotengenezwa na seva.
 */
expect fun decodeImage(bytes: ByteArray): ImageBitmap?
