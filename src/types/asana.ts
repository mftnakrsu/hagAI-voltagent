/**
 * Type definitions for Asana API entities
 */

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  modified_at: string;
  due_on?: string;
  due_at?: string;
  assignee?: AsanaUser;
  assignee_status?: 'inbox' | 'later' | 'today' | 'upcoming';
  projects?: AsanaProject[];
  memberships?: AsanaMembership[];
  resource_type: 'task';
}

export interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
  resource_type: 'user';
}

export interface AsanaProject {
  gid: string;
  name: string;
  resource_type: 'project';
}

export interface AsanaSection {
  gid: string;
  name: string;
  project?: {
    gid: string;
    name: string;
  };
  resource_type: 'section';
}

export interface AsanaMembership {
  project: {
    gid: string;
    name: string;
  };
  section?: {
    gid: string;
    name: string;
  };
}

export interface AsanaStory {
  gid: string;
  created_at: string;
  created_by: AsanaUser;
  resource_type: 'story';
  resource_subtype: string;
  text?: string;
  type: 'comment' | 'system';
  old_due_on?: string;
  new_due_on?: string;
  old_due_at?: string;
  new_due_at?: string;
}

export interface AsanaTaskListResponse {
  data: AsanaTask[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  };
}

export interface AsanaStoryListResponse {
  data: AsanaStory[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  };
}

export interface TaskSummary {
  total: number;
  completed: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  unassigned: number;
  noDueDate: number;
}

export interface UserWorkload {
  user: AsanaUser;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
}

export interface ProjectStatus {
  project: AsanaProject;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  sections: SectionStatus[];
}

export interface SectionStatus {
  section: AsanaSection;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface DueDateChange {
  task: AsanaTask;
  changes: Array<{
    date: string;
    oldDueDate?: string;
    newDueDate?: string;
    changedBy: AsanaUser;
  }>;
  changeCount: number;
}
