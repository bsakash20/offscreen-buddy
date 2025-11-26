const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Milestone = sequelize.define('Milestone', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    streamType: {
        type: DataTypes.ENUM(
            'security_remediation',
            'frontend_auth_migration',
            'data_migration',
            'realtime_features',
            'integration_testing',
            'performance_optimization'
        ),
        allowNull: false,
        comment: 'Development stream type for this milestone'
    },

    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Milestone title'
    },

    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Detailed milestone description'
    },

    status: {
        type: DataTypes.ENUM(
            'not_started',
            'in_progress',
            'in_review',
            'completed',
            'blocked',
            'delayed'
        ),
        defaultValue: 'not_started',
        comment: 'Current milestone status'
    },

    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
        comment: 'Milestone priority level'
    },

    assignedTeam: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Team responsible for this milestone'
    },

    estimatedStartDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Estimated start date for milestone'
    },

    estimatedEndDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Estimated end date for milestone'
    },

    actualStartDate: {
        type: DataTypes.DATE,
        comment: 'Actual start date when milestone began'
    },

    actualEndDate: {
        type: DataTypes.DATE,
        comment: 'Actual end date when milestone was completed'
    },

    progressPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
        comment: 'Completion percentage (0-100)'
    },

    dependencies: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of milestone IDs that this milestone depends on'
    },

    successCriteria: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of success criteria that must be met'
    },

    qualityGates: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of quality gates that must pass'
    },

    riskLevel: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'low',
        comment: 'Current risk level for this milestone'
    },

    riskFactors: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of identified risk factors'
    },

    resources: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Resource allocation details (team members, budget, etc.)'
    },

    metrics: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Key performance metrics for this milestone'
    },

    notes: {
        type: DataTypes.TEXT,
        comment: 'Additional notes and observations'
    },

    tags: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of tags for categorization'
    },

    metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Additional metadata for extensibility'
    }
}, {
    tableName: 'milestones',
    timestamps: true,
    indexes: [
        { fields: ['streamType'] },
        { fields: ['status'] },
        { fields: ['assignedTeam'] },
        { fields: ['estimatedEndDate'] },
        { fields: ['priority'] }
    ]
});

// Class methods
Milestone.getMilestonesByStream = function (streamType) {
    return this.findAll({
        where: { streamType },
        order: [['estimatedStartDate', 'ASC']]
    });
};

Milestone.getCriticalMilestones = function () {
    return this.findAll({
        where: {
            [sequelize.Op.or]: [
                { priority: 'critical' },
                { riskLevel: 'critical' }
            ]
        },
        order: [['estimatedEndDate', 'ASC']]
    });
};

Milestone.getOverdueMilestones = function () {
    return this.findAll({
        where: {
            status: {
                [sequelize.Op.not]: 'completed'
            },
            estimatedEndDate: {
                [sequelize.Op.lt]: new Date()
            }
        }
    });
};

// Instance methods
Milestone.prototype.updateProgress = function (newPercentage, notes = null) {
    this.progressPercentage = Math.min(100, Math.max(0, newPercentage));

    if (notes) {
        this.notes = this.notes ? `${this.notes}\n${new Date().toISOString()}: ${notes}` : notes;
    }

    // Auto-update status based on progress
    if (this.progressPercentage === 100) {
        this.status = 'completed';
        this.actualEndDate = new Date();
    } else if (this.progressPercentage > 0 && this.status === 'not_started') {
        this.status = 'in_progress';
        this.actualStartDate = new Date();
    }

    return this.save();
};

Milestone.prototype.addRisk = function (riskLevel, description, mitigation) {
    const riskFactors = this.riskFactors || [];
    riskFactors.push({
        id: Date.now(),
        level: riskLevel,
        description,
        mitigation,
        createdAt: new Date().toISOString(),
        status: 'active'
    });

    // Auto-update risk level
    const levelPriority = { low: 1, medium: 2, high: 3, critical: 4 };
    const currentLevelPriority = levelPriority[this.riskLevel] || 1;
    const newLevelPriority = levelPriority[riskLevel] || 1;

    if (newLevelPriority > currentLevelPriority) {
        this.riskLevel = riskLevel;
    }

    this.riskFactors = riskFactors;
    return this.save();
};

module.exports = Milestone;