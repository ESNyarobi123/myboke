package com.myboke.app

import androidx.compose.ui.graphics.toAwtImage
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.data.Prefs
import com.myboke.app.core.data.Stage
import com.myboke.app.core.design.MyBokeTheme
import com.myboke.app.core.i18n.Lang
import com.myboke.app.core.net.MyBokeApi
import com.myboke.app.ui.MainShell
import kotlinx.coroutines.runBlocking
import java.io.File
import javax.imageio.ImageIO
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * Huzalisha picha halisi za skrini (screenshots) za maduka/QR kwa
 * uhakiki wa UI — bila kuunganisha kifaa halisi.
 *
 * Picha zinaandikwa `/tmp/myboke-*.png`. Jaribio linahitaji seva ya
 * `localhost:4000`; bila hiyo linarukwa.
 */
@OptIn(ExperimentalTestApi::class)
class ShopScreenshotTest {

    @Test
    fun `capture shops schedule and qr screenshots`() {
        if (!backendReachable()) {
            println("SKIP: backend haipo — picha za maduka hazijazalishwa")
            return
        }
        runCapture()
    }

    private fun runCapture() = runComposeUiTest {

        val api = MyBokeApi("http://localhost:4000/v1")
        val tokens = runBlocking { api.demo() }
        api.token = tokens.accessToken
        val access = tokens.accessToken ?: error("demo haikutoa token")

        // Kikao cha desktop: token + seva + lugha.
        Prefs.putString("apiBase", "http://localhost:4000/v1")
        Prefs.putString("token", access)
        Prefs.putString("refreshToken", tokens.refreshToken ?: "")
        Prefs.putString("onboardingDone", "1")
        Prefs.putString("offline", "0")
        Prefs.putString("lang", "en")

        // Data ya kuonekana: saa za kazi + likizo.
        runBlocking {
            val shop = api.shops().first()
            api.updateShop(
                shop.id,
                businessHours = mapOf(
                    "mon" to com.myboke.app.core.model.ShopDayHours(open = "08:00", close = "20:00"),
                    "tue" to com.myboke.app.core.model.ShopDayHours(open = "08:00", close = "20:00"),
                    "wed" to com.myboke.app.core.model.ShopDayHours(open = "09:00", close = "18:00"),
                    "thu" to com.myboke.app.core.model.ShopDayHours(open = "08:00", close = "20:00"),
                    "fri" to com.myboke.app.core.model.ShopDayHours(open = "08:00", close = "21:00"),
                    "sat" to com.myboke.app.core.model.ShopDayHours(open = "10:00", close = "16:00"),
                    "sun" to com.myboke.app.core.model.ShopDayHours(closed = true),
                ),
            )
            api.addShopHoliday(shop.id, "2026-12-25", "Christmas Day")
            api.addShopHoliday(shop.id, "2027-01-01", "New Year")
        }

        val state = AppState(kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Default))
        state.start()
        waitUntil(timeoutMillis = 25_000) { state.stage == Stage.Main }
        state.switchLang(Lang.EN)

        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitUntil(timeoutMillis = 20_000) { state.shops.isNotEmpty() }
        waitForIdle()

        // Shops
        state.navigate(Page.Shops)
        waitForIdle()
        save("/tmp/myboke-shops-en.png")

        // QR
        onNodeWithText("Shop QR").performClick()
        waitUntil(timeoutMillis = 25_000) { state.qrBytes != null }
        waitForIdle()
        save("/tmp/myboke-qr-en.png")

        // Saa za kazi
        onNodeWithText("Close").performClick()
        state.navigate(Page.ShopSchedule)
        waitUntil(timeoutMillis = 25_000) { state.schedule != null }
        waitForIdle()
        save("/tmp/myboke-schedule-en.png")

        // Kiarabu (RTL)
        state.switchLang(Lang.AR)
        waitForIdle()
        save("/tmp/myboke-schedule-ar.png")

        assertTrue(
            state.schedule?.hours?.get("mon")?.open == "08:00",
            "Saa za kazi za Jumatatu zinapaswa kuwa 08:00",
        )
        assertTrue(File("/tmp/myboke-schedule-ar.png").length() > 5_000, "Picha ya RTL ipo")
    }

    private fun androidx.compose.ui.test.ComposeUiTest.save(path: String) {
        val image = onRoot().captureToImage().toAwtImage()
        ImageIO.write(image, "png", File(path))
    }

    private fun backendReachable(): Boolean = runCatching {
        val conn = java.net.URL("http://localhost:4000/v1/health")
            .openConnection() as java.net.HttpURLConnection
        conn.connectTimeout = 1200
        conn.readTimeout = 1200
        val ok = conn.responseCode == 200
        conn.disconnect()
        ok
    }.getOrDefault(false)
}
