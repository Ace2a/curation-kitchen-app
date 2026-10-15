package com.curationkitchen.app

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_settings")

data class UserProfile(
    val ageRange: String = "",
    val biologicalSex: String = "",
    val mainGoal: String = ""
)

data class MacroTargetProfile(
    val calories: Float,
    val proteinGrams: Float,
    val carbGrams: Float,
    val fatGrams: Float
)

class UserPreferences(private val context: Context) {
    companion object {
        val AGE_RANGE_KEY = stringPreferencesKey("age_range")
        val BIOLOGICAL_SEX_KEY = stringPreferencesKey("biological_sex")
        val MAIN_GOAL_KEY = stringPreferencesKey("main_goal")
    }

    suspend fun saveUserProfile(age: String, sex: String, goal: String) {
        context.dataStore.edit { preferences ->
            preferences[AGE_RANGE_KEY] = age
            preferences[BIOLOGICAL_SEX_KEY] = sex
            preferences[MAIN_GOAL_KEY] = goal
        }
    }

    fun getUserProfile(): Flow<UserProfile> {
        return context.dataStore.data.map { preferences ->
            UserProfile(
                ageRange = preferences[AGE_RANGE_KEY] ?: "",
                biologicalSex = preferences[BIOLOGICAL_SEX_KEY] ?: "",
                mainGoal = preferences[MAIN_GOAL_KEY] ?: ""
            )
        }
    }

    fun getUserMacroTargets(): Flow<MacroTargetProfile> {
        return getUserProfile().map { profile ->
            calculateMacroTargets(
                selectedAgeRange = profile.ageRange,
                selectedBiologicalSex = profile.biologicalSex,
                selectedGoal = profile.mainGoal
            )
        }
    }

    fun calculateMacroTargets(
        selectedAgeRange: String,
        selectedBiologicalSex: String,
        selectedGoal: String
    ): MacroTargetProfile {
        var baseCalories = when (selectedBiologicalSex.lowercase()) {
            "female", "woman" -> 1800f
            "male", "man" -> 2200f
            else -> 2000f
        }

        baseCalories += when (selectedAgeRange) {
            "18-24", "18-25", "18–24", "18–25" -> 100f
            "25-34", "25–34" -> 50f
            "35-49", "35–49" -> 0f
            "50+", "50-64", "65+" -> -100f
            else -> 0f
        }

        val (calorieMultiplier, proteinRatio, carbRatio, fatRatio) = when {
            selectedGoal.contains("loss", ignoreCase = true) || selectedGoal.contains("weight", ignoreCase = true) ->
                Quadruple(0.85f, 0.35f, 0.35f, 0.30f)
            selectedGoal.contains("muscle", ignoreCase = true) || selectedGoal.contains("gain", ignoreCase = true) ->
                Quadruple(1.15f, 0.30f, 0.45f, 0.25f)
            selectedGoal.contains("keto", ignoreCase = true) || selectedGoal.contains("low carb", ignoreCase = true) ->
                Quadruple(0.95f, 0.25f, 0.10f, 0.65f)
            else ->
                Quadruple(1.00f, 0.25f, 0.50f, 0.25f)
        }

        val totalCalories = baseCalories * calorieMultiplier
        val proteinGrams = (totalCalories * proteinRatio) / 4f
        val carbGrams = (totalCalories * carbRatio) / 4f
        val fatGrams = (totalCalories * fatRatio) / 9f

        return MacroTargetProfile(
            calories = totalCalories,
            proteinGrams = proteinGrams,
            carbGrams = carbGrams,
            fatGrams = fatGrams
        )
    }
}

private data class Quadruple<A, B, C, D>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D
)
