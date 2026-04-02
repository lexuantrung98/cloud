import { useState, useEffect, useCallback } from "react";
import {
  getChatHistory,
  askAI,
  createMeeting,
  getMeetingsByUser,
  deleteMeeting,
  createChatConnection,
  joinChatRoom,
  leaveChatRoom,
  sendMessageViaSignalR,
  disconnectChat,
  getStudentRooms,
  type ChatMessage,
  type Room,
  type Meeting,
} from "../../../api/communicationApi";
import { getMyGroup, type ProjectGroup, type GroupMember } from "../../../api/projectApi";
import "../../../styles/communication.css";

export default function StudentCommunicationPage() {
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // AI Chat
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState<string[]>([]);

  // Meeting
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [myGroups, setMyGroups] = useState<ProjectGroup[]>([]);
  const [isGroupLeader, setIsGroupLeader] = useState(false);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = currentUser.code || currentUser.id || "student-01";
  const userName = currentUser.fullName || "Sinh viên";

  // Load student's rooms (classes + groups)
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const studentCode = currentUser.code || userId;
        const studentRooms = await getStudentRooms(studentCode);
        
        // Check if response is valid
        if (studentRooms && Array.isArray(studentRooms)) {
          setRooms(studentRooms);
          
          // Set first room as default if available
          if (studentRooms.length > 0 && !currentRoom) {
            setCurrentRoom(studentRooms[0].id);
          }
        } else {
          // Fallback to general room
          console.warn("studentRooms is not an array:", studentRooms);
          setRooms([{ id: "general-room", name: "Sảnh Chung", type: "Class" }]);
          if (!currentRoom) setCurrentRoom("general-room");
        }
      } catch (e) {
        console.error("Error fetching rooms:", e);
        // Fallback to general room
        setRooms([{ id: "general-room", name: "Sảnh Chung", type: "Class" }]);
        if (!currentRoom) setCurrentRoom("general-room");
      }
    };
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUser.code]); // currentRoom intentionally excluded to avoid re-fetch on room change

  // Load chat list (legacy, might remove later)
  // Load meetings for current user
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const data = await getMeetingsByUser(userId);
        setMeetings(data);
      } catch (e) {
        console.error('Error loading meetings:', e);
      }
    };
    loadMeetings();
  }, [userId]);

  // Load groups for student - Extract from rooms instead of separate API call
  useEffect(() => {
    // Filter groups from rooms (rooms already loaded)
    const groupRooms = rooms.filter(room => room.type === 'Group');
    
    console.log('🔍 Total rooms:', rooms.length);
    console.log('🔍 Group rooms:', groupRooms);
    
    if (groupRooms.length > 0) {
      // Convert Room to ProjectGroup format
      const groups = groupRooms.map(room => ({
        id: room.id.replace('GROUP_', ''), // Remove GROUP_ prefix
        projectTemplateId: '',
        name: room.name,
        classId: '', // We don't have this from rooms
        members: [], // Will be loaded when selected
      }));
      
      setMyGroups(groups as ProjectGroup[]);
      console.log('✅ Set myGroups from rooms:', groups.length, 'groups');
    } else {
      setMyGroups([]);
      console.log('⚠️ No group rooms found');
    }
  }, [rooms]);

  // Define loadChatHistory before useEffect
  const loadChatHistory = async (roomId: string) => {
    try {
      const response = await getChatHistory(roomId, 1, 50);
      setMessages(response.data || []);
    } catch (err: unknown) {
      console.error("Error loading chat history:", err);
      if (err && typeof err === 'object' && 'response' in err) {
        console.error("Error response data:", (err as { response?: { data?: unknown } }).response?.data);
        console.error("Error status:", (err as { response?: { status?: number } }).response?.status);
      }
    }
  };

  const switchRoom = useCallback(
    async (roomId: string) => {
      if (currentRoom) {
        await leaveChatRoom(currentRoom);
      }
      await joinChatRoom(roomId);
      setCurrentRoom(roomId);
      // Save to localStorage to persist across page refresh
      localStorage.setItem('lastChatRoom', roomId);
      await loadChatHistory(roomId);
    },
    [currentRoom],
  );

  // Setup SignalR ChatHub connection
  useEffect(() => {
    let mounted = true;

    const setupConnection = async () => {
      const _connection = createChatConnection(
        (user, content, timestamp) => {
          setMessages((prev) => [...prev, { user, content, timestamp }]);
        },
        (user) => {
          // Only show join message if user is not "Unknown"
          if (user && user !== "Unknown") {
            setMessages((prev) => [
              ...prev,
              {
                user: "System",
                content: `${user} joined the room`,
                isSystem: true,
              },
            ]);
          }
        },
        (user) => {
          // Only show leave message if user is not "Unknown"
          if (user && user !== "Unknown") {
            setMessages((prev) => [
              ...prev,
              {
                user: "System",
                content: `${user} left the room`,
                isSystem: true,
              },
            ]);
          }
        },
      );

      console.log("ChatHub connection created:", _connection);

      if (mounted) {
        setIsConnected(true);
      }

      // Join last room or default room
      setTimeout(async () => {
        if (mounted) {
          // Get last room from localStorage, default to general-room
          const lastRoom = localStorage.getItem('lastChatRoom') || 'general-room';
          await joinChatRoom(lastRoom);
          setCurrentRoom(lastRoom);
          loadChatHistory(lastRoom);
        }
      }, 1000);
    };

    setupConnection();

    return () => {
      mounted = false;
      disconnectChat();
      setIsConnected(false);
    };
  }, []);

  const sendMessage = async () => {
    if (msgInput && isConnected) {
      try {
        await sendMessageViaSignalR(currentRoom, userName, msgInput);
        setMsgInput("");
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
  };

  // AI Chat handler
  const handleAskAI = async () => {
    if (!aiInput) return;
    const question = aiInput;
    setAiResponse((prev) => [...prev, `Bạn: ${question}`]);
    setAiInput("");

    try {
      const answer = await askAI(question);
      setAiResponse((prev) => [...prev, `🤖 AI: ${answer}`]);
    } catch {
      setAiResponse((prev) => [...prev, "🤖 AI: Lỗi kết nối!"]);
    }
  };

  // Meeting handlers
  const fetchGroupMembers = async (groupId: string) => {
    setIsLoadingMembers(true);
    try {
      console.log('🔍 Fetching members for group:', groupId);
      
      // Call getMyGroup to get all groups with members
      const studentCode = currentUser.code || userId;
      const groupsData = await getMyGroup(studentCode); // Interceptor already unwraps .data
      
      console.log('🔍 API returned groupsData:', groupsData);
      
      if (!groupsData) {
        console.warn('⚠️ No group data from API');
        setParticipants([]);
        setIsGroupLeader(false);
        return;
      }
      
      const groupsArray = Array.isArray(groupsData) ? groupsData : [groupsData];
      const selectedGroup = groupsArray.find((g: ProjectGroup) => g.id === groupId);
      
      console.log('🔍 Found group:', selectedGroup);
      
      if (!selectedGroup || !selectedGroup.members) {
        console.warn('⚠️ Group not found or no members');
        setParticipants([]);
        setIsGroupLeader(false);
        return;
      }
      
      // Get all members' student codes
      const memberCodes = selectedGroup.members.map((m: GroupMember) => m.studentCode || m.studentId || '');
      setParticipants(memberCodes.filter((code: string) => code !== ''));
      
      // Check if current user is leader
      const currentUserMember = selectedGroup.members.find(
        (m: GroupMember) => (m.studentCode === userId || m.studentId === userId)
      );
      const isLeader = currentUserMember?.role === 'Leader';
      setIsGroupLeader(isLeader);
      
      console.log('✅ Loaded members:', memberCodes.length);
      console.log('✅ Current user member:', currentUserMember);
      console.log('✅ Is leader:', isLeader);
      
      // Update myGroups to include members for this group
      setMyGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, members: selectedGroup.members } : g
      ));
      
    } catch (e) {
      console.error('❌ Error fetching members:', e);
      setParticipants([]);
      setIsGroupLeader(false);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroupId = e.target.value;
    setSelectedGroupId(newGroupId);
    if (newGroupId) fetchGroupMembers(newGroupId);
    else {
      setParticipants([]);
      setIsGroupLeader(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Bạn có chắc muốn xóa cuộc họp này?')) return;
    
    try {
      await deleteMeeting(meetingId);
      alert('Xóa cuộc họp thành công!');
      // Reload meetings
      const data = await getMeetingsByUser(userId);
      setMeetings(data);
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('Lỗi khi xóa cuộc họp!');
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = (document.getElementById("mTitle") as HTMLInputElement).value;
    const time = (document.getElementById("mTime") as HTMLInputElement).value;

    const selectedGroup = myGroups.find(g => g.id === selectedGroupId);
    
    if (!selectedGroup) {
      alert("Vui lòng chọn nhóm!");
      return;
    }

    if (!isGroupLeader) {
      alert("Chỉ nhóm trưởng mới có thể tạo cuộc họp!");
      return;
    }

    if (participants.length === 0) {
      alert("Nhóm chưa có thành viên!");
      return;
    }

    try {
      // Get project info from group
      const projectTemplate = selectedGroup.ProjectTemplate || selectedGroup.projectTemplate;
      
      // Find className from rooms - rooms có format: "Nhóm 1 - CN23B Lập Trình Java"
      const groupRoom = rooms.find(r => r.id === `GROUP_${selectedGroup.id}`);
      let className = selectedGroup.classId; // Default to classId
      
      if (groupRoom && groupRoom.name) {
        // Extract class name from format "Nhóm X - CLASSNAME SUBJECT"
        const parts = groupRoom.name.split(' - ');
        if (parts.length > 1) {
          className = parts[1].split(' ')[0]; // Get "CN23B" from "CN23B Lập Trình Java"
        }
      }
      
      await createMeeting(
        title,
        time,
        participants,
        selectedGroup.classId,
        className, // className extracted from room name
        projectTemplate?.name, // subjectName from project
        selectedGroup.id,
        selectedGroup.name
      );
      
      alert("Tạo cuộc họp thành công!");

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('📅 Cuộc họp đã được tạo', {
          body: `${title} - ${new Date(time).toLocaleString('vi-VN')}`,
          icon: '/favicon.ico',
          tag: 'meeting-created'
        });
      }
      // Reload meetings
      const data = await getMeetingsByUser(userId);
      setMeetings(data);
      // Reset form
      setSelectedGroupId("");
      setParticipants([]);
      setIsGroupLeader(false);
      (document.getElementById("mTitle") as HTMLInputElement).value = "Họp nhóm";
      (document.getElementById("mTime") as HTMLInputElement).value = "";
    } catch (err) {
      console.error('Error creating meeting:', err);
      alert("Lỗi kết nối!");
    }
  };


  return (
    <div>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: "#333" }}>
          Giao tiếp & Cộng tác
        </h1>
        <p style={{ color: "#666", margin: "5px 0 0 0" }}>
          Chat với nhóm, họp trực tuyến và hỗ trợ AI
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { id: "chat", label: "💬 Chat Nhóm", icon: "💬" },
          { id: "meeting", label: "📅 Lên lịch họp", icon: "📅" },
          { id: "ai", label: "🤖 Trợ lý AI", icon: "🤖" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.id ? "#52c41a" : "#f0f0f0",
              color: activeTab === tab.id ? "white" : "#333",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}
        >
          {/* Room List */}
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0", fontSize: 16 }}>Phòng Chat</h3>
            {rooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#999" }}>
                Đang tải...
              </div>
            ) : (
              <>
                {/* Section: Lớp */}
                {rooms.filter(r => r.type === "Class").length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: "#666", 
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      📚 Lớp
                    </div>
                    {rooms.filter(r => r.type === "Class").map((room) => (
                      <div
                        key={room.id}
                        onClick={() => switchRoom(room.id)}
                        style={{
                          padding: 12,
                          marginBottom: 8,
                          background: currentRoom === room.id ? "#f6ffed" : "#f5f5f5",
                          borderRadius: 8,
                          cursor: "pointer",
                          borderLeft:
                            currentRoom === room.id ? "3px solid #52c41a" : "none",
                        }}
                      >
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>📚</span>
                          {room.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section: Nhóm */}
                {rooms.filter(r => r.type === "Group").length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: "#666", 
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      👥 Nhóm
                    </div>
                    {rooms.filter(r => r.type === "Group").map((room) => (
                      <div
                        key={room.id}
                        onClick={() => switchRoom(room.id)}
                        style={{
                          padding: 12,
                          marginBottom: 8,
                          background: currentRoom === room.id ? "#e6f7ff" : "#f5f5f5",
                          borderRadius: 8,
                          cursor: "pointer",
                          borderLeft:
                            currentRoom === room.id ? "3px solid #1890ff" : "none",
                        }}
                      >
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>👥</span>
                          {room.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback nếu không có room nào */}
                {rooms.filter(r => r.type === "Class").length === 0 && 
                 rooms.filter(r => r.type === "Group").length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#999" }}>
                    Không có phòng chat nào
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chat Area */}
          <div className="comm-chat-container">
            <div
              style={{
                padding: 15,
                borderBottom: "1px solid #eee",
                background: "#fafafa",
              }}
            >
              <strong>🟢 {rooms.find(r => r.id === currentRoom)?.name || currentRoom}</strong>
            </div>
            <div className="comm-messages-list">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`comm-message-bubble ${m.isSystem ? "" : m.user === userName ? "comm-msg-me" : "comm-msg-other"}`}
                >
                  {!m.isSystem && <strong>{m.user}: </strong>}
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
            <div className="comm-chat-input-area">
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Nhập tin nhắn..."
              />
              <button className="comm-btn" onClick={sendMessage}>
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Tab */}
      {activeTab === "meeting" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Form tạo meeting */}
          <div className="comm-card">
            <h2 style={{ marginTop: 0 }}>📅 Lên lịch họp nhóm</h2>
            <form onSubmit={handleSchedule}>
              <div className="comm-form-group">
                <label>Chọn Nhóm:</label>
                <select
                  className="comm-input-full"
                  value={selectedGroupId}
                  onChange={handleGroupChange}
                >
                  <option value="">-- Chọn nhóm --</option>
                  {myGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Hiển thị thông tin role */}
              {selectedGroupId && (
                <div
                  style={{
                    background: isGroupLeader ? "#e6f7ff" : "#fff7e6",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 15,
                    fontSize: 14,
                    border: `1px solid ${isGroupLeader ? "#1890ff" : "#faad14"}`,
                  }}
                >
                  {isGroupLeader ? (
                    <span style={{ color: "#1890ff" }}>
                      ✅ Bạn là <strong>nhóm trưởng</strong>, có thể tạo cuộc họp
                    </span>
                  ) : (
                    <span style={{ color: "#faad14" }}>
                      ⚠️ Chỉ nhóm trưởng mới có thể tạo cuộc họp
                    </span>
                  )}
                </div>
              )}
              
              <div
                style={{
                  background: "#f9f9f9",
                  padding: 15,
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <label>Thành viên ({participants.length}):</label>
                <div style={{ fontSize: 13, color: "#666" }}>
                  {isLoadingMembers
                    ? "⏳ Đang tải..."
                    : participants.join(", ") || "Chưa có"}
                </div>
              </div>
              <div className="comm-form-group">
                <label>Tiêu đề:</label>
                <input
                  id="mTitle"
                  className="comm-input-full"
                  type="text"
                  defaultValue="Họp nhóm"
                />
              </div>
              <div className="comm-form-group">
                <label>Thời gian:</label>
                <input
                  id="mTime"
                  className="comm-input-full"
                  type="datetime-local"
                />
              </div>
              <button
                type="submit"
                className="comm-btn-primary"
                style={{ width: "100%" }}
                disabled={!isGroupLeader || !selectedGroupId || participants.length === 0}
              >
                📅 Lên lịch họp
              </button>
            </form>
          </div>

          {/* Danh sách meetings - Chia 2 cột */}
          <div className="comm-card">
            <h2 style={{ marginTop: 0 }}>📋 Các cuộc họp của bạn</h2>
            {meetings.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>📅</div>
                <p>Chưa có cuộc họp nào</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>
                {/* Cột trái: Lịch họp lớp */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: '#1890ff' }}>
                    📘 Lịch họp lớp
                  </h3>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {meetings.filter(m => !m.groupName).length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#999', padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
                        Chưa có cuộc họp lớp
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {meetings.filter(m => !m.groupName).map((meeting) => (
                        <div
                          key={meeting.id}
                          style={{
                            padding: 16,
                            background: '#f0f7ff',
                            borderRadius: 12,
                            border: '2px solid #1890ff',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
                            {meeting.title}
                          </div>
                          {(meeting.className || meeting.subjectName) && (
                            <div style={{ fontSize: 14, color: '#1890ff', marginBottom: 6, fontWeight: 500 }}>
                              📘 {meeting.className || meeting.subjectName}
                            </div>
                          )}
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                            🕒 {new Date(meeting.startTime).toLocaleString('vi-VN')}
                          </div>
                          <a
                            href={meeting.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              padding: '8px 16px',
                              background: '#1890ff',
                              color: 'white',
                              textDecoration: 'none',
                              borderRadius: 6,
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            Tham gia họp
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>

                {/* Cột phải: Họp nhóm */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: '#52c41a' }}>
                    👥 Họp nhóm
                  </h3>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {meetings.filter(m => m.groupName).length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
                      Chưa có cuộc họp nhóm
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {meetings.filter(m => m.groupName).map((meeting) => (
                        <div
                          key={meeting.id}
                          style={{
                            padding: 16,
                            background: '#f0fff4',
                            borderRadius: 12,
                            border: '2px solid #52c41a',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
                            {meeting.title}
                          </div>
                          {meeting.groupName && (
                            <div style={{ fontSize: 14, color: '#52c41a', marginBottom: 6, fontWeight: 600 }}>
                              👥 {meeting.groupName}
                            </div>
                          )}
                          {(meeting.className || meeting.subjectName) && (
                            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                              📘 {meeting.className} - {meeting.subjectName || 'N/A'}
                            </div>
                          )}
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                            🕒 {new Date(meeting.startTime).toLocaleString('vi-VN')}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a
                              href={meeting.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '8px 16px',
                                background: '#52c41a',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 600,
                              }}
                            >
                              Tham gia họp
                            </a>
                            {/* TODO: Check if user is group leader before showing delete button */}
                            <button
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              style={{
                                padding: '8px 16px',
                                background: '#ff4d4f',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === "ai" && (
        <div className="comm-card">
          <h2 style={{ marginTop: 0 }}>🤖 Trợ lý AI</h2>
          <p style={{ color: "#666" }}>
            Hỏi AI về tiến độ dự án, đề xuất cải thiện, phân tích đóng góp của
            nhóm!
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 15,
              flexWrap: "wrap",
            }}
          >
            {[
              "Phân tích tiến độ nhóm",
              "Đánh giá đóng góp thành viên",
              "Đề xuất cải thiện",
            ].map((q) => (
              <button
                key={q}
                onClick={() => {
                  setAiInput(q);
                }}
                style={{
                  padding: "8px 16px",
                  background: "#f0f0f0",
                  border: "none",
                  borderRadius: 20,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="ai-chat-box">
            {aiResponse.length === 0 && (
              <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🤖</div>
                <p>Hãy hỏi tôi bất cứ điều gì về dự án của bạn...</p>
              </div>
            )}
            {aiResponse.map((txt, i) => (
              <div
                key={i}
                className={`ai-msg ${txt.startsWith("🤖") ? "ai-msg-bot" : "ai-msg-user"}`}
              >
                {txt}
              </div>
            ))}
          </div>
          <div className="ai-input-group">
            <input
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
              placeholder="Hỏi AI..."
            />
            <button className="comm-btn" onClick={handleAskAI}>
              Hỏi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
