const express = require('express');
const Milestone = require('../models/Milestone');
const MilestoneProgress = require('../models/MilestoneProgress');
const router = express.Router();

// Get all milestones with filtering
router.get('/milestones', async (req, res) => {
    try {
        const {
            streamType,
            status,
            priority,
            assignedTeam,
            startDate,
            endDate,
            riskLevel,
            limit = 50,
            offset = 0
        } = req.query;

        const whereClause = {};

        if (streamType) whereClause.streamType = streamType;
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
        if (assignedTeam) whereClause.assignedTeam = assignedTeam;
        if (riskLevel) whereClause.riskLevel = riskLevel;

        if (startDate || endDate) {
            whereClause.estimatedStartDate = {};
            if (startDate) whereClause.estimatedStartDate[require('sequelize').Op.gte] = new Date(startDate);
            if (endDate) whereClause.estimatedStartDate[require('sequelize').Op.lte] = new Date(endDate);
        }

        const milestones = await Milestone.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['estimatedEndDate', 'ASC']]
        });

        res.json({
            success: true,
            data: milestones.rows,
            total: milestones.count,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                totalPages: Math.ceil(milestones.count / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching milestones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch milestones',
            error: error.message
        });
    }
});

// Get milestone by ID with progress history
router.get('/milestones/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const milestone = await Milestone.findByPk(id, {
            include: [
                {
                    model: MilestoneProgress,
                    as: 'progressHistory',
                    order: [['createdAt', 'DESC']],
                    limit: 20
                }
            ]
        });

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found'
            });
        }

        // Calculate additional metrics
        const progressHistory = milestone.progressHistory || [];
        const latestProgress = progressHistory[0];

        const metrics = {
            currentProgress: milestone.progressPercentage,
            trend: calculateTrend(progressHistory),
            estimatedCompletion: estimateCompletionDate(milestone, progressHistory),
            riskScore: calculateRiskScore(milestone),
            teamVelocity: calculateTeamVelocity(progressHistory)
        };

        res.json({
            success: true,
            data: {
                ...milestone.toJSON(),
                metrics
            }
        });

    } catch (error) {
        console.error('Error fetching milestone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch milestone',
            error: error.message
        });
    }
});

// Create new milestone
router.post('/milestones', async (req, res) => {
    try {
        const milestoneData = req.body;

        // Validate required fields
        const requiredFields = ['streamType', 'title', 'description', 'assignedTeam', 'estimatedStartDate', 'estimatedEndDate'];
        const missingFields = requiredFields.filter(field => !milestoneData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const milestone = await Milestone.create(milestoneData);

        res.status(201).json({
            success: true,
            data: milestone,
            message: 'Milestone created successfully'
        });

    } catch (error) {
        console.error('Error creating milestone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create milestone',
            error: error.message
        });
    }
});

// Update milestone
router.put('/milestones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const milestone = await Milestone.findByPk(id);

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found'
            });
        }

        await milestone.update(updateData);

        res.json({
            success: true,
            data: milestone,
            message: 'Milestone updated successfully'
        });

    } catch (error) {
        console.error('Error updating milestone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update milestone',
            error: error.message
        });
    }
});

// Update milestone progress
router.post('/milestones/:id/progress', async (req, res) => {
    try {
        const { id } = req.params;
        const progressData = req.body;

        const milestone = await Milestone.findByPk(id);

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found'
            });
        }

        // Create progress record
        const progress = await MilestoneProgress.create({
            milestoneId: id,
            ...progressData
        });

        // Update milestone progress
        if (progressData.progressPercentage !== undefined) {
            await milestone.updateProgress(
                progressData.progressPercentage,
                progressData.notes
            );
        }

        res.json({
            success: true,
            data: progress,
            message: 'Progress updated successfully'
        });

    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update progress',
            error: error.message
        });
    }
});

