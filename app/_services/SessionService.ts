import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FocusSession {
    id: string;
    startTime: number;
    endTime: number;
    duration: number; // in seconds
    completed: boolean;
    category?: string; // e.g., 'work', 'study' - for future use
}

const STORAGE_KEYS = {
    SESSIONS: 'focus_sessions_history',
};

class SessionService {
    /**
     * Save a completed or cancelled session
     */
    async saveSession(session: Omit<FocusSession, 'id'>): Promise<void> {
        try {
            const newSession: FocusSession = {
                ...session,
                id: Date.now().toString(),
            };

            const existingSessions = await this.getAllSessions();
            const updatedSessions = [...existingSessions, newSession];

            await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    /**
     * Get all sessions history
     */
    async getAllSessions(): Promise<FocusSession[]> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to get sessions:', error);
            return [];
        }
    }

    /**
     * Get sessions within a specific date range
     */
    async getSessions(startDate: Date, endDate: Date): Promise<FocusSession[]> {
        const allSessions = await this.getAllSessions();
        return allSessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= startDate && sessionDate <= endDate;
        });
    }

    /**
     * Clear all history (mostly for debugging/reset)
     */
    async clearHistory(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.SESSIONS);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    }
}

export const sessionService = new SessionService();
