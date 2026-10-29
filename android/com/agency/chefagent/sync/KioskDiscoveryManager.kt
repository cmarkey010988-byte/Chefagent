package com.agency.chefagent.sync

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.net.InetAddress
import java.util.concurrent.ConcurrentHashMap

/**
 * KioskDiscoveryManager.kt
 *
 * Zero-Configuration Auto-Discovery service powered by Android's [NsdManager] (DNS-SD / mDNS).
 * Enables ChefAgent kitchen kiosks to automatically broadcast their presence on the local
 * Wi-Fi network and discover peer terminals without manual IP address entry.
 */
class KioskDiscoveryManager(
    private val context: Context,
    private val localKioskId: String,
    private val onPeerDiscovered: (PeerEndpoint) -> Unit = {}
) {
    private val tag = "KioskDiscoveryManager"

    companion object {
        const val SERVICE_TYPE = "_chefagent_p2p._tcp."
        const val SERVICE_PREFIX = "ChefAgent-"
    }

    data class PeerEndpoint(
        val serviceName: String,
        val host: InetAddress,
        val port: Int,
        val discoveredTimestamp: Long = System.currentTimeMillis()
    ) {
        val hostAddress: String get() = host.hostAddress ?: "127.0.0.1"
        val wsUrl: String get() = "ws://$hostAddress:$port/sync/ws"
        val httpUrl: String get() = "http://$hostAddress:$port/sync/push-event"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val nsdManager: NsdManager? by lazy {
        try {
            context.getSystemService(Context.NSD_SERVICE) as? NsdManager
        } catch (e: Exception) {
            Log.e(tag, "Failed to retrieve NsdManager service from Android context", e)
            null
        }
    }

    private var registrationListener: NsdManager.RegistrationListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null

    private val discoveredPeersMap = ConcurrentHashMap<String, PeerEndpoint>()
    private val _discoveredPeers = MutableStateFlow<List<PeerEndpoint>>(emptyList())
    val discoveredPeers: StateFlow<List<PeerEndpoint>> = _discoveredPeers.asStateFlow()

    private var registeredServiceName: String? = null
    private var isDiscovering = false

    /**
     * Broadcasts this kiosk's presence on the local network via mDNS.
     */
    fun registerKioskService(port: Int) {
        val manager = nsdManager ?: return
        val serviceInfo = NsdServiceInfo().apply {
            serviceName = "$SERVICE_PREFIX$localKioskId"
            serviceType = SERVICE_TYPE
            setPort(port)
        }

        registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(registeredInfo: NsdServiceInfo) {
                registeredServiceName = registeredInfo.serviceName
                Log.i(tag, "Kiosk successfully registered on local network as: ${registeredInfo.serviceName} (Port $port)")
            }

            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                Log.e(tag, "NSD registration failed with errorCode $errorCode for service ${serviceInfo.serviceName}")
            }

            override fun onServiceUnregistered(arg0: NsdServiceInfo) {
                Log.i(tag, "Kiosk service unregistered successfully from local network.")
            }

            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                Log.e(tag, "NSD unregistration failed with errorCode $errorCode")
            }
        }

        try {
            manager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
        } catch (e: Exception) {
            Log.e(tag, "Exception during registerService", e)
        }
    }

    /**
     * Starts continuous background discovery of peer kiosks on the subnet.
     */
    fun startDiscovery() {
        val manager = nsdManager ?: return
        if (isDiscovering) return

        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) {
                isDiscovering = true
                Log.i(tag, "Kiosk discovery started for service type: $regType")
            }

            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                Log.d(tag, "Service candidate found on subnet: ${serviceInfo.serviceName}")

                if (serviceInfo.serviceType != SERVICE_TYPE && !serviceInfo.serviceType.contains("chefagent_p2p")) {
                    return
                }

                // Ignore self-advertisement
                if (serviceInfo.serviceName == registeredServiceName || serviceInfo.serviceName.contains(localKioskId)) {
                    Log.d(tag, "Ignoring self advertisement: ${serviceInfo.serviceName}")
                    return
                }

                // Resolve peer IP address and port
                resolvePeerService(serviceInfo)
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                Log.w(tag, "Kiosk peer lost on subnet: ${serviceInfo.serviceName}")
                discoveredPeersMap.remove(serviceInfo.serviceName)
                _discoveredPeers.value = discoveredPeersMap.values.toList()
            }

            override fun onDiscoveryStopped(serviceType: String) {
                isDiscovering = false
                Log.i(tag, "Kiosk discovery stopped.")
            }

            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                isDiscovering = false
                Log.e(tag, "Failed to start discovery: errorCode $errorCode")
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.e(tag, "Failed to stop discovery: errorCode $errorCode")
            }
        }

        try {
            manager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        } catch (e: Exception) {
            Log.e(tag, "Exception starting NSD discovery", e)
        }
    }

    private fun resolvePeerService(serviceInfo: NsdServiceInfo) {
        val manager = nsdManager ?: return

        val resolveListener = object : NsdManager.ResolveListener {
            override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                Log.w(tag, "Failed to resolve service ${serviceInfo.serviceName}, errorCode: $errorCode")
            }

            override fun onServiceResolved(resolvedInfo: NsdServiceInfo) {
                val host = resolvedInfo.host
                val port = resolvedInfo.port
                Log.i(tag, "Peer resolved: ${resolvedInfo.serviceName} at ${host.hostAddress}:$port")

                val endpoint = PeerEndpoint(
                    serviceName = resolvedInfo.serviceName,
                    host = host,
                    port = port
                )

                discoveredPeersMap[resolvedInfo.serviceName] = endpoint
                _discoveredPeers.value = discoveredPeersMap.values.toList()

                // Notify sync engine to establish real-time WebSocket connection
                scope.launch {
                    try {
                        onPeerDiscovered(endpoint)
                    } catch (e: Exception) {
                        Log.e(tag, "Error notifying peer discovered callback", e)
                    }
                }
            }
        }

        try {
            manager.resolveService(serviceInfo, resolveListener)
        } catch (e: Exception) {
            Log.e(tag, "Error requesting resolveService for ${serviceInfo.serviceName}", e)
        }
    }

    /**
     * Cleanly stops discovery and unregisters mDNS advertisement.
     */
    fun stop() {
        val manager = nsdManager ?: return
        try {
            if (isDiscovering && discoveryListener != null) {
                manager.stopServiceDiscovery(discoveryListener)
                isDiscovering = false
            }
            registrationListener?.let { manager.unregisterService(it) }
        } catch (e: Exception) {
            Log.e(tag, "Error stopping KioskDiscoveryManager", e)
        }
    }
}
