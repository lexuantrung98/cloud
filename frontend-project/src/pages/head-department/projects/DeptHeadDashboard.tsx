import { useState, useEffect, useCallback } from "react";
import { getAllProjects, updateProjectStatus, assignClassToProject, type ProjectTemplate } from "../../../api/projectApi";
import courseApi from "../../../api/courseApi";
import { X, FileText, Calendar, User, BookOpen, CheckCircle, Clock, XCircle } from "lucide-react"; 
import { toast } from 'react-toastify';

interface ClassItem {
  id: number;
  code: string;
  subjectName?: string;
  subjectCode?: string;
}

export default function DeptHeadDashboard() {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modal state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // Classes for assignment
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Load classes for assignment modal
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await courseApi.getClasses();
        setClasses((data as {data?: ClassItem[]}).data || (data as unknown as ClassItem[]) || []);
      } catch {
        console.log('Could not load classes');
      }
    };
    loadClasses();
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProjects();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setProjects(sorted);
    } catch {
      toast.error('Lỗi tải danh sách đề tài');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [trigger, fetchProjects]);

  const handleApprove = async (id: string) => {
    if (!window.confirm("Duyệt đề tài này?")) return;
    try {
      await updateProjectStatus(id, 1);
      toast.success('Đã duyệt đề tài!');
      setTrigger(t => t + 1);
      if(selectedProject?.id === id) setSelectedProject(null);  
    } catch {
      toast.error("Lỗi khi duyệt.");
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Từ chối đề tài này?")) return;
    try {
      await updateProjectStatus(id, 2);  
      toast.success('Đã từ chối đề tài!');
      setTrigger(t => t + 1);
      if(selectedProject?.id === id) setSelectedProject(null);
    } catch {
      toast.error("Lỗi khi từ chối.");
    }
  };

  const openAssignClassModal = (project: ProjectTemplate) => {
    setSelectedProject(project);
    setSelectedClassId('');
    setShowClassModal(true);
  };

  const handleAssignClass = async () => {
    if (!selectedClassId || !selectedProject) return;
    
    try {
      await assignClassToProject(selectedProject.id, selectedClassId);
      toast.success(`Đã phân công lớp ${selectedClassId} thành công!`);
      setShowClassModal(false);
      setTrigger(t => t + 1);
    } catch {
      toast.error("Lỗi khi phân công lớp.");
    }
  };

  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'pending') return p.status === 0;
    if (filter === 'approved') return p.status === 1;
    if (filter === 'rejected') return p.status === 2;
    return true;
  });

  const getStatusBadge = (status: number) => {
    switch(status) {
      case 0: return <span style={{ background: "#faad14", color: "white", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12}/> CHỜ DUYỆT</span>;
      case 1: return <span style={{ background: "#52c41a", color: "white", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12}/> ĐÃ DUYỆT</span>;
      case 2: return <span style={{ background: "#ff4d4f", color: "white", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><XCircle size={12}/> TỪ CHỐI</span>;
      default: return null;
    }
  };

  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('vi-VN') : 'Chưa có';

  // Stats
  const stats = {
    total: projects.length,
    pending: projects.filter(p => p.status === 0).length,
    approved: projects.filter(p => p.status === 1).length,
    rejected: projects.filter(p => p.status === 2).length,
  };

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: '#333' }}>Quản lý Đề Tài</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Duyệt đề tài và phân công cho các lớp</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng đề tài</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#fffbe6', padding: 20, borderRadius: 12, border: '1px solid #ffe58f' }}>
          <div style={{ fontSize: 13, color: '#d48806', marginBottom: 4 }}>Chờ duyệt</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#faad14' }}>{stats.pending}</div>
        </div>
        <div style={{ background: '#f6ffed', padding: 20, borderRadius: 12, border: '1px solid #b7eb8f' }}>
          <div style={{ fontSize: 13, color: '#389e0d', marginBottom: 4 }}>Đã duyệt</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{stats.approved}</div>
        </div>
        <div style={{ background: '#fff2f0', padding: 20, borderRadius: 12, border: '1px solid #ffccc7' }}>
          <div style={{ fontSize: 13, color: '#cf1322', marginBottom: 4 }}>Từ chối</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'approved', label: 'Đã duyệt' },
          { key: 'rejected', label: 'Từ chối' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            style={{
              padding: '10px 20px',
              background: filter === tab.key ? '#667eea' : '#fff',
              color: filter === tab.key ? '#fff' : '#666',
              border: filter === tab.key ? 'none' : '1px solid #d9d9d9',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: filter === tab.key ? 600 : 400,
              fontSize: 14
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Đang tải...</div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p>Không có đề tài nào</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filteredProjects.map((p) => (
            <div 
              key={p.id} 
              style={{ 
                background: "white", 
                padding: 24, 
                borderRadius: 12, 
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)", 
                borderLeft: `4px solid ${p.status === 0 ? '#faad14' : (p.status === 1 ? '#52c41a' : '#ff4d4f')}` 
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {getStatusBadge(p.status)}
                    <span style={{ fontSize: 12, color: "#888" }}>{p.subjectId} • {formatDate(p.createdAt)}</span>
                  </div>
                  
                  <h3 style={{ margin: "0 0 8px 0", color: "#333", fontSize: 18 }}>{p.name}</h3>
                  <p style={{ color: "#666", marginBottom: 12, fontSize: 14, lineHeight: 1.5 }}>{p.description}</p>
                  
                  {/* Assigned Classes */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>Lớp:</span>
                    {p.assignedClassIds ? (
                      p.assignedClassIds.split(',').map((cls, idx) => (
                        <span key={idx} style={{ background: "#f6ffed", border: "1px solid #52c41a", color: "#52c41a", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {cls}
                        </span>
                      ))
                    ) : <span style={{ fontSize: 12, color: "#999", fontStyle: 'italic' }}>Chưa phân công</span>}
                    
                    {p.status === 1 && (
                      <button 
                        onClick={() => openAssignClassModal(p)}
                        style={{ fontSize: 12, color: "#389e0d", background: "transparent", border: "1px dashed #389e0d", padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}
                      >
                        + Thêm lớp
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: 'column', gap: 8, marginLeft: 20 }}>
                  <button 
                    onClick={() => setSelectedProject(p)}
                    style={{ padding: "8px 16px", background: "#e6f7ff", color: "#1890ff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                  >
                    Xem chi tiết
                  </button>
                  
                  {p.status === 0 && (
                    <>
                      <button onClick={() => handleApprove(p.id)} style={{ padding: "8px 16px", background: "#52c41a", border: "none", color: "white", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✓ Duyệt</button>
                      <button onClick={() => handleReject(p.id)} style={{ padding: "8px 16px", background: "white", border: "1px solid #ff4d4f", color: "#ff4d4f", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Từ chối</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProject && !showClassModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", width: 700, maxWidth: "90%", maxHeight: "90vh", borderRadius: 12, padding: 30, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 15 }}>
              <div>
                <div style={{ marginBottom: 8 }}>{getStatusBadge(selectedProject.status)}</div>
                <h2 style={{ margin: 0, color: "#333" }}>{selectedProject.name}</h2>
              </div>
              <button onClick={() => setSelectedProject(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#666" }}><X size={24} /></button>
            </div>

            {/* Body (Scrollable) */}
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 5 }}>
              
              {/* Info Grid */}
              <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><BookOpen size={12}/> MÔN HỌC</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedProject.subjectId}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><User size={12}/> NGƯỜI TẠO</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedProject.createdBy || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><Calendar size={12}/> NGÀY TẠO</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{formatDate(selectedProject.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><Calendar size={12}/> DEADLINE</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#e67e22' }}>{formatDate(selectedProject.deadline)}</div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#333", fontSize: 15 }}>📝 Mô tả đề tài</h4>
                <p style={{ lineHeight: 1.7, color: "#555", background: "#fff", border: "1px solid #eee", padding: 16, borderRadius: 8, margin: 0 }}>
                  {selectedProject.description}
                </p>
              </div>

              {/* Milestones */}
              <div>
                <h4 style={{ margin: "0 0 15px 0", color: "#333", fontSize: 15 }}>📍 Lộ trình thực hiện</h4>
                {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {selectedProject.milestones.map((m: any, index: number) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", padding: 16, border: "1px solid #e0e0e0", borderRadius: 8, background: "white", gap: 16 }}>
                        <div style={{ background: "#e6f7ff", padding: 12, borderRadius: "50%", color: "#1890ff" }}>
                          <FileText size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>{m.title || m.name || m.Title}</div>
                          <div style={{ fontSize: 13, color: "#666" }}>{m.description}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: "#888" }}>Deadline</div>
                          <div style={{ fontWeight: 600, color: "#e67e22" }}>{formatDate(m.deadline)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontStyle: "italic", color: "#999", textAlign: 'center', padding: 20 }}>Chưa có lộ trình cụ thể</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #eee", paddingTop: 15, marginTop: 15, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {selectedProject.status === 0 && (
                <>
                  <button onClick={() => handleReject(selectedProject.id)} style={{ padding: "10px 24px", background: "white", border: "1px solid #ff4d4f", color: "#ff4d4f", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Từ chối</button>
                  <button onClick={() => handleApprove(selectedProject.id)} style={{ padding: "10px 24px", background: "#52c41a", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>✓ Duyệt ngay</button>
                </>
              )}
              {selectedProject.status === 1 && (
                <button onClick={() => { setShowClassModal(true); }} style={{ padding: "10px 24px", background: "#389e0d", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>+ Phân công lớp</button>
              )}
              <button onClick={() => setSelectedProject(null)} style={{ padding: "10px 24px", background: "#f0f0f0", border: "none", borderRadius: 6, cursor: "pointer" }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Class Assignment Modal */}
      {showClassModal && selectedProject && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1001 }}>
          <div style={{ background: "white", width: 500, maxWidth: "90%", borderRadius: 12, padding: 30 }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Phân công lớp cho đề tài</h3>
            <p style={{ color: '#666', marginBottom: 20 }}>Đề tài: <strong>{selectedProject.name}</strong></p>
            
            <select 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ width: '100%', padding: 12, border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, marginBottom: 20 }}
            >
              <option value="">-- Chọn lớp --</option>
              {(() => {
                console.log('🔍 Debug Modal Filter:');
                console.log('- Project subjectId:', selectedProject.subjectId);
                console.log('- All classes:', classes);
                
                const filteredClasses = classes.filter(cls => {
                  // Nếu project không có subjectId, hiển thị tất cả lớp
                  if (!selectedProject.subjectId || selectedProject.subjectId.trim() === '') {
                    console.warn('⚠️ Project không có subjectId, hiển thị tất cả lớp');
                    return true;
                  }
                  
                  // Nếu có subjectCode, so sánh chính xác
                  if (cls.subjectCode) {
                    return cls.subjectCode === selectedProject.subjectId;
                  }
                  
                  // Fallback: Nếu không có subjectCode, hiển thị tất cả
                  console.warn('⚠️ Class không có subjectCode, hiển thị tất cả');
                  return true;
                });
                
                console.log('- Filtered classes:', filteredClasses);
                
                return filteredClasses.map(cls => (
                  <option key={cls.id} value={cls.code}>{cls.code} - {cls.subjectName}</option>
                ));
              })()}
            </select>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowClassModal(false)} style={{ padding: '10px 24px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
              <button onClick={handleAssignClass} disabled={!selectedClassId} style={{ padding: '10px 24px', background: selectedClassId ? '#389e0d' : '#d9d9d9', color: 'white', border: 'none', borderRadius: 6, cursor: selectedClassId ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Phân công</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
