package com.myboke.app.ui.screens.more

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.Avatar
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.DividerLine
import com.myboke.app.core.design.EmptyState
import com.myboke.app.core.design.GradientCard
import com.myboke.app.core.design.LanguagePickerOverlay
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MbTopBar
import com.myboke.app.core.design.MoneyText
import com.myboke.app.core.design.SectionHeader
import com.myboke.app.core.design.SettingRow
import com.myboke.app.ui.screens.auth.PinSetupDialog
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.i18n.Lang
import com.myboke.app.core.util.Dates
import com.myboke.app.core.util.Money

@Composable
fun MoreScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var showLang by remember { mutableStateOf(false) }
    var showServer by remember { mutableStateOf(false) }
    var showPin by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
            // ── Profile header ──────────────────────────────
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(listOf(Color(0xFF071B4D), Color(0xFF0B37A1), Color(0xFF0269E9))),
                    )
                    .padding(horizontal = 18.dp, vertical = 18.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(state.userName.ifBlank { "MyBoke" }, size = 52.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            state.userName.ifBlank { state.businessName },
                            style = MaterialTheme.typography.headlineSmall,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            "${state.businessName} · ${state.role}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.75f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.White.copy(alpha = 0.16f))
                            .clickable { state.navigate(Page.Profile) }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                t.plan,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White,
                            )
                            Spacer(Modifier.width(3.dp))
                            MbIconView(MbIcon.ChevronRight, size = 12.dp, tint = Color.White)
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.White.copy(alpha = 0.12f))
                        .clickable { state.navigate(Page.Growth) }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MbIconView(MbIcon.Coins, size = 18.dp, tint = Color(0xFFFDE68A))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${state.coins.balance} BokeCoins",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "${t.streaks}: 3",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.78f),
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // ── Feature grid ────────────────────────────────
            val features = listOf(
                Triple(MbIcon.Doc, t.inv.title, Page.Invoices),
                Triple(MbIcon.Box, t.productsTitle, Page.Products),
                Triple(MbIcon.Store, t.shops, Page.Shops),
                Triple(MbIcon.Wallet, t.expensesTitle, Page.Expenses),
                Triple(MbIcon.Coins, t.debtsTitle, Page.Debts),
                Triple(MbIcon.Download, t.inv.exportData, Page.Exports),
                Triple(MbIcon.Gift, t.coins, Page.Growth),
                Triple(MbIcon.Sparkles, t.assistant, Page.Assistant),
                Triple(MbIcon.Chart, t.reports, Page.Reports),
                Triple(MbIcon.Users, t.customers, Page.People),
                Triple(MbIcon.Shield, t.backup, Page.Backup),
                Triple(MbIcon.Bell, t.notifications, Page.Notifications),
            )
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                features.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { (icon, label, page) ->
                            FeatureTile(icon, label, Modifier.weight(1f)) { state.navigate(page) }
                        }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            SectionHeader(t.settings, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(8.dp))

            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), padding = 0.dp) {
                SettingRow(
                    icon = MbIcon.Globe,
                    title = t.language,
                    subtitle = "${state.lang.nativeName} · ${state.lang.englishName}",
                    trailing = state.lang.badge,
                ) { showLang = true }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Settings,
                    title = t.server,
                    subtitle = state.apiBaseUrl.removePrefix("https://").removePrefix("http://"),
                    trailing = if (state.offlineMode) "OFFLINE" else null,
                    iconBg = c.surface2,
                    iconTint = c.textSecondary,
                ) { showServer = true }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Lock,
                    title = t.auth.appLock,
                    subtitle = if (state.pinSet) t.auth.appLockOn else t.auth.appLockOff,
                    trailing = if (state.pinSet) t.auth.changePin else null,
                    iconBg = if (state.pinSet) c.successBg else c.surface2,
                    iconTint = if (state.pinSet) c.successText() else c.textSecondary,
                ) {
                    showPin = true
                }
                if (state.pinSet) {
                    DividerLine(Modifier.padding(horizontal = 16.dp))
                    SettingRow(
                        icon = MbIcon.Shield,
                        title = t.auth.lockNow,
                        iconBg = c.warning.copy(alpha = 0.12f),
                        iconTint = c.warning,
                    ) { state.lockNow() }
                }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Moon,
                    title = t.darkMode,
                    trailing = if (state.dark) "ON" else "OFF",
                    iconBg = c.surface2,
                    iconTint = c.textSecondary,
                ) { state.toggleDark() }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Bell,
                    title = t.notifications,
                    trailing = "${state.unreadCount}",
                ) { state.navigate(Page.Notifications) }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Download,
                    title = t.backup,
                    subtitle = if (state.offlineMode) t.offlineTitle else t.inv.exportData,
                ) { state.navigate(Page.Backup) }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Shield,
                    title = t.auditLog,
                    iconBg = c.infoBg,
                    iconTint = c.infoText(),
                ) { state.showSnack(t.auditLog) }
            }

            Spacer(Modifier.height(12.dp))
            MbCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), padding = 0.dp) {
                SettingRow(
                    icon = MbIcon.Card,
                    title = t.subscription,
                    subtitle = "${t.plan} · ${t.shops}: 1",
                ) { state.navigate(Page.Profile) }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Doc,
                    title = t.about,
                    subtitle = "MyBoke 1.0.0",
                ) { state.showSnack("MyBoke 1.0.0 · myboke.co.tz") }
                DividerLine(Modifier.padding(horizontal = 16.dp))
                SettingRow(
                    icon = MbIcon.Phone,
                    title = t.help,
                    subtitle = "support@myboke.co.tz",
                ) { state.showSnack("support@myboke.co.tz") }
            }

            Spacer(Modifier.height(14.dp))
            Box(Modifier.padding(horizontal = 16.dp)) {
                MbButton(
                    t.logout,
                    { state.logout() },
                    style = MbButtonStyle.Secondary,
                    icon = MbIcon.Logout,
                    fullWidth = true,
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "MyBoke 1.0.0 · © ${Dates.isoDate(Dates.now()).take(4)}",
                style = MaterialTheme.typography.labelSmall,
                color = c.textMuted,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(30.dp))
        }
    }

    if (showLang) {
        LanguagePickerOverlay(
            current = state.lang,
            title = t.auth.languageTitle,
            subtitle = t.auth.languageSub,
            cancelLabel = t.cancel,
            onPick = {
                state.switchLang(it)
                showLang = false
            },
            onDismiss = { showLang = false },
        )
    }

    if (showServer) {
        ServerDialog(state = state, onClose = { showServer = false })
    }

    if (showPin) {
        PinSetupDialog(state = state, onClose = { showPin = false })
    }
}

