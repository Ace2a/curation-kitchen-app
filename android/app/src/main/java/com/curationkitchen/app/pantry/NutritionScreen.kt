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
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

// ==========================================
// 1. DATA MODELS & BASELINE GUIDELINES
// ==========================================

data class BaselineGuidelines(
    val name: String,
    val subLabel: String,
    val flag: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val sodium: Int,
    val source: String
)

val BaselineOptions = mapOf(
    "US" to BaselineGuidelines(
        name = "🇺🇸 United States (USDA Guidelines)",
        subLabel = "USDA Dietary Guidelines for Americans",
        flag = "🇺🇸",
        calories = 2000,
        protein = 50,
        carbs = 275,
        fat = 70,
        sodium = 2300,
        source = "USDA Dietary Guidelines for Americans"
    ),
    "CA" to BaselineGuidelines(
        name = "🇨🇦 Canada (Health Canada Guidelines)",
        subLabel = "Health Canada Food Guide Standard",
        flag = "🇨🇦",
        calories = 2000,
        protein = 56,
        carbs = 225,
        fat = 65,
        sodium = 2300,
        source = "Health Canada Dietary Reference Intakes"
    ),
    "WHO" to BaselineGuidelines(
        name = "🌐 International (WHO Guidelines)",
        subLabel = "World Health Organization Guidelines",
        flag = "🌐",
        calories = 2000,
        protein = 50,
        carbs = 275,
        fat = 65,
        sodium = 2000,
        source = "World Health Organization Guidelines"
    )
)

data class FoodLogEntry(
    val id: String,
    val name: String,
    val calories: Int,
    val servings: Double,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val sodium: Int
)

data class RecipeOption(
    val id: String,
    val title: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val sodium: Int
)

