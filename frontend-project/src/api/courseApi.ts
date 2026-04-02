import { createServiceClient } from './axiosClient';

// In production (Docker), use relative path (nginx proxy)
// In development, use localhost with specific port
const baseURL = import.meta.env.MODE === 'production' 
  ? '/api' 
  : (import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:5021/api');

const client = createServiceClient(baseURL);

interface CreateSubjectDto {
  code: string;
  name: string;
  credits: number;
}

interface CreateClassDto {
  code: string;
  subjectId: number;
  semester: string;
  year: number;
  lecturerEmail?: string;
}

// Course Service APIs
export const courseApi = {
  // Subjects
  getSubjects: () => client.get('/subjects'),
  createSubject: (data: CreateSubjectDto) => client.post('/subjects', data),
  deleteSubject: (id: number) => client.delete(`/subjects/${id}`),
  importSubjects: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/subjects/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Syllabus
  getSyllabusBySubject: (subjectId: number) => 
    client.get(`/syllabuses`, { params: { subjectId } }),
  uploadSyllabus: (subjectId: number, file: File) => {
    const formData = new FormData();
    formData.append('subjectId', subjectId.toString());
    formData.append('file', file);
    return client.post('/syllabuses/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteSyllabus: (id: number) => client.delete(`/syllabuses/${id}`),
  downloadSyllabus: (id: number) => 
    client.get(`/syllabuses/${id}/download`, { responseType: 'blob' }),
  
  // Classes
  // Lấy tất cả lớp học
  getClasses: () => client.get('/classes'),
  
  // NEW: Lấy lớp theo giảng viên (optimize)
  getClassesByLecturer: (email: string) => 
    client.get(`/classes/lecturer/${email}`),
  
  // NEW: Lấy lớp theo sinh viên (optimize)
  getClassesByStudent: (studentId: string) => 
    client.get(`/classes/student/${studentId}`),
  
  createClass: (data: CreateClassDto) => client.post('/classes', data),
  deleteClass: (id: number) => client.delete(`/classes/${id}`),
  importClasses: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/classes/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  assignLecturer: (classId: number, email: string) => 
    client.post(`/classes/${classId}/assign-lecturer`, { email }),
  getLecturers: () => client.get('/classes/lecturers'),
  
  // Class Members
  getClassMembers: (classId: number) => client.get(`/classes/${classId}/members`),
  addMember: (classId: number, studentCode: string) => 
    client.post(`/classes/${classId}/members`, { studentCode }),
  removeMember: (classId: number, memberId: number) => 
    client.delete(`/classes/${classId}/members/${memberId}`),
  importMembers: (classId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/classes/${classId}/members/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Resources
  getClassResources: (classId: number) => client.get(`/classes/${classId}/resources`),
  uploadResource: (classId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/classes/${classId}/resources`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteResource: (resourceId: number) => client.delete(`/classes/resources/${resourceId}`),
  
  // ==================== GROUPS ====================
  // Lấy danh sách nhóm theo lớp
  getGroupsByClass: (classId: number) => 
    client.get('/groups', { params: { classId } }),
  
  // Lấy chi tiết nhóm
  getGroupById: (id: number) => client.get(`/groups/${id}`),
  
  // Tạo nhóm mới (Lecturer) - với maxMembers
  createGroup: (data: { name: string; description?: string; classId: number; maxMembers?: number }) => 
    client.post('/groups', data),
  
  // Cập nhật nhóm (Lecturer)
  updateGroup: (id: number, data: { name: string; description?: string; classId: number; maxMembers?: number }) => 
    client.put(`/groups/${id}`, data),
  
  // Xóa nhóm (Lecturer)
  deleteGroup: (id: number) => client.delete(`/groups/${id}`),
  
  // Lấy danh sách thành viên trong nhóm
  getGroupMembers: (groupId: number) => 
    client.get(`/groups/${groupId}/members`),
  
  // Thêm thành viên vào nhóm (Lecturer)
  addGroupMember: (groupId: number, userId: string, role?: string) => 
    client.post(`/groups/${groupId}/members`, { userId, role: role || 'Member' }),
  
  // Xóa thành viên khỏi nhóm (Lecturer)
  removeGroupMember: (groupId: number, memberId: number) => 
    client.delete(`/groups/${groupId}/members/${memberId}`),

  // Sinh viên tự tham gia nhóm
  joinGroup: (groupId: number, studentCode: string) =>
    client.post(`/groups/${groupId}/join`, { studentCode }),
};

export default courseApi;
