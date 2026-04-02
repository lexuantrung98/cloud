import React, { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, Clock, X, Calendar, User, Send, FileText, Download, Link as LinkIcon, MessageCircle, Star } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { addMilestoneComment, getMilestoneComments, gradeMilestone, getMilestoneGrades } from "../../../api/projectApi";

interface GroupMilestone {
  id: string;
  groupId: string;
  title: string;
  description: string;
  deadline: string;
  isCompleted: boolean;
  createdAt: string;
  assignedTo?: string;
  submittedBy?: string;
  submissionContent?: string;
  submissionFilePath?: string;
  submittedAt?: string;
}

interface MilestoneComment {
  id: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
}

interface MilestoneGrade {
  id: string;
  graderName: string;
  graderRole: string;
  score: number;
  feedback?: string;
  gradedAt: string;
}

interface GradesData {
  allGrades: MilestoneGrade[];
  averagePeerGrade: number | null;
  lecturerGrade: MilestoneGrade | null;
}

// Get current user from localStorage
const getCurrentUserId = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  return user?.studentId || user?.code || user?.userId || '';
};

// Check if current user is the leader
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCurrentUserLeader = (members: any[]) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !members || members.length === 0) return false;
  
  const currentMember = members.find(m => 
    m.studentCode === currentUserId || 
    m.StudentCode === currentUserId || 
    m.studentId === currentUserId || 
    m.StudentId === currentUserId
  );
  
  return currentMember?.role === 'Leader' || currentMember?.Role === 'Leader';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function GroupMilestones({ groupId, members = [] }: { groupId?: string; members?: any[] }) {
  const [milestones, setMilestones] = useState<GroupMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<GroupMilestone | null>(null);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  
  const [submitType, setSubmitType] = useState<"file" | "link">("link");
  const [submitContent, setSubmitContent] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);

  // Comments & Grading state
  const [milestoneComments, setMilestoneComments] = useState<Record<string, MilestoneComment[]>>({});
  const [milestoneGrades, setMilestoneGrades] = useState<Record<string, GradesData>>({});
  const [newComment, setNewComment] = useState("");
  const [selectedMilestoneForComment, setSelectedMilestoneForComment] = useState<string | null>(null);
  const [gradeScores, setGradeScores] = useState<Record<string, number>>({});
  const [gradeFeedbacks, setGradeFeedbacks] = useState<Record<string, string>>({});

  const isLeader = isCurrentUserLeader(members);
  const currentUserId = getCurrentUserId();

  const loadMilestones = async () => {
    if (!groupId || groupId === "DEFAULT_GROUP") return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5234/api/GroupMilestones/group/${groupId}`);
      setMilestones(response.data || []);
    } catch {
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Auto-load grades for completed milestones
  useEffect(() => {
    milestones.forEach(m => {
      if (m.isCompleted) {
        loadGrades(m.id);
      }
    });
  }, [milestones]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề!");
      return;
    }

    try {
      await axios.post("http://localhost:5234/api/GroupMilestones", {
        groupId,
        title: newTitle,
        description: newDesc,
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        assignedTo: newAssignee || null,
      });
      toast.success("✅ Đã tạo mốc kiểm tra!");
      setShowModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewDeadline("");
      setNewAssignee("");
      loadMilestones();
    } catch {
      toast.error("Lỗi tạo mốc kiểm tra!");
    }
  };

  const handleSubmit = async () => {
    if (!selectedMilestone) return;
    
    if (submitType === "file" && !submitFile) {
      toast.error("Vui lòng chọn file!");
      return;
    }
    if (submitType === "link" && !submitContent.trim()) {
      toast.error("Vui lòng nhập link!");
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("SubmittedBy", currentUserId);
      
      if (submitType === "file" && submitFile) {
        formData.append("File", submitFile);
        formData.append("SubmissionContent", submitFile.name);
      } else {
        formData.append("SubmissionContent", submitContent);
      }
      
      await axios.post(`http://localhost:5234/api/GroupMilestones/${selectedMilestone.id}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      toast.success("🎉 Đã nộp bài!");
      setShowSubmitModal(false);
      setSubmitContent("");
      setSubmitFile(null);
      setSelectedMilestone(null);
      loadMilestones();
    } catch {
      toast.error("Lỗi nộp bài!");
    }
  };

  // Load comments for a milestone
  const loadComments = async (milestoneId: string) => {
    try {
      const response = await getMilestoneComments(milestoneId);
      console.log('📝 Load Comments Response:', response);
      setMilestoneComments(prev => ({ ...prev, [milestoneId]: response as unknown as MilestoneComment[] }));
    } catch {
      setMilestoneComments(prev => ({ ...prev, [milestoneId]: [] }));
    }
  };

  // Load grades for a milestone
  const loadGrades = async (milestoneId: string) => {
    try {
      const response = await getMilestoneGrades(milestoneId);
      setMilestoneGrades(prev => ({ ...prev, [milestoneId]: response as unknown as GradesData }));
    } catch {
      setMilestoneGrades(prev => ({ ...prev, [milestoneId]: { allGrades: [], averagePeerGrade: null, lecturerGrade: null } }));
    }
  };

  // Add comment handler
  const handleAddComment = async (milestoneId: string) => {
    if (!newComment.trim()) return;
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userName = user.fullName || user.name || 'Ẩn danh';
      
      await addMilestoneComment(milestoneId, newComment, userName);
      setNewComment("");
      toast.success("✅ Đã thêm bình luận!");
      setSelectedMilestoneForComment(milestoneId); // Auto-expand to show new comment
      // Small delay to ensure backend has saved before fetching
      setTimeout(() => loadComments(milestoneId), 300);
    } catch {
      toast.error("Lỗi thêm bình luận!");
    }
  };

  // Submit grade handler
  const handleSubmitGrade = async (milestoneId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const graderName = user.fullName || user.name || 'Ẩn danh';
      const score = gradeScores[milestoneId] ?? 5;
      const feedback = gradeFeedbacks[milestoneId] ?? "";
      
      await gradeMilestone(milestoneId, score, feedback, graderName);
      // Reset this milestone's grade inputs
      setGradeScores(prev => ({ ...prev, [milestoneId]: 5 }));
      setGradeFeedbacks(prev => ({ ...prev, [milestoneId]: "" }));
      toast.success("⭐ Đã chấm điểm!");
      // Small delay to ensure backend has saved before fetching
      setTimeout(() => loadGrades(milestoneId), 300);
    } catch {
      toast.error("Lỗi chấm điểm!");
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`http://localhost:5234/api/GroupMilestones/${id}/toggle`, {
        isCompleted: !currentStatus,
      });
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, isCompleted: !currentStatus } : m));
      toast.success(!currentStatus ? "✅ Đánh dấu hoàn thành!" : "↩️ Đã bỏ hoàn thành");
    } catch {
      toast.error("Lỗi cập nhật!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa mốc kiểm tra này?")) return;
    
    try {
      await axios.delete(`http://localhost:5234/api/GroupMilestones/${id}`);
      toast.success("Đã xóa!");
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch {
      toast.error("Lỗi xóa!");
    }
  };

  const getMemberName = (id?: string) => {
    if (!id) return "Chưa gán";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = members.find((x: any) => 
      x.studentCode === id || 
      x.StudentCode === id || 
      x.studentId === id || 
      x.StudentId === id
    );
    return m ? (m.fullName || m.FullName || id) : id;
  };

  const completed = milestones.filter(m => m.isCompleted).length;
  const total = milestones.length;

  return (
    <div style={{ background: "white", borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: 18, color: "#333" }}>📌 Mốc kiểm tra nhóm</h3>
          <div style={{ fontSize: 13, color: "#888" }}>
            Hoàn thành: {completed}/{total}
          </div>
        </div>
        {isLeader && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} /> Tạo mốc mới
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Đang tải...</div>
        ) : milestones.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p>Chưa có mốc kiểm tra nào</p>
            {isLeader && <p style={{ fontSize: 13 }}>Nhấn "Tạo mốc mới" để thêm</p>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {milestones.map((m) => {
              const isAssignedToMe = m.assignedTo === currentUserId;
              const canSubmit = (isLeader || isAssignedToMe) && !m.submittedBy;
              
              return (
                <React.Fragment key={m.id}>
                <div
                  style={{
                    padding: 16,
                    background: m.isCompleted ? "#f6ffed" : "#fafafa",
                    border: `1px solid ${m.isCompleted ? "#b7eb8f" : "#e8e8e8"}`,
                    borderRadius: 12,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={m.isCompleted}
                      onChange={() => handleToggle(m.id, m.isCompleted)}
                      disabled={!isLeader}
                      style={{
                        width: 20,
                        height: 20,
                        cursor: isLeader ? "pointer" : "not-allowed",
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: m.isCompleted ? "#52c41a" : "#333",
                          textDecoration: m.isCompleted ? "line-through" : "none",
                          marginBottom: 6,
                        }}
                      >
                        {m.title}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: 13, color: "#666", marginBottom: 8, lineHeight: 1.5 }}>
                          {m.description}
                        </div>
                      )}
                      
                      {/* Info Row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
                        {m.deadline && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#888" }}>
                            <Clock size={14} />
                            {new Date(m.deadline).toLocaleDateString("vi-VN")}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#e6f7ff", borderRadius: 4, color: "#1890ff" }}>
                          <User size={14} />
                          {getMemberName(m.assignedTo)}
                        </div>
                      </div>

                      {/* Submission Info */}
                      {m.submittedBy && (
                        <div style={{ marginTop: 8, padding: 8, background: "#f0f9ff", borderRadius: 6, fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: "#1890ff", marginBottom: 4 }}>✅ Đã nộp bài</div>
                          <div style={{ color: "#666" }}>Người nộp: {getMemberName(m.submittedBy)}</div>
                          {m.submissionFilePath ? (
                            <a
                              href={`http://localhost:5234${m.submissionFilePath}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 6,
                                padding: "4px 8px",
                                background: "#e6f7ff",
                                border: "1px solid #91d5ff",
                                borderRadius: 4,
                                color: "#1890ff",
                                textDecoration: "none",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              <Download size={14} />
                              {/* Extract original filename from path (remove GUID prefix) */}
                              {(() => {
                                const filename = m.submissionFilePath?.split('/').pop() || '';
                                return filename.split('_').slice(1).join('_') || filename;
                              })()}
                            </a>
                          ) : m.submissionContent && (
                            <div style={{ color: "#666", marginTop: 4 }}>
                              <LinkIcon size={12} style={{ display: "inline", marginRight: 4 }} />
                              <a href={m.submissionContent} target="_blank" rel="noreferrer" style={{ color: "#1890ff" }}>
                                {m.submissionContent}
                              </a>
                            </div>
                          )}
                          {m.submittedAt && (
                            <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                              {new Date(m.submittedAt).toLocaleString("vi-VN")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", gap: 8 }}>
                      {canSubmit && (
                        <button
                          onClick={() => { setSelectedMilestone(m); setShowSubmitModal(true); }}
                          style={{
                            padding: "6px 12px",
                            background: "#52c41a",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <Send size={14} style={{ display: "inline", marginRight: 4 }} />
                          Nộp bài
                        </button>
                      )}
                      {isLeader && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#ff4d4f",
                            cursor: "pointer",
                            padding: 4,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments & Grading Section - Below milestone card */}
                {m.isCompleted && (
                  <div style={{ marginTop: 16 }}>
                    {/* Comments Section */}
                    <div style={{ 
                      background: "#fafafa", 
                      border: "1px solid #e8e8e8", 
                      borderRadius: 8, 
                      padding: 16,
                      marginBottom: 12
                    }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <MessageCircle size={16} /> Bình luận
                        <button
                          onClick={() => {
                            loadComments(m.id);
                            setSelectedMilestoneForComment(selectedMilestoneForComment === m.id ? null : m.id);
                          }}
                          style={{
                            marginLeft: "auto",
                            padding: "4px 8px",
                            fontSize: 11,
                            background: "#f0f0f0",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer"
                          }}
                        >
                          {selectedMilestoneForComment === m.id ? "Ẩn" : "Xem"}
                        </button>
                      </h4>

                      {selectedMilestoneForComment === m.id && (
                        <>
                          {/* Comments List */}
                          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                            {(milestoneComments[m.id] || []).length > 0 ? (
                              milestoneComments[m.id].map((comment) => (
                                <div key={comment.id} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{comment.userName}</div>
                                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{comment.content}</div>
                                  <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                                    {new Date(comment.createdAt).toLocaleString("vi-VN")}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: 12, color: "#999", padding: "12px 0" }}>Chưa có bình luận nào</div>
                            )}
                          </div>

                          {/* Add Comment Form */}
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Thêm bình luận..."
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6,
                                fontSize: 12
                              }}
                              onKeyPress={(e) => e.key === "Enter" && handleAddComment(m.id)}
                            />
                            <button
                              onClick={() => handleAddComment(m.id)}
                              style={{
                                padding: "8px 16px",
                                background: "#1890ff",
                                color: "white",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12
                              }}
                            >
                              Gửi
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Grading Section */}
                    <div style={{ 
                      background: "#fafafa", 
                      border: "1px solid #e8e8e8", 
                      borderRadius: 8, 
                      padding: 16 
                    }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Star size={16} /> Peer Grading
                        <button
                          onClick={() => loadGrades(m.id)}
                          style={{
                            marginLeft: "auto",
                            padding: "4px 8px",
                            fontSize: 11,
                            background: "#f0f0f0",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer"
                          }}
                        >
                          Tải điểm
                        </button>
                      </h4>

                      {/* Grade Display */}
                      {milestoneGrades[m.id] && (
                        <div style={{ marginBottom: 12 }}>
                          {milestoneGrades[m.id].averagePeerGrade !== null && (
                            <div style={{
                              padding: "8px 12px",
                              background: "#f6ffed",
                              border: "1px solid #b7eb8f",
                              borderRadius: 6,
                              marginBottom: 8
                            }}>
                              <strong>Điểm TB nhóm:</strong> {milestoneGrades[m.id].averagePeerGrade?.toFixed(1)}/10
                            </div>
                          )}

                          {milestoneGrades[m.id].allGrades.length > 0 && (
                            <details style={{ fontSize: 12 }}>
                              <summary style={{ cursor: "pointer", color: "#1890ff" }}>
                                Xem chi tiết ({milestoneGrades[m.id].allGrades.length} đánh giá)
                              </summary>
                              <div style={{ marginTop: 8 }}>
                                {milestoneGrades[m.id].allGrades.map((grade) => (
                                  <div key={grade.id} style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                                    <strong>{grade.graderName}:</strong> {grade.score}/10
                                    {grade.feedback && <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{grade.feedback}</div>}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}

                      {/* Grade Form */}
                      <div style={{ background: "#ffffff", padding: 12, borderRadius: 6, border: "1px solid #e8e8e8" }}>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Điểm (0-10): {gradeScores[m.id] ?? 5}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={gradeScores[m.id] ?? 5}
                            onChange={(e) => setGradeScores(prev => ({ ...prev, [m.id]: parseFloat(e.target.value) }))}
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <textarea
                            value={gradeFeedbacks[m.id] ?? ""}
                            onChange={(e) => setGradeFeedbacks(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="Nhận xét (tùy chọn)..."
                            style={{
                              width: "100%",
                              padding: 8,
                              border: "1px solid #d9d9d9",
                              borderRadius: 4,
                              fontSize: 12,
                              minHeight: 50,
                              boxSizing: "border-box"
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleSubmitGrade(m.id)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            background: "#faad14",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          ⭐ Chấm điểm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1300, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "white", padding: 30, borderRadius: 16, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>Tạo mốc kiểm tra mới</h3>
              <X size={24} style={{ cursor: "pointer" }} onClick={() => setShowModal(false)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Tiêu đề</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ví dụ: Hoàn thành giao diện login"
                style={{ width: "100%", padding: 12, border: "1px solid #e8e8e8", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Mô tả</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Mô tả chi tiết..."
                style={{ width: "100%", height: 70, padding: 12, border: "1px solid #e8e8e8", borderRadius: 8, fontSize: 14, resize: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                <Calendar size={14} style={{ display: "inline", marginRight: 4 }} />
                Deadline
              </label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                style={{ width: "100%", padding: 12, border: "1px solid #e8e8e8", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                <User size={14} style={{ display: "inline", marginRight: 4 }} />
                Gán cho
              </label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                style={{ width: "100%", padding: 12, border: "1px solid #e8e8e8", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              >
                <option value="">-- Chọn thành viên --</option>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {members.map((member: any) => {
                  const memberId = member.studentCode || member.StudentCode || member.studentId || member.StudentId;
                  return (
                    <option key={memberId} value={memberId}>
                      {member.fullName || member.FullName || memberId}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer" }}>
                Hủy
              </button>
              <button onClick={handleCreate} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                <CheckCircle size={16} style={{ display: "inline", marginRight: 6 }} />
                Tạo mốc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && selectedMilestone && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1300, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "white", padding: 30, borderRadius: 16, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>Nộp bài</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#888" }}>{selectedMilestone.title}</p>
              </div>
              <X size={24} style={{ cursor: "pointer" }} onClick={() => { setShowSubmitModal(false); setSelectedMilestone(null); setSubmitContent(""); setSubmitFile(null); }} />
            </div>

            {/* File/Link Tabs */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setSubmitType("file")}
                style={{
                  flex: 1,
                  padding: 14,
                  border: submitType === "file" ? "2px solid #667eea" : "1px solid #e8e8e8",
                  color: submitType === "file" ? "#667eea" : "#666",
                  borderRadius: 12,
                  background: submitType === "file" ? "#f0f5ff" : "white",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <FileText size={20} /> Tải file lên
              </button>
              <button
                onClick={() => setSubmitType("link")}
                style={{
                  flex: 1,
                  padding: 14,
                  border: submitType === "link" ? "2px solid #667eea" : "1px solid #e8e8e8",
                  color: submitType === "link" ? "#667eea" : "#666",
                  borderRadius: 12,
                  background: submitType === "link" ? "#f0f5ff" : "white",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <LinkIcon size={20} /> Nhập link
              </button>
            </div>

            {submitType === "file" ? (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Chọn file bài làm</label>
                <div
                  style={{
                    border: "2px dashed #e8e8e8",
                    borderRadius: 12,
                    padding: 24,
                    textAlign: "center",
                    background: submitFile ? "#f6ffed" : "#fafafa",
                  }}
                >
                  <input
                    type="file"
                    onChange={(e) => setSubmitFile(e.target.files ? e.target.files[0] : null)}
                    style={{ display: "none" }}
                    id="submit-file-upload"
                  />
                  <label htmlFor="submit-file-upload" style={{ cursor: "pointer" }}>
                    {submitFile ? (
                      <div style={{ color: "#52c41a" }}>
                        <CheckCircle size={32} style={{ marginBottom: 8 }} />
                        <div style={{ fontWeight: 600 }}>{submitFile.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>Click để đổi file</div>
                      </div>
                    ) : (
                      <div style={{ color: "#888" }}>
                        <FileText size={32} style={{ marginBottom: 8 }} />
                        <div>Kéo thả hoặc click để chọn file</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                  <LinkIcon size={14} style={{ display: "inline", marginRight: 4 }} />
                  Link bài làm
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... hoặc https://github.com/..."
                  value={submitContent}
                  onChange={(e) => setSubmitContent(e.target.value)}
                  style={{ width: "100%", padding: 14, border: "1px solid #e8e8e8", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => { setShowSubmitModal(false); setSelectedMilestone(null); setSubmitContent(""); setSubmitFile(null); }} style={{ padding: "10px 20px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer" }}>
                Hủy
              </button>
              <button onClick={handleSubmit} style={{ padding: "10px 24px", background: "#52c41a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                <Send size={16} style={{ display: "inline", marginRight: 6 }} />
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
