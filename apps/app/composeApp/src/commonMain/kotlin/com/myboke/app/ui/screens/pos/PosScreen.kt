package com.myboke.app.ui.screens.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.CartLine
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.EmptyState
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbChip
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MoneyText
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.model.Product
import com.myboke.app.core.util.Money

@Composable
fun PosScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf<String?>(null) }
    var showCart by remember { mutableStateOf(false) }
    var showCustomerPicker by remember { mutableStateOf(false) }

    val categories = remember(state.products.size) {
        state.products.mapNotNull { it.category?.name }.distinct()
    }
    val filtered = state.products.filter { product ->
        (query.isBlank() || product.name.contains(query, ignoreCase = true) || product.barcode == query) &&
            (category == null || product.category?.name == category)
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth > 880.dp

        Column(Modifier.fillMaxSize()) {
            // ── Top bar ──────────────────────────────────────
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(c.surface)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(c.primary.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center,
                ) {
                    MbIconView(MbIcon.Cart, size = 20.dp, tint = c.primary)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.pos, style = MaterialTheme.typography.headlineSmall, color = c.textPrimary)
                    Text(
                        state.activeShop?.name ?: t.shopSwitcher,
                        style = MaterialTheme.typography.labelSmall,
                        color = c.textMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                MbIconButton(
                    MbIcon.Scan,
                    onClick = { state.showSnack(t.scanBarcode) },
                    tint = c.textSecondary,
                )
                MbIconButton(
                    MbIcon.Receipt,
                    onClick = { state.selectTab(com.myboke.app.core.data.Tab.Reports) },
                    tint = c.textSecondary,
                )
            }

            Row(Modifier.weight(1f)) {
                // ── Bidhaa ───────────────────────────────────
                Column(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .padding(horizontal = 14.dp),
                ) {
                    Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.weight(1f)) {
                            MbTextField(
                                value = query,
                                onValueChange = { query = it },
                                label = t.searchProduct,
                                leadingIcon = MbIcon.Search,
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        MbIconButton(
                            MbIcon.Scan,
                            onClick = { state.showSnack(t.scanBarcode) },
                            background = c.surface2,
                            tint = c.textSecondary,
                            size = 48.dp,
                        )
                    }

                    if (categories.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            MbChip(t.all, category == null, { category = null })
                            categories.take(4).forEach { name ->
                                MbChip(name, category == name, { category = name })
                            }
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    if (filtered.isEmpty()) {
                        EmptyState(
                            icon = MbIcon.Box,
                            title = if (query.isBlank()) t.emptyProductsTitle else t.noResults,
                            body = t.emptyProductsBody,
                            actionLabel = if (query.isBlank()) t.addProduct else null,
                            onAction = if (query.isBlank()) ({ state.navigate(Page.ProductForm) }) else null,
                        )
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = if (wide) 168.dp else 152.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = if (wide) 16.dp else 110.dp),
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            items(filtered, key = { it.id }) { product ->
                                ProductTile(product, state) { state.addToCart(product) }
                            }
                        }
                    }
                }

                // ── Cart (wide) ───────────────────────────────
                if (wide) {
                    Column(
                        Modifier
                            .width(380.dp)
                            .fillMaxHeight()
                            .background(c.bg)
                            .border(1.dp, c.border)
                            .padding(14.dp),
                    ) {
                        CartPane(
                            state = state,
                            modifier = Modifier.fillMaxHeight(),
                            onPickCustomer = { showCustomerPicker = true },
                        )
                    }
                }
            }
        }

        // ── Sticky cart bar (mobile) ────────────────────────
        if (!wide && state.cart.isNotEmpty()) {
            Row(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(12.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.linearGradient(listOf(Color(0xFF0B37A1), Color(0xFF0269E9))))
                    .clickable { showCart = true }
                    .padding(horizontal = 16.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${state.cartCount}",
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.total, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f))
                    Text(
                        "TZS ${Money.format(state.cartTotal, 0)}",
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White,
                    )
                }
                Row(
                    Modifier
                        .clip(RoundedCornerShape(11.dp))
                        .background(Color.White)
                        // Kitufe hiki kinaonekana kama "Hifadhi & Risiti" — kikigusa
                        // kinapaswa kukamilisha mauzo moja kwa moja, si kufungua kikapu tu.
                        .clickable {
                            state.checkout { state.navigate(Page.Receipt) }
                        }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        t.completeSale,
                        style = MaterialTheme.typography.labelLarge,
                        color = Color(0xFF0B37A1),
                    )
                    Spacer(Modifier.width(4.dp))
                    MbIconView(MbIcon.ArrowRight, size = 15.dp, tint = Color(0xFF0B37A1))
                }
            }
        }

        if (showCustomerPicker) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.42f))
                    .clickable { showCustomerPicker = false },
            )
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .heightIn(max = maxHeight * 0.75f)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(c.surface)
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(t.customer, style = MaterialTheme.typography.titleLarge, color = c.textPrimary)
                    Spacer(Modifier.weight(1f))
                    MbIconButton(MbIcon.Close, onClick = { showCustomerPicker = false }, tint = c.textMuted)
                }
                Spacer(Modifier.height(8.dp))
                LazyColumn(Modifier.fillMaxWidth()) {
                    item {
                        CustomerOption(
                            name = t.walkIn,
                            subtitle = t.all,
                            selected = state.cartCustomerId == null,
                        ) {
                            state.cartCustomerId = null
                            showCustomerPicker = false
                        }
                    }
                    items(state.customers, key = { it.id }) { customer ->
                        CustomerOption(
                            name = customer.name,
                            subtitle = "${t.oweMe}: TZS ${Money.format(customer.outstanding, 0)}",
                            selected = state.cartCustomerId == customer.id,
                        ) {
                            state.cartCustomerId = customer.id
                            showCustomerPicker = false
                        }
                    }
                }
            }
        }

        // ── Cart sheet (mobile) ────────────────────────────
        if (showCart && !wide) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.42f))
                    .clickable { showCart = false },
            )
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .heightIn(max = maxHeight * 0.9f)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(c.surface)
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Cart · ${state.cartCount}",
                        style = MaterialTheme.typography.titleLarge,
                        color = c.textPrimary,
                    )
                    Spacer(Modifier.weight(1f))
                    MbIconButton(MbIcon.Close, onClick = { showCart = false }, tint = c.textMuted)
                }
                Spacer(Modifier.height(8.dp))
                CartPane(
                    state = state,
                    modifier = Modifier.weight(1f, fill = false),
                    onPickCustomer = { showCustomerPicker = true },
                )
            }
        }
    }
}

