import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getAllProjects, getProjectById, getGroupsByProject, getSubmissionsByProject, 
  gradeSubmission, mockStudentSubmit, 
  type ProjectTemplate, type ProjectGroup, type Submission 
} from "../../../api/projectApi";
import { ArrowLeft, Check, X, Clock, CheckCircle, AlertCircle, FileText, Award, TrendingUp, ChevronRight } from "lucide-react";
import { toast } from 'react-toastify';
import styles from "./LecturerProgress.module.css";

export default function LecturerProgress() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ProjectTemplate | null>(null);
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!projectId) {
        const allProjects = await getAllProjects();
        const activeProjects = allProjects.filter(p => p.status === 1);
        setProjects(activeProjects);
        setLoading(false);
        return;
      }
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const dataPromise = Promise.all([
        getProjectById(projectId),
        getGroupsByProject(projectId).catch(() => []),
        getSubmissionsByProject(projectId).catch(() => [])
      ]);
      
      const [proj, allG, allS] = await Promise.race([dataPromise, timeoutPromise]) as [ProjectTemplate | null, ProjectGroup[], Submission[]];
      
      setProject(proj);
      setGroups(Array.isArray(allG) ? allG : []);
      setSubmissions(Array.isArray(allS) ? allS : []);
    } catch (err) {
      if (err instanceof Error && err.message === 'Timeout') {
        toast.error("Tải dữ liệu quá lâu. Vui lòng thử lại.");
      } else {
        toast.error("Lỗi tải dữ liệu");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  const findSub = (groupId: string, milestoneId: string) => {
    return submissions.find(s => s.projectGroupId === groupId && s.projectMilestoneId === milestoneId);
  };

  const handleOpenGrade = (sub: Submission) => {
    setSelectedSubmission(sub);
    setScore(sub.grade || 0);
    setComment(sub.feedback || "");
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    if (score < 0 || score > 10) {
      toast.error("Điểm phải từ 0-10!");
      return;
    }
    try {
      await gradeSubmission(selectedSubmission.id, score, comment);
      toast.success("Đã lưu điểm!");
      setSelectedSubmission(null);
      loadData();
    } catch {
      toast.error("Lỗi khi lưu điểm");
    }
  };

  const handleMockSubmit = async (groupId: string, milestoneId: string) => {
    const content = prompt("Nhập nội dung bài nộp giả lập (Link drive, github...):");
    if (content) {
      try {
        await mockStudentSubmit(groupId, milestoneId, content);
        toast.success("Đã tạo bài nộp mock!");
        loadData();
      } catch {
        toast.error("Lỗi tạo bài nộp");
      }
    }
  };

  const milestones = project?.milestones || [];
  const totalCells = groups.length * milestones.length;
  const submittedCells = submissions.length;
  const gradedCells = submissions.filter(s => s.grade !== null && s.grade !== undefined).length;
  const overallProgress = totalCells > 0 ? Math.round((submittedCells / totalCells) * 100) : 0;

  // Case 1: Project selection
  if (!projectId) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Xem tiến độ dự án</h1>
          <p className={styles.pageSubtitle}>Chọn dự án để xem tiến độ</p>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingContent}>
              <div className={styles.spinner} />
              Đang tải...
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyEmoji}>📋</div>
            <p>Chưa có dự án nào đang hoạt động</p>
          </div>
        ) : (
          <div className={styles.projectsGrid}>
            {projects.map((p) => (
              <div 
                key={p.id} 
                onClick={() => navigate(`/lecturer/projects/progress/${p.id}`)}
                className={styles.projectCard}
              >
                <div className={styles.projectCardHeader}>
                  <span className={styles.activeBadge}>
                    <CheckCircle size={12} /> Đang chạy
                  </span>
                  <span className={styles.subjectId}>{p.subjectId}</span>
                </div>
                
                <h3 className={styles.projectName}>{p.name}</h3>
                <p className={styles.projectDescription}>
                  {p.description || "Chưa có mô tả"}
                </p>
                
                <div className={styles.projectFooter}>
                  <span className={styles.milestonesCount}>
                    {p.milestones?.length || 0} milestones
                  </span>
                  <div className={styles.viewButton}>
                    Xem tiến độ <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Case 2: Loading
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          Đang tải...
        </div>
      </div>
    );
  }

  // Case 3: Project not found
  if (!project) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyEmoji}>📋</div>
        <p>Không tìm thấy dự án</p>
        <button 
          onClick={() => navigate("/lecturer/projects/progress")}
          className={styles.notFoundButton}
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button 
          onClick={() => navigate("/lecturer/projects")} 
          className={styles.backButton}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <h1 className={styles.pageTitle}>Tiến độ dự án</h1>
        <p className={styles.pageSubtitle}>{project.name}</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} color="white" />
          </div>
          <div>
            <div className={styles.statValue}>{overallProgress}%</div>
            <div className={styles.statLabel}>Tiến độ chung</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <FileText size={24} color="#1890ff" />
          </div>
          <div>
            <div className={styles.statValue}>{submittedCells}</div>
            <div className={styles.statLabel}>Bài nộp</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <CheckCircle size={24} color="#52c41a" />
          </div>
          <div>
            <div className={styles.statValue}>{gradedCells}</div>
            <div className={styles.statLabel}>Đã chấm</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconYellow}`}>
            <Clock size={24} color="#faad14" />
          </div>
          <div>
            <div className={styles.statValue}>{submittedCells - gradedCells}</div>
            <div className={styles.statLabel}>Chờ chấm</div>
          </div>
        </div>
      </div>

      {/* Progress Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Bảng tiến độ theo nhóm & milestone</h3>
        </div>
        
        {groups.length === 0 || milestones.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyEmoji}>📊</div>
            <p>Chưa có dữ liệu nhóm hoặc milestone</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nhóm</th>
                  {milestones.map((m) => (
                    <th key={m.id} className={styles.centered}>
                      <div className={styles.milestoneHeader}>{m.title}</div>
                      <div className={styles.milestoneDate}>
                        {m.deadline ? new Date(m.deadline).toLocaleDateString('vi-VN') : ''}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className={styles.groupName}>{g.name}</div>
                      <div className={styles.groupMeta}>
                        {g.members?.length || 0} thành viên
                      </div>
                    </td>
                    
                    {milestones.map(m => {
                      const sub = findSub(g.id, m.id);
                      return (
                        <td key={m.id} className={styles.cellCentered}>
                          {sub ? (
                            <div className={styles.submissionCell}>
                              <span className={styles.submissionDate}>
                                {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                              </span>
                              
                              {sub.grade !== null && sub.grade !== undefined ? (
                                <div className={styles.gradeBadge}>
                                  <Award size={14} /> {sub.grade}
                                </div>
                              ) : (
                                <span className={styles.pendingBadge}>
                                  <Clock size={12} /> Chờ chấm
                                </span>
                              )}

                              <button 
                                onClick={() => handleOpenGrade(sub)}
                                className={styles.gradeButton}
                              >
                                ✍️ {sub.grade !== null ? "Sửa điểm" : "Chấm điểm"}
                              </button>
                            </div>
                          ) : (
                            <div className={styles.emptyCell}>
                              <AlertCircle size={20} />
                              <div className={styles.emptyText}>Chưa nộp</div>
                              <button 
                                onClick={() => handleMockSubmit(g.id, m.id)} 
                                className={styles.mockButton}
                              >
                                + Mock
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Đánh giá bài nộp</h3>
              <button className={styles.closeButton} onClick={() => setSelectedSubmission(null)}>
                <X />
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nội dung bài làm:</label>
              <div className={styles.contentDisplay}>
                {selectedSubmission.content || "Không có nội dung"}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Điểm số (0-10):</label>
              <input 
                type="number" max={10} min={0} step={0.5}
                value={score} onChange={e => setScore(Number(e.target.value))}
                className={styles.scoreInput}
              />
            </div>

            <div className={styles.formGroupLast}>
              <label className={styles.formLabel}>Nhận xét:</label>
              <textarea 
                rows={4}
                value={comment} onChange={e => setComment(e.target.value)}
                className={styles.commentTextarea}
                placeholder="Nhập lời nhận xét cho nhóm..."
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={() => setSelectedSubmission(null)} 
                className={styles.cancelButton}
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveGrade} 
                className={styles.saveButton}
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
