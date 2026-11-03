package com.myboke.app.core.net

/**
 * Desktop default ni API ya uzalishaji.
 * Override: `-Dmyboke.apiBaseUrl=http://localhost:4000/v1`
 */
actual fun defaultApiBaseUrl(): String =
    System.getProperty("myboke.apiBaseUrl") ?: "https://apiboke.yunigo.online/v1"
