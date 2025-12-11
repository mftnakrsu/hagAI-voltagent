/**
 * Asana API Client with rate limiting and error handling
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Asana = require('asana');

import type {
  AsanaTask,
  AsanaUser,
  AsanaProject,
  AsanaSection,
  AsanaStory,
} from '../types/asana.js';

export class AsanaClient {
  private client: any;
  private workspaceGid: string;
  private requestCount = 0;
  private resetTime = Date.now() + 60000; // 1 minute window

  constructor(accessToken: string, workspaceGid: string) {
    this.client = Asana.ApiClient.instance;
    const token = this.client.authentications['token'];
    token.accessToken = accessToken;
    this.workspaceGid = workspaceGid;
  }

  /**
   * Rate limiting: Asana allows 1500 requests per minute
   * We'll be conservative and limit to 100 requests per minute
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }

    if (this.requestCount >= 100) {
      const waitTime = this.resetTime - now;
      if (waitTime > 0) {
        console.log(`Rate limit approaching, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.resetTime = Date.now() + 60000;
      }
    }

    this.requestCount++;
  }

  /**
   * Get tasks from workspace with filters
   */
  async getTasks(params: {
    project?: string;
    section?: string;
    assignee?: string;
    completed_since?: string;
    modified_since?: string;
    opt_fields?: string[];
  }): Promise<AsanaTask[]> {
    await this.checkRateLimit();

    const tasksApi = new Asana.TasksApi();
    const optFields = params.opt_fields || [
      'gid',
      'name',
      'notes',
      'completed',
      'completed_at',
      'created_at',
      'modified_at',
      'due_on',
      'due_at',
      'assignee',
      'assignee.name',
      'assignee.email',
      'projects',
      'projects.name',
      'memberships',
      'memberships.project',
      'memberships.project.name',
      'memberships.section',
      'memberships.section.name',
    ];

    try {
      const response = await tasksApi.getTasks({
        workspace: this.workspaceGid,
        project: params.project,
        section: params.section,
        assignee: params.assignee,
        completed_since: params.completed_since,
        modified_since: params.modified_since,
        opt_fields: optFields.join(','),
        limit: 100,
      });

      return response.data as AsanaTask[];
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message || error}`);
    }
  }

  /**
   * Get a specific task by GID
   */
  async getTask(taskGid: string): Promise<AsanaTask> {
    await this.checkRateLimit();

    const tasksApi = new Asana.TasksApi();
    const optFields = [
      'gid',
      'name',
      'notes',
      'completed',
      'completed_at',
      'created_at',
      'modified_at',
      'due_on',
      'due_at',
      'assignee',
      'assignee.name',
      'assignee.email',
      'projects',
      'projects.name',
      'memberships',
      'memberships.project.name',
      'memberships.section.name',
    ];

    try {
      const response = await tasksApi.getTask(taskGid, {
        opt_fields: optFields.join(','),
      });
      return response.data as AsanaTask;
    } catch (error: any) {
      console.error(`Error fetching task ${taskGid}:`, error);
      throw new Error(`Failed to fetch task: ${error.message || error}`);
    }
  }

  /**
   * Get task stories (change history)
   */
  async getTaskStories(taskGid: string): Promise<AsanaStory[]> {
    await this.checkRateLimit();

    const storiesApi = new Asana.StoriesApi();
    const optFields = [
      'gid',
      'created_at',
      'created_by',
      'created_by.name',
      'resource_subtype',
      'text',
      'type',
      'old_due_on',
      'new_due_on',
      'old_due_at',
      'new_due_at',
    ];

    try {
      const response = await storiesApi.getStoriesForTask(taskGid, {
        opt_fields: optFields.join(','),
        limit: 100,
      });
      return response.data as AsanaStory[];
    } catch (error: any) {
      console.error(`Error fetching stories for task ${taskGid}:`, error);
      throw new Error(`Failed to fetch task stories: ${error.message || error}`);
    }
  }

  /**
   * Get project sections
   */
  async getProjectSections(projectGid: string): Promise<AsanaSection[]> {
    await this.checkRateLimit();

    const sectionsApi = new Asana.SectionsApi();
    const optFields = ['gid', 'name', 'project', 'project.name'];

    try {
      const response = await sectionsApi.getSectionsForProject(projectGid, {
        opt_fields: optFields.join(','),
        limit: 100,
      });
      return response.data as AsanaSection[];
    } catch (error: any) {
      console.error(`Error fetching sections for project ${projectGid}:`, error);
      throw new Error(`Failed to fetch project sections: ${error.message || error}`);
    }
  }

  /**
   * Get tasks in a section
   */
  async getSectionTasks(sectionGid: string): Promise<AsanaTask[]> {
    await this.checkRateLimit();

    const tasksApi = new Asana.TasksApi();
    const optFields = [
      'gid',
      'name',
      'completed',
      'completed_at',
      'modified_at',
      'due_on',
      'due_at',
      'assignee',
      'assignee.name',
    ];

    try {
      const response = await tasksApi.getTasksForSection(sectionGid, {
        opt_fields: optFields.join(','),
        limit: 100,
      });
      return response.data as AsanaTask[];
    } catch (error: any) {
      console.error(`Error fetching tasks for section ${sectionGid}:`, error);
      throw new Error(`Failed to fetch section tasks: ${error.message || error}`);
    }
  }

  /**
   * Get workspace users
   */
  async getWorkspaceUsers(): Promise<AsanaUser[]> {
    await this.checkRateLimit();

    const usersApi = new Asana.UsersApi();
    const optFields = ['gid', 'name', 'email'];

    try {
      const response = await usersApi.getUsersForWorkspace(this.workspaceGid, {
        opt_fields: optFields.join(','),
      });
      return response.data as AsanaUser[];
    } catch (error: any) {
      console.error('Error fetching workspace users:', error);
      throw new Error(`Failed to fetch workspace users: ${error.message || error}`);
    }
  }

  /**
   * Get authenticated user
   */
  async getMe(): Promise<AsanaUser> {
    await this.checkRateLimit();

    const usersApi = new Asana.UsersApi();
    const optFields = ['gid', 'name', 'email'];

    try {
      const response = await usersApi.getUser('me', {
        opt_fields: optFields.join(','),
      });
      return response.data as AsanaUser;
    } catch (error: any) {
      console.error('Error fetching current user:', error);
      throw new Error(`Failed to fetch current user: ${error.message || error}`);
    }
  }

  /**
   * Search users by name
   */
  async searchUsers(query: string): Promise<AsanaUser[]> {
    // Since Asana doesn't have a direct search API for users in workspace that is efficient,
    // we fetch all workspace users and filter locally. This is okay for most workspaces.
    // For very large workspaces, we might want to implement a more sophisticated approach or typeahead.
    const allUsers = await this.getWorkspaceUsers();
    const lowerQuery = query.toLowerCase();

    return allUsers.filter(user =>
      user.name.toLowerCase().includes(lowerQuery) ||
      (user.email && user.email.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get workspace projects
   */
  async getWorkspaceProjects(): Promise<AsanaProject[]> {
    await this.checkRateLimit();

    const projectsApi = new Asana.ProjectsApi();
    const optFields = ['gid', 'name'];

    try {
      const response = await projectsApi.getProjects({
        workspace: this.workspaceGid,
        opt_fields: optFields.join(','),
        limit: 100,
      });
      return response.data as AsanaProject[];
    } catch (error: any) {
      console.error('Error fetching workspace projects:', error);
      throw new Error(`Failed to fetch workspace projects: ${error.message || error}`);
    }
  }

  /**
   * Search for a project by name
   */
  async findProjectByName(projectName: string): Promise<AsanaProject | null> {
    const projects = await this.getWorkspaceProjects();
    const project = projects.find(
      p => p.name.toLowerCase() === projectName.toLowerCase()
    );
    return project || null;
  }

  /**
   * Get workspace GID
   */
  getWorkspaceGid(): string {
    return this.workspaceGid;
  }
}
