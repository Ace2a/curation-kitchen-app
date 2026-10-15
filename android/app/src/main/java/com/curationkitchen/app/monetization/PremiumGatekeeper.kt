package com.curationkitchen.app.monetization

/**
 * PremiumGatekeeper manages feature gating based on user subscription levels
 * and resource counts (Recipes, Pantry Items, Meal Plans).
 *
 * Implements strict monetization limits for the Free tier and allows unconstrained
 * execution for the Premium Monthly Tier subscription.
 */
class PremiumGatekeeper(
    private val isPremiumUser: Boolean,
    private val recipesCount: Int,
    private val pantryItemsCount: Int,
    private val plannedDaysCount: Int
) {

    companion object {
        // Strict, high-performance monetization boundary definitions
        const val LIMIT_FREE_RECIPES = 15
        const val LIMIT_FREE_PANTRY_ITEMS = 20
        const val LIMIT_FREE_MEAL_PLANS = 3
    }

    /**
     * Determines whether the user is eligible to add a new Recipe.
     * Premium users have infinite limits. Free tier users are capped at 15 recipes.
     *
     * @return true if addition is allowed, false if premium upgrade is required.
     */
    fun canAddRecipe(): Boolean {
        return isPremiumUser || recipesCount < LIMIT_FREE_RECIPES
    }

    /**
     * Determines whether the user is eligible to log a new pantry ingredient.
     * Premium users have infinite limits. Free tier users are capped at 20 pantry items.
     *
     * @return true if addition is allowed, false if premium upgrade is required.
     */
    fun canAddPantryItem(): Boolean {
        return isPremiumUser || pantryItemsCount < LIMIT_FREE_PANTRY_ITEMS
    }

    /**
     * Determines whether the user is eligible to schedule a planned recipe day.
     * Premium users have infinite limits. Free tier users are capped at 3 planned days.
     *
     * @return true if scheduling is allowed, false if premium upgrade is required.
     */
    fun canAddMealPlan(): Boolean {
        return isPremiumUser || plannedDaysCount < LIMIT_FREE_MEAL_PLANS
    }
}
