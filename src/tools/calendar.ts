import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { SupabaseClient } from '../api/supabase-client.js';

export const createCalendarTools = (supabaseClient: SupabaseClient) => {
    return {
        getNextMeeting: createTool({
            name: 'get_next_meeting',
            description: 'Get the immediate next upcoming meeting/event from the calendar.',
            parameters: z.object({}),
            execute: async () => {
                const meeting = await supabaseClient.getNextMeeting();
                if (!meeting) {
                    return 'You have no upcoming meetings found.';
                }

                return {
                    summary: meeting.summary,
                    startTime: new Date(meeting.start_time).toLocaleString(),
                    endTime: new Date(meeting.end_time).toLocaleString(),
                    link: meeting.meeting_link || 'No link',
                    description: meeting.description || '',
                    attendees: meeting.attendees ? meeting.attendees.length : 0
                };
            },
        }),

        getTodaysMeetings: createTool({
            name: 'get_todays_meetings',
            description: 'Get all meetings and events scheduled for today.',
            parameters: z.object({}),
            execute: async () => {
                const meetings = await supabaseClient.getMeetingsForDate(new Date());

                if (meetings.length === 0) {
                    return 'You have no meetings scheduled for today.';
                }

                return meetings.map(m => ({
                    summary: m.summary,
                    startTime: new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    endTime: new Date(m.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    link: m.meeting_link || 'No link'
                }));
            },
        }),

        searchMeetings: createTool({
            name: 'search_meetings',
            description: 'Search for meetings by title or description.',
            parameters: z.object({
                query: z.string().describe('The search term to look for'),
            }),
            execute: async ({ query }) => {
                const meetings = await supabaseClient.searchMeetings(query);
                if (meetings.length === 0) {
                    return `No meetings found matching "${query}".`;
                }
                return meetings.map(m => ({
                    summary: m.summary,
                    date: new Date(m.start_time).toLocaleDateString(),
                    startTime: new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    description: m.description ? m.description.substring(0, 100) + '...' : ''
                }));
            }
        }),

        getMeetingsForAttendee: createTool({
            name: 'get_meetings_for_attendee',
            description: 'Get meetings/events where a specific person is attending. You should provide the name of the person.',
            parameters: z.object({
                name: z.string().describe('The name of the person to filter by'),
            }),
            execute: async ({ name }) => {
                // 1. Find user by name
                const user = await supabaseClient.findUserByName(name);
                if (!user) {
                    return `Could not find any user with name matching "${name}".`;
                }

                // 2. Fetch meetings for that user
                const meetings = await supabaseClient.getMeetingsForUser(user.id);

                if (meetings.length === 0) {
                    return `No recent meetings found for ${user.display_name}.`;
                }

                return {
                    message: `Found ${meetings.length} meeting(s) for ${user.display_name}.`,
                    meetings: meetings.map(m => ({
                        summary: m.summary,
                        date: new Date(m.start_time).toLocaleDateString(),
                        startTime: new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        description: m.description ? m.description.substring(0, 100) + '...' : ''
                    }))
                };
            }
        })
    };
};
