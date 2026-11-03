package com.myboke.app

import android.app.Application
import com.myboke.app.core.data.AndroidPrefsHolder

class MyBokeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AndroidPrefsHolder.context = applicationContext
    }
}
