/**
 * Android Error Collector
 * Native Android implementation for error collection and crash detection
 * Integrates with CrossPlatformErrorLogger and CrashReportingService
 */

package com.offscreenbuddy.errorhandling

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.os.Debug
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import kotlinx.coroutines.*
import java.io.PrintWriter
import java.io.StringWriter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

// MARK: - Android Error Types

/**
 * Android-specific error structure
 */
data class AndroidNativeError(
    val name: String,
    val reason: String,
    val domain: String,
    val code: Int,
    val userInfo: Map<String, Any>,
    val stackTrace: Array<String>,
    val timestamp: Long,
    val threadName: String,
    val isUncaught: Boolean,
    val memoryInfo: AndroidMemoryInfo? = null,
    val cpuInfo: AndroidCPUInfo? = null,
    val batteryInfo: AndroidBatteryInfo? = null,
    val networkInfo: AndroidNetworkInfo? = null,
    val appState: String = "unknown"
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as AndroidNativeError
        return timestamp == other.timestamp && name == other.name
    }

    override fun hashCode(): Int {
        var result = name.hashCode()
        result = 31 * result + timestamp.hashCode()
        return result
    }
}

/**
 * Android memory information
 */
data class AndroidMemoryInfo(
    val totalMemory: Long,
    val availableMemory: Long,
    val usedMemory: Long,
    val memoryPressure: AndroidMemoryPressure,
    val lowRamDevice: Boolean,
    val isLowRamModeEnabled: Boolean
)

/**
 * Android CPU information
 */
data class AndroidCPUInfo(
    val usage: Double,
    val coreCount: Int,
    val maxFrequency: Long,
    val isLowPowerMode: Boolean
)

/**
 * Android battery information
 */
data class AndroidBatteryInfo(
    val level: Int,
    val voltage: Int,
    val temperature: Int,
    val chargingState: AndroidBatteryState,
    val lowPowerModeEnabled: Boolean,
    val powerSaveModeEnabled: Boolean
)

/**
 * Android network information
 */
data class AndroidNetworkInfo(
    val type: AndroidNetworkType,
    val isConnected: Boolean,
    val signalStrength: Int,
    val carrierName: String?
)

/**
 * Android error severity
 */
enum class AndroidErrorSeverity {
    CRITICAL,
    HIGH,
    MEDIUM,
    LOW
}

/**
 * Android user impact
 */
enum class AndroidUserImpact {
    BLOCKING,
    DISRUPTIVE,
    MINOR,
    NONE
}

/**
 * Android error categories
 */
enum class AndroidErrorCategory {
    SYSTEM,
    UI,
    NETWORK,
    STORAGE,
    MEMORY,
    CRASH,
    SECURITY,
    PERMISSION,
    UNKNOWN
}

/**
 * Android memory pressure levels
 */
enum class AndroidMemoryPressure {
    NORMAL,
    WARNING,
    CRITICAL
}

/**
 * Android battery states
 */
enum class AndroidBatteryState {
    CHARGING,
    DISCHARGING,
    FULL,
    UNKNOWN
}

/**
 * Android network types
 */
enum class AndroidNetworkType {
    WIFI,
    CELLULAR,
    ETHERNET,
    BLUETOOTH,
    OFFLINE,
    UNKNOWN
}

/**
 * Android device information
 */
data class AndroidDeviceInfo(
    val manufacturer: String,
    val model: String,
    val androidVersion: String,
    val sdkInt: Int,
    val deviceId: String?,
    val isLowRamDevice: Boolean,
    val isTablet: Boolean
)

/**
 * Android app information
 */
data class AndroidAppInfo(
    val packageName: String,
    val versionName: String,
    val versionCode: Long,
    val firstInstallTime: Long,
    val lastUpdateTime: Long
)

// MARK: - Android Error Collector

/**
 * Main Android error collector class
 */
class AndroidErrorCollector(private val context: Context) {
    
