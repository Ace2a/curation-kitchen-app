package com.curationkitchen.app.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.curationkitchen.app.UserPreferences
import com.curationkitchen.app.ui.theme.Buttercream
import com.curationkitchen.app.ui.theme.CharcoalText
import com.curationkitchen.app.ui.theme.MutedText
import com.curationkitchen.app.ui.theme.OutlineCream
import com.curationkitchen.app.ui.theme.SageGreen
import com.curationkitchen.app.ui.theme.TerracottaOrange
import kotlinx.coroutines.launch

/**
 * OnboardingScreen is a dynamic 3-step mobile personalization wizard for Curation Kitchen.
 *
 * Steps:
 * 1. Age range
 * 2. Biological sex
 * 3. Culinary goals
 *
 * Writes collected data back to preferencesDataStore via UserPreferences on completion.
 */
@OptIn(ExperimentalAnimationApi::class)
@Composable
fun OnboardingScreen(
    userPreferences: UserPreferences? = null,
    onOnboardingComplete: () -> Unit = {}
) {
    val coroutineScope = rememberCoroutineScope()
    var currentStep by remember { mutableIntStateOf(1) }

    // Selected preferences state
    var selectedAgeRange by remember { mutableStateOf("26-40") }
    var selectedBiologicalSex by remember { mutableStateOf("Female") }
    var selectedGoal by remember { mutableStateOf("🍳 Learn to Cook") }

    Scaffold(
        containerColor = Buttercream,
        topBar = {
            HeaderBar(
                currentStep = currentStep,
                onBackClick = { if (currentStep > 1) currentStep-- },
                onSkipClick = onOnboardingComplete
            )
        },
        bottomBar = {
            BottomBar(
                currentStep = currentStep,
                totalSteps = 3,
                onNextClick = {
                    if (currentStep < 3) {
                        currentStep++
                    } else {
                        coroutineScope.launch {
                            userPreferences?.saveUserProfile(
                                age = selectedAgeRange,
                                sex = selectedBiologicalSex,
                                goal = selectedGoal
                            )
                            onOnboardingComplete()
                        }
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    if (targetState > initialState) {
                        (slideInHorizontally { width -> width } + fadeIn()).togetherWith(
                            slideOutHorizontally { width -> -width } + fadeOut()
                        )
                    } else {
                        (slideInHorizontally { width -> -width } + fadeIn()).togetherWith(
                            slideOutHorizontally { width -> width } + fadeOut()
                        )
                    }
                },
                label = "OnboardingStepCarousel"
            ) { step ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 24.dp, vertical = 12.dp)
                ) {
                    when (step) {
                        1 -> AgeRangeStep(
                            selected = selectedAgeRange,
                            onSelect = { selectedAgeRange = it }
                        )

                        2 -> BiologicalSexStep(
                            selected = selectedBiologicalSex,
                            onSelect = { selectedBiologicalSex = it }
                        )

                        3 -> CulinaryGoalsStep(
                            selected = selectedGoal,
                            onSelect = { selectedGoal = it }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HeaderBar(
    currentStep: Int,
    onBackClick: () -> Unit,
    onSkipClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (currentStep > 1) {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = CharcoalText
                )
            }
        } else {
            Spacer(modifier = Modifier.width(48.dp))
        }

        Text(
            text = "CURATION KITCHEN",
            fontSize = 11.sp,
            fontWeight = FontWeight.Black,
            color = TerracottaOrange,
            letterSpacing = 2.sp
        )

        TextButton(onClick = onSkipClick) {
            Text(
                text = "Skip",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = MutedText
            )
        }
    }
}

@Composable
private fun BottomBar(
    currentStep: Int,
    totalSteps: Int,
    onNextClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        // Step Indicator Dots
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            for (i in 1..totalSteps) {
                val isActive = i == currentStep
                val width by animateDpAsState(
                    targetValue = if (isActive) 28.dp else 8.dp,
                    animationSpec = tween(durationMillis = 300),
                    label = "DotWidth"
                )
                val color by animateColorAsState(
                    targetValue = if (isActive) TerracottaOrange else OutlineCream,
                    animationSpec = tween(durationMillis = 300),
                    label = "DotColor"
                )

                Box(
                    modifier = Modifier
                        .height(8.dp)
                        .width(width)
                        .clip(RoundedCornerShape(50.dp))
                        .background(color)
                )
            }
        }

        // Solid TerracottaOrange Wide Pill Button
        Button(
            onClick = onNextClick,
            shape = RoundedCornerShape(50.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = TerracottaOrange,
                contentColor = Color.White
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = if (currentStep == totalSteps) "Get Started" else "Next",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

// ==========================================
// STEP 1: AGE RANGE
// ==========================================

@Composable
private fun AgeRangeStep(
    selected: String,
    onSelect: (String) -> Unit
) {
    val options = listOf(
        AgeOption("18-25", "Young Adult", "Quick meal prep & high energy baselines"),
        AgeOption("26-40", "Prime Active", "Balanced nutrition for busy lifestyle"),
        AgeOption("41-60", "Mature Balance", "Heart-healthy & nutrient-dense meals"),
        AgeOption("61+", "Senior Wellness", "Nourishing, easily digestible meals")
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "What is your age range?",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = CharcoalText,
            lineHeight = 32.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "We use this to calibrate nutritional baselines & portion guidance.",
            fontSize = 14.sp,
            color = MutedText,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(28.dp))

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            options.forEach { option ->
                SelectablePillRow(
                    title = option.range,
                    subtitle = "${option.label} • ${option.desc}",
                    isSelected = selected == option.range,
                    onSelect = { onSelect(option.range) }
                )
            }
        }
    }
}

private data class AgeOption(val range: String, val label: String, val desc: String)

// ==========================================
// STEP 2: BIOLOGICAL SEX
// ==========================================

@Composable
private fun BiologicalSexStep(
    selected: String,
    onSelect: (String) -> Unit
) {
    val options = listOf(
        SexOption("Female", "Calibrates micronutrients, iron & metabolic baseline"),
        SexOption("Male", "Calibrates protein synthesis & caloric target baseline"),
        SexOption("Prefer not to say", "Uses standard balanced demographic baselines")
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Select biological sex",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = CharcoalText,
            lineHeight = 32.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Essential for personalized macro targets and caloric intake goals.",
            fontSize = 14.sp,
            color = MutedText,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(28.dp))

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            options.forEach { option ->
                SelectablePillRow(
                    title = option.title,
                    subtitle = option.subtitle,
                    isSelected = selected == option.title,
                    onSelect = { onSelect(option.title) }
                )
            }
        }
    }
}

private data class SexOption(val title: String, val subtitle: String)

// ==========================================
// STEP 3: CULINARY GOALS
// ==========================================

@Composable
private fun CulinaryGoalsStep(
    selected: String,
    onSelect: (String) -> Unit
) {
    val options = listOf(
        GoalOption("🍳 Learn to Cook", "Master kitchen fundamentals & core techniques"),
        GoalOption("🌍 Explore Cultures", "Discover authentic global recipes & flavors"),
        GoalOption("⏱️ Quick Meals", "30-minute delicious recipes for busy schedules"),
        GoalOption("💪 Macro Tracking", "Tailored high-protein & balanced nutrition plans"),
        GoalOption("🌱 Zero Waste", "Maximize pantry shelf items to reduce food waste")
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Choose your culinary goal",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = CharcoalText,
            lineHeight = 32.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Your daily recommendations and recipe feed will highlight this focus.",
            fontSize = 14.sp,
            color = MutedText,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(28.dp))

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            options.forEach { option ->
                SelectablePillRow(
                    title = option.title,
                    subtitle = option.subtitle,
                    isSelected = selected == option.title,
                    onSelect = { onSelect(option.title) }
                )
            }
        }
    }
}

private data class GoalOption(val title: String, val subtitle: String)

// ==========================================
// REUSABLE SELECTION ROW CONTROL (Rounded Pill Surfaces)
// ==========================================

@Composable
private fun SelectablePillRow(
    title: String,
    subtitle: String? = null,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    val backgroundColor by animateColorAsState(
        targetValue = if (isSelected) SageGreen.copy(alpha = 0.15f) else Color.White,
        animationSpec = tween(durationMillis = 250),
        label = "PillBg"
    )

    val borderColor by animateColorAsState(
        targetValue = if (isSelected) SageGreen else OutlineCream,
        animationSpec = tween(durationMillis = 250),
        label = "PillBorder"
    )

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = backgroundColor,
        border = androidx.compose.foundation.BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = borderColor
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onSelect() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                    color = CharcoalText
                )
                if (!subtitle.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = subtitle,
                        fontSize = 12.sp,
                        color = MutedText,
                        lineHeight = 16.sp
                    )
                }
            }

            if (isSelected) {
                Spacer(modifier = Modifier.width(12.dp))
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(SageGreen),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Selected",
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}
