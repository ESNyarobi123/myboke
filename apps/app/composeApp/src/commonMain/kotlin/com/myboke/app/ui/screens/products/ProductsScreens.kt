package com.myboke.app.ui.screens.products

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myboke.app.core.data.AppState
import com.myboke.app.core.data.Page
import com.myboke.app.core.design.BadgeTone
import com.myboke.app.core.design.EmptyState
import com.myboke.app.core.design.ListSkeleton
import com.myboke.app.core.design.MbButton
import com.myboke.app.core.design.MbButtonStyle
import com.myboke.app.core.design.MbCard
import com.myboke.app.core.design.MbChip
import com.myboke.app.core.design.MbIcon
import com.myboke.app.core.design.MbIconButton
import com.myboke.app.core.design.MbIconView
import com.myboke.app.core.design.MbTextField
import com.myboke.app.core.design.MbTheme
import com.myboke.app.core.design.MbTopBar
import com.myboke.app.core.design.StatusPill
import com.myboke.app.core.model.Product
import com.myboke.app.core.util.Money

private enum class ProductFilter { All, Low, Out, Expiring }

@Composable
fun ProductsScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var filter by remember { mutableStateOf(ProductFilter.All) }
    var query by remember { mutableStateOf("") }

    val lowCount = state.products.count { it.stockQuantity > 0 && it.stockQuantity <= it.alertLevel }
    val outCount = state.products.count { it.stockQuantity <= 0 }
    val expiringCount = state.products.count { it.hasExpiry }

    val filtered = state.products.filter { product ->
        val matchesQuery = query.isBlank() || product.name.contains(query, ignoreCase = true)
        val matchesFilter = when (filter) {
            ProductFilter.All -> true
            ProductFilter.Low -> product.stockQuantity > 0 && product.stockQuantity <= product.alertLevel
            ProductFilter.Out -> product.stockQuantity <= 0
            ProductFilter.Expiring -> product.hasExpiry
        }
        matchesQuery && matchesFilter
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
            MbTopBar(
                title = t.productsTitle,
                onBack = { state.back() },
                subtitle = "${state.products.size} ${t.products.lowercase()}",
            ) {
                MbIconButton(
                    MbIcon.Plus,
                    onClick = { state.navigate(Page.ProductForm) },
                    tint = c.onPrimary,
                    background = c.primary,
                )
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                MbChip("${t.all} ${state.products.size}", filter == ProductFilter.All, { filter = ProductFilter.All })
                MbChip("${t.lowStock} $lowCount", filter == ProductFilter.Low, { filter = ProductFilter.Low })
                MbChip("${t.outOfStockLabel} $outCount", filter == ProductFilter.Out, { filter = ProductFilter.Out })
                MbChip("${t.expiring} $expiringCount", filter == ProductFilter.Expiring, { filter = ProductFilter.Expiring })
            }

            Spacer(Modifier.height(12.dp))
            Box(Modifier.padding(horizontal = 16.dp)) {
                MbTextField(query, { query = it }, t.search, leadingIcon = MbIcon.Search)
            }
            Spacer(Modifier.height(12.dp))

            if (state.productsLoading && state.products.isEmpty()) {
                ListSkeleton(6)
            } else if (filtered.isEmpty()) {
                EmptyState(
                    icon = MbIcon.Box,
                    title = t.emptyProductsTitle,
                    body = t.emptyProductsBody,
                    actionLabel = t.addProduct,
                    onAction = { state.navigate(Page.ProductForm) },
                )
            } else {
                filtered.forEach { product ->
                    ProductRow(product, state)
                }
            }

            Spacer(Modifier.height(16.dp))
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ActionTile(MbIcon.Download, t.importProducts, Modifier.weight(1f)) {
                    state.downloadImportTemplate()
                }
                ActionTile(MbIcon.Doc, t.exportProducts, Modifier.weight(1f)) {
                    state.downloadProductExport("xlsx")
                }
                ActionTile(MbIcon.Printer, t.printLabels, Modifier.weight(1f)) {
                    state.downloadProductLabels()
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
private fun ProductRow(product: Product, state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    val out = product.stockQuantity <= 0
    val low = product.stockQuantity in 0.0..product.alertLevel.toDouble()

    MbCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 5.dp)
            .clickable { state.navigate(Page.ProductForm) },
        padding = 14.dp,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(c.primary.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center,
            ) {
                MbIconView(MbIcon.Box, size = 20.dp, tint = c.primary)
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    product.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (out) c.textMuted else c.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "${product.category?.name ?: t.category} · ${product.unitSymbol}",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.textMuted,
                )
            }
            when {
                out -> StatusPill(t.outOfStockLabel, BadgeTone.Danger)
                low -> StatusPill("${product.stockQuantity.toInt()}", BadgeTone.Warning)
                else -> StatusPill("${product.stockQuantity.toInt()}", BadgeTone.Neutral)
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "TZS ${Money.format(Money.parse(product.sellingPrice), 0)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = c.textPrimary,
                )
                Text(
                    "${t.profitPerUnit}: TZS ${Money.format(product.profitPerUnit, 0)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = c.successText(),
                )
            }
            MbIconButton(
                MbIcon.Edit,
                onClick = { state.navigate(Page.ProductForm) },
                tint = c.textMuted,
                background = c.surface2,
                size = 34.dp,
                iconSize = 17.dp,
            )
            Spacer(Modifier.width(6.dp))
            MbIconButton(
                MbIcon.Trash,
                onClick = { state.deleteProduct(product.id) },
                tint = c.danger,
                background = c.dangerBg,
                size = 34.dp,
                iconSize = 17.dp,
            )
        }
    }
}

