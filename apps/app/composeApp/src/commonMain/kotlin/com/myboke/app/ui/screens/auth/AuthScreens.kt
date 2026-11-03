package com.myboke.app.ui.screens.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.design.CountryPickerOverlay
import com.myboke.app.core.design.LanguagePill
import com.myboke.app.core.design.LanguagePickerOverlay
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbChip
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbPhoneField
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MyBokeMark
import com.myboke.app.core.design.MyBokeWordmark
import com.myboke.app.core.i18n.Strings
import com.myboke.app.core.util.Country
import com.myboke.app.core.util.Phone

private val AuthGradient = listOf(
    Color(0xFF04122F),
    Color(0xFF071B4D),
    Color(0xFF0B37A1),
    Color(0xFF0269E9),
)
private val Accent = Color(0xFF34E0A1)

// ─────────────────────────────────────────────────────────────
// Mandhari ya auth (gradient + miviringo laini)
// ─────────────────────────────────────────────────────────────

@Composable
private fun AuthBackdrop() {
    Canvas(Modifier.fillMaxSize()) {
        drawRect(Brush.linearGradient(AuthGradient, Offset.Zero, Offset(size.width, size.height)))
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Color(0xFF16D3E8).copy(alpha = 0.22f), Color.Transparent),
                center = Offset(size.width * 0.9f, size.height * 0.05f),
                radius = size.minDimension * 0.7f,
            ),
            radius = size.minDimension * 0.7f,
            center = Offset(size.width * 0.9f, size.height * 0.05f),
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Accent.copy(alpha = 0.16f), Color.Transparent),
                center = Offset(size.width * 0.05f, size.height * 0.95f),
                radius = size.minDimension * 0.6f,
            ),
            radius = size.minDimension * 0.6f,
            center = Offset(size.width * 0.05f, size.height * 0.95f),
        )
    }
}

// ─────────────────────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────────────────────

@Composable
fun OnboardingScreen(state: AppState) {
    val t = state.t
    var step by remember { mutableStateOf(1) }
    var businessName by remember { mutableStateOf("") }
    var businessType by remember { mutableStateOf(0) }
    var shopName by remember { mutableStateOf("") }
    var place by remember { mutableStateOf("") }
    var productName by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("10") }
    var showLang by remember { mutableStateOf(false) }

    val types = listOf(
        t.businessTypeFood,
        t.businessTypeCosmetics,
        t.businessTypeClothes,
        t.businessTypeHardware,
        t.businessTypeOther,
    )

    Box(Modifier.fillMaxSize()) {
        AuthBackdrop()
        Column(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .imePadding()
                .padding(horizontal = 22.dp, vertical = 6.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (step > 1) {
                    MbIconButton(
                        icon = MbIcon.ChevronLeft,
                        onClick = { step -= 1 },
                        tint = Color.White,
                        background = Color.White.copy(alpha = 0.12f),
                        size = 36.dp,
                    )
                    Spacer(Modifier.width(8.dp))
                }
                MyBokeMark(size = 26.dp)
                Spacer(Modifier.width(8.dp))
                MyBokeWordmark(size = 19.dp)
                Spacer(Modifier.weight(1f))
                LanguagePill(current = state.lang, onClick = { showLang = true })
            }

            Spacer(Modifier.height(22.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(4) { i ->
                    Box(
                        Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(CircleShape)
                            .background(if (i < step) Accent else Color.White.copy(alpha = 0.2f)),
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "$step/4",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.6f),
            )

            Spacer(Modifier.height(24.dp))

            AnimatedContent(
                targetState = step,
                transitionSpec = {
                    (fadeIn(tween(240)) + slideInVertically(tween(240)) { it / 14 })
                        .togetherWith(fadeOut(tween(140)))
                },
                label = "onbStep",
                modifier = Modifier.weight(1f),
            ) { current ->
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                    when (current) {
                        1 -> WelcomeStep(t)
                        2 -> BusinessStep(t, businessName, { businessName = it }, types, businessType) { businessType = it }
                        3 -> ShopStep(t, shopName, { shopName = it }, place, { place = it })
                        else -> ProductStep(
                            t,
                            productName, { productName = it },
                            price, { price = it },
                            stock, { stock = it },
                        )
                    }
                    Spacer(Modifier.height(20.dp))
                }
            }

            Spacer(Modifier.height(12.dp))
            MbButton(
                text = when (step) {
                    1 -> t.getStarted
                    4 -> t.onbFinish
                    else -> t.next
                },
                onClick = {
                    if (step < 4) step += 1 else state.completeOnboarding()
                },
                enabled = when (step) {
                    2 -> businessName.trim().length >= 2
                    else -> true
                },
                style = MbButtonStyle.Success,
                fullWidth = true,
                height = 56.dp,
                icon = if (step == 1) null else MbIcon.ArrowRight,
            )
            if (step == 1) {
                Spacer(Modifier.height(8.dp))
                Box(
                    Modifier.fillMaxWidth().clickable { state.completeOnboarding() }.padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        t.skip,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.75f),
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
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
}

@Composable
private fun WelcomeStep(t: Strings) {
    Column {
        Box(
            Modifier
                .size(78.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.White.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            MyBokeMark(size = 46.dp)
        }
        Spacer(Modifier.height(24.dp))
        Text(t.onbTitle1, style = MaterialTheme.typography.displayMedium, color = Color.White)
        Spacer(Modifier.height(10.dp))
        Text(t.welcomeSub, style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.78f))
        Spacer(Modifier.height(26.dp))
        listOf(
            MbIcon.Cart to t.auth.onbFeature1,
            MbIcon.Users to t.auth.onbFeature2,
            MbIcon.Coins to t.auth.onbFeature3,
        ).forEach { (icon, label) ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 7.dp),
            ) {
                Box(
                    Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(11.dp))
                        .background(Color.White.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center,
                ) {
                    MbIconView(icon, size = 18.dp, tint = Color.White)
                }
                Spacer(Modifier.width(12.dp))
                Text(label, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.9f))
            }
        }
    }
}

