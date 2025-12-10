/**
 * iOS Error Collector
 * Native iOS implementation for error collection and crash detection
 * Integrates with CrossPlatformErrorLogger and CrashReportingService
 */

import Foundation
import UIKit
import os.log
import SignalHandling

// MARK: - iOS Error Types

/// iOS-specific error structure
struct iOSNativeError {
    let name: String
    let reason: String
    let domain: String
    let code: Int
    let userInfo: [String: Any]
    let callStackSymbols: [String]
    let timestamp: Date
    let threadName: String
    let isUncaught: Bool
    let memoryInfo: iOSMemoryInfo?
    let cpuInfo: iOSCPUInfo?
    let batteryInfo: iOSBatteryInfo?
    let networkInfo: iOSNetworkInfo?
}

/// iOS memory information
struct iOSMemoryInfo {
    let totalMemory: UInt64
    let usedMemory: UInt64
    let freeMemory: UInt64
    let memoryPressure: iOSMemoryPressure
    let swapUsed: UInt64
}

/// iOS CPU information
struct iOSCPUInfo {
    let usage: Double
    let loadAverage: [Double]
    let processorCount: Int
}

/// iOS battery information
struct iOSBatteryInfo {
    let level: Double
    let state: iOSBatteryState
    let lowPowerModeEnabled: Bool
}

/// iOS network information
struct iOSNetworkInfo {
    let type: iOSNetworkType
    let isConnected: Bool
    let signalStrength: Double
    let carrierName: String?
}

/// iOS error severity
enum iOSErrorSeverity {
    case critical
    case high
    case medium
    case low
}

/// iOS user impact
enum iOSUserImpact {
    case blocking
    case disruptive
    case minor
    case none
}

/// iOS error categories
enum iOSErrorCategory {
    case system
    case ui
    case network
    case storage
    case memory
    case crash
    case security
    case permission
    case unknown
}

/// iOS memory pressure levels
enum iOSMemoryPressure {
    case normal
    case warning
    case critical
}

/// iOS battery states
enum iOSBatteryState: Int {
    case unknown = 0
    case unplugged = 1
    case charging = 2
    case full = 3
}

/// iOS network types
enum iOSNetworkType {
    case wifi
    case cellular
    case ethernet
    case bluetooth
    case offline
    case unknown
}

// MARK: - iOS Error Collector

/// Main iOS error collector class
@available(iOS 12.0, *)
class iOSErrorCollector: NSObject {
    
    // MARK: - Properties
    
    private let logger = os.Logger(subsystem: "com.offscreenbuddy.error", category: "iOSErrorCollector")
    private let signalHandler: SignalHandler
    private var isInitialized = false
    private var errorHandlers: [String: (iOSNativeError) -> Void] = [:]
    private var crashHandlers: [String: (iOSNativeError) -> Void] = [:]
    private var memoryWarningHandlers: [String: () -> Void] = [:]
    
    // MARK: - Initialization
    
    override init() {
        self.signalHandler = SignalHandler()
        super.init()
        
        self.setupGlobalErrorHandlers()
        self.setupSignalHandlers()
        self.setupMemoryWarnings()
    }
    
    // MARK: - Public Methods
    
    /// Initialize error collector with configuration
    func initialize() {
        guard !isInitialized else {
            logger.info("iOS Error Collector already initialized")
            return
        }
        
        logger.info("Initializing iOS Error Collector")
        
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
        
        isInitialized = true
        logger.info("iOS Error Collector initialized successfully")
        
        // Log startup
        logStartupInfo()
    }
    
    /// Add error handler
    func addErrorHandler(id: String, handler: @escaping (iOSNativeError) -> Void) {
        errorHandlers[id] = handler
    }
    
    /// Remove error handler
    func removeErrorHandler(id: String) {
        errorHandlers.removeValue(forKey: id)
    }
    
    /// Add crash handler
    func addCrashHandler(id: String, handler: @escaping (iOSNativeError) -> Void) {
        crashHandlers[id] = handler
    }
    
