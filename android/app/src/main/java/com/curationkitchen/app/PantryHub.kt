package com.curationkitchen.app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.ui.platform.LocalContext
import java.net.URLEncoder
import com.curationkitchen.app.data.PantryItem
import com.curationkitchen.app.data.PantryRepository
import com.curationkitchen.app.ui.theme.Buttercream
import com.curationkitchen.app.ui.theme.CharcoalText
import com.curationkitchen.app.ui.theme.MutedText
import com.curationkitchen.app.ui.theme.OutlineCream
import com.curationkitchen.app.ui.theme.SageGreen
import com.curationkitchen.app.ui.theme.SurfaceVariantCream
import com.curationkitchen.app.ui.theme.TerracottaOrange

/**
 * PantryHub inventory tracking screen matching Curation Kitchen guidelines:
 * 1. Top Section: Clean header with Sage Green theme reading "Pantry Hub Inventory"
 *    and displaying the total item count, along with a back arrow to return to HomeScreen.
 * 2. List Layout: Vertical list showing ingredients auto-seeded from recipe imports with
 *    name, clean decimal float quantity, and category chip (Baking, Dairy, Produce, etc.).
 * 3. Low Stock Indicators: Terracotta Orange text indicator when quantity is 0.0 or Out of Stock.
 * 4. Back Navigation: Smooth back arrow button calling onBack.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PantryHub(
    onBack: () -> Unit,
    pantryRepository: PantryRepository? = null,
    modifier: Modifier = Modifier
) {
    // Collect repository state flows if provided
    val repoItems by (pantryRepository?.pantryCache?.collectAsState()
        ?: remember { mutableStateOf(emptyList()) })
    val isLoading by (pantryRepository?.isLoading?.collectAsState()
        ?: remember { mutableStateOf(false) })

    // Auto-seeded baseline items representing ingredients extracted from imported recipes
    val defaultSeededItems = remember {
        listOf(
            PantryItem(id = "p-1", name = "All-Purpose Flour", category = "Baking", quantity = 3.5, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-2", name = "Heavy Whipping Cream", category = "Dairy", quantity = 2.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-3", name = "Heirloom Tomatoes", category = "Produce", quantity = 4.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-4", name = "Extra Virgin Olive Oil", category = "Oils", quantity = 1.5, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-5", name = "Stone-Ground Polenta", category = "Grains", quantity = 2.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-6", name = "Parmigiano-Reggiano", category = "Dairy", quantity = 0.0, status = "Out of Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-7", name = "Cremini Mushrooms", category = "Produce", quantity = 1.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-8", name = "Wild Salmon Fillets", category = "Seafood", quantity = 2.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-9", name = "Fresh Sweet Basil", category = "Produce", quantity = 1.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-10", name = "Garlic Cloves", category = "Produce", quantity = 6.0, status = "In Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-11", name = "Baking Powder", category = "Baking", quantity = 0.0, status = "Out of Stock", created_date = "2026-09-15"),
            PantryItem(id = "p-12", name = "Whole Milk", category = "Dairy", quantity = 1.0, status = "In Stock", created_date = "2026-09-15")
        )
    }

    val displayItems = remember(repoItems, defaultSeededItems) {
        if (repoItems.isNotEmpty()) repoItems else defaultSeededItems
    }

    var selectedCategoryFilter by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }

    // Canadian Grocery Delivery Bottom Sheet State
    var deliveryTargetIngredient by remember { mutableStateOf<String?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current

    val categories = remember(displayItems) {
        listOf("All") + displayItems.map { it.category }.distinct().filter { it.isNotBlank() }
    }

    val filteredItems = remember(displayItems, selectedCategoryFilter, searchQuery) {
        displayItems.filter { item ->
            val matchesCat = selectedCategoryFilter == "All" || item.category.equals(selectedCategoryFilter, ignoreCase = true)
            val matchesQuery = searchQuery.isBlank() || item.name.contains(searchQuery, ignoreCase = true)
            matchesCat && matchesQuery
        }
    }

    val totalItemCount = displayItems.size
    val lowStockCount = displayItems.count { it.quantity <= 0.0 || it.status.equals("Out of Stock", ignoreCase = true) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Full screen wallpaper background
        Image(
            painter = painterResource(id = android.R.drawable.ic_menu_gallery),
            contentDescription = "Background Scrim",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // Dark gradient scrim
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.60f),
                            Color.Black.copy(alpha = 0.78f),
                            Color.Black.copy(alpha = 0.93f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            // ================================================================
            // 1. TOP SECTION: SAGE GREEN HEADER WITH BACK NAVIGATION & COUNTER
            // ================================================================
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SageGreen,
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Back Arrow Button
                            IconButton(
                                onClick = onBack,
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.2f))
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ArrowBack,
                                    contentDescription = "Back to Home",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Column {
                                Text(
                                    text = "Pantry Hub Inventory",
                                    fontSize = 19.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    letterSpacing = (-0.3).sp
                                )
                                Text(
                                    text = "Auto-seeded from recipe import engine",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color.White.copy(alpha = 0.85f)
                                )
                            }
                        }

                        // Total Count Badge
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color.White.copy(alpha = 0.22f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.35f))
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ShoppingCart,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "$totalItemCount ITEMS",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                            }
                        }
                    }

                    // Low Stock Alert Banner (if any item is out of stock)
                    if (lowStockCount > 0) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = TerracottaOrange.copy(alpha = 0.25f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, TerracottaOrange.copy(alpha = 0.6f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Warning,
                                    contentDescription = null,
                                    tint = Color(0xFFFFD1C7),
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "$lowStockCount ingredient${if (lowStockCount > 1) "s" else ""} need restocking",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }

            // ================================================================
            // CATEGORY FILTER CHIPS
            // ================================================================
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { category ->
                    val isSelected = selectedCategoryFilter == category
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = if (isSelected) TerracottaOrange else Buttercream.copy(alpha = 0.9f),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) TerracottaOrange else OutlineCream
                        ),
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { selectedCategoryFilter = category }
                    ) {
                        Text(
                            text = category,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Color.White else CharcoalText,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            // ================================================================
            // 2. VERTICAL LIST LAYOUT FOR INGREDIENTS
            // ================================================================
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(filteredItems, key = { it.id.ifEmpty { it.name } }) { item ->
                    PantryItemRow(
                        item = item,
                        onOrderMissing = { ingredient ->
                            deliveryTargetIngredient = ingredient
                        }
                    )
                }

                if (filteredItems.isEmpty()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Buttercream),
                            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(28.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "No ingredients found",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CharcoalText
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Try clearing your filters or importing another recipe.",
                                    fontSize = 12.sp,
                                    color = MutedText,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }
        }

        // ================================================================
        // 3. CANADIAN GROCERY DELIVERY STORE SELECTOR (MODAL BOTTOM SHEET)
        // ================================================================
        deliveryTargetIngredient?.let { ingredient ->
            ModalBottomSheet(
                onDismissRequest = { deliveryTargetIngredient = null },
                sheetState = sheetState,
                containerColor = Buttercream,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                dragHandle = {
                    Surface(
                        modifier = Modifier.padding(vertical = 10.dp),
                        color = CharcoalText.copy(alpha = 0.2f),
                        shape = CircleShape
                    ) {
                        Box(modifier = Modifier.size(width = 36.dp, height = 4.dp))
                    }
                }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp)
                        .padding(bottom = 32.dp)
                ) {
                    // Title Header
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Select Grocery Delivery",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = CharcoalText,
                                letterSpacing = (-0.3).sp
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                text = "Choose a Canadian fulfillment partner for \"$ingredient\"",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = MutedText
                            )
                        }

                        Surface(
                            shape = CircleShape,
                            color = TerracottaOrange.copy(alpha = 0.12f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(text = "🇨🇦", fontSize = 18.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Store Option Rows
                    val canadianStores = listOf(
                        Triple(
                            "Instacart Canada",
                            "Destinations for Loblaws, Superstore, Costco, Metro",
                            "⚡ Fastest Delivery (1-2 Hours)"
                        ),
                        Triple(
                            "Walmart Canada",
                            "Everyday low grocery prices & direct store pickup/delivery",
                            "🏷️ Great Value Everyday"
                        ),
                        Triple(
                            "Voilà by Sobeys",
                            "Fresh automated warehouse delivery with guaranteed freshness",
                            "❄️ Temperature Controlled"
                        )
                    )

                    canadianStores.forEach { (storeName, description, badge) ->
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 5.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .clickable {
                                    triggerAffiliateFulfillment(storeName, ingredient, context)
                                    deliveryTargetIngredient = null
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 13.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    // Store Brand Avatar Icon
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = SurfaceVariantCream,
                                        border = androidx.compose.foundation.BorderStroke(0.8.dp, OutlineCream),
                                        modifier = Modifier.size(42.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = when {
                                                    storeName.contains("Walmart") -> "🛒"
                                                    storeName.contains("Voilà") -> "✨"
                                                    else -> "🥕"
                                                },
                                                fontSize = 20.sp
                                            )
                                        }
                                    }

                                    Column(
                                        verticalArrangement = Arrangement.spacedBy(2.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Text(
                                                text = storeName,
                                                fontSize = 15.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = CharcoalText
                                            )
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = SageGreen.copy(alpha = 0.15f)
                                            ) {
                                                Text(
                                                    text = "CA Partner",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = SageGreen,
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                )
                                            }
                                        }

                                        Text(
                                            text = description,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Normal,
                                            color = MutedText,
                                            lineHeight = 15.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = TerracottaOrange.copy(alpha = 0.10f),
                                    border = androidx.compose.foundation.BorderStroke(0.8.dp, TerracottaOrange.copy(alpha = 0.35f))
                                ) {
                                    Text(
                                        text = "Shop →",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TerracottaOrange,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Orders are placed directly with Canadian grocery fulfillment providers. Affiliate commissions may support recipe curation.",
                        fontSize = 10.sp,
                        color = MutedText.copy(alpha = 0.8f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

/**
 * Affiliate Monetization: Dispatches grocery fulfillment to Canadian delivery stores with affiliate logging.
 * Formats URLs with safely encoded query parameters and affiliate partner tracking tokens:
 * - Instacart Canada: https://instacart.ca/store/s?k={ingredientName}&affiliate_id=YOUR_PARTNER_ID_PLACEHOLDER
 * - Walmart Canada: https://walmart.ca/en/search?q={ingredientName}&utm_source=affiliate&utm_medium=YOUR_RAKUTEN_ID_PLACEHOLDER
 * - Voilà by Sobeys: https://voila.ca/products/search?q={ingredientName}&subid=YOUR_IMPACT_ID_PLACEHOLDER
 */