/**
 * Kusanidi seva ya API. Ni muhimu kwa kifaa halisi kinachotumia Wi-Fi moja
 * na kompyuta inayoendesha backend (mf. `http://192.168.1.5:4000/v1`).
 */
@Composable
private fun ServerDialog(state: AppState, onClose: () -> Unit) {
    val t = state.t
    val c = MbTheme.colors
    var value by remember { mutableStateOf(state.apiBaseUrl) }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.45f))
            .clickable(onClick = onClose),
        contentAlignment = Alignment.Center,
    ) {
        MbCard(Modifier.fillMaxWidth().padding(horizontal = 22.dp), padding = 18.dp) {
            Text(t.server, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
            Spacer(Modifier.height(4.dp))
            Text(t.serverHint, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
            Spacer(Modifier.height(12.dp))
            MbTextField(
                value,
                { value = it },
                t.server,
                placeholder = "https://api.myboke.co.tz/v1",
                keyboardType = KeyboardType.Uri,
            )
            Spacer(Modifier.height(14.dp))
            MbButton(
                t.save,
                onClick = {
                    state.setApiBase(value)
                    onClose()
                    state.showSnack(t.serverSaved)
                },
                fullWidth = true,
                height = 46.dp,
            )
            Spacer(Modifier.height(8.dp))
            MbButton(
                t.serverReset,
                onClick = {
                    state.setApiBase("")
                    onClose()
                    state.showSnack(t.serverResetDone)
                },
                style = MbButtonStyle.Secondary,
                fullWidth = true,
                height = 44.dp,
            )
            Spacer(Modifier.height(6.dp))
            MbButton(t.cancel, onClick = onClose, style = MbButtonStyle.Ghost, fullWidth = true, height = 42.dp)
        }
    }
}

@Composable
private fun FeatureTile(icon: MbIcon, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = MbTheme.colors
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(c.surface)
            .border(1.dp, c.border, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(c.primary.copy(alpha = 0.08f)),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(icon, size = 19.dp, tint = c.primary)
        }
        Spacer(Modifier.height(7.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = c.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Mipangilio
// ─────────────────────────────────────────────────────────────

@Composable
fun SettingsScreen(state: AppState) = MoreScreen(state)

@Composable
fun ProfileScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 600.dp).fillMaxWidth()) {
            MbTopBar(t.profile, onBack = { state.back() })
            Column(Modifier.padding(horizontal = 16.dp)) {
                MbCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(state.userName.ifBlank { "MyBoke" }, size = 58.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                state.userName.ifBlank { "Mfanyabiashara" },
                                style = MaterialTheme.typography.headlineSmall,
                                color = c.textPrimary,
                            )
                            Text(
                                state.businessName,
                                style = MaterialTheme.typography.bodySmall,
                                color = c.textMuted,
                            )
                        }
                        StatusPill(state.role, BadgeTone.Brand)
                    }
                    Spacer(Modifier.height(14.dp))
                    DividerLine()
                    Spacer(Modifier.height(12.dp))
                    ProfileLine(t.shops, "${state.shops.size}")
                    ProfileLine(t.staff, "2")
                    ProfileLine(t.plan, "Bure (Free)")
                    ProfileLine(t.version, "1.0.0")
                }

                Spacer(Modifier.height(14.dp))
                GradientCard(
                    colors = listOf(Color(0xFF16A760), Color(0xFF0A9CBF)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MbIconView(MbIcon.Gift, size = 22.dp, tint = Color.White)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Panda Growth",
                                style = MaterialTheme.typography.titleLarge,
                                color = Color.White,
                            )
                            Text(
                                "Maduka 3 · Wauzaji 10 · Analytics",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.85f),
                            )
                        }
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.White)
                                .padding(horizontal = 12.dp, vertical = 7.dp),
                        ) {
                            Text(
                                "25,000/mwezi",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color(0xFF0E8A50),
                            )
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))
                MbCard(Modifier.fillMaxWidth(), padding = 0.dp) {
                    SettingRow(MbIcon.User, t.profile, subtitle = state.userName) { }
                    DividerLine(Modifier.padding(horizontal = 16.dp))
                    SettingRow(MbIcon.Store, t.shops, subtitle = "${state.shops.size}") { state.navigate(Page.Shops) }
                    DividerLine(Modifier.padding(horizontal = 16.dp))
                    SettingRow(MbIcon.Users, t.staff, subtitle = "2 wauzaji") { }
                }

                Spacer(Modifier.height(16.dp))
                MbButton(
                    t.logout,
                    { state.logout() },
                    style = MbButtonStyle.Secondary,
                    icon = MbIcon.Logout,
                    fullWidth = true,
                )
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
private fun ProfileLine(label: String, value: String) {
    val c = MbTheme.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = c.textMuted)
        Spacer(Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
    }
}