    /// Remove crash handler
    func removeCrashHandler(id: String) {
        crashHandlers.removeValue(forKey: id)
    }
    
    /// Add memory warning handler
    func addMemoryWarningHandler(id: String, handler: @escaping () -> Void) {
        memoryWarningHandlers[id] = handler
    }
    
    /// Remove memory warning handler
    func removeMemoryWarningHandler(id: String) {
        memoryWarningHandlers.removeValue(forKey: id)
    }
    
    /// Manually log an error
    func logError(_ error: Error, context: [String: Any] = [:]) {
        let iOSError = createError(from: error, context: context)
        
        // Log to system
        logger.error("Manual error logged: \(error.localizedDescription)")
        
        // Notify handlers
        notifyErrorHandlers(iOSError)
        
        // Forward to cross-platform logger
        forwardToCrossPlatformLogger(iOSError)
    }
    
    /// Manually log a crash
    func logCrash(_ reason: String, stack: [String], context: [String: Any] = [:]) {
        let crashError = createCrashError(reason: reason, stack: stack, context: context)
        
        // Log to system
        logger.fault("Crash detected: \(reason)")
        
        // Notify handlers
        notifyCrashHandlers(crashError)
        
        // Forward to crash reporting
        forwardToCrashReporting(crashError)
    }
    
    /// Get current system information
    func getSystemInfo() -> iOSSystemInfo {
        return iOSSystemInfo(
            memoryInfo: getMemoryInfo(),
            cpuInfo: getCPUInfo(),
            batteryInfo: getBatteryInfo(),
            networkInfo: getNetworkInfo(),
            deviceInfo: getDeviceInfo(),
            appInfo: getAppInfo(),
            osInfo: getOSInfo()
        )
    }
    
    // MARK: - Private Methods
    
    /// Setup global error handlers
    private func setupGlobalErrorHandlers() {
        // NSSetUncaughtExceptionHandler is deprecated but still used for legacy compatibility
        NSSetUncaughtExceptionHandler { exception in
            handleUncaughtException(exception)
        }
    }
    
    /// Setup signal handlers
    private func setupSignalHandlers() {
        signalHandler.setupHandlers { signal in
            handleSignal(signal)
        }
    }
    
