package com.curationkitchen.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.curationkitchen.app.data.PantryRepository
import com.curationkitchen.app.monetization.BillingRepository
import com.curationkitchen.app.monetization.PaywallScreen
import com.curationkitchen.app.network.CurationKitchenApiService
import com.curationkitchen.app.onboarding.OnboardingScreen
import com.curationkitchen.app.ui.theme.CurationKitchenTheme
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

// DataStore persistence & UserPreferences are defined in UserPreferences.kt


/**
 * MainActivity serves as the primary entry point for Curation Kitchen's Android app.
 * Configures the Navigation Host controlling the transition from Onboarding to Home.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val userPrefs = UserPreferences(this)
        setContent {
            CurationKitchenTheme {
                CurationKitchenApp(userPreferences = userPrefs)
            }
        }
    }
}

// ============================================================================
// NAVIGATION HOST CONTROLLER
// ============================================================================

@Composable
fun CurationKitchenApp(userPreferences: UserPreferences? = null) {
    val navController = rememberNavController()
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // Shared repositories for offline/online synchronization and billing
    val apiService = remember { CurationKitchenApiService.create() }
    val pantryRepository = remember { PantryRepository(apiService) }
    val billingRepository = remember { BillingRepository(context, coroutineScope) }

    NavHost(
        navController = navController,
        startDestination = "onboarding_route"
    ) {
        // Screen 1: Personalization Onboarding Wizard
        composable("onboarding_route") {
            OnboardingScreen(
                userPreferences = userPreferences,
                onOnboardingComplete = {
                    navController.navigate("home_route") {
                        popUpTo("onboarding_route") { inclusive = true }
                    }
                }
            )
        }

        // Screen 2: Curation Kitchen Home Workspace Grid
        composable("home_route") {
            HomeScreen(
                userPreferences = userPreferences,
                pantryRepository = pantryRepository,
                billingRepository = billingRepository,
                onNavigate = { route ->
                    if (route != "home_route") {
                        navController.navigate(route)
                    }
                }
            )
        }

        // 2. PAYWALL NAVIGATION: Dedicated Paywall Route
        composable("paywall_route") {
            PaywallScreen(
                onUnlockClick = {
                    // 4. SUCCESS LOGIC: Automatically update subscription StateFlow to true
                    billingRepository.simulateSuccessfulPurchase()
                    // Dismiss paywall
                    pantryRepository.dismissPaywall()
                    // Re-run blocked AI recipe import request immediately in background
                    coroutineScope.launch {
                        pantryRepository.retryPendingImport(isPremium = true)
                    }
                    navController.popBackStack()
                },
                onRestoreClick = {
                    billingRepository.simulateSuccessfulPurchase()
                    pantryRepository.dismissPaywall()
                    coroutineScope.launch {
                        pantryRepository.retryPendingImport(isPremium = true)
                    }
                    navController.popBackStack()
                },
                onCloseClick = {
                    // 3. DISMISS LOGIC: If tapped, it must smoothly return the user to their exact previous screen
                    // on the Culinary Workspace Grid without any infinite loading spinners or frozen UI elements.
                    pantryRepository.dismissPaywall()
                    navController.popBackStack()
                }
            )
        }

        // Placeholder Destinations
        composable("add_recipe_screen") { PlaceholderScreen("Add / Search Recipe") }
        composable("search_collections") { PlaceholderScreen("Search Collections") }
        composable("favorites") { PlaceholderScreen("Favorites") }
        composable("categories") { PlaceholderScreen("Categories") }
        composable("pantry_hub") {
            PantryHub(
                pantryRepository = pantryRepository,
                onBack = { navController.popBackStack() }
            )
        }
        composable("planner") {
            MealPlanner(
                onBack = { navController.popBackStack() }
            )
        }
        composable("nutrition") { PlaceholderScreen("Nutrition Dashboard") }
    }
}

@Composable
private fun PlaceholderScreen(title: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFAF6EE)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF2C2A29)
        )
    }
}
