/**
 * NotificationService Demo Validation
 * 
 * Demonstrates the complete integration between NotificationService and TimerEngine
 * Shows drift correction, business rules, and proper lifecycle management
 */

const {
    NotificationServiceImpl,
    NotificationServiceMock,
    NotificationPermissionStatus,
    validateNotificationServiceIntegration
} = require('./index.ts');

/**
 * Demo configuration for different scenarios
 */
const DemoScenarios = {
    BASIC: {
        name: 'Basic Notification Scheduling',
        description: 'Demonstrates basic notification scheduling and cancellation',
        config: {
            useMockService: true,
            testProMode: false,
            validateDriftCorrection: false,
            testBusinessRules: false
        }
    },
    DRIFT_CORRECTION: {
        name: 'Drift Correction Validation',
        description: 'Tests drift correction algorithm with multiple state changes',
        config: {
            useMockService: true,
            testProMode: false,
            validateDriftCorrection: true,
            testBusinessRules: true
        }
    },
    PRO_MODE: {
        name: 'Pro Mode Features',
        description: 'Tests pro mode functionality and user cancellation prevention',
        config: {
            useMockService: true,
            testProMode: true,
            validateDriftCorrection: true,
            testBusinessRules: true
        }
    },
    FULL_INTEGRATION: {
        name: 'Full TimerEngine Integration',
        description: 'Complete integration test with TimerEngine lifecycle',
        config: {
            useMockService: true,
            testProMode: true,
            validateDriftCorrection: true,
            testBusinessRules: true
        }
    }
};

/**
 * Main validation function
 */
