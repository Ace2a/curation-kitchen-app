package com.curationkitchen.app.pantry

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.StateFlow

// ==========================================
// 1. DATA STRUCTURES FOR MEAL PLANNING
// ==========================================

enum class DayOfWeekCustom(val abbreviation: String, val fullName: String) {
    MONDAY("M", "Monday"),
    TUESDAY("T", "Tuesday"),
    WEDNESDAY("W", "Wednesday"),
    THURSDAY("T", "Thursday"),
    FRIDAY("F", "Friday"),
    SATURDAY("S", "Saturday"),
    SUNDAY("S", "Sunday")
}

data class MealSlot(
    val recipeTitle: String? = null,
    val prepTime: String? = null,
    val emoji: String? = null,
    val imageGradient: List<Color>? = null
)

data class DayMealPlan(
    val breakfast: MealSlot = MealSlot(),
    val lunch: MealSlot = MealSlot(),
    val dinner: MealSlot = MealSlot()
)

data class SelectionRecipe(
    val title: String,
    val prepTime: String,
    val emoji: String,
    val bgGradient: List<Color>
)

// ==========================================
// 2. JETPACK COMPOSE COMPOSABLE SCREEN
// ==========================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealPlannerScreen(
    isPremiumUserFlow: StateFlow<Boolean>,
    onUpgradeClick: () -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isPremium by isPremiumUserFlow.collectAsState(initial = false)

    // Brand Palette Coordinates
    val BrandOrange = Color(0xFFEA580C)      // Deep warm brand orange
    val BrandPeachLight = Color(0xFFFFF7ED)  // Soft warm peach container fill
    val DarkSlate = Color(0xFF0F172A)        // Material 3 high-contrast Surface background
    val CoolGreyBg = Color(0xFFF8FAFC)       // Minimal neutral background
    val BorderSlate = Color(0xFFE2E8F0)      // Subtle card divider grey
    val PremiumGold = Color(0xFFD97706)      // Warm premium lock/gold indicator

    // State: Selected active day of the week (Defaults to MONDAY)
    var selectedDay by remember { mutableStateOf(DayOfWeekCustom.MONDAY) }

    // State: Interactive, stateful meal plans per day
    var mealPlans by remember {
        mutableStateOf(
            mutableMapOf<DayOfWeekCustom, DayMealPlan>(
                DayOfWeekCustom.MONDAY to DayMealPlan(
                    breakfast = MealSlot("Avocado Toast with Egg", "10 mins", "🥑", listOf(Color(0xFF86EFAC), Color(0xFF22C55E))),
                    lunch = MealSlot("Mediterranean Quinoa Bowl", "15 mins", "🥗", listOf(Color(0xFFFED7AA), Color(0xFFF97316))),
                    dinner = MealSlot("Classic Spaghetti Carbonara", "25 mins", "🍝", listOf(Color(0xFFFBCFE8), Color(0xFFEC4899)))
                ),
                DayOfWeekCustom.TUESDAY to DayMealPlan(
                    breakfast = MealSlot("Greek Yogurt with Berries", "5 mins", "🥣", listOf(Color(0xFFBFDBFE), Color(0xFF3B82F6))),
                    lunch = MealSlot("Caprese Sandwich", "8 mins", "🥪", listOf(Color(0xFFFDE047), Color(0xFFEAB308)))
                )
            )
        )
    }

    // Modal/Sheet Dialog state for custom manual additions
    var showRecipeSelector by remember { mutableStateOf(false) }
    var activeSlotToPlan by remember { mutableStateOf<String?>(null) } // "breakfast", "lunch", "dinner"

    // A beautiful pre-curated collection of select recipes users can add
    val recipeLibrary = remember {
        listOf(
            SelectionRecipe("Crispy Belgian Waffles", "15 mins", "🧇", listOf(Color(0xFFFED7AA), Color(0xFFF97316))),
            SelectionRecipe("Fresh Acai Berry Bowl", "8 mins", "🍓", listOf(Color(0xFFFBCFE8), Color(0xFFEC4899))),
            SelectionRecipe("Double Bacon Cheeseburger", "22 mins", "🍔", listOf(Color(0xFFFCA5A5), Color(0xFFEF4444))),
            SelectionRecipe("Teriyaki Salmon Rice Bowl", "25 mins", "🍣", listOf(Color(0xFFFDE047), Color(0xFFEAB308))),
            SelectionRecipe("Creamy Mushroom Fettuccine", "20 mins", "🍝", listOf(Color(0xFFC7D2FE), Color(0xFF6366F1))),
            SelectionRecipe("Slow Roasted Garlic Chicken", "60 mins", "🍗", listOf(Color(0xFFE2E8F0), Color(0xFF64748B)))
        )
    }

    // Navigation and Scaffold Layout
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "📅", fontSize = 18.sp)
                        Text(
                            text = "WEEKLY MEAL PLANNER",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            color = DarkSlate
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back to Workspace Hub",
                            tint = DarkSlate
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CoolGreyBg)
                .padding(paddingValues)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {

                // ==========================================
                // 1. THE SPARKLING AI ACTION HUB
                // ==========================================
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSlate),
                    elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
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
                                Text(text = "✨", fontSize = 18.sp)
                                Text(
                                    text = "INTELLIGENT KITCHEN ENGINE",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFF97316),
                                    letterSpacing = 1.sp
                               )
                            }

                            // Compact Clear Plan Text Button
                            Text(
                                text = "Clear Plan",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        mealPlans = mutableMapOf()
                                    }
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        Text(
                            text = "Save time cooking with AI-powered personalized calendars",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFCBD5E1)
                        )

                        // Sparkling Auto-Plan Card CTA
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = BrandOrange),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    // Generate a premium structured menu automatically
                                    val generated = mutableMapOf<DayOfWeekCustom, DayMealPlan>()
                                    DayOfWeekCustom.values().forEachIndexed { index, day ->
                                        // Fill first 3 days always; remaining days only if premium
                                        if (isPremium || index < 3) {
                                            generated[day] = DayMealPlan(
                                                breakfast = MealSlot("Acai Berry Bowl", "8 mins", "🍓", listOf(Color(0xFFFBCFE8), Color(0xFFEC4899))),
                                                lunch = MealSlot("Mediterranean Quinoa Bowl", "15 mins", "🥗", listOf(Color(0xFFFED7AA), Color(0xFFF97316))),
                                                dinner = MealSlot("Creamy Mushroom Fettuccine", "20 mins", "🍝", listOf(Color(0xFFC7D2FE), Color(0xFF6366F1)))
                                            )
                                        }
                                    }
                                    mealPlans = generated
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 14.dp, horizontal = 16.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "✨ Auto-Plan My Week with AI",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 14.sp,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                // ==========================================
                // 2. HORIZONTAL DAY CALENDAR STRIP
                // ==========================================
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "PLANNING SCHEDULE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.Gray,
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.padding(start = 4.dp)
                    )

                    // Horizontal lazy row calendar
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        itemsIndexed(DayOfWeekCustom.values()) { index, day ->
                            val isSelected = selectedDay == day
                            val isLocked = !isPremium && index >= 3

                            // Styling coordinates for the circular buttons
                            val bgButton = when {
                                isSelected -> BrandOrange
                                isLocked -> Color(0xFFF1F5F9)
                                else -> Color.White
                            }
                            val textButtonColor = when {
                                isSelected -> Color.White
                                isLocked -> Color(0xFF94A3B8)
                                else -> DarkSlate
                            }
                            val borderStroke = if (isSelected) {
                                null
                            } else {
                                BorderStroke(1.dp, BorderSlate)
                            }

                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier.width(46.dp)
                            ) {
                                Card(
                                    shape = CircleShape,
                                    colors = CardDefaults.cardColors(containerColor = bgButton),
                                    border = borderStroke,
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clickable {
                                            selectedDay = day
                                        }
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        if (isLocked) {
                                            Icon(
                                                imageVector = Icons.Default.Lock,
                                                contentDescription = "Locked Day",
                                                tint = Color(0xFF94A3B8),
                                                modifier = Modifier.size(14.dp)
                                            )
                                        } else {
                                            Text(
                                                text = day.abbreviation,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Black,
                                                color = textButtonColor
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = day.fullName.substring(0, 3),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) BrandOrange else Color.Gray
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Check premium limit for day 4+
                val selectedDayIndex = DayOfWeekCustom.values().indexOf(selectedDay)
                val dayIsLocked = !isPremium && selectedDayIndex >= 3

                if (dayIsLocked) {
                    // ==========================================
                    // 4. PREMIUM TIMELINE GATE OVERLAY CARD
                    // ==========================================
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        shape = RoundedCornerShape(24.dp),
                        color = Color.White,
                        border = BorderStroke(1.5.dp, PremiumGold)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFFEF3C7))
                            ) {
                                Text(text = "🔒", fontSize = 22.sp)
                            }

                            Text(
                                text = "Unlock the Full Week Planner",
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = DarkSlate,
                                textAlign = TextAlign.Center
                            )

                            Text(
                                text = "Free accounts can schedule meals up to 3 days (M, T, W). Secure a subscription to unlock premium features: auto-planning Thursday to Sunday, multi-week timeline synchronization, and smart aggregated shopping lists.",
                                fontSize = 12.sp,
                                color = Color.Gray,
                                textAlign = TextAlign.Center,
                                lineHeight = 18.sp
                            )

                            Button(
                                onClick = onUpgradeClick,
                                colors = ButtonDefaults.buttonColors(containerColor = PremiumGold),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.Default.Star, contentDescription = "Premium")
                                    Text(
                                        text = "Upgrade to Premium",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                } else {
                    // ==========================================
                    // 3. DYNAMIC MEAL CARDS (Breakfast, Lunch, Dinner)
                    // ==========================================
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        val activeDayPlan = mealPlans[selectedDay] ?: DayMealPlan()

                        Text(
                            text = "MEALS FOR ${selectedDay.fullName.uppercase()}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.Gray,
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.padding(start = 4.dp)
                        )

                        // BREAKFAST SLOT
                        MealCardSlot(
                            slotLabel = "Breakfast",
                            placeholderIcon = "☕",
                            placeholderBg = Color(0xFFEFF6FF),
                            slotColor = Color(0xFF3B82F6),
                            meal = activeDayPlan.breakfast,
                            onPlanClick = {
                                activeSlotToPlan = "breakfast"
                                showRecipeSelector = true
                            },
                            onClearClick = {
                                val currentPlan = mealPlans[selectedDay] ?: DayMealPlan()
                                mealPlans = mealPlans.toMutableMap().apply {
                                    put(selectedDay, currentPlan.copy(breakfast = MealSlot()))
                                }
                            }
                        )

                        // LUNCH SLOT
                        MealCardSlot(
                            slotLabel = "Lunch",
                            placeholderIcon = "🥪",
                            placeholderBg = Color(0xFFFEF3C7),
                            slotColor = Color(0xFFF59E0B),
                            meal = activeDayPlan.lunch,
                            onPlanClick = {
                                activeSlotToPlan = "lunch"
                                showRecipeSelector = true
                            },
                            onClearClick = {
                                val currentPlan = mealPlans[selectedDay] ?: DayMealPlan()
                                mealPlans = mealPlans.toMutableMap().apply {
                                    put(selectedDay, currentPlan.copy(lunch = MealSlot()))
                                }
                            }
                        )

                        // DINNER SLOT
                        MealCardSlot(
                            slotLabel = "Dinner",
                            placeholderIcon = "🍲",
                            placeholderBg = Color(0xFFF3E8FF),
                            slotColor = Color(0xFF8B5CF6),
                            meal = activeDayPlan.dinner,
                            onPlanClick = {
                                activeSlotToPlan = "dinner"
                                showRecipeSelector = true
                            },
                            onClearClick = {
                                val currentPlan = mealPlans[selectedDay] ?: DayMealPlan()
                                mealPlans = mealPlans.toMutableMap().apply {
                                    put(selectedDay, currentPlan.copy(dinner = MealSlot()))
                                }
                            }
                        )
                    }
                }
            }

            // ==========================================
            // RECIPE SELECTOR SHEET (MODAL DIALOG)
            // ==========================================
            if (showRecipeSelector) {
                AlertDialog(
                    onDismissRequest = { showRecipeSelector = false },
                    title = {
                        Text(
                            text = "Choose a Recipe",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp,
                            color = DarkSlate
                        )
                    },
                    text = {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Select a custom meal to coordinate into your ${activeSlotToPlan} routine.",
                                fontSize = 12.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            recipeLibrary.forEach { recipe ->
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    border = BorderStroke(1.dp, BorderSlate),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            val currentPlan = mealPlans[selectedDay] ?: DayMealPlan()
                                            val newSlot = MealSlot(
                                                recipeTitle = recipe.title,
                                                prepTime = recipe.prepTime,
                                                emoji = recipe.emoji,
                                                imageGradient = recipe.bgGradient
                                            )
                                            val updatedPlan = when (activeSlotToPlan) {
                                                "breakfast" -> currentPlan.copy(breakfast = newSlot)
                                                "lunch" -> currentPlan.copy(lunch = newSlot)
                                                "dinner" -> currentPlan.copy(dinner = newSlot)
                                                else -> currentPlan
                                            }
                                            mealPlans = mealPlans.toMutableMap().apply {
                                                put(selectedDay, updatedPlan)
                                            }
                                            showRecipeSelector = false
                                        }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Box(
                                            contentAlignment = Alignment.Center,
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Brush.linearGradient(recipe.bgGradient))
                                        ) {
                                            Text(text = recipe.emoji, fontSize = 18.sp)
                                        }

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = recipe.title,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = DarkSlate
                                            )
                                            Text(
                                                text = "⏱️ ${recipe.prepTime}",
                                                fontSize = 11.sp,
                                                color = Color.Gray
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    },
                    confirmButton = {},
                    dismissButton = {
                        TextButton(onClick = { showRecipeSelector = false }) {
                            Text("Close", fontWeight = FontWeight.Bold, color = BrandOrange)
                        }
                    },
                    containerColor = Color.White,
                    shape = RoundedCornerShape(24.dp)
                )
            }
        }
    }
}

