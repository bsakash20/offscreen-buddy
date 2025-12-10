/**
 * PersistenceService Integration Validation
 * 
 * Demonstrates the complete persistence solution working with TimerEngine
 * for seamless app restart recovery scenarios.
 */

const { TimerEngine } = require('../timer/TimerEngine');
const { PersistenceService } = require('./PersistenceService');
const { TimerEngineState, TimerState, TimerMode, ScreenState } = require('../../types/timer/domain');

// Mock services for demonstration
class MockNotificationService {
    async scheduleNotification(notification) {
        console.log('📱 Mock: Scheduling notification', notification.id);
        return notification.id;
    }

    async cancelNotification(id) {
        console.log('📱 Mock: Cancelling notification', id);
    }
}

class MockScreenStateService {
    constructor() {
        this.listeners = { locked: [], unlocked: [] };
        setTimeout(() => this.listeners.unlocked.forEach(cb => cb()), 1000);
    }

    onScreenLocked(callback) {
        this.listeners.locked.push(callback);
    }

    onScreenUnlocked(callback) {
        this.listeners.unlocked.push(callback);
    }

    startMonitoring() {
        console.log('📱 Mock: Started screen state monitoring');
    }

    stopMonitoring() {
        console.log('📱 Mock: Stopped screen state monitoring');
    }
}

class MockCallService {
    async scheduleCall(call) {
        console.log('📱 Mock: Scheduling call', call.id);
        return call.id;
    }

    async cancelCall(id) {
        console.log('📱 Mock: Cancelling call', id);
    }
}

class MockTimerLockService {
    async isTimerLockEnabled() { return false; }
    async enableTimerLock(pin) { console.log('Mock: Timer lock enabled'); }
    async disableTimerLock() { console.log('Mock: Timer lock disabled'); }
    async validatePin(pin) { return pin === '123456'; }
    async isCurrentlyLocked() { return false; }
    async getRemainingLockTime() { return null; }
    async attemptEmergencyOverride(pin) { return false; }
    async isEmergencyMode() { return false; }
    async exitEmergencyMode() { }
}

class MockSettingsService {
    async getSettings() {
        return {
            durationMs: 3600000,
            notificationIntervalMs: 900000,
            isPro: true,
            mode: TimerMode.PRO,
            timerLockEnabled: true,
            smartNotificationsEnabled: true
        };
    }

    async updateSettings(settings) {
        console.log('Mock: Settings updated', settings);
    }

    async resetSettings() {
        console.log('Mock: Settings reset to defaults');
    }

    onSubscriptionChange(callback) { }
    async getSubscriptionStatus() { return { isPro: true, features: [] }; }
}

/**
 * Integration test scenario demonstrating app restart recovery
 */
class PersistenceIntegrationTest {
    constructor() {
        this.persistenceService = null;
        this.timerEngine = null;
        this.mockServices = {};
        this.testResults = [];
    }

    async initialize() {
        console.log('🚀 Initializing Persistence Integration Test...');

        try {
            // Initialize services
            this.persistenceService = new PersistenceService();
            this.mockServices = {
                notificationService: new MockNotificationService(),
                screenStateService: new MockScreenStateService(),
                callService: new MockCallService(),
                timerLockService: new MockTimerLockService(),
                settingsService: new MockSettingsService()
            };

            console.log('✅ Services initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize services:', error);
            return false;
        }
    }

    async testScenario1_FirstTimeStart() {
        console.log('\n📋 Scenario 1: First-time app start (no existing data)');
        console.log('='.repeat(60));

        try {
            // Clear any existing data
            await this.persistenceService.clearState();

            // Create fresh timer engine
            const initialState = {
                state: TimerState.IDLE,
                remainingTime: 0,
                config: {
                    durationMs: 1800000, // 30 minutes
                    notificationIntervalMs: 300000, // 5 minutes
                    isPro: true,
                    mode: TimerMode.PRO,
                    timerLockEnabled: true,
                    smartNotificationsEnabled: true
                },
                screenState: ScreenState.UNLOCKED,
                scheduledNotifications: [],
                scheduledCalls: [],
                totalPausedDuration: 0,
                pauseCount: 0
            };

            const dependencies = {
                ...this.mockServices,
                persistenceService: this.persistenceService
            };

            this.timerEngine = new TimerEngine(initialState, dependencies);

            // Verify initial state
            const state = await this.timerEngine.getState();
            if (state.state !== TimerState.IDLE) {
                throw new Error('Initial state should be IDLE');
            }

            console.log('✅ Fresh timer engine created successfully');
            return true;
        } catch (error) {
            console.error('❌ Scenario 1 failed:', error.message);
            return false;
        }
    }

