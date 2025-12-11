/**
 * Tools for project and section status tracking
 */

import { createTool } from '@voltagent/core';
import { z } from 'zod';
import type { AsanaClient } from '../api/asana-client.js';
import type { SectionStatus } from '../types/asana.js';

export function createProjectStatusTools(asanaClient: AsanaClient) {
  /**
   * Get project status with section breakdown
   */
  const getProjectStatus = createTool({
    name: 'get_project_status',
    description:
      'Analyzes the status of a specific project, showing total tasks, completed tasks, completion rate, and breakdown by sections. Use this to answer "What is the status of project X?" or "How is project X doing?"',
    parameters: z.object({
      projectName: z
        .string()
        .describe('The name of the project to analyze (case-insensitive)'),
    }),
    execute: async ({ projectName }) => {
      try {
        // Find project by name
        const project = await asanaClient.findProjectByName(projectName);

        if (!project) {
          return {
            error: `Project "${projectName}" not found.`,
            suggestions: 'Try listing all projects first to find the exact name.',
          };
        }

        // Get project sections
        const sections = await asanaClient.getProjectSections(project.gid);

        // Get tasks for each section
        const sectionStatuses: SectionStatus[] = [];

        for (const section of sections) {
          const tasks = await asanaClient.getSectionTasks(section.gid);
          const completedTasks = tasks.filter(t => t.completed).length;

          sectionStatuses.push({
            section,
            totalTasks: tasks.length,
            completedTasks,
            completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
          });
        }

        // Calculate overall project stats
        const totalTasks = sectionStatuses.reduce((sum, s) => sum + s.totalTasks, 0);
        const completedTasks = sectionStatuses.reduce((sum, s) => sum + s.completedTasks, 0);
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Sort sections by most work (incomplete tasks)
        const sortedSections = sectionStatuses
          .map(s => ({
            name: s.section.name,
            totalTasks: s.totalTasks,
            completedTasks: s.completedTasks,
            incompleteTasks: s.totalTasks - s.completedTasks,
            completionRate: s.completionRate,
          }))
          .sort((a, b) => b.incompleteTasks - a.incompleteTasks);

        return {
          message: `Project "${project.name}" has ${totalTasks} total tasks (${completionRate}% complete).`,
          projectName: project.name,
          projectGid: project.gid,
          totalTasks,
          completedTasks,
          incompleteTasks: totalTasks - completedTasks,
          completionRate,
          sectionCount: sections.length,
          sections: sortedSections,
        };
      } catch (error) {
        return {
          error: `Failed to analyze project status: ${error}`,
        };
      }
    },
  });

  /**
   * Find section with most work
   */
  const getSectionWithMostWork = createTool({
    name: 'get_section_with_most_work',
    description:
      'Identifies which section in a project has the most incomplete tasks. Use this to answer "Which section has the most work?" or "What section needs the most attention in project X?"',
    parameters: z.object({
      projectName: z
        .string()
        .describe('The name of the project to analyze (case-insensitive)'),
    }),
    execute: async ({ projectName }) => {
      try {
        // Find project by name
        const project = await asanaClient.findProjectByName(projectName);

        if (!project) {
          return {
            error: `Project "${projectName}" not found.`,
          };
        }

        // Get project sections
        const sections = await asanaClient.getProjectSections(project.gid);

        if (sections.length === 0) {
          return {
            message: `Project "${project.name}" has no sections.`,
          };
        }

        // Get tasks for each section
        const sectionWorkload = [];

        for (const section of sections) {
          const tasks = await asanaClient.getSectionTasks(section.gid);
          const incompleteTasks = tasks.filter(t => !t.completed);

          sectionWorkload.push({
            sectionName: section.name,
            sectionGid: section.gid,
            totalTasks: tasks.length,
            incompleteTasks: incompleteTasks.length,
            completedTasks: tasks.length - incompleteTasks.length,
          });
        }

        // Sort by most incomplete tasks
        sectionWorkload.sort((a, b) => b.incompleteTasks - a.incompleteTasks);

        const busiestSection = sectionWorkload[0];

        return {
          message: `Section "${busiestSection.sectionName}" has the most work with ${busiestSection.incompleteTasks} incomplete task(s).`,
          projectName: project.name,
          busiestSection: busiestSection.sectionName,
          incompleteTasks: busiestSection.incompleteTasks,
          allSections: sectionWorkload,
        };
      } catch (error) {
        return {
          error: `Failed to analyze section workload: ${error}`,
        };
      }
    },
  });

  /**
   * List all projects
   */
  const listAllProjects = createTool({
    name: 'list_all_projects',
    description:
      'Lists all projects in the workspace. Use this to discover available projects or when the user asks "What projects do we have?" or needs to find the exact project name.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const projects = await asanaClient.getWorkspaceProjects();

        if (projects.length === 0) {
          return {
            message: 'No projects found in the workspace.',
            count: 0,
            projects: [],
          };
        }

        const projectList = projects.map(p => ({
          name: p.name,
          gid: p.gid,
        }));

        return {
          message: `Found ${projects.length} project(s) in the workspace.`,
          count: projects.length,
          projects: projectList,
        };
      } catch (error) {
        return {
          error: `Failed to list projects: ${error}`,
          count: 0,
          projects: [],
        };
      }
    },
  });

  return {
    getProjectStatus,
    getSectionWithMostWork,
    listAllProjects,
  };
}
