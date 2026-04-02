import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAllProjects, getSubmissionsByProject, gradeSubmission, getGroupsByProject, getMilestonesByProject, getMilestoneComments, getMilestoneGrades, gradeMilestone, addMilestoneComment, saveGroupFinalGrade, getGroupFinalGrade, type ProjectTemplate } from "../../../api/projectApi";
import courseApi from "../../../api/courseApi";
import { getToken } from "../../../utils/authStorage";
import { ChevronRight, FileText, MessageSquare, Star, Check, X, ArrowLeft, Award, Clock, CheckCircle, Download, Link as LinkIcon } from "lucide-react";
import { toast } from 'react-toastify';
import styles from './GradeProject.module.css';

interface ClassInfo {
  id: number;
  name: string;
  code: string;
  subjectName?: string; // Course name (e.g., "Lập Trình Java")
}

interface GroupInfo {
  id: string;
  name: string;
  classId: string;
  className?: string;
}

interface FormattedSubmission {
  id: string;
  studentName: string;
  groupName: string;
  groupId: string;
  classId: string;
  className: string;
  mssv: string;
  milestone: string;
  submittedAt: string;
  file: string;
  studentNote: string;
  status: string;
  grade: number | null;
  feedback: string;
}

export default function GradeProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [submissions, setSubmissions] = useState<FormattedSubmission[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectTemplate | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<FormattedSubmission | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'submissions' | 'milestones'>('submissions');
  
  // Submissions hierarchy state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [classGroups, setClassGroups] = useState<GroupInfo[]>([]);
  const [allProjectGroups, setAllProjectGroups] = useState<GroupInfo[]>([]); // Cache all groups from project
  
  // Milestones state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [milestones, setMilestones] = useState<any[]>([]);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [milestoneComments, setMilestoneComments] = useState<Record<string, any[]>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [milestoneGrades, setMilestoneGrades] = useState<Record<string, any>>({});
  
  // Milestones hierarchy state (separate from submissions tab)
  const [selectedMilestoneClassId, setSelectedMilestoneClassId] = useState<string | null>(null);
  const [selectedMilestoneGroupId, setSelectedMilestoneGroupId] = useState<string | null>(null);
  const [milestoneClassGroups, setMilestoneClassGroups] = useState<GroupInfo[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMilestoneGroupMembers, setSelectedMilestoneGroupMembers] = useState<any[]>([]);
  
  // Grading/commenting state
  const [gradingMilestone, setGradingMilestone] = useState<string | null>(null);
  const [commentingMilestone, setCommentingMilestone] = useState<string | null>(null);
  const [lecturerGradeScore, setLecturerGradeScore] = useState<string>("");
  const [lecturerGradeFeedback, setLecturerGradeFeedback] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  
  // Group final grading state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groupFinalGrades, setGroupFinalGrades] = useState<Record<string, any>>({});
  const [editingFinalGrade, setEditingFinalGrade] = useState<string | null>(null);
  const [finalGradeInput, setFinalGradeInput] = useState("");
  const [finalGradeFeedback, setFinalGradeFeedback] = useState("");



  // Filter states
  const [myClasses, setMyClasses] = useState<ClassInfo[]>([]);
  
  // Subject mapping state
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});

  // Load lecturer's classes and subjects
  useEffect(() => {
    const loadMyClasses = async () => {
      try {
        const token = getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const email = payload.email || payload.sub || '';
          const response = await courseApi.getClassesByLecturer(email);
          const classList = response.data?.data || response.data || [];
          setMyClasses(classList);
        }
      } catch (error) {
        console.error('Error loading classes:', error);
      }
    };
    
    const loadSubjects = async () => {
      try {
        const response = await courseApi.getSubjects();
        const subjects = response.data?.data || response.data || [];
        // Create mapping: code -> name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapping: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subjects.forEach((s: any) => {
          mapping[s.code] = s.name;
        });
        setSubjectMap(mapping);
      } catch (error) {
        console.error('Error loading subjects:', error);
      }
    };
    
    loadMyClasses();
    loadSubjects();
  }, []);

  const loadSubmissions = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // Load groups for this project
      const groups = await getGroupsByProject(id);
      const groupsMap = new Map<string, GroupInfo>();
      
      // Map classId (class code) to className
      const classMap = new Map<string, string>();
      myClasses.forEach(c => classMap.set(c.code, c.name));
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Array.isArray(groups) ? groups : []).forEach((g: any) => {
        groupsMap.set(g.id, {
          id: g.id,
          name: g.name,
          classId: g.classId || '',
          className: classMap.get(g.classId) || g.classId || 'Chưa xác định'
        });
      });
      
      // Store all groups for later use
      setAllProjectGroups(Array.from(groupsMap.values()));
      
      const data = await getSubmissionsByProject(id);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedSubmissions = (Array.isArray(data) ? data : []).map((sub: any) => {
        const groupId = sub.group?.id || sub.projectGroupId || '';
        const groupInfo = groupsMap.get(groupId);
        
        return {
          id: sub.id,
          studentName: sub.group?.members?.[0]?.fullName || sub.group?.name || "Nhóm chưa đặt tên",
          groupName: sub.group?.name || groupInfo?.name || "Nhóm chưa đặt tên",
          groupId: groupId,
          classId: sub.group?.classId || groupInfo?.classId || '',
          className: groupInfo?.className || sub.group?.classId || 'Chưa xác định',
          mssv: sub.group?.members?.[0]?.studentId || "N/A",
          milestone: sub.projectMilestone?.title || "Chưa xác định",
          submittedAt: new Date(sub.submittedAt).toLocaleString('vi-VN'),
          file: sub.content || "Chưa có file",
          studentNote: sub.description || "Không có ghi chú",
          status: sub.grade !== null && sub.grade !== undefined ? "Graded" : "Pending",
          grade: sub.grade,
          feedback: sub.feedback || ""
        };
      });
      
      setSubmissions(formattedSubmissions);
    } catch {
      toast.error("Lỗi tải bài nộp");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [myClasses]);

  // Load milestones for a project
  const loadMilestones = useCallback(async (projectTemplateId: string) => {
    try {
      console.log('📋 Loading milestones for project:', projectTemplateId);
      const data = await getMilestonesByProject(projectTemplateId);
      console.log('📊 Milestones received from API:', data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('📊 Milestone IDs:', Array.isArray(data) ? data.map((m: any) => ({ id: m.id, title: m.title })) : 'Not an array');
      setMilestones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading milestones:', error);
      setMilestones([]);
    }
  }, []);

  // Load grades and comments for a milestone
  const loadMilestoneDetails = async (milestoneId: string) => {
    try {
      const [gradesData, commentsData] = await Promise.all([
        getMilestoneGrades(milestoneId),
        getMilestoneComments(milestoneId)
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gradesObj = (gradesData as any).data || gradesData;
      setMilestoneGrades(prev => ({ ...prev, [milestoneId]: gradesObj }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commentsObj = (commentsData as any).data || commentsData;
      setMilestoneComments(prev => ({ ...prev, [milestoneId]: commentsObj }));
    } catch (error) {
      console.error('Error loading milestone details:', error);
    }
  };





  // Submit lecturer grade
  const handleSubmitGrade = async () => {
    if (!gradingMilestone || !lecturerGradeScore.trim()) {
      toast.error("Vui lòng nhập điểm!");
      return;
    }

    const scoreNum = parseFloat(lecturerGradeScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      toast.error("Điểm phải từ 0-10!");
      return;
    }

    try {
      const token = getToken();
      const lecturer = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const lecturerName = lecturer?.name || "Lecturer";
      
      await gradeMilestone(
        gradingMilestone,
        scoreNum,
        lecturerGradeFeedback,
        lecturerName
      );
      toast.success("✅ Chấm điểm thành công!");
      setGradingMilestone(null);
      setLecturerGradeScore("");
      setLecturerGradeFeedback("");
      // Reload details
      await loadMilestoneDetails(gradingMilestone);
    } catch (error) {
      console.error('Error grading milestone:', error);
      toast.error("Lỗi khi chấm điểm!");
    }
  };

  // Submit comment
  const handleSubmitComment = async () => {
    if (!commentingMilestone || !newComment.trim()) {
      toast.error("Vui lòng nhập bình luận!");
      return;
    }

    try {
      const token = getToken();
      const lecturer = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const lecturerName = lecturer?.name || "Lecturer";
      
      await addMilestoneComment(commentingMilestone, newComment, lecturerName);
      toast.success("✅ Thêm bình luận thành công!");
      setCommentingMilestone(null);
      setNewComment("");
      // Reload details
      await loadMilestoneDetails(commentingMilestone);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error("Lỗi khi thêm bình luận!");
    }
  };

  // Calculate milestone completion progress for a group
  const calculateGroupProgress = (groupId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupMilestones = milestones.filter((m: any) => m.groupId === groupId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedCount = groupMilestones.filter((m: any) => m.isCompleted).length;
    const total = groupMilestones.length;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    
    return { completed: completedCount, total, percentage };
  };

  // Get member name by ID for milestone tab
  const getMemberNameForMilestone = (studentId?: string) => {
    if (!studentId) return "Chưa xác định";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = selectedMilestoneGroupMembers.find((m: any) => 
      m.studentCode === studentId || 
      m.StudentCode === studentId || 
      m.studentId === studentId || 
      m.StudentId === studentId
    );
    return member ? (member.fullName || member.FullName || studentId) : studentId;
  };

  // Submit final grade for group
  const handleSubmitFinalGrade = async (groupId: string) => {
    const gradeValue = parseFloat(finalGradeInput);
    
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 10) {
      toast.error("Điểm phải từ 0-10!");
      return;
    }
    
    try {
      const response = await saveGroupFinalGrade(
        groupId,
        gradeValue,
        finalGradeFeedback.trim()
      );
      
      console.log('Saved final grade response:', response);
      console.log('Updating state for groupId:', groupId);
      
      setGroupFinalGrades(prev => {
        const updated = {
          ...prev,
          [groupId]: response
        };
        console.log('Updated groupFinalGrades:', updated);
        return updated;
      });
      
      setEditingFinalGrade(null);
      setFinalGradeInput("");
      setFinalGradeFeedback("");
      
      console.log('Final grade saved successfully, state should update');
      toast.success("✅ Đã lưu điểm cuối!");
    } catch (error) {
      console.error('Error saving final grade:', error);
      toast.error("Lỗi khi lưu điểm!");
    }
  };

  const loadData = useCallback(async () => {
    try {
      const allProjects = await getAllProjects();
      const activeProjects = allProjects.filter(p => p.status === 1);
      setProjects(activeProjects);

      if (projectId) {
        const current = activeProjects.find(p => p.id === projectId);
        if (current) {
          setSelectedProject(current);
          await loadSubmissions(projectId);
          await loadMilestones(projectId);
        }
      } else {
        setSelectedProject(null);
      }
    } catch {
      toast.error("Lỗi tải dữ liệu");
    }
  }, [projectId, loadSubmissions, loadMilestones]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load final grade when a group is selected
  useEffect(() => {
    const loadFinalGrade = async (groupId: string) => {
      try {
        const grade = await getGroupFinalGrade(groupId);
        if (grade) {
          setGroupFinalGrades(prev => ({
            ...prev,
            [groupId]: grade
          }));
        }
      } catch (error) {
        console.error('Error loading final grade:', error);
      }
    };
    
    if (selectedGroupId && !groupFinalGrades[selectedGroupId]) {
      loadFinalGrade(selectedGroupId);
    }
  }, [selectedGroupId, groupFinalGrades]);

  const handleSelectProject = (id: string) => {
    navigate(`/lecturer/projects/grade/${id}`);
  };

  // Load groups when a class is selected
  const loadClassGroups = async (classId: string) => {
    if (!selectedProject) return;
    
    try {
      // selectedProject is an object, need to use .id
      const allGroups = await getGroupsByProject(selectedProject.id);
      // Filter groups by classId - extract data if it's Axios response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupsArray = (allGroups as any).data || allGroups;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = groupsArray.filter((g: any) => g.classId === classId);
      setClassGroups(filtered);
    } catch (error) {
      console.error('Error loading class groups:', error);
      setClassGroups([]);
    }
  };

  const submitGrade = async () => {
    if (!gradingSubmission || !score.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    
    const scoreNum = Number(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      toast.error("Điểm phải từ 0-10!");
      return;
    }
    
    try {
      await gradeSubmission(gradingSubmission.id, parseFloat(score), feedback);
      toast.success("✅ Chấm điểm thành công!");
      
      if (projectId) {
        await loadSubmissions(projectId);
      }
      
      setGradingSubmission(null);
      setScore("");
      setFeedback("");
    } catch {
      toast.error("Không thể lưu điểm. Vui lòng thử lại.");
    }
  };


  // Stats
  const stats = {
    total: submissions.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graded: submissions.filter((s: any) => s.status === "Graded").length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending: submissions.filter((s: any) => s.status === "Pending").length,
  };

  // --- CASE 1: No project selected - Show project cards ---
  if (!projectId) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Chấm điểm Dự án</h1>
          <p className={styles.subtitle}>Chọn dự án để xem và chấm điểm bài nộp</p>
        </div>

        {projects.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>📋</div>
            <p>Chưa có dự án nào đang hoạt động</p>
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {projects.map((p) => (
              <div 
                key={p.id} 
                onClick={() => handleSelectProject(p.id)}
                className={styles.projectCard}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.badge}>
                    <CheckCircle size={12} /> Đang chạy
                  </span>
                  <span className={styles.subjectId}>{p.subjectId}</span>
                </div>
                
                <h3 className={styles.projectTitle}>{p.name}</h3>
                <p className={styles.projectDesc}>
                  {p.description || "Chưa có mô tả"}
                </p>
                
                <div className={styles.cardFooter}>
                  <span className={styles.milestoneCount}>
                    {p.milestones?.length || 0} milestones
                  </span>
                  <div className={styles.viewLink}>
                    Xem bài nộp <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- CASE 2: Project selected - Show submissions ---
  return (
    <div className={styles.mainLayout}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <button 
          onClick={() => navigate("/lecturer/projects/grade")} 
          className={styles.backButton} 
        >
          <ArrowLeft size={16} /> Chọn dự án khác
        </button>
        
        <h3 className={styles.sidebarTitle}>Dự án đang chạy</h3>
        
        <div className={styles.projectList}>
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleSelectProject(p.id)}
              className={`${styles.sidebarProject} ${p.id === projectId ? styles.active : ''}`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header with stats */}
        {selectedProject && (
          <div className={styles.statsCard}>
            <h2 className={styles.statsTitle}>{selectedProject.name}</h2>
            <p className={styles.statsSubtitle}>{selectedProject.description}</p>
            
            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.total}`}>
                <FileText size={20} color="#1890ff" />
                <div>
                  <div className={`${styles.statNum} ${styles.total}`}>{stats.total}</div>
                  <div className={styles.statLabel}>Tổng bài nộp</div>
                </div>
              </div>
              <div className={`${styles.statItem} ${styles.graded}`}>
                <CheckCircle size={20} color="#52c41a" />
                <div>
                  <div className={`${styles.statNum} ${styles.graded}`}>{stats.graded}</div>
                  <div className={styles.statLabel}>Đã chấm</div>
                </div>
              </div>
              <div className={`${styles.statItem} ${styles.pending}`}>
                <Clock size={20} color="#faad14" />
                <div>
                  <div className={`${styles.statNum} ${styles.pending}`}>{stats.pending}</div>
                  <div className={styles.statLabel}>Chờ chấm</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List */}
        <div className={styles.contentCard}>
          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            <div className={styles.tabButtons}>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`${styles.tabButton} ${activeTab === 'submissions' ? styles.active : ''}`}
              >
                📤 Danh sách bài nộp
              </button>
              <button
                onClick={() => setActiveTab('milestones')}
                className={`${styles.tabButton} ${activeTab === 'milestones' ? styles.active : ''}`}
              >
                🎯 Mốc kiểm tra nhóm
              </button>
            </div>
          </div>

          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
          <>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              {!selectedClassId ? "📚 Danh sách bài nộp" : !selectedGroupId ? `👥 Nhóm trong lớp` : `📝 Bài nộp của nhóm`}
            </h3>
          </div>
          
          {loading ? (
            <div className={styles.loading}>Đang tải...</div>
          ) : !selectedClassId ? (
            /* Level 1: Show list of classes */
            <div>
              {myClasses.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Không có lớp nào</div>
              ) : (() => {
                // Get all unique classes that have groups in this project
                // Use cached allProjectGroups instead of loading again
                
                // Get unique class codes from groups
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const uniqueClassCodes = [...new Set(allProjectGroups.map((g: any) => g.classId))];
                
                // Deduplicate myClasses by code (in case there are duplicate records in database)
                const uniqueMyClasses = myClasses.reduce((acc, cls) => {
                  if (!acc.find(c => c.code === cls.code)) {
                    acc.push(cls);
                  }
                  return acc;
                }, [] as ClassInfo[]);
                
                // Filter to only those that have groups
                const classesInProject = uniqueMyClasses.filter(cls => 
                  uniqueClassCodes.includes(cls.code) || uniqueClassCodes.includes(cls.name)
                );
                
                if (classesInProject.length === 0) {
                  return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Chưa có nhóm nào trong dự án này</div>;
                }
                
                return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {classesInProject.map((cls) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const classSubmissions = submissions.filter((s: any) => s.classId === cls.code || s.classId === cls.name);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const gradedCount = classSubmissions.filter((s: any) => s.status === "Graded").length;
                    
                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.code);
                          loadClassGroups(cls.code);
                        }}
                        className={styles.classCard}
                      >
                        <div className={styles.className}>
                          {cls.code}
                        </div>
                        <div className={styles.classSubject}>
                          {selectedProject?.subjectId ? 
                            (subjectMap[selectedProject.subjectId] || selectedProject.subjectId) : 
                            'Chưa xác định môn'}
                        </div>
                        <div className={styles.classStats}>📄 {classSubmissions.length} bài nộp</div>
                        <div className={`${styles.classStats} ${styles.graded}`}>✅ {gradedCount} đã chấm</div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          ) : !selectedGroupId ? (
            /* Level 2: Show groups */
            <div>
              <button
                onClick={() => { setSelectedClassId(null); setClassGroups([]); }}
                className={styles.backButton}
              >← Quay lại</button>
              
              {classGroups.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Chưa có nhóm</div>
              ) : (
                <div className={styles.groupGrid}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {classGroups.map((group: any) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const groupSubs = submissions.filter((s: any) => s.groupId === group.id);
                    return (
                      <div key={group.id} onClick={() => setSelectedGroupId(group.id)}
                        style={{ background: "white", border: "2px solid #f0f0f0", borderLeft: "4px solid #667eea", borderRadius: 12, padding: 20, cursor: "pointer" }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{group.name}</div>
                        <div style={{ fontSize: 14, color: "#666" }}>📄 {groupSubs.length} bài nộp</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Level 3: Show submissions */
            <div>
              <button onClick={() => setSelectedGroupId(null)}
                style={{ background: "#f0f0f0", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 16 }}
              >← Quay lại nhóm</button>
              
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {submissions.filter((s: any) => s.groupId === selectedGroupId).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}><div style={{ fontSize: 48 }}>📭</div><p>Chưa có bài nộp</p></div>
              ) : (
                <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {submissions.filter((s: any) => s.groupId === selectedGroupId).map((sub: any) => (
                    <div key={sub.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 20, background: sub.status === "Graded" ? "#fafff5" : "white", borderLeft: sub.status === "Graded" ? "4px solid #52c41a" : "4px solid #faad14" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: 16, flex: 1 }}>
                          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 18 }}>
                            {sub.studentName.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>{sub.groupName}</div>
                            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>👤 {sub.studentName} ({sub.mssv})</div>
                            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 13, color: "#888" }}>
                              <span><Star size={14} color="#faad14" /> {sub.milestone}</span>
                              <span><Clock size={14} /> {sub.submittedAt}</span>
                            </div>
                            <div style={{ marginTop: 12, background: "#f9fafb", padding: 12, borderRadius: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4 }}><MessageSquare size={12} /> Ghi chú:</div>
                              <p style={{ margin: 0, fontSize: 13, fontStyle: "italic" }}>"{sub.studentNote}"</p>
                            </div>
                            <div style={{ marginTop: 10 }}>
                              {sub.file?.includes("/uploads/") ? (
                                <a href={`http://localhost:5234${sub.file}`} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 6, textDecoration: "none" }}>
                                  <Download size={14} color="#667eea" />
                                  <span style={{ fontSize: 13, color: "#667eea" }}>{sub.file?.split('/').pop()?.split('_').slice(1).join('_') || sub.file}</span>
                                </a>
                              ) : (
                                <a href={sub.file} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 6 }}><FileText size={14} color="#667eea" /><span style={{ fontSize: 13, color: "#667eea" }}>{sub.file}</span></a>
                              )}
                            </div>
                            {sub.status === "Graded" && sub.feedback && (
                              <div style={{ marginTop: 10, padding: 10, background: "#f6ffed", borderRadius: 6, border: "1px solid #b7eb8f" }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#52c41a" }}>Nhận xét:</div>
                                <p style={{ margin: 0, fontSize: 13 }}>{sub.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "center", minWidth: 100 }}>
                          {sub.status === "Graded" ? (
                            <>
                              <div style={{ fontSize: 28, fontWeight: 700, color: "#52c41a" }}><Award size={24} /> {sub.grade}</div>
                              <div style={{ fontSize: 12, color: "#52c41a" }}>điểm</div>
                              <button onClick={() => { setGradingSubmission(sub); setScore(String(sub.grade ?? '')); setFeedback(sub.feedback); }} style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #d9d9d9", borderRadius: 6, cursor: "pointer" }}>Sửa điểm</button>
                            </>
                          ) : (
                            <button onClick={() => { setGradingSubmission(sub); setScore(""); setFeedback(""); }} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}><Award size={16} /> Chấm điểm</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Group Summary Section */}
                {selectedGroupId && (() => {
                  const progress = calculateGroupProgress(selectedGroupId);
                  const finalGrade = groupFinalGrades[selectedGroupId];
                  
                  return (
                    <div style={{ marginTop: 24, padding: 24, background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", borderRadius: 12, border: "2px solid #667eea" }}>
                      <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, color: "#333" }}>📊 Tổng quan nhóm</h3>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                        {/* Milestone Progress */}
                        <div style={{ background: "white", padding: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#666", marginBottom: 12 }}>🎯 Tiến độ hoàn thành</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                            <div style={{ fontSize: 32, fontWeight: 700, color: progress.percentage === 100 ? "#52c41a" : progress.percentage >= 70 ? "#1890ff" : progress.percentage >= 30 ? "#faad14" : "#ff4d4f" }}>
                              {progress.percentage}%
                            </div>
                            <div style={{ fontSize: 13, color: "#888" }}>
                              {progress.completed}/{progress.total} mốc
                            </div>
                          </div>
                          <div style={{ width: "100%", height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ 
                              width: `${progress.percentage}%`, 
                              height: "100%", 
                              background: progress.percentage === 100 ? "#52c41a" : progress.percentage >= 70 ? "#1890ff" : progress.percentage >= 30 ? "#faad14" : "#ff4d4f",
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>
                        
                        {/* Final Grade */}
                        <div style={{ background: "white", padding: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#666", marginBottom: 12 }}>⭐ Điểm cuối dự án</div>
                          {editingFinalGrade === selectedGroupId ? (
                            <div>
                              <input 
                                type="number" 
                                min="0" 
                                max="10" 
                                step="0.1"
                                value={finalGradeInput}
                                onChange={(e) => setFinalGradeInput(e.target.value)}
                                placeholder="Nhập điểm (0-10)"
                                style={{ width: "100%", padding: 10, border: "2px solid #667eea", borderRadius: 6, fontSize: 14, marginBottom: 8 }}
                              />
                              <textarea
                                value={finalGradeFeedback}
                                onChange={(e) => setFinalGradeFeedback(e.target.value)}
                                placeholder="Nhập đánh giá, nhận xét về nhóm..."
                                rows={3}
                                style={{ width: "100%", padding: 10, border: "2px solid #667eea", borderRadius: 6, fontSize: 14, marginBottom: 8, fontFamily: "inherit", resize: "vertical" }}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button 
                                  onClick={() => handleSubmitFinalGrade(selectedGroupId)}
                                  style={{ flex: 1, padding: "8px 16px", background: "#52c41a", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                                >
                                  💾 Lưu
                                </button>
                                <button 
                                  onClick={() => { setEditingFinalGrade(null); setFinalGradeInput(""); setFinalGradeFeedback(""); }}
                                  style={{ flex: 1, padding: "8px 16px", background: "#f0f0f0", color: "#666", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : finalGrade ? (
                            <div>
                              <div style={{ fontSize: 36, fontWeight: 700, color: "#fa8c16", marginBottom: 8 }}>
                                {finalGrade.grade}/10
                              </div>
                              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                                Đã chấm: {new Date(finalGrade.gradedAt).toLocaleDateString('vi-VN')}
                              </div>
                              {finalGrade.feedback && (
                                <div style={{ marginTop: 12, padding: 12, background: "#f6ffed", borderRadius: 6, border: "1px solid #b7eb8f" }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#52c41a", marginBottom: 4 }}>📝 Đánh giá:</div>
                                  <p style={{ margin: 0, fontSize: 13, color: "#333", whiteSpace: "pre-wrap" }}>{finalGrade.feedback}</p>
                                </div>
                              )}
                              <button 
                                onClick={() => { setEditingFinalGrade(selectedGroupId); setFinalGradeInput(String(finalGrade.grade)); setFinalGradeFeedback(finalGrade.feedback || ""); }}
                                style={{ padding: "6px 12px", background: "#f0f0f0", color: "#666", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                              >
                                ✏️ Sửa điểm
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 16, color: "#999", marginBottom: 12 }}>Chưa chấm điểm</div>
                              <button 
                                onClick={() => { setEditingFinalGrade(selectedGroupId); setFinalGradeInput(""); setFinalGradeFeedback(""); }}
                                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                              >
                                ✏️ Chấm điểm
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </>
              )}
            </div>
          )}
          </>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <>
            {/* Level 1: Select Class */}
            {!selectedMilestoneClassId ? (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#333" }}>📚 Chọn lớp để xem mốc kiểm tra</h3>
              {myClasses.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Không có lớp nào</div>
              ) : (() => {
                // Get unique classes from project groups
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const uniqueClassCodes = [...new Set(allProjectGroups.map((g: any) => g.classId))];
                const uniqueMyClasses = myClasses.reduce((acc, cls) => {
                  if (!acc.find(c => c.code === cls.code)) acc.push(cls);
                  return acc;
                }, [] as ClassInfo[]);
                const classesInProject = uniqueMyClasses.filter(cls => 
                  uniqueClassCodes.includes(cls.code) || uniqueClassCodes.includes(cls.name)
                );
                
                if (classesInProject.length === 0) {
                  return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Chưa có nhóm nào trong dự án này</div>;
                }
                
                return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {classesInProject.map((cls) => {
                    // Count groups in this class
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const classGroupCount = allProjectGroups.filter((g: any) => g.classId === cls.code).length;
                    // Count milestones for groups in this class
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const classMilestones = milestones.filter((m: any) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const groupsInClass = allProjectGroups.filter((g: any) => g.classId === cls.code);
                      return groupsInClass.some(g => g.id === m.groupId);
                    });
                    
                    return (
                      <div
                        key={cls.id}
                        onClick={async () => {
                          setSelectedMilestoneClassId(cls.code);
                          // Load groups for this class
                          if (selectedProject) {
                            try {
                              const allGroups = await getGroupsByProject(selectedProject.id);
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const groupsArray = (allGroups as any).data || allGroups;
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const filtered = groupsArray.filter((g: any) => g.classId === cls.code);
                              setMilestoneClassGroups(filtered);
                            } catch (error) {
                              console.error('Error loading groups:', error);
                              setMilestoneClassGroups([]);
                            }
                          }
                        }}
                        style={{
                          background: "white",
                          border: "2px solid #f0f0f0",
                          borderLeft: "4px solid #667eea",
                          borderRadius: 12,
                          padding: 24,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.transform = "translateY(-4px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#f0f0f0";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div style={{ fontSize: 17, fontWeight: 600, color: "#333", marginBottom: 4 }}>
                          {cls.code}
                        </div>
                        <div style={{ fontSize: 14, color: "#666", marginBottom: 10 }}>
                          {selectedProject?.subjectId ? 
                            (subjectMap[selectedProject.subjectId] || selectedProject.subjectId) : 
                            'Chưa xác định môn'}
                        </div>
                        <div style={{ fontSize: 14, color: "#666" }}>👥 {classGroupCount} nhóm</div>
                        <div style={{ fontSize: 14, color: "#667eea" }}>🎯 {classMilestones.length} mốc kiểm tra</div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
            ) : !selectedMilestoneGroupId ? (
            /* Level 2: Select Group */
            <div>
              <button onClick={() => { setSelectedMilestoneClassId(null); setMilestoneClassGroups([]); }}
                style={{ background: "#f0f0f0", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 16 }}
              >← Quay lại danh sách lớp</button>
              
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#333" }}>
                👥 Nhóm trong lớp {selectedMilestoneClassId}
              </h3>
              
              {milestoneClassGroups.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Chưa có nhóm</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {milestoneClassGroups.map((group: any) => {
                    // Count milestones for this group
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const groupMilestones = milestones.filter((m: any) => m.groupId === group.id);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const completedMilestones = groupMilestones.filter((m: any) => m.isCompleted).length;
                    
                    return (
                      <div key={group.id} onClick={() => {
                        setSelectedMilestoneGroupId(group.id);
                        // Load members for this group
                        setSelectedMilestoneGroupMembers(group.members || []);
                      }}
                        style={{ background: "white", border: "2px solid #f0f0f0", borderLeft: "4px solid #667eea", borderRadius: 12, padding: 20, cursor: "pointer" }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{group.name}</div>
                        <div style={{ fontSize: 14, color: "#667eea" }}>🎯 {groupMilestones.length} mốc kiểm tra</div>
                        <div style={{ fontSize: 14, color: "#52c41a" }}>✅ {completedMilestones} đã hoàn thành</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            ) : (
            /* Level 3: Show Milestones for selected group */
            <div>
              <button onClick={() => { setSelectedMilestoneGroupId(null); setSelectedMilestoneGroupMembers([]); }}
                style={{ background: "#f0f0f0", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 16 }}
              >← Quay lại nhóm</button>
              
              {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Đang tải...</div>
              ) : (() => {
                // Use GroupMilestones - these have grading, peer review, files, comments
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const groupMilestones = milestones.filter((m: any) => m.groupId === selectedMilestoneGroupId);
                
                console.log('📊 Rendering GroupMilestones for group:', selectedMilestoneGroupId);
                console.log('📊 Found', groupMilestones.length, 'GroupMilestones');
                
                if (groupMilestones.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
                      <p>Chưa có mốc kiểm tra nào cho dự án này</p>
                    </div>
                  );
                }
                
                return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {groupMilestones.map((m: any) => {
                    const isExpanded = expandedMilestones.has(m.id);
                    return (
                      <div
                        key={m.id}
                        style={{
                          background: m.isCompleted ? "#f6ffed" : "white",
                          border: "1px solid #f0f0f0",
                          borderLeft: m.isCompleted ? "4px solid #52c41a" : "4px solid #667eea",
                          borderRadius: 12,
                          padding: 20
                        }}
                      >
                        <div 
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "start", cursor: "pointer" }}
                          onClick={() => {
                            setExpandedMilestones(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(m.id)) {
                                newSet.delete(m.id);
                              } else {
                                newSet.add(m.id);
                                loadMilestoneDetails(m.id);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <h4 style={{ margin: 0, fontSize: 16, color: "#333" }}>{m.title}</h4>
                              {m.isCompleted && (
                                <span style={{
                                  background: "#52c41a",
                                  color: "white",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 600
                                }}>✓ Hoàn thành</span>
                              )}
                            </div>
                            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: 14 }}>{m.description}</p>
                            <div style={{ fontSize: 13, color: "#888" }}>
                              📅 Deadline: {m.deadline ? new Date(m.deadline).toLocaleDateString('vi-VN') : 'Chưa có'}
                            </div>
                          </div>
                          <div style={{ color: "#667eea", fontSize: 20 }}>
                            {isExpanded ? "▲" : "▼"}
                          </div>
                        </div>

                        {/* Expanded content - Grading & Comments */}
                        {isExpanded && (
                          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f0f0f0" }}>

                            {/* Submission Info Section */}
                            {m.submittedBy && (
                              <div style={{ marginBottom: 20, padding: 16, background: "#f0f9ff", borderRadius: 8, border: "1px solid #91d5ff" }}>
                                <h4 style={{ fontSize: 15, marginBottom: 12, color: "#1890ff", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                  ✅ Đã nộp bài
                                </h4>
                                <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                                  <strong>Người nộp:</strong> {getMemberNameForMilestone(m.submittedBy)}
                                </div>
                                {m.submissionFilePath ? (
                                  <a
                                    href={`http://localhost:5234${m.submissionFilePath}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "8px 12px",
                                      background: "#e6f7ff",
                                      border: "1px solid #91d5ff",
                                      borderRadius: 6,
                                      color: "#1890ff",
                                      textDecoration: "none",
                                      fontSize: 13,
                                      fontWeight: 600,
                                    }}
                                  >
                                    <Download size={16} />
                                    {/* Extract original filename from path (remove GUID prefix) */}
                                    {(() => {
                                      const filename = m.submissionFilePath?.split('/').pop() || '';
                                      return filename.split('_').slice(1).join('_') || filename;
                                    })()}
                                  </a>
                                ) : m.submissionContent && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                                    <LinkIcon size={14} color="#1890ff" />
                                    <a href={m.submissionContent} target="_blank" rel="noreferrer" style={{ color: "#1890ff", textDecoration: "none" }}>
                                      {m.submissionContent}
                                    </a>
                                  </div>
                                )}
                                {m.submittedAt && (
                                  <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
                                    🕐 Thời gian nộp: {new Date(m.submittedAt).toLocaleString("vi-VN")}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Show message when not submitted */}
                            {!m.submittedBy && (
                              <div style={{ marginBottom: 20, padding: 16, background: "#fffbe6", borderRadius: 8, border: "1px solid #ffe58f" }}>
                                <div style={{ fontSize: 14, color: "#d48806", display: "flex", alignItems: "center", gap: 6 }}>
                                  <Clock size={16} />
                                  Chưa có bài nộp
                                </div>
                              </div>
                            )}

                            {/* Grading Section */}
                            <div style={{ marginBottom: 24 }}>
                              <h4 style={{ fontSize: 15, marginBottom: 12, color: "#333", fontWeight: 600 }}>⭐ Chấm điểm (Lecturer)</h4>
                              
                              {/* Display existing grades */}
                              {milestoneGrades[m.id] && milestoneGrades[m.id].allGrades && (
                                <div style={{ marginBottom: 16 }}>
                                  <div style={{ fontSize: 13, color: "#888", marginBottom: 12, fontWeight: 600 }}>📊 Điểm hiện tại:</div>
                                  
                                  {(() => {
                                    const allGrades = milestoneGrades[m.id].allGrades || [];
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const lecturerGrades = allGrades.filter((g: any) => g.graderRole === 'Lecturer' || g.graderName === 'Lecturer');
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const peerGrades = allGrades.filter((g: any) => g.graderRole === 'Student' && g.graderName !== 'Lecturer');
                                    
                                    return (
                                      <>
                                        {/* Lecturer Grade */}
                                        {lecturerGrades.length > 0 && (
                                          <div style={{ marginBottom: 12, padding: 12, background: "#fff7e6", borderRadius: 8, border: "2px solid #ffd591" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                              <div>
                                                <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>👨‍🏫 Giảng viên:</div>
                                                <div style={{ fontSize: 13, color: "#666" }}>{lecturerGrades[0].graderName || 'Giảng viên'}</div>
                                              </div>
                                              <div style={{ fontSize: 24, fontWeight: 700, color: "#fa8c16" }}>
                                                {lecturerGrades[0].score}/10
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Peer Grades - Individual */}
                                        {peerGrades.length > 0 && (
                                          <div style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: 13, color: "#888", marginBottom: 8, fontWeight: 600 }}>👥 Điểm từ sinh viên:</div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                              {peerGrades.map((pg: any, idx: number) => (
                                                <div key={idx} style={{ padding: 10, background: "#e6f7ff", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #91d5ff" }}>
                                                  <div style={{ fontSize: 13, color: "#333" }}>
                                                    👤 {pg.graderName || `Sinh viên ${idx + 1}`}
                                                  </div>
                                                  <div style={{ fontSize: 18, fontWeight: 600, color: "#1890ff" }}>
                                                    {pg.score}/10
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                            
                                            {/* Average Peer Grade */}
                                            {milestoneGrades[m.id].averagePeerGrade && (
                                              <div style={{ marginTop: 8, padding: 10, background: "#f0f5ff", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: "2px solid #adc6ff" }}>
                                                <div style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>📊 Trung bình peer:</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}>
                                                  {milestoneGrades[m.id].averagePeerGrade.toFixed(1)}/10
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Grading form */}
                              {gradingMilestone === m.id ? (
                                <div style={{ background: "#fafafa", padding: 16, borderRadius: 8 }}>
                                  <input
                                    type="number"
                                    placeholder="Điểm (0-10)"
                                    value={lecturerGradeScore}
                                    onChange={(e) => setLecturerGradeScore(e.target.value)}
                                    style={{ width: "100%", padding: 10, border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 14, marginBottom: 10 }}
                                    min="0"
                                    max="10"
                                    step="0.1"
                                  />
                                  <textarea
                                    placeholder="Nhận xét (tùy chọn)"
                                    value={lecturerGradeFeedback}
                                    onChange={(e) => setLecturerGradeFeedback(e.target.value)}
                                    style={{ width: "100%", padding: 10, border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 14, minHeight: 60, resize: "vertical", marginBottom: 10 }}
                                  />
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSubmitGrade();
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: 10,
                                        background: "#667eea",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: "pointer"
                                      }}
                                    >
                                      💾 Lưu điểm
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setGradingMilestone(null);
                                        setLecturerGradeScore("");
                                        setLecturerGradeFeedback("");
                                      }}
                                      style={{
                                        padding: 10,
                                        background: "#f0f0f0",
                                        color: "#666",
                                        border: "none",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        cursor: "pointer"
                                      }}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGradingMilestone(m.id);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: 10,
                                    background: "#f0f0f0",
                                    color: "#333",
                                    border: "1px dashed #d9d9d9",
                                    borderRadius: 6,
                                    fontSize: 13,
                                    cursor: "pointer"
                                  }}
                                >
                                  + Chấm điểm / Sửa điểm
                                </button>
                              )}
                            </div>

                            {/* Comments Section */}
                            <div>
                              <h4 style={{ fontSize: 15, marginBottom: 12, color: "#333", fontWeight: 600 }}>💬 Bình luận</h4>
                              
                              {/* Add comment form */}
                              {commentingMilestone === m.id ? (
                                <div style={{ marginBottom: 16, background: "#fafafa", padding: 16, borderRadius: 8 }}>
                                  <textarea
                                    placeholder="Nhập bình luận..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    style={{ width: "100%", padding: 10, border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 14, minHeight: 60, resize: "vertical", marginBottom: 10 }}
                                  />
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSubmitComment();
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: 10,
                                        background: "#667eea",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: "pointer"
                                      }}
                                    >
                                      💬 Gửi bình luận
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCommentingMilestone(null);
                                        setNewComment("");
                                      }}
                                      style={{
                                        padding: 10,
                                        background: "#f0f0f0",
                                        color: "#666",
                                        border: "none",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        cursor: "pointer"
                                      }}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCommentingMilestone(m.id);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: 10,
                                    marginBottom: 16,
                                    background: "#f0f0f0",
                                    color: "#333",
                                    border: "1px dashed #d9d9d9",
                                    borderRadius: 6,
                                    fontSize: 13,
                                    cursor: "pointer"
                                  }}
                                >
                                  + Thêm bình luận
                                </button>
                              )}

                              {/* Comments list */}
                              {milestoneComments[m.id]?.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {milestoneComments[m.id].map((c: any) => (
                                    <div key={c.id} style={{ background: "#fafafa", padding: 12, borderRadius: 8, borderLeft: c.userRole === 'Lecturer' ? "3px solid #fa8c16" : "3px solid #1890ff" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                          <strong style={{ fontSize: 13, color: "#333" }}>
                                            {c.userRole === 'Lecturer' ? '👨‍🏫' : '👤'} {c.userName || "Anonymous"}
                                          </strong>
                                          {c.userRole === 'Lecturer' && (
                                            <span style={{ fontSize: 10, background: "#fff7e6", color: "#fa8c16", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                              GV
                                            </span>
                                          )}
                                        </div>
                                        <span style={{ fontSize: 11, color: "#999" }}>
                                          {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                      </div>
                                      <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{c.content}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ textAlign: "center", padding: 16, color: "#999", fontSize: 13, background: "#fafafa", borderRadius: 8 }}>
                                  Chưa có bình luận
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Grading Modal */}
      {gradingSubmission && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1100 }}>
          <div style={{ background: "white", width: 480, padding: 30, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, color: "#333" }}>Chấm điểm</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#888" }}>{gradingSubmission.studentName}</p>
              </div>
              <X style={{ cursor: "pointer", color: "#999" }} onClick={() => setGradingSubmission(null)} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#333" }}>Điểm số (0-10)</label>
              <input 
                type="number" 
                max={10} min={0} step={0.5}
                value={score} 
                onChange={e => setScore(e.target.value)} 
                style={{ 
                  width: "100%", padding: 14, fontSize: 18, fontWeight: 600,
                  borderRadius: 10, border: "2px solid #e8e8e8", textAlign: "center",
                  outline: "none"
                }}
                placeholder="0"
                onFocus={e => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={e => e.currentTarget.style.borderColor = "#e8e8e8"}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#333" }}>Nhận xét</label>
              <textarea 
                value={feedback} 
                onChange={e => setFeedback(e.target.value)} 
                style={{ 
                  width: "100%", padding: 14, height: 100, 
                  borderRadius: 10, border: "2px solid #e8e8e8",
                  resize: "none", outline: "none"
                }}
                placeholder="Nhập nhận xét cho sinh viên..."
                onFocus={e => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={e => e.currentTarget.style.borderColor = "#e8e8e8"}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                onClick={() => setGradingSubmission(null)} 
                style={{ padding: "12px 24px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
              >
                Hủy
              </button>
              <button 
                onClick={submitGrade} 
                style={{ 
                  padding: "12px 32px", 
                  background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)", 
                  color: "white", border: "none", borderRadius: 8, 
                  fontWeight: 600, cursor: "pointer", 
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 14
                }}
              >
                <Check size={18} /> Lưu điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