@Composable
private fun BusinessStep(
    t: Strings,
    name: String,
    onName: (String) -> Unit,
    types: List<String>,
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    Column {
        Text(t.auth.onbBusinessTitle, style = MaterialTheme.typography.headlineMedium, color = Color.White)
        Spacer(Modifier.height(6.dp))
        Text(t.auth.onbBusinessSub, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f))
        Spacer(Modifier.height(20.dp))
        MbTextField(
            value = name,
            onValueChange = onName,
            label = t.auth.onbBusinessField,
            placeholder = t.auth.onbBusinessPlaceholder,
            leadingIcon = MbIcon.Store,
        )
        Spacer(Modifier.height(20.dp))
        Text(
            t.auth.onbTypeTitle,
            style = MaterialTheme.typography.labelLarge,
            color = Color.White.copy(alpha = 0.85f),
        )
        Spacer(Modifier.height(10.dp))
        types.forEachIndexed { index, label ->
            MbChip(
                text = label,
                selected = selected == index,
                onClick = { onSelect(index) },
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            )
        }
    }
}

@Composable
private fun ShopStep(
    t: Strings,
    name: String,
    onName: (String) -> Unit,
    place: String,
    onPlace: (String) -> Unit,
) {
    Column {
        Text(t.auth.onbShopTitle, style = MaterialTheme.typography.headlineMedium, color = Color.White)
        Spacer(Modifier.height(6.dp))
        Text(t.auth.onbShopSub, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f))
        Spacer(Modifier.height(20.dp))
        MbTextField(name, onName, t.auth.onbShopField, leadingIcon = MbIcon.Store)
        Spacer(Modifier.height(14.dp))
        MbTextField(
            place,
            onPlace,
            t.auth.onbShopPlaceField,
            placeholder = t.auth.onbShopPlacePlaceholder,
        )
    }
}