// ==========================================
// COMPONENT: MEAL CARD SLOT (PLACEHOLDER/ACTIVE)
// ==========================================
@Composable
private fun MealCardSlot(
    slotLabel: String,
    placeholderIcon: String,
    placeholderBg: Color,
    slotColor: Color,
    meal: MealSlot,
    onPlanClick: () -> Unit,
    onClearClick: () -> Unit
) {
    val BorderSlate = Color(0xFFE2E8F0)
    val DarkSlate = Color(0xFF0F172A)

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Label header for the slot
        Text(
            text = slotLabel.uppercase(),
            fontSize = 9.sp,
            fontWeight = FontWeight.Black,
            color = slotColor,
            letterSpacing = 1.sp,
            modifier = Modifier.padding(start = 2.dp)
        )

        if (meal.recipeTitle != null) {
            // RENDER: ACTIVE FILLED MEAL CARD
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, BorderSlate),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        // Beautifully rounded food image placeholder on left
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(50.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    Brush.linearGradient(
                                        meal.imageGradient ?: listOf(Color(0xFFFED7AA), Color(0xFFF97316))
                                    )
                                )
                        ) {
                            Text(text = meal.emoji ?: "🍳", fontSize = 24.sp)
                        }

                        Column {
                            Text(
                                text = meal.recipeTitle,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = DarkSlate,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            // Small Preparation Time Badge
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color(0xFFF1F5F9))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "⏱️ ${meal.prepTime}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Gray
                                )
                            }
                        }
                    }

                    IconButton(onClick = onClearClick) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Remove Meal",
                            tint = Color(0xFFEF4444)
                        )
                    }
                }
            }
        } else {
            // RENDER: COLORFUL PLACEHOLDER CARD
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = placeholderBg.copy(alpha = 0.4f)),
                border = BorderStroke(1.dp, slotColor.copy(alpha = 0.2f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onPlanClick() }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(placeholderBg)
                    ) {
                        Text(text = placeholderIcon, fontSize = 18.sp)
                    }

                    Column {
                        Text(
                            text = "Tap to plan your ${slotLabel.lowercase()}...",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = slotColor
                        )
                        Text(
                            text = "Select from library or auto-plan",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}
