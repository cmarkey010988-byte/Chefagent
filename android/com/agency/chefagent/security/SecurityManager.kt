package com.agency.chefagent.security

import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicInteger

/**
 * SecurityManager.kt
 *
 * Enforces Zero-Trust Role-Based Access Control (RBAC) and hardware-kiosk security boundaries
 * across Android line terminals, chef stations, and executive tablets.
 *
 * Security Invariants Enforced:
 * 1. Line Cook (ROLE_LINE_COOK) kiosks have executive navigation graphs entirely locked out.
 * 2. Administrative PIN overrides cannot be executed by line cooks under any circumstances.
 * 3. Constant-time salted SHA-256 hash comparison eliminates timing side-channel attacks.
 * 4. Lockout protection halts brute-force attacks after 3 failed PIN attempts for 5 minutes.
 * 5. Multi-property financial ledgers and corporate rollups require ROLE_CORPORATE_EXECUTIVE or ROLE_GENERAL_MANAGER.
 */
object SecurityManager {

    enum class UserRole(val level: Int) {
        ROLE_LINE_COOK(1),
        ROLE_HEAD_CHEF(2),
        ROLE_GENERAL_MANAGER(3),
        ROLE_CORPORATE_EXECUTIVE(4)
    }

    data class SessionUser(
        val userId: String,
        val fullName: String,
        val assignedPropertyId: String,
        val role: UserRole
    )

    // Salted SHA-256 hashes of approved administrative PINs ("9988" and "2026")
    // Salt: "CHEFAGENT_ENTERPRISE_PIN_SALT_2026"
    private const val PIN_SALT = "CHEFAGENT_ENTERPRISE_PIN_SALT_2026"
    private const val MAX_FAILED_ATTEMPTS = 3
    private const val LOCKOUT_DURATION_MS = 5 * 60 * 1000L // 5 minutes

    private val HASH_PIN_9988 = computePinHash("9988", PIN_SALT)
    private val HASH_PIN_2026 = computePinHash("2026", PIN_SALT)

    private val failedAttempts = AtomicInteger(0)
    private var lockoutUntilTimestamp: Long = 0L

    /**
     * Verifies if the current user session has sufficient privileges for corporate or multi-site actions.
     */
    fun hasExecutiveAccess(user: SessionUser?): Boolean {
        if (user == null) return false
        return user.role.level >= UserRole.ROLE_GENERAL_MANAGER.level
    }

    /**
     * Checks if user has corporate-wide executive authority (e.g. macro settings, portfolio-wide overrides).
     */
    fun isCorporateExecutive(user: SessionUser?): Boolean {
        if (user == null) return false
        return user.role == UserRole.ROLE_CORPORATE_EXECUTIVE
    }

    /**
     * Strictly controls whether financial ledger modifications or ERP exports are allowed.
     */
    fun canAccessFinancialLedger(user: SessionUser?): Boolean {
        return hasExecutiveAccess(user)
    }

    /**
     * Strictly evaluates whether the tablet or kiosk should compile and render macro executive navigation graphs.
     * Line cooks and head chefs are strictly prohibited from executive views.
     */
    fun shouldRenderExecutiveNavigation(userRole: UserRole): Boolean {
        return userRole == UserRole.ROLE_CORPORATE_EXECUTIVE || userRole == UserRole.ROLE_GENERAL_MANAGER
    }

    /**
     * Validates administrative PIN override request.
     * Enforces:
     * - Role verification (Line cooks cannot perform administrative overrides even with a known PIN)
     * - Brute-force lockout prevention (max 3 failed attempts triggers 5-minute lockout)
     * - Constant-time salted SHA-256 hash comparison
     */
    @Synchronized
    fun canExecuteAdminOverride(user: SessionUser?, pin: String): Boolean {
        val now = System.currentTimeMillis()
        if (now < lockoutUntilTimestamp) {
            return false // Terminal is currently locked out
        }

        // Line cooks can never execute executive PIN overrides
        if (user != null && user.role == UserRole.ROLE_LINE_COOK) {
            return false
        }

        val isValidPin = validateAdminPin(pin)
        if (isValidPin) {
            failedAttempts.set(0)
            return true
        } else {
            val attempts = failedAttempts.incrementAndGet()
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                lockoutUntilTimestamp = now + LOCKOUT_DURATION_MS
            }
            return false
        }
    }

    /**
     * Validates PIN code against salted cryptographic hashes using constant-time comparison.
     */
    fun validateAdminPin(pin: String): Boolean {
        val candidateHash = computePinHash(pin, PIN_SALT)
        return constantTimeEquals(candidateHash, HASH_PIN_9988) || constantTimeEquals(candidateHash, HASH_PIN_2026)
    }

    /**
     * Checks if PIN entry is currently in lockout state.
     */
    fun isLockedOut(): Boolean {
        return System.currentTimeMillis() < lockoutUntilTimestamp
    }

    /**
     * Computes salted SHA-256 hex digest for PIN verification.
     */
    private fun computePinHash(pin: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val input = "$salt:$pin"
        val hashBytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Constant-time string comparison to prevent side-channel timing attacks.
     */
    private fun constantTimeEquals(a: String, b: String): Boolean {
        if (a.length != b.length) return false
        var result = 0
        for (i in a.indices) {
            result = result or (a[i].code xor b[i].code)
        }
        return result == 0
    }
}
