package com.myboke.app

import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "MyBoke — Biashara Yako",
        state = rememberWindowState(width = 440.dp, height = 920.dp),
    ) {
        App()
    }
}