    companion object {
        private const val TAG = "AndroidErrorCollector"
        private const val CRASH_HANDLER_KEY = "crash_handler"
        private const val ERROR_HANDLER_KEY = "error_handler"
    }
    
    // Properties
    private val logger = Log
    private val isInitialized = AtomicBoolean(false)
    private val errorHandlers = ConcurrentHashMap<String, (AndroidNativeError) -> Unit>()
    private val crashHandlers = ConcurrentHashMap<String, (AndroidNativeError) -> Unit>()
    private val memoryWarningHandlers = ConcurrentHashMap<String, () -> Unit>()
    private val handler = Handler(Looper.getMainLooper())
    private var broadcastReceiver: AndroidBroadcastReceiver? = null
    
    // MARK: - Public Methods
    
    /**
     * Initialize error collector with configuration
     */
    fun initialize() {
        if (isInitialized.getAndSet(true)) {
            Log.w(TAG, "Android Error Collector already initialized")
            return
        }
        
        Log.i(TAG, "Initializing Android Error Collector")
        
        try {
            // Setup crash detection
            setupCrashDetection()
            
            // Setup uncaught exception handler
            setupUncaughtExceptionHandler()
            
            // Setup signal handlers
            setupSignalHandlers()
            
            // Setup app lifecycle monitoring
            setupAppLifecycleMonitoring()
            
            // Setup memory monitoring
            setupMemoryMonitoring()
            
            // Setup battery monitoring
            setupBatteryMonitoring()
            
            // Setup network monitoring
            setupNetworkMonitoring()
            
            // Setup broadcast receivers
            setupBroadcastReceivers()
            
            Log.i(TAG, "Android Error Collector initialized successfully")
            
            // Log startup info
            logStartupInfo()
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Android Error Collector", e)
            throw e
        }
    }
    
    /**
     * Add error handler
     */
    fun addErrorHandler(id: String, handler: (AndroidNativeError) -> Unit) {
        errorHandlers[id] = handler
    }
    
    /**
     * Remove error handler
     */
    fun removeErrorHandler(id: String) {
        errorHandlers.remove(id)
    }
    
    /**
     * Add crash handler
     */
    fun addCrashHandler(id: String, handler: (AndroidNativeError) -> Unit) {
        crashHandlers[id] = handler
    }
    
    /**
     * Remove crash handler
     */
    fun removeCrashHandler(id: String) {
        crashHandlers.remove(id)
    }
    
    /**
     * Add memory warning handler
     */
    fun addMemoryWarningHandler(id: String, handler: () -> Unit) {
        memoryWarningHandlers[id] = handler
    }
    
    /**
     * Remove memory warning handler
     */
    fun removeMemoryWarningHandler(id: String) {
        memoryWarningHandlers.remove(id)
    }
    
    /**
     * Manually log an error
     */
    fun logError(error: Throwable, context: Map<String, Any> = emptyMap()) {
        val androidError = createErrorFromThrowable(error, context)
        
        // Log to Android system
        Log.e(TAG, "Manual error logged: ${error.message}", error)
        
        // Notify handlers
        notifyErrorHandlers(androidError)
        
        // Forward to cross-platform logger
        forwardToCrossPlatformLogger(androidError)
    }
    
    /**
     * Manually log a crash
     */
    fun logCrash(reason: String, stack: Array<String>, context: Map<String, Any> = emptyMap()) {
        val crashError = createCrashError(reason, stack, context)
        
        // Log to Android system
        Log.wtf(TAG, "Crash detected: $reason")
        
        // Notify handlers
        notifyCrashHandlers(crashError)
        
        // Forward to crash reporting
        forwardToCrashReporting(crashError)
    }
    
    /**
     * Get current system information
     */
    fun getSystemInfo(): AndroidSystemInfo {
        return AndroidSystemInfo(
            memoryInfo = getMemoryInfo(),
            cpuInfo = getCPUInfo(),
            batteryInfo = getBatteryInfo(),
            networkInfo = getNetworkInfo(),
            deviceInfo = getDeviceInfo(),
            appInfo = getAppInfo()
        )
    }
    
