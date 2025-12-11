
export interface CalendarEvent {
    id: string;
    google_event_id: string; // Unique ID from Google
    calendar_id: string;
    summary: string;
    description: string | null;
    location: string | null;
    start_time: string; // ISO string
    end_time: string;   // ISO string
    timezone: string;
    is_all_day: boolean;
    event_type: 'default' | 'outOfOffice' | 'workingLocation' | 'focusTime';
    status: 'confirmed' | 'tentative' | 'cancelled';
    visibility: 'default' | 'public' | 'private' | 'confidential';
    meeting_link: string | null;
    organizer_id: string | null;
    attendees: Array<{
        email?: string;
        response_status?: string;
        self?: boolean;
        [key: string]: any;
    }> | null; // JSONB
    created_at?: string;
    updated_at?: string;
}