@Composable
private fun ProductStep(
    t: Strings,
    name: String,
    onName: (String) -> Unit,
    price: String,
    onPrice: (String) -> Unit,
    stock: String,
    onStock: (String) -> Unit,
) {
    Column {
        Text(t.auth.onbProductTitle, style = MaterialTheme.typography.headlineMedium, color = Color.White)
        Spacer(Modifier.height(6.dp))
        Text(t.auth.onbProductSub, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f))
        Spacer(Modifier.height(20.dp))
        MbTextField(
            name,
            onName,
            t.auth.onbProductField,
            placeholder = t.auth.onbProductPlaceholder,
            leadingIcon = MbIcon.Box,
        )
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f)) {
                MbTextField(
                    price, onPrice, t.sellingPrice,
                    keyboardType = KeyboardType.Decimal,
                    prefix = "TZS",
                )
            }
            Box(Modifier.weight(1f)) {
                MbTextField(stock, onStock, t.stock, keyboardType = KeyboardType.Number)
            }
        }
        Spacer(Modifier.height(20.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White.copy(alpha = 0.12f))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            MbIconView(MbIcon.Gift, size = 22.dp, tint = Accent)
            Spacer(Modifier.width(10.dp))
            Text(
                t.auth.onbCoinsHint,
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.9f),
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

private enum class PwStrength { None, Weak, Good, Strong }

/** Mfano wa namba ya simu kwa nchi iliyochaguliwa (`700 000 000`). */
private fun sampleNumber(country: Country): String {
    val lead = country.mobilePrefixes.first()
    val digits = lead + "0".repeat(country.nationalLength - 1)
    return digits.chunked(3).joinToString(" ")
}

private fun strengthOf(password: String): PwStrength {
    if (password.isEmpty()) return PwStrength.None
    var score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (password.any { it.isDigit() }) score++
    if (password.any { it.isUpperCase() } && password.any { it.isLowerCase() }) score++
    if (password.any { !it.isLetterOrDigit() }) score++
    return when {
        score >= 4 -> PwStrength.Strong
        score >= 2 -> PwStrength.Good
        else -> PwStrength.Weak
    }
}

/** Aina za hitilafu za fomu — hutafsiriwa wakati wa kuonyesha. */
private enum class AuthFieldError { Name, Phone, Business, Password, Identifier }

@Composable
fun AuthScreen(state: AppState) {
    val t = state.t
    var registerMode by remember { mutableStateOf(false) }
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var business by remember { mutableStateOf("") }
    // Hitilafu huhifadhiwa kama aina, si maandishi — hivyo hubadilika pamoja na lugha.
    var localError by remember { mutableStateOf<AuthFieldError?>(null) }
    var showLang by remember { mutableStateOf(false) }
    var forgotOpen by remember { mutableStateOf(false) }
    var country by remember { mutableStateOf(Country.default) }
    var showCountry by remember { mutableStateOf(false) }

    val strength = strengthOf(password)
    fun messageFor(kind: AuthFieldError): String = when (kind) {
        AuthFieldError.Name -> t.checkName
        AuthFieldError.Phone -> t.auth.phoneInvalid
        AuthFieldError.Business -> t.checkBusiness
        AuthFieldError.Password -> t.checkPassword
        AuthFieldError.Identifier -> t.checkIdentifier
    }

    val errorText = localError?.let { messageFor(it) } ?: state.authError

    /** Namba ya simu kwa muundo wa backend; barua pepe inabaki kama ilivyo. */
    fun loginIdentifier(): String {
        val raw = identifier.trim()
        if (!Phone.looksLikePhone(raw)) return raw
        val pick = Phone.guessCountry(raw) ?: country
        return Phone.forBackend(raw, pick)
    }

    fun validate(): AuthFieldError? {
        val raw = identifier.trim()
        return if (registerMode) {
            when {
                name.trim().length < 2 -> AuthFieldError.Name
                !Phone.isValid(raw, country) -> AuthFieldError.Phone
                business.trim().length < 2 -> AuthFieldError.Business
                password.length < 8 -> AuthFieldError.Password
                else -> null
            }
        } else {
            when {
                raw.isBlank() -> AuthFieldError.Identifier
                Phone.looksLikePhone(raw) && !raw.contains("@") &&
                    !Phone.isValid(raw, Phone.guessCountry(raw) ?: country) -> AuthFieldError.Phone
                password.isEmpty() -> AuthFieldError.Password
                else -> null
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        AuthBackdrop()
        Column(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 480.dp).fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MyBokeMark(size = 25.dp)
                    Spacer(Modifier.width(8.dp))
                    MyBokeWordmark(size = 18.dp)
                    Spacer(Modifier.weight(1f))
                    LanguagePill(current = state.lang, onClick = { showLang = true })
                }

                Spacer(Modifier.height(34.dp))
                Text(
                    if (registerMode) t.signUpTitle else t.signInTitle,
                    style = MaterialTheme.typography.displayMedium,
                    color = Color.White,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    if (registerMode) t.signUpSub else t.signInSub,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White.copy(alpha = 0.75f),
                )
                Spacer(Modifier.height(22.dp))

                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(MbTheme.colors.surface)
                        .padding(18.dp),
                ) {
                    AnimatedVisibility(registerMode, enter = fadeIn(tween(200)), exit = fadeOut(tween(120))) {
                        Column {
                            MbTextField(
                                name, { name = it; localError = null },
                                t.fullName,
                                leadingIcon = MbIcon.User,
                            )
                            Spacer(Modifier.height(12.dp))
                        }
                    }

                    if (registerMode) {
                        MbPhoneField(
                            identifier,
                            { value ->
                                identifier = value
                                localError = null
                            },
                            t.phoneNumber,
                            country = country,
                            onCountryClick = { showCountry = true },
                            placeholder = sampleNumber(country),
                        )
                    } else {
                        MbTextField(
                            identifier,
                            { value ->
                                identifier = value
                                localError = null
                            },
                            t.phoneOrEmail,
                            placeholder = "0712 345 678",
                            keyboardType = KeyboardType.Text,
                            leadingIcon = MbIcon.Phone,
                        )
                    }
                    Spacer(Modifier.height(12.dp))

                    AnimatedVisibility(registerMode, enter = fadeIn(tween(200)), exit = fadeOut(tween(120))) {
                        Column {
                            MbTextField(
                                business, { business = it; localError = null },
                                t.businessName,
                                leadingIcon = MbIcon.Store,
                            )
                            Spacer(Modifier.height(12.dp))
                        }
                    }

                    MbTextField(
                        password,
                        { password = it; localError = null },
                        t.password,
                        password = true,
                        imeAction = ImeAction.Done,
                    )

                    // Uimara wa neno la siri (register tu)
                    if (registerMode && password.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        val bars = when (strength) {
                            PwStrength.Weak -> 1
                            PwStrength.Good -> 2
                            PwStrength.Strong -> 3
                            PwStrength.None -> 0
                        }
                        val tone = when (strength) {
                            PwStrength.Weak -> MbTheme.colors.danger
                            PwStrength.Good -> MbTheme.colors.warning
                            PwStrength.Strong -> MbTheme.colors.success
                            PwStrength.None -> MbTheme.colors.border
                        }
                        val label = when (strength) {
                            PwStrength.Weak -> t.auth.passwordStrengthWeak
                            PwStrength.Good -> t.auth.passwordStrengthGood
                            PwStrength.Strong -> t.auth.passwordStrengthStrong
                            PwStrength.None -> ""
                        }
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                repeat(3) { i ->
                                    Box(
                                        Modifier
                                            .weight(1f)
                                            .height(4.dp)
                                            .clip(CircleShape)
                                            .background(
                                                if (i < bars) tone else MbTheme.colors.surface2,
                                            ),
                                    )
                                }
                            }
                            Spacer(Modifier.width(10.dp))
                            Text(
                                label,
                                style = MaterialTheme.typography.labelSmall,
                                color = tone,
                            )
                        }
                    }

                    if (!registerMode) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            t.forgotPassword,
                            style = MaterialTheme.typography.labelMedium,
                            color = MbTheme.colors.primary,
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .clickable { forgotOpen = true }
                                .padding(vertical = 2.dp),
                        )
                    }

                    AnimatedVisibility(errorText != null) {
                        Column {
                            Spacer(Modifier.height(12.dp))
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(MbTheme.colors.dangerBg)
                                    .padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                MbIconView(MbIcon.Warning, size = 15.dp, tint = MbTheme.colors.danger)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    errorText ?: "",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MbTheme.colors.dangerText(),
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(16.dp))
                    MbButton(
                        text = if (registerMode) t.createAccount else t.login,
                        onClick = {
                            val problem = validate()
                            localError = problem
                            if (problem != null) {
                                state.showAuthError(null)
                                return@MbButton
                            }
                            state.showAuthError(null)
                            if (registerMode) {
                                state.register(
                                    name = name.trim(),
                                    phone = Phone.forBackend(identifier, country),
                                    password = password,
                                    business = business.trim(),
                                    businessType = null,
                                )
                            } else {
                                state.login(loginIdentifier(), password)
                            }
                        },
                        loading = state.authLoading,
                        fullWidth = true,
                        height = 52.dp,
                    )
                    Spacer(Modifier.height(10.dp))
                    MbButton(
                        text = t.tryDemo,
                        onClick = { state.startDemo() },
                        style = MbButtonStyle.Secondary,
                        icon = MbIcon.Sparkles,
                        fullWidth = true,
                        height = 48.dp,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        t.demoHint,
                        style = MaterialTheme.typography.labelSmall,
                        color = MbTheme.colors.textMuted,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center,
                    )
                }

                Spacer(Modifier.height(16.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable {
                                registerMode = !registerMode
                                localError = null
                                state.showAuthError(null)
                            }
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            if (registerMode) t.haveAccount else t.noAccount,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            if (registerMode) t.login else t.register,
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = Accent,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        )
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
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

    if (showCountry) {
        CountryPickerOverlay(
            current = country,
            title = t.auth.countryTitle,
            subtitle = t.auth.countrySub,
            cancelLabel = t.cancel,
            onPick = {
                country = it
                localError = null
                showCountry = false
            },
            onDismiss = { showCountry = false },
        )
    }

    if (forgotOpen) {
        ForgotPasswordDialog(
            state = state,
            initialIdentifier = loginIdentifier(),
            onClose = { forgotOpen = false },
        )
    }
}