@Composable
private fun ProductTile(product: Product, state: AppState, onClick: () -> Unit) {
    val c = MbTheme.colors
    val stock = product.stockQuantity
    val out = stock <= 0
    val low = stock in 0.0..product.alertLevel.toDouble()
    val inCart = state.cart.firstOrNull { it.product.id == product.id }

    Column(
        Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(c.surface)
            .border(
                1.dp,
                if (inCart != null) c.primary else c.border,
                RoundedCornerShape(16.dp),
            )
            .clickable(enabled = !out, onClick = onClick)
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(c.primary.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.Box, size = 17.dp, tint = c.primary)
            }
            Spacer(Modifier.weight(1f))
            when {
                out -> StatusPill(state.t.outOfStockLabel, BadgeTone.Danger)
                low -> StatusPill("${stock.toInt()}", BadgeTone.Warning)
                else -> Text(
                    "${stock.toInt()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            product.name,
            style = MaterialTheme.typography.titleMedium,
            color = if (out) c.textMuted else c.textPrimary,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "TZS ${Money.format(Money.parse(product.sellingPrice), 0)}",
                style = MaterialTheme.typography.titleMedium.copy(fontFeatureSettings = "tnum"),
                color = if (out) c.textMuted else c.primary,
            )
            Spacer(Modifier.weight(1f))
            if (inCart != null) {
                Box(
                    Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(c.primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${inCart.quantity.toInt()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                    )
                }
            } else {
                Box(
                    Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(if (out) c.surface2 else c.primary.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center,
                ) {
                    MbIconView(
                        MbIcon.Plus,
                        size = 13.dp,
                        tint = if (out) c.textMuted else c.primary,
                    )
                }
            }
        }
    }
}

@Composable
fun CartPane(
    state: AppState,
    modifier: Modifier = Modifier,
    onPickCustomer: () -> Unit = {},
) {
    val t = state.t
    val c = MbTheme.colors

    Column(modifier) {
        if (state.cart.isEmpty()) {
            EmptyState(
                icon = MbIcon.Cart,
                title = t.cartEmpty,
                body = t.cartEmptyBody,
                actionLabel = null,
            )
            return@Column
        }

        LazyColumn(
            modifier = Modifier.weight(1f, fill = false).heightIn(max = 320.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.cart, key = { it.product.id }) { line ->
                CartRow(line, state)
            }
        }

        Spacer(Modifier.height(10.dp))

        // Mteja
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(c.surface2)
                .clickable { onPickCustomer() }
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            MbIconView(MbIcon.User, size = 16.dp, tint = c.primary)
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(t.customer, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
                Text(
                    state.customers.firstOrNull { it.id == state.cartCustomerId }?.name ?: t.walkIn,
                    style = MaterialTheme.typography.titleMedium,
                    color = c.textPrimary,
                )
            }
            MbIconView(MbIcon.ChevronRight, size = 15.dp, tint = c.textMuted)
        }

        Spacer(Modifier.height(10.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
        ) {
            listOf(
                "CASH" to t.cash,
                "MPESA" to t.mpesa,
                "AIRTEL" to t.airtel,
                "CREDIT" to t.credit,
            ).forEach { (value, label) ->
                MbChip(
                    text = label,
                    selected = state.paymentMethod == value,
                    onClick = {
                        state.paymentMethod = value
                        state.payLater = value == "CREDIT"
                    },
                )
            }
        }

        Spacer(Modifier.height(10.dp))

        Box(Modifier.width(150.dp)) {
            MbTextField(
                value = state.discountInput,
                onValueChange = { state.discountInput = it.filter { ch -> ch.isDigit() } },
                label = t.discount,
                prefix = "TZS",
                keyboardType = KeyboardType.Number,
            )
        }

        Spacer(Modifier.height(12.dp))

        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(c.surface)
                .border(1.dp, c.border, RoundedCornerShape(14.dp))
                .padding(12.dp),
        ) {
            TotalRow(t.subtotal, state.cartSubtotal)
            if (state.cartDiscount > 0) {
                TotalRow(t.discount, -state.cartDiscount, color = c.dangerText())
            }
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(t.total, style = MaterialTheme.typography.labelMedium, color = c.textSecondary)
                Spacer(Modifier.weight(1f))
                MoneyText(
                    value = state.cartTotal,
                    style = MaterialTheme.typography.headlineMedium,
                    color = c.textPrimary,
                )
            }
        }

        Spacer(Modifier.height(10.dp))
        MbButton(
            text = t.completeSale,
            onClick = {
                state.checkout { sale ->
                    state.navigate(Page.Receipt)
                }
            },
            loading = state.checkoutLoading,
            fullWidth = true,
            height = 52.dp,
            icon = MbIcon.Check,
        )
        if (state.payLater) {
            Spacer(Modifier.height(6.dp))
            Text(
                t.customerRequired,
                style = MaterialTheme.typography.labelSmall,
                color = c.warningText(),
            )
        }
    }
}