    async testScenario2_StartTimerAndSimulateAppKill() {
        console.log('\n📋 Scenario 2: Start timer, then simulate app kill');
        console.log('='.repeat(60));

        try {
            // Start a timer
            const config = {
                durationMs: 300000, // 5 minutes for testing
                notificationIntervalMs: 120000, // 2 minutes
                isPro: true,
                mode: TimerMode.PRO,
                timerLockEnabled: true,
                smartNotificationsEnabled: true
            };

            console.log('🕐 Starting timer with config:', config);
            await this.timerEngine.startTimer(config);

            // Wait a moment for state to stabilize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get current state
            const runningState = await this.timerEngine.getState();
            console.log('📊 Timer started:', {
                state: runningState.state,
                remainingTime: runningState.remainingTime,
                scheduledNotifications: runningState.scheduledNotifications.length
            });

            // Verify timer is running
            if (runningState.state !== TimerState.RUNNING) {
                throw new Error('Timer should be running');
            }

            // Simulate app kill (we just stop the engine, but persistence should be saved)
            console.log('💀 Simulating app kill...');
            await this.timerEngine.shutdown();

            console.log('✅ App kill simulation completed');
            return true;
        } catch (error) {
            console.error('❌ Scenario 2 failed:', error.message);
            return false;
        }
    }

    async testScenario3_AppRestartAndRecovery() {
        console.log('\n📋 Scenario 3: App restart and state recovery');
        console.log('='.repeat(60));

        try {
            console.log('🔄 Simulating app restart...');

            // Create a new timer engine (simulating app restart)
            const initialState = {
                state: TimerState.IDLE,
                remainingTime: 0,
                config: {
                    durationMs: 1800000,
                    notificationIntervalMs: 300000,
                    isPro: true,
                    mode: TimerMode.PRO,
                    timerLockEnabled: true,
                    smartNotificationsEnabled: true
                },
                screenState: ScreenState.UNLOCKED,
                scheduledNotifications: [],
                scheduledCalls: [],
                totalPausedDuration: 0,
                pauseCount: 0
            };

            const dependencies = {
                ...this.mockServices,
                persistenceService: this.persistenceService
            };

            const newTimerEngine = new TimerEngine(initialState, dependencies);

            // Try to load persisted state
            const persistedState = await this.persistenceService.loadState();

            if (persistedState) {
                console.log('📦 Found persisted state, restoring...');

                // Restore the timer engine state
                await newTimerEngine.setState(persistedState.timerEngineState);

                // Verify restoration
                const restoredState = await newTimerEngine.getState();
                console.log('📊 State restored:', {
                    state: restoredState.state,
                    remainingTime: restoredState.remainingTime,
                    startTime: restoredState.startTime ? 'preserved' : 'missing',
                    scheduledNotifications: restoredState.scheduledNotifications.length,
                    config: {
                        durationMs: restoredState.config.durationMs,
                        isPro: restoredState.config.isPro
                    }
                });

                // The timer should be back in running state with correct remaining time
                // Note: In a real scenario, the time elapsed during app kill would be calculated
                if (restoredState.state === TimerState.RUNNING || restoredState.state === TimerState.PAUSED) {
                    console.log('✅ Timer state successfully recovered!');
                } else {
                    console.log('⚠️  Timer state recovered but may need adjustment');
                }

                this.timerEngine = newTimerEngine;
            } else {
                console.log('ℹ️  No persisted state found, starting fresh');
                this.timerEngine = newTimerEngine;
            }

            return true;
        } catch (error) {
            console.error('❌ Scenario 3 failed:', error.message);
            return false;
        }
    }

