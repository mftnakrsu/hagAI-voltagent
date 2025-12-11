/**
 * Tools for daily status queries
 */

import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { startOfDay, format } from 'date-fns';
import type { AsanaClient } from '../api/asana-client.js';

export function createDailyStatusTools(asanaClient: AsanaClient) {
  /**
   * Get tasks completed today
   */
  const getTasksCompletedToday = createTool({
    name: 'get_tasks_completed_today',
    description:
      'Fetches all tasks that were marked as completed today. Use this to answer "What was done today?" or "What tasks were completed today?"',
    parameters: z.object({
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee GID. Leave empty for all users.'),
    }),
    execute: async ({ assignee }) => {
      try {
        const today = new Date();
        const todayStart = startOfDay(today).toISOString();

        const tasks = await asanaClient.getTasks({
          completed_since: todayStart,
          assignee,
        });

        const completedToday = tasks.filter(
          task => task.completed && task.completed_at && task.completed_at >= todayStart
        );

        if (completedToday.length === 0) {
          return {
            message: 'No tasks were completed today.',
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = completedToday.map(task => ({
          name: task.name,
          gid: task.gid,
          completedAt: task.completed_at,
          assignee: task.assignee?.name || 'Unassigned',
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
        }));

        return {
          message: `${completedToday.length} task(s) completed today.`,
          count: completedToday.length,
          tasks: formattedTasks,
          date: format(today, 'yyyy-MM-dd'),
        };
      } catch (error) {
        return {
          error: `Failed to fetch completed tasks: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get tasks updated today
   */
  const getTasksUpdatedToday = createTool({
    name: 'get_tasks_updated_today',
    description:
      'Fetches all tasks that were modified/updated today (any field change). Use this to answer "What was updated today?" or "What changed today?"',
    parameters: z.object({
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee GID. Leave empty for all users.'),
      includeCompleted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include completed tasks in the results'),
    }),
    execute: async ({ assignee, includeCompleted }) => {
      try {
        const today = new Date();
        const todayStart = startOfDay(today).toISOString();

        const tasks = await asanaClient.getTasks({
          modified_since: todayStart,
          assignee,
        });

        let filteredTasks = tasks.filter(
          task => task.modified_at && task.modified_at >= todayStart
        );

        if (!includeCompleted) {
          filteredTasks = filteredTasks.filter(task => !task.completed);
        }

        if (filteredTasks.length === 0) {
          return {
            message: 'No tasks were updated today.',
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = filteredTasks.map(task => ({
          name: task.name,
          gid: task.gid,
          modifiedAt: task.modified_at,
          completed: task.completed,
          assignee: task.assignee?.name || 'Unassigned',
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
        }));

        return {
          message: `${filteredTasks.length} task(s) updated today.`,
          count: filteredTasks.length,
          tasks: formattedTasks,
          date: format(today, 'yyyy-MM-dd'),
        };
      } catch (error) {
        return {
          error: `Failed to fetch updated tasks: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get tasks due today
   */
  const getTasksDueToday = createTool({
    name: 'get_tasks_due_today',
    description:
      'Fetches all tasks that have a due date of today. Use this to answer "What is due today?" or "What tasks are due today?"',
    parameters: z.object({
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee GID. Leave empty for all users.'),
      excludeCompleted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Exclude already completed tasks from results'),
    }),
    execute: async ({ assignee, excludeCompleted }) => {
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Get all tasks and filter by due date
        const tasks = await asanaClient.getTasks({
          assignee,
        });

        let dueToday = tasks.filter(task => {
          if (!task.due_on) return false;
          return task.due_on === todayStr;
        });

        if (excludeCompleted) {
          dueToday = dueToday.filter(task => !task.completed);
        }

        if (dueToday.length === 0) {
          return {
            message: 'No tasks are due today.',
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = dueToday.map(task => ({
          name: task.name,
          gid: task.gid,
          dueOn: task.due_on,
          completed: task.completed,
          assignee: task.assignee?.name || 'Unassigned',
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
        }));

        return {
          message: `${dueToday.length} task(s) due today.`,
          count: dueToday.length,
          tasks: formattedTasks,
          date: todayStr,
        };
      } catch (error) {
        return {
          error: `Failed to fetch tasks due today: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  return {
    getTasksCompletedToday,
    getTasksUpdatedToday,
    getTasksDueToday,
  };
}