    /**
     * Force a crash for testing purposes
     */
    fun forceTestCrash() {
        Log.w(TAG, "Forcing test crash")
        throw RuntimeException("Test crash for Android Error Collector")
    }
    
    // MARK: - Private Methods
    
    /**
     * Setup crash detection
     */
    private fun setupCrashDetection() {
        // Set default uncaught exception handler
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        
        Thread.setDefaultUncaughtExceptionHandler { thread, ex ->
            handleUncaughtException(thread, ex, defaultHandler)
        }
    }
    
    /**
     * Setup uncaught exception handler
     */
    private fun setupUncaughtExceptionHandler() {
        // This is handled by setupCrashDetection
    }
    
    /**
     * Setup signal handlers
     */
    private fun setupSignalHandlers() {
        // Android doesn't support POSIX signals the same way as iOS
        // Crash detection is handled through uncaught exceptions
    }
    
    /**
     * Setup app lifecycle monitoring
     */
    private fun setupAppLifecycleMonitoring() {
        // Register for lifecycle callbacks
        // This would be done through Application.ActivityLifecycleCallbacks
        Log.d(TAG, "App lifecycle monitoring setup (would use ActivityLifecycleCallbacks)")
    }
    
    /**
     * Setup memory monitoring
     */
    private fun setupMemoryMonitoring() {
        // Periodic memory monitoring
        CoroutineScope(Dispatchers.Main).launch {
            while (true) {
                delay(30_000) // 30 seconds
                monitorMemory()
            }
        }
    }
    
    /**
     * Setup battery monitoring
     */
    private fun setupBatteryMonitoring() {
        // Register for battery changed broadcast
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        broadcastReceiver = AndroidBroadcastReceiver { intent ->
            handleBatteryChanged(intent)
        }
        context.registerReceiver(broadcastReceiver, filter)
        
        // Periodic battery monitoring
        CoroutineScope(Dispatchers.Main).launch {
            while (true) {
                delay(60_000) // 1 minute
                monitorBattery()
            }
        }
    }
    
    /**
     * Setup network monitoring
     */
    private fun setupNetworkMonitoring() {
        // Register for network changed broadcast
        val filter = IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION)
        broadcastReceiver = AndroidBroadcastReceiver { intent ->
            handleNetworkChanged(intent)
        }
        context.registerReceiver(broadcastReceiver, filter)
    }
    
    /**
     * Setup broadcast receivers
     */
    private fun setupBroadcastReceivers() {
        // Register for memory low broadcasts
        val filter = IntentFilter(Intent.ACTION_DEVICE_STORAGE_LOW)
        broadcastReceiver = AndroidBroadcastReceiver { intent ->
            handleMemoryLow(intent)
        }
        context.registerReceiver(broadcastReceiver, filter)
        
        // Register for memory ok broadcasts
        val filterOk = IntentFilter(Intent.ACTION_DEVICE_STORAGE_OK)
        broadcastReceiver = AndroidBroadcastReceiver { intent ->
            handleMemoryOk(intent)
        }
        context.registerReceiver(broadcastReceiver, filterOk)
    }
    
    // MARK: - Handlers
    
    /**
     * Handle uncaught exception
     */
    private fun handleUncaughtException(
        thread: Thread, 
        ex: Throwable, 
        defaultHandler: Thread.UncaughtExceptionHandler?
    ) {
        try {
            Log.e(TAG, "Uncaught exception in thread: ${thread.name}", ex)
            
            val stackTrace = getStackTrace(ex)
            val error = AndroidNativeError(
                name = ex.javaClass.simpleName,
                reason = ex.message ?: "Unknown exception",
                domain = ex.javaClass.`package`?.name ?: "Unknown",
                code = 0,
                userInfo = mapOf(
                    "threadName" to thread.name,
                    "threadId" to thread.id
                ),
                stackTrace = stackTrace,
                timestamp = System.currentTimeMillis(),
                threadName = thread.name,
                isUncaught = true,
                memoryInfo = getMemoryInfo(),
                cpuInfo = getCPUInfo(),
                batteryInfo = getBatteryInfo(),
                networkInfo = getNetworkInfo(),
                appState = "terminating"
            )
            
            // Notify crash handlers
            notifyCrashHandlers(error)
            
            // Forward to crash reporting
            forwardToCrashReporting(error)
            
            // Call default handler
            defaultHandler?.uncaughtException(thread, ex)
            
        } catch (handlerError: Exception) {
            Log.e(TAG, "Error in uncaught exception handler", handlerError)
            defaultHandler?.uncaughtException(thread, ex)
        }
    }
    
    /**
     * Handle battery changed
     */
    private fun handleBatteryChanged(intent: Intent?) {
        if (intent?.action == Intent.ACTION_BATTERY_CHANGED) {
            val level = intent.getIntExtra("level", -1)
            val scale = intent.getIntExtra("scale", -1)
            val percentage = if (scale > 0) (level * 100 / scale) else 0
            
            Log.d(TAG, "Battery level: $percentage%")
            
            // Check for low battery
            if (percentage < 20) {
                Log.w(TAG, "Low battery detected: $percentage%")
                
                crossPlatformLogger?.addBreadcrumb(
                    message = "Low battery detected",
                    category = "battery",
                    level = "warning",
                    data = mapOf(
                        "batteryLevel" to percentage,
                        "isLowBattery" to (percentage < 10)
                    )
                )
            }
        }
    }
    
    /**
     * Handle network changed
     */
    private fun handleNetworkChanged(intent: Intent?) {
        if (intent?.action == ConnectivityManager.CONNECTIVITY_ACTION) {
            val networkInfo = getNetworkInfo()
            
            Log.d(TAG, "Network changed: ${networkInfo.type} - Connected: ${networkInfo.isConnected}")
            
            crossPlatformLogger?.addBreadcrumb(
                message = "Network state changed",
                category = "network",
                level = "info",
                data = mapOf(
                    "networkType" to networkInfo.type.name,
                    "isConnected" to networkInfo.isConnected,
                    "carrierName" to (networkInfo.carrierName ?: "Unknown")
                )
            )
        }
    }
    
    /**
     * Handle memory low
     */
    private fun handleMemoryLow(intent: Intent?) {
        Log.w(TAG, "Memory low warning received")
        
        memoryWarningHandlers.values.forEach { handler ->
            handler()
        }
        
        crossPlatformLogger?.addBreadcrumb(
            message = "Memory low warning",
            category = "memory",
            level = "warning"
        )
    }
    
    /**
     * Handle memory ok
     */
    private fun handleMemoryOk(intent: Intent?) {
        Log.i(TAG, "Memory status normalized")
        
        crossPlatformLogger?.addBreadcrumb(
            message = "Memory status normalized",
            category = "memory",
            level = "info"
        )
    }
    
    // MARK: - Monitoring Methods
    
    /**
     * Monitor memory usage
     */
    private fun monitorMemory() {
        try {
            val memoryInfo = getMemoryInfo()
            
            when (memoryInfo.memoryPressure) {
                AndroidMemoryPressure.CRITICAL -> {
                    Log.w(TAG, "Critical memory pressure detected")
                    
                    crossPlatformLogger?.addBreadcrumb(
                        message = "Critical memory pressure",
                        category = "memory",
                        level = "error",
                        data = mapOf(
                            "usedMemory" to memoryInfo.usedMemory,
                            "totalMemory" to memoryInfo.totalMemory,
                            "pressureLevel" to "critical"
                        )
                    )
                }
                AndroidMemoryPressure.WARNING -> {
                    Log.d(TAG, "Memory warning level detected")
                    
                    crossPlatformLogger?.addBreadcrumb(
                        message = "Memory warning level",
                        category = "memory",
                        level = "warning",
                        data = mapOf(
                            "usedMemory" to memoryInfo.usedMemory,
                            "pressureLevel" to "warning"
                        )
                    )
                }
                else -> {
                    // Normal memory usage, no action needed
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error monitoring memory", e)
        }
    }
    
    /**
     * Monitor battery status
     */
    private fun monitorBattery() {
        try {
            val batteryInfo = getBatteryInfo()
            
            if (batteryInfo.lowPowerModeEnabled || batteryInfo.powerSaveModeEnabled) {
                Log.d(TAG, "Low power mode enabled")
                
                crossPlatformLogger?.addBreadcrumb(
                    message = "Low power mode detected",
                    category = "battery",
                    level = "info",
                    data = mapOf(
                        "batteryLevel" to batteryInfo.level,
                        "lowPowerMode" to batteryInfo.lowPowerModeEnabled,
                        "powerSaveMode" to batteryInfo.powerSaveModeEnabled
                    )
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error monitoring battery", e)
        }
    }
    
    // MARK: - System Information
    
    /**
     * Get memory information
     */
    private fun getMemoryInfo(): AndroidMemoryInfo {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)
        
        val totalMemory = memInfo.totalMem
        val availableMemory = memInfo.availMem
        val usedMemory = totalMemory - availableMemory
        
        // Determine memory pressure
        val memoryPressure: AndroidMemoryPressure
        val usagePercent = (usedMemory.toDouble() / totalMemory.toDouble() * 100).toInt()
        
        memoryPressure = when {
            usagePercent > 90 -> AndroidMemoryPressure.CRITICAL
            usagePercent > 70 -> AndroidMemoryPressure.WARNING
            else -> AndroidMemoryPressure.NORMAL
        }
        
        return AndroidMemoryInfo(
            totalMemory = totalMemory,
            availableMemory = availableMemory,
            usedMemory = usedMemory,
            memoryPressure = memoryPressure,
            lowRamDevice = activityManager.isLowRamDevice,
            isLowRamModeEnabled = memInfo.lowMemory
        )
    }
    
    /**
     * Get CPU information
     */
    private fun getCPUInfo(): AndroidCPUInfo {
        // Get CPU usage (simplified - would need more sophisticated implementation)
        val debugInfo = Debug.threadCpuTimeNanos
        val coreCount = Runtime.getRuntime().availableProcessors()
        val maxFrequency = 0L // Would need system properties to get this
        
        return AndroidCPUInfo(
            usage = 0.0, // Would be calculated from actual CPU usage
            coreCount = coreCount,
            maxFrequency = maxFrequency,
            isLowPowerMode = false // Would need to check system properties
        )
    }
    
    /**
     * Get battery information
     */
    private fun getBatteryInfo(): AndroidBatteryInfo {
        val batteryIntent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        
        var level = 0
        var voltage = 0
        var temperature = 0
        var chargingState = AndroidBatteryState.UNKNOWN
        var lowPowerModeEnabled = false
        var powerSaveModeEnabled = false
        
        batteryIntent?.let { intent ->
            level = intent.getIntExtra("level", -1)
            val scale = intent.getIntExtra("scale", -1)
            if (scale > 0) {
                level = (level * 100 / scale)
            }
            
            voltage = intent.getIntExtra("voltage", 0)
            temperature = intent.getIntExtra("temperature", 0) / 10
            
            val status = intent.getIntExtra("status", -1)
            chargingState = when (status) {
                BatteryManager.BATTERY_STATUS_CHARGING -> AndroidBatteryState.CHARGING
                BatteryManager.BATTERY_STATUS_DISCHARGING -> AndroidBatteryState.DISCHARGING
                BatteryManager.BATTERY_STATUS_FULL -> AndroidBatteryState.FULL
                else -> AndroidBatteryState.UNKNOWN
            }
            
            // Check for power save modes
            // This would need PowerManager and other APIs in a real implementation
            lowPowerModeEnabled = false
            powerSaveModeEnabled = false
        }
        
        return AndroidBatteryInfo(
            level = level,
            voltage = voltage,
            temperature = temperature,
            chargingState = chargingState,
            lowPowerModeEnabled = lowPowerModeEnabled,
            powerSaveModeEnabled = powerSaveModeEnabled
        )
    }
    
    /**
     * Get network information
     */
    private fun getNetworkInfo(): AndroidNetworkInfo {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork
        val networkCapabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
        
        var networkType = AndroidNetworkType.UNKNOWN
        var isConnected = false
        var signalStrength = 0
        var carrierName: String? = null
        
        networkCapabilities?.let { capabilities ->
            when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                    networkType = AndroidNetworkType.WIFI
                    isConnected = true
                }
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    networkType = AndroidNetworkType.CELLULAR
                    isConnected = true
                    // Carrier name would need TelephonyManager
                }
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {
                    networkType = AndroidNetworkType.ETHERNET
                    isConnected = true
                }
            }
        }
        
        return AndroidNetworkInfo(
            type = networkType,
            isConnected = isConnected,
            signalStrength = signalStrength,
            carrierName = carrierName
        )
    }
    
    /**
     * Get device information
     */
    private fun getDeviceInfo(): AndroidDeviceInfo {
        val packageManager = context.packageManager
        
        return AndroidDeviceInfo(
            manufacturer = android.os.Build.MANUFACTURER,
            model = android.os.Build.MODEL,
            androidVersion = android.os.Build.VERSION.RELEASE,
            sdkInt = android.os.Build.VERSION.SDK_INT,
            deviceId = null, // Would need device ID permission
            isLowRamDevice = ActivityManager::class.java.getMethod("isLowRamDevice")
                .invoke(context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager) as Boolean,
            isTablet = (context.resources.configuration.screenLayout and
                    android.content.res.Configuration.SCREENLAYOUT_SIZE_MASK) >= 
                    android.content.res.Configuration.SCREENLAYOUT_SIZE_LARGE
        )
    }
    
    /**
     * Get app information
     */
    private fun getAppInfo(): AndroidAppInfo {
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        
        return AndroidAppInfo(
            packageName = context.packageName,
            versionName = packageInfo.versionName,
            versionCode = packageInfo.longVersionCode,
            firstInstallTime = packageInfo.firstInstallTime,
            lastUpdateTime = packageInfo.lastUpdateTime
        )
    }
    
    // MARK: - Helper Methods
    
    /**
     * Create error from throwable
     */
    private fun createErrorFromThrowable(throwable: Throwable, context: Map<String, Any> = emptyMap()): AndroidNativeError {
        return AndroidNativeError(
            name = throwable.javaClass.simpleName,
            reason = throwable.message ?: "Unknown error",
            domain = throwable.javaClass.`package`?.name ?: "Unknown",
            code = 0,
            userInfo = context,
            stackTrace = getStackTrace(throwable),
            timestamp = System.currentTimeMillis(),
            threadName = Thread.currentThread().name,
            isUncaught = false,
            memoryInfo = getMemoryInfo(),
            cpuInfo = getCPUInfo(),
            batteryInfo = getBatteryInfo(),
            networkInfo = getNetworkInfo(),
            appState = "active"
        )
    }
    
    /**
     * Create crash error
     */
    private fun createCrashError(reason: String, stack: Array<String>, context: Map<String, Any> = emptyMap()): AndroidNativeError {
        return AndroidNativeError(
            name = "Crash",
            reason = reason,
            domain = "AndroidRuntime",
            code = -1,
            userInfo = context,
            stackTrace = stack,
            timestamp = System.currentTimeMillis(),
            threadName = Thread.currentThread().name,
            isUncaught = true,
            memoryInfo = getMemoryInfo(),
            cpuInfo = getCPUInfo(),
            batteryInfo = getBatteryInfo(),
            networkInfo = getNetworkInfo(),
            appState = "terminating"
        )
    }
    
    /**
     * Get stack trace as array
     */
    private fun getStackTrace(throwable: Throwable): Array<String> {
        val stringWriter = StringWriter()
        val printWriter = PrintWriter(stringWriter)
        throwable.printStackTrace(printWriter)
        return stringWriter.toString().split("\n").toTypedArray()
    }
    
    /**
     * Notify error handlers
     */
    private fun notifyErrorHandlers(error: AndroidNativeError) {
        errorHandlers.values.forEach { handler ->
            try {
                handler(error)
            } catch (e: Exception) {
                Log.e(TAG, "Error in error handler", e)
            }
        }
    }
    
    /**
     * Notify crash handlers
     */
    private fun notifyCrashHandlers(crash: AndroidNativeError) {
        crashHandlers.values.forEach { handler ->
            try {
                handler(crash)
            } catch (e: Exception) {
                Log.e(TAG, "Error in crash handler", e)
            }
        }
    }
    
    /**
     * Forward to cross-platform logger
     */
    private fun forwardToCrossPlatformLogger(error: AndroidNativeError) {
        // This would bridge to the CrossPlatformErrorLogger
        // In a real implementation, this would use React Native bridge
        
        Log.d(TAG, "Forwarding to cross-platform logger: ${error.reason}")
        crossPlatformLogger?.addBreadcrumb(
            message = "Android Native Error: ${error.reason}",
            category = "android",
            level = "error",
            data = mapOf(
                "errorName" to error.name,
                "threadName" to error.threadName,
                "isUncaught" to error.isUncaught
            )
        )
    }
    
    /**
     * Forward to crash reporting
     */
    private fun forwardToCrashReporting(crash: AndroidNativeError) {
        // This would bridge to the CrashReportingService
        // In a real implementation, this would use React Native bridge
        
        Log.wtf(TAG, "Forwarding to crash reporting: ${crash.reason}")
        // crashReportingService?.reportCrash(crash)
    }
    
    /**
     * Log startup information
     */
    private fun logStartupInfo() {
        val systemInfo = getSystemInfo()
        
        Log.i(TAG, "Android Error Collector startup complete")
        Log.i(TAG, "Device: ${systemInfo.deviceInfo.manufacturer} ${systemInfo.deviceInfo.model}")
        Log.i(TAG, "Android Version: ${systemInfo.deviceInfo.androidVersion}")
        Log.i(TAG, "App Version: ${systemInfo.appInfo.versionName}")
        Log.i(TAG, "Memory: ${systemInfo.memoryInfo.totalMemory} bytes")
        Log.i(TAG, "CPU Cores: ${systemInfo.cpuInfo.coreCount}")
    }
    
    // MARK: - Cleanup
    
    /**
     * Cleanup resources
     */
    fun destroy() {
        try {
            // Unregister broadcast receivers
            broadcastReceiver?.let { receiver ->
                context.unregisterReceiver(receiver)
                broadcastReceiver = null
            }
            
            // Clear handlers
            errorHandlers.clear()
            crashHandlers.clear()
            memoryWarningHandlers.clear()
            
            Log.i(TAG, "Android Error Collector destroyed")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
}

// MARK: - Supporting Types

/**
 * Android system information
 */
data class AndroidSystemInfo(
    val memoryInfo: AndroidMemoryInfo,
    val cpuInfo: AndroidCPUInfo,
    val batteryInfo: AndroidBatteryInfo,
    val networkInfo: AndroidNetworkInfo,
    val deviceInfo: AndroidDeviceInfo,
    val appInfo: AndroidAppInfo
)

// MARK: - Broadcast Receiver

/**
 * Android broadcast receiver for system events
 */
private class AndroidBroadcastReceiver(
    private val onReceiveAction: (Intent?) -> Unit
) : android.content.BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent?) {
        try {
            onReceiveAction(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error in broadcast receiver", e)
        }
    }
}

// MARK: - Cross-Platform Logger Bridge

/**
 * Bridge to cross-platform logger
 */
var crossPlatformLogger: CrossPlatformLogger? = null

/**
 * Cross-Platform Logger Protocol
 */
interface CrossPlatformLogger {
    fun addBreadcrumb(message: String, category: String, level: String, data: Map<String, Any>?)
}