fun triggerAffiliateFulfillment(storeName: String, ingredientName: String, context: Context? = null) {
    Log.d("PantryHub", "[Affiliate Grocery Fulfillment] triggerAffiliateFulfillment -> Store: $storeName, Ingredient: $ingredientName")
    if (context != null) {
        try {
            // Safely encode ingredient name so web browsers open search queries reliably (%20 for spaces)
            val encoded = URLEncoder.encode(ingredientName.trim(), "UTF-8").replace("+", "%20")
            val targetUriString = when {
                storeName.contains("Walmart", ignoreCase = true) ->
                    "https://walmart.ca/en/search?q=$encoded&utm_source=affiliate&utm_medium=YOUR_RAKUTEN_ID_PLACEHOLDER"
                storeName.contains("Voilà", ignoreCase = true) || storeName.contains("Voila", ignoreCase = true) || storeName.contains("Sobeys", ignoreCase = true) ->
                    "https://voila.ca/products/search?q=$encoded&subid=YOUR_IMPACT_ID_PLACEHOLDER"
                else ->
                    "https://instacart.ca/store/s?k=$encoded&affiliate_id=YOUR_PARTNER_ID_PLACEHOLDER"
            }
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUriString)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e("PantryHub", "Failed to launch $storeName affiliate link for $ingredientName", e)
        }
    }
}

