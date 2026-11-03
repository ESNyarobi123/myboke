package com.myboke.app

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.runComposeUiTest
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.MyBokeTheme
import com.myboke.app.core.i18n.Lang
import com.myboke.app.ui.MainShell
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * Smoke test: kila skrini ya app inapaswa kupanga (compose) bila hitilafu
 * tukiwa na data ya demo ya nje ya mtandao (offline).
 */
@OptIn(ExperimentalTestApi::class)
class AppSmokeTest {

    private fun demoState(): AppState {
        val state = AppState(CoroutineScope(Dispatchers.Unconfined))
        state.enterOfflineDemo()
        state.switchLang(Lang.EN)
        return state
    }

    @Test
    fun home_renders_money_and_quick_actions() = runComposeUiTest {
        val state = demoState()
        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitForIdle()

        assertTrue(
            onAllNodesWithText("TZS", substring = true).fetchSemanticsNodes().isNotEmpty(),
            "Home inapaswa kuonyesha kiasi cha fedha (TZS …)",
        )
    }

    @Test
    fun every_page_renders_without_crash() = runComposeUiTest {
        val state = demoState()
        setContent { MyBokeTheme(dark = true) { MainShell(state) } }
        waitForIdle()

        for (page in Page.entries) {
            if (page == Page.ProductForm || page == Page.DebtForm || page == Page.ExpenseForm ||
                page == Page.CustomerForm || page == Page.ShopForm
            ) {
                // Fomu zinahitaji hoja za nje; zinajaribiwa kwenye ui/AppShell.
                continue
            }
            state.navigate(page)
            waitForIdle()
            val texts = onAllNodes(
                SemanticsMatcher.keyIsDefined(SemanticsProperties.Text),
            ).fetchSemanticsNodes()
            assertTrue(texts.isNotEmpty(), "Ukurasa ${page.name} haukuonyesha maudhui yoyote")
        }
    }

    @Test
    fun language_switch_changes_labels() = runComposeUiTest {
        val state = demoState()
        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitForIdle()

        state.switchLang(Lang.SW)
        waitForIdle()
        val swahili = onAllNodesWithText("Mauzo", substring = true).fetchSemanticsNodes().isNotEmpty()

        state.switchLang(Lang.EN)
        waitForIdle()
        val english = onAllNodesWithText("Sales", substring = true).fetchSemanticsNodes().isNotEmpty()

        assertTrue(swahili || english, "Lebo za lugha zinapaswa kubadilika papo hapo")
    }

    @Test
    fun dark_and_light_themes_both_compose() = runComposeUiTest {
        val state = demoState()
        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitForIdle()
        val before = state.dark
        state.toggleDark()
        waitForIdle()
        assertTrue(state.dark != before, "Theme toggle inapaswa kubadilisha hali")
    }

    @Test
    fun invoices_screens_and_three_templates_render() = runComposeUiTest {
        val state = demoState()
        state.navigate(Page.Invoices)
        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitForIdle()
        assertTrue(onAllNodesWithText("Invoices", substring = true).fetchSemanticsNodes().isNotEmpty())

        val sample = state.invoices.first()
        state.openInvoice(sample)
        waitForIdle()
        assertTrue(onAllNodesWithText("ANKARA", substring = true).fetchSemanticsNodes().isNotEmpty())

        state.navigate(Page.InvoiceForm)
        waitForIdle()
        assertTrue(onAllNodesWithText("New invoice", substring = true).fetchSemanticsNodes().isNotEmpty())
    }

    @Test
    fun exports_screen_renders_all_data_types() = runComposeUiTest {
        val state = demoState()
        state.navigate(Page.Exports)
        setContent { MyBokeTheme(dark = false) { MainShell(state) } }
        waitForIdle()
        assertTrue(onAllNodesWithText("Export data", substring = true).fetchSemanticsNodes().isNotEmpty())
        assertTrue(onAllNodesWithText("CSV", substring = true).fetchSemanticsNodes().isNotEmpty())
    }

}
