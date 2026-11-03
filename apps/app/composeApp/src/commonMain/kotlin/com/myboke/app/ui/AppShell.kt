package com.myboke.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.data.Tab
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTheme
import com.myboke.app.ui.screens.home.HomeScreen
import com.myboke.app.ui.screens.manage.CustomerFormScreen
import com.myboke.app.ui.screens.manage.DebtFormScreen
import com.myboke.app.ui.screens.manage.ExpenseFormScreen
import com.myboke.app.ui.screens.manage.ExpensesScreen
import com.myboke.app.ui.screens.manage.GrowthScreen
import com.myboke.app.ui.screens.manage.ReceiptScreen
import com.myboke.app.ui.screens.manage.ShopScheduleScreen
import com.myboke.app.ui.screens.manage.ShopsScreen
import com.myboke.app.ui.screens.more.AssistantScreen
import com.myboke.app.ui.screens.more.BackupScreen
import com.myboke.app.ui.screens.more.MoreScreen
import com.myboke.app.ui.screens.more.NotificationsScreen
import com.myboke.app.ui.screens.more.ProfileScreen
import com.myboke.app.ui.screens.people.CustomerDetailScreen
import com.myboke.app.ui.screens.people.PeopleScreen
import com.myboke.app.ui.screens.pos.PosScreen
import com.myboke.app.ui.screens.products.ProductFormScreen
import com.myboke.app.ui.screens.invoices.InvoiceDetailScreen
import com.myboke.app.ui.screens.invoices.InvoiceFormScreen
import com.myboke.app.ui.screens.invoices.InvoicesScreen
import com.myboke.app.ui.screens.more.ExportsScreen
import com.myboke.app.ui.screens.products.ProductsScreen
import com.myboke.app.ui.screens.reports.ReportsScreen

@Composable
fun MainShell(state: AppState) {
    val c = MbTheme.colors
    val showNav = state.page.parent == null

    Column(
        Modifier
            .fillMaxSize()
            .background(c.bg)
            .windowInsetsPadding(WindowInsets.statusBars),
    ) {
        Box(Modifier.weight(1f)) {
            AnimatedContent(
                targetState = state.page,
                transitionSpec = {
                    (fadeIn(tween(180)) + slideInHorizontally(tween(180)) { it / 24 })
                        .togetherWith(fadeOut(tween(120)))
                },
                label = "page",
            ) { page ->
                when (page) {
                    Page.Home -> HomeScreen(state)
                    Page.Sell -> PosScreen(state)
                    Page.Reports -> ReportsScreen(state)
                    Page.People -> PeopleScreen(state)
                    Page.More -> MoreScreen(state)
                    Page.Products -> ProductsScreen(state)
                    Page.ProductForm -> ProductFormScreen(state)
                    Page.Shops -> ShopsScreen(state)
                    Page.ShopSchedule -> ShopScheduleScreen(state)
                    Page.ShopForm -> ShopsScreen(state)
                    Page.Debts -> PeopleScreen(state, startOnDebts = true)
                    Page.DebtForm -> DebtFormScreen(state)
                    Page.Expenses -> ExpensesScreen(state)
                    Page.ExpenseForm -> ExpenseFormScreen(state)
                    Page.CustomerForm -> CustomerFormScreen(state)
                    Page.CustomerDetail -> CustomerDetailScreen(state)
                    Page.Growth -> GrowthScreen(state)
                    Page.Settings -> MoreScreen(state)
                    Page.Profile -> ProfileScreen(state)
                    Page.Assistant -> AssistantScreen(state)
                    Page.Notifications -> NotificationsScreen(state)
                    Page.Receipt -> ReceiptScreen(state)
                    Page.SyncIssues -> BackupScreen(state)
                    Page.Backup -> BackupScreen(state)
                    Page.Invoices -> InvoicesScreen(state)
                    Page.InvoiceForm -> InvoiceFormScreen(state)
                    Page.InvoiceDetail -> InvoiceDetailScreen(state)
                    Page.Exports -> ExportsScreen(state)
                }
            }
        }

        if (showNav) {
            BottomNav(state)
        }
    }
}

@Composable
private fun BottomNav(state: AppState) {
    val c = MbTheme.colors
    val t = state.t

    Box {
        Row(
            Modifier
                .fillMaxWidth()
                .background(c.surface)
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(top = 8.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NavItem(MbIcon.Home, t.navHome, state.page.tab == Tab.Home) { state.selectTab(Tab.Home) }
            NavItem(MbIcon.Chart, t.navReports, state.page.tab == Tab.Reports) { state.selectTab(Tab.Reports) }
            // nafasi kwa FAB
            Spacer(Modifier.width(60.dp))
            NavItem(MbIcon.Users, t.navPeople, state.page.tab == Tab.People) { state.selectTab(Tab.People) }
            NavItem(MbIcon.Menu, t.navMore, state.page.tab == Tab.More) { state.selectTab(Tab.More) }
        }

        // Sell FAB
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-16).dp)
                .size(58.dp)
                .shadow(10.dp, CircleShape)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        listOf(Color(0xFF0269E9), Color(0xFF0B37A1)),
                    ),
                )
                .clickable { state.selectTab(Tab.Sell) },
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                MbIconView(MbIcon.Cart, size = 23.dp, tint = Color.White)
            }
            if (state.cart.isNotEmpty()) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 6.dp, end = 6.dp)
                        .size(17.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF73D31C)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${state.cartCount}",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = Color(0xFF072B7A),
                    )
                }
            }
        }
    }
}

@Composable
private fun NavItem(icon: MbIcon, label: String, active: Boolean, onClick: () -> Unit) {
    val c = MbTheme.colors
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 2.dp),
    ) {
        MbIconView(
            icon,
            size = 21.dp,
            tint = if (active) c.primary else c.textMuted,
        )
        Spacer(Modifier.height(3.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            color = if (active) c.primary else c.textMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
        Box(
            Modifier
                .size(width = 16.dp, height = 2.dp)
                .clip(CircleShape)
                .background(if (active) c.primary else Color.Transparent),
        )
    }
}
