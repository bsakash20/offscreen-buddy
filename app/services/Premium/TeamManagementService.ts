/**
 * Team Management Service
 * Handles team collaboration, roles, and goals
 */

export type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface Team {
    id: string;
    name: string;
    type: string;
    memberCount: number;
    createdAt: string;
}

export interface TeamMember {
    id: string;
    userId: string;
    role: TeamRole;
    profile: {
        name: string;
        email: string;
        department?: string;
    };
}

export interface TeamGoal {
    id: string;
    teamId: string;
    title: string;
    description: string;
    type: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'paused' | 'cancelled';
    createdBy: string;
    participants: string[];
    isPublic: boolean;
}

export interface TeamAnalytics {
    activeMembers: number;
    totalFocusTime: number;
    teamStreak: number;
    goalProgress: number;
    totalSessions: number;
    averageSessionDuration: number;
    participationRate: number;
    topPerformers: {
        userId: string;
        name: string;
        rank: number;
        focusTime: number;
        sessionsCompleted: number;
        successRate: number;
    }[];
}

export interface TeamActivity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId: string;
}

export class TeamManagementService {
    private currentUserId: string | null = null;

    setCurrentUser(userId: string) {
        this.currentUserId = userId;
    }

    async getTeam(teamId: string): Promise<Team> {
        return {
            id: teamId,
            name: 'Engineering Team',
            type: 'organization',
            memberCount: 5,
            createdAt: new Date().toISOString()
        };
    }

    async getTeamMembers(teamId: string): Promise<TeamMember[]> {
        return [
            {
                id: '1',
                userId: 'user1',
                role: 'owner',
                profile: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    department: 'Engineering'
                }
            }
        ];
    }

    async getTeamGoals(teamId: string): Promise<TeamGoal[]> {
        return [
            {
                id: '1',
                teamId,
                title: 'Weekly Focus Sprint',
                description: 'Achieve 100 hours of deep work',
                type: 'focus_time',
                targetValue: 100,
                currentValue: 45,
                unit: 'hours',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                createdBy: 'user1',
                participants: ['user1'],
                isPublic: true
            }
        ];
    }

    async getTeamAnalytics(teamId: string, timeframe: string): Promise<TeamAnalytics> {
        return {
            activeMembers: 5,
            totalFocusTime: 45 * 60 * 60 * 1000,
            teamStreak: 3,
            goalProgress: 45,
            totalSessions: 20,
            averageSessionDuration: 45 * 60 * 1000,
            participationRate: 80,
            topPerformers: [
                {
                    userId: 'user1',
                    name: 'John Doe',
                    rank: 1,
                    focusTime: 10 * 60 * 60 * 1000,
                    sessionsCompleted: 5,
                    successRate: 95
                }
            ]
        };
    }

    async getTeamActivities(teamId: string, limit: number): Promise<TeamActivity[]> {
        return [
            {
                id: '1',
                type: 'goal_achieved',
                description: 'Team achieved daily goal',
                timestamp: new Date().toISOString(),
                userId: 'system'
            }
        ];
    }

    async createInvite(teamId: string, email: string, role: TeamRole): Promise<void> {
        console.log(`Inviting ${email} to team ${teamId} as ${role}`);
    }

    async createTeamGoal(goal: Omit<TeamGoal, 'id' | 'currentValue'>): Promise<TeamGoal> {
        console.log('Creating team goal', goal);
        return {
            id: `goal_${Date.now()}`,
            currentValue: 0,
            ...goal,
            startDate: goal.startDate instanceof Date ? goal.startDate.toISOString() : goal.startDate,
            endDate: goal.endDate instanceof Date ? goal.endDate.toISOString() : goal.endDate
        };
    }
}

const teamManagementService = new TeamManagementService();
export default teamManagementService;
