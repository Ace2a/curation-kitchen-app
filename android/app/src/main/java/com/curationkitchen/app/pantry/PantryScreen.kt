package com.curationkitchen.app.pantry

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.StateFlow

// ==========================================
// 1. SIMPLE ARCHITECTURE DATA MODELS
// ==========================================

enum class StockLevel(val label: String, val color: Color, val bgColor: Color) {
    IN_STOCK("In Stock", Color(0xFF047857), Color(0xFFD1FAE5)),      // Muted Emerald Green
    RUNNING_LOW("Low Stock", Color(0xFFB45309), Color(0xFFFEF3C7)),    // Pastel Amber
    OUT_OF_STOCK("Out of Stock", Color(0xFFB91C1C), Color(0xFFFEE2E2)) // Soft Pastel Red
}

data class PantryItem(
    val id: String,
    val name: String,
    val category: String,
    val stockLevel: StockLevel,
    val isRefrigerated: Boolean,
    val shelfLifeDaysRemaining: Int,
    val addedTimestamp: Long, // Epoch timestamp in seconds
    val emoji: String,
    val qty: String
)

// ==========================================
// 2. JETPACK COMPOSE COMPOSABLE SCREEN
// ==========================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PantryScreen(
    isPremiumUserFlow: StateFlow<Boolean>,
    onUpgradeClick: () -> Unit,
    onTabSelected: (String) -> Unit,
    onAddItemClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isPremium by isPremiumUserFlow.collectAsState(initial = false)

    // Culinary branding color palette
    val DeepOrange = Color(0xFFEA580C)   // Primary accent color
    val SlateDark = Color(0xFF0F172A)    // High contrast typography slate
    val CoolGreyBg = Color(0xFFF8FAFC)   // Light clean backdrop
    val PremiumGold = Color(0xFFD97706)  // Premium warning accent gold
    val SoftGoldBg = Color(0xFFFEF3C7)   // Soft gold card fill

    // 20 realistic items representing the capped user state
    val pantryItems = remember {
        listOf(
            PantryItem("1", "Organic Penne Pasta", "Grains & Pasta", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 120, addedTimestamp = 1689850000L, "🌾", "2 Bags"),
            PantryItem("2", "Italian Olive Oil", "Oils & Vinegars", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 90, addedTimestamp = 1689860000L, "🫒", "1 Bottle"),
            PantryItem("3", "Canned Black Beans", "Canned Goods", StockLevel.OUT_OF_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 365, addedTimestamp = 1689810000L, "🥫", "0 Left"),
            PantryItem("4", "Himalayan Pink Salt", "Spices & Herbs", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 500, addedTimestamp = 1689870000L, "🧂", "1 Jar"),
            PantryItem("5", "Gluten-Free Flour", "Baking Supply", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 60, addedTimestamp = 1689800000L, "🍞", "1 Bag"),
            PantryItem("6", "Chamomile Tea Bags", "Beverages", StockLevel.RUNNING_LOW, isRefrigerated = false, shelfLifeDaysRemaining = 80, addedTimestamp = 1689840000L, "☕", "5 Bags"),
            PantryItem("7", "Ancient Grain Quinoa", "Grains & Pasta", StockLevel.OUT_OF_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 110, addedTimestamp = 1689790000L, "🌾", "0 Bags"),
            PantryItem("8", "San Marzano Tomatoes", "Canned Goods", StockLevel.RUNNING_LOW, isRefrigerated = false, shelfLifeDaysRemaining = 180, addedTimestamp = 1689830000L, "🥫", "1 Can"),
            PantryItem("9", "White Wine Vinegar", "Oils & Vinegars", StockLevel.RUNNING_LOW, isRefrigerated = false, shelfLifeDaysRemaining = 150, addedTimestamp = 1689820000L, "🫒", "1 Bottle"),
            PantryItem("10", "Dark Chocolate Bar", "Snacks & Treats", StockLevel.RUNNING_LOW, isRefrigerated = false, shelfLifeDaysRemaining = 45, addedTimestamp = 1689780000L, "🥨", "1 Bar"),
            PantryItem("11", "Artisanal Potato Chips", "Snacks & Treats", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 15, addedTimestamp = 1689885000L, "🥨", "2 Bags"),
            PantryItem("12", "Ground Cinnamon Spice", "Spices & Herbs", StockLevel.RUNNING_LOW, isRefrigerated = false, shelfLifeDaysRemaining = 200, addedTimestamp = 1689770000L, "🧂", "1 Shaker"),
            PantryItem("13", "Baking Soda Box", "Baking Supply", StockLevel.OUT_OF_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 300, addedTimestamp = 1689760000L, "🍞", "0 Boxes"),
            PantryItem("14", "Pure Vanilla Extract", "Baking Supply", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 250, addedTimestamp = 1689890000L, "🍞", "1 Vial"),
            PantryItem("15", "Fresh Whole Milk", "Beverages", StockLevel.IN_STOCK, isRefrigerated = true, shelfLifeDaysRemaining = 1, addedTimestamp = 1689895000L, "🥛", "1 Jug"),
            PantryItem("16", "Sweet Corn Can", "Canned Goods", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 210, addedTimestamp = 1689750000L, "🥫", "2 Cans"),
            PantryItem("17", "Premium Espresso Beans", "Beverages", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 30, addedTimestamp = 1689900000L, "☕", "1 Bag"),
            PantryItem("18", "Fresh Greek Yogurt", "Beverages", StockLevel.IN_STOCK, isRefrigerated = true, shelfLifeDaysRemaining = 0, addedTimestamp = 16898920000L, "🥛", "1 Tub"),
            PantryItem("19", "Fusilli Pasta Box", "Grains & Pasta", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 90, addedTimestamp = 1689910000L, "🌾", "3 Boxes"),
            PantryItem("20", "Organic Maple Syrup", "Baking Supply", StockLevel.IN_STOCK, isRefrigerated = false, shelfLifeDaysRemaining = 120, addedTimestamp = 1689880000L, "🍞", "1 Bottle")
        )
    }

    val totalItemsCount = pantryItems.size
    val isCapped = !isPremium && totalItemsCount >= 20

    // Filter states
    var selectedStatus by remember { mutableStateOf<String?>(null) }
    var selectedCategory by remember { mutableStateOf("All Items") }

    // ==========================================
    // AUTOMATED SMART BUTTON CALCULATIONS
    // ==========================================
    val expiringSoonItems = pantryItems.filter { it.isRefrigerated && it.shelfLifeDaysRemaining < 2 }
    val lowStockItems = pantryItems.filter { it.stockLevel == StockLevel.RUNNING_LOW }
    val needToBuyItems = pantryItems.filter { it.stockLevel == StockLevel.OUT_OF_STOCK }
    val recentlyAddedItems = pantryItems.sortedByDescending { it.addedTimestamp }.take(5)

    // Filter application logic
    val filteredItems = remember(selectedStatus, selectedCategory, pantryItems) {
        val baseFiltered = when (selectedStatus) {
            "Expiring Soon" -> expiringSoonItems
            "Low Stock" -> lowStockItems
            "Need to Buy" -> needToBuyItems
            "Recently Added" -> recentlyAddedItems
            else -> pantryItems
        }

        if (selectedCategory == "All Items") {
            baseFiltered
        } else {
            baseFiltered.filter { it.category == selectedCategory }
        }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (isCapped) onUpgradeClick() else onAddItemClick()
                },
                containerColor = DeepOrange,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Item")
                    Text(
                        text = "Add Item",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        modifier = modifier.fillMaxSize()
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CoolGreyBg)
                .padding(paddingValues)
        ) {
            // Main content layout containing clean structured visual groupings
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(bottom = 80.dp)
            ) {
                // ==========================================
                // HEADER & SYSTEM COUPLING COUNTER
                // ==========================================
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 18.dp),
                    horizontalArrangement = Arrangement.Between,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Curation Kitchen",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = SlateDark
                        )
                        Text(
                            text = "Your intelligent ingredient hub",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }

                    // Logged Items Counter Gating Status
                    Column(
                        horizontalAlignment = Alignment.End
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isCapped) SoftGoldBg else Color(0xFFF1F5F9))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = if (isPremium) "💎 Unlimited" else "Logged: $totalItemsCount / 20 items",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isCapped) PremiumGold else Color.Gray
                            )
                        }
                    }
                }

                // Main content block wrapper with optional visual alpha overlay for the free-tier cap
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .alpha(if (isCapped) 0.45f else 1.0f)
                ) {
                    // ==========================================
                    // 1. SMART STATUS GRID (2x2) WITH AUTOMATED COUNT VALUES
                    // ==========================================
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Text(
                            text = "SMART STATUS INVENTORY",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.Gray,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(bottom = 10.dp)
                        )

                        // First Grid Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            StatusCard(
                                title = "Expiring Soon",
                                emoji = "🔔",
                                count = expiringSoonItems.size,
                                isSelected = selectedStatus == "Expiring Soon",
                                activeColor = Color(0xFFFEE2E2),
                                activeBorder = Color(0xFFFCA5A5),
                                activeText = Color(0xFF991B1B),
                                enabled = !isCapped,
                                onClick = {
                                    selectedStatus = if (selectedStatus == "Expiring Soon") null else "Expiring Soon"
                                },
                                modifier = Modifier.weight(1f)
                            )
                            StatusCard(
                                title = "Low Stock",
                                emoji = "📉",
                                count = lowStockItems.size,
                                isSelected = selectedStatus == "Low Stock",
                                activeColor = Color(0xFFFEF3C7),
                                activeBorder = Color(0xFFFCD34D),
                                activeText = Color(0xFF92400E),
                                enabled = !isCapped,
                                onClick = {
                                    selectedStatus = if (selectedStatus == "Low Stock") null else "Low Stock"
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Second Grid Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            StatusCard(
                                title = "Need to Buy",
                                emoji = "🛒",
                                count = needToBuyItems.size,
                                isSelected = selectedStatus == "Need to Buy",
                                activeColor = Color(0xFFECFEFF),
                                activeBorder = Color(0xFF67E8F9),
                                activeText = Color(0xFF0891B2),
                                enabled = !isCapped,
                                onClick = {
                                    selectedStatus = if (selectedStatus == "Need to Buy") null else "Need to Buy"
                                },
                                modifier = Modifier.weight(1f)
                            )
                            StatusCard(
                                title = "Recently Added",
                                emoji = "✨",
                                count = recentlyAddedItems.size,
                                isSelected = selectedStatus == "Recently Added",
                                activeColor = Color(0xFFECFDF5),
                                activeBorder = Color(0xFF6EE7B7),
                                activeText = Color(0xFF065F46),
                                enabled = !isCapped,
                                onClick = {
                                    selectedStatus = if (selectedStatus == "Recently Added") null else "Recently Added"
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // ==========================================
                    // 2. GROCERY CATEGORY LIST (Middle Section)
                    // ==========================================
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Text(
                            text = "Categories",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = SlateDark,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        // 8 specified category items in a beautifully organized 2-column layout grid
                        val categories = listOf(
                            Pair("📦 All Items", "All Items"),
                            Pair("🌾 Grains & Pasta", "Grains & Pasta"),
                            Pair("🥫 Canned Goods", "Canned Goods"),
                            Pair("🥨 Snacks & Treats", "Snacks & Treats"),
                            Pair("🧂 Spices & Herbs", "Spices & Herbs"),
                            Pair("🫒 Oils & Vinegars", "Oils & Vinegars"),
                            Pair("🍞 Baking Supply", "Baking Supply"),
                            Pair("☕ Beverages", "Beverages")
                        )

                        for (i in categories.indices step 2) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                CategoryButton(
                                    label = categories[i].first,
                                    isSelected = selectedCategory == categories[i].second,
                                    enabled = !isCapped,
                                    onClick = { selectedCategory = categories[i].second },
                                    modifier = Modifier.weight(1f)
                                )
                                if (i + 1 < categories.size) {
                                    CategoryButton(
                                        label = categories[i+1].first,
                                        isSelected = selectedCategory == categories[i+1].second,
                                        enabled = !isCapped,
                                        onClick = { selectedCategory = categories[i+1].second },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // ==========================================
                    // INGREDIENTS ACTIVE LIST FOR FILTER FEEDBACK
                    // ==========================================
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Between,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val activeFilterText = when {
                                selectedStatus != null && selectedCategory != "All Items" -> "$selectedStatus in $selectedCategory"
                                selectedStatus != null -> selectedStatus
                                selectedCategory != "All Items" -> selectedCategory
                                else -> "All"
                            }
                            Text(
                                text = "Ingredients ($activeFilterText: ${filteredItems.size})",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Gray
                            )
                            if (selectedStatus != null || selectedCategory != "All Items") {
                                Text(
                                    text = "Clear Filters",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = DeepOrange,
                                    modifier = Modifier.clickable(enabled = !isCapped) {
                                        selectedStatus = null
                                        selectedCategory = "All Items"
                                    }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        if (filteredItems.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color.White)
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No ingredients match active smart filters",
                                    fontSize = 13.sp,
                                    color = Color.Gray,
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            filteredItems.forEach { item ->
                                CompactPantryRow(item = item)
                                Spacer(modifier = Modifier.height(8.dp))
                            }
                        }
                    }
                }
            }

            // ==========================================
            // 3. SYSTEM COUPLING & CAP PROTECTION OVERLAY
            // ==========================================
            if (isCapped) {
                // Invisible blocking click detector layer preventing any background item modification
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable(enabled = true, onClick = onUpgradeClick)
                )

                // Clean premium lock banner aligned beautifully on top
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                        .padding(bottom = 68.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White,
                    shadowElevation = 8.dp,
                    border = BorderStroke(1.5.dp, PremiumGold)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onUpgradeClick() }
                            .padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(SoftGoldBg)
                        ) {
                            Text(text = "🔒", fontSize = 20.sp)
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "Upgrade to Premium to unlock unlimited tracking",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = SlateDark,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "You've hit the free tier limit of 20 ingredients. Tap this banner to securely upgrade to Unlimited Curation & Intelligent Meal Tracking.",
                            fontSize = 11.sp,
                            color = Color.DarkGray,
                            textAlign = TextAlign.Center,
                            lineHeight = 16.sp
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = onUpgradeClick,
                            colors = ButtonDefaults.buttonColors(containerColor = PremiumGold),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Unlock Unlimited Access",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// COMPONENT: GRID STATUS CARD
// ==========================================
@Composable
private fun StatusCard(
    title: String,
    emoji: String,
    count: Int,
    isSelected: Boolean,
    activeColor: Color,
    activeBorder: Color,
    activeText: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val containerColor = if (isSelected) activeColor else Color.White
    val borderStrokeColor = if (isSelected) activeBorder else Color(0xFFE2E8F0)
    val titleColor = if (isSelected) activeText else Color(0xFF1E293B)

    Card(
        colors = CardDefaults.cardColors(containerColor = containerColor),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, borderStrokeColor),
        modifier = modifier
            .height(72.dp)
            .clickable(enabled = enabled, onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isSelected) 2.dp else 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(if (isSelected) Color.White else Color(0xFFF1F5F9))
            ) {
                Text(text = emoji, fontSize = 16.sp)
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = title,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = titleColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "$count items",
                    fontSize = 11.sp,
                    color = if (isSelected) activeText.copy(alpha = 0.8f) else Color.Gray,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

// ==========================================
// COMPONENT: CATEGORY BUTTON Grid cell
// ==========================================
@Composable
private fun CategoryButton(
    label: String,
    isSelected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val DeepOrange = Color(0xFFEA580C)
    val containerColor = if (isSelected) DeepOrange else Color.White
    val borderStrokeColor = if (isSelected) DeepOrange else Color(0xFFE2E8F0)
    val textColor = if (isSelected) Color.White else Color(0xFF334155)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(containerColor)
            .border(1.dp, borderStrokeColor, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Text(
            text = label,
            color = textColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// ==========================================
// COMPONENT: SCANNABLE COMPACT PANTRY ROW
// ==========================================
@Composable
private fun CompactPantryRow(item: PantryItem) {
    // Elegant soft status pill highlights
    val statusColor = when (item.stockLevel) {
        StockLevel.OUT_OF_STOCK -> Color(0xFFB91C1C)
        StockLevel.RUNNING_LOW -> Color(0xFFB45309)
        else -> Color(0xFF047857)
    }

    val statusBg = when (item.stockLevel) {
        StockLevel.OUT_OF_STOCK -> Color(0xFFFEE2E2)
        StockLevel.RUNNING_LOW -> Color(0xFFFEF3C7)
        else -> Color(0xFFD1FAE5)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF1F5F9))
                ) {
                    Text(text = item.emoji, fontSize = 18.sp)
                }

                Column {
                    Text(
                        text = item.name,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${item.category} • ${item.qty}",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(statusBg)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = item.stockLevel.label,
                    color = statusColor,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }
    }
}
