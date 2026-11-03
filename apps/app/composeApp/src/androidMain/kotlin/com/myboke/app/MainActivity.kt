package com.myboke.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.myboke.app.core.data.AndroidPrefsHolder
import com.myboke.app.core.data.activeState

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AndroidPrefsHolder.context = applicationContext
        enableEdgeToEdge()
        setContent { App() }
    }

    /**
     * App inapoingia nyuma tunafunga kwa PIN (kama ilivyowekwa). Tunapuuza
     * mabadiliko ya mwelekeo/ukubwa wa skrini — hayo si "kuondoka" kwenye app.
     */
    override fun onStop() {
        super.onStop()
        if (!isChangingConfigurations) activeState?.onBackground()
    }
}
