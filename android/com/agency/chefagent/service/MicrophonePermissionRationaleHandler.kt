package com.agency.chefagent.service

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * MicrophonePermissionRationaleHandler.kt
 *
 * Verifies runtime RECORD_AUDIO and FOREGROUND_SERVICE_MICROPHONE permissions
 * before launching AmbientKitchenListenerService on Android 14+ (API 34) devices.
 * Provides an in-app educational rationale explaining hands-free Chronos acoustic tracking.
 */
object MicrophonePermissionRationaleHandler {

    /**
     * Checks if all required runtime microphone permissions are granted.
     */
    fun hasMicrophonePermissions(context: Context): Boolean {
        val hasRecordAudio = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasRecordAudio) return false

        // On Android 14+ (API 34), explicitly verify foreground service microphone permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val hasFgServiceMic = ContextCompat.checkSelfPermission(
                context,
                "android.permission.FOREGROUND_SERVICE_MICROPHONE"
            ) == PackageManager.PERMISSION_GRANTED
            if (!hasFgServiceMic) return false
        }

        return true
    }

    /**
     * In-App Educational Rationale explaining why Chronos requires microphone access.
     */
    fun getEducationalRationale(): PermissionRationaleInfo {
        return PermissionRationaleInfo(
            title = "Chronos Hands-Free Kitchen Voice Control",
            message = "ChefAgent uses ambient microphone listening strictly on line kiosks to recognize kitchen commands (\"Fire Table 4\", \"86 Halibut\", \"Push Event\"). Audio is processed locally in a 5-second circular ring buffer and never transmitted or recorded.",
            requiredPermissions = arrayOf(
                Manifest.permission.RECORD_AUDIO,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) "android.permission.FOREGROUND_SERVICE_MICROPHONE" else ""
            ).filter { it.isNotBlank() }.toTypedArray()
        )
    }

    data class PermissionRationaleInfo(
        val title: String,
        val message: String,
        val requiredPermissions: Array<String>
    )
}
