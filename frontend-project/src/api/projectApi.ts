import { createServiceClient } from './axiosClient';

// In production (Docker), use relative path (nginx proxy)
// In development, use localhost with specific port
const BASE_URL = import.meta.env.MODE === 'production' 
  ? '/api' 
  : 'http://localhost:5234/api';

// Create axios client with automatic JWT token injection
const projectClient = createServiceClient(BASE_URL);

const PROJECT_API_URL = `/ProjectTemplates`;
const GROUP_API_URL = `/ProjectGroups`;
const SUBMISSION_API_URL = `/ProjectSubmissions`;
const TASK_API_URL = `/ProjectTasks`;

export interface MilestoneDto {
  title: string;
  description: string;
  orderIndex: number;
  deadline?: string;
  questions: string[];
}

export interface Milestone {
  id: string;
  name: string;
  title?: string;
  Title?: string; // Backend có thể trả về Title viết hoa
  description: string;
  durationDays?: number;
  deadline?: string;
  orderIndex: number;
}

export interface CreateProjectRequest {
  subjectId: string;
  name: string;
  description: string;
  deadline?: string;
  milestones: MilestoneDto[];
}

export interface GroupMember {
  id: string;
  studentId?: string;     // Có thể từ CourseService
  studentCode?: string;   // Từ ProjectService (StudentCode field)
  fullName: string;
  role: string;
}

export interface ProjectGroup {
  id: string;
  projectTemplateId: string;
  name: string;
  classId: string;
  subjectCode?: string; // Mã môn học
  maxMembers?: number; // Số lượng thành viên tối đa
  members?: GroupMember[];
  ProjectTemplate?: ProjectTemplate;
  projectTemplate?: ProjectTemplate;
}

export interface MilestoneQuestion {
  id: string;
  question: string;
}

export interface ProjectMilestone {
  id: string;
  Title: string;
  title?: string;
  Description: string;
  description?: string;
  OrderIndex: number;
  orderIndex?: number;
  Deadline?: string | null;
  deadline?: string | null;
  Questions?: MilestoneQuestion[];
  questions?: MilestoneQuestion[];
}

export interface ProjectTemplate {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  deadline?: string | null;
  createdAt: string;
  status: number;
  approvedAt?: string | null;
  assignedClassIds?: string;
  Milestones: ProjectMilestone[];
  milestones?: ProjectMilestone[];
}

export interface ProjectData {
  id: string;
  subjectId: string;
  title: string;
  name: string;
  description: string;
  objectives?: string;
  milestones: Milestone[];
}

export interface SubTask {
  id: string;
  content: string;
  isDone: boolean;
}

export interface TaskComment {
  id: string;
  content: string;
  createdByUserId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: number;
  priority: number;
  deadline?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  // Contribution weight
  complexityWeight?: number;  // 1-5: Higher = more complex
  estimatedHours?: number;    // Estimated hours to complete
  subTasks?: SubTask[];
  comments?: TaskComment[];
}

export interface Reflection {
  id: string;
  milestoneId: string;
  studentId: string;
  content: string;
  submittedAt: string;
}

export interface Submission {
  id: string;
  projectGroupId: string;
  projectMilestoneId: string;
  milestoneId?: string;
  submittedAt: string;
  content?: string;
  description?: string;
  grade?: number;
  feedback?: string;
  userCode?: string;
}

export interface PeerEvaluation {
  evaluateeId: string;
  score: number;
  comment: string;
}

// ==================== GROUP APIs ====================
export const getMyGroup = async (studentId: string) => {
  try {
    console.log("getMyGroup called with studentId:", studentId);
    const data = await projectClient.get(`${GROUP_API_URL}/student/${studentId}`);
    console.log("getMyGroup data:", data);
    return data;
  } catch (e) { 
    console.error("getMyGroup exception:", e);
    return null; 
  }
};

export const getGroupsByProject = async (projectId: string) => {
  return await projectClient.get(`${GROUP_API_URL}/project/${projectId}`);
};

export const getGroupsByClass = async (classCode: string) => {
  return await projectClient.get(`${GROUP_API_URL}/class/${classCode}`);
};

export const createGroup = async (projectId: string | null, name: string, classId: string, subjectCode?: string, maxMembers?: number) => {
  return await projectClient.post(GROUP_API_URL, { 
    projectTemplateId: projectId, 
    name, 
    classId,
    subjectCode,
    maxMembers: maxMembers || 5
  });
};

