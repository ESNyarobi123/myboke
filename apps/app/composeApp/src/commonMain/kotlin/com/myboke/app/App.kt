package com.myboke.app

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Stage
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MyBokeTheme
import com.myboke.app.ui.MainShell
import com.myboke.app.ui.screens.auth.AuthScreen
import com.myboke.app.ui.screens.auth.OnboardingScreen
import com.myboke.app.ui.screens.auth.PinLockScreen
import com.myboke.app.ui.screens.auth.SplashScreen

@Composable
fun App() {
    val scope = rememberCoroutineScope()
    val state = remember { AppState(scope) }

    LaunchedEffect(Unit) { state.start() }

    // Arabic inahitaji layout ya kulia-kushoto (RTL). Composition local inabadilika
    // papo hapo lugha inapobadilika — hakuna restart.
    val direction = if (state.lang.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr

    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        MyBokeTheme(dark = state.dark) {
            Box(Modifier.fillMaxSize().background(MbTheme.colors.bg)) {
                Crossfade(
                    targetState = state.stage,
                    animationSpec = tween(durationMillis = 420),
                    label = "stage",
                ) { stage ->
                    when (stage) {
                        Stage.Splash -> SplashScreen(state)
                        Stage.Onboarding -> OnboardingScreen(state)
                        Stage.Auth -> AuthScreen(state)
                        Stage.Main -> MainShell(state)
                    }
                }

                // Kufuli ya app: inafunika kila kitu hadi PIN sahihi iwekwe.
                if (state.stage == Stage.Main && state.locked) {
                    PinLockScreen(state)
                }

                state.snackbar?.let { message ->
                    Box(
                        Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp, vertical = 28.dp),
                    ) {
                        Row(
                            Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(MbTheme.colors.textPrimary)
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Start,
                        ) {
                            MbIconView(MbIcon.Check, size = 16.dp, tint = MbTheme.colors.surface)
                            Spacer(Modifier.width(10.dp))
                            Text(
                                message,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MbTheme.colors.surface,
                            )
                        }
                    }
                }
            }
        }
    }
}
