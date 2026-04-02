import { useState, useEffect, useCallback } from "react";
import { getAllProjects, getGroupsByProject, type ProjectTemplate, type ProjectGroup } from "../../../api/projectApi";
import { Users, Plus, X, UserPlus, Trash2, Crown, User } from "lucide-react";
import { toast } from 'react-toastify';
import styles from "./GroupManagement.module.css";

export default function GroupManagement() {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectTemplate | null>(null);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ name: "", deadline: "", description: "" });

  const loadGroups = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const data = await getGroupsByProject(projectId);
      const groups = Array.isArray(data) ? data : [];
      setGroups(groups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error("Lỗi tải danh sách nhóm");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectProject = useCallback((project: ProjectTemplate) => {
    setSelectedProject(project);
    loadGroups(project.id);
  }, [loadGroups]);

  useEffect(() => {
    getAllProjects().then(data => {
      const activeProjects = data.filter(p => p.status === 1);
      setProjects(activeProjects);
      if (activeProjects.length > 0) {
        handleSelectProject(activeProjects[0]);
      }
    }).catch(() => {
      toast.error("Lỗi tải danh sách dự án");
    });
  }, [handleSelectProject]);

  const handleCreateMilestone = () => {
    if (!newMilestone.name || !newMilestone.deadline) {
      toast.error("Vui lòng nhập đủ thông tin");
      return;
    }
    toast.success(`Đã tạo milestone "${newMilestone.name}"`);
    setShowMilestoneModal(false);
    setNewMilestone({ name: "", deadline: "", description: "" });
  };

  // Stats
  const stats = {
    totalGroups: groups.length,
    totalMembers: groups.reduce((acc, g) => acc + (g.members?.length || 0), 0),
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>
          Dự án đang chạy
        </h3>
        <div className={styles.projectsList}>
          {projects.length === 0 && (
            <p className={styles.emptyText}>Không có dự án nào</p>
          )}
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleSelectProject(p)}
              className={`${styles.projectItem} ${selectedProject?.id === p.id ? styles.projectItemActive : ''}`}
            >
              <div className={styles.projectName}>{p.name}</div>
              <div className={styles.projectMeta}>
                {p.subjectId || "Chưa có môn"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {selectedProject ? (
          <>
            {/* Header */}
            <div className={styles.header}>
              <div>
                <h2 className={styles.headerTitle}>{selectedProject.name}</h2>
                <p className={styles.headerSubtitle}>Quản lý nhóm sinh viên</p>
              </div>
              <button 
                onClick={() => setShowMilestoneModal(true)}
                className={styles.addButton}
              >
                <Plus size={18} /> Tạo Mốc Mới
              </button>
            </div>

            {/* Stats */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users size={24} color="white" />
                </div>
                <div>
                  <div className={styles.statValue}>{stats.totalGroups}</div>
                  <div className={styles.statLabel}>Nhóm</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                  <User size={24} color="#52c41a" />
                </div>
                <div>
                  <div className={styles.statValue}>{stats.totalMembers}</div>
                  <div className={styles.statLabel}>Thành viên</div>
                </div>
              </div>
            </div>

            {/* Groups Grid */}
            <div className={styles.groupsContainer}>
              <h3 className={styles.groupsTitle}>Danh sách nhóm</h3>
              
              {loading ? (
                <div className={styles.emptyState}>Đang tải...</div>
              ) : groups.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyEmoji}>👥</div>
                  <p className={styles.emptyText}>Chưa có nhóm nào</p>
                  <p className={styles.emptySubtext}>Sử dụng chức năng "Phân Nhóm" trong trang Danh sách Dự án</p>
                </div>
              ) : (
                <div className={styles.groupsGrid}>
                  {groups.map(group => (
                    <div key={group.id} className={styles.groupCard}>
                      {/* Group Header */}
                      <div className={styles.groupHeader}>
                        <h4 className={styles.groupName}>{group.name}</h4>
                        <span className={styles.memberCountBadge}>
                          {group.members?.length || 0} SV
                        </span>
                      </div>
                      
                      {/* Class ID */}
                      <div className={styles.classIdBadge}>
                        <span className={styles.classIdBadgeInner}>
                          {group.classId || "Chưa có lớp"}
                        </span>
                      </div>

                      {/* Members */}
                      <div className={styles.membersList}>
                        {group.members && group.members.length > 0 ? (
                          group.members.slice(0, 4).map((m, i) => (
                            <div 
                              key={m.id || i} 
                              className={`${styles.memberRow} ${i < Math.min(group.members!.length - 1, 3) ? styles.memberRowBordered : ''}`}
                            >
                              <div className={`${styles.memberAvatar} ${i === 0 ? styles.memberAvatarLeader : ''}`}>
                                {i === 0 ? <Crown size={14} color="#faad14" /> : <User size={14} color="#888" />}
                              </div>
                              <div className={styles.memberInfo}>
                                <div className={`${styles.memberName} ${i === 0 ? styles.memberNameLeader : ''}`}>
                                  {m.fullName || `Thành viên ${i + 1}`}
                                </div>
                                <div className={styles.memberCode}>{m.studentCode || m.studentId}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={styles.membersEmpty}>Chưa có thành viên</div>
                        )}
                        {group.members && group.members.length > 4 && (
                          <div className={styles.moreMembers}>
                            +{group.members.length - 4} thành viên khác
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={styles.groupActions}>
                        <button className={styles.actionButton}>
                          <UserPlus size={14} /> Thêm SV
                        </button>
                        <button className={styles.deleteButton}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyProject}>
            <div>
              <div className={styles.emptyEmoji}>👈</div>
              <p className={styles.emptyText}>Chọn dự án bên trái để xem nhóm</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm Milestone</h3>
              <button className={styles.closeButton} onClick={() => setShowMilestoneModal(false)}>
                <X />
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên cột mốc</label>
              <input 
                value={newMilestone.name} 
                onChange={e => setNewMilestone({...newMilestone, name: e.target.value})} 
                className={styles.formInput}
                placeholder="VD: Nộp báo cáo giai đoạn 2"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hạn chót</label>
              <input 
                type="date" 
                value={newMilestone.deadline} 
                onChange={e => setNewMilestone({...newMilestone, deadline: e.target.value})} 
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroupLast}>
              <label className={styles.formLabel}>Mô tả (tùy chọn)</label>
              <textarea 
                value={newMilestone.description} 
                onChange={e => setNewMilestone({...newMilestone, description: e.target.value})} 
                className={styles.formTextarea}
                placeholder="Mô tả yêu cầu..."
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowMilestoneModal(false)} 
                className={styles.cancelButton}
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateMilestone} 
                className={styles.submitButton}
              >
                Tạo Milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
