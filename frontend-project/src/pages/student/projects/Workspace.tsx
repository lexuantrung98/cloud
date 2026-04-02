import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, ListTodo, CheckCircle, Users, Clock, TrendingUp, Target, CheckSquare } from "lucide-react";
import { getMyGroup, getSubmissionsByProject, getTasksByGroup, getGroupFinalGrade, type ProjectGroup, type Submission, type Task } from "../../../api/projectApi";
import StudentKanban from "./StudentKanban";
import StudentMilestones from "./StudentMilestones";
import GroupMilestones from "./GroupMilestones";

export default function Workspace() {
  const { projectId: groupId } = useParams(); // Route uses projectId but it's actually groupId
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [finalGrade, setFinalGrade] = useState<any>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]); // loadData changes when groupId changes via useCallback

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // If no groupId in URL, cannot load data
      if (!groupId) {
        console.error("No groupId in URL");
        setLoading(false);
        return;
      }
      
      // Get current user from localStorage (real user data)
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const studentId = currentUser?.studentId || currentUser?.code || currentUser?.userId;
      
      if (!studentId) {
        console.error("No student ID found in user data");
        setLoading(false);
        return;
      }
      
      // API now returns array of all groups
      const myGroups = await getMyGroup(studentId);
      
      // Find the specific group from URL groupId
      let targetGroup: ProjectGroup | null = null;
      if (myGroups && Array.isArray(myGroups)) {
        targetGroup = myGroups.find((g: ProjectGroup) => g.id === groupId) || null;
      }
      
      setGroup(targetGroup);

      if (targetGroup) {
        if (targetGroup.projectTemplateId) {
            const subs = (await getSubmissionsByProject(targetGroup.projectTemplateId)) as unknown as Submission[];
            setSubmissions(subs.filter((s: Submission) => s.projectGroupId === targetGroup.id));
        }
        const t = await getTasksByGroup(targetGroup.id);
        setTasks(Array.isArray(t) ? t : []);
        
        // Load final grade
        try {
          const grade = await getGroupFinalGrade(targetGroup.id);
          setFinalGrade(grade);
        } catch {
          console.log('No final grade yet');
          setFinalGrade(null);
        }
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, [groupId]); // Add groupId as dependency

  const calculateContribution = (studentId: string) => {
      // Get done tasks
      const doneTasks = tasks.filter(t => t.status === 2);
      if (doneTasks.length === 0) return 0;
      
      // Calculate total weighted contribution (complexity * hours)
      const totalWeight = doneTasks.reduce((sum, t) => 
        sum + ((t.complexityWeight || 1) * (t.estimatedHours || 1)), 0);
      
      if (totalWeight === 0) return 0;
      
      // Calculate this student's weighted contribution
      const myTasks = doneTasks.filter(t => 
        t.assignedToUserId === studentId || t.assignedTo === studentId
      );
      
      const myWeight = myTasks.reduce((sum, t) => 
        sum + ((t.complexityWeight || 1) * (t.estimatedHours || 1)), 0);
      
      return Math.round((myWeight / totalWeight) * 100);
  };

  const projectProgress = group?.projectTemplate?.milestones 
    ? Math.round((submissions.length / group.projectTemplate.milestones.length) * 100) 
    : 0;

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 0).length,
    inProgress: tasks.filter(t => t.status === 1).length,
    done: tasks.filter(t => t.status === 2).length,
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
      <div style={{ textAlign: "center", color: "#888" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #f3f3f3", borderTop: "4px solid #667eea", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
        <p>Đang tải dữ liệu...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
  
  if (!group) return (
    <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 16, margin: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <h3>Không tìm thấy nhóm</h3>
      <p style={{ color: "#888" }}>Bạn chưa tham gia nhóm dự án nào.</p>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: BarChart3 },
    { id: "kanban", label: "Kanban Board", icon: ListTodo },
    { id: "groupCheckpoints", label: "Mốc kiểm tra nhóm", icon: CheckSquare },
    { id: "milestones", label: "Lộ trình & Nộp bài", icon: CheckCircle },
    { id: "team", label: "Thành viên", icon: Users },
  ];

  return (
    <div style={{ minHeight: "100%", fontFamily: "Segoe UI, sans-serif" }}>
      {/* Project Header */}
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "24px 30px", color: "white", borderRadius: "0 0 20px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 700 }}>{group.projectTemplate?.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: 0.9 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={16} /> {group.name}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Target size={16} /> {group.projectTemplate?.milestones?.length || 0} Milestones
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "center", background: "rgba(255,255,255,0.2)", padding: "12px 20px", borderRadius: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{projectProgress}%</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Tiến độ</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(255,255,255,0.2)", padding: "12px 20px", borderRadius: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{taskStats.done}/{taskStats.total}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, padding: "0 20px", marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              border: "none",
              borderRadius: 12,
              background: activeTab === tab.id ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
              color: activeTab === tab.id ? "white" : "#666",
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: activeTab === tab.id ? "0 4px 12px rgba(102,126,234,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
              transition: "all 0.2s"
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "0 20px 20px" }}>
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Progress Card */}
            <div style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, color: "#333" }}>
                <TrendingUp size={20} color="#667eea" /> Tiến độ Dự án
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ position: "relative", width: 100, height: 100 }}>
                  <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#gradient)" strokeWidth="3" strokeDasharray={`${projectProgress}, 100`} strokeLinecap="round" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "#667eea" }}>
                    {projectProgress}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>
                    Đã nộp {submissions.length}/{group.projectTemplate?.milestones?.length || 0} milestones
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ color: "#52c41a", fontWeight: 600, fontSize: 13 }}>✓ {submissions.length} hoàn thành</span>
                    <span style={{ color: "#faad14", fontWeight: 600, fontSize: 13 }}>○ {(group.projectTemplate?.milestones?.length || 0) - submissions.length} còn lại</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Grade Card */}
            {finalGrade && (
              <div style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "2px solid #fa8c16" }}>
                <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, color: "#333" }}>
                  ⭐ Điểm Cuối Dự Án
                </h3>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 48, fontWeight: 700, color: "#fa8c16", marginBottom: 4 }}>
                    {finalGrade.grade}/10
                  </div>
                  <div style={{ fontSize: 13, color: "#999" }}>
                    Đã chấm: {new Date(finalGrade.gradedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                {finalGrade.feedback && (
                  <div style={{ padding: 16, background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#52c41a", marginBottom: 8 }}>📝 Đánh giá:</div>
                    <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {finalGrade.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Stats */}
            <div style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, color: "#333" }}>
                <ListTodo size={20} color="#667eea" /> Thống kê Công việc
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ textAlign: "center", padding: 16, background: "#f8f9fa", borderRadius: 12, borderLeft: "4px solid #6f6f6f" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#6f6f6f" }}>{taskStats.todo}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Chờ làm</div>
                </div>
                <div style={{ textAlign: "center", padding: 16, background: "#e6f7ff", borderRadius: 12, borderLeft: "4px solid #1890ff" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1890ff" }}>{taskStats.inProgress}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Đang làm</div>
                </div>
                <div style={{ textAlign: "center", padding: 16, background: "#f6ffed", borderRadius: 12, borderLeft: "4px solid #52c41a" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#52c41a" }}>{taskStats.done}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Hoàn thành</div>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, color: "#333" }}>
                <Clock size={20} color="#faad14" /> Deadline Sắp tới
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {group.projectTemplate?.milestones?.slice(0, 3).map((m, idx) => {
                  const submitted = submissions.some(s => s.projectMilestoneId === m.id || s.milestoneId === m.id);
                  return (
                    <div key={m.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f8f9fa", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: submitted ? "#52c41a" : "#faad14" }} />
                        <span style={{ fontSize: 14, color: "#333" }}>{m.title || m.Title}</span>
                      </div>
                      {submitted ? (
                        <span style={{ fontSize: 12, color: "#52c41a", fontWeight: 600 }}>✓ Đã nộp</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#faad14" }}>
                          {m.deadline ? new Date(m.deadline).toLocaleDateString('vi-VN') : 'Chưa có deadline'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "kanban" && <StudentKanban groupId={group.id} members={group.members} />}
        
        {activeTab === "groupCheckpoints" && <GroupMilestones groupId={group.id} members={group.members} />}
        
        {activeTab === "milestones" && <StudentMilestones project={group.projectTemplate} submissions={submissions} groupId={group.id} refreshData={loadData} />}
        
        {activeTab === "team" && (
          <div style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: 8, color: "#333" }}>
              <Users size={20} color="#667eea" /> Thành viên & Đóng góp
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {group.members?.map((m) => {
                // Get student ID from member - API returns studentCode (from StudentCode field)
                const memberId = m.studentCode || m.studentId || '';
                const contribution = calculateContribution(memberId);
                return (
                  <div key={m.id} style={{ padding: 20, border: "1px solid #e8e8e8", borderRadius: 12, background: "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18 }}>
                        {m.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: "#333" }}>{m.fullName}</div>
                        <div style={{ fontSize: 13, color: "#888" }}>{memberId} • {m.role}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#888" }}>Đóng góp</span>
                      <span style={{ color: "#667eea", fontWeight: 600 }}>{contribution}%</span>
                    </div>
                    <div style={{ height: 8, background: "#e8e8e8", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${contribution}%`, height: "100%", background: "linear-gradient(90deg, #667eea, #764ba2)", borderRadius: 4, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
