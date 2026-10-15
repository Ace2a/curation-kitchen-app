package com.curationkitchen.app.data

import com.google.gson.annotations.SerializedName

/**
 * Clean PantryItem data class matching the backend seeded structure
 * from server.ts (id, name, category, quantity as Double, status, created_date).
 */
data class PantryItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("category") val category: String = "Other",
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("status") val status: String = "Out of Stock",
    @SerializedName("created_date") val created_date: String = ""
)

/**
 * Data transfer objects for recipe parsing and blog ingestion
 */
data class RecipeImportRequest(
    @SerializedName("rawBlogText") val rawBlogText: String,
    @SerializedName("recipeName") val recipeName: String? = null
)

data class RecipeIngestResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("recipeId") val recipeId: String = ""
)

data class RecipeImportResponse(
    @SerializedName("recipe_name") val recipeName: String? = null,
    @SerializedName("ingredients") val ingredients: List<ParsedIngredientDto> = emptyList(),
    @SerializedName("steps") val steps: List<String> = emptyList(),
    @SerializedName("prep_time") val prepTime: String? = null,
    @SerializedName("cook_time") val cookTime: String? = null,
    @SerializedName("servings") val servings: Int? = null,
    @SerializedName("meal_heading") val mealHeading: String? = null
)

data class ParsedIngredientDto(
    @SerializedName("name") val name: String = "",
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("amount") val amount: Double = 0.0,
    @SerializedName("unit") val unit: String = "",
    @SerializedName("modifiers") val modifiers: List<String> = emptyList()
)
