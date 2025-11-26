const { DataTypes } = require('sequelize');
const sequelize = require('../config/milestone-database');

const MilestoneProgress = sequelize.define('MilestoneProgress', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    milestoneId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Reference to milestone'
    },

    teamMember: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Team member responsible for this progress update'
    },

    progressPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
        comment: 'Progress percentage at this update'
    },

    completedTasks: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of completed tasks'
    },

    remainingTasks: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of remaining tasks'
    },

    blockers: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of current blockers'
    },

    notes: {
        type: DataTypes.TEXT,
        comment: 'Progress notes and observations'
    },

    velocity: {
        type: DataTypes.FLOAT,
        comment: 'Current velocity/speed of completion'
    },

    qualityScore: {
        type: DataTypes.FLOAT,
        comment: 'Quality score for this progress period'
    },

    nextMilestone: {
        type: DataTypes.STRING,
        comment: 'Next milestone or focus area'
    },

    resourceUtilization: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Resource utilization metrics'
    },

    riskChanges: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Changes in risk factors'
    },

    dependenciesStatus: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Status of dependencies'
    }
}, {
    tableName: 'milestone_progress',
    timestamps: true,
    indexes: [
        { fields: ['milestoneId'] },
        { fields: ['teamMember'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = MilestoneProgress;