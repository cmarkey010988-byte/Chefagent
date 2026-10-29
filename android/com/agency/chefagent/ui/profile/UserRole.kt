package com.agency.chefagent.ui.profile

/**
 * UserRole.kt
 *
 * Sealed class defining strict role-based access control (RBAC) across the kitchen kiosk.
 * Governs navigation permissions, inventory write operations, and administrative terminal settings.
 */
sealed class UserRole(
    val roleName: String,
    val canEditInventory: Boolean,
    val canAccessSettings: Boolean,
    val canManageStaff: Boolean
) {
    object LineCook : UserRole(
        roleName = "LineCook",
        canEditInventory = false,
        canAccessSettings = false,
        canManageStaff = false
    )

    object Manager : UserRole(
        roleName = "Manager",
        canEditInventory = true,
        canAccessSettings = true,
        canManageStaff = true
    )

    object Executive : UserRole(
        roleName = "Executive",
        canEditInventory = true,
        canAccessSettings = true,
        canManageStaff = true
    )

    companion object {
        fun fromString(role: String?): UserRole = when (role?.uppercase()) {
            "MANAGER" -> Manager
            "EXECUTIVE" -> Executive
            else -> LineCook
        }
    }
}