@Composable
private fun CustomerOption(
    name: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val c = MbTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) c.primary.copy(alpha = 0.08f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(34.dp).clip(CircleShape).background(c.surface2),
            contentAlignment = Alignment.Center,
        ) {
            MbIconView(MbIcon.User, size = 16.dp, tint = c.textSecondary)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleMedium, color = c.textPrimary)
            Text(subtitle, style = MaterialTheme.typography.labelSmall, color = c.textMuted)
        }
        if (selected) MbIconView(MbIcon.Check, size = 16.dp, tint = c.primary)
    }
}

@Composable
private fun CartRow(line: CartLine, state: AppState) {
    val c = MbTheme.colors
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(
                line.product.name,
                style = MaterialTheme.typography.titleMedium,
                color = c.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                "TZS ${Money.format(line.unitPrice, 0)} × ${Money.format(line.quantity, if (line.quantity % 1.0 == 0.0) 0 else 1)}",
                style = MaterialTheme.typography.labelSmall,
                color = c.textMuted,
            )
        }
        Row(
            Modifier
                .clip(RoundedCornerShape(10.dp))
                .background(c.surface2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StepperButton(MbIcon.Close) { state.setQuantity(line.product.id, line.quantity - 1) }
            Text(
                Money.format(line.quantity, if (line.quantity % 1.0 == 0.0) 0 else 1),
                style = MaterialTheme.typography.labelLarge,
                color = c.textPrimary,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
            StepperButton(MbIcon.Plus) { state.setQuantity(line.product.id, line.quantity + 1) }
        }
        Spacer(Modifier.width(10.dp))
        Text(
            Money.format(line.lineTotal, 0),
            style = MaterialTheme.typography.titleMedium.copy(fontFeatureSettings = "tnum"),
            color = c.textPrimary,
        )
    }
}

@Composable
private fun StepperButton(icon: MbIcon, onClick: () -> Unit) {
    val c = MbTheme.colors
    Box(
        Modifier
            .size(28.dp)
            .clip(RoundedCornerShape(9.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        MbIconView(icon, size = 13.dp, tint = c.textSecondary)
    }
}

@Composable
private fun TotalRow(label: String, value: Double, color: Color = MbTheme.colors.textSecondary) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = color)
        Spacer(Modifier.weight(1f))
        Text(
            "TZS ${Money.format(value, 0)}",
            style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum"),
            color = color,
        )
    }
}
