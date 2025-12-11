/**
 * Hagai Agent Configuration
 */

import { Agent, Memory } from '@voltagent/core';
import { LibSQLMemoryAdapter } from '@voltagent/libsql';
import type { LanguageModel } from 'ai';
import { AsanaClient } from './api/asana-client.js';
import {
  createDailyStatusTools,
  createWeeklyPlanningTools,
  createProjectStatusTools,
  createDueDateTrackingTools,
  createAdditionalQueryTools,
} from './tools/index.js';

const getSystemPrompt = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `You are Hagai, Hagia Labs' AI project management assistant. You have access to Asana task and project data through a comprehensive set of tools.

Current Date and Time: ${dateStr}, ${timeStr}

Your responsibilities:
- Report daily and weekly work status
- Analyze team workload distribution
- Track project and section progress
- Monitor due date changes and postponements
- Highlight critical situations (overdue tasks, frequently postponed tasks)
- Provide actionable insights for project management

When responding:
- Be concise and direct
- Provide numerical data (X tasks, Y people, Z% completed)
- Highlight critical issues that need attention
- Use bullet points for lists when appropriate
- Always respond in English
- When asked about specific projects, use the list_all_projects tool first if you don't have the exact project name

Guidelines:
- For date-related queries (today, this week), use the appropriate date filtering tools
- When analyzing team workload, focus on incomplete tasks unless specifically asked about completed ones
- For project status, provide both overall stats and section-level breakdown
- When tracking due date changes, highlight patterns (frequently postponed tasks are red flags)
- Be proactive in surfacing potential issues (overdue tasks, unassigned tasks, tasks without due dates)
- IMPORTANT: When a user asks about a person by name (e.g. "What is John doing?", "Show tasks for Sarah"), you MUST FIRST identify their User GID.
  1. Use the search_users tool to find the person by name.
  2. Use the returned GID to query their tasks (e.g. with get_tasks_assigned_to).
  3. Do NOT guess GIDs or use names directly in assignee fields.
- For "my tasks" or "assigned to me", use the get_me tool first to find the current user's GID.

Always be helpful, accurate, and focused on providing actionable project management insights.`;
};

export function createHagaiAgent(
  model: LanguageModel,
  asanaAccessToken: string,
  asanaWorkspaceGid: string
): Agent {
  // Initialize Asana client
  const asanaClient = new AsanaClient(asanaAccessToken, asanaWorkspaceGid);

  // Create tool instances
  const dailyStatusTools = createDailyStatusTools(asanaClient);
  const weeklyPlanningTools = createWeeklyPlanningTools(asanaClient);
  const projectStatusTools = createProjectStatusTools(asanaClient);
  const dueDateTrackingTools = createDueDateTrackingTools(asanaClient);
  const additionalQueryTools = createAdditionalQueryTools(asanaClient);

  // Combine all tools
  const tools = [
    // Daily status
    dailyStatusTools.getTasksCompletedToday,
    dailyStatusTools.getTasksUpdatedToday,
    dailyStatusTools.getTasksDueToday,

    // Weekly planning & workload
    weeklyPlanningTools.getWeeklyPlannedTasks,
    weeklyPlanningTools.getTeamWorkload,
    weeklyPlanningTools.getOverdueTasksByPerson,

    // Project & section status
    projectStatusTools.getProjectStatus,
    projectStatusTools.getSectionWithMostWork,
    projectStatusTools.listAllProjects,

    // Due date tracking
    dueDateTrackingTools.getTaskDueDateChanges,
    dueDateTrackingTools.getMostPostponedTasks,
    dueDateTrackingTools.getRecentDueDateChanges,

    // Additional queries
    additionalQueryTools.getOverdueTasks,
    additionalQueryTools.getUnassignedTasks,
    additionalQueryTools.getTasksWithoutDueDates,
    additionalQueryTools.searchTasksByName,
    additionalQueryTools.getWorkspaceUsers,
    additionalQueryTools.getMe,
    additionalQueryTools.searchUsers,
  ];

  // Set up memory
  const memory = new Memory({
    storage: new LibSQLMemoryAdapter({ url: 'file:./.hagai/memory.db' }),
  });

  // Create and return the agent
  const agent = new Agent({
    name: 'hagai',
    instructions: getSystemPrompt(),
    model,
    tools,
    memory,
  });

  return agent;
}
