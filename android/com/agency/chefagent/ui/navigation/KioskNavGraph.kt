package com.agency.chefagent.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.agency.chefagent.di.AppContainer
import com.agency.chefagent.ui.profile.UserRole

/**
 * KioskNavGraph.kt
 *
 * Declarative Jetpack Compose navigation graph governing kitchen terminal workflows.
 *
 * Enforces:
 * 1. Startup Synchronization Gate: UI is held on a splash barrier until [AppContainer.isDatabaseReady]
 *    emits true, eliminating room query race conditions.
 * 2. Role-Based UI Routing: Restricts access to `/inventory_edit` and `/settings` unless the authenticated
 *    role in [ProfileStateManager.currentUserRole] is [UserRole.Manager].
 * 3. In-line PIN Challenge Interceptor: Automatically renders secure PIN prompt when an unauthorized
 *    LineCook attempts to access manager-restricted destinations.
 */
sealed class KioskScreen(val route: String) {
    object PrepList : KioskScreen("prep_list")
    object InventoryList : KioskScreen("inventory_list")
    object InventoryEdit : KioskScreen("inventory_edit/{itemId}") {
        fun createRoute(itemId: String) = "inventory_edit/$itemId"
    }
    object Settings : KioskScreen("settings")
}

@Composable
fun KioskAppNavHost(
    appContainer: AppContainer,
    navController: NavHostController = rememberNavController()
) {
    // 1. Startup Synchronization Barrier
    val isDbReady by appContainer.isDatabaseReady.collectAsState()

    if (!isDbReady) {
        KioskSplashScreen()
        return
    }

    // 2. Active Authentication State
    val currentRole by appContainer.profileStateManager.currentUserRole.collectAsState()

    NavHost(
        navController = navController,
        startDestination = KioskScreen.PrepList.route,
        modifier = Modifier.fillMaxSize()
    ) {
        // Unrestricted BOH Prep Station (Accessible to LineCook and Manager)
        composable(KioskScreen.PrepList.route) {
            PrepStationRoute(
                appContainer = appContainer,
                onNavigateToInventory = { navController.navigate(KioskScreen.InventoryList.route) },
                onNavigateToSettings = { navController.navigate(KioskScreen.Settings.route) }
            )
        }

        // Perpetual Inventory Ledger (Read-only for LineCook, Edit buttons guarded)
        composable(KioskScreen.InventoryList.route) {
            InventoryLedgerRoute(
                appContainer = appContainer,
                userRole = currentRole,
                onEditItem = { itemId ->
                    navController.navigate(KioskScreen.InventoryEdit.createRoute(itemId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // RESTRICTED ROUTE: Inventory Item Edit (Manager Role Required)
        composable(KioskScreen.InventoryEdit.route) { backStackEntry ->
            val itemId = backStackEntry.arguments?.getString("itemId") ?: ""
            RoleGuardedScreen(
                userRole = currentRole,
                requiredRole = UserRole.Manager,
                onAuthenticate = { pin -> appContainer.profileStateManager.authenticateManager(pin) },
                onBack = { navController.popBackStack() }
            ) {
                InventoryEditScreen(
                    itemId = itemId,
                    appContainer = appContainer,
                    onSaveCompleted = { navController.popBackStack() }
                )
            }
        }

        // RESTRICTED ROUTE: Terminal & Cloud Settings (Manager Role Required)
        composable(KioskScreen.Settings.route) {
            RoleGuardedScreen(
                userRole = currentRole,
                requiredRole = UserRole.Manager,
                onAuthenticate = { pin -> appContainer.profileStateManager.authenticateManager(pin) },
                onBack = { navController.popBackStack() }
            ) {
                KioskSettingsScreen(
                    appContainer = appContainer,
                    onLogoutManager = {
                        appContainer.profileStateManager.logoutToLineCook()
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}

/**
 * Route guard wrapper intercepting navigation to manager-restricted screens.
 */
@Composable
fun RoleGuardedScreen(
    userRole: UserRole,
    requiredRole: UserRole,
    onAuthenticate: (String) -> Boolean,
    onBack: () -> Unit,
    content: @Composable () -> Unit
) {
    if (userRole == requiredRole || userRole is UserRole.Executive) {
        content()
    } else {
        ManagerPinChallenge(
            onSuccess = { /* Automatically recomposes with updated role */ },
            onCancel = onBack,
            onAuthenticate = onAuthenticate
        )
    }
}

@Composable
fun ManagerPinChallenge(
    onSuccess: () -> Unit,
    onCancel: () -> Unit,
    onAuthenticate: (String) -> Boolean
) {
    var pin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .background(Color(0xFF1E1E1E), RoundedCornerShape(16.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = "Restricted Access",
                tint = Color(0xFFF59E0B),
                modifier = Modifier.height(48.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Manager Access Required",
                style = MaterialTheme.typography.titleMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "Enter 4-digit manager PIN to unlock terminal edit permissions",
                style = MaterialTheme.typography.bodySmall,
                color = Color.LightGray,
                modifier = Modifier.padding(vertical = 8.dp)
            )

            OutlinedTextField(
                value = pin,
                onValueChange = { if (it.length <= 6) pin = it },
                label = { Text("Manager PIN") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.padding(vertical = 8.dp)
            )

            if (errorMessage != null) {
                Text(
                    text = errorMessage ?: "",
                    color = Color.Red,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    val valid = onAuthenticate(pin)
                    if (valid) {
                        onSuccess()
                    } else {
                        errorMessage = "Invalid PIN or terminal temporarily locked."
                        pin = ""
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Unlock Screen", color = Color.Black, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = onCancel,
                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)
            ) {
                Text("Cancel & Return", color = Color.White)
            }
        }
    }
}

@Composable
fun KioskSplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "ChefAgent Kiosk",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            CircularProgressIndicator(color = Color(0xFFF59E0B))
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Verifying database & synchronizing local peer mesh...",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.LightGray
            )
        }
    }
}

// Placeholder composables for route targets
@Composable
fun PrepStationRoute(appContainer: AppContainer, onNavigateToInventory: () -> Unit, onNavigateToSettings: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Prep Station Active (Chronos Engine)")
    }
}

@Composable
fun InventoryLedgerRoute(appContainer: AppContainer, userRole: UserRole, onEditItem: (String) -> Unit, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Inventory Ledger (Role: ${userRole.roleName})")
    }
}

@Composable
fun InventoryEditScreen(itemId: String, appContainer: AppContainer, onSaveCompleted: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Manager Restricted: Editing Item $itemId")
    }
}

@Composable
fun KioskSettingsScreen(appContainer: AppContainer, onLogoutManager: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Manager Restricted: Terminal Settings")
    }
}