@Composable
private fun ActionTile(icon: MbIcon, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = MbTheme.colors
    Row(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(c.surface)
            .clickable(onClick = onClick)
            .padding(vertical = 11.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MbIconView(icon, size = 15.dp, tint = c.primary)
        Spacer(Modifier.width(5.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = c.textSecondary)
    }
}

@Composable
fun ProductFormScreen(state: AppState) {
    val t = state.t
    val c = MbTheme.colors
    var name by remember { mutableStateOf("") }
    var selling by remember { mutableStateOf("") }
    var buying by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("") }
    var barcode by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.widthIn(max = 620.dp).fillMaxWidth()) {
            MbTopBar(t.addProductTitle, onBack = { state.back() })
            Column(Modifier.padding(horizontal = 16.dp)) {
                MbTextField(name, { name = it }, "${t.addProductTitle} *", placeholder = "Mf. Soda 500ml", leadingIcon = MbIcon.Box)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.weight(1f)) {
                        MbTextField(
                            selling, { selling = it.filter { ch -> ch.isDigit() || ch == '.' } },
                            "${t.sellingPrice} *", prefix = "TZS", keyboardType = KeyboardType.Decimal,
                        )
                    }
                    Box(Modifier.weight(1f)) {
                        MbTextField(
                            buying, { buying = it.filter { ch -> ch.isDigit() || ch == '.' } },
                            t.buyingPrice, prefix = "TZS", keyboardType = KeyboardType.Decimal,
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.weight(1f)) {
                        MbTextField(
                            stock, { stock = it.filter { ch -> ch.isDigit() } },
                            t.stock, keyboardType = KeyboardType.Number,
                        )
                    }
                    Box(Modifier.weight(1f)) {
                        MbTextField(
                            barcode, { barcode = it },
                            t.barcode, leadingIcon = MbIcon.Scan,
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
                MbCard(Modifier.fillMaxWidth(), background = c.successBg, bordered = false) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MbIconView(MbIcon.TrendingUp, size = 18.dp, tint = c.successText())
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "${t.profitPerUnit}: TZS ${Money.format(
                                (Money.parse(selling) - Money.parse(buying)).coerceAtLeast(0.0), 0,
                            )}",
                            style = MaterialTheme.typography.titleMedium,
                            color = c.successText(),
                        )
                    }
                }
                if (error != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(error ?: "", style = MaterialTheme.typography.labelMedium, color = c.danger)
                }
                Spacer(Modifier.height(18.dp))
                MbButton(
                    t.save,
                    onClick = {
                        if (name.trim().length < 2) {
                            error = t.emptyProductsTitle
                        } else if (Money.parse(selling) <= 0) {
                            error = t.sellingPrice
                        } else {
                            error = null
                            state.saveProduct(
                                id = null,
                                name = name.trim(),
                                sellingPrice = selling,
                                buyingPrice = buying,
                                stock = stock,
                                categoryId = null,
                                barcode = barcode.ifBlank { null },
                            ) { state.back() }
                        }
                    },
                    fullWidth = true,
                    height = 52.dp,
                    icon = MbIcon.Check,
                )
                Spacer(Modifier.height(12.dp))
                MbButton(
                    t.cancel,
                    onClick = { state.back() },
                    style = MbButtonStyle.Ghost,
                    fullWidth = true,
                )
                Spacer(Modifier.height(30.dp))
            }
        }
    }
}
