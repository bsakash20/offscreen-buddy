/**
 * Network Connectivity Service
 * Monitors and validates network connectivity with quality assessment
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import {
    NetworkState,
    NetworkStatus,
    NetworkQuality,
    ValidationResult,
    NetworkServiceStatus,
    Listener,
} from './types';

export class NetworkConnectivityService {
    private static instance: NetworkConnectivityService;
    private currentState: NetworkState | null = null;
    private listeners = new Map<string, Listener<NetworkState>>();
    private status: NetworkServiceStatus;
    private isInitialized = false;
    private validationCache = new Map<string, ValidationResult>();
    private lastValidationTime = 0;
    private readonly VALIDATION_CACHE_TTL = 30000; // 30 seconds
    private unsubscribe: (() => void) | null = null;

    private constructor() {
        this.status = this.getDefaultStatus();
    }

    public static getInstance(): NetworkConnectivityService {
        if (!NetworkConnectivityService.instance) {
            NetworkConnectivityService.instance = new NetworkConnectivityService();
        }
        return NetworkConnectivityService.instance;
    }

    /**
     * Initialize the network connectivity service
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Subscribe to network state changes
            this.unsubscribe = NetInfo.addEventListener((state) => {
                this.handleNetworkStateChange(state);
            });

            // Get initial network state
            const initialState = await this.getCurrentNetworkState();
            this.setCurrentState(initialState);

            this.isInitialized = true;
            console.log('✅ NetworkConnectivityService initialized');
        } catch (error) {
            console.error('❌ Failed to initialize NetworkConnectivityService:', error);
            throw error;
        }
    }

    /**
     * Get current network state
     */
    public getCurrentState(): NetworkState | null {
        return this.currentState;
    }

    /**
     * Refresh network state by checking connectivity
     */
    public async refreshNetworkState(): Promise<NetworkState> {
        try {
            const state = await this.getCurrentNetworkState();
            this.setCurrentState(state);
            return state;
        } catch (error) {
            console.error('Failed to refresh network state:', error);
            throw error;
        }
    }

    /**
     * Validate internet connectivity with speed test
     */
    public async validateConnection(): Promise<ValidationResult> {
        const now = Date.now();

        // Check if we have a recent validation result
        if (now - this.lastValidationTime < this.VALIDATION_CACHE_TTL) {
            const cached = this.validationCache.get('default');
            if (cached) {
                return cached;
            }
        }

        const startTime = performance.now();

        try {
            // Test connectivity with a simple request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });

            clearTimeout(timeoutId);

            const endTime = performance.now();
            const latency = endTime - startTime;
            const isValid = response.ok;

            const result: ValidationResult = {
                isValid,
                latency,
                downloadSpeed: this.estimateSpeed(latency),
                timestamp: new Date(),
            };

            // Cache the result
            this.validationCache.set('default', result);
            this.lastValidationTime = now;

            console.log(`🌐 Connection validated: ${isValid ? 'OK' : 'FAILED'} (${latency.toFixed(0)}ms)`);

            return result;
        } catch (error) {
            console.warn('Connection validation failed:', error);

            const result: ValidationResult = {
                isValid: false,
                latency: undefined,
                downloadSpeed: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };

            // Cache the failed result for a shorter time
            this.validationCache.set('default', result);
            this.lastValidationTime = now;

            return result;
        }
    }

    /**
     * Test bandwidth by downloading a small file
     */
    public async testBandwidth(): Promise<{ downloadSpeed: number; uploadSpeed?: number }> {
        const testUrl = 'https://httpbin.org/bytes/1024'; // 1KB test file

        try {
            const startTime = performance.now();

            const response = await fetch(testUrl);
            const data = await response.arrayBuffer();

            const endTime = performance.now();
            const duration = (endTime - startTime) / 1000; // Convert to seconds

            const bytes = data.byteLength;
            const bits = bytes * 8;
            const speedBps = bits / duration;
            const speedMbps = speedBps / (1024 * 1024);

            return {
                downloadSpeed: speedMbps,
                uploadSpeed: undefined, // Would need separate test for upload
            };
        } catch (error) {
            console.warn('Bandwidth test failed:', error);
            return {
                downloadSpeed: 0,
                uploadSpeed: undefined,
            };
        }
    }

    /**
     * Add listener for network state changes
     */
    public addListener(id: string, listener: Listener<NetworkState>): () => void {
        this.listeners.set(id, listener);

        // Immediately call with current state if available
        if (this.currentState) {
            setTimeout(() => listener(this.currentState!), 0);
        }

        return () => this.listeners.delete(id);
    }

    /**
     * Remove network state listener
     */
    public removeListener(id: string): void {
        this.listeners.delete(id);
    }

    /**
     * Get service status
     */
    public getStatus(): NetworkServiceStatus {
        return {
            ...this.status,
            initialized: this.isInitialized,
            connected: this.currentState?.isConnected ?? false,
            quality: this.currentState?.quality ?? NetworkQuality.POOR,
            lastCheck: this.currentState?.lastChecked ?? new Date(),
        };
    }

    /**
     * Check if network quality is good for sync operations
     */
    public isQualityGoodForSync(): boolean {
        if (!this.currentState) return false;

        return this.currentState.quality === NetworkQuality.GOOD ||
            this.currentState.quality === NetworkQuality.EXCELLENT;
    }

    /**
     * Check if network is suitable for background operations
     */
    public isSuitableForBackgroundSync(): boolean {
        if (!this.currentState?.isConnected) return false;

        // Don't sync on poor connections
        return this.currentState.quality !== NetworkQuality.POOR;
    }

    /**
     * Get recommended sync interval based on network quality
     */
    public getRecommendedSyncInterval(): number {
        if (!this.currentState) return 300000; // Default 5 minutes

        switch (this.currentState.quality) {
            case NetworkQuality.EXCELLENT:
                return 60000; // 1 minute
            case NetworkQuality.GOOD:
                return 180000; // 3 minutes
            case NetworkQuality.FAIR:
                return 600000; // 10 minutes
            case NetworkQuality.POOR:
            default:
                return 1800000; // 30 minutes or manual only
        }
    }

    /**
     * Dispose of service resources
     */
    public async dispose(): Promise<void> {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.listeners.clear();
        this.validationCache.clear();
        this.isInitialized = false;

        console.log('NetworkConnectivityService disposed');
    }

    // Private methods

    private async getCurrentNetworkState(): Promise<NetworkState> {
        try {
            const state = await NetInfo.fetch();

            // Assess network quality
            const quality = this.assessNetworkQuality(state);

            // Test actual connectivity if we have a connection
            let isInternetReachable = state.isConnected;
            let downloadSpeed: number | undefined;

            if (state.isConnected) {
                try {
                    const validation = await this.validateConnection();
                    isInternetReachable = validation.isValid;
                    downloadSpeed = validation.downloadSpeed;
                } catch (error) {
                    console.warn('Failed to validate internet connectivity:', error);
                    isInternetReachable = false;
                }
            }

            return {
                isConnected: state.isConnected ?? false,
                isInternetReachable,
                type: state.type || 'unknown',
                quality,
                status: this.determineNetworkStatus(state),
                downloadSpeed,
                uploadSpeed: undefined, // Would need separate test
                latency: undefined, // Would need separate test
                lastChecked: new Date(),
            };
        } catch (error) {
            console.error('Failed to get network state:', error);

            // Return offline state on error
            return {
                isConnected: false,
                isInternetReachable: false,
                type: 'unknown',
                quality: NetworkQuality.POOR,
                status: NetworkStatus.UNKNOWN,
                lastChecked: new Date(),
            };
        }
    }

    private handleNetworkStateChange(state: any): void {
        console.log('📡 Network state changed:', {
            connected: state.isConnected,
            type: state.type,
            reachable: state.isInternetReachable,
        });

        // Assess new quality
        const quality = this.assessNetworkQuality(state);

        const newState: NetworkState = {
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? false,
            type: state.type || 'unknown',
            quality,
            status: this.determineNetworkStatus(state),
            lastChecked: new Date(),
        };

        this.setCurrentState(newState);
    }

    private assessNetworkQuality(state: any): NetworkQuality {
        // If not connected, quality is poor
        if (!state.isConnected) {
            return NetworkQuality.POOR;
        }

        // Determine quality based on connection type and speed
        switch (state.type) {
            case 'wifi':
                // Assume WiFi is generally good
                return NetworkQuality.GOOD;

            case 'cellular':
                // Cellular quality depends on generation
                // This would need more detailed cellular info in a real implementation
                return NetworkQuality.FAIR;

            case 'ethernet':
                return NetworkQuality.EXCELLENT;

            case 'bluetooth':
            case 'vpn':
                return NetworkQuality.FAIR;

            default:
                return NetworkQuality.FAIR;
        }
    }

    private determineNetworkStatus(state: any): NetworkStatus {
        if (!state.isConnected) {
            return NetworkStatus.DISCONNECTED;
        }

        if (state.isInternetReachable === false) {
            return NetworkStatus.DISCONNECTED;
        }

        if (state.isInternetReachable === true) {
            return NetworkStatus.CONNECTED;
        }

        // If we can't determine internet reachability, assume connecting
        return NetworkStatus.CONNECTING;
    }

    private setCurrentState(state: NetworkState): void {
        this.currentState = state;
        this.status = {
            ...this.status,
            connected: state.isConnected,
            quality: state.quality,
            lastCheck: state.lastChecked,
        };

        // Emit to all listeners
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.warn('Error in network state listener:', error);
            }
        });
    }

    private estimateSpeed(latency: number): number {
        // Very rough estimation based on latency
        // In practice, you'd want a more sophisticated speed test
        if (latency < 50) return 10; // Mbps
        if (latency < 100) return 5; // Mbps
        if (latency < 300) return 2; // Mbps
        if (latency < 1000) return 1; // Mbps
        return 0.5; // Mbps
    }

    private getDefaultStatus(): NetworkServiceStatus {
        return {
            initialized: false,
            connected: false,
            quality: NetworkQuality.POOR,
            lastCheck: new Date(),
        };
    }
}

// Export singleton instance
export const networkConnectivityService = NetworkConnectivityService.getInstance();
export default NetworkConnectivityService;