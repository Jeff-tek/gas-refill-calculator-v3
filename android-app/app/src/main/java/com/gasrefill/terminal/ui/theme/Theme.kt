package com.gasrefill.terminal.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = AccentFlame,
    secondary = AccentFlameDim,
    tertiary = AccentAmber,
    background = DarkBg,
    surface = DarkPanel,
    surfaceVariant = DarkPanel2,
    onPrimary = Cream,
    onSecondary = Cream,
    onTertiary = Cream,
    onBackground = Cream,
    onSurface = Cream,
    error = AccentDanger,
)

private val LightColorScheme = lightColorScheme(
    primary = AccentFlame,
    secondary = AccentFlameDim,
    tertiary = AccentAmber,
    background = LightBg,
    surface = LightPanel,
    surfaceVariant = LightPanel2,
    onPrimary = Cream,
    onSecondary = Cream,
    onTertiary = Cream,
    onBackground = androidx.compose.ui.graphics.Color(0xFF191C1F),
    onSurface = androidx.compose.ui.graphics.Color(0xFF191C1F),
    error = AccentDanger,
)

@Composable
fun GasRefillTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
