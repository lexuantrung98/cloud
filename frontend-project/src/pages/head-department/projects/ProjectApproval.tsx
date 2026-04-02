import { useState, useEffect, useCallback } from "react";
import { getAllProjects, updateProjectStatus, assignClassToProject, type ProjectTemplate } from "../../../api/projectApi";
import courseApi from "../../../api/courseApi";
import { ChevronDown, ChevronUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from 'react-toastify';

interface ClassItem {
  id: number;
  code: string;
  subjectName?: string;
  subjectCode?: string;
}

export default function ProjectApproval() {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  
  // Classes for assignment
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Load classes
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
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Filter only pending projects for this page
      const pendingProjects = sorted.filter(p => p.status === 0);
      setProjects(pendingProjects);
    } catch {
      toast.error('Lỗi tải danh sách đề tài');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [trigger, fetchProjects]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Duyệt đề tài này?")) return;
    try {
      await updateProjectStatus(id, 1);
      toast.success('Đã duyệt đề tài!');
      setTrigger(t => t + 1);
    } catch {
      toast.error("Lỗi khi duyệt.");
    }
  };

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Từ chối đề tài này?")) return;
    try {
      await updateProjectStatus(id, 2);
      toast.success('Đã từ chối đề tài!');
      setTrigger(t => t + 1);
    } catch {
      toast.error("Lỗi khi từ chối.");
    }
  };

  const handleAddClass = async (id: string, classCode: string) => {
    try {
      await assignClassToProject(id, classCode);
      toast.success(`Đã phân công lớp ${classCode}!`);
      setTrigger(t => t + 1);
    } catch {
      toast.error("Lỗi khi phân công lớp.");
    }
  };

  const toggleDetail = (id: string) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isApproved = (s: any) => s === 1 || s === "Approved";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isPending = (s: any) => s === 0 || s === "Pending";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isRejected = (s: any) => s === 2 || s === "Rejected";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStatusBadge = (status: any) => {
    if (isApproved(status)) return <span style={{ background: "#52c41a", color: "white", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12}/> ĐÃ DUYỆT</span>;
    if (isRejected(status)) return <span style={{ background: "#ff4d4f", color: "white", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><XCircle size={12}/> TỪ CHỐI</span>;
    return <span style={{ background: "#faad14", color: "white", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12}/> CHỜ DUYỆT</span>;
  };

  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('vi-VN') : 'Không có';

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: '#333' }}>Duyệt Đề Tài</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Xem xét và phê duyệt các đề tài mới</p>
      </div>

      {/* Pending Count */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: 24, 
        borderRadius: 12, 
        marginBottom: 24,
        color: 'white'
      }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Số đề tài cần duyệt</div>
        <div style={{ fontSize: 36, fontWeight: 700 }}>{projects.length}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Đang tải...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h3 style={{ color: '#52c41a', marginBottom: 8 }}>Không có đề tài nào cần duyệt</h3>
          <p style={{ color: '#999' }}>Tất cả đề tài đã được xử lý</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {projects.map((p) => (
            <div 
              key={p.id} 
              style={{ 
                background: "white", 
                borderRadius: 12, 
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)", 
                borderLeft: "4px solid #faad14",
                overflow: 'hidden'
              }}
            >
              {/* Card Header - Clickable */}
              <div 
                onClick={() => toggleDetail(p.id)}
                style={{ 
                  padding: 20, 
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {getStatusBadge(p.status)}
                    <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>MÃ MÔN: {p.subjectId}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>• Ngày tạo: {formatDate(p.createdAt)}</span>
                  </div>
                  
                  <h3 style={{ margin: "0 0 8px 0", color: "#333", fontSize: 18 }}>{p.name}</h3>
                  <p style={{ color: "#666", margin: 0, fontSize: 14, lineHeight: 1.5 }}>{p.description}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
                  {expandedProjectId === p.id ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedProjectId === p.id && (
                <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f0f0f0", background: '#fafafa' }}>
                  
                  {/* Deadline */}
                  <div style={{ 
                    marginTop: 16,
                    marginBottom: 16, 
                    padding: "10px 16px", 
                    background: "#fffbe6", 
                    border: "1px solid #ffe58f", 
                    borderRadius: 8, 
                    display: "inline-block" 
                  }}>
                    📅 <strong>Deadline dự án:</strong> <span style={{ color: "#d4380d", fontWeight: 600 }}>{formatDate(p.deadline ?? undefined)}</span>
                  </div>

                  {/* Milestones Table */}
                  <h4 style={{ margin: "0 0 12px 0", color: "#1890ff", fontSize: 14 }}>📍 Lộ trình thực hiện (Milestones)</h4>
                  {p.milestones && p.milestones.length > 0 ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "white", borderRadius: 8, overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: "#f5f5f5" }}>
                          <th style={{ padding: 12, textAlign: 'left', borderBottom: "1px solid #e8e8e8" }}>Giai đoạn</th>
                          <th style={{ padding: 12, textAlign: 'left', borderBottom: "1px solid #e8e8e8" }}>Mô tả</th>
                          <th style={{ padding: 12, textAlign: 'left', borderBottom: "1px solid #e8e8e8", width: 120 }}>Hạn chót</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {p.milestones.map((m: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: 12, fontWeight: 500 }}>{m.title || m.name || m.Title}</td>
                            <td style={{ padding: 12, color: "#666" }}>{m.description || '-'}</td>
                            <td style={{ padding: 12, color: "#e67e22", fontWeight: 600 }}>{formatDate(m.deadline)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ fontStyle: "italic", color: "#999", margin: 0 }}>Chưa có lộ trình cụ thể.</p>
                  )}

                  {/* Quick Assign Class (for approved projects) */}
                  {isApproved(p.status) && (
                    <div style={{ marginTop: 16, padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#389e0d' }}>📢 Phân công lớp:</span>
                        {p.assignedClassIds && p.assignedClassIds.split(',').map((cls, idx) => (
                          <span key={idx} style={{ background: "#fff", border: "1px solid #52c41a", color: "#52c41a", padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                            {cls}
                          </span>
                        ))}
                        <select 
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddClass(p.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 12, marginLeft: 'auto' }}
                        >
                          <option value="">+ Thêm lớp...</option>
                          {classes
                            .filter(cls => cls.subjectCode === p.subjectId)
                            .map(cls => (
                              <option key={cls.id} value={cls.code}>{cls.code}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Pending */}
                  {isPending(p.status) && (
                    <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button 
                        onClick={(e) => handleReject(p.id, e)} 
                        style={{ 
                          padding: "10px 24px", 
                          background: "white", 
                          border: "1px solid #ff4d4f", 
                          color: "#ff4d4f", 
                          borderRadius: 6, 
                          cursor: "pointer", 
                          fontWeight: 600,
                          fontSize: 14
                        }}
                      >
                        ✕ Từ chối
                      </button>
                      <button 
                        onClick={(e) => handleApprove(p.id, e)} 
                        style={{ 
                          padding: "10px 24px", 
                          background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)", 
                          border: "none", 
                          color: "white", 
                          borderRadius: 6, 
                          cursor: "pointer", 
                          fontWeight: 600,
                          fontSize: 14
                        }}
                      >
                        ✓ DUYỆT NGAY
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
