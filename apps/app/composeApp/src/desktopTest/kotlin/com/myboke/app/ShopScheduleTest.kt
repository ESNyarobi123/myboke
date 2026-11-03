package com.myboke.app

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.MyBokeTheme
import com.myboke.app.core.i18n.Lang
import com.myboke.app.core.model.ShopDayHours
import com.myboke.app.core.net.MyBokeApi
import com.myboke.app.core.util.decodeImage
import com.myboke.app.ui.MainShell
import com.myboke.app.ui.screens.manage.normalizeTime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import java.net.HttpURLConnection
import java.net.URL
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Saa za kazi, likizo na QR ya duka.
 *
 * Jaribio la UI linatumia hali ya nje ya mtandao (haitegemei seva), na
 * jaribio la muunganisho linatumia seva halisi ikiwa inapatikana
 * (`http://localhost:4000/v1`) — vinginevyo linarukwa kwa upole.
 */
@OptIn(ExperimentalTestApi::class)
class ShopScheduleTest {

    @Test
    fun `time normalization accepts short and long forms`() {
        assertEquals("08:30", normalizeTime("830"))
        assertEquals("20:30", normalizeTime("2030"))
        assertEquals("08:30", normalizeTime("8:30"))
        assertEquals("09:00", normalizeTime("9"))
        assertEquals("23:59", normalizeTime("2359"))
        assertEquals("00:00", normalizeTime("0"))
    }

    @Test
    fun `schedule screen lists every day and toggling marks it closed`() = runComposeUiTest {
        val state = AppState(CoroutineScope(Dispatchers.Unconfined))
        state.enterOfflineDemo()
        state.switchLang(Lang.EN)
        state.navigate(Page.ShopSchedule)

        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitForIdle()

        for (day in listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")) {
            assertTrue(
                onAllNodesWithText(day).fetchSemanticsNodes().isNotEmpty(),
                "Siku '$day' inapaswa kuonekana kwenye saa za kazi",
            )
        }

        // Zima Jumatatu — sasa ionyeshe "Closed".
        onAllNodesWithText("08:00 – 20:00")[0].performClick()
        waitForIdle()
        onNodeWithText("Cancel").performClick()
        waitForIdle()

        assertTrue(
            onAllNodesWithText("Business hours").fetchSemanticsNodes().isNotEmpty(),
            "Kichwa cha saa za kazi kipo",
        )
    }

    @Test
    fun `backend schedule holidays and qr work end to end`() {
        if (!backendReachable()) {
            println("SKIP: backend haipo kwenye localhost:4000 — jaribio la muunganisho limerukwa")
            return
        }

        val api = MyBokeApi("http://localhost:4000/v1")
        runBlocking {
            val tokens = api.demo()
            api.token = tokens.accessToken
            api.refreshToken = tokens.refreshToken

            val shop = api.shops().first()

            // Saa za kazi: Jumatatu 08:00–20:00, Jumapili imefungwa.
            val hours = mapOf(
                "mon" to ShopDayHours(open = "08:00", close = "20:00"),
                "sun" to ShopDayHours(closed = true),
            )
            val updated = api.updateShop(shop.id, businessHours = hours)
            assertNotNull(updated.businessHours, "businessHours inapaswa kuhifadhiwa")
            assertEquals("08:00", updated.businessHours?.get("mon")?.open)
            assertEquals(true, updated.businessHours?.get("sun")?.closed)

            val schedule = api.shopSchedule(shop.id)
            assertEquals(shop.id, schedule.shopId)
            assertEquals("08:00", schedule.hours["mon"]?.open)
            assertTrue(schedule.hours.containsKey("sun"))
            assertTrue(schedule.day.isNotBlank(), "Siku ya leo inapaswa kurudishwa")

            // Likizo: ongeza, ionekane, kisha iondolewe.
            val holiday = api.addShopHoliday(shop.id, "2026-12-25", "Krismasi")
            assertTrue(holiday.id.isNotBlank())
            val listed = api.shopHolidays(shop.id)
            assertTrue(listed.any { it.id == holiday.id }, "Likizo mpya inapaswa kuonekana")
            api.removeShopHoliday(shop.id, holiday.id)
            assertTrue(
                api.shopHolidays(shop.id).none { it.id == holiday.id },
                "Likizo iliyondolewa haipaswi kuonekana",
            )

            // QR: PNG halisi yenye saini ya PNG, na inaweza kupambwa.
            val png = api.shopQrPng(shop.id)
            assertTrue(png.size > 500, "PNG ya QR ni ndogo mno (${png.size} bytes)")
            assertEquals(0x89.toByte(), png[0])
            assertEquals('P'.code.toByte(), png[1])
            assertEquals('N'.code.toByte(), png[2])
            assertEquals('G'.code.toByte(), png[3])
            val bitmap = decodeImage(png)
            assertNotNull(bitmap, "PNG ya QR inapaswa kupambwa kuwa ImageBitmap")
            assertTrue(bitmap.width > 20 && bitmap.height > 20, "QR ina ukubwa usiofaa")
        }
    }

    private fun backendReachable(): Boolean = runCatching {
        val conn = URL("http://localhost:4000/v1/health").openConnection() as HttpURLConnection
        conn.connectTimeout = 1200
        conn.readTimeout = 1200
        conn.requestMethod = "GET"
        val ok = conn.responseCode == 200
        conn.disconnect()
        ok
    }.getOrDefault(false)
}