// ─────────────────────────────────────────────────────────────
// Taarifa
// ─────────────────────────────────────────────────────────────

@Composable
fun NotificationsScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 600.dp).fillMaxWidth()) {
            MbTopBar(t.notifications, onBack = { state.back() }) {
                if (state.notifications.isNotEmpty()) {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(9.dp))
                            .background(c.primary.copy(alpha = 0.1f))
                            .clickable { state.markNotificationsRead() }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    ) {
                        Text(t.done, style = MaterialTheme.typography.labelSmall, color = c.primary)
                    }
                }
            }
            if (state.notifications.isEmpty()) {
                EmptyState(
                    icon = MbIcon.Bell,
                    title = t.notifications,
                    body = t.alertNone,
                )
            } else {
                state.notifications.forEach { notification ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(c.surface)
                            .padding(13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(
                                when (notification.type) {
                                    "DEBT" -> c.dangerBg
                                    "STOCK" -> c.warningBg
                                    else -> c.infoBg
                                },
                            ),
                            contentAlignment = Alignment.Center,
                        ) {
                            MbIconView(
                                when (notification.type) {
                                    "DEBT" -> MbIcon.Coins
                                    "STOCK" -> MbIcon.Box
                                    else -> MbIcon.Target
                                },
                                size = 18.dp,
                                tint = when (notification.type) {
                                    "DEBT" -> c.dangerText()
                                    "STOCK" -> c.warningText()
                                    else -> c.infoText()
                                },
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(notification.title, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
                            Text(
                                notification.body,
                                style = MaterialTheme.typography.bodySmall,
                                color = c.textMuted,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        if (notification.readAt == null) {
                            Box(Modifier.size(7.dp).clip(CircleShape).background(c.primary))
                        }
                    }
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Msaidizi (AI)
// ─────────────────────────────────────────────────────────────

@Composable
fun AssistantScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var question by remember { mutableStateOf("") }

    val suggestions = listOf(
        "Faida yangu leo ni ngapi?",
        "Nani anadaiwa zaidi?",
        "Bidhaa gani inapaswa kuongeza stock?",
        "Nifanye nini kuongeza mauzo?",
    )

    Column(Modifier.fillMaxSize()) {
        MbTopBar(t.assistant, onBack = { state.back() })

        Column(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth()) {
                GradientCard(
                    colors = listOf(Color(0xFF0B37A1), Color(0xFF0269E9), Color(0xFF0A9CBF)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(42.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.16f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            MbIconView(MbIcon.Sparkles, size = 22.dp, tint = Color.White)
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("MyBoke AI", style = MaterialTheme.typography.titleLarge, color = Color.White)
                            Text(
                                "Anajua mauzo, madeni na stock yako",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.8f),
                            )
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))

                if (state.assistantAnswer == null && !state.assistantLoading) {
                    Text(
                        "Uliza kitu chochote kuhusu biashara yako",
                        style = MaterialTheme.typography.bodyMedium,
                        color = c.textMuted,
                    )
                    Spacer(Modifier.height(10.dp))
                    suggestions.forEach { suggestion ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(c.surface)
                                .border(1.dp, c.border, RoundedCornerShape(12.dp))
                                .clickable { state.askAssistant(suggestion) }
                                .padding(horizontal = 12.dp, vertical = 11.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            MbIconView(MbIcon.Sparkles, size = 14.dp, tint = c.primary)
                            Spacer(Modifier.width(8.dp))
                            Text(suggestion, style = MaterialTheme.typography.bodyMedium, color = c.textPrimary)
                        }
                    }
                }

                if (state.assistantLoading) {
                    Spacer(Modifier.height(16.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MbIconView(MbIcon.Sparkles, size = 16.dp, tint = c.primary)
                        Spacer(Modifier.width(8.dp))
                        Text(t.loading, style = MaterialTheme.typography.bodyMedium, color = c.textMuted)
                    }
                }

                state.assistantAnswer?.let { answer ->
                    Spacer(Modifier.height(14.dp))
                    MbCard(Modifier.fillMaxWidth(), background = c.surface) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(28.dp).clip(CircleShape).background(c.primary.copy(alpha = 0.1f)),
                                contentAlignment = Alignment.Center,
                            ) {
                                MbIconView(MbIcon.Sparkles, size = 15.dp, tint = c.primary)
                            }
                            Spacer(Modifier.width(8.dp))
                            Text("MyBoke AI", style = MaterialTheme.typography.labelLarge, color = c.primary)
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(answer, style = MaterialTheme.typography.bodyLarge, color = c.textPrimary)
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }

        Row(
            Modifier
                .fillMaxWidth()
                .background(c.surface)
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                MbTextField(
                    question, { question = it },
                    "Uliza…",
                    keyboardType = KeyboardType.Text,
                )
            }
            Spacer(Modifier.width(8.dp))
            MbIconButton(
                MbIcon.Send,
                onClick = {
                    if (question.isNotBlank()) {
                        state.askAssistant(question)
                        question = ""
                    }
                },
                tint = c.onPrimary,
                background = c.primary,
                size = 48.dp,
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Backup
// ─────────────────────────────────────────────────────────────

@Composable
fun BackupScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
            MbTopBar(t.backup, onBack = { state.back() })
            Column(Modifier.padding(horizontal = 16.dp)) {
                GradientCard(
                    colors = listOf(Color(0xFF0B37A1), Color(0xFF0269E9)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    MbIconView(MbIcon.Shield, size = 26.dp, tint = Color.White)
                    Spacer(Modifier.height(10.dp))
                    Text("Data yako iko salama", style = MaterialTheme.typography.titleLarge, color = Color.White)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Pakua backup ya JSON au rejesha kutoka faili",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.82f),
                    )
                }
                Spacer(Modifier.height(14.dp))
                MbButton(
                    t.exportProducts,
                    { state.showSnack("Backup JSON") },
                    icon = MbIcon.Download,
                    fullWidth = true,
                )
                Spacer(Modifier.height(8.dp))
                MbButton(
                    "Rejesha backup",
                    { state.showSnack("Restore") },
                    style = MbButtonStyle.Secondary,
                    icon = MbIcon.Refresh,
                    fullWidth = true,
                )
                Spacer(Modifier.height(14.dp))
                MbCard(Modifier.fillMaxWidth()) {
                    Text(
                        if (state.offlineMode) t.offlineBody else t.synced,
                        style = MaterialTheme.typography.bodyMedium,
                        color = c.textSecondary,
                    )
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}
