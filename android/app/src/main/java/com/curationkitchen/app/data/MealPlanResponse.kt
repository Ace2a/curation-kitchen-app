package com.curationkitchen.app.data

import com.google.gson.annotations.SerializedName

/**
 * Standard Day of the Week enumeration for calendar indexing
 */
enum class DayOfWeek(val displayName: String, val shortName: String) {
    MONDAY("Monday", "Mon"),
    TUESDAY("Tuesday", "Tue"),
    WEDNESDAY("Wednesday", "Wed"),
    THURSDAY("Thursday", "Thu"),
    FRIDAY("Friday", "Fri"),
    SATURDAY("Saturday", "Sat"),
    SUNDAY("Sunday", "Sun")
}

/**
 * Standard Meal Slot enumeration for daily meal distribution
 */
enum class MealSlot(val displayName: String, val slotKey: String) {
    BREAKFAST("Breakfast", "breakfast"),
    LUNCH("Lunch", "lunch"),
    DINNER("Dinner", "dinner")
}

/**
 * MealPlanResponse data class mapping the 21 calendar slots matching backend schema
 */
data class MealPlanResponse(
    @SerializedName("id") val id: String? = null,
    @SerializedName("user_id") val userId: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,

    // Monday
    @SerializedName("monday_breakfast") val mondayBreakfast: String? = null,
    @SerializedName("monday_lunch") val mondayLunch: String? = null,
    @SerializedName("monday_dinner") val mondayDinner: String? = null,

    // Tuesday
    @SerializedName("tuesday_breakfast") val tuesdayBreakfast: String? = null,
    @SerializedName("tuesday_lunch") val tuesdayLunch: String? = null,
    @SerializedName("tuesday_dinner") val tuesdayDinner: String? = null,

    // Wednesday
    @SerializedName("wednesday_breakfast") val wednesdayBreakfast: String? = null,
    @SerializedName("wednesday_lunch") val wednesdayLunch: String? = null,
    @SerializedName("wednesday_dinner") val wednesdayDinner: String? = null,

    // Thursday
    @SerializedName("thursday_breakfast") val thursdayBreakfast: String? = null,
    @SerializedName("thursday_lunch") val thursdayLunch: String? = null,
    @SerializedName("thursday_dinner") val thursdayDinner: String? = null,

    // Friday
    @SerializedName("friday_breakfast") val fridayBreakfast: String? = null,
    @SerializedName("friday_lunch") val fridayLunch: String? = null,
    @SerializedName("friday_dinner") val fridayDinner: String? = null,

    // Saturday
    @SerializedName("saturday_breakfast") val saturdayBreakfast: String? = null,
    @SerializedName("saturday_lunch") val saturdayLunch: String? = null,
    @SerializedName("saturday_dinner") val saturdayDinner: String? = null,

    // Sunday
    @SerializedName("sunday_breakfast") val sundayBreakfast: String? = null,
    @SerializedName("sunday_lunch") val sundayLunch: String? = null,
    @SerializedName("sunday_dinner") val sundayDinner: String? = null
)

/**
 * Extension function to convert flat 21-variable response into a structured, iterable map
 * suitable for clean Jetpack Compose UI rendering without duplicated conditional branches.
 */
fun MealPlanResponse.toGroupedMap(): Map<DayOfWeek, Map<MealSlot, String?>> {
    return mapOf(
        DayOfWeek.MONDAY to mapOf(
            MealSlot.BREAKFAST to mondayBreakfast,
            MealSlot.LUNCH to mondayLunch,
            MealSlot.DINNER to mondayDinner
        ),
        DayOfWeek.TUESDAY to mapOf(
            MealSlot.BREAKFAST to tuesdayBreakfast,
            MealSlot.LUNCH to tuesdayLunch,
            MealSlot.DINNER to tuesdayDinner
        ),
        DayOfWeek.WEDNESDAY to mapOf(
            MealSlot.BREAKFAST to wednesdayBreakfast,
            MealSlot.LUNCH to wednesdayLunch,
            MealSlot.DINNER to wednesdayDinner
        ),
        DayOfWeek.THURSDAY to mapOf(
            MealSlot.BREAKFAST to thursdayBreakfast,
            MealSlot.LUNCH to thursdayLunch,
            MealSlot.DINNER to thursdayDinner
        ),
        DayOfWeek.FRIDAY to mapOf(
            MealSlot.BREAKFAST to fridayBreakfast,
            MealSlot.LUNCH to fridayLunch,
            MealSlot.DINNER to fridayDinner
        ),
        DayOfWeek.SATURDAY to mapOf(
            MealSlot.BREAKFAST to saturdayBreakfast,
            MealSlot.LUNCH to saturdayLunch,
            MealSlot.DINNER to saturdayDinner
        ),
        DayOfWeek.SUNDAY to mapOf(
            MealSlot.BREAKFAST to sundayBreakfast,
            MealSlot.LUNCH to sundayLunch,
            MealSlot.DINNER to sundayDinner
        )
    )
}