// ==========================================
// 2. JETPACK COMPOSE COMPOSABLE SCREEN
// ==========================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NutritionScreen(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Culinary Theme Color Palette
    val DeepOrange = Color(0xFFEA580C)
    val SlateDark = Color(0xFF0F172A)
    val CoolGreyBg = Color(0xFFF8FAFC)
    val BorderSlate = Color(0xFFE2E8F0)

    // State 1: Baseline region setting based on system locale (Defaults to US if not matched)
    val detectedRegion = remember {
        val country = Locale.getDefault().country.uppercase()
        if (country == "CA") "CA" else if (country == "US") "US" else "WHO"
    }
    var activeRegionKey by remember { mutableStateOf(detectedRegion) }
    val activeGuidelines = remember(activeRegionKey) {
        BaselineOptions[activeRegionKey] ?: BaselineOptions["WHO"]!!
    }

    // Dropdown visibility state (Baseline setting next to title in card)
    var showBaselineMenu by remember { mutableStateOf(false) }

    // AlertDialog visibility state (Reset top bar action)
    var showResetDialog by remember { mutableStateOf(false) }

    // Date state
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    val formattedDateLabel = remember(selectedDate) {
        val today = LocalDate.now()
        val yesterday = today.minusDays(1)
        when (selectedDate) {
            today -> "Today"
            yesterday -> "Yesterday"
            else -> selectedDate.format(DateTimeFormatter.ofPattern("EEE, MMM d", Locale.US))
        }
    }

    // Sample dynamic food log entries mapping key structure
    var foodLogs by remember {
        mutableStateOf(
            mutableMapOf<LocalDate, List<FoodLogEntry>>(
                LocalDate.now() to listOf(
                    FoodLogEntry("1", "Classic Spaghetti Carbonara", 650, 1.0, 32, 75, 22, 980),
                    FoodLogEntry("2", "Greek Yogurt with Blueberries", 180, 1.0, 15, 18, 2, 85)
                )
            )
        )
    }

    val currentDayLogs = foodLogs[selectedDate] ?: emptyList()

    // Sample recipe list for dropdown select
    val sampleRecipes = remember {
        listOf(
            RecipeOption("rec-1", "Classic Spaghetti Carbonara", 650, 32, 75, 22, 980),
            RecipeOption("rec-2", "Neapolitan Pizza Margherita", 720, 24, 98, 18, 1120),
            RecipeOption("rec-3", "Mediterranean Quinoa Bowl", 410, 12, 54, 14, 480),
            RecipeOption("rec-4", "Avocado Toast with Egg", 310, 11, 24, 16, 390)
        )
    }

    // UI form state
    var activeLogTab by remember { mutableStateOf("recipe") }
    var selectedRecipeId by remember { mutableStateOf("") }
    var recipeServings by remember { mutableStateOf("1.0") }

    // Custom food manual inputs
    var customName by remember { mutableStateOf("") }
    var customCalories by remember { mutableStateOf("350") }
    var customProtein by remember { mutableStateOf("15") }
    var customCarbs by remember { mutableStateOf("40") }
    var customFat by remember { mutableStateOf("10") }
    var customSodium by remember { mutableStateOf("350") }
    var customServings by remember { mutableStateOf("1.0") }

    // Daily totals derived state
    val dailyTotals = remember(currentDayLogs) {
        var cal = 0
        var pro = 0
        var carb = 0
        var fat = 0
        var sod = 0
        currentDayLogs.forEach { entry ->
            val mult = entry.servings
            cal += (entry.calories * mult).toInt()
            pro += (entry.protein * mult).toInt()
            carb += (entry.carbs * mult).toInt()
            fat += (entry.fat * mult).toInt()
            sod += (entry.sodium * mult).toInt()
        }
        BaselineGuidelines("Totals", "", "", cal, pro, carb, fat, sod, "")
    }

    // ==========================================
    // 3. RESET ALERT DIALOG COMPONENT
    // ==========================================
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = {
                Text(
                    text = "Reset Today's Logs?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = SlateDark
                )
            },
            text = {
                Text(
                    text = "This action will clear your active food diary list for the current day ($formattedDateLabel) and reset your calorie goal counter back to 0%. This cannot be undone.",
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        foodLogs = foodLogs.toMutableMap().apply {
                            put(selectedDate, emptyList())
                        }
                        showResetDialog = false
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = DeepOrange)
                ) {
                    Text("Confirm", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showResetDialog = false },
                    colors = ButtonDefaults.textButtonColors(contentColor = Color.Gray)
                ) {
                    Text("Cancel")
                }
            },
            containerColor = Color.White,
            shape = RoundedCornerShape(16.dp)
        )
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🥗", fontSize = 18.sp)
                        Text(
                            text = "NUTRITION PLANNER",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            color = SlateDark
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Navigate back",
                            tint = SlateDark
                        )
                    }
                },
                actions = {
                    // Settings/Gear Icon in topBar wires to the Reset Logs AlertDialog
                    IconButton(onClick = { showResetDialog = true }) {
                        Icon(
                            imageVector = Icons.Outlined.Settings,
                            contentDescription = "Reset Logs Settings",
                            tint = SlateDark
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.White
                ),
                modifier = Modifier.border(0.5.dp, BorderSlate, RoundedCornerShape(0.dp))
            )
        },
        modifier = modifier.fillMaxSize()
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(CoolGreyBg)
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ==========================================
            // 1. DATE NAVIGATOR & BASELINE CONTAINER
            // ==========================================
            Card(
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, BorderSlate),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Row 1: Date Chevrons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { selectedDate = selectedDate.minusDays(1) },
                            modifier = Modifier
                                .border(1.dp, BorderSlate, RoundedCornerShape(12.dp))
                                .size(40.dp)
                        ) {
                            Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Day")
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .background(CoolGreyBg, RoundedCornerShape(12.dp))
                                .border(1.dp, BorderSlate, RoundedCornerShape(12.dp))
                                .padding(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CalendarMonth,
                                contentDescription = "Date",
                                tint = DeepOrange,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = formattedDateLabel,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = SlateDark
                            )
                        }

                        IconButton(
                            onClick = { selectedDate = selectedDate.plusDays(1) },
                            modifier = Modifier
                                .border(1.dp, BorderSlate, RoundedCornerShape(12.dp))
                                .size(40.dp)
                        ) {
                            Icon(Icons.Default.ChevronRight, contentDescription = "Next Day")
                        }
                    }

                    HorizontalDivider(color = BorderSlate.copy(alpha = 0.5f))

                    // Row 2: Intake Baseline & Localized Dropdown Selection (Gear Icon integration)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(CoolGreyBg)
                        ) {
                            Text(text = activeGuidelines.flag, fontSize = 20.sp)
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Intake Baseline",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.Gray,
                                letterSpacing = 0.5.sp
                            )
                            Text(
                                text = activeGuidelines.name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = SlateDark,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = activeGuidelines.subLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.Gray
                            )
                        }

                        Box {
                            IconButton(
                                onClick = { showBaselineMenu = true },
                                modifier = Modifier
                                    .background(CoolGreyBg, CircleShape)
                                    .size(36.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Settings,
                                    contentDescription = "Baseline Selection",
                                    tint = DeepOrange,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            DropdownMenu(
                                expanded = showBaselineMenu,
                                onDismissRequest = { showBaselineMenu = false },
                                modifier = Modifier.background(Color.White)
                            ) {
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text("🇺🇸")
                                            Text(
                                                "United States (USDA)",
                                                fontWeight = if (activeRegionKey == "US") FontWeight.Bold else FontWeight.Normal
                                            )
                                        }
                                    },
                                    onClick = {
                                        activeRegionKey = "US"
                                        showBaselineMenu = false
                                    },
                                    trailingIcon = {
                                        if (activeRegionKey == "US") {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = "Selected",
                                                tint = DeepOrange
                                            )
                                        }
                                    }
                                )
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text("🇨🇦")
                                            Text(
                                                "Canada (Health Canada)",
                                                fontWeight = if (activeRegionKey == "CA") FontWeight.Bold else FontWeight.Normal
                                            )
                                        }
                                    },
                                    onClick = {
                                        activeRegionKey = "CA"
                                        showBaselineMenu = false
                                    },
                                    trailingIcon = {
                                        if (activeRegionKey == "CA") {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = "Selected",
                                                tint = DeepOrange
                                            )
                                        }
                                    }
                                )
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text("🌐")
                                            Text(
                                                "International (WHO)",
                                                fontWeight = if (activeRegionKey == "WHO") FontWeight.Bold else FontWeight.Normal
                                            )
                                        }
                                    },
                                    onClick = {
                                        activeRegionKey = "WHO"
                                        showBaselineMenu = false
                                    },
                                    trailingIcon = {
                                        if (activeRegionKey == "WHO") {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = "Selected",
                                                tint = DeepOrange
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // ==========================================
            // 2. TOTAL ENERGY CARD (KCAL PROGRESS)
            // ==========================================
            Card(
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, BorderSlate),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "TOTAL ENERGY",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.Gray,
                            letterSpacing = 1.sp
                        )
                        val calPct = if (activeGuidelines.calories > 0) {
                            (dailyTotals.calories.toFloat() / activeGuidelines.calories * 100).toInt()
                        } else 0
                        Text(
                            text = "$calPct% Goal",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = if (calPct > 100) Color(0xFFB91C1C) else Color(0xFF047857),
                            modifier = Modifier
                                .background(
                                    if (calPct > 100) Color(0xFFFEE2E2) else Color(0xFFD1FAE5),
                                    RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "${dailyTotals.calories}",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Black,
                            color = SlateDark
                        )
                        Text(
                            text = "KCAL CONSUMED",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.Gray,
                            letterSpacing = 1.sp
                        )

                        val pct = if (activeGuidelines.calories > 0) {
                            (dailyTotals.calories.toFloat() / activeGuidelines.calories).coerceIn(0f, 1f)
                        } else 0f
                        LinearProgressIndicator(
                            progress = pct,
                            color = if (dailyTotals.calories > activeGuidelines.calories) Color(0xFF8B5CF6) else Color(0xFF10B981),
                            trackColor = CoolGreyBg,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .padding(top = 12.dp)
                        )

                        Text(
                            text = "Daily Limit: ${activeGuidelines.calories} kcal",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Gray,
                            modifier = Modifier.padding(top = 6.dp)
                        )
                    }

                    Text(
                        text = if (dailyTotals.calories > activeGuidelines.calories) {
                            "⚠️ Limit exceeded. Ideal for calorie cutting."
                        } else {
                            "👍 Great! Balanced energy intake."
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // ==========================================
            // 3. NUTRIENTS BREAKDOWN CARD
            // ==========================================
            Card(
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, BorderSlate),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "NUTRIENTS BREAKDOWN",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.Gray,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )

                    // Nutrient 1: Protein
                    NutrientBarRow(
                        emoji = "🍗",
                        label = "Protein",
                        current = dailyTotals.protein,
                        target = activeGuidelines.protein,
                        unit = "g",
                        subtext = "Muscle repair & satiety",
                        barColor = Color(0xFFEF4444)
                    )

                    // Nutrient 2: Carbs
                    NutrientBarRow(
                        emoji = "🍞",
                        label = "Carbohydrates",
                        current = dailyTotals.carbs,
                        target = activeGuidelines.carbs,
                        unit = "g",
                        subtext = "Energy & performance",
                        barColor = Color(0xFFF59E0B)
                    )

                    // Nutrient 3: Fat
                    NutrientBarRow(
                        emoji = "🥑",
                        label = "Fat",
                        current = dailyTotals.fat,
                        target = activeGuidelines.fat,
                        unit = "g",
                        subtext = "Hormonal balance",
                        barColor = Color(0xFF3B82F6)
                    )

                    // Nutrient 4: Sodium
                    NutrientBarRow(
                        emoji = "🧂",
                        label = "Sodium",
                        current = dailyTotals.sodium,
                        target = activeGuidelines.sodium,
                        unit = "mg",
                        subtext = "Fluid & blood pressure",
                        barColor = if (dailyTotals.sodium > activeGuidelines.sodium) Color(0xFFEF4444) else Color(0xFF8B5CF6)
                    )
                }
            }

            // ==========================================
            // 4. ADD FOOD INTAKE ENGINE
            // ==========================================
            Card(
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, BorderSlate),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add", tint = DeepOrange, modifier = Modifier.size(16.dp))
                            Text(
                                text = "LOG CONSUMED INTAKE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = SlateDark,
                                letterSpacing = 0.5.sp
                            )
                        }

                        // Tab selector
                        Row(
                            modifier = Modifier
                                .background(CoolGreyBg, RoundedCornerShape(10.dp))
                                .padding(2.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (activeLogTab == "recipe") Color.White else Color.Transparent)
                                    .clickable { activeLogTab = "recipe" }
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "Recipe List",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (activeLogTab == "recipe") DeepOrange else Color.Gray
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (activeLogTab == "custom") Color.White else Color.Transparent)
                                    .clickable { activeLogTab = "custom" }
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "Custom Food",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (activeLogTab == "custom") DeepOrange else Color.Gray
                                )
                            }
                        }
                    }

                    if (activeLogTab == "recipe") {
                        // Recipe drop-down helper selection state
                        var expandedRecipes by remember { mutableStateOf(false) }
                        val activeRecipe = sampleRecipes.find { it.id == selectedRecipeId }

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "SELECT RECIPE",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.Gray
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, BorderSlate, RoundedCornerShape(12.dp))
                                    .clickable { expandedRecipes = true }
                                    .padding(horizontal = 14.dp, vertical = 12.dp)
                            ) {
                                Text(
                                    text = activeRecipe?.let { "${it.title} (${it.calories} kcal)" }
                                        ?: "-- Choose from your recipe library --",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeRecipe != null) SlateDark else Color.Gray,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                DropdownMenu(
                                    expanded = expandedRecipes,
                                    onDismissRequest = { expandedRecipes = false },
                                    modifier = Modifier.fillMaxWidth(0.85f).background(Color.White)
                                ) {
                                    sampleRecipes.forEach { recipe ->
                                        DropdownMenuItem(
                                            text = {
                                                Text(
                                                    text = "${recipe.title} (${recipe.calories} kcal/serving)",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            },
                                            onClick = {
                                                selectedRecipeId = recipe.id
                                                expandedRecipes = false
                                            }
                                        )
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = "SERVINGS",
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.Gray
                                    )
                                    OutlinedTextField(
                                        value = recipeServings,
                                        onValueChange = { recipeServings = it },
                                        singleLine = true,
                                        textStyle = LocalTextStyle.current.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = DeepOrange,
                                            unfocusedBorderColor = BorderSlate
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                Button(
                                    onClick = {
                                        activeRecipe?.let { rec ->
                                            val srv = recipeServings.toDoubleOrNull() ?: 1.0
                                            val newEntry = FoodLogEntry(
                                                id = System.currentTimeMillis().toString(),
                                                name = rec.title,
                                                calories = rec.calories,
                                                servings = srv,
                                                protein = rec.protein,
                                                carbs = rec.carbs,
                                                fat = rec.fat,
                                                sodium = rec.sodium
                                            )
                                            val currentList = foodLogs[selectedDate] ?: emptyList()
                                            foodLogs = foodLogs.toMutableMap().apply {
                                                put(selectedDate, currentList + newEntry)
                                            }
                                            selectedRecipeId = ""
                                        }
                                    },
                                    enabled = selectedRecipeId.isNotEmpty(),
                                    colors = ButtonDefaults.buttonColors(containerColor = DeepOrange),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.height(50.dp).padding(top = 14.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = "Log", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Log Food", fontSize = 11.sp, fontWeight = FontWeight.Black)
                                }
                            }
                        }
                    } else {
                        // Custom Food Fields
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = customName,
                                onValueChange = { customName = it },
                                label = { Text("Food Item Name", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                                placeholder = { Text("e.g. Greek Yogurt, Protein Shake", fontSize = 11.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = customCalories,
                                    onValueChange = { customCalories = it },
                                    label = { Text("Calories (kcal)", fontSize = 8.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = customServings,
                                    onValueChange = { customServings = it },
                                    label = { Text("Servings", fontSize = 8.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = customProtein,
                                    onValueChange = { customProtein = it },
                                    label = { Text("Protein (g)", fontSize = 8.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = customCarbs,
                                    onValueChange = { customCarbs = it },
                                    label = { Text("Carbs (g)", fontSize = 8.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = customFat,
                                    onValueChange = { customFat = it },
                                    label = { Text("Fat (g)", fontSize = 8.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = customSodium,
                                    onValueChange = { customSodium = it },
                                    label = { Text("Sodium (mg)", fontSize = 8.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DeepOrange, unfocusedBorderColor = BorderSlate),
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Button(
                                onClick = {
                                    if (customName.isNotBlank()) {
                                        val cSrv = customServings.toDoubleOrNull() ?: 1.0
                                        val newEntry = FoodLogEntry(
                                            id = System.currentTimeMillis().toString(),
                                            name = customName,
                                            calories = customCalories.toIntOrNull() ?: 0,
                                            servings = cSrv,
                                            protein = customProtein.toIntOrNull() ?: 0,
                                            carbs = customCarbs.toIntOrNull() ?: 0,
                                            fat = customFat.toIntOrNull() ?: 0,
                                            sodium = customSodium.toIntOrNull() ?: 0
                                        )
                                        val currentList = foodLogs[selectedDate] ?: emptyList()
                                        foodLogs = foodLogs.toMutableMap().apply {
                                            put(selectedDate, currentList + newEntry)
                                        }
                                        customName = ""
                                    }
                                },
                                enabled = customName.isNotBlank(),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepOrange),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .padding(top = 4.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Log", modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("LOG CUSTOM ITEM", fontSize = 11.sp, fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }
            }

            // ==========================================
            // 5. FOOD DIARY LIST (Logs list)
            // ==========================================
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.List, contentDescription = "Diary", tint = DeepOrange, modifier = Modifier.size(16.dp))
                    Text(
                        text = "FOOD DIARY LOGS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.Gray,
                        letterSpacing = 1.2.sp
                    )
                }

                if (currentDayLogs.isEmpty()) {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, BorderSlate),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(text = "🥪", fontSize = 28.sp)
                            Text(
                                text = "Food diary is empty",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = SlateDark
                            )
                            Text(
                                text = "You haven't logged any breakfast, lunch, or dinner recipes for today yet. Use the log intake form above to record what you ate.",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.Gray,
                                textAlign = TextAlign.Center,
                                lineHeight = 14.sp,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )
                        }
                    }
                } else {
                    currentDayLogs.forEach { entry ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, BorderSlate),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = entry.name,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = SlateDark,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = "Servings: ${entry.servings}x", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        Text(text = "•", fontSize = 9.sp, color = Color.Gray)
                                        Text(text = "P: ${entry.protein}g", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        Text(text = "C: ${entry.carbs}g", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        Text(text = "F: ${entry.fat}g", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                    }
                                }
                                
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    val logCal = (entry.calories * entry.servings).toInt()
                                    Text(
                                        text = "$logCal kcal",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = SlateDark,
                                        modifier = Modifier
                                            .background(CoolGreyBg, RoundedCornerShape(8.dp))
                                            .border(1.dp, BorderSlate, RoundedCornerShape(8.dp))
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                    
                                    IconButton(
                                        onClick = {
                                            val currentList = foodLogs[selectedDate] ?: emptyList()
                                            foodLogs = foodLogs.toMutableMap().apply {
                                                put(selectedDate, currentList.filter { it.id != entry.id })
                                            }
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Delete entry",
                                            tint = Color.Gray,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun NutrientBarRow(
    emoji: String,
    label: String,
    current: Int,
    target: Int,
    unit: String,
    subtext: String,
    barColor: Color
) {
    val CoolGreyBg = Color(0xFFF8FAFC)
    val SlateDark = Color(0xFF0F172A)
    val pct = if (target > 0) (current.toFloat() / target).coerceIn(0f, 1f) else 0f
    
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(text = emoji, fontSize = 14.sp)
                Column {
                    Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SlateDark)
                    Text(text = subtext, fontSize = 9.sp, color = Color.Gray)
                }
            }
            
            Text(
                text = "$current / $target $unit",
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = SlateDark
            )
        }
        
        LinearProgressIndicator(
            progress = pct,
            color = barColor,
            trackColor = CoolGreyBg,
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
        )
    }
}
