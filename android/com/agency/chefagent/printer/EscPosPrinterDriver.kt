package com.agency.chefagent.printer

import android.util.Log
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.min
import kotlin.math.pow

/**
 * EscPosPrinterDriver.kt
 *
 * Hardened Android Raw TCP/IP Socket client (Port 9100) rendering and transmitting ESC/POS binary
 * command streams directly to Epson TM-T88 and Star Micronics SP700 thermal/impact printers.
 * Consolidated under com.agency.chefagent.printer.
 *
 * Resilience & Hardware Exception Boundaries:
 * 1. Robust try-catch boundaries with structured logging (zero empty catch blocks).
 * 2. In-memory offline spooling queue (`offlineSpoolQueue`) preventing dropped tickets during Wi-Fi drops.
 * 3. Graceful auto-reconnect background daemon running exponential backoff (1s, 2s, 4s, 8s, up to 30s).
 * 4. Zero unhandled socket exceptions ensuring thermal printer failures never crash the host Android kiosk app.
 */
class EscPosPrinterDriver(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val tag = "EscPosPrinterDriver"
    private val driverScope = CoroutineScope(ioDispatcher + SupervisorJob())

    companion object {
        const val ESC = 0x1B.toByte()
        const val GS = 0x1D.toByte()
        const val LF = 0x0A.toByte()
        const val BEL = 0x07.toByte()
        const val DEFAULT_PRINTER_PORT = 9100
        const val SOCKET_TIMEOUT_MS = 2500
        const val MAX_SPOOL_SIZE = 100
    }

    data class SpooledPrintJob(
        val ipAddress: String,
        val port: Int,
        val data: ByteArray,
        val orderNumber: String,
        val timestamp: Long = System.currentTimeMillis(),
        var retryAttempts: Int = 0
    )

    data class KitchenOrderTicket(
        val orderNumber: String,
        val tableNumber: String,
        val serverName: String,
        val section: String,
        val targetStation: String,
        val items: List<TicketLineItem>,
        val timestamp: Long = System.currentTimeMillis()
    )

    data class TicketLineItem(
        val name: String,
        val quantity: Int,
        val modifiers: List<String> = emptyList(),
        val allergenAlerts: List<String> = emptyList()
    )

    private val offlineSpoolQueue = ConcurrentLinkedQueue<SpooledPrintJob>()
    private var isAutoFlushRunning = false

    init {
        startSpoolFlusher()
    }

    /**
     * Builds raw ESC/POS binary byte array for an order slip
     */
    fun buildEscPosStream(ticket: KitchenOrderTicket): ByteArray {
        val stream = ByteArrayOutputStream()

        // 1. Initialize Printer (ESC @)
        stream.write(byteArrayOf(ESC, 0x40))

        // 2. Acoustic Buzzer trigger if allergens present (BEL + ESC B 2 2)
        val hasAllergens = ticket.items.any { it.allergenAlerts.isNotEmpty() }
        if (hasAllergens) {
            stream.write(byteArrayOf(BEL))
            stream.write(byteArrayOf(ESC, 0x42, 0x02, 0x02))
        }

        // 3. Center Align Header (ESC a 1)
        stream.write(byteArrayOf(ESC, 0x61, 0x01))
        // Double-height header (GS ! 0x11)
        stream.write(byteArrayOf(GS, 0x21, 0x11))
        stream.write("*** ${ticket.targetStation.uppercase()} ***\n".toByteArray(Charsets.US_ASCII))
        stream.write(byteArrayOf(GS, 0x21, 0x00)) // Normal size

        stream.write("CHEFAGENT CULINARY KDS\n".toByteArray(Charsets.US_ASCII))
        stream.write("------------------------------------------\n".toByteArray(Charsets.US_ASCII))

        // 4. Left Align (ESC a 0)
        stream.write(byteArrayOf(ESC, 0x61, 0x00))
        // Double-width table name
        stream.write(byteArrayOf(GS, 0x21, 0x20))
        stream.write("TBL: ${ticket.tableNumber.padEnd(8)} CHK #${ticket.orderNumber}\n".toByteArray(Charsets.US_ASCII))
        stream.write(byteArrayOf(GS, 0x21, 0x00))

        stream.write("SECT: ${ticket.section}  SRV: ${ticket.serverName}\n".toByteArray(Charsets.US_ASCII))
        stream.write("------------------------------------------\n".toByteArray(Charsets.US_ASCII))

        // 5. Line items
        ticket.items.forEach { item ->
            // Bold item name (ESC E 1)
            stream.write(byteArrayOf(ESC, 0x45, 0x01))
            val lineStr = "${item.quantity}x ${item.name}\n"
            stream.write(lineStr.toByteArray(Charsets.US_ASCII))
            stream.write(byteArrayOf(ESC, 0x45, 0x00))

            item.modifiers.forEach { mod ->
                stream.write("   >> $mod\n".toByteArray(Charsets.US_ASCII))
            }

            // Allergen alert: Double height & width (GS ! 0x33) + Inverted (GS B 1)
            if (item.allergenAlerts.isNotEmpty()) {
                stream.write(byteArrayOf(GS, 0x21, 0x33))
                stream.write(byteArrayOf(GS, 0x42, 0x01))
                item.allergenAlerts.forEach { alert ->
                    stream.write(" ! ALLERGY: $alert !\n".toByteArray(Charsets.US_ASCII))
                }
                stream.write(byteArrayOf(GS, 0x42, 0x00))
                stream.write(byteArrayOf(GS, 0x21, 0x00))
            }
        }

        stream.write("------------------------------------------\n".toByteArray(Charsets.US_ASCII))
        stream.write("\n\n\n".toByteArray(Charsets.US_ASCII))

        // 6. Cutter Actuation (GS V 66 0 -> Partial cut)
        stream.write(byteArrayOf(GS, 0x56, 0x42, 0x00))

        return stream.toByteArray()
    }

    /**
     * Transmits raw binary stream over direct TCP/IP socket (Port 9100) on Dispatchers.IO.
     * Guaranteed never to throw uncaught exceptions; spools failed jobs for auto-retry.
     */
    suspend fun transmitOverTcpSocket(
        ipAddress: String,
        port: Int = DEFAULT_PRINTER_PORT,
        data: ByteArray,
        timeoutMs: Int = SOCKET_TIMEOUT_MS,
        orderNumber: String = "LIVE"
    ): Boolean = withContext(ioDispatcher) {
        var socket: Socket? = null
        var outputStream: OutputStream? = null
        try {
            socket = Socket()
            socket.keepAlive = true
            socket.tcpNoDelay = true
            socket.soTimeout = timeoutMs
            socket.connect(InetSocketAddress(ipAddress, port), timeoutMs)

            outputStream = socket.getOutputStream()
            outputStream.write(data)
            outputStream.flush()
            Log.d(tag, "Successfully printed ${data.size} bytes to printer at $ipAddress:$port")
            true
        } catch (e: Exception) {
            Log.w(tag, "Printer socket at $ipAddress:$port unreachable (${e.message}). Spooling to offline queue.", e)
            spoolJob(SpooledPrintJob(ipAddress, port, data, orderNumber))
            false
        } finally {
            try {
                outputStream?.close()
            } catch (e: Exception) {
                Log.w(tag, "Error closing printer output stream", e)
            }
            try {
                socket?.close()
            } catch (e: Exception) {
                Log.w(tag, "Error closing printer socket", e)
            }
        }
    }

    private fun spoolJob(job: SpooledPrintJob) {
        if (offlineSpoolQueue.size >= MAX_SPOOL_SIZE) {
            val dropped = offlineSpoolQueue.poll() // Drop oldest to prevent OOM
            Log.w(tag, "Spool queue full; dropped oldest job for order ${dropped?.orderNumber}")
        }
        offlineSpoolQueue.offer(job)
    }

    /**
     * Background spool flusher daemon with exponential backoff
     */
    private fun startSpoolFlusher() {
        if (isAutoFlushRunning) return
        isAutoFlushRunning = true

        driverScope.launch {
            var backoffAttempt = 0
            while (isActive) {
                if (offlineSpoolQueue.isNotEmpty()) {
                    val job = offlineSpoolQueue.peek()
                    if (job != null) {
                        val success = tryDirectPrint(job.ipAddress, job.port, job.data)
                        if (success) {
                            offlineSpoolQueue.poll()
                            backoffAttempt = 0
                            Log.i(tag, "Spooled print job for order ${job.orderNumber} successfully flushed!")
                        } else {
                            backoffAttempt++
                            job.retryAttempts++
                            val delaySeconds = min(30L, 2.0.pow(min(backoffAttempt, 5)).toLong())
                            Log.w(tag, "Direct print failed for order ${job.orderNumber}, retry #${job.retryAttempts}. Backoff: ${delaySeconds}s")
                            delay(delaySeconds * 1000L)
                        }
                    }
                } else {
                    backoffAttempt = 0
                    delay(5000L) // Idle poll interval
                }
            }
        }
    }

    private fun tryDirectPrint(ip: String, port: Int, data: ByteArray): Boolean {
        var s: Socket? = null
        var out: OutputStream? = null
        return try {
            s = Socket()
            s.connect(InetSocketAddress(ip, port), 1500)
            out = s.getOutputStream()
            out.write(data)
            out.flush()
            true
        } catch (e: Exception) {
            Log.d(tag, "tryDirectPrint failed to $ip:$port (${e.message})")
            false
        } finally {
            try {
                out?.close()
            } catch (e: Exception) {
                Log.w(tag, "Error closing flush output stream", e)
            }
            try {
                s?.close()
            } catch (e: Exception) {
                Log.w(tag, "Error closing flush socket", e)
            }
        }
    }

    fun getSpoolQueueSize(): Int = offlineSpoolQueue.size
}