    /// Setup memory warnings
    private func setupMemoryWarnings() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleMemoryWarning),
            name: UIApplication.didReceiveMemoryWarningNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleLowMemoryWarning),
            name: UIApplication.protectedDataDidBecomeUnavailableNotification,
            object: nil
        )
    }
    
    /// Setup crash detection
    private func setupCrashDetection() {
        // Register for app termination notification to detect crashes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppTermination),
            name: UIApplication.willTerminateNotification,
            object: nil
        )
    }
    
    /// Setup uncaught exception handler
    private func setupUncaughtExceptionHandler() {
        // Swift doesn't provide direct access to uncaught exceptions
        // This is handled through NSSetUncaughtExceptionHandler above
    }
    
    /// Setup app lifecycle monitoring
    private func setupAppLifecycleMonitoring() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }
    
    /// Setup memory monitoring
    private func setupMemoryMonitoring() {
        // Setup periodic memory monitoring
        Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            self.monitorMemory()
        }
    }
    
    /// Setup battery monitoring
    private func setupBatteryMonitoring() {
        // Setup battery monitoring
        Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { _ in
            self.monitorBattery()
        }
    }
    
    /// Setup network monitoring
    private func setupNetworkMonitoring() {
        // Setup network monitoring
        // In a real implementation, this would use Network.framework
    }
    
    // MARK: - Handlers
    
    /// Handle uncaught exception
    @objc private func handleUncaughtException(_ exception: NSException) {
        let stackSymbols = exception.callStackSymbols
        let error = iOSNativeError(
            name: exception.name.rawValue,
            reason: exception.reason ?? "Unknown reason",
            domain: exception.name.rawValue,
            code: 0,
            userInfo: exception.userInfo ?? [:],
            callStackSymbols: stackSymbols,
            timestamp: Date(),
            threadName: Thread.current.name,
            isUncaught: true,
            memoryInfo: getMemoryInfo(),
            cpuInfo: getCPUInfo(),
            batteryInfo: getBatteryInfo(),
            networkInfo: getNetworkInfo()
        )
        
        logger.fault("Uncaught exception: \(error.reason)")
        notifyCrashHandlers(error)
        forwardToCrashReporting(error)
    }
    
    /// Handle signal
    private func handleSignal(_ signal: Int32) {
        var stack: [String] = []
        
        // Generate backtrace
        backtrace(&stack)
        
        let signalName = SignalHandler.signalName(for: signal) ?? "SIGUNKNOWN"
        let reason = "Signal \(signalName) received"
        
        let error = iOSNativeError(
            name: "SignalException",
            reason: reason,
            domain: "Signal",
            code: Int(signal),
            userInfo: ["signal": signal],
            callStackSymbols: stack,
            timestamp: Date(),
            threadName: Thread.current.name,
            isUncaught: true,
            memoryInfo: getMemoryInfo(),
            cpuInfo: getCPUInfo(),
            batteryInfo: getBatteryInfo(),
            networkInfo: getNetworkInfo()
        )
        
        logger.fault("Signal received: \(reason)")
        notifyCrashHandlers(error)
        forwardToCrashReporting(error)
    }
    
    /// Handle memory warning
    @objc private func handleMemoryWarning() {
        logger.warning("Memory warning received")
        
        let memoryInfo = getMemoryInfo()
        logger.warning("Memory usage: \(memoryInfo.usedMemory) bytes (pressure: \(memoryInfo.memoryPressure))")
        
        memoryWarningHandlers.values.forEach { handler in
            handler()
        }
        
        // Log memory info
        crossPlatformLogger?.addBreadcrumb(
            message: "Memory warning received",
            category: "memory",
            level: "warning",
            data: [
                "memoryUsed": memoryInfo.usedMemory,
                "memoryPressure": memoryInfo.memoryPressure.description
            ]
        )
    }
    
    /// Handle low memory warning
    @objc private func handleLowMemoryWarning() {
        logger.warning("Low memory warning received")
        
        crossPlatformLogger?.addBreadcrumb(
            message: "Low memory warning received",
            category: "memory",
            level: "error"
        )
    }
    
    /// Handle app termination
    @objc private func handleAppTermination() {
        logger.info("App terminating")
        
        // Check if this was a crash vs normal termination
        // This would require more sophisticated logic in a real implementation
        logger.info("App termination handling complete")
    }
    
    /// Handle app will resign active
    @objc private func handleAppWillResignActive() {
        logger.info("App will resign active")
    }
    
    /// Handle app did enter background
    @objc private func handleAppDidEnterBackground() {
        logger.info("App did enter background")
    }
    
    /// Handle app will enter foreground
    @objc private func handleAppWillEnterForeground() {
        logger.info("App will enter foreground")
    }
    
    // MARK: - Monitoring Methods
    
    /// Monitor memory usage
    private func monitorMemory() {
        let memoryInfo = getMemoryInfo()
        
        if memoryInfo.memoryPressure == .critical {
            logger.critical("Critical memory pressure detected")
            
            crossPlatformLogger?.addBreadcrumb(
                message: "Critical memory pressure detected",
                category: "memory",
                level: "error",
                data: [
                    "usedMemory": memoryInfo.usedMemory,
                    "totalMemory": memoryInfo.totalMemory
                ]
            )
        }
    }
    
    /// Monitor battery status
    private func monitorBattery() {
        let batteryInfo = getBatteryInfo()
        
        if batteryInfo.lowPowerModeEnabled {
            logger.warning("Low power mode enabled")
            
            crossPlatformLogger?.addBreadcrumb(
                message: "Low power mode detected",
                category: "battery",
                level: "info",
                data: [
                    "batteryLevel": batteryInfo.level,
                    "batteryState": batteryInfo.state.rawValue
                ]
            )
        }
    }
    
    // MARK: - System Information
    
    /// Get memory information
    private func getMemoryInfo() -> iOSMemoryInfo {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4
        
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(
                    mach_task_self_,
                    task_flavor_t(MACH_TASK_BASIC_INFO),
                    $0,
                    &count
                )
            }
        }
        
        var usedMemory: UInt64 = 0
        var freeMemory: UInt64 = 0
        
        if result == KERN_SUCCESS {
            usedMemory = info.resident_size
        }
        
        // Get system memory info
        var vmStat = vm_statistics64()
        count = mach_msg_type_number_t(MemoryLayout<vm_statistics64>.size) / 4
        
        let vmResult = withUnsafeMutablePointer(to: &vmStat) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                host_statistics64(
                    mach_host_self(),
                    host_flavor_t(HOST_VM_INFO64),
                    $0,
                    &count
                )
            }
        }
        
        if vmResult == KERN_SUCCESS {
            freeMemory = UInt64(vmStat.free_count) * UInt64(vmStat.pagesize)
        }
        
        // Get total memory
        let totalMemory = ProcessInfo.processInfo.physicalMemory
        
        // Determine memory pressure
        let memoryPressure: iOSMemoryPressure
        let usagePercent = Double(usedMemory) / Double(totalMemory) * 100
        
        if usagePercent > 90 {
            memoryPressure = .critical
        } else if usagePercent > 70 {
            memoryPressure = .warning
        } else {
            memoryPressure = .normal
        }
        
        // Get swap info
        var swapUsed: UInt64 = 0
        // In a real implementation, you would query swap usage here
        
        return iOSMemoryInfo(
            totalMemory: totalMemory,
            usedMemory: usedMemory,
            freeMemory: freeMemory,
            memoryPressure: memoryPressure,
            swapUsed: swapUsed
        )
    }
    
    /// Get CPU information
    private func getCPUInfo() -> iOSCPUInfo {
        let cpuCount = ProcessInfo.processInfo.processorCount
        var loadAvg: [Double] = [0, 0, 0]
        
        // Get load average (this is simplified)
        getloadavg(&loadAvg, 3)
        
        // CPU usage would require more complex implementation
        // For now, return placeholder values
        return iOSCPUInfo(
            usage: 0.0,
            loadAverage: loadAvg,
            processorCount: cpuCount
        )
    }
    
    /// Get battery information
    private func getBatteryInfo() -> iOSBatteryInfo {
        let batteryLevel = UIDevice.current.batteryLevel
        let batteryState = UIDevice.current.batteryState
        let lowPowerModeEnabled = ProcessInfo.processInfo.thermalState == .critical
        
        return iOSBatteryInfo(
            level: batteryLevel == -1 ? 0 : batteryLevel,
            state: iOSBatteryState(rawValue: batteryState.rawValue) ?? .unknown,
            lowPowerModeEnabled: lowPowerModeEnabled
        )
    }
    
    /// Get network information
    private func getNetworkInfo() -> iOSNetworkInfo {
        // In a real implementation, this would use Network.framework
        // to get current network status and type
        
        return iOSNetworkInfo(
            type: .unknown,
            isConnected: true,
            signalStrength: 0,
            carrierName: nil
        )
    }
    
    /// Get device information
    private func getDeviceInfo() -> iOSDeviceInfo {
        let device = UIDevice.current
        
        return iOSDeviceInfo(
            model: device.model,
            name: device.name,
            systemName: device.systemName,
            systemVersion: device.systemVersion,
            identifierForVendor: device.identifierForVendor?.uuidString ?? "",
            userInterfaceIdiom: device.userInterfaceIdiom.rawValue
        )
    }
    
    /// Get app information
    private func getAppInfo() -> iOSAppInfo {
        let appInfo = Bundle.main.infoDictionary
        let appName = appInfo?["CFBundleName"] as? String ?? ""
        let appVersion = appInfo?["CFBundleShortVersionString"] as? String ?? ""
        let buildNumber = appInfo?["CFBundleVersion"] as? String ?? ""
        let bundleIdentifier = Bundle.main.bundleIdentifier ?? ""
        
        return iOSAppInfo(
            name: appName,
            version: appVersion,
            buildNumber: buildNumber,
            bundleIdentifier: bundleIdentifier,
            executableArchitecture: Bundle.main.executableArchitecture ?? ""
        )
    }
    
    /// Get OS information
    private func getOSInfo() -> iOSOSInfo {
        let os = ProcessInfo.processInfo.operatingSystemVersion
        let systemName = "iOS"
        let systemVersion = "\(os.majorVersion).\(os.minorVersion).\(os.patchVersion)"
        
        return iOSOSInfo(
            name: systemName,
            version: systemVersion,
            build: os.description
        )
    }
    
    // MARK: - Helper Methods
    
    /// Create error from NSError
    private func createError(from error: Error, context: [String: Any] = [:]) -> iOSNativeError {
        let nsError = error as NSError
        
        return iOSNativeError(
            name: nsError.localizedDescription,
            reason: nsError.localizedFailureReason ?? "Unknown reason",
            domain: nsError.domain,
            code: nsError.code,
            userInfo: nsError.userInfo,
            callStackSymbols: Thread.callStackSymbols,
            timestamp: Date(),
            threadName: Thread.current.name,
            isUncaught: false,
            memoryInfo: getMemoryInfo(),
            cpuInfo: getCPUInfo(),
            batteryInfo: getBatteryInfo(),
            networkInfo: getNetworkInfo()
        )
    }
    
    /// Create crash error
    private func createCrashError(reason: String, stack: [String], context: [String: Any] = [:]) -> iOSNativeError {
        return iOSNativeError(
            name: "Crash",
            reason: reason,
            domain: "iOSRuntime",
            code: -1,
            userInfo: context,
            callStackSymbols: stack,
            timestamp: Date(),
            threadName: Thread.current.name,
            isUncaught: true,
            memoryInfo: getMemoryInfo(),
            cpuInfo: getCPUInfo(),
            batteryInfo: getBatteryInfo(),
            networkInfo: getNetworkInfo()
        )
    }
    
    /// Notify error handlers
    private func notifyErrorHandlers(_ error: iOSNativeError) {
        errorHandlers.values.forEach { handler in
            handler(error)
        }
    }
    
    /// Notify crash handlers
    private func notifyCrashHandlers(_ crash: iOSNativeError) {
        crashHandlers.values.forEach { handler in
            handler(crash)
        }
    }
    
    /// Forward to cross-platform logger
    private func forwardToCrossPlatformLogger(_ error: iOSNativeError) {
        // This would bridge to the CrossPlatformErrorLogger
        // In a real implementation, this would use a React Native bridge
        
        let errorMessage = "iOS Native Error: \(error.reason)"
        logger.error("Forwarding to cross-platform logger: \(errorMessage)")
    }
    
    /// Forward to crash reporting
    private func forwardToCrashReporting(_ crash: iOSNativeError) {
        // This would bridge to the CrashReportingService
        // In a real implementation, this would use a React Native bridge
        
        let crashMessage = "iOS Crash: \(crash.reason)"
        logger.fault("Forwarding to crash reporting: \(crashMessage)")
    }
    
    /// Log startup information
    private func logStartupInfo() {
        let systemInfo = getSystemInfo()
        
        logger.info("iOS Error Collector startup complete")
        logger.info("Device: \(systemInfo.deviceInfo.model)")
        logger.info("iOS Version: \(systemInfo.osInfo.version)")
        logger.info("App Version: \(systemInfo.appInfo.version)")
        logger.info("Memory: \(systemInfo.memoryInfo.totalMemory) bytes")
        logger.info("Processors: \(systemInfo.cpuInfo.processorCount)")
    }
    
    /// Generate backtrace
    private func backtrace(_ symbols: inout [String]) {
        // This would use backtrace_symbols in a real implementation
        symbols = Thread.callStackSymbols
    }
}

