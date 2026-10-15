package com.curationkitchen.app.network

import com.curationkitchen.app.data.MealPlanResponse
import com.curationkitchen.app.data.PantryItem
import com.curationkitchen.app.data.RecipeImportRequest
import com.curationkitchen.app.data.RecipeIngestResponse
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

/**
 * Retrofit API interface connecting to Curation Kitchen backend service
 */
interface CurationKitchenApiService {

    /**
     * GET method for fetching the pantry list from /api/pantry
     */
    @GET("api/pantry")
    suspend fun getPantryList(): List<PantryItem>

    /**
     * POST method for pushing raw blog text to /api/recipes/ingest for Gemini parsing & automatic pantry seeding.
     * Supports subscription tier validation and simulated free-boundary triggering.
     */
    @POST("api/recipes/ingest")
    suspend fun importRawBlogText(
        @Body request: RecipeImportRequest,
        @Header("X-User-Subscription") subscriptionTier: String? = null,
        @Header("X-Simulate-Premium-Limit") simulateLimit: String? = null
    ): Response<RecipeIngestResponse>

    /**
     * POST method for creating or updating a single pantry item directly
     */
    @POST("api/pantry")
    suspend fun addPantryItem(
        @Body item: PantryItem
    ): Response<PantryItem>

    /**
     * GET method for retrieving the weekly meal plan from /api/mealplan
     */
    @GET("api/mealplan")
    suspend fun getMealPlan(): Response<MealPlanResponse>

    /**
     * POST method for upserting calendar slots for the weekly meal plan at /api/mealplan
     */
    @POST("api/mealplan")
    suspend fun updateMealPlan(
        @Body mealPlan: MealPlanResponse
    ): Response<MealPlanResponse>

    companion object {
        private const val DEFAULT_BASE_URL = "http://10.0.2.2:3000/" // Android emulator localhost

        fun create(baseUrl: String = DEFAULT_BASE_URL): CurationKitchenApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .build()

            return Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(CurationKitchenApiService::class.java)
        }
    }
}
