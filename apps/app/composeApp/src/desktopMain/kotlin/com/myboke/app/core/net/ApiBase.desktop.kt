package com.myboke.app.core.net

actual fun defaultApiBaseUrl(): String =
    System.getProperty("myboke.apiBaseUrl") ?: "http://localhost:4000/v1"
