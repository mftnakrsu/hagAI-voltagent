
import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import { CalendarEvent } from '../types/supabase.js';

export class SupabaseClient {
    private client: SupabaseClientType;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.client = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Get the next upcoming meeting based on current time
     */
    async getNextMeeting(): Promise<CalendarEvent | null> {
        const now = new Date().toISOString();

        const { data, error } = await this.client
            .from('calendar_events')
            .select('*')
            .gte('start_time', now)
            .eq('status', 'confirmed')
            .order('start_time', { ascending: true })
            .limit(1)
            .single();

        if (error) {
            // .single() returns error code PGRST116 if no rows found, which we treat as null
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Error fetching next meeting:', error);
            throw new Error(`Failed to fetch next meeting: ${error.message}`);
        }

        return data as CalendarEvent;
    }

    /**
     * Get meetings for a specific date (defaults to today)
     */
    async getMeetingsForDate(date?: Date): Promise<CalendarEvent[]> {
        const targetDate = date || new Date();

        // Start of day
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        // End of day
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await this.client
            .from('calendar_events')
            .select('*')
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .neq('status', 'cancelled') // Exclude cancelled calls
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching meetings for date:', error);
            throw new Error(`Failed to fetch meetings: ${error.message}`);
        }

        return (data || []) as CalendarEvent[];
    }

    /**
     * Search for meetings by title or description
     */
    async searchMeetings(query: string, limit = 5): Promise<CalendarEvent[]> {
        const { data, error } = await this.client
            .from('calendar_events')
            .select('*')
            .or(`summary.ilike.%${query}%,description.ilike.%${query}%`)
            .order('start_time', { ascending: false }) // Show recent/future ones first? Or should we filter by future only?
            // Let's filter for future or recent past (last 7 days) to be relevant
            .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(limit);

        if (error) {
            console.error('Error searching meetings:', error);
            throw new Error(`Failed to search meetings: ${error.message}`);
        }

        return (data || []) as CalendarEvent[];
    }

    /**
     * Find a user by name in the users table
     */
    async findUserByName(name: string): Promise<any | null> {
        const { data, error } = await this.client
            .from('users')
            .select('*')
            .ilike('display_name', `%${name}%`)
            .limit(1)
            .single();

        if (error) {
            // PGRST116 means no matches found when using single()
            if (error.code === 'PGRST116') return null;
            console.error('Error finding user:', error);
            // Don't throw here, just return null so we can handle gracefully
            return null;
        }

        return data;
    }

    /**
     * Get meetings where the specified user is an attendee
     */
    async getMeetingsForUser(userId: string): Promise<CalendarEvent[]> {
        // Since attendees is a JSONB array, we can filter using the arrow operator ->> or containment @>
        // But Supabase JS client syntax for JSON contains: .contains('attendees', JSON.stringify([{ user_id: userId }]))
        // Note: The attendees structure is [{ user_id: "...", ... }, ...].
        // So we want any row where attendees @> '[{"user_id": "userId"}]'

        // Let's filter for future/recent meetings similar to search
        const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await this.client
            .from('calendar_events')
            .select('*')
            .gte('start_time', recentDate)
            .contains('attendees', JSON.stringify([{ user_id: userId }]))
            .order('start_time', { ascending: true })
            .limit(20);

        if (error) {
            console.error('Error fetching meetings for user:', error);
            throw new Error(`Failed to fetch meetings for user: ${error.message}`);
        }

        return (data || []) as CalendarEvent[];
    }
}
