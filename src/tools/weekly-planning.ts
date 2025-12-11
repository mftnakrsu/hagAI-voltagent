/**
 * Tools for weekly planning and team workload
 */

import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import type { AsanaClient } from '../api/asana-client.js';
import type { UserWorkload } from '../types/asana.js';

export function createWeeklyPlanningTools(asanaClient: AsanaClient) {
  /**
   * Get tasks planned for this week
   */
  const getWeeklyPlannedTasks = createTool({
    name: 'get_weekly_planned_tasks',
    description:
      'Fetches all tasks that have a due date within the current week (Monday to Sunday). Use this to answer "What is planned for this week?" or "What are the weekly tasks?"',
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
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        // Get all tasks and filter by due date
        const tasks = await asanaClient.getTasks({
          assignee,
        });

        let weeklyTasks = tasks.filter(task => {
          if (!task.due_on) return false;
          const dueDate = task.due_on;
          return dueDate >= weekStartStr && dueDate <= weekEndStr;
        });

        if (excludeCompleted) {
          weeklyTasks = weeklyTasks.filter(task => !task.completed);
        }

        if (weeklyTasks.length === 0) {
          return {
            message: 'No tasks planned for this week.',
            count: 0,
            tasks: [],
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
          };
        }

        // Group by day
        const tasksByDay: Record<string, any[]> = {};
        weeklyTasks.forEach(task => {
          const day = task.due_on!;
          if (!tasksByDay[day]) {
            tasksByDay[day] = [];
          }
          tasksByDay[day].push({
            name: task.name,
            gid: task.gid,
            completed: task.completed,
            assignee: task.assignee?.name || 'Unassigned',
            project: task.memberships?.[0]?.project?.name || 'No project',
            section: task.memberships?.[0]?.section?.name || 'No section',
          });
        });

        return {
          message: `${weeklyTasks.length} task(s) planned for this week.`,
          count: weeklyTasks.length,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          tasksByDay,
        };
      } catch (error) {
        return {
          error: `Failed to fetch weekly tasks: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get team workload distribution
   */
  const getTeamWorkload = createTool({
    name: 'get_team_workload',
    description:
      'Analyzes how many tasks each team member has, including total, completed, overdue, and upcoming tasks. Use this to answer "Who has how many tasks?" or "What is the team workload distribution?"',
    parameters: z.object({
      includeCompleted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include completed tasks in the count'),
    }),
    execute: async ({ includeCompleted }) => {
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Get all tasks
        const tasks = await asanaClient.getTasks({});

        // Group by assignee
        const workloadMap = new Map<string, UserWorkload>();

        tasks.forEach(task => {
          if (!includeCompleted && task.completed) return;

          const assigneeGid = task.assignee?.gid || 'unassigned';

          if (!workloadMap.has(assigneeGid)) {
            workloadMap.set(assigneeGid, {
              user: task.assignee || { gid: 'unassigned', name: 'Unassigned', resource_type: 'user' },
              totalTasks: 0,
              completedTasks: 0,
              overdueTasks: 0,
              upcomingTasks: 0,
            });
          }

          const workload = workloadMap.get(assigneeGid)!;
          workload.totalTasks++;

          if (task.completed) {
            workload.completedTasks++;
          }

          if (task.due_on && !task.completed) {
            if (task.due_on < todayStr) {
              workload.overdueTasks++;
            } else {
              workload.upcomingTasks++;
            }
          }
        });

        const workloadArray = Array.from(workloadMap.values()).sort(
          (a, b) => b.totalTasks - a.totalTasks
        );

        if (workloadArray.length === 0) {
          return {
            message: 'No tasks found for workload analysis.',
            teamMembers: 0,
            workload: [],
          };
        }

        const summary = workloadArray.map(w => ({
          user: w.user.name,
          userGid: w.user.gid,
          totalTasks: w.totalTasks,
          completedTasks: w.completedTasks,
          overdueTasks: w.overdueTasks,
          upcomingTasks: w.upcomingTasks,
          completionRate: w.totalTasks > 0 ? Math.round((w.completedTasks / w.totalTasks) * 100) : 0,
        }));

        return {
          message: `Workload analysis for ${workloadArray.length} team member(s).`,
          teamMembers: workloadArray.length,
          totalTasks: workloadArray.reduce((sum, w) => sum + w.totalTasks, 0),
          workload: summary,
        };
      } catch (error) {
        return {
          error: `Failed to analyze team workload: ${error}`,
          teamMembers: 0,
          workload: [],
        };
      }
    },
  });

  /**
   * Get overdue tasks per person
   */
  const getOverdueTasksByPerson = createTool({
    name: 'get_overdue_tasks_by_person',
    description:
      'Lists overdue tasks grouped by team member. Use this to answer "Who has overdue tasks?" or "What are the overdue tasks per person?"',
    parameters: z.object({}),
    execute: async () => {
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Get all incomplete tasks
        const tasks = await asanaClient.getTasks({});

        const overdueTasks = tasks.filter(
          task => !task.completed && task.due_on && task.due_on < todayStr
        );

        if (overdueTasks.length === 0) {
          return {
            message: 'No overdue tasks found.',
            totalOverdue: 0,
            byPerson: [],
          };
        }

        // Group by assignee
        const overdueByPerson = new Map<string, any>();

        overdueTasks.forEach(task => {
          const assigneeGid = task.assignee?.gid || 'unassigned';
          const assigneeName = task.assignee?.name || 'Unassigned';

          if (!overdueByPerson.has(assigneeGid)) {
            overdueByPerson.set(assigneeGid, {
              user: assigneeName,
              userGid: assigneeGid,
              overdueCount: 0,
              tasks: [],
            });
          }

          const personData = overdueByPerson.get(assigneeGid)!;
          personData.overdueCount++;
          personData.tasks.push({
            name: task.name,
            gid: task.gid,
            dueOn: task.due_on,
            project: task.memberships?.[0]?.project?.name || 'No project',
          });
        });

        const resultArray = Array.from(overdueByPerson.values()).sort(
          (a, b) => b.overdueCount - a.overdueCount
        );

        return {
          message: `${overdueTasks.length} overdue task(s) across ${resultArray.length} team member(s).`,
          totalOverdue: overdueTasks.length,
          byPerson: resultArray,
        };
      } catch (error) {
        return {
          error: `Failed to fetch overdue tasks: ${error}`,
          totalOverdue: 0,
          byPerson: [],
        };
      }
    },
  });

  return {
    getWeeklyPlannedTasks,
    getTeamWorkload,
    getOverdueTasksByPerson,
  };
}
