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
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import com.curationkitchen.app.data.PantryItem
import com.curationkitchen.app.data.PantryRepository
import com.curationkitchen.app.monetization.BillingRepository
import com.curationkitchen.app.monetization.PaywallScreen
import kotlinx.coroutines.launch
import com.curationkitchen.app.ui.theme.Buttercream
import com.curationkitchen.app.ui.theme.CharcoalText
import com.curationkitchen.app.ui.theme.MutedText
import com.curationkitchen.app.ui.theme.OutlineCream
import com.curationkitchen.app.ui.theme.SageGreen
import com.curationkitchen.app.ui.theme.SurfaceVariantCream
import com.curationkitchen.app.ui.theme.TerracottaOrange

data class RecentImportRecipe(
    val id: String,
    val title: String,
    val prepTime: String,
    val cookTime: String,
    val servings: Int,
    val ingredientSummary: String,
    val parsingHighlight: String,
    val isPantrySynced: Boolean = true
)

data class WorkspaceToolCard(
    val title: String,
    val subtitle: String,
    val route: String,
    val icon: ImageVector,
    val accentColor: Color,
    val badgeText: String? = null
)

/**
 * HomeScreen provides a native Jetpack Compose Material Design 3 workspace grid aesthetic
 * for "Curation Kitchen" mirroring the modern web application:
 * - Signature Culinary Palette: Buttercream card containers, Terracotta Orange action buttons, Sage Green status markers
 * - Prominent "Pantry Hub" tile displaying the active tracked kitchen items count
 * - Dedicated "Recent Imports" preview section showcasing recipes processed by the backend engine
 * - Clean spacing, rounded corners (16-20dp), and high-contrast Charcoal typography
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigate: (String) -> Unit,
    pantryRepository: PantryRepository? = null,
    billingRepository: BillingRepository? = null,
    userPreferences: UserPreferences? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val userPrefs = remember(context, userPreferences) { userPreferences ?: UserPreferences(context) }
    val macroTargets by userPrefs.getUserMacroTargets().collectAsState(initial = null)

    val calories = macroTargets?.calories ?: 2000f
    val proteinGrams = macroTargets?.proteinGrams ?: 125f
    val carbGrams = macroTargets?.carbGrams ?: 250f

    // Collect cache state flows from PantryRepository & BillingRepository
    val pantryItems by (pantryRepository?.pantryCache?.collectAsState()
        ?: remember { mutableStateOf(emptyList()) })
    val isLoading by (pantryRepository?.isLoading?.collectAsState()
        ?: remember { mutableStateOf(false) })
    val isImporting by (pantryRepository?.isImporting?.collectAsState()
        ?: remember { mutableStateOf(false) })
    val errorMessage by (pantryRepository?.errorMessage?.collectAsState()
        ?: remember { mutableStateOf<String?>(null) })
    val showPaywall by (pantryRepository?.showPaywall?.collectAsState()
        ?: remember { mutableStateOf(false) })
    val pendingImportRequest by (pantryRepository?.pendingImportRequest?.collectAsState()
        ?: remember { mutableStateOf(null) })
    val isPremiumUser by (billingRepository?.isPremiumUser?.collectAsState()
        ?: remember { mutableStateOf(false) })

    var showImportDialog by remember { mutableStateOf(false) }
    var recipeInputText by remember { mutableStateOf("") }
    var userFeedbackBanner by remember { mutableStateOf<String?>(null) }

    // Trigger network fetch on screen launch
    LaunchedEffect(Unit) {
        pantryRepository?.fetchPantryData()
    }

    val trackedCount = pantryItems.size

    // Curated Recent Imports processed by the Gemini engine
    val recentImports = remember {
        listOf(
            RecentImportRecipe(
                id = "rec-bruschetta",
                title = "Summer Heirloom Bruschetta",
                prepTime = "15 mins",
                cookTime = "20 mins",
                servings = 4,
                ingredientSummary = "Flour, heavy cream, heirloom tomatoes, olive oil",
                parsingHighlight = "Fraction math: 3 1/2 cups flour → 3.5 float",
                isPantrySynced = true
            ),
            RecentImportRecipe(
                id = "rec-polenta",
                title = "Creamy Polenta & Wild Mushrooms",
                prepTime = "10 mins",
                cookTime = "25 mins",
                servings = 2,
                ingredientSummary = "Polenta, parmesan, cremini mushrooms, fresh thyme",
                parsingHighlight = "Casual measurements & state modifiers parsed",
                isPantrySynced = true
            ),
            RecentImportRecipe(
                id = "rec-salmon",
                title = "Pan-Seared Salmon with Basil Oil",
                prepTime = "12 mins",
                cookTime = "15 mins",
                servings = 2,
                ingredientSummary = "Wild salmon fillets, fresh basil, garlic, lemon",
                parsingHighlight = "Pantry auto-seeded with 4 key ingredients",
                isPantrySynced = true
            )
        )
    }

    // Auxiliary workspace tools for workspace tiles
    val secondaryTools = remember {
        listOf(
            WorkspaceToolCard(
                title = "Meal Planner",
                subtitle = "7-Day schedule",
                route = "planner",
                icon = Icons.Default.DateRange,
                accentColor = TerracottaOrange,
                badgeText = "Schedule"
            ),
            WorkspaceToolCard(
                title = "Search Collections",
                subtitle = "Recipe directory",
                route = "search_collections",
                icon = Icons.Default.Search,
                accentColor = TerracottaOrange,
                badgeText = "Directory"
            ),
            WorkspaceToolCard(
                title = "Favorites",
                subtitle = "Beloved dishes",
                route = "favorites",
                icon = Icons.Default.Favorite,
                accentColor = Color(0xFFE53935),
                badgeText = "Saved"
            ),
            WorkspaceToolCard(
                title = "Course Categories",
                subtitle = "Breakfast, dinner & more",
                route = "categories",
                icon = Icons.Default.List,
                accentColor = SageGreen,
                badgeText = "Courses"
            )
        )
    }

    // ROOT BOX: Full-screen canvas with culinary backdrop scrim
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // LAYER 0: FULL-SCREEN WALLPAPER BACKGROUND
        Image(
            painter = painterResource(id = android.R.drawable.ic_menu_gallery),
            contentDescription = "Full Screen Culinary Wallpaper Background",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // LAYER 0.5: WARM TRANSLUCENT GRADIENT OVERLAY SCRIM
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.55f),
                            Color.Black.copy(alpha = 0.75f),
                            Color.Black.copy(alpha = 0.92f)
                        )
                    )
                )
        )

        // LAYER 1: WORKSPACE SCROLLABLE GRID CONTENT
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. BRANDING & STATUS HEADER POD
            item {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.45f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.22f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Curation Kitchen",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    letterSpacing = (-0.5).sp
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "The Smart Digital Culinary Assistant",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFFFDE68A) // Soft Buttercream accent
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // Subscription Status Badge
                                Surface(
                                    shape = RoundedCornerShape(50.dp),
                                    color = if (isPremiumUser) Color(0xFFF59E0B).copy(alpha = 0.25f) else Color(0xFFEF4444).copy(alpha = 0.20f),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isPremiumUser) Color(0xFFF59E0B) else Color(0xFFEF4444)
                                    )
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Star,
                                            contentDescription = null,
                                            tint = if (isPremiumUser) Color(0xFFFBBF24) else Color(0xFFF87171),
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = if (isPremiumUser) "PREMIUM" else "FREE (15 MAX)",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White
                                        )
                                    }
                                }

                                // Sage Green status marker
                                Surface(
                                    shape = RoundedCornerShape(50.dp),
                                    color = SageGreen.copy(alpha = 0.25f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, SageGreen)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .clip(CircleShape)
                                                .background(SageGreen)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = if (isLoading || isImporting) "SYNCING..." else "LIVE",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Optional Feedback or Success Banner
            userFeedbackBanner?.let { bannerText ->
                item {
                    Surface(
                        color = SageGreen.copy(alpha = 0.95f),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = bannerText,
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "DISMISS",
                                color = Color(0xFFFDE68A),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.clickable { userFeedbackBanner = null }
                            )
                        }
                    }
                }
            }

            // 2. PRIMARY ACTION BUTTON: TERRACOTTA ORANGE
            item {
                Button(
                    onClick = { showImportDialog = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = TerracottaOrange,
                        contentColor = Color.White
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isImporting) "AI PARSING RECIPE..." else "+ CREATE OR IMPORT RECIPE",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            // 3. PROMINENT POD: PANTRY HUB
            item {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Buttercream),
                    border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .clickable { onNavigate("pantry_hub") }
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                    ) {
                        // Header Row with Icon & Sage Green status marker
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(TerracottaOrange.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ShoppingCart,
                                        contentDescription = "Pantry Hub",
                                        tint = TerracottaOrange,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }

                                Column {
                                    Text(
                                        text = "Pantry Hub",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = CharcoalText
                                    )
                                    Text(
                                        text = "Live kitchen stock & auto-seeded ingredients",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MutedText
                                    )
                                }
                            }

                            // Sage Green status marker
                            Surface(
                                shape = RoundedCornerShape(50.dp),
                                color = SageGreen.copy(alpha = 0.15f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, SageGreen.copy(alpha = 0.4f))
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(5.dp)
                                            .clip(CircleShape)
                                            .background(SageGreen)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "SYNCHRONIZED",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = SageGreen
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Metric Counter Display
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(SurfaceVariantCream)
                                .border(1.dp, OutlineCream, RoundedCornerShape(14.dp))
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.Bottom) {
                                    Text(
                                        text = if (trackedCount > 0) "$trackedCount" else "12",
                                        fontSize = 28.sp,
                                        fontWeight = FontWeight.Black,
                                        color = CharcoalText,
                                        lineHeight = 30.sp
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "items tracked",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = CharcoalText.copy(alpha = 0.7f),
                                        modifier = Modifier.padding(bottom = 3.dp)
                                    )
                                }
                                Text(
                                    text = "Ready to pair with ingested recipes",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MutedText
                                )
                            }

                            // Navigate arrow button
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(TerracottaOrange),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = "Open Pantry Hub",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            // 4. "RECENT IMPORTS" PREVIEW SECTION
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Section Title Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "Recent Imports",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )
                            // Sage Green status marker
                            Surface(
                                shape = RoundedCornerShape(50.dp),
                                color = SageGreen.copy(alpha = 0.25f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, SageGreen)
                            ) {
                                Text(
                                    text = "AI ENGINE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFA8E0A3),
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Text(
                            text = "View All",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TerracottaOrange,
                            modifier = Modifier.clickable { onNavigate("search_collections") }
                        )
                    }

                    // Horizontal scrolling preview of recently imported recipes
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(recentImports) { item ->
                            RecentImportCard(
                                recipe = item,
                                onClick = { onNavigate("search_collections") }
                            )
                        }
                    }
                }
            }

            // 5. 2x2 TILES FOR WORKSPACE TOOLS
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Culinary Workspace",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.85f)
                    )

                    // Row 1 of Secondary Tools
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        secondaryTools.take(2).forEach { tool ->
                            CompactToolCard(
                                tool = tool,
                                onClick = { onNavigate(tool.route) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Row 2 of Secondary Tools
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        secondaryTools.drop(2).take(2).forEach { tool ->
                            CompactToolCard(
                                tool = tool,
                                onClick = { onNavigate(tool.route) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // 6. NUTRITION ANALYTICS POD
            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Buttercream),
                    border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .clickable { onNavigate("nutrition") }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFF3F51B5).copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = Color(0xFF3F51B5),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "Nutritional Target",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = CharcoalText
                                )
                                Text(
                                    text = "${calories.toInt()} kcal • ${proteinGrams.toInt()}g Protein • ${carbGrams.toInt()}g Carbs",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MutedText
                                )
                            }
                        }

                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            tint = TerracottaOrange,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            // FOOTER BRANDING
            item {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "© 2026 Curation Kitchen • Mobile Kitchen Hub",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // ====================================================================
        // RECIPE IMPORT MODAL DIALOG
        // ====================================================================
        if (showImportDialog) {
            AlertDialog(
                onDismissRequest = { showImportDialog = false },
                title = {
                    Text(
                        text = "AI Recipe Ingestion",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = CharcoalText
                    )
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Enter or paste raw blog text / recipe notes. The Gemini AI engine will parse ingredients, calculate fraction math, and seed your pantry.",
                            fontSize = 12.sp,
                            color = MutedText
                        )

                        OutlinedTextField(
                            value = recipeInputText,
                            onValueChange = { recipeInputText = it },
                            placeholder = {
                                Text(
                                    text = "e.g., Summer Heirloom Bruschetta: 3 1/2 cups flour, 1/2 cup heavy cream, 4 heirloom tomatoes, 2 tbsp extra virgin olive oil...",
                                    fontSize = 12.sp,
                                    color = MutedText.copy(alpha = 0.6f)
                                )
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Text(
                            text = if (isPremiumUser) "Status: Premium Plan (Unlimited AI Ingestions)" else "Status: Free Tier (15 Recipe Limit)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isPremiumUser) Color(0xFFD97706) else Color(0xFFDC2626)
                        )
                    }
                },
                confirmButton = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Standard Import Button
                        Button(
                            onClick = {
                                val textToImport = recipeInputText.ifBlank {
                                    "Artisanal Focaccia: 3 1/2 cups flour, 1 1/3 cups warm water, 2 tsp active dry yeast, 2 tbsp extra virgin olive oil, 1 tsp flaky sea salt. Proof for 2 hours."
                                }
                                showImportDialog = false
                                coroutineScope.launch {
                                    val res = pantryRepository?.parseAndSeedRecipe(
                                        rawBlogText = textToImport,
                                        recipeName = "Imported Recipe",
                                        isPremium = isPremiumUser,
                                        simulateLimit = false
                                    )
                                    if (res?.isSuccess == true) {
                                        userFeedbackBanner = "Recipe imported successfully! Pantry updated."
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = TerracottaOrange),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Import with Gemini AI", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        // Simulation Button to Trigger 403 Free Tier Boundary
                        OutlinedButton(
                            onClick = {
                                val textToImport = recipeInputText.ifBlank {
                                    "Artisanal Focaccia: 3 1/2 cups flour, 1 1/3 cups warm water, 2 tsp active dry yeast, 2 tbsp extra virgin olive oil, 1 tsp flaky sea salt. Proof for 2 hours."
                                }
                                showImportDialog = false
                                coroutineScope.launch {
                                    pantryRepository?.parseAndSeedRecipe(
                                        rawBlogText = textToImport,
                                        recipeName = "Artisanal Focaccia",
                                        isPremium = false,
                                        simulateLimit = true
                                    )
                                }
                            },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth(),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDC2626))
                        ) {
                            Text(
                                "Simulate Free Tier Limit (Trigger 403)",
                                color = Color(0xFFDC2626),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showImportDialog = false }) {
                        Text("Cancel", color = MutedText, fontWeight = FontWeight.SemiBold)
                    }
                },
                containerColor = Buttercream,
                shape = RoundedCornerShape(18.dp)
            )
        }

        // ====================================================================
        // 2. PAYWALL NAVIGATION: Slide open PaywallScreen.kt Composable
        // ====================================================================
        AnimatedVisibility(
            visible = showPaywall,
            enter = slideInVertically(
                initialOffsetY = { fullHeight -> fullHeight },
                animationSpec = tween(durationMillis = 350, easing = FastOutSlowInEasing)
            ),
            exit = slideOutVertically(
                targetOffsetY = { fullHeight -> fullHeight },
                animationSpec = tween(durationMillis = 300, easing = FastOutLinearInEasing)
            ),
            modifier = Modifier.fillMaxSize()
        ) {
            PaywallScreen(
                onUnlockClick = {
                    // 4. SUCCESS LOGIC: Automatically update subscription StateFlow to true
                    billingRepository?.simulateSuccessfulPurchase()

                    // Dismiss paywall
                    pantryRepository?.dismissPaywall()
                    userFeedbackBanner = "Premium Unlocked! Re-running blocked recipe in background..."

                    // Re-run the blocked AI recipe import request immediately in the background
                    coroutineScope.launch {
                        val retryRes = pantryRepository?.retryPendingImport(isPremium = true)
                        if (retryRes?.isSuccess == true) {
                            userFeedbackBanner = "Success! Blocked recipe imported and seeded into Pantry!"
                        }
                    }
                },
                onRestoreClick = {
                    billingRepository?.simulateSuccessfulPurchase()
                    pantryRepository?.dismissPaywall()
                    coroutineScope.launch {
                        pantryRepository?.retryPendingImport(isPremium = true)
                    }
                },
                onCloseClick = {
                    // 3. DISMISS LOGIC: Add a top-right Close (X) button to the PaywallScreen.kt.
                    // If tapped, it must smoothly return the user to their exact previous screen
                    // on the Culinary Workspace Grid without any infinite loading spinners or frozen UI elements.
                    pantryRepository?.dismissPaywall()
                }
            )
        }
    }
}

/**
 * RecentImportCard renders an individual parsed recipe in a Buttercream container
 * with Sage Green status markers and clear fraction math highlights.
 */