fun triggerAffiliateFulfillment(storeName: String, ingredientName: String) {
    triggerAffiliateFulfillment(storeName, ingredientName, null)
}

/**
 * Backward compatibility alias for single-store shortcut
 */
fun openAffiliateGroceryLink(ingredientName: String, context: Context? = null) {
    triggerAffiliateFulfillment("Instacart Canada", ingredientName, context)
}

fun openAffiliateGroceryLink(ingredientName: String) {
    triggerAffiliateFulfillment("Instacart Canada", ingredientName, null)
}

/**
 * PantryItemRow:
 * - Buttercream container background
 * - Item name in CharcoalText
 * - Available quantity as clean decimal float (e.g., 3.5, 2.0, 0.0)
 * - Category chip (Baking, Dairy, Produce, etc.)
 * - Tiny Terracotta Orange text indicator when quantity is 0.0 or Out of Stock
 * - Affiliate Action Button: Glassmorphic "🛒 Order via Instacart" or grocery delivery selector on isLowStock
 */
@Composable
fun PantryItemRow(
    item: PantryItem,
    onOrderMissing: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isLowStock = item.quantity <= 0.0 || item.status.equals("Out of Stock", ignoreCase = true) || item.status.equals("Running Low", ignoreCase = true)

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Buttercream),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (isLowStock) TerracottaOrange.copy(alpha = 0.5f) else OutlineCream
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left Column: Item Name & Category Chip & Affiliate Button
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = item.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = CharcoalText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Category Chip
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = SurfaceVariantCream,
                        border = androidx.compose.foundation.BorderStroke(0.8.dp, OutlineCream)
                    ) {
                        Text(
                            text = item.category.ifBlank { "Pantry" },
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = CharcoalText.copy(alpha = 0.75f),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // Low Stock / Out of Stock Indicator
                    if (isLowStock) {
                        Text(
                            text = "● Out of Stock / Need to Buy",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = TerracottaOrange
                        )
                    } else {
                        Text(
                            text = "● In Stock",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SageGreen
                        )
                    }
                }

                // Affiliate Action Button: Glassmorphic compact button for low-stock items
                if (isLowStock) {
                    Spacer(modifier = Modifier.height(3.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.White.copy(alpha = 0.85f),
                        border = androidx.compose.foundation.BorderStroke(
                            width = 1.dp,
                            color = TerracottaOrange.copy(alpha = 0.45f)
                        ),
                        shadowElevation = 1.dp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable {
                                if (onOrderMissing != null) {
                                    onOrderMissing(item.name)
                                } else {
                                    openAffiliateGroceryLink(item.name, context)
                                }
                            }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "🛒 Order Grocery Delivery",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = TerracottaOrange
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Right: Clean Decimal Float Quantity
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = String.format("%.1f", item.quantity),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (isLowStock) TerracottaOrange else CharcoalText
                )
                Text(
                    text = "units available",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Medium,
                    color = MutedText
                )
            }
        }
    }
}

/**
 * Alias Composable for PantryHubScreen to maintain interoperability
 */
@Composable
fun PantryHubScreen(
    onBack: () -> Unit,
    pantryRepository: PantryRepository? = null,
    modifier: Modifier = Modifier
) {
    PantryHub(onBack = onBack, pantryRepository = pantryRepository, modifier = modifier)
}
