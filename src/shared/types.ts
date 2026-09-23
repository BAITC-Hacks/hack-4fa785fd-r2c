export type TaskStatus = 'draft' | 'published';
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export interface Task {
  id: string;
  title: string;
  industry: string;
  summary: string;
  context: string;
  need: string;
  users: string;
  data: string;
  constraints: string;
  expectedResult: string;
  successCriteria: string;
  contact: string;
  score: number;
  status: TaskStatus;
  createdAt: string;
}

export interface Submission {
  id: string;
  taskId: string;
  teamName: string;
  idea: string;
  plan: string;
  timeline: string;
  prototypeUrl: string;
  status: SubmissionStatus;
  createdAt: string;
}

export interface AppData {
  tasks: Task[];
  submissions: Submission[];
}
