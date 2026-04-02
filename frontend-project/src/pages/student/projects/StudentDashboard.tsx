import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User } from "lucide-react";
import { getMyGroup } from "../../../api/projectApi";

export default function StudentDashboard() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
        try {
            // Get current user from localStorage (real user data)
            const userStr = localStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;
            const studentId = currentUser?.studentId || currentUser?.code || currentUser?.userId;
            
            if (!studentId) {
              console.error("No student ID found in user data");
              setLoading(false);
              return;
            }
            
            // API now returns array of all groups the student belongs to
            const result = await getMyGroup(studentId);
            
            // Result is now always an array (or null if error)
            if (result && Array.isArray(result)) {
              setGroups(result);
            } else {
              setGroups([]);
            }
        } catch(e) { 
          console.error("Error fetching groups:", e);
          setGroups([]);
        } 
        finally { setLoading(false); }
    };
    fetchGroups();
  }, []);

  return (
    <div style={{ minHeight: "100%", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ padding: 40 }}>
        <h1 style={{ color: "#333", fontSize: 24, marginBottom: 10 }}>Sảnh chờ dự án</h1>
        <p style={{ color: "#666", marginBottom: 30 }}>Danh sách các dự án bạn đang tham gia.</p>

        {loading ? <div>Đang tải...</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 25 }}>
                {groups.length === 0 ? (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 50, background: "white", borderRadius: 12 }}>
                        Bạn chưa tham gia dự án nào.
                    </div>
                ) : (
                    groups.map((g) => (
                        <div key={g.id} style={{ background: "white", borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.05)", overflow: "hidden", transition: "transform 0.2s", cursor: "pointer", border: "1px solid #eee" }}
                             onClick={() => navigate(`/student/projects/workspace/${g.id}`)}
                             onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                             onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            <div style={{ height: 6, background: "linear-gradient(90deg, #1890ff, #52c41a)" }}></div>
                            <div style={{ padding: 25 }}>
                                <div style={{ fontSize: 12, color: "#1890ff", background: "#e6f7ff", padding: "4px 8px", borderRadius: 4, display: "inline-block", marginBottom: 10, fontWeight: "bold" }}>
                                    HK2025
                                </div>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: 18, color: "#333" }}>{g.projectTemplate?.name}</h3>
                                <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>{g.projectTemplate?.description}</p>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0f0f0", paddingTop: 15 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#555" }}>
                                        <User size={14}/> Nhóm: <strong>{g.name}</strong>
                                    </div>
                                    <div style={{ color: "#28a745", fontWeight: "bold", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                                        Vào làm việc <ArrowRight size={16}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
}
