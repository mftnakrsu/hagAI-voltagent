/**
 * Tools for tracking due date changes using Asana Stories API
 */

import { createTool } from '@voltagent/core';
import { z } from 'zod';
import type { AsanaClient } from '../api/asana-client.js';
import type { DueDateChange } from '../types/asana.js';

export function createDueDateTrackingTools(asanaClient: AsanaClient) {
  /**
   * Get due date changes for a specific task
   */
  const getTaskDueDateChanges = createTool({
    name: 'get_task_due_date_changes',
    description:
      'Retrieves the history of due date changes for a specific task. Use this to answer "How many times was task X postponed?" or "What is the due date history of task X?"',
    parameters: z.object({
      taskGid: z.string().describe('The GID of the task to analyze'),
    }),
    execute: async ({ taskGid }) => {
      try {
        // Get task details
        const task = await asanaClient.getTask(taskGid);

        // Get task stories
        const stories = await asanaClient.getTaskStories(taskGid);

        // Filter for due date changes
        const dueDateChanges = stories.filter(
          story =>
            story.resource_subtype === 'due_date_changed' ||
            (story.new_due_on && story.old_due_on && story.new_due_on !== story.old_due_on)
        );

        if (dueDateChanges.length === 0) {
          return {
            message: `Task "${task.name}" has no due date changes recorded.`,
            taskName: task.name,
            taskGid: task.gid,
            currentDueDate: task.due_on || 'No due date',
            changeCount: 0,
            changes: [],
          };
        }

        const changes = dueDateChanges.map(story => ({
          date: story.created_at,
          oldDueDate: story.old_due_on || 'No due date',
          newDueDate: story.new_due_on || 'Removed',
          changedBy: story.created_by.name,
        }));

        return {
          message: `Task "${task.name}" has had its due date changed ${dueDateChanges.length} time(s).`,
          taskName: task.name,
          taskGid: task.gid,
          currentDueDate: task.due_on || 'No due date',
          changeCount: dueDateChanges.length,
          changes,
        };
      } catch (error) {
        return {
          error: `Failed to fetch due date changes: ${error}`,
          changeCount: 0,
          changes: [],
        };
      }
    },
  });

  /**
   * Get most postponed tasks
   */
  const getMostPostponedTasks = createTool({
    name: 'get_most_postponed_tasks',
    description:
      'Identifies tasks that have had their due dates changed multiple times (most postponed). Use this to answer "What are the most postponed tasks?" or "Which tasks keep getting delayed?"',
    parameters: z.object({
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of tasks to return (default: 10)'),
    }),
    execute: async ({ limit }) => {
      try {
        // Get all incomplete tasks
        const tasks = await asanaClient.getTasks({});
        const incompleteTasks = tasks.filter(t => !t.completed && t.due_on);

        if (incompleteTasks.length === 0) {
          return {
            message: 'No incomplete tasks with due dates found.',
            tasks: [],
          };
        }

        // Analyze each task for due date changes
        const tasksWithChanges: DueDateChange[] = [];

        for (const task of incompleteTasks) {
          try {
            const stories = await asanaClient.getTaskStories(task.gid);

            const dueDateChanges = stories.filter(
              story =>
                story.resource_subtype === 'due_date_changed' ||
                (story.new_due_on && story.old_due_on && story.new_due_on !== story.old_due_on)
            );

            if (dueDateChanges.length > 0) {
              const changes = dueDateChanges.map(story => ({
                date: story.created_at,
                oldDueDate: story.old_due_on,
                newDueDate: story.new_due_on,
                changedBy: story.created_by,
              }));

              tasksWithChanges.push({
                task,
                changes,
                changeCount: dueDateChanges.length,
              });
            }
          } catch (error) {
            // Skip tasks that fail to fetch stories
            console.error(`Failed to fetch stories for task ${task.gid}:`, error);
          }
        }

        if (tasksWithChanges.length === 0) {
          return {
            message: 'No tasks with due date changes found.',
            tasks: [],
          };
        }

        // Sort by change count (most postponed first)
        tasksWithChanges.sort((a, b) => b.changeCount - a.changeCount);

        // Limit results
        const topPostponed = tasksWithChanges.slice(0, limit);

        const result = topPostponed.map(item => ({
          taskName: item.task.name,
          taskGid: item.task.gid,
          currentDueDate: item.task.due_on,
          assignee: item.task.assignee?.name || 'Unassigned',
          project: item.task.memberships?.[0]?.project?.name || 'No project',
          postponeCount: item.changeCount,
          lastChange: item.changes[0]?.date,
        }));

        return {
          message: `Found ${tasksWithChanges.length} task(s) with due date changes. Showing top ${topPostponed.length}.`,
          totalTasksWithChanges: tasksWithChanges.length,
          tasks: result,
        };
      } catch (error) {
        return {
          error: `Failed to analyze postponed tasks: ${error}`,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get recent due date changes
   */
  const getRecentDueDateChanges = createTool({
    name: 'get_recent_due_date_changes',
    description:
      'Lists tasks that had their due dates changed recently (within the last 7 days). Use this to answer "Which tasks had their due date changed recently?" or "What due dates were updated this week?"',
    parameters: z.object({
      days: z
        .number()
        .optional()
        .default(7)
        .describe('Number of days to look back (default: 7)'),
    }),
    execute: async ({ days }) => {
      try {
        const today = new Date();
        const cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString();

        // Get all tasks modified recently
        const tasks = await asanaClient.getTasks({
          modified_since: cutoffStr,
        });

        if (tasks.length === 0) {
          return {
            message: `No tasks were modified in the last ${days} day(s).`,
            tasks: [],
          };
        }

        // Check each task for due date changes
        const recentChanges = [];

        for (const task of tasks) {
          try {
            const stories = await asanaClient.getTaskStories(task.gid);

            const recentDueDateChanges = stories.filter(story => {
              if (story.created_at < cutoffStr) return false;
              return (
                story.resource_subtype === 'due_date_changed' ||
                (story.new_due_on && story.old_due_on && story.new_due_on !== story.old_due_on)
              );
            });

            if (recentDueDateChanges.length > 0) {
              const latestChange = recentDueDateChanges[0];
              recentChanges.push({
                taskName: task.name,
                taskGid: task.gid,
                assignee: task.assignee?.name || 'Unassigned',
                project: task.memberships?.[0]?.project?.name || 'No project',
                oldDueDate: latestChange.old_due_on || 'No due date',
                newDueDate: latestChange.new_due_on || 'Removed',
                changedBy: latestChange.created_by.name,
                changedAt: latestChange.created_at,
              });
            }
          } catch (error) {
            // Skip tasks that fail
            console.error(`Failed to check task ${task.gid}:`, error);
          }
        }

        if (recentChanges.length === 0) {
          return {
            message: `No due date changes found in the last ${days} day(s).`,
            tasks: [],
          };
        }

        // Sort by most recent first
        recentChanges.sort(
          (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );

        return {
          message: `Found ${recentChanges.length} task(s) with due date changes in the last ${days} day(s).`,
          count: recentChanges.length,
          tasks: recentChanges,
        };
      } catch (error) {
        return {
          error: `Failed to fetch recent due date changes: ${error}`,
          tasks: [],
        };
      }
    },
  });

  return {
    getTaskDueDateChanges,
    getMostPostponedTasks,
    getRecentDueDateChanges,
  };
}