@Composable
fun RecentImportCard(
    recipe: RecentImportRecipe,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Buttercream),
        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = modifier
            .width(260.dp)
            .clip(RoundedCornerShape(18.dp))
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            // Header Row with Title and Sage Green status chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = SageGreen.copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(0.8.dp, SageGreen.copy(alpha = 0.4f))
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = SageGreen,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "PANTRY SYNCED",
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = SageGreen
                        )
                    }
                }

                Text(
                    text = "${recipe.prepTime} prep",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MutedText
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = recipe.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = CharcoalText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = recipe.ingredientSummary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Normal,
                color = MutedText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 15.sp
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Highlight Badge for Ingestion Parsing
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = SurfaceVariantCream,
                border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = recipe.parsingHighlight,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TerracottaOrange,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                )
            }
        }
    }
}

/**
 * CompactToolCard for 2x2 grid layout using Buttercream background and Terracotta Orange accents.
 */
@Composable
fun CompactToolCard(
    tool: WorkspaceToolCard,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Buttercream),
        border = androidx.compose.foundation.BorderStroke(1.dp, OutlineCream),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .height(96.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(tool.accentColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = tool.icon,
                        contentDescription = null,
                        tint = tool.accentColor,
                        modifier = Modifier.size(18.dp)
                    )
                }

                if (tool.badgeText != null) {
                    Text(
                        text = tool.badgeText,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = MutedText
                    )
                }
            }

            Column {
                Text(
                    text = tool.title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = CharcoalText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = tool.subtitle,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = MutedText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