// Add risk to milestone
router.post('/milestones/:id/risks', async (req, res) => {
    try {
        const { id } = req.params;
        const { riskLevel, description, mitigation } = req.body;

        const milestone = await Milestone.findByPk(id);

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found'
            });
        }

        await milestone.addRisk(riskLevel, description, mitigation);

        res.json({
            success: true,
            data: milestone,
            message: 'Risk added successfully'
        });

    } catch (error) {
        console.error('Error adding risk:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add risk',
            error: error.message
        });
    }
});

// Get milestone statistics and overview
router.get('/stats/overview', async (req, res) => {
    try {
        const { streamType } = req.query;

        const whereClause = streamType ? { streamType } : {};

        // Get milestone statistics
        const totalMilestones = await Milestone.count({ where: whereClause });
        const completedMilestones = await Milestone.count({
            where: { ...whereClause, status: 'completed' }
        });
        const inProgressMilestones = await Milestone.count({
            where: { ...whereClause, status: 'in_progress' }
        });
        const blockedMilestones = await Milestone.count({
            where: { ...whereClause, status: 'blocked' }
        });

        // Get overdue milestones
        const overdueMilestones = await Milestone.getOverdueMilestones();

        // Get critical milestones
        const criticalMilestones = await Milestone.getCriticalMilestones();

        // Calculate average progress
        const progressStats = await Milestone.findAll({
            where: whereClause,
            attributes: [
                [require('sequelize').fn('avg', require('sequelize').col('progressPercentage')), 'avgProgress'],
                [require('sequelize').fn('min', require('sequelize').col('progressPercentage')), 'minProgress'],
                [require('sequelize').fn('max', require('sequelize').col('progressPercentage')), 'maxProgress']
            ]
        });

        const stats = {
            total: totalMilestones,
            completed: completedMilestones,
            inProgress: inProgressMilestones,
            blocked: blockedMilestones,
            overdue: overdueMilestones.length,
            critical: criticalMilestones.length,
            completionRate: totalMilestones > 0 ? (completedMilestones / totalMilestones * 100).toFixed(2) : 0,
            averageProgress: progressStats[0]?.dataValues.avgProgress || 0,
            progressRange: {
                min: progressStats[0]?.dataValues.minProgress || 0,
                max: progressStats[0]?.dataValues.maxProgress || 0
            }
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});

// Helper functions
function calculateTrend(progressHistory) {
    if (progressHistory.length < 2) return 0;

    const recent = progressHistory.slice(0, 5);
    const older = progressHistory.slice(5, 10);

    const recentAvg = recent.reduce((sum, p) => sum + p.progressPercentage, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.progressPercentage, 0) / older.length;

    return recentAvg - olderAvg;
}

function estimateCompletionDate(milestone, progressHistory) {
    if (milestone.progressPercentage === 100) return milestone.actualEndDate;

    if (progressHistory.length === 0) return milestone.estimatedEndDate;

    const velocity = calculateTeamVelocity(progressHistory);
    if (velocity <= 0) return milestone.estimatedEndDate;

    const remainingProgress = 100 - milestone.progressPercentage;
    const daysRemaining = remainingProgress / velocity;

    const estimated = new Date();
    estimated.setDate(estimated.getDate() + daysRemaining);

    return estimated;
}

function calculateRiskScore(milestone) {
    const riskFactors = milestone.riskFactors || [];
    const levelPriority = { low: 1, medium: 2, high: 3, critical: 4 };

    const score = riskFactors.reduce((total, risk) => {
        return total + (levelPriority[risk.level] || 1);
    }, 0);

    return Math.min(100, score * 10); // Scale to 100
}

function calculateTeamVelocity(progressHistory) {
    if (progressHistory.length < 2) return 0;

    const recent = progressHistory.slice(0, 3);
    const dailyProgress = [];

    for (let i = 1; i < recent.length; i++) {
        const daysDiff = (new Date(recent[i - 1].createdAt) - new Date(recent[i].createdAt)) / (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
            dailyProgress.push((recent[i - 1].progressPercentage - recent[i].progressPercentage) / daysDiff);
        }
    }

    return dailyProgress.length > 0 ?
        dailyProgress.reduce((sum, p) => sum + p, 0) / dailyProgress.length : 0;
}

module.exports = router;