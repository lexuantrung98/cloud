import { useState } from "react";
import { Upload, FileText, Link as LinkIcon, CheckCircle, Clock, X, Award, Star, Send, Download } from "lucide-react";
import { submitWork } from "../../../api/projectApi";
import { toast } from "react-toastify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function StudentMilestones({ project, submissions, groupId, refreshData }: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeMilestone, setActiveMilestone] = useState<any>(project?.milestones?.[0] || null);
  const [showModal, setShowModal] = useState(false);
  const [submitType, setSubmitType] = useState<"file" | "link">("file");
  const [submitLink, setSubmitLink] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitDesc, setSubmitDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSubmission = activeMilestone ? submissions.find((s:any) => s.projectMilestoneId === activeMilestone.id || s.milestoneId === activeMilestone.id) : null;

  const handleOpenModal = () => {
      if (currentSubmission?.content?.includes("/uploads/")) {
          setSubmitType("file"); setSubmitLink("");
      } else {
          setSubmitType("link"); setSubmitLink(currentSubmission?.content || "");
      }
      setSubmitDesc(currentSubmission?.description || "");
      setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!activeMilestone) return;
    if (submitType === "file" && !submitFile) {
      toast.error("Vui lòng chọn file để nộp!");
      return;
    }
    if (submitType === "link" && !submitLink.trim()) {
      toast.error("Vui lòng nhập đường dẫn!");
      return;
    }
    
    setSubmitting(true);
    try {
      // Build FormData for file upload support
      const formData = new FormData();
      formData.append('ProjectId', project.id);
      formData.append('TeamId', groupId);
      formData.append('MilestoneId', activeMilestone.id);
      formData.append('Description', submitDesc);
      
      if (submitType === 'file' && submitFile) {
        formData.append('File', submitFile);
      } else if (submitType === 'link') {
        formData.append('Content', submitLink);
      }
      
      await submitWork(formData);
      toast.success("🎉 Nộp bài thành công!");
      setShowModal(false);
      setSubmitFile(null);
      setSubmitLink("");
      setSubmitDesc("");
      if(refreshData) refreshData();
    } catch { 
      toast.error("Lỗi khi nộp bài. Vui lòng thử lại."); 
    } finally {
      setSubmitting(false);
    }
  };

  const totalMilestones = project?.milestones?.length || 0;
  const submittedCount = submissions.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gradedCount = submissions.filter((s: any) => s.grade !== null && s.grade !== undefined).length;

  return (
    <div style={{ display: "flex", gap: 20, minHeight: 500 }}>
      {/* Sidebar chọn Giai đoạn */}
      <div style={{ width: 320, background: "white", borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: 20, borderBottom: "1px solid #f0f0f0", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Lộ trình Dự án</h3>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            Đã nộp: {submittedCount}/{totalMilestones} | Đã chấm: {gradedCount}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {/* eslint-disable @typescript-eslint/no-explicit-any */}
            {project?.milestones?.map((ms: any, index: number) => {
                const sub = submissions.find((s:any) => s.projectMilestoneId === ms.id || s.milestoneId === ms.id);
                const isActive = activeMilestone?.id === ms.id;
                const isGraded = sub?.grade !== null && sub?.grade !== undefined;
                
                return (
                    <div 
                        key={ms.id} onClick={() => setActiveMilestone(ms)}
                        style={{ 
                            padding: "14px 16px", marginBottom: 8, borderRadius: 12, cursor: "pointer",
                            background: isActive ? "linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)" : "#fafafa",
                            border: isActive ? "2px solid #667eea" : "1px solid #e8e8e8",
                            transition: "all 0.2s"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ 
                            width: 32, height: 32, borderRadius: "50%", 
                            background: sub ? (isGraded ? "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)") : "#e8e8e8",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 600
                          }}>
                            {sub ? (isGraded ? <Award size={16} /> : <CheckCircle size={16} />) : index + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? "#667eea" : "#333", marginBottom: 2 }}>
                              {ms.title || ms.name || ms.Title}
                            </div>
                            <div style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
                              <Clock size={12} /> {ms.deadline ? new Date(ms.deadline).toLocaleDateString('vi-VN') : "Chưa có deadline"}
                            </div>
                          </div>
                          {isGraded && (
                            <div style={{ background: "#f6ffed", padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#52c41a" }}>
                              {sub.grade}/10
                            </div>
                          )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Nội dung chi tiết */}
      <div style={{ flex: 1, background: "white", borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", padding: 24, overflowY: "auto" }}>
        {activeMilestone ? (
            <>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ margin: "0 0 8px 0", color: "#333", fontSize: 22 }}>{activeMilestone.title || activeMilestone.name || activeMilestone.Title}</h2>
                  <div style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={14} /> Deadline: {activeMilestone.deadline ? new Date(activeMilestone.deadline).toLocaleDateString('vi-VN') : "Chưa xác định"}
                    </span>
                  </div>
                </div>

                {/* Yêu cầu */}
                <div style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)", padding: 20, borderRadius: 12, marginBottom: 24, border: "1px solid #91d5ff" }}>
                    <div style={{ fontWeight: 600, color: "#0c4a6e", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={18} /> Yêu cầu của Milestone
                    </div>
                    <p style={{ margin: 0, color: "#0c4a6e", lineHeight: 1.6 }}>{activeMilestone.description || "Chưa có mô tả chi tiết"}</p>
                </div>

                {/* Trạng thái nộp bài */}
                <div style={{ border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                    <div style={{ 
                      padding: 20, 
                      background: currentSubmission ? "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)" : "#fafafa", 
                      display: "flex", justifyContent: "space-between", alignItems: "center" 
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ 
                              width: 48, height: 48, 
                              background: currentSubmission ? "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)" : "#e8e8e8", 
                              borderRadius: "50%", 
                              display: "flex", alignItems: "center", justifyContent: "center", 
                              color: "white" 
                            }}>
                                {currentSubmission ? <CheckCircle size={24}/> : <Upload size={24} color="#999"/>}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 16, color: currentSubmission ? "#389e0d" : "#333" }}>
                                  {currentSubmission ? "✓ Đã nộp bài" : "Chưa nộp bài"}
                                </div>
                                <div style={{ fontSize: 13, color: "#888" }}>
                                  {currentSubmission 
                                    ? `Nộp lúc: ${new Date(currentSubmission.submittedAt).toLocaleString('vi-VN')}` 
                                    : "Hãy nộp bài trước deadline"}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            {currentSubmission && (
                              <>
                                {currentSubmission.content?.includes("/uploads/") ? (
                                    <a href={`http://localhost:5234${currentSubmission.content}`} target="_blank" rel="noreferrer" 
                                       style={{ fontSize: 13, color: "#667eea", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", background: "#f0f5ff", padding: "8px 12px", borderRadius: 8 }}>
                                      <Download size={16}/> 
                                      {/* Extract filename without GUID */}
                                      {(() => {
                                        const filename = currentSubmission.content?.split('/').pop() || '';
                                        return filename.split('_').slice(1).join('_') || 'Tải file';
                                      })()}
                                    </a>
                                ) : currentSubmission.content && (
                                    <a href={currentSubmission.content} target="_blank" rel="noreferrer" 
                                       style={{ fontSize: 13, color: "#667eea", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", background: "#f0f5ff", padding: "8px 12px", borderRadius: 8 }}>
                                      <LinkIcon size={16}/> Xem link
                                    </a>
                                )}
                              </>
                            )}
                            <button onClick={currentSubmission ? handleOpenModal : () => setShowModal(true)} 
                              style={{ 
                                background: currentSubmission ? "white" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                                color: currentSubmission ? "#667eea" : "white", 
                                border: currentSubmission ? "1px solid #667eea" : "none", 
                                padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                                display: "flex", alignItems: "center", gap: 6
                              }}>
                              <Send size={16} /> {currentSubmission ? "Nộp lại" : "Nộp bài ngay"}
                            </button>
                        </div>
                    </div>
                    
                    {/* Điểm số */}
                    {currentSubmission?.grade !== null && currentSubmission?.grade !== undefined && (
                        <div style={{ padding: 20, background: "linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)", borderTop: "1px solid #ffe58f" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Award size={24} color="#d48806" />
                                <div>
                                  <div style={{ fontSize: 12, color: "#d48806", fontWeight: 600 }}>ĐIỂM SỐ</div>
                                  <div style={{ fontSize: 28, fontWeight: 700, color: "#d48806" }}>
                                    {currentSubmission.grade}<span style={{ fontSize: 16 }}>/10</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ flex: 1, marginLeft: 20, paddingLeft: 20, borderLeft: "2px solid #ffe58f" }}>
                                <div style={{ fontSize: 12, color: "#d48806", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <Star size={14} /> Nhận xét từ Giảng viên
                                </div>
                                <p style={{ margin: 0, color: "#8b5a00", fontStyle: "italic", lineHeight: 1.5 }}>
                                  "{currentSubmission.feedback || "Chưa có nhận xét"}"
                                </p>
                              </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ghi chú đã nộp */}
                {currentSubmission?.description && (
                  <div style={{ background: "#fafafa", padding: 16, borderRadius: 12, border: "1px solid #e8e8e8" }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 600 }}>📝 Ghi chú của bạn:</div>
                    <p style={{ margin: 0, color: "#555", fontSize: 14 }}>{currentSubmission.description}</p>
                  </div>
                )}
            </>
        ) : (
            <div style={{ textAlign: "center", color: "#999", padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p>Chọn một giai đoạn từ danh sách bên trái để xem chi tiết</p>
            </div>
        )}
      </div>

      {/* Modal Nộp bài */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "white", padding: 30, borderRadius: 16, width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                     <div>
                       <h3 style={{ margin: 0, fontSize: 20, color: "#333" }}>Nộp bài</h3>
                       <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#888" }}>{activeMilestone?.title || activeMilestone?.name}</p>
                     </div>
                     <X size={24} style={{ cursor: "pointer", color: "#999" }} onClick={() => setShowModal(false)} />
                </div>
                
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <button onClick={() => setSubmitType("file")} style={{ 
                      flex: 1, padding: 14, 
                      border: submitType === "file" ? "2px solid #667eea" : "1px solid #e8e8e8", 
                      color: submitType === "file" ? "#667eea" : "#666", 
                      borderRadius: 12, 
                      background: submitType === "file" ? "#f0f5ff" : "white", 
                      fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: "pointer"
                    }}>
                      <FileText size={20}/> Tải file lên
                    </button>
                    <button onClick={() => setSubmitType("link")} style={{ 
                      flex: 1, padding: 14, 
                      border: submitType === "link" ? "2px solid #667eea" : "1px solid #e8e8e8", 
                      color: submitType === "link" ? "#667eea" : "#666", 
                      borderRadius: 12, 
                      background: submitType === "link" ? "#f0f5ff" : "white", 
                      fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: "pointer"
                    }}>
                      <LinkIcon size={20}/> Nhập link
                    </button>
                </div>

                {submitType === "file" ? (
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#333" }}>Chọn file bài làm</label>
                        <div style={{ 
                          border: "2px dashed #e8e8e8", borderRadius: 12, padding: 24, textAlign: "center",
                          background: submitFile ? "#f6ffed" : "#fafafa"
                        }}>
                          <input type="file" onChange={e => setSubmitFile(e.target.files ? e.target.files[0] : null)} 
                            style={{ display: "none" }} id="file-upload" />
                          <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                            {submitFile ? (
                              <div style={{ color: "#52c41a" }}>
                                <CheckCircle size={32} style={{ marginBottom: 8 }} />
                                <div style={{ fontWeight: 600 }}>{submitFile.name}</div>
                                <div style={{ fontSize: 12, color: "#888" }}>Click để đổi file</div>
                              </div>
                            ) : (
                              <div style={{ color: "#888" }}>
                                <Upload size={32} style={{ marginBottom: 8 }} />
                                <div>Kéo thả hoặc click để chọn file</div>
                              </div>
                            )}
                          </label>
                        </div>
                    </div>
                ) : (
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#333" }}>Đường dẫn bài làm</label>
                        <input type="text" placeholder="https://drive.google.com/..." value={submitLink} onChange={e => setSubmitLink(e.target.value)} 
                          style={{ width: "100%", padding: 14, border: "1px solid #e8e8e8", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                    </div>
                )}
                
                <div style={{ marginBottom: 24 }}>
                     <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#333" }}>Ghi chú cho Giảng viên</label>
                     <textarea value={submitDesc} onChange={e => setSubmitDesc(e.target.value)} placeholder="Nhập lời nhắn hoặc ghi chú..." 
                       style={{ width: "100%", height: 100, padding: 14, border: "1px solid #e8e8e8", borderRadius: 10, resize: "none", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button onClick={() => setShowModal(false)} 
                      style={{ padding: "12px 24px", background: "#f0f0f0", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                      Hủy
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                      style={{ 
                        padding: "12px 32px", 
                        background: submitting ? "#d1d5db" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                        color: "white", border: "none", borderRadius: 10, 
                        cursor: submitting ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14,
                        display: "flex", alignItems: "center", gap: 8
                      }}>
                      {submitting ? "Đang nộp..." : <><Send size={16} /> Nộp bài</>}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
