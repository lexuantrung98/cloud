import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, User, Clock, MessageSquare, CheckSquare, X, Send } from "lucide-react";
import { 
  getTasksByGroup, createTask, updateTaskStatus, deleteTask, 
  addTaskComment, addSubTask, toggleSubTask
} from "../../../api/projectApi";
import { toast } from "react-toastify";

const STATUS_LABELS = ["📋 Cần làm", "🔄 Đang làm", "✅ Hoàn thành"];
const STATUS_COLORS = ["#6c757d", "#667eea", "#52c41a"];
const STATUS_BG = ["#f8f9fa", "#f0f5ff", "#f6ffed"];

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
export default function StudentKanban({ groupId = "DEFAULT_GROUP", members = [] }: { groupId?: string, members?: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeTask, setActiveTask] = useState<any>(null);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const [commentText, setCommentText] = useState("");
  const [subTaskText, setSubTaskText] = useState("");

  const loadTasks = useCallback(async () => {
    // Don't load if groupId is invalid
    if (!groupId || groupId === "DEFAULT_GROUP") {
      setTasks([]);
      return;
    }
    try {
        const data = await getTasksByGroup(groupId);
        // Ensure data is always an array
        setTasks(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error(e); 
      setTasks([]);
    }
  }, [groupId]);


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (groupId && groupId !== "DEFAULT_GROUP") loadTasks();
  }, [groupId, loadTasks]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    
    // Get current user
    const currentUserId = getCurrentUserId();
    
    // Find the task being dragged
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;
    
    // Check permission: only leader or assigned user can drag
    const isLeader = isCurrentUserLeader(members);
    const isAssignedUser = task.assignedToUserId === currentUserId || task.assignedTo === currentUserId;
    
    if (!isLeader && !isAssignedUser) {
      toast.warning('⚠️ Chỉ nhóm trưởng hoặc người được gán mới có thể di chuyển task này!');
      return;
    }
    
    const newStatus = parseInt(destination.droppableId);
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    try { await updateTaskStatus(draggableId, newStatus); } catch { loadTasks(); } 
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    // Validate groupId is a valid GUID
    if (!groupId || groupId === "DEFAULT_GROUP") {
      toast.error("GroupId không hợp lệ!");
      console.error("Invalid groupId:", groupId);
      return;
    }
    
    console.log("Creating task with groupId:", groupId);
    
    // Use PascalCase for C# backend compatibility
    const payload = {
        GroupId: groupId,
        Title: newTaskTitle,
        Description: newTaskDesc,
        Priority: 1,
        Deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
        AssignedTo: newTaskAssignee || null
    };
    try {
      await createTask(payload);
      toast.success("✅ Đã tạo task mới!");
      setShowModal(false);
      setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDeadline(""); setNewTaskAssignee("");
      loadTasks();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tạo task!");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeleteTask = async (e: any, taskId: string) => {
    e.stopPropagation();
    if (window.confirm("Xóa task này?")) {
      await deleteTask(taskId);
      toast.success("Đã xóa task!");
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if(activeTask?.id === taskId) setActiveTask(null);
    }
  };

  const handleAddComment = async () => {
      if(!commentText.trim() || !activeTask) return;
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        toast.error("Không tìm thấy thông tin người dùng!");
        return;
      }
      const res = await addTaskComment(activeTask.id, commentText, currentUserId);
      setActiveTask({...activeTask, comments: [...(activeTask.comments || []), res]});
      setCommentText("");
      loadTasks();
  };

  const handleAddSubTask = async () => {
      if(!subTaskText.trim() || !activeTask) return;
      const res = await addSubTask(activeTask.id, subTaskText);
      setActiveTask({...activeTask, subTasks: [...(activeTask.subTasks || []), res]});
      setSubTaskText("");
      loadTasks();
  };

  const handleToggleSubTask = async (subId: string) => {
      await toggleSubTask(subId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedSubs = activeTask.subTasks.map((s:any) => s.id === subId ? {...s, isDone: !s.isDone} : s);
      setActiveTask({...activeTask, subTasks: updatedSubs});
      loadTasks();
  };


  const getMemberName = (id: string) => {
      if (!members || members.length === 0) return id; 
      const m = members.find(x => (
        x.studentCode === id || 
        x.StudentCode === id || 
        x.studentId === id || 
        x.StudentId === id
      ));
      return m ? (m.fullName || m.FullName) : id;
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: "#333" }}>Quản lý công việc</h3>
        {isCurrentUserLeader(members) ? (
          <button onClick={() => setShowModal(true)} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(102,126,234,0.3)" }}>
          <Plus size={18} /> Tạo Task Mới
        </button>
        ) : (
          <div style={{ padding: "10px 20px", background: "#f0f0f0", color: "#888", borderRadius: 10, fontSize: 14 }}>
            🔒 Chỉ nhóm trưởng mới có thể tạo task
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 20, flex: 1, overflowX: "auto", paddingBottom: 10 }}>
          {[0, 1, 2].map(statusIdx => (
              <div key={statusIdx} style={{ flex: 1, minWidth: 300, background: STATUS_BG[statusIdx], borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", border: `1px solid ${STATUS_COLORS[statusIdx]}20` }}>
                <div style={{ padding: "14px 16px", background: "white", borderRadius: 12, marginBottom: 16, fontWeight: 600, borderLeft: `4px solid ${STATUS_COLORS[statusIdx]}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <span style={{ color: STATUS_COLORS[statusIdx] }}>{STATUS_LABELS[statusIdx]}</span>
                  <span style={{ background: STATUS_COLORS[statusIdx], color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {tasks.filter(t => t.status === statusIdx).length}
                  </span>
                </div>
                <Droppable droppableId={statusIdx.toString()}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} style={{ flex: 1, minHeight: 100, display: "flex", flexDirection: "column", gap: 10 }}>
                      {tasks.filter(t => t.status === statusIdx).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setActiveTask(task)} style={{ background: "white", padding: 15, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", cursor: "pointer", ...provided.draggableProps.style }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <div style={{ fontWeight: "600", fontSize: 15, color: "#000000ff" }}>{task.title}</div>
                                <button onClick={(e) => handleDeleteTask(e, task.id)} style={{ border: "none", background: "transparent", color: "#ff4d4f", cursor: "pointer" }}><Trash2 size={14} /></button>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#666" }}>
                                {task.assignedToUserId && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#e6f7ff", padding: "2px 8px", borderRadius: 10, color: "#1890ff" }}>
                                        <User size={12} /> {getMemberName(task.assignedToUserId)}
                                    </div>
                                )}
                                {task.deadline && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff1f0", padding: "2px 8px", borderRadius: 10, color: "#ff4d4f" }}>
                                        <Clock size={12} /> {new Date(task.deadline).toLocaleDateString()}
                                    </div>
                                )}
                              </div>
                              <div style={{ marginTop: 10, display: "flex", gap: 15, color: "#747272ff", fontSize: 12 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}><MessageSquare size={12}/> {task.comments?.length || 0}</div>
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}><CheckSquare size={12}/> {task.subTasks?.filter((s:any) => s.isDone).length}/{task.subTasks?.length || 0}</div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
          ))}
        </div>
      </DragDropContext>

      {/* MODAL TẠO TASK */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 30, borderRadius: 12, width: 450 }}>
            <h3 style={{ marginTop: 0 }}>Tạo công việc mới</h3>
            <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Tên công việc..." style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6, marginBottom: 15 }} />
            <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Mô tả..." style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6, marginBottom: 15, height: 80 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 20 }}>
                <div>
                    <label style={{ fontSize: 12, fontWeight: "bold" }}>Hạn chót</label>
                    <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginTop: 5 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: "bold" }}>Gán cho</label>
                    <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginTop: 5 }}>
                        <option value="">-- Chọn --</option>
                        {members.map(m => {
                            const memberId = m.studentCode || m.StudentCode || m.studentId || m.StudentId;
                            const memberName = m.fullName || m.FullName || memberId;
                            return (
                                <option key={memberId} value={memberId}>
                                    {memberName}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "8px 20px", background: "#eee", border: "none", borderRadius: 6, cursor: "pointer" }}>Hủy</button>
                <button onClick={handleCreateTask} style={{ padding: "8px 20px", background: "#28a745", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>Tạo Task</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT TASK */}
      {activeTask && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1100 }}>
            <div style={{ background: "white", width: 800, height: "80vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
                <div style={{ padding: "20px 30px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{activeTask.title}</h2>
                    <X style={{ cursor: "pointer" }} onClick={() => setActiveTask(null)} />
                </div>
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                    {/* CỘT TRÁI: CHI TIẾT */}
                    <div style={{ flex: 2, padding: 30, overflowY: "auto", borderRight: "1px solid #eee" }}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontWeight: "bold", fontSize: 12, color: "#888", display: "block", marginBottom: 5 }}>MÔ TẢ</label>
                            <p style={{ margin: 0, lineHeight: 1.5, color: "#333" }}>{activeTask.description || "Không có mô tả"}</p>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontWeight: "bold", fontSize: 12, color: "#888", display: "block", marginBottom: 10 }}>CHECKLIST CÔNG VIỆC</label>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {activeTask.subTasks?.map((sub: any) => (
                                <div key={sub.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f9f9f9" }}>
                                    <input type="checkbox" checked={sub.isDone} onChange={() => handleToggleSubTask(sub.id)} style={{ cursor: "pointer", width: 16, height: 16 }} />
                                    <span style={{ textDecoration: sub.isDone ? "line-through" : "none", color: sub.isDone ? "#aaa" : "#333", flex: 1 }}>{sub.content}</span>
                                </div>
                            ))}
                            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
                                <input value={subTaskText} onChange={e => setSubTaskText(e.target.value)} placeholder="Thêm việc nhỏ..." style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd" }} />
                                <button onClick={handleAddSubTask} style={{ background: "#f0f0f0", border: "none", padding: "0 15px", borderRadius: 6, cursor: "pointer" }}>Thêm</button>
                            </div>
                        </div>
                    </div>
                    
                    {/* CỘT PHẢI: BÌNH LUẬN */}
                    <div style={{ flex: 1.2, background: "#f9fafb", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "15px 20px", fontWeight: "bold", borderBottom: "1px solid #eee", background: "white" }}>Bình luận</div>
                        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 15 }}>
                            {activeTask.comments?.length === 0 && <div style={{textAlign: "center", color: "#999", fontSize: 13, marginTop: 20}}>Chưa có bình luận nào</div>}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {activeTask.comments?.map((c: any) => (
                                <div key={c.id}>
                                    <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 4, color: "#555" }}>
                                        {getMemberName(c.createdByUserId)}
                                    </div>
                                    <div style={{ background: "white", padding: "8px 12px", borderRadius: "0 12px 12px 12px", border: "1px solid #eee", fontSize: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", display: "inline-block" }}>
                                        {c.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* INPUT BÌNH LUẬN MỚI */}
                        <div style={{ padding: 15, borderTop: "1px solid #eee", background: "white" }}>
                             <div style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #ddd", borderRadius: 25, padding: "5px 5px 5px 15px", background: "white" }}>
                                <input 
                                    value={commentText} 
                                    onChange={e => setCommentText(e.target.value)} 
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                    placeholder="Viết bình luận..." 
                                    style={{ flex: 1, border: "none", outline: "none", fontSize: 14 }} 
                                />
                                <button 
                                    onClick={handleAddComment} 
                                    style={{ 
                                        width: 32, height: 32, borderRadius: "50%", border: "none", 
                                        background: commentText.trim() ? "#1890ff" : "#f0f0f0", 
                                        color: commentText.trim() ? "white" : "#ccc", 
                                        cursor: commentText.trim() ? "pointer" : "default",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    <Send size={16} />
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
