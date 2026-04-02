import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import courseApi from '../../../api/courseApi';
import * as projectApi from '../../../api/projectApi';
import { toast } from 'react-toastify';
import { ArrowLeft, Download, FileText, Users, Calendar } from 'lucide-react';

interface Syllabus {
  id: number;
  subjectId: number;
  title?: string;
  fileName?: string;
  description?: string;
  filePath: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

interface ClassInfo {
  id: number;
  code: string;
  name: string;
  subjectId: number;
  subjectName?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  deadline?: string | null;
  status: number;
  assignedClassIds?: string;
}

interface GroupMember {
  id: string;
  studentCode?: string;
  fullName: string;
  role: string;
}

interface ProjectGroup {
  id: string;
  name: string;
  classId: string;
  projectTemplateId: string;
  maxMembers?: number; // Số lượng thành viên tối đa
  members?: GroupMember[];
}

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    loadClassDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadClassDetail = async () => {
    if (!classId) return;
    
    setLoading(true);
    try {
      // Load syllabuses directly using subjectId from class info
      // Since we don't have getClassById, we'll get syllabuses using subjectId from params or classInfo
      console.log('🔍 Loading class detail for classId:', classId);
      const classResponse = await courseApi.getClasses();
      const allClasses = classResponse.data?.data || classResponse.data || [];
      console.log('📚 All classes:', allClasses);
      const foundClass = allClasses.find((c: ClassInfo) => c.id === Number(classId));
      console.log('✅ Found class:', foundClass);
      
      if (foundClass) {
        setClassInfo(foundClass);
        
        console.log('🔍 FULL foundClass object:', JSON.stringify(foundClass, null, 2));
        console.log('🔍 foundClass.subjectId:', foundClass.subjectId);
        console.log('🔍 Looking for subjectCode in class...');
        
        // Load syllabuses for this class's subject
        if (foundClass.subjectId) {
          console.log('🔍 Loading syllabuses for subjectId:', foundClass.subjectId);
          const syllabusResponse = await courseApi.getSyllabusBySubject(foundClass.subjectId);
          console.log('📖 Syllabus response:', syllabusResponse);
          
          // IMPORTANT: syllabusResponse IS the data array (axios interceptor unwraps it)
          // NOT syllabusResponse.data!
          const syllabusData = Array.isArray(syllabusResponse) 
            ? syllabusResponse 
            : (Array.isArray(syllabusResponse?.data) 
              ? syllabusResponse.data 
              : (syllabusResponse?.data?.data || []));
          
          console.log('📖 Syllabus data (final):', syllabusData);
          setSyllabuses(syllabusData);
        } else {
          console.warn('⚠️ Class does not have subjectId!');
        }
        
        // Load projects assigned to this class
        // Use class CODE and subject CODE (not IDs!) for filtering
        // Check if foundClass has subjectCode property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subjectCode = (foundClass as any).subjectCode || String(foundClass.subjectId);
        console.log('🔍 Using subjectCode for filter:', subjectCode);
        await loadProjectsForClass(foundClass.code, subjectCode);
      } else {
        console.error('❌ Class not found with id:', classId);
      }
    } catch (error) {
      console.error('Error loading class detail:', error);
      toast.error('Lỗi tải thông tin lớp học');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsForClass = async (classCode: string, subjectIdOrCode: string) => {
    try {
      console.log('📋 Loading projects for classCode:', classCode, 'subjectIdOrCode:', subjectIdOrCode);
      const response = await projectApi.getAllProjects();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allProjects = Array.isArray(response) ? response : ((response as any)?.data || []);
      
      console.log('📋 ALL PROJECTS:', allProjects);
      console.log('📋 Total projects count:', allProjects.length);
      
      // Filter projects assigned to this class
      // assignedClassIds contains class CODES (e.g. "CN23A,CN23B")
      const filteredProjects = allProjects.filter((p: Project) => {
        console.log(`\n--- Checking project: ${p.name} ---`);
        console.log('Project ID:', p.id);
        console.log('Project status:', p.status, '(1=Approved)');
        console.log('Project subjectId:', p.subjectId, 'Type:', typeof p.subjectId);
        console.log('Class subjectIdOrCode:', subjectIdOrCode, 'Type:', typeof subjectIdOrCode);
        console.log('assignedClassIds RAW:', p.assignedClassIds, 'Type:', typeof p.assignedClassIds);
        
        const assignedClasses = p.assignedClassIds?.split(',').map(id => id.trim()) || [];
        console.log('assignedClasses after split:', assignedClasses);
        console.log('Target classCode:', classCode, 'Type:', typeof classCode);
        
        // Filter conditions:
        // 1. Class CODE must match
        const classMatch = assignedClasses.includes(classCode);
        
        // 2. Status must be Approved (1)
        const statusMatch = p.status === 1;
        
        // 3. Subject must match (convert both to string for comparison)
        // Projects with empty/null subjectId are REJECTED
        const projectSubject = String(p.subjectId || '').trim();
        const classSubject = String(subjectIdOrCode || '').trim();
        const subjectMatch = projectSubject !== '' && projectSubject === classSubject;
        
        console.log('✅ Class CODE match:', classMatch);
        console.log('✅ Status=Approved:', statusMatch);
        console.log('✅ Subject match:', subjectMatch, `("${projectSubject}" === "${classSubject}")`);
        console.log('🎯 FINAL RESULT:', classMatch && statusMatch && subjectMatch);
        
        return classMatch && statusMatch && subjectMatch;
      });
      
      console.log('📋 Filtered projects:', filteredProjects);
      setProjects(filteredProjects);
      
      // Auto-select first project if available
      if (filteredProjects.length > 0 && !selectedProject) {
        setSelectedProject(filteredProjects[0]);
        await loadGroupsForProject(filteredProjects[0].id, classCode);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadGroupsForProject = async (projectId: string, classCodeFilter: string) => {
    if (!projectId) return;
    
    setLoadingGroups(true);
    try {
      console.log('👥 Loading groups for project:', projectId);
      const response = await projectApi.getGroupsByProject(projectId);
      const allGroups = Array.isArray(response) ? response : (response?.data || []);
      
      // Filter groups by current class CODE
      const filteredGroups = allGroups.filter((g: ProjectGroup) => 
        g.classId === classCodeFilter
      );
      
      console.log('👥 Filtered groups:', filteredGroups);
      setProjectGroups(filteredGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Lỗi tải danh sách nhóm');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleJoinGroup = async (group: ProjectGroup) => {
    try {
      // Get student code from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Không thể xác định người dùng');
        return;
      }
      
      const user = JSON.parse(userStr);
      const studentCode = user.code || user.studentCode;
      
      if (!studentCode) {
        toast.error('Không tìm thấy mã sinh viên');
        return;
      }
      
      // CRITICAL: Check if student is already in ANY group of this project
      console.log('🔍 Checking if student is in any group of this project...');
      console.log('🔍 All project groups:', projectGroups);
      
      const alreadyInAnyGroup = projectGroups.some(g => 
        g.members?.some(m => m.studentCode === studentCode)
      );
      
      if (alreadyInAnyGroup) {
        // Find which group they're in
        const existingGroup = projectGroups.find(g => 
          g.members?.some(m => m.studentCode === studentCode)
        );
        toast.warning(`Bạn đã tham gia nhóm "${existingGroup?.name}" rồi! Một sinh viên chỉ được tham gia 1 nhóm/dự án.`);
        return;
      }
      
      // Check if group is full - use maxMembers from ProjectService
      const maxMembers = group.maxMembers || 5; // Default to 5 if not set
      const currentMembers = group.members?.length || 0;
      
      if (currentMembers >= maxMembers) {
        toast.warning('Nhóm đã đầy!');
        return;
      }
      
      // Determine role: first member = Leader, others = Member
      const role = currentMembers === 0 ? 'Leader' : 'Member';
      
      console.log('✅ Student can join! Adding to group:', group.name, 'with role:', role);
      
      // Join group
      const response = await projectApi.addMemberToGroup(group.id, studentCode, user.fullName || '');
      console.log('✅ API Response:', response);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('✅ Member created with role:', (response?.data as any)?.role || (response as any)?.role);
      
      toast.success(`Đã tham gia nhóm ${group.name} với vai trò ${role === 'Leader' ? 'Trưởng nhóm' : 'Thành viên'}!`);
      
      // Reload groups to show updated members
      if (selectedProject && classInfo?.code) {
        await loadGroupsForProject(selectedProject.id, classInfo.code);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Lỗi tham gia nhóm');
    }
  };

  const handleLeaveGroup = async (group: ProjectGroup) => {
    try {
      // Get student code from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Không thể xác định người dùng');
        return;
      }
      
      const user = JSON.parse(userStr);
      const studentCode = user.code || user.studentCode;
      
      if (!studentCode) {
        toast.error('Không tìm thấy mã sinh viên');
        return;
      }
      
      // Find member ID
      const member = group.members?.find(m => m.studentCode === studentCode);
      
      if (!member) {
        toast.error('Không tìm thấy thông tin thành viên');
        return;
      }
      
      // Confirm before leaving
      if (!window.confirm(`Bạn có chắc muốn rời khỏi nhóm "${group.name}"?`)) {
        return;
      }
      
      console.log('🚪 Leaving group:', group.name, 'memberId:', member.id);
      
      // Remove member from group
      await projectApi.removeMember(member.id);
      
      toast.success(`Đã rời khỏi nhóm ${group.name}!`);
      
      // Reload groups to show updated members
      if (selectedProject && classInfo?.code) {
        await loadGroupsForProject(selectedProject.id, classInfo.code);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Lỗi rời nhóm');
    }
  };

  const handleDownload = async (syllabus: Syllabus) => {
    try {
      const response = await courseApi.downloadSyllabus(syllabus.id);
      
      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = syllabus.fileName || syllabus.title || `Syllabus_${syllabus.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Đang tải xuống...');
    } catch (error) {
      console.error('Error downloading syllabus:', error);
      toast.error('Lỗi tải xuống giáo trình');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 30, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/student/classes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            background: '#f5f5f5',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: '#666'
          }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: '#333' }}>
            {classInfo?.code || 'Lớp học'}
          </h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>
            {classInfo?.subjectName || 'Đang tải...'}
          </p>
        </div>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ fontSize: 20, marginBottom: 20, color: '#333' }}>
          📚 Giáo trình môn học
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <p style={{ fontSize: 16 }}>Đang tải...</p>
          </div>
        ) : syllabuses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
            <p style={{ fontSize: 16 }}>Chưa có giáo trình nào được upload</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {syllabuses.map((syllabus) => (
              <div
                key={syllabus.id}
                style={{
                  padding: 20,
                  background: '#f9fafb',
                  border: '1px solid #e8e8e8',
                  borderRadius: 12,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <FileText size={20} color="#667eea" />
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#333' }}>
                        {syllabus.title || syllabus.fileName || 'Giáo trình'}
                      </h3>
                    </div>
                    
                    {syllabus.description && (
                      <p style={{ fontSize: 14, color: '#666', margin: '8px 0' }}>
                        {syllabus.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#999' }}>
                      {syllabus.uploadedBy && (
                        <span>👤 {syllabus.uploadedBy}</span>
                      )}
                      {syllabus.uploadedAt && (
                        <span>📅 {new Date(syllabus.uploadedAt).toLocaleDateString('vi-VN')}</span>
                      )}
                      {syllabus.fileName && (
                        <span>📎 {syllabus.fileName}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(syllabus)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Download size={16} />
                    Tải xuống
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginTop: 24
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, color: '#333' }}>
            📋 Dự án được phân công
          </h2>

          <div style={{ display: 'grid', gap: 16 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: 20,
                  background: selectedProject?.id === project.id ? '#f0f5ff' : '#f9fafb',
                  border: selectedProject?.id === project.id ? '2px solid #667eea' : '1px solid #e8e8e8',
                  borderRadius: 12,
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedProject(project);
                  if (classInfo?.code) {
                    loadGroupsForProject(project.id, classInfo.code);
                  }
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', color: '#333' }}>
                  {project.name}
                </h3>
                <p style={{ fontSize: 14, color: '#666', margin: '8px 0' }}>
                  {project.description}
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#999' }}>
                  {project.deadline && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={14} />
                      {new Date(project.deadline).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups Section */}
      {selectedProject && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginTop: 24
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, color: '#333' }}>
            👥 Nhóm có thể tham gia - {selectedProject.name}
          </h2>

          {loadingGroups ? (
            <p>Đang tải...</p>
          ) : projectGroups.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Chưa có nhóm nào</p>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {projectGroups.map((group) => {
                const maxMembers = group.maxMembers || 5; // Use from ProjectService, default to 5
                const currentMembers = group.members?.length || 0;
                const isFull = currentMembers >= maxMembers;
                const userCode = JSON.parse(localStorage.getItem('user') || '{}').code;
                const isInGroup = group.members?.some(m => m.studentCode === userCode);

                return (
                  <div
                    key={group.id}
                    style={{
                      padding: 20,
                      background: '#f9fafb',
                      border: '1px solid #e8e8e8',
                      borderRadius: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <Users size={20} color="#667eea" />
                          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#333' }}>
                            {group.name}
                          </h3>
                          <span style={{
                            padding: '4px 8px',
                            background: isFull ? '#ff4d4f' : '#52c41a',
                            color: 'white',
                            borderRadius: 4,
                            fontSize: 11
                          }}>
                            {currentMembers}/{maxMembers}
                          </span>
                        </div>

                        {group.members && group.members.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            {group.members.map((member, idx) => (
                              <div key={idx} style={{
                                padding: '8px 12px',
                                background: '#fff',
                                borderRadius: 6,
                                marginBottom: 6,
                                fontSize: 13,
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}>
                                <span>{member.fullName} ({member.studentCode})</span>
                                {member.role === 'Leader' && (
                                  <span style={{
                                    padding: '2px 8px',
                                    background: '#1890ff',
                                    color: 'white',
                                    borderRadius: 4,
                                    fontSize: 10
                                  }}>
                                    TRƯỞNG NHÓM
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!isInGroup && (
                        <button
                          onClick={() => handleJoinGroup(group)}
                          disabled={isFull}
                          style={{
                            padding: '10px 16px',
                            background: isFull ? '#d9d9d9' : '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            fontSize: 13
                          }}
                        >
                          {isFull ? 'Đã đầy' : 'Tham gia'}
                        </button>
                      )}

                      {isInGroup && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveGroup(group);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 16px',
                            background: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#d32029';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ff4d4f';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          🚪 Rời nhóm
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
