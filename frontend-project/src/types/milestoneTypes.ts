// Types for Comments and Grades
export interface MilestoneComment {
  id: string;
  groupMilestoneId: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
}

export interface MilestoneGrade {
  id: string;
  groupMilestoneId: string;
  gradedBy: string;
  graderName: string;
  graderRole: string;
  score: number;
  feedback?: string;
  gradedAt: string;
}

export interface GradesResponse {
  allGrades: MilestoneGrade[];
  averagePeerGrade: number | null;
  lecturerGrade: MilestoneGrade | null;
}
