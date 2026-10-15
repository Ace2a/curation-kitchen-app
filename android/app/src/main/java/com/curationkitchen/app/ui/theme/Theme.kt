package com.curationkitchen.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = TerracottaOrange,
    onPrimary = OnTerracotta,
    primaryContainer = TerracottaOrange.copy(alpha = 0.12f),
    onPrimaryContainer = TerracottaOrange,
    secondary = SageGreen,
    onSecondary = OnSageGreen,
    secondaryContainer = SageGreen.copy(alpha = 0.15f),
    onSecondaryContainer = SageGreen,
    background = Buttercream,
    onBackground = CharcoalText,
    surface = Buttercream,
    onSurface = CharcoalText,
    surfaceVariant = SurfaceVariantCream,
    onSurfaceVariant = MutedText,
    outline = OutlineCream
)

private val DarkColorScheme = darkColorScheme(
    primary = TerracottaOrange,
    onPrimary = OnTerracotta,
    secondary = SageGreen,
    onSecondary = OnSageGreen,
    background = CharcoalText,
    onBackground = Buttercream,
    surface = CharcoalText,
    onSurface = Buttercream
)

@Composable
fun CurationKitchenTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