/**
 * Urejeshaji wa neno la siri kwa hatua mbili: (1) tuma msimbo, (2) msimbo + neno jipya.
 * Inatumia `POST /auth/password/forgot` na `POST /auth/password/reset`.
 */
@Composable
private fun ForgotPasswordDialog(
    state: AppState,
    initialIdentifier: String,
    onClose: () -> Unit,
) {
    val t = state.t
    val c = MbTheme.colors
    var identifier by remember { mutableStateOf(initialIdentifier) }
    var token by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var step by remember { mutableStateOf(1) }
    var sent by remember { mutableStateOf(false) }
    var devToken by remember { mutableStateOf<String?>(null) }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .clickable(onClick = onClose),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier
                .padding(22.dp)
                .widthIn(max = 460.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(c.surface)
                .clickable(enabled = false) {}
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(c.primary.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center,
                ) {
                    MbIconView(MbIcon.Lock, size = 19.dp, tint = c.primary)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.auth.forgotTitle, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
                    Text(t.auth.forgotSub, style = MaterialTheme.typography.bodySmall, color = c.textMuted)
                }
            }
            Spacer(Modifier.height(16.dp))

            if (step == 1) {
                MbTextField(
                    identifier, { identifier = it },
                    t.phoneOrEmail,
                    placeholder = "0712 345 678",
                    keyboardType = KeyboardType.Phone,
                    leadingIcon = MbIcon.Phone,
                )
                if (sent) {
                    Spacer(Modifier.height(10.dp))
                    Text(
                        t.auth.forgotSent,
                        style = MaterialTheme.typography.labelMedium,
                        color = c.successText(),
                    )
                    devToken?.let {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "dev: $it",
                            style = MaterialTheme.typography.labelSmall,
                            color = c.textMuted,
                        )
                    }
                }
                state.authError?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.labelSmall, color = c.danger)
                }
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MbButton(t.cancel, onClick = onClose, style = MbButtonStyle.Ghost, modifier = Modifier.weight(1f))
                    MbButton(
                        if (sent) t.next else t.confirm,
                        onClick = {
                            if (!sent) {
                                state.forgotPassword(identifier.trim()) { dev ->
                                    sent = true
                                    devToken = dev
                                    step = 2
                                }
                            } else {
                                step = 2
                            }
                        },
                        loading = state.authLoading,
                        modifier = Modifier.weight(1f),
                    )
                }
            } else {
                Text(t.auth.forgotSent, style = MaterialTheme.typography.labelMedium, color = c.successText())
                if (token.isEmpty()) token = devToken.orEmpty()
                Spacer(Modifier.height(12.dp))
                MbTextField(
                    token,
                    { token = it.uppercase().trim().take(16) },
                    t.auth.resetToken,
                    placeholder = "K7M2PQ9X",
                    keyboardType = KeyboardType.Ascii,
                )
                devToken?.let {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "dev: $it",
                        style = MaterialTheme.typography.labelSmall,
                        color = c.textMuted,
                    )
                }
                Spacer(Modifier.height(12.dp))
                MbTextField(newPassword, { newPassword = it }, t.auth.newPassword, password = true, imeAction = ImeAction.Done)
                state.authError?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.labelSmall, color = c.danger)
                }
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MbButton(
                        t.back,
                        onClick = { step = 1 },
                        style = MbButtonStyle.Ghost,
                        modifier = Modifier.weight(1f),
                    )
                    MbButton(
                        t.save,
                        onClick = {
                            if (newPassword.length < 8) {
                                state.showAuthError(t.checkPassword)
                            } else {
                                state.resetPassword(token.trim(), newPassword) { onClose() }
                            }
                        },
                        loading = state.authLoading,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}
