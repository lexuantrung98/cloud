import { useState, useEffect, useCallback } from 'react';
import * as projectApi from '../../../api/projectApi';
import { type ProjectGroup } from '../../../api/projectApi';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import { getToken } from '../../../utils/authStorage';
import styles from '../LecturerPages.module.css';

interface Class {
  id: number;
  name: string;
  code: string;
  subjectId?: number;
  subjectName?: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

export default function LecturerGroupsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ProjectGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);

  const getUserEmail = () => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email || payload.sub || '';
      } catch {
        return '';
      }
    }
    return '';
  };

  const loadClassesAndSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const subjectsResponse = await courseApi.getSubjects();
      const subjectsData = subjectsResponse.data?.data || subjectsResponse.data || [];

      const classesResponse = await courseApi.getClasses();
      let classesData = classesResponse.data?.data || classesResponse.data || [];
      
      const userEmail = getUserEmail();
      if (userEmail) {
        classesData = classesData.filter((c: { lecturerEmail?: string }) => c.lecturerEmail === userEmail);
      }

      const enrichedClasses = classesData.map((cls: Class) => {
        const subject = subjectsData.find((s: Subject) => s.id === cls.subjectId);
        return {
          ...cls,
          subjectName: subject?.name || 'Chưa có môn'
        };
      });

      setClasses(enrichedClasses);
    } catch {
      toast.error('Lỗi tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClassesAndSubjects();
  }, [loadClassesAndSubjects]);

  const loadGroups = async (classCode: string, classSubjectId?: number) => {
    setLoading(true);
    try {
      const response = await projectApi.getGroupsByClass(classCode);
      let data = Array.isArray(response) ? response : (response?.data || []);
      
      if (classSubjectId) {
        const subjectsResponse = await courseApi.getSubjects();
        const subjectsData = subjectsResponse.data?.data || subjectsResponse.data || [];
        const classSubject = subjectsData.find((s: Subject) => s.id === classSubjectId);
        const classSubjectCode = classSubject?.code;
        
        if (classSubjectCode) {
          data = data.filter((g: ProjectGroup) => !g.subjectCode || g.subjectCode === classSubjectCode);
        }
      }
      
      setGroups(data);
    } catch {
      toast.error('Lỗi tải danh sách nhóm');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (cls: Class) => {
    setSelectedClass(cls);
    setSelectedGroup(null);
    loadGroups(cls.code, cls.subjectId);
  };

  const handleCreateGroup = async () => {
    if (!selectedClass || !newGroupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm');
      return;
    }

    try {
      const subjectsResponse = await courseApi.getSubjects();
      const subjectsData = subjectsResponse.data?.data || subjectsResponse.data || [];
      const classSubject = subjectsData.find((s: Subject) => s.id === selectedClass.subjectId);
      const subjectCode = classSubject?.code;
      
      await projectApi.createGroup(null, newGroupName, selectedClass.code, subjectCode, maxMembers);
      toast.success(`Đã tạo nhóm "${newGroupName}" (tối đa ${maxMembers} thành viên)!`);
      setShowCreateModal(false);
      setNewGroupName('');
      setMaxMembers(5);
      loadGroups(selectedClass.code, selectedClass.subjectId);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Lỗi tạo nhóm');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhóm "${groupName}"?`)) return;

    try {
      await projectApi.deleteProjectGroup(groupId);
      toast.success(`Đã xóa nhóm "${groupName}"`);
      if (selectedClass) {
        loadGroups(selectedClass.code, selectedClass.subjectId);
      }
      setSelectedGroup(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Lỗi xóa nhóm');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Quản lý Nhóm</h1>
        <p className={styles.pageSubtitle}>Chọn lớp học để quản lý nhóm dự án</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar - Classes */}
        <div style={{ width: 280, background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#333' }}>Lớp học của tôi</h3>
          
          {loading && classes.length === 0 ? (
            <p className={styles.loading}>Đang tải...</p>
          ) : classes.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Chưa có lớp nào</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classes.map(cls => (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedClass?.id === cls.id ? '#f0f5ff' : '#f9fafb',
                    border: selectedClass?.id === cls.id ? '2px solid #667eea' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{cls.name}</div>
                  <div style={{ fontSize: 12, color: '#667eea', marginTop: 2 }}>{cls.subjectName}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{cls.code}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {selectedClass ? (
            <>
              {/* Class Header with Gradient */}
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 24,
                borderRadius: 16,
                color: 'white',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>{selectedClass.name}</h2>
                  <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>
                    {selectedClass.subjectName} • {selectedClass.code}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={styles.successButton}
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  + Tạo Nhóm Mới
                </button>
              </div>

              {/* Groups Grid */}
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>Danh sách nhóm ({groups.length})</h3>

                {loading ? (
                  <div className={styles.loading}>
                    <p className={styles.loadingText}>Đang tải...</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>👥</div>
                    <p className={styles.emptyStateTitle}>Chưa có nhóm nào</p>
                    <p className={styles.emptyStateText}>Nhấn "Tạo Nhóm Mới" để bắt đầu</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {groups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup(group)}
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 12,
                          padding: 20,
                          background: selectedGroup?.id === group.id ? '#f0f5ff' : '#fafbfc',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Group Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 16,  color: '#333' }}>{group.name}</h4>
                            {group.maxMembers && (
                              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                Tối đa: {group.maxMembers} thành viên
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className={styles.badgePill} style={{ padding: '4px 10px', fontSize: 11 }}>
                              {group.members?.length || 0} SV
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(group.id, group.name);
                              }}
                              style={{
                                padding: '6px 10px',
                                background: '#ff4d4f',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 11,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="Xóa nhóm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Members */}
                        {group.members && group.members.length > 0 ? (
                          <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                            {group.members.slice(0, 3).map((m) => (
                              <div key={m.id} style={{ fontSize: 13, padding: '6px 0', color: '#666' }}>
                                • {m.fullName} ({m.studentCode})
                                {m.role === 'Leader' && (
                                  <span style={{
                                    marginLeft: 8,
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    background: '#ffd700',
                                    color: '#333',
                                    borderRadius: 4,
                                    fontWeight: 600
                                  }}>
                                    TRƯỞNG NHÓM
                                  </span>
                                )}
                              </div>
                            ))}
                            {group.members.length > 3 && (
                              <div style={{ fontSize: 12, color: '#667eea', marginTop: 6 }}>
                                +{group.members.length - 3} thành viên khác
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#999', fontSize: 13, fontStyle: 'italic', marginTop: 12 }}>
                            Chưa có thành viên
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyState} style={{ background: 'white', borderRadius: 16, padding: 80 }}>
              <div className={styles.emptyStateIcon}>👈</div>
              <p className={styles.emptyStateTitle}>Chọn lớp học bên trái để xem nhóm</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Tạo Nhóm Mới</h3>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên nhóm</label>
              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="VD: Nhóm 1"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số lượng thành viên tối đa</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxMembers}
                onChange={e => setMaxMembers(parseInt(e.target.value) || 5)}
                className={styles.input}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                Đề xuất: 3-5 thành viên cho hiệu quả tốt nhất
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setMaxMembers(5);
                }}
                className={styles.cancelButton}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroup}
                className={styles.successButton}
              >
                Tạo Nhóm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