export const addMemberToGroup = async (groupId: string, studentId: string, fullName: string) => {
  return await projectClient.post(`${GROUP_API_URL}/add-member`, { groupId, studentId, fullName });
};

export const removeMember = async (memberId: string) => {
  await projectClient.delete(`${GROUP_API_URL}/members/${memberId}`);
};

export const deleteProjectGroup = async (groupId: string) => {
  return await projectClient.delete(`${GROUP_API_URL}/${groupId}`);
};

export const assignGroupToProject = async (groupId: string, projectId: string) => {
  return await projectClient.put(`${GROUP_API_URL}/${groupId}/assign-project`, { projectTemplateId: projectId });
};

// NEW: Create group with members in single transaction
export interface MemberData {
  userId?: string;    // User ID từ AccountService (Guid)
  studentId: string;  // Mã sinh viên (VD: SV000001)
  fullName: string;
  role?: string;
}

export const createGroupWithMembers = async (
  projectTemplateId: string, 
  name: string, 
  classId: string, 
  members: MemberData[]
) => {
  try {
    return await projectClient.post(`${GROUP_API_URL}/create-with-members`, {
      ProjectTemplateId: projectTemplateId,
      Name: name,
      ClassId: classId,
      Members: members.map(m => ({
        UserId: m.userId || "00000000-0000-0000-0000-000000000000",
        StudentId: m.studentId,
        FullName: m.fullName,
        Role: m.role || "Member"
      }))
    });
  } catch (error: unknown) {
    const err = error as Error & { response?: { data?: { message?: string } } };
    const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
    throw new Error(errorMessage);
  }
};

// ==================== STUDENT APIs ====================
export const getStudentProject = async (): Promise<ProjectData | null> => {
  const studentId = "HE150001";
  const group = await getMyGroup(studentId) as ProjectGroup | null;
  
  if (group && group.projectTemplate && group.projectTemplate.milestones) {
      return {
          id: group.projectTemplate.id,
          subjectId: group.projectTemplate.subjectId,
          title: group.projectTemplate.name,
          name: group.projectTemplate.name,
          description: group.projectTemplate.description,
          objectives: group.projectTemplate.description,
          milestones: group.projectTemplate.milestones.map((m: ProjectMilestone) => ({
              id: m.id,
              name: m.title || m.Title || '',
              title: m.title || m.Title,
              description: m.description || m.Description,
              durationDays: 7,
              deadline: m.deadline || m.Deadline || undefined,
              orderIndex: m.orderIndex || m.OrderIndex || 0
          }))
      };
  }
  return null;
};

export const getStudentTeam = async () => {
  const studentId = "HE150001";
  const group = await getMyGroup(studentId) as ProjectGroup | null;
  if(group && group.members) {
      return {
          team: group,
          members: group.members.map((m: GroupMember) => ({
              userId: m.studentId || m.studentCode || '',
              studentCode: m.studentId || m.studentCode || '',
              fullName: m.fullName,
              role: m.role === "Leader" ? 1 : 0
          }))
      };
  }
  return null;
};

export const getMyProjects = async () => { const p = await getStudentProject(); return p ? [p] : []; };
export const getMyTeam = getStudentTeam;

// ==================== TASK APIs ====================
export const getTasksByGroup = async (groupId: string) => {
  return await projectClient.get(`${TASK_API_URL}/group/${groupId}`);
};

export const getTasks = getTasksByGroup;

