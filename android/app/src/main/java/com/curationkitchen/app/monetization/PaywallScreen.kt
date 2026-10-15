package com.curationkitchen.app.monetization

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AllInbox
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.RestaurantMenu
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * PaywallScreen provides a modern, Material 3 compliant subscription invitation page.
 * Styled with warm orange and amber accents to align perfectly with the culinary aesthetic.
 */
@Composable
fun PaywallScreen(
    onUnlockClick: () -> Unit,
    onRestoreClick: () -> Unit,
    onCloseClick: () -> Unit,
    modifier: Modifier = Modifier,
    pricingText: String = "$4.99 / month"
) {
    // Culinary Theme Color Palette
    val BrandOrange = Color(0xFFEA580C)  // Rich Food Orange
    val BrandAmber = Color(0xFFF59E0B)   // Warm Amber Yellow
    val SoftPeach = Color(0xFFFFF7ED)    // Orange-tinged container background
    val NeutralDark = Color(0xFF1E293B)  // Slate Grey for high-contrast typography
    val NeutralMedium = Color(0xFF64748B) // Slate Grey for subtext
    
    val gradientBrush = Brush.verticalGradient(
        colors = listOf(
            SoftPeach,
            Color.White
        )
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(gradientBrush)
    ) {
        // Close (X) Button - Top Right prominent layout with statusBarsPadding and 44dp touch target
        IconButton(
            onClick = onCloseClick,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 8.dp, end = 16.dp)
                .size(44.dp)
                .background(Color.White.copy(alpha = 0.95f), CircleShape)
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Close Paywall",
                tint = NeutralDark,
                modifier = Modifier.size(24.dp)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(64.dp))

            // Premium Food-Focused Icon Badge
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(BrandAmber, BrandOrange)
                        )
                    )
            ) {
                Icon(
                    imageVector = Icons.Default.RestaurantMenu,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Captivating Premium Title
            Text(
                text = "Unlock Unlimited Cooking",
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                color = NeutralDark,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.headlineLarge,
                lineHeight = 36.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Supporting Tagline
            Text(
                text = "Elevate your culinary journey without restrictions",
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = NeutralMedium,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyLarge
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Value Propositions Container Card
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                ),
                elevation = CardDefaults.cardElevation(
                    defaultElevation = 2.dp
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ValuePropItem(
                        icon = Icons.Default.Restaurant,
                        tint = BrandOrange,
                        title = "Unlimited Saved Recipes",
                        description = "Parse, collect, and customize recipes with Gemini AI without hitting the 15-recipe free cap."
                    )
                    
                    ValuePropItem(
                        icon = Icons.Default.AllInbox,
                        tint = BrandAmber,
                        title = "Full Pantry Inventory Tracker",
                        description = "Monitor ingredients in real-time. Cross the 20-item limit to coordinate your pantry seamlessly."
                    )
                    
                    ValuePropItem(
                        icon = Icons.Default.DateRange,
                        tint = BrandOrange,
                        title = "Multi-Week Meal Planning",
                        description = "Schedule meals and auto-generate aggregated shopping lists beyond the basic 3-day free constraint."
                    )
                }
            }

            Spacer(modifier = Modifier.height(36.dp))

            // Pricing Tag Callout
            Text(
                text = "Access everything for only $pricingText",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = BrandOrange,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Massive, Styled Action Call to Action
            Button(
                onClick = onUnlockClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandOrange,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                elevation = ButtonDefaults.buttonElevation(
                    defaultElevation = 4.dp,
                    pressedElevation = 8.dp
                )
            ) {
                Text(
                    text = "Unlock Premium Access",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Subtle Restore Purchase Option
            TextButton(
                onClick = onRestoreClick,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = NeutralMedium
                )
            ) {
                Text(
                    text = "Already purchased? Restore Purchase",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

/**
 * Sub-component for individual value proposition bullets
 */
@Composable
private fun ValuePropItem(
    icon: ImageVector,
    tint: Color,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        // Icon Badge
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .padding(top = 2.dp)
                .size(36.dp)
                .clip(CircleShape)
                .background(tint.copy(alpha = 0.1f))
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(18.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Content
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B)
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = description,
                fontSize = 12.sp,
                color = Color(0xFF64748B),
                lineHeight = 16.sp
            )
        }
    }
}
