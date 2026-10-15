package com.curationkitchen.app.data

import android.util.Log
import com.curationkitchen.app.network.CurationKitchenApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

/**
 * Custom Exception thrown when server returns 403 PREMIUM_REQUIRED
 */
class PremiumRequiredException(
    val code: String = "PREMIUM_REQUIRED",
    override val message: String = "Free tier limit reached. Premium subscription required."
) : Exception(message)

/**
 * Repository class that fetches pantry data from the network,
 * maintains in-memory mutable state cache lists (StateFlow),
 * listens for '403 PREMIUM_REQUIRED' network errors,
 * controls paywall slide presentation state, and auto-retries blocked AI recipe requests.
 */
class PantryRepository(
    private val apiService: CurationKitchenApiService
) {
    companion object {
        private const val TAG = "PantryRepository"
    }

    // In-memory mutable state cache list
    private val _pantryCache = MutableStateFlow<List<PantryItem>>(emptyList())
    val pantryCache: StateFlow<List<PantryItem>> = _pantryCache.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isImporting = MutableStateFlow(false)
    val isImporting: StateFlow<Boolean> = _isImporting.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Controls whether PaywallScreen.kt should slide open
    private val _showPaywall = MutableStateFlow(false)
    val showPaywall: StateFlow<Boolean> = _showPaywall.asStateFlow()

    // Stores the blocked AI recipe import request to re-run upon subscription purchase
    private val _pendingImportRequest = MutableStateFlow<RecipeImportRequest?>(null)
    val pendingImportRequest: StateFlow<RecipeImportRequest?> = _pendingImportRequest.asStateFlow()

    // Track recently imported recipe result for UI feedback
    private val _lastImportedRecipe = MutableStateFlow<RecipeIngestResponse?>(null)
    val lastImportedRecipe: StateFlow<RecipeIngestResponse?> = _lastImportedRecipe.asStateFlow()

    /**
     * Fetches pantry data from /api/pantry and updates in-memory cache smoothly
     */
    suspend fun fetchPantryData(): Result<List<PantryItem>> = withContext(Dispatchers.IO) {
        _isLoading.value = true
        _errorMessage.value = null
        try {
            val items = apiService.getPantryList()
            _pantryCache.value = items
            Result.success(items)
        } catch (e: Exception) {
            val err = e.localizedMessage ?: "Failed to fetch pantry data"
            _errorMessage.value = err
            Result.failure(e)
        } finally {
            _isLoading.value = false
        }
    }

    /**
     * Pushes raw blog text to /api/recipes/ingest for Gemini parsing and auto-seeding.
     * Listens for '403 PREMIUM_REQUIRED' error from Node.js server.
     */
    suspend fun parseAndSeedRecipe(
        rawBlogText: String,
        recipeName: String? = null,
        isPremium: Boolean = false,
        simulateLimit: Boolean = false
    ): Result<RecipeIngestResponse> = withContext(Dispatchers.IO) {
        _isImporting.value = true
        _isLoading.value = true
        _errorMessage.value = null

        val request = RecipeImportRequest(rawBlogText = rawBlogText, recipeName = recipeName)

        try {
            val subscriptionTier = if (isPremium) "premium" else "free"
            val simLimitHeader = if (simulateLimit) "true" else null

            val response = apiService.importRawBlogText(
                request = request,
                subscriptionTier = subscriptionTier,
                simulateLimit = simLimitHeader
            )

            // 1. ERROR HANDLING: Detect '403 PREMIUM_REQUIRED'
            if (response.code() == 403) {
                val errorBodyStr = response.errorBody()?.string() ?: ""
                Log.w(TAG, "Server responded with 403 Forbidden: $errorBodyStr")

                val isPremiumRequired = errorBodyStr.contains("PREMIUM_REQUIRED") || errorBodyStr.isEmpty()
                if (isPremiumRequired) {
                    // Save blocked request for auto-retry
                    _pendingImportRequest.value = request

                    // Reset loading spinners immediately so no frozen UI elements occur
                    _isLoading.value = false
                    _isImporting.value = false
                    _errorMessage.value = null

                    // 2. PAYWALL NAVIGATION: Immediately trigger paywall slide open
                    _showPaywall.value = true
                    Log.i(TAG, "403 PREMIUM_REQUIRED detected! Stored blocked request and slid open PaywallScreen.")

                    return@withContext Result.failure(
                        PremiumRequiredException(message = "Free limit reached. Upgrade to unlock unlimited AI recipe imports.")
                    )
                }
            }

            if (response.isSuccessful && response.body() != null) {
                val result = response.body()!!
                _lastImportedRecipe.value = result
                _pendingImportRequest.value = null
                // Re-fetch pantry list to reflect newly seeded ingredients in the cache
                fetchPantryData()
                Result.success(result)
            } else {
                val err = "Parsing failed with HTTP code ${response.code()}"
                _errorMessage.value = err
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            val err = e.localizedMessage ?: "Network error during recipe ingestion"
            _errorMessage.value = err
            Result.failure(e)
        } finally {
            _isLoading.value = false
            _isImporting.value = false
        }
    }

    /**
     * 4. SUCCESS LOGIC: Re-runs the blocked AI recipe import request immediately in the background
     */
    suspend fun retryPendingImport(isPremium: Boolean = true): Result<RecipeIngestResponse>? = withContext(Dispatchers.IO) {
        val blockedRequest = _pendingImportRequest.value
        if (blockedRequest == null) {
            Log.d(TAG, "No blocked import request found to retry.")
            return@withContext null
        }

        Log.i(TAG, "Auto-retrying blocked AI recipe import in the background with premium=$isPremium...")
        _isImporting.value = true
        _isLoading.value = true
        _errorMessage.value = null

        try {
            val response = apiService.importRawBlogText(
                request = blockedRequest,
                subscriptionTier = if (isPremium) "premium" else "free",
                simulateLimit = null
            )

            if (response.isSuccessful && response.body() != null) {
                val result = response.body()!!
                _lastImportedRecipe.value = result
                _pendingImportRequest.value = null // Clear blocked request on success
                Log.i(TAG, "Blocked recipe import re-run succeeded! Recipe ID: ${result.recipeId}")

                // Synchronize pantry data
                fetchPantryData()
                Result.success(result)
            } else {
                val err = "Retry failed with HTTP ${response.code()}"
                Log.e(TAG, err)
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error while retrying blocked recipe import: ${e.message}", e)
            Result.failure(e)
        } finally {
            _isLoading.value = false
            _isImporting.value = false
        }
    }

    /**
     * 3. DISMISS LOGIC: Smoothly dismiss the paywall and reset all spinners
     * to return the user to their exact previous screen on the Culinary Workspace Grid.
     */
    fun dismissPaywall() {
        Log.d(TAG, "Dismissing paywall and resetting all spinners/loading states.")
        _showPaywall.value = false
        _isLoading.value = false
        _isImporting.value = false
        _errorMessage.value = null
    }

    /**
     * Manually update or seed the local in-memory state cache
     */
    fun updateStateCache(newItems: List<PantryItem>) {
        _pantryCache.value = newItems
    }
}
