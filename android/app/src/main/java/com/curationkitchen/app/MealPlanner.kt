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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Star
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
import com.curationkitchen.app.data.DayOfWeek
import com.curationkitchen.app.data.MealSlot
import com.curationkitchen.app.ui.theme.Buttercream
import com.curationkitchen.app.ui.theme.CharcoalText
import com.curationkitchen.app.ui.theme.MutedText
import com.curationkitchen.app.ui.theme.OutlineCream
import com.curationkitchen.app.ui.theme.SageGreen
import com.curationkitchen.app.ui.theme.SurfaceVariantCream
import com.curationkitchen.app.ui.theme.TerracottaOrange

data class ScheduledMeal(
    val recipeTitle: String,
    val prepTime: String,
    val calories: Int,
    val isHighProtein: Boolean = true
)

/**
 * MealPlanner represents the native Jetpack Compose Editorial Meal Planner:
 * 1. Top Section Header: Clean SageGreen header card with "Editorial Meal Planner" and back-arrow navigation.
 * 2. Weekly Calendar Slider: Horizontally scrollable LazyRow with cards for Monday through Sunday in Buttercream,
 *    highlighting the active day with a subtle TerracottaOrange border.
 * 3. Daily Meal Slots: Vertical layout with "BREAKFAST", "LUNCH", and "DINNER" cards using bold TerracottaOrange headings.
 * 4. Recipe Targets: Dotted / clean-bordered drop area displaying "+ Schedule Recipe", matching the web UI style.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealPlanner(
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedDay by remember { mutableStateOf(DayOfWeek.MONDAY) }

    // In-memory weekly meal plan schedule for dynamic editing and interactive targets
    val weeklyPlan = remember {
        mutableStateMapOf<Pair<DayOfWeek, MealSlot>, ScheduledMeal?>(
            Pair(DayOfWeek.MONDAY, MealSlot.BREAKFAST) to ScheduledMeal("Avocado & Poached Egg Tartine", "15 mins", 380, true),
            Pair(DayOfWeek.MONDAY, MealSlot.LUNCH) to ScheduledMeal("Summer Heirloom Bruschetta Bowl", "20 mins", 520, true),
            Pair(DayOfWeek.MONDAY, MealSlot.DINNER) to ScheduledMeal("Pan-Seared Salmon with Basil Oil", "25 mins", 640, true),
            Pair(DayOfWeek.TUESDAY, MealSlot.BREAKFAST) to ScheduledMeal("Greek Yogurt & Berry Chia Crunch", "10 mins", 340, true),
            Pair(DayOfWeek.TUESDAY, MealSlot.LUNCH) to null,
            Pair(DayOfWeek.TUESDAY, MealSlot.DINNER) to ScheduledMeal("Creamy Polenta & Wild Mushrooms", "30 mins", 580, false),
            Pair(DayOfWeek.WEDNESDAY, MealSlot.BREAKFAST) to null,
            Pair(DayOfWeek.WEDNESDAY, MealSlot.LUNCH) to ScheduledMeal("Warm Lentil & Roasted Beet Salad", "20 mins", 460, true),
            Pair(DayOfWeek.WEDNESDAY, MealSlot.DINNER) to null
        )
    }

    // Modal/Dialog state for scheduling a new recipe into an empty target slot
    var activeSlotToSchedule by remember { mutableStateOf<MealSlot?>(null) }

    val sampleRecipesToSchedule = remember {
        listOf(
            ScheduledMeal("Pan-Seared Salmon with Basil Oil", "25 mins", 640, true),
            ScheduledMeal("Summer Heirloom Bruschetta", "20 mins", 520, true),
            ScheduledMeal("Creamy Polenta & Wild Mushrooms", "30 mins", 580, false),
            ScheduledMeal("Mediterranean Chickpea & Herb Skillet", "18 mins", 480, true),
            ScheduledMeal("Whipped Ricotta & Slow-Roasted Tomatoes", "15 mins", 390, false)
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Background Wallpaper
        Image(
            painter = painterResource(id = android.R.drawable.ic_menu_gallery),
            contentDescription = "Culinary Backdrop",
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
                            Color.Black.copy(alpha = 0.58f),
                            Color.Black.copy(alpha = 0.76f),
                            Color.Black.copy(alpha = 0.94f)
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
            // 1. TOP SECTION HEADER: SAGEGREEN BACKGROUND
            // ================================================================
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SageGreen,
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
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
                                text = "Editorial Meal Planner",
                                fontSize = 19.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White,
                                letterSpacing = (-0.3).sp
                            )
                            Text(
                                text = "The Smart Digital Culinary Assistant",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White.copy(alpha = 0.85f)
                            )
                        }
                    }

                    // Week Badge
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
                                imageVector = Icons.Default.DateRange,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(5.dp))
                            Text(
                                text = "WEEK 38",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // ================================================================
            // 2. WEEKLY CALENDAR SLIDER: HORIZONTALLY SCROLLABLE LAZYROW
            // ================================================================
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 6.dp)
            ) {
                Text(
                    text = "Weekly Schedule",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )

                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(DayOfWeek.values()) { day ->
                        val isSelected = selectedDay == day

                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Buttercream else Buttercream.copy(alpha = 0.85f)
                            ),
                            border = androidx.compose.foundation.BorderStroke(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) TerracottaOrange else OutlineCream
                            ),
                            elevation = CardDefaults.cardElevation(
                                defaultElevation = if (isSelected) 4.dp else 1.dp
                            ),
                            modifier = Modifier
                                .width(78.dp)
                                .height(82.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .clickable { selectedDay = day }
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(vertical = 10.dp, horizontal = 6.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = day.shortName.uppercase(),
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                                    color = if (isSelected) TerracottaOrange else MutedText,
                                    letterSpacing = 0.5.sp
                                )

                                Text(
                                    text = when (day) {
                                        DayOfWeek.MONDAY -> "15"
                                        DayOfWeek.TUESDAY -> "16"
                                        DayOfWeek.WEDNESDAY -> "17"
                                        DayOfWeek.THURSDAY -> "18"
                                        DayOfWeek.FRIDAY -> "19"
                                        DayOfWeek.SATURDAY -> "20"
                                        DayOfWeek.SUNDAY -> "21"
                                    },
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = CharcoalText
                                )

                                // Active Day Status Dot
                                Box(
                                    modifier = Modifier
                                        .size(5.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (isSelected) TerracottaOrange else Color.Transparent
                                        )
                                )
                            }
                        }
                    }
                }
            }

            // ================================================================
            // 3. DAILY MEAL SLOTS: BREAKFAST, LUNCH, DINNER
            // ================================================================
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(top = 10.dp, bottom = 28.dp)
            ) {
                // Active Day Indicator Banner
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${selectedDay.displayName}'s Editorial Menu",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = SageGreen.copy(alpha = 0.22f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, SageGreen)
                        ) {
                            Text(
                                text = "NUTRITION SYNCED",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFA8E0A3),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }

                // Three Meal Slot Cards
                items(listOf(MealSlot.BREAKFAST, MealSlot.LUNCH, MealSlot.DINNER)) { slot ->
                    val meal = weeklyPlan[Pair(selectedDay, slot)]

                    MealSlotCard(
                        slot = slot,
                        scheduledMeal = meal,
                        onScheduleClick = { activeSlotToSchedule = slot },
                        onRemoveClick = { weeklyPlan[Pair(selectedDay, slot)] = null }
                    )
                }
            }
        }

        // ================================================================
        // 4. SCHEDULE RECIPE BOTTOM SHEET / DIALOG
        // ================================================================
        if (activeSlotToSchedule != null) {
            val targetSlot = activeSlotToSchedule!!
            AlertDialog(
                onDismissRequest = { activeSlotToSchedule = null },
                containerColor = Buttercream,
                shape = RoundedCornerShape(20.dp),
                title = {
                    Column {
                        Text(
                            text = "Schedule for ${targetSlot.displayName}",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = CharcoalText
                        )
                        Text(
                            text = "${selectedDay.displayName} • Select recipe target",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MutedText
                        )
                    }
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        sampleRecipesToSchedule.forEach { recipe ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = SurfaceVariantCream,
                                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable {
                                        weeklyPlan[Pair(selectedDay, targetSlot)] = recipe
                                        activeSlotToSchedule = null
                                    }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = recipe.recipeTitle,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = CharcoalText,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = "${recipe.prepTime} • ${recipe.calories} kcal",
                                            fontSize = 10.sp,
                                            color = MutedText
                                        )
                                    }

                                    Icon(
                                        imageVector = Icons.Default.Add,
                                        contentDescription = "Select",
                                        tint = TerracottaOrange,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { activeSlotToSchedule = null }) {
                        Text("CANCEL", color = TerracottaOrange, fontWeight = FontWeight.Bold)
                    }
                }
            )
        }
    }
}

/**
 * MealSlotCard:
 * - Buttercream container
 * - Bold TerracottaOrange heading for "BREAKFAST", "LUNCH", "DINNER"
 * - Dotted/clean bordered drop area with "+ Schedule Recipe" or assigned recipe target
 */
