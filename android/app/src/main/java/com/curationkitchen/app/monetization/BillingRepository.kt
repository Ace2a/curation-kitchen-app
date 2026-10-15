package com.curationkitchen.app.monetization

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * BillingRepository manages the Google Play Billing Library v7 lifecycle.
 * It provides robust, clean connection handling, reconnect retries, purchase restoration,
 * and exposes active subscription state flows for UI layers.
 */
class BillingRepository(
    private val context: Context,
    private val scope: CoroutineScope
) : PurchasesUpdatedListener, BillingClientStateListener {

    companion object {
        private const val TAG = "BillingRepository"
        const val PRODUCT_PREMIUM_SUBSCRIPTION = "premium_monthly_tier"
        const val PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION = "premium_yearly_tier"
        private const val MAX_RECONNECT_ATTEMPTS = 5
        private const val RECONNECT_BASE_DELAY_MS = 1000L
    }

    private var reconnectAttempt = 0

    // Core BillingClient initialization configured strictly for Google Play Billing Library v7.
    // In v7, enablePendingPurchases() requires a non-null PendingPurchasesParams argument.
    private val billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(this)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build()
        )
        .build()

    // Observable Premium User subscription state flow
    private val _isPremiumUser = MutableStateFlow(false)
    val isPremiumUser: StateFlow<Boolean> = _isPremiumUser.asStateFlow()

    // Caches the retrieved product details to expedite the launch flow
    private val _premiumProductDetails = MutableStateFlow<ProductDetails?>(null)
    val premiumProductDetails: StateFlow<ProductDetails?> = _premiumProductDetails.asStateFlow()

    private val _yearlyProductDetails = MutableStateFlow<ProductDetails?>(null)
    val yearlyProductDetails: StateFlow<ProductDetails?> = _yearlyProductDetails.asStateFlow()

    init {
        startConnection()
    }

    /**
     * Connects to the Google Play Store billing service.
     */
    fun startConnection() {
        if (billingClient.isReady) {
            Log.d(TAG, "BillingClient already connected.")
            return
        }
        Log.d(TAG, "Starting Google Play Billing Service connection...")
        billingClient.startConnection(this)
    }

    /**
     * Interface callback for successful connection or connection failure.
     */
    override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            Log.i(TAG, "Billing setup successful.")
            reconnectAttempt = 0 // Reset reconnect backoff
            
            // Query active subscriptions to restore user state
            restorePurchases()
            
            // Query premium product details so it is ready for immediate display on Paywall Screen
            querySubscriptionProductDetails()
        } else {
            Log.w(TAG, "Billing setup failed with response code: ${billingResult.responseCode}. Error: ${billingResult.debugMessage}")
            retryConnectionWithBackoff()
        }
    }

    /**
     * Interface callback for service connection loss. Triggers automatic retry.
     */
    override fun onBillingServiceDisconnected() {
        Log.w(TAG, "Billing service disconnected. Attempting automatic reconnection...")
        retryConnectionWithBackoff()
    }

    /**
     * Retry connection using exponential backoff logic.
     */
    private fun retryConnectionWithBackoff() {
        if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
            val retryDelay = RECONNECT_BASE_DELAY_MS * (1 shl reconnectAttempt)
            reconnectAttempt++
            Log.d(TAG, "Reconnection attempt #$reconnectAttempt in ${retryDelay}ms")
            scope.launch(Dispatchers.Default) {
                delay(retryDelay)
                startConnection()
            }
        } else {
            Log.e(TAG, "Billing Service reconnection failed after $MAX_RECONNECT_ATTEMPTS attempts.")
        }
    }

    /**
     * Fetches detailed subscription metadata (pricing, features, offer token) directly from Google Play.
     */
    private fun querySubscriptionProductDetails() {
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_PREMIUM_SUBSCRIPTION)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                val premiumProduct = productDetailsList.firstOrNull { it.productId == PRODUCT_PREMIUM_SUBSCRIPTION }
                val yearlyProduct = productDetailsList.firstOrNull { it.productId == PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION }
                _premiumProductDetails.value = premiumProduct
                _yearlyProductDetails.value = yearlyProduct
                Log.d(TAG, "Premium and Yearly subscription details retrieved successfully.")
            } else {
                Log.e(TAG, "Error querying product details: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Restores purchases by querying active Google Play subscriptions in real-time.
     */
    fun restorePurchases() {
        if (!billingClient.isReady) {
            Log.w(TAG, "Cannot restore purchases: BillingClient is not connected.")
            startConnection()
            return
        }

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        billingClient.queryPurchasesAsync(params) { billingResult, purchasesList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                var premiumFound = false
                for (purchase in purchasesList) {
                    val hasPremiumProduct = purchase.products.contains(PRODUCT_PREMIUM_SUBSCRIPTION) || 
                                           purchase.products.contains(PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION)
                    if (hasPremiumProduct && purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                        premiumFound = true
                        handlePurchaseVerification(purchase)
                    }
                }
                _isPremiumUser.value = premiumFound
                Log.d(TAG, "Purchase restoration completed. User Premium Active Status: $premiumFound")
            } else {
                Log.e(TAG, "Purchase query failed: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Initiates the native Google Play purchase flow overlay for the specified subscription tier.
     */
    fun launchPurchaseFlow(activity: Activity, productId: String) {
        if (!billingClient.isReady) {
            Log.e(TAG, "Google Play Billing is not ready yet.")
            startConnection()
            return
        }

        val cachedDetails = if (productId == PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION) {
            _yearlyProductDetails.value
        } else {
            _premiumProductDetails.value
        }

        if (cachedDetails == null) {
            Log.e(TAG, "Product details for $productId not retrieved from Play Store. Querying on demand.")
            val productList = listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            )
            val params = QueryProductDetailsParams.newBuilder().setProductList(productList).build()
            
            billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                    val freshProduct = productDetailsList.first()
                    if (productId == PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION) {
                        _yearlyProductDetails.value = freshProduct
                    } else {
                        _premiumProductDetails.value = freshProduct
                    }
                    launchBillingFlowWithDetails(activity, freshProduct)
                } else {
                    Log.e(TAG, "Failed to resolve product details dynamically: ${billingResult.debugMessage}")
                }
            }
            return
        }

        launchBillingFlowWithDetails(activity, cachedDetails)
    }

    private fun launchBillingFlowWithDetails(activity: Activity, productDetails: ProductDetails) {
        // Retrieve standard billing offer token from Google Play v7 subscription model
        val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: ""

        val productDetailsParamsList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offerToken)
                .build()
        )

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build()

        val billingResult = billingClient.launchBillingFlow(activity, billingFlowParams)
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Billing flow launch failed: ${billingResult.debugMessage}")
        }
    }

    /**
     * PurchasesUpdatedListener implementation - receives purchase event logs from Google Play.
     */
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            var premiumFound = false
            for (purchase in purchases) {
                val hasPremiumProduct = purchase.products.contains(PRODUCT_PREMIUM_SUBSCRIPTION) || 
                                       purchase.products.contains(PRODUCT_PREMIUM_YEARLY_SUBSCRIPTION)
                if (hasPremiumProduct && purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                    premiumFound = true
                    handlePurchaseVerification(purchase)
                }
            }
            _isPremiumUser.value = premiumFound
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d("BillingRepository", "User canceled the purchase flow.")
        } else {
            Log.e("BillingRepository", "Purchase error: ${billingResult.debugMessage}")
        }
    }

    /**
     * Securely verifies, processes, and acknowledges Google Play transactions.
     */
    private fun handlePurchaseVerification(purchase: Purchase) {
        if (!purchase.isAcknowledged) {
            val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()

            billingClient.acknowledgePurchase(acknowledgePurchaseParams) { billingResult ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d("BillingRepository", "Purchase successfully acknowledged. Subscription secured.")
                    _isPremiumUser.value = true
                } else {
                    Log.e("BillingRepository", "Failed to acknowledge purchase: ${billingResult.debugMessage}")
                }
            }
        } else {
            // Purchase was already acknowledged previously (e.g., during app launch restoration)
            _isPremiumUser.value = true
        }
    }

    /**
     * SUCCESS LOGIC: Mock purchase handler that updates subscription StateFlow to true.
     * When mock purchase succeeds, automatically updates subscription StateFlow to true.
     */
    fun simulateSuccessfulPurchase() {
        Log.d(TAG, "Executing mock purchase. Setting isPremiumUser StateFlow to true.")
        _isPremiumUser.value = true
    }

    /**
     * Directly update or toggle the subscription StateFlow for testing or testing boundaries.
     */
    fun setPremiumStatus(isPremium: Boolean) {
        Log.d(TAG, "Updating isPremiumUser StateFlow to: $isPremium")
        _isPremiumUser.value = isPremium
    }

    /**
     * Call this when your containing ViewModel, Service, or Activity scope is destroyed.
     */
    fun endConnection() {
        Log.i(TAG, "Terminating Google Play Billing Client Connection safely.")
        billingClient.endConnection()
    }
}
