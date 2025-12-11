import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { format } from 'date-fns';
import type { AsanaClient } from '../api/asana-client.js';

export function createAdditionalQueryTools(asanaClient: AsanaClient) {
  const getOverdueTasks = createTool({
    name: 'get_overdue_tasks',
    description:
      'Lists all tasks that are past their due date and not yet completed. Use this to answer "What tasks are overdue?" or "Show me overdue tasks."',
    parameters: z.object({
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee GID. Leave empty for all users.'),
    }),
    execute: async ({ assignee }) => {
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        let tasks;
        if (assignee) {
          tasks = await asanaClient.getTasks({ assignee });
        } else {
          tasks = await asanaClient.getAllAssignedTasks();
        }

        const overdueTasks = tasks.filter(
          task => !task.completed && task.due_on && task.due_on < todayStr
        );

        if (overdueTasks.length === 0) {
          return {
            message: 'No overdue tasks found.',
            count: 0,
            tasks: [],
          };
        }

        overdueTasks.sort((a, b) => {
          if (!a.due_on || !b.due_on) return 0;
          return a.due_on.localeCompare(b.due_on);
        });

        const formattedTasks = overdueTasks.map(task => {
          const dueDate = task.due_on!;
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            name: task.name,
            gid: task.gid,
            dueOn: dueDate,
            daysOverdue,
            assignee: task.assignee?.name || 'Unassigned',
            project: task.memberships?.[0]?.project?.name || 'No project',
            section: task.memberships?.[0]?.section?.name || 'No section',
          };
        });

        return {
          message: `${overdueTasks.length} overdue task(s) found.`,
          count: overdueTasks.length,
          tasks: formattedTasks,
        };
      } catch (error) {
        return {
          error: `Failed to fetch overdue tasks: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get unassigned tasks
   */
  const getUnassignedTasks = createTool({
    name: 'get_unassigned_tasks',
    description:
      'Lists all tasks that have no assignee. Use this to answer "What tasks are unassigned?" or "Show me tasks without an owner."',
    parameters: z.object({
      excludeCompleted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Exclude completed tasks from results'),
    }),
    execute: async ({ excludeCompleted }) => {
      try {
        // Use getAllProjectTasks to find unassigned tasks across all projects
        const tasks = await asanaClient.getAllProjectTasks();

        let unassignedTasks = tasks.filter(task => !task.assignee);

        if (excludeCompleted) {
          unassignedTasks = unassignedTasks.filter(task => !task.completed);
        }

        if (unassignedTasks.length === 0) {
          return {
            message: 'No unassigned tasks found.',
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = unassignedTasks.map(task => ({
          name: task.name,
          gid: task.gid,
          dueOn: task.due_on || 'No due date',
          completed: task.completed,
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
        }));

        return {
          message: `${unassignedTasks.length} unassigned task(s) found.`,
          count: unassignedTasks.length,
          tasks: formattedTasks,
        };
      } catch (error) {
        return {
          error: `Failed to fetch unassigned tasks: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get tasks without due dates
   */
  const getTasksWithoutDueDates = createTool({
    name: 'get_tasks_without_due_dates',
    description:
      'Lists all tasks that do not have a due date set. Use this to answer "What tasks have no due date?" or "Show me tasks missing deadlines."',
    parameters: z.object({
      excludeCompleted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Exclude completed tasks from results'),
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee GID. Leave empty for all users.'),
    }),
    execute: async ({ excludeCompleted, assignee }) => {
      try {
        let tasks;
        if (assignee) {
          tasks = await asanaClient.getTasks({ assignee });
        } else {
          tasks = await asanaClient.getAllAssignedTasks();
        }

        let tasksWithoutDueDate = tasks.filter(task => !task.due_on && !task.due_at);

        if (excludeCompleted) {
          tasksWithoutDueDate = tasksWithoutDueDate.filter(task => !task.completed);
        }

        if (tasksWithoutDueDate.length === 0) {
          return {
            message: 'No tasks without due dates found.',
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = tasksWithoutDueDate.map(task => ({
          name: task.name,
          gid: task.gid,
          assignee: task.assignee?.name || 'Unassigned',
          completed: task.completed,
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
          createdAt: task.created_at,
        }));

        return {
          message: `${tasksWithoutDueDate.length} task(s) without due dates found.`,
          count: tasksWithoutDueDate.length,
          tasks: formattedTasks,
        };
      } catch (error) {
        return {
          error: `Failed to fetch tasks without due dates: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Search tasks by name
   */
  const searchTasksByName = createTool({
    name: 'search_tasks_by_name',
    description:
      'Searches for tasks by name (case-insensitive partial match). Use this when the user asks about a specific task or wants to find tasks containing certain keywords.',
    parameters: z.object({
      searchQuery: z.string().describe('The text to search for in task names'),
      excludeCompleted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Exclude completed tasks from results'),
    }),
    execute: async ({ searchQuery, excludeCompleted }) => {
      try {
        // For search, we might want to search across all assigned tasks
        // This is expensive, but better than failing
        const tasks = await asanaClient.getAllAssignedTasks();

        const searchLower = searchQuery.toLowerCase();
        let matchingTasks = tasks.filter(task =>
          task.name.toLowerCase().includes(searchLower)
        );

        if (excludeCompleted) {
          matchingTasks = matchingTasks.filter(task => !task.completed);
        }

        if (matchingTasks.length === 0) {
          return {
            message: `No tasks found matching "${searchQuery}".`,
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = matchingTasks.map(task => ({
          name: task.name,
          gid: task.gid,
          completed: task.completed,
          dueOn: task.due_on || 'No due date',
          assignee: task.assignee?.name || 'Unassigned',
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
        }));

        return {
          message: `Found ${matchingTasks.length} task(s) matching "${searchQuery}".`,
          count: matchingTasks.length,
          searchQuery,
          tasks: formattedTasks,
        };
      } catch (error) {
        return {
          error: `Failed to search tasks: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  /**
   * Get workspace users
   */
  const getWorkspaceUsers = createTool({
    name: 'get_workspace_users',
    description:
      'Lists all team members in the workspace. Use this when you need to find user GIDs or answer "Who is on the team?" or "List all users."',
    parameters: z.object({}),
    execute: async () => {
      try {
        const users = await asanaClient.getWorkspaceUsers();

        if (users.length === 0) {
          return {
            message: 'No users found in the workspace.',
            count: 0,
            users: [],
          };
        }

        const formattedUsers = users.map(user => ({
          name: user.name,
          gid: user.gid,
          email: user.email || 'No email',
        }));

        return {
          message: `Found ${users.length} user(s) in the workspace.`,
          count: users.length,
          users: formattedUsers,
        };
      } catch (error) {
        return {
          error: `Failed to fetch workspace users: ${error}`,
          count: 0,
          users: [],
        };
      }
    },
  });

  /**
   * Get authenticated user
   */
  const getMe = createTool({
    name: 'get_me',
    description:
      'Identifies the current authenticated user. Use this when the user refers to "me", "my tasks", or "assigned to me". Returns the user\'s GID and name.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const me = await asanaClient.getMe();
        return {
          message: `Current user identified: ${me.name}`,
          user: {
            name: me.name,
            gid: me.gid,
            email: me.email || 'No email',
          },
        };
      } catch (error) {
        return {
          error: `Failed to fetch current user: ${error}`,
        };
      }
    },
  });

  /**
   * Search users
   */
  const searchUsers = createTool({
    name: 'search_users',
    description:
      'Searches for users in the workspace by name or email. Use this FIRST when the user asks about someone else\'s tasks (e.g. "What is John doing?") to find their GID before querying tasks.',
    parameters: z.object({
      query: z.string().describe('Name or email to search for'),
    }),
    execute: async ({ query }) => {
      try {
        const users = await asanaClient.searchUsers(query);

        if (users.length === 0) {
          return {
            message: `No users found matching "${query}".`,
            count: 0,
            users: [],
          };
        }

        const formattedUsers = users.map(user => ({
          name: user.name,
          gid: user.gid,
          email: user.email || 'No email',
        }));

        return {
          message: `Found ${users.length} user(s) matching "${query}".`,
          count: users.length,
          users: formattedUsers,
        };
      } catch (error) {
        return {
          error: `Failed to search users: ${error}`,
          count: 0,
          users: [],
        };
      }
    },
  });

  /**
   * Get tasks assigned to a specific user
   */
  const getTasksAssignedTo = createTool({
    name: 'get_tasks_assigned_to',
    description:
      'Lists tasks assigned to a specific user by their GID. Use this AFTER finding a user GID with search_users to see what they are working on.',
    parameters: z.object({
      assignee: z.string().describe('The GID of the user to fetch tasks for'),
      excludeCompleted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Exclude completed tasks from results (default: true)'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of tasks to return (default: 20)'),
    }),
    execute: async ({ assignee, excludeCompleted, limit }) => {
      try {
        const tasks = await asanaClient.getTasks({
          assignee,
          completed_since: excludeCompleted ? new Date().toISOString() : undefined
        });

        let filteredTasks = tasks;
        if (excludeCompleted) {
          filteredTasks = filteredTasks.filter(task => !task.completed);
        }

        // Limit results
        filteredTasks = filteredTasks.slice(0, limit);

        if (filteredTasks.length === 0) {
          return {
            message: 'No tasks found for this user.',
            count: 0,
            tasks: [],
          };
        }

        const formattedTasks = filteredTasks.map(task => ({
          name: task.name,
          gid: task.gid,
          dueOn: task.due_on || 'No due date',
          completed: task.completed,
          project: task.memberships?.[0]?.project?.name || 'No project',
          section: task.memberships?.[0]?.section?.name || 'No section',
        }));

        return {
          message: `Found ${filteredTasks.length} task(s) assigned to usage.`,
          count: filteredTasks.length,
          tasks: formattedTasks,
        };
      } catch (error) {
        return {
          error: `Failed to fetch tasks for user ${assignee}: ${error}`,
          count: 0,
          tasks: [],
        };
      }
    },
  });

  return {
    getOverdueTasks,
    getUnassignedTasks,
    getTasksWithoutDueDates,
    searchTasksByName,
    getWorkspaceUsers,
    getMe,
    searchUsers,
    getTasksAssignedTo,
  };
}
