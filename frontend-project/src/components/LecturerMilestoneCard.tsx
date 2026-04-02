import { ChevronDown, ChevronUp, Award, MessageSquare, Star } from "lucide-react";

interface MilestoneCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  milestone: any;
  isExpanded: boolean;
  onToggle: () => void;
  onGrade: () => void;
  onComment: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  grades?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments?: any[];
}

export default function LecturerMilestoneCard({
  milestone,
  isExpanded,
  onToggle,
  onGrade,
  onComment,
  grades,
  comments = []
}: MilestoneCardProps) {
  return (
    <div
      style={{
        background: milestone.isCompleted ? "#f6ffed" : "white",
        border: "1px solid #f0f0f0",
        borderLeft: milestone.isCompleted ? "4px solid #52c41a" : "4px solid #667eea",
        borderRadius: 12,
        padding: 20
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 16, color: "#333" }}>{milestone.title}</h4>
            {milestone.isCompleted && (
              <span style={{
                background: "#52c41a",
                color: "white",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600
              }}>✓ Hoàn thành</span>
            )}
          </div>
          <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: 14 }}>{milestone.description}</p>
          <div style={{ fontSize: 13, color: "#888" }}>
            📂 Nhóm: {milestone.groupId} | 📅 Deadline: {milestone.deadline ? new Date(milestone.deadline).toLocaleDateString('vi-VN') : 'Chưa có'}
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            color: "#667eea"
          }}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
          {/* Grades section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#333" }}>
                <Star size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Điểm số
              </h5>
              <button
                onClick={onGrade}
                style={{
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <Award size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Chấm điểm
              </button>
            </div>

            {grades && (
              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {grades.peerGrades?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Peer grades:</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {grades.peerGrades.map((g: any, i: number) => (
                          <span key={i} style={{ background: "white", padding: "4px 8px", borderRadius: 4, fontSize: 13 }}>
                            {g.graderName}: <strong>{g.score}/10</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {grades.averagePeerGrade && (
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Trung bình:</div>
                      <div style={{ background: "#e6f7ff", padding: "4px 12px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>
                        {grades.averagePeerGrade.toFixed(1)}/10
                      </div>
                    </div>
                  )}
                  {grades.lecturerGrade && (
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Giảng viên:</div>
                      <div style={{ background: "#fff7e6", padding: "4px 12px", borderRadius: 4, fontSize: 14, fontWeight: 600, color: "#fa8c16" }}>
                        {grades.lecturerGrade}/10
                      </div>
                    </div>
                  )}
                </div>
                {!grades.peerGrades?.length && !grades.lecturerGrade && (
                  <div style={{ textAlign: "center", color: "#999", fontSize: 13 }}>Chưa có điểm</div>
                )}
              </div>
            )}
          </div>

          {/* Comments section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#333" }}>
                <MessageSquare size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Bình luận ({comments.length})
              </h5>
              <button
                onClick={onComment}
                style={{
                  background: "#52c41a",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                + Thêm bình luận
              </button>
            </div>

            {comments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {comments.map((c: any) => (
                  <div key={c.id} style={{ background: "#fafafa", padding: 12, borderRadius: 8, borderLeft: "3px solid #1890ff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: 13, color: "#333" }}>{c.commenterName || "Anonymous"}</strong>
                      <span style={{ fontSize: 11, color: "#999" }}>
                        {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13, background: "#fafafa", borderRadius: 8 }}>
                Chưa có bình luận
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