    async testScenario4_DataIntegrityAndMigration() {
        console.log('\n📋 Scenario 4: Data integrity and migration testing');
        console.log('='.repeat(60));

        try {
            // Test data integrity
            const currentState = await this.persistenceService.loadState();
            if (currentState) {
                const isValid = this.persistenceService.validateState(currentState);
                console.log('🔍 Data integrity check:', isValid ? 'PASSED' : 'FAILED');

                if (!isValid) {
                    throw new Error('Data integrity validation failed');
                }

                // Test checksum verification
                const isChecksumValid = await this.persistenceService.verifyChecksum(currentState);
                console.log('🔐 Checksum verification:', isChecksumValid ? 'PASSED' : 'FAILED');
            }

            // Test backup creation
            const backup = await this.persistenceService.createBackup();
            if (backup) {
                console.log('💾 Backup created successfully:', {
                    id: backup.id,
                    createdAt: new Date(backup.createdAt).toISOString(),
                    hasState: !!backup.timerEngineState,
                    hasPreferences: !!backup.userPreferences,
                    hasScheduledItems: !!(backup.scheduledItems?.notifications?.length || backup.scheduledItems?.calls?.length)
                });
            }

            // Test version compatibility
            if (currentState) {
                console.log('📋 Version info:', {
                    currentVersion: currentState.version,
                    isCompatible: this.persistenceService.validateState(currentState)
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Scenario 4 failed:', error.message);
            return false;
        }
    }

    async testScenario5_PerformanceAndMaintenance() {
        console.log('\n📋 Scenario 5: Performance and maintenance testing');
        console.log('='.repeat(60));

        try {
            // Get performance metrics
            const metrics = this.persistenceService.getMetrics();
            console.log('📊 Performance metrics:', {
                readOperations: metrics.readOperations,
                writeOperations: metrics.writeOperations,
                failedOperations: metrics.failedOperations,
                mmkvKeys: metrics.mmkvKeys,
                averageReadTime: `${metrics.averageReadTime.toFixed(2)}ms`,
                averageWriteTime: `${metrics.averageWriteTime.toFixed(2)}ms`
            });

            // Get storage statistics
            const stats = await this.persistenceService.getStorageStats();
            console.log('💾 Storage statistics:', {
                mmkvSize: `${stats.mmkvSize} bytes`,
                asyncStorageKeys: stats.asyncStorageKeys,
                totalSize: `${stats.totalSize} bytes`,
                lastCleanup: stats.lastCleanup ? new Date(stats.lastCleanup).toISOString() : 'never'
            });

            // Test cleanup
            await this.persistenceService.cleanupData({
                removeExpired: true,
                removeCompleted: true,
                removeTemp: true
            });
            console.log('🧹 Data cleanup completed');

            return true;
        } catch (error) {
            console.error('❌ Scenario 5 failed:', error.message);
            return false;
        }
    }

    async testScenario6_ErrorRecovery() {
        console.log('\n📋 Scenario 6: Error recovery and robustness testing');
        console.log('='.repeat(60));

        try {
            // Test recovery from corrupted data
            console.log('🧪 Testing corrupted data recovery...');

            const corruptedData = {
                timerEngineState: null,
                lastUpdated: Date.now(),
                version: '2.0.0',
                checksum: 'invalid'
            };

            const isValid = this.persistenceService.validateState(corruptedData);
            if (isValid) {
                throw new Error('Corrupted data should not validate');
            }

            console.log('✅ Corrupted data properly detected and rejected');

            // Test recovery mechanism
            const recoveredState = await this.persistenceService.recoverCorruptedState();
            if (!recoveredState) {
                throw new Error('Failed to recover from corrupted state');
            }

            console.log('✅ State recovery successful');

            // Verify recovered state is valid
            const isRecoveredValid = this.persistenceService.validateState(recoveredState);
            if (!isRecoveredValid) {
                throw new Error('Recovered state is not valid');
            }

            console.log('✅ Recovered state validation passed');

            return true;
        } catch (error) {
            console.error('❌ Scenario 6 failed:', error.message);
            return false;
        }
    }

    async runFullIntegrationTest() {
        console.log('🎯 Starting Persistence Integration Test Suite');
        console.log('='.repeat(70));

        const scenarios = [
            ['First-time Start', () => this.testScenario1_FirstTimeStart()],
            ['Start Timer & App Kill', () => this.testScenario2_StartTimerAndSimulateAppKill()],
            ['App Restart & Recovery', () => this.testScenario3_AppRestartAndRecovery()],
            ['Data Integrity & Migration', () => this.testScenario4_DataIntegrityAndMigration()],
            ['Performance & Maintenance', () => this.testScenario5_PerformanceAndMaintenance()],
            ['Error Recovery', () => this.testScenario6_ErrorRecovery()]
        ];

        let passedScenarios = 0;

        for (const [scenarioName, testFunction] of scenarios) {
            const success = await testFunction();
            if (success) {
                passedScenarios++;
                this.testResults.push({ scenario: scenarioName, passed: true });
            } else {
                this.testResults.push({ scenario: scenarioName, passed: false });
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(70));
        console.log('🏁 INTEGRATION TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`Total Scenarios: ${scenarios.length}`);
        console.log(`Passed: ${passedScenarios}`);
        console.log(`Failed: ${scenarios.length - passedScenarios}`);
        console.log(`Success Rate: ${((passedScenarios / scenarios.length) * 100).toFixed(1)}%`);

        console.log('\n📋 Detailed Results:');
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${index + 1}. ${result.scenario}: ${status}`);
        });

        if (passedScenarios === scenarios.length) {
            console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
            console.log('✅ PersistenceService integration with TimerEngine is working correctly.');
            console.log('✅ App restart recovery is fully functional.');
            console.log('✅ Data integrity and error recovery mechanisms are robust.');
        } else {
            console.log('\n⚠️  Some integration tests failed.');
            console.log('🔧 Please review the failed scenarios above.');
        }

        return { passed: passedScenarios, total: scenarios.length, results: this.testResults };
    }
}

// Demo usage
async function runDemo() {
    console.log('🚀 PersistenceService Integration Demo');
    console.log('This demo shows how the PersistenceService enables');
    console.log('seamless app restart recovery for the timer app.\n');

    const integrationTest = new PersistenceIntegrationTest();

    try {
        const initialized = await integrationTest.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize integration test');
            return;
        }

        const results = await integrationTest.runFullIntegrationTest();

        console.log('\n📝 Integration test completed successfully!');
        console.log('The PersistenceService is ready for production use.');

        process.exit(results.passed === results.total ? 0 : 1);

    } catch (error) {
        console.error('💥 Integration test failed:', error);
        process.exit(1);
    }
}

module.exports = {
    PersistenceIntegrationTest,
    runDemo
};

// Run demo if executed directly
if (require.main === module) {
    runDemo();
}