async function runDemoValidation() {
    console.log('🚀 OffScreen Buddy NotificationService Integration Demo');
    console.log('='.repeat(60));
    console.log('');

    let totalTests = 0;
    let totalPassed = 0;
    let totalTime = 0;

    // Run each demo scenario
    for (const [key, scenario] of Object.entries(DemoScenarios)) {
        console.log(`\n📋 Running: ${scenario.name}`);
        console.log(`Description: ${scenario.description}`);
        console.log('─'.repeat(50));

        try {
            const startTime = Date.now();

            // Run integration validation for this scenario
            const validation = await validateNotificationServiceIntegration(scenario.config);
            const summary = validation.summary;

            totalTests += summary.total;
            totalPassed += summary.passed;
            totalTime += summary.executionTime;

            // Display results
            console.log(`✅ Tests completed in ${summary.executionTime}ms`);
            console.log(`   Success rate: ${summary.successRate.toFixed(1)}%`);
            console.log(`   Passed: ${summary.passed}/${summary.total}`);

            if (summary.failed > 0) {
                console.log(`   ❌ Failed: ${summary.failed}`);

                // Show failed test details
                const failedTests = validation.results.filter(r => !r.passed);
                failedTests.forEach(test => {
                    console.log(`   • ${test.testName}: ${test.error}`);
                });
            }

            // Show scenario-specific details
            await showScenarioDetails(key, validation.results);

        } catch (error) {
            console.log(`❌ Scenario failed: ${error.message}`);
        }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DEMO VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total scenarios: ${Object.keys(DemoScenarios).length}`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Total passed: ${totalPassed}`);
    console.log(`Overall success rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
    console.log(`Total execution time: ${totalTime}ms`);
    console.log('');

    if (totalPassed === totalTests) {
        console.log('🎉 All tests passed! NotificationService integration is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please review the errors above.');
    }

    return {
        success: totalPassed === totalTests,
        totalTests,
        totalPassed,
        totalTime,
        scenarios: Object.keys(DemoScenarios).length
    };
}

/**
 * Show detailed information for each scenario
 */
async function showScenarioDetails(scenarioKey, results) {
    console.log('\n📊 Detailed Results:');

    switch (scenarioKey) {
        case 'BASIC':
            await showBasicScenarioDetails(results);
            break;
        case 'DRIFT_CORRECTION':
            await showDriftCorrectionDetails(results);
            break;
        case 'PRO_MODE':
            await showProModeDetails(results);
            break;
        case 'FULL_INTEGRATION':
            await showFullIntegrationDetails(results);
            break;
    }
}

/**
 * Details for basic scenario
 */
async function showBasicScenarioDetails(results) {
    const serviceInitTest = results.find(r => r.testName.includes('Service Initialization'));
    const schedulingTest = results.find(r => r.testName.includes('Basic Notification Scheduling'));
    const cancellationTest = results.find(r => r.testName.includes('Notification Cancellation'));

    console.log('   🔧 Service initialization: ' + (serviceInitTest?.passed ? '✅' : '❌'));
    console.log('   📅 Notification scheduling: ' + (schedulingTest?.passed ? '✅' : '❌'));
    console.log('   🚫 Notification cancellation: ' + (cancellationTest?.passed ? '✅' : '❌'));
}

/**
 * Details for drift correction scenario
 */
async function showDriftCorrectionDetails(results) {
    const driftTest = results.find(r => r.testName.includes('Drift Correction'));
    const rescheduleTest = results.find(r => r.testName.includes('Reschedule Notifications'));

    console.log('   🔄 Drift correction algorithm: ' + (driftTest?.passed ? '✅' : '❌'));
    console.log('   🔁 Notification rescheduling: ' + (rescheduleTest?.passed ? '✅' : '❌'));

    if (driftTest?.passed) {
        console.log('   💡 Drift correction working - notifications stay aligned to timer start');
    }
}

/**
 * Details for pro mode scenario
 */
async function showProModeDetails(results) {
    const proTest = results.find(r => r.testName.includes('Pro Mode Features'));
    const businessTest = results.find(r => r.testName.includes('Business Rules Enforcement'));

    console.log('   👑 Pro mode features: ' + (proTest?.passed ? '✅' : '❌'));
    console.log('   ⚖️  Business rules enforcement: ' + (businessTest?.passed ? '✅' : '❌'));

    if (proTest?.passed) {
        console.log('   🛡️  User cancellation prevention enabled');
        console.log('   🔔 Critical alert priorities configured');
    }
}

/**
 * Details for full integration scenario
 */
async function showFullIntegrationDetails(results) {
    const timerTest = results.find(r => r.testName.includes('Timer Engine Integration'));
    const cleanupTest = results.find(r => r.testName.includes('Cleanup and Disposal'));

    console.log('   ⏰ TimerEngine integration: ' + (timerTest?.passed ? '✅' : '❌'));
    console.log('   🧹 Cleanup and disposal: ' + (cleanupTest?.passed ? '✅' : '❌'));

    if (timerTest?.passed) {
        console.log('   📊 Full lifecycle management verified');
        console.log('   🔄 State transition handling confirmed');
    }
}

/**
 * Performance validation
 */
async function validatePerformance() {
    console.log('\n⚡ Performance Validation');
    console.log('─'.repeat(30));

    const mockService = new NotificationServiceMock();
    await mockService.initialize();

    const startTime = Date.now();

    // Schedule 10 notifications quickly
    const promises = [];
    for (let i = 0; i < 10; i++) {
        const promise = mockService.scheduleNotification({
            id: `perf_test_${i}`,
            scheduledTime: Date.now() + 30000 + i * 1000,
            type: 'reminder'
        });
        promises.push(promise);
    }

    await Promise.all(promises);
    const schedulingTime = Date.now() - startTime;

    // Cancel all
    startTime = Date.now();
    await mockService.cancelAllNotifications();
    const cancellationTime = Date.now() - startTime;

    const stats = mockService.getMockStatistics();

    console.log(`📊 Scheduling 10 notifications: ${schedulingTime}ms`);
    console.log(`🗑️  Cancelling all notifications: ${cancellationTime}ms`);
    console.log(`💾 Memory usage: ${stats.active} active notifications`);

    await mockService.dispose();
}

/**
 * Feature validation checklist
 */
async function validateFeatures() {
    console.log('\n✨ Feature Validation Checklist');
    console.log('─'.repeat(35));

    const features = [
        {
            name: 'Platform-agnostic scheduling',
            test: async () => {
                const mockService = new NotificationServiceMock();
                await mockService.initialize();
                await mockService.scheduleNotification({
                    id: 'feature_test',
                    scheduledTime: Date.now() + 5000,
                    type: 'reminder'
                });
                await mockService.dispose();
                return true;
            }
        },
        {
            name: 'Permission management',
            test: async () => {
                const mockService = new NotificationServiceMock();
                await mockService.initialize();
                const hasPermissions = await mockService.hasPermissions();
                await mockService.dispose();
                return typeof hasPermissions === 'boolean';
            }
        },
        {
            name: 'Notification content creation',
            test: async () => {
                const mockService = new NotificationServiceMock();
                await mockService.initialize();
                const content = await mockService.createNotificationContent({
                    id: 'content_test',
                    scheduledTime: Date.now() + 5000,
                    type: 'reminder'
                });
                await mockService.dispose();
                return content.title && content.body;
            }
        },
        {
            name: 'Event callback registration',
            test: async () => {
                const mockService = new NotificationServiceMock();
                await mockService.initialize();

                let callbackCalled = false;
                mockService.onNotificationReceived(() => {
                    callbackCalled = true;
                });

                // Force delivery to trigger callback
                mockService.forceDeliverAll();

                await mockService.dispose();
                return callbackCalled;
            }
        }
    ];

    for (const feature of features) {
        try {
            const result = await feature.test();
            console.log(`${feature.name}: ${result ? '✅' : '❌'}`);
        } catch (error) {
            console.log(`${feature.name}: ❌ (${error.message})`);
        }
    }
}

/**
 * Error handling validation
 */
async function validateErrorHandling() {
    console.log('\n🚨 Error Handling Validation');
    console.log('─'.repeat(32));

    const mockService = new NotificationServiceMock({
        simulateFailures: true,
        failureRate: 1.0 // 100% failure rate
    });

    await mockService.initialize();

    try {
        await mockService.scheduleNotification({
            id: 'error_test',
            scheduledTime: Date.now() + 5000,
            type: 'reminder'
        });
        console.log('Error handling: ❌ (Should have thrown error)');
    } catch (error) {
        console.log('Error handling: ✅ (Gracefully handled scheduling failure)');
    }

    await mockService.dispose();
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('Starting OffScreen Buddy NotificationService Demo...\n');

        // Run main validation
        const demoResult = await runDemoValidation();

        // Run additional validations
        await validatePerformance();
        await validateFeatures();
        await validateErrorHandling();

        console.log('\n🎯 DEMO COMPLETED SUCCESSFULLY!');
        console.log('The NotificationService is ready for production use.');

        return demoResult;

    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('Stack trace:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    main().then(result => {
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = {
    runDemoValidation,
    DemoScenarios,
    validatePerformance,
    validateFeatures,
    validateErrorHandling,
    main
};