export const createTask = async (dataOrGroupId: string | Record<string, unknown>, title?: string) => {
  let payload;
 
  if (typeof dataOrGroupId === 'string' && title) {
     payload = { GroupId: dataOrGroupId, Title: title };
  } else {
     payload = dataOrGroupId;
  }

  console.log("createTask payload:", JSON.stringify(payload));
  
  try {
    return await projectClient.post(TASK_API_URL, payload);
  } catch (error: unknown) {
    console.error("createTask error:", error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId: string, newStatus: number) => {
  await projectClient.put(`${TASK_API_URL}/${taskId}/status`, newStatus);
};

export const deleteTask = async (taskId: string) => {
  await projectClient.delete(`${TASK_API_URL}/${taskId}`);
};

export const addTaskComment = async (taskId: string, content: string, userId: string) => {
  return await projectClient.post(`${TASK_API_URL}/${taskId}/comments`, { content, userId });
};

export const addSubTask = async (taskId: string, content: string) => {
  return await projectClient.post(`${TASK_API_URL}/${taskId}/subtasks`, { content });
};

export const toggleSubTask = async (subId: string) => {
  await projectClient.put(`${TASK_API_URL}/subtasks/${subId}/toggle`, {});
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTaskComments = async (_taskId: string) => { return []; };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const deleteTaskComment = async (_commentId: string) => { };

// ==================== PROJECT TEMPLATE APIs ====================
export const createProject = async (data: CreateProjectRequest) => {
  return await projectClient.post(PROJECT_API_URL, data);
};

export const getAllProjects = async (): Promise<ProjectTemplate[]> => {
  return await projectClient.get(PROJECT_API_URL);
};

export const getProjectById = async (projectId: string): Promise<ProjectTemplate | null> => {
  try {
    return await projectClient.get(`${PROJECT_API_URL}/${projectId}`);
  } catch {
    return null;
  }
};

export const updateProjectStatus = async (id: string, status: number) => {
  await projectClient.put(`${PROJECT_API_URL}/${id}/status`, status);
};

export const assignClassToProject = async (id: string, classId: string) => {
  await projectClient.put(`${PROJECT_API_URL}/${id}/assign`, classId);
};

// ==================== SUBMISSION APIs ====================
export const getSubmissionsByProject = async (projectId: string) => {
  return await projectClient.get(`${SUBMISSION_API_URL}/project/${projectId}`);
};

export const getSubmissions = async (projectId: string, teamId: string) => {
  const data = await projectClient.get(`${SUBMISSION_API_URL}/project/${projectId}/team/${teamId}`) as Submission[];
  return data.map((s: Submission) => ({ ...s, milestoneId: s.projectMilestoneId }));
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
  return await projectClient.put(`${SUBMISSION_API_URL}/${submissionId}/grade`, { grade, feedback });
};

export const submitWork = async (formData: FormData) => {
  // For file uploads, we need to use axios directly with FormData
  return await projectClient.post(`${SUBMISSION_API_URL}/submit-work`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Mock function for lecturer to submit work on behalf of student (testing)
export const mockStudentSubmit = async (groupId: string, milestoneId: string, content: string) => {
  const formData = new FormData();
  formData.append('ProjectId', '00000000-0000-0000-0000-000000000000');
  formData.append('TeamId', groupId);
  formData.append('MilestoneId', milestoneId);
  formData.append('Content', content);
  formData.append('Description', 'Mock submission for testing');
  
  return await submitWork(formData);
};

// Group Milestone Comments & Grading
const MILESTONE_API_URL = `/GroupMilestones`;

export const addMilestoneComment = async (milestoneId: string, content: string, userName: string) => {
  return await projectClient.post(`${MILESTONE_API_URL}/${milestoneId}/comments`, {
    content,
    userName
  });
};

export const getMilestoneComments = async (milestoneId: string) => {
  return await projectClient.get(`${MILESTONE_API_URL}/${milestoneId}/comments`);
};

export const gradeMilestone = async (milestoneId: string, score: number, feedback: string, graderName: string) => {
  return await projectClient.post(`${MILESTONE_API_URL}/${milestoneId}/grade`, {
    score,
    feedback,
    graderName
  });
};

export const getMilestoneGrades = async (milestoneId: string) => {
  return await projectClient.get(`${MILESTONE_API_URL}/${milestoneId}/grades`);
};

export const getMilestonesByProject = async (projectId: string) => {
  return await projectClient.get(`${MILESTONE_API_URL}/project/${projectId}`);
};

// ==================== FINAL GRADE APIs ====================

// Get lecturer ID from JWT token
const getLecturerId = (): string => {
  const token = localStorage.getItem('token');
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.email || payload.name || '';
  } catch {
    return '';
  }
};

export const saveGroupFinalGrade = async (
  groupId: string,
  grade: number,
  feedback: string
) => {
  const response = await projectClient.post(`${GROUP_API_URL}/${groupId}/final-grade`, {
    grade,
    feedback: feedback.trim(),
    lecturerId: getLecturerId()
  });
  // Interceptor already unwraps response.data, so response IS the data
  return response;
};

export const getGroupFinalGrade = async (groupId: string) => {
  try {
    const response = await projectClient.get(`${GROUP_API_URL}/${groupId}/final-grade`);
    // Interceptor already unwraps response.data
    return response;
  } catch (error: unknown) {
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return null; // No grade yet
    }
    throw error;
  }
};
