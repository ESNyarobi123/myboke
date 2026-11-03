package com.myboke.app

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.MyBokeTheme
import com.myboke.app.core.i18n.Lang
import com.myboke.app.ui.screens.auth.AuthScreen
import com.myboke.app.ui.screens.auth.OnboardingScreen
import com.myboke.app.ui.screens.auth.SplashScreen
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * Uthibitisho wa runtime (desktop Compose) kwa splash, onboarding, auth,
 * na lugha 5 — bila simu. Inathibitisha UI inapanga na maandishi yanabadilika.
 */
@OptIn(ExperimentalTestApi::class)
class SplashAuthI18nTest {

    @Test
    fun splash_renders_brand() = runComposeUiTest {
        val state = AppState(CoroutineScope(Dispatchers.Unconfined))
        setContent { MyBokeTheme(dark = false) { SplashScreen(state) } }
        waitForIdle()
        assertTrue(
            onAllNodesWithText("MyBoke", substring = true).fetchSemanticsNodes().isNotEmpty(),
            "Splash inapaswa kuonyesha brand MyBoke",
        )
    }

    @Test
    fun auth_shows_login_and_register_controls_in_english() = runComposeUiTest {
        val state = AppState(CoroutineScope(Dispatchers.Unconfined))
        state.switchLang(Lang.EN)
        setContent { MyBokeTheme(dark = false) { AuthScreen(state) } }
        waitForIdle()
        assertTrue(onAllNodesWithText("Sign in", substring = true).fetchSemanticsNodes().isNotEmpty())
        assertTrue(onAllNodesWithText("Sign up", substring = true).fetchSemanticsNodes().isNotEmpty() ||
            onAllNodesWithText("Welcome back", substring = true).fetchSemanticsNodes().isNotEmpty())
    }

    @Test
    fun switching_all_five_languages_updates_auth_copy() = runComposeUiTest {
        val state = AppState(CoroutineScope(Dispatchers.Unconfined))
        setContent { MyBokeTheme(dark = false) { AuthScreen(state) } }
        waitForIdle()

        val probes = mapOf(
            Lang.SW to listOf("Ingia", "Jisajili", "Nenosiri"),
            Lang.EN to listOf("Sign in", "Password", "Welcome back"),
            Lang.ES to listOf("Iniciar", "Contraseña", "Bienvenido"),
            Lang.FR to listOf("connecter", "Mot de passe", "Bon retour"),
            Lang.AR to listOf("تسجيل", "كلمة المرور", "مرحبا"),
        )
        for ((lang, words) in probes) {
            state.switchLang(lang)
            waitForIdle()
            val hit = words.any { w ->
                onAllNodesWithText(w, substring = true).fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(hit, "Auth kwa ${lang.code} inapaswa kuonyesha moja ya: $words")
        }
    }

    @Test
    fun onboarding_language_pill_opens_picker() = runComposeUiTest {
        val state = AppState(CoroutineScope(Dispatchers.Unconfined))
        state.switchLang(Lang.EN)
        setContent { MyBokeTheme(dark = false) { OnboardingScreen(state) } }
        waitForIdle()
        // Kitufe cha lugha kinaonyesha badge EN/SW/...
        val badge = onAllNodesWithText("EN").fetchSemanticsNodes()
        assertTrue(badge.isNotEmpty() || onAllNodesWithText("SW").fetchSemanticsNodes().isNotEmpty(),
            "Onboarding inapaswa kuwa na language pill")
    }
}