@Composable
fun MealSlotCard(
    slot: MealSlot,
    scheduledMeal: ScheduledMeal?,
    onScheduleClick: () -> Unit,
    onRemoveClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Buttercream),
        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Meal Slot Heading: TerracottaOrange bold heading
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = slot.displayName.uppercase(),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = TerracottaOrange,
                    letterSpacing = 1.sp
                )

                if (scheduledMeal != null) {
                    Text(
                        text = "${scheduledMeal.calories} KCAL",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MutedText
                    )
                }
            }

            // Recipe Target Area
            if (scheduledMeal != null) {
                // Scheduled Recipe Card Target Area
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = SurfaceVariantCream,
                    border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = scheduledMeal.recipeTitle,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = CharcoalText,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = SageGreen.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = scheduledMeal.prepTime,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = SageGreen,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }

                                if (scheduledMeal.isHighProtein) {
                                    Text(
                                        text = "High-Protein Prep",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MutedText
                                    )
                                }
                            }
                        }

                        // Remove / Change button
                        IconButton(
                            onClick = onRemoveClick,
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.7f))
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove recipe",
                                tint = MutedText,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            } else {
                // Clean bordered drop area displaying "+ Schedule Recipe" option matching web UI
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(68.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(SurfaceVariantCream.copy(alpha = 0.5f))
                        .border(
                            width = 1.2.dp,
                            color = OutlineCream,
                            shape = RoundedCornerShape(14.dp)
                        )
                        .clickable { onScheduleClick() },
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            tint = TerracottaOrange,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "+ Schedule Recipe",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TerracottaOrange
                        )
                    }
                }
            }
        }
    }
}

/**
 * Screen Alias for NavHost interoperability
 */
@Composable
fun MealPlannerScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    MealPlanner(onBack = onBack, modifier = modifier)
}
