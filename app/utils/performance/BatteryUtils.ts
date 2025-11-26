import { BatteryInfo, BatteryOptimization } from '../../types/performance';

export class BatteryUtils {
    /**
     * Calculate battery drain rate over time
     */
    static calculateDrainRate(batteryHistory: BatteryInfo[]): number {
        if (batteryHistory.length < 2) return 0;

        const first = batteryHistory[0];
        const last = batteryHistory[batteryHistory.length - 1];
        const timeDiff = (last as any).timestamp - (first as any).timestamp;

        if (timeDiff <= 0) return 0;

        const levelDiff = first.level - last.level;
        return levelDiff / (timeDiff / (1000 * 60)); // percentage per minute
    }

    /**
     * Predict remaining battery life
     */
    static predictBatteryLife(currentLevel: number, drainRate: number): {
        hours: number;
        minutes: number;
        totalMinutes: number;
    } {
        if (drainRate <= 0) {
            return { hours: 0, minutes: 0, totalMinutes: 0 };
        }

        const totalMinutes = currentLevel / drainRate;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);

        return { hours, minutes, totalMinutes };
    }

    /**
     * Calculate battery optimization impact
     */
    static calculateOptimizationImpact(
        beforeMetrics: BatteryInfo,
        afterMetrics: BatteryInfo,
        timeDiff: number = 3600000 // 1 hour default
    ): number {
        const beforeDrain = this.calculateDrainRate([beforeMetrics, afterMetrics]);
        const afterDrain = this.calculateDrainRate([afterMetrics, beforeMetrics]);

        if (beforeDrain <= 0) return 0;

        // Calculate improvement percentage
        const improvement = ((beforeDrain - afterDrain) / beforeDrain) * 100;
        return Math.max(0, improvement);
    }

    /**
     * Get battery health estimate based on usage patterns
     */
    static estimateBatteryHealth(batteryHistory: BatteryInfo[]): {
        health: 'excellent' | 'good' | 'fair' | 'poor';
        healthScore: number;
        expectedLifeReduction: number;
    } {
        if (batteryHistory.length === 0) {
            return { health: 'good', healthScore: 80, expectedLifeReduction: 0 };
        }

        // Calculate charge cycles (simplified)
        let chargeCycles = 0;
        let lastLevel = batteryHistory[0].level;

        for (let i = 1; i < batteryHistory.length; i++) {
            const current = batteryHistory[i];
            const levelDiff = current.level - lastLevel;

            // Detect charge cycle (level increase followed by decrease)
            if (levelDiff > 10) {
                chargeCycles++;
            }

            lastLevel = current.level;
        }

        // Estimate health based on charge cycles
        // Typical battery life: 300-500 charge cycles to 80% capacity
        const expectedCycles = 400;
        const healthRatio = Math.max(0, (expectedCycles - chargeCycles) / expectedCycles);

        let health: 'excellent' | 'good' | 'fair' | 'poor';
        let healthScore: number;
        let expectedLifeReduction: number;

        if (healthRatio > 0.8) {
            health = 'excellent';
            healthScore = Math.round(90 + (healthRatio - 0.8) * 50);
            expectedLifeReduction = 0;
        } else if (healthRatio > 0.6) {
            health = 'good';
            healthScore = Math.round(70 + (healthRatio - 0.6) * 100);
            expectedLifeReduction = 5;
        } else if (healthRatio > 0.4) {
            health = 'fair';
            healthScore = Math.round(50 + (healthRatio - 0.4) * 100);
            expectedLifeReduction = 15;
        } else {
            health = 'poor';
            healthScore = Math.round(healthRatio * 125);
            expectedLifeReduction = 30;
        }

        return { health, healthScore, expectedLifeReduction };
    }

    /**
     * Determine optimal charging strategy
     */
    static getOptimalChargingStrategy(
        currentLevel: number,
        chargingState: 'charging' | 'discharging' | 'full' | 'unknown',
        userPattern: 'overnight' | 'workday' | 'mixed' | 'unknown'
    ): {
        recommendedAction: string;
        estimatedFullChargeTime: number;
        suggestedStopLevel: number;
        reasoning: string;
    } {
        const now = new Date();
        const hour = now.getHours();

        let suggestedStopLevel = 100;
        let reasoning = '';

        switch (userPattern) {
            case 'overnight':
                if (hour >= 22 || hour <= 6) {
                    suggestedStopLevel = 80;
                    reasoning = 'Overnight charging detected - stop at 80% to preserve battery health';
                }
                break;

            case 'workday':
                if (hour >= 9 && hour <= 17) {
                    suggestedStopLevel = 90;
                    reasoning = 'Workday pattern detected - full charge acceptable for productivity';
                }
                break;

            case 'mixed':
                suggestedStopLevel = 85;
                reasoning = 'Mixed usage pattern - 85% provides good balance of capacity and health';
                break;
        }

        let recommendedAction = '';
        let estimatedFullChargeTime = 0;

        if (chargingState === 'discharging' && currentLevel < 20) {
            recommendedAction = 'Start charging - level is below optimal threshold';
            estimatedFullChargeTime = Math.ceil((100 - currentLevel) / 10 * 60); // Estimate 10% per hour
        } else if (chargingState === 'charging' && currentLevel >= suggestedStopLevel) {
            recommendedAction = 'Stop charging to preserve battery health';
        } else if (chargingState === 'charging') {
            estimatedFullChargeTime = Math.ceil((suggestedStopLevel - currentLevel) / 10 * 60);
            recommendedAction = 'Continue charging to target level';
        } else {
            recommendedAction = 'Current charging state is optimal';
        }

        return {
            recommendedAction,
            estimatedFullChargeTime,
            suggestedStopLevel,
            reasoning,
        };
    }

    /**
     * Calculate power consumption efficiency
     */
    static calculatePowerEfficiency(batteryInfo: BatteryInfo): {
        efficiency: number;
        rating: 'excellent' | 'good' | 'average' | 'poor';
        suggestions: string[];
    } {
        const { level, temperature, health } = batteryInfo;
        let efficiency = 100;
        const suggestions: string[] = [];

        // Battery level impact
        if (level < 20) {
            efficiency -= 20;
            suggestions.push('Low battery level detected - efficiency reduced');
        } else if (level > 90) {
            efficiency -= 10;
            suggestions.push('High battery level may reduce efficiency slightly');
        }

        // Temperature impact
        if (temperature) {
            if (temperature > 35) {
                efficiency -= 15;
                suggestions.push('High battery temperature - consider reducing intensive operations');
            } else if (temperature < 10) {
                efficiency -= 25;
                suggestions.push('Low battery temperature - normal efficiency will resume when warm');
            }
        }

        // Health impact
        switch (health) {
            case 'good':
                // No penalty
                break;
            case 'poor':
                efficiency -= 30;
                suggestions.push('Poor battery health - consider battery replacement');
                break;
            default:
                efficiency -= 10;
                suggestions.push('Battery health unknown - consider checking battery condition');
        }

        let rating: 'excellent' | 'good' | 'average' | 'poor';
        if (efficiency >= 90) {
            rating = 'excellent';
        } else if (efficiency >= 75) {
            rating = 'good';
        } else if (efficiency >= 60) {
            rating = 'average';
        } else {
            rating = 'poor';
        }

        return {
            efficiency: Math.max(0, efficiency),
            rating,
            suggestions,
        };
    }

    /**
     * Generate battery optimization recommendations
     */
    static generateOptimizationRecommendations(
        batteryInfo: BatteryInfo,
        usagePattern: 'light' | 'moderate' | 'heavy',
        deviceCapabilities: {
            lowPowerModeSupported: boolean;
            backgroundAppRefreshEnabled: boolean;
            locationServicesEnabled: boolean;
        }
    ): BatteryOptimization[] {
        const optimizations: BatteryOptimization[] = [];
        const { level, lowPowerMode } = batteryInfo;

        // Low power mode optimization
        if (level < 30 && !lowPowerMode && deviceCapabilities.lowPowerModeSupported) {
            optimizations.push({
                id: 'enable_low_power_mode',
                name: 'Enable Low Power Mode',
                description: 'Automatically reduce power consumption when battery is low',
                impact: 'high',
                isEnabled: true,
                conditions: [
                    { type: 'batteryLevel', operator: 'lt', value: 30 }
                ]
            });
        }

        // Background app refresh optimization
        if (level < 50 && deviceCapabilities.backgroundAppRefreshEnabled) {
            optimizations.push({
                id: 'optimize_background_refresh',
                name: 'Optimize Background Refresh',
                description: 'Reduce background app refresh frequency to conserve battery',
                impact: 'medium',
                isEnabled: true,
                conditions: [
                    { type: 'batteryLevel', operator: 'lt', value: 50 }
                ]
            });
        }

        // Location services optimization
        if (level < 40 && deviceCapabilities.locationServicesEnabled) {
            optimizations.push({
                id: 'optimize_location_services',
                name: 'Optimize Location Services',
                description: 'Reduce location service accuracy and frequency',
                impact: 'medium',
                isEnabled: true,
                conditions: [
                    { type: 'batteryLevel', operator: 'lt', value: 40 }
                ]
            });
        }

        // Network optimization based on usage
        if (usagePattern === 'heavy') {
            optimizations.push({
                id: 'network_optimization_heavy',
                name: 'Heavy Usage Network Optimization',
                description: 'Optimize network requests for heavy usage scenarios',
                impact: 'high',
                isEnabled: true,
                conditions: [
                    { type: 'batteryLevel', operator: 'gt', value: 10 }
                ]
            });
        } else if (usagePattern === 'light') {
            optimizations.push({
                id: 'network_optimization_light',
                name: 'Light Usage Network Optimization',
                description: 'Aggressive network optimization for light usage',
                impact: 'low',
                isEnabled: true,
                conditions: [
                    { type: 'batteryLevel', operator: 'lt', value: 80 }
                ]
            });
        }

        // Time-based optimizations
        const hour = new Date().getHours();
        if (hour >= 0 && hour <= 6) {
            optimizations.push({
                id: 'night_time_optimization',
                name: 'Night Time Power Saving',
                description: 'Aggressive power saving during night hours',
                impact: 'medium',
                isEnabled: true,
                conditions: [
                    { type: 'timeOfDay', operator: 'lt', value: 7 }
                ]
            });
        }

        return optimizations;
    }

    /**
     * Calculate battery aging factors
     */
    static calculateBatteryAging(
        currentHealth: 'good' | 'poor' | 'unknown',
        chargeCycles: number,
        ageInDays: number
    ): {
        agingFactor: number;
        estimatedRemainingCycles: number;
        expectedEndOfLife: Date;
        healthTrend: 'improving' | 'stable' | 'degrading';
    } {
        // Typical battery aging model
        const cycleDecayRate = 0.001; // 0.1% capacity loss per cycle
        const timeDecayRate = 0.0005; // 0.05% capacity loss per day

        const cycleAging = chargeCycles * cycleDecayRate;
        const timeAging = ageInDays * timeDecayRate;
        const agingFactor = Math.min(1, cycleAging + timeAging);

        // Estimate remaining cycles (to 80% capacity)
        const typicalTotalCycles = 400;
        const usedCycles = typicalTotalCycles * agingFactor;
        const estimatedRemainingCycles = Math.max(0, typicalTotalCycles - usedCycles);

        // Estimate end of life (when capacity drops to 80%)
        const endOfLifeDate = new Date();
        endOfLifeDate.setDate(endOfLifeDate.getDate() + Math.floor(estimatedRemainingCycles * 1.5));

        let healthTrend: 'improving' | 'stable' | 'degrading';
        if (agingFactor < 0.1) {
            healthTrend = 'improving';
        } else if (agingFactor < 0.3) {
            healthTrend = 'stable';
        } else {
            healthTrend = 'degrading';
        }

        return {
            agingFactor,
            estimatedRemainingCycles,
            expectedEndOfLife: endOfLifeDate,
            healthTrend,
        };
    }

    /**
     * Monitor battery usage patterns
     */
    static monitorUsagePatterns(batteryHistory: BatteryInfo[]): {
        pattern: 'regular' | 'irregular' | 'charging_only' | 'discharging_only';
        predictability: number;
        nextPredictedLevel: number;
        confidence: number;
    } {
        if (batteryHistory.length < 10) {
            return {
                pattern: 'irregular',
                predictability: 0,
                nextPredictedLevel: batteryHistory[batteryHistory.length - 1]?.level || 50,
                confidence: 0,
            };
        }

        // Analyze patterns
        let chargingEvents = 0;
        let dischargingEvents = 0;

        for (let i = 1; i < batteryHistory.length; i++) {
            const diff = batteryHistory[i].level - batteryHistory[i - 1].level;
            if (diff > 0) chargingEvents++;
            else if (diff < 0) dischargingEvents++;
        }

        let pattern: 'regular' | 'irregular' | 'charging_only' | 'discharging_only';
        let predictability: number;

        if (chargingEvents === 0) {
            pattern = 'discharging_only';
            predictability = 0.7;
        } else if (dischargingEvents === 0) {
            pattern = 'charging_only';
            predictability = 0.7;
        } else if (chargingEvents / dischargingEvents > 0.8 && chargingEvents / dischargingEvents < 1.2) {
            pattern = 'regular';
            predictability = 0.9;
        } else {
            pattern = 'irregular';
            predictability = 0.3;
        }

        // Predict next level
        const recentChanges = batteryHistory.slice(-5).map((curr, i, arr) =>
            i > 0 ? curr.level - arr[i - 1].level : 0
        ).slice(1);

        const avgChange = recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length;
        const nextPredictedLevel = Math.max(0, Math.min(100,
            batteryHistory[batteryHistory.length - 1].level + avgChange
        ));

        const confidence = Math.min(1, predictability + (recentChanges.length * 0.1));

        return {
            pattern,
            predictability,
            nextPredictedLevel,
            confidence,
        };
    }

    /**
     * Get battery optimization score
     */
    static getOptimizationScore(batteryInfo: BatteryInfo, optimizations: BatteryOptimization[]): {
        currentScore: number;
        potentialScore: number;
        improvement: number;
        priorityAreas: string[];
    } {
        let currentScore = 0;
        let potentialScore = 0;

        // Base score from battery level
        currentScore += Math.max(0, batteryInfo.level * 0.3);

        // Health factor
        switch (batteryInfo.health) {
            case 'good':
                currentScore += 30;
                break;
            case 'poor':
                currentScore += 10;
                break;
            default:
                currentScore += 20;
        }

        // Temperature factor
        if (batteryInfo.temperature) {
            if (batteryInfo.temperature >= 20 && batteryInfo.temperature <= 30) {
                currentScore += 20;
            } else if (batteryInfo.temperature < 10 || batteryInfo.temperature > 35) {
                currentScore -= 20;
            }
        }

        // Low power mode bonus
        if (batteryInfo.lowPowerMode) {
            currentScore += 10;
        }

        // Calculate potential score with optimizations
        potentialScore = currentScore;
        const priorityAreas: string[] = [];

        optimizations.forEach(opt => {
            if (opt.isEnabled) {
                potentialScore += opt.impact === 'high' ? 15 : opt.impact === 'medium' ? 10 : 5;
            } else {
                // This optimization could be applied
                potentialScore += opt.impact === 'high' ? 15 : opt.impact === 'medium' ? 10 : 5;
                if (!priorityAreas.includes(opt.name)) {
                    priorityAreas.push(opt.name);
                }
            }
        });

        const improvement = potentialScore - currentScore;

        return {
            currentScore: Math.max(0, Math.min(100, currentScore)),
            potentialScore: Math.max(0, Math.min(100, potentialScore)),
            improvement: Math.max(0, improvement),
            priorityAreas,
        };
    }
}