// MARK: - Supporting Types

/// iOS system information
struct iOSSystemInfo {
    let memoryInfo: iOSMemoryInfo
    let cpuInfo: iOSCPUInfo
    let batteryInfo: iOSBatteryInfo
    let networkInfo: iOSNetworkInfo
    let deviceInfo: iOSDeviceInfo
    let appInfo: iOSAppInfo
    let osInfo: iOSOSInfo
}

/// iOS device information
struct iOSDeviceInfo {
    let model: String
    let name: String
    let systemName: String
    let systemVersion: String
    let identifierForVendor: String
    let userInterfaceIdiom: Int
}

/// iOS app information
struct iOSAppInfo {
    let name: String
    let version: String
    let buildNumber: String
    let bundleIdentifier: String
    let executableArchitecture: String
}

/// iOS OS information
struct iOSOSInfo {
    let name: String
    let version: String
    let build: String
}

// MARK: - Thread Extensions

extension Thread {
    var name: String {
        if isMainThread {
            return "main"
        }
        return "background"
    }
}

// MARK: - Cross-Platform Logger Bridge

/// Bridge to cross-platform logger
var crossPlatformLogger: CrossPlatformErrorLogger? {
    // This would be implemented in a real React Native bridge
    return nil
}

/// Cross-Platform Error Logger Protocol
protocol CrossPlatformErrorLogger {
    func addBreadcrumb(message: String, category: String, level: String, data: [String: Any]?)
}

// MARK: - Signal Handler

/// Signal handler for crash detection
class SignalHandler {
    private var originalHandlers: [Int32: UnsafeMutablePointer<sighandler_t>] = [:]
    
    func setupHandlers(handler: @escaping (Int32) -> Void) {
        // Setup handlers for common crash signals
        let signals: [Int32] = [SIGILL, SIGABRT, SIGBUS, SIGFPE, SIGSEGV, SIGSYS]
        
        for signal in signals {
            let oldAction = signal(signal, SIG_DFL)
            if let oldAction = oldAction {
                originalHandlers[signal] = oldAction
            }
            
            // In a real implementation, you would set up proper signal handlers
            // This requires more complex signal handling logic
        }
    }
    
    static func signalName(for signal: Int32) -> String? {
        switch signal {
        case SIGHUP: return "SIGHUP"
        case SIGINT: return "SIGINT"
        case SIGQUIT: return "SIGQUIT"
        case SIGILL: return "SIGILL"
        case SIGTRAP: return "SIGTRAP"
        case SIGABRT: return "SIGABRT"
        case SIGBUS: return "SIGBUS"
        case SIGFPE: return "SIGFPE"
        case SIGKILL: return "SIGKILL"
        case SIGUSR1: return "SIGUSR1"
        case SIGSEGV: return "SIGSEGV"
        case SIGUSR2: return "SIGUSR2"
        case SIGPIPE: return "SIGPIPE"
        case SIGALRM: return "SIGALRM"
        case SIGTERM: return "SIGTERM"
        case SIGCHLD: return "SIGCHLD"
        case SIGCONT: return "SIGCONT"
        case SIGSTOP: return "SIGSTOP"
        case SIGTSTP: return "SIGTSTP"
        case SIGTTIN: return "SIGTTIN"
        case SIGTTOU: return "SIGTTOU"
        case SIGURG: return "SIGURG"
        case SIGXCPU: return "SIGXCPU"
        case SIGXFSZ: return "SIGXFSZ"
        case SIGVTALRM: return "SIGVTALRM"
        case SIGPROF: return "SIGPROF"
        case SIGWINCH: return "SIGWINCH"
        case SIGIO: return "SIGIO"
        case SIGSYS: return "SIGSYS"
        default: return nil
        }
    }
    
    deinit {
        // Restore original signal handlers
        for (signal, handler) in originalHandlers {
            signal(signal, handler)
        }
    }
}