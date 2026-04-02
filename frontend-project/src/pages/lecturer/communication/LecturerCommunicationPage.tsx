import { useState, useEffect, useCallback } from 'react';
import { 
  getChatList, 
  getChatHistory, 
  askAI, 
  createMeeting, 
  getMeetings, 
  deleteMeeting,
  createChatConnection,
  joinChatRoom,
  leaveChatRoom,
  sendMessageViaSignalR,
  disconnectChat,
  type ChatItem, 
  type ChatMessage, 
  type Meeting 
} from '../../../api/communicationApi';
import { courseApi } from '../../../api/courseApi';
import '../../../styles/communication.css';
import styles from './LecturerCommunicationPage.module.css';

export default function LecturerCommunicationPage() {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoom, setCurrentRoom] = useState('general-room');
  const [msgInput, setMsgInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // AI Chat
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string[]>([]);
  
  // Meeting
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.code || currentUser.id || 'lecturer-01';
  const userName = currentUser.fullName || 'Giảng viên';

  // Load chat list
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userEmail = currentUser.email || '';
        const data = await getChatList(userId, 'Lecturer', userEmail);
        setChatList(data);
      } catch (e) {
        console.error('Error fetching chat list:', e);
        setChatList([
          { id: 'general-room', name: 'Sảnh Chung', type: 'Public' },
          { id: 'room-lecturers', name: 'Phòng Giảng Viên', type: 'RoleChat' },
        ]);
      }
    };
    fetchData();
  }, [userId, currentUser.email]);

  // Define loadChatHistory before useEffect
  const loadChatHistory = async (roomId: string) => {
    try {
      const response = await getChatHistory(roomId, 1, 50);
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const switchRoom = useCallback(async (roomId: string) => {
    if (currentRoom) {
      await leaveChatRoom(currentRoom);
    }
    await joinChatRoom(roomId);
    setCurrentRoom(roomId);
    // Save to localStorage to persist across page refresh
    localStorage.setItem('lastChatRoom_lecturer', roomId);
    await loadChatHistory(roomId);
  }, [currentRoom]);

  // Setup SignalR ChatHub connection
  useEffect(() => {
    let mounted = true;
    
    const setupConnection = async () => {
      createChatConnection(
        (user, content, timestamp) => {
          setMessages(prev => [...prev, { user, content, timestamp }]);
        },
        (user) => {
          // Only show join message if user is not "Unknown"
          if (user && user !== "Unknown") {
            setMessages(prev => [...prev, { 
              user: 'System', 
              content: `${user} joined the room`, 
              isSystem: true 
            }]);
          }
        },
        (user) => {
          // Only show leave message if user is not "Unknown"
          if (user && user !== "Unknown") {
            setMessages(prev => [...prev, { 
              user: 'System', 
              content: `${user} left the room`, 
              isSystem: true 
            }]);
          }
        }
      );
      
      if (mounted) {
        setIsConnected(true);
      }

      // Join last room or default room
      setTimeout(async () => {
        if (mounted) {
          // Get last room from localStorage, default to general-room
          const lastRoom = localStorage.getItem('lastChatRoom_lecturer') || 'general-room';
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
        setMsgInput('');
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  };

  // AI Chat handler
  const handleAskAI = async () => {
    if (!aiInput) return;
    const question = aiInput;
    setAiResponse(prev => [...prev, `Bạn: ${question}`]);
    setAiInput('');
    
    try {
      const answer = await askAI(question);
      setAiResponse(prev => [...prev, `🤖 AI: ${answer}`]);
    } catch {
      setAiResponse(prev => [...prev, '🤖 AI: Lỗi kết nối!']);
    }
  };

  // Meeting handlers
  const fetchGroupMembers = async (roomId: string) => {
    setIsLoadingMembers(true);
    try {
      if (roomId.startsWith('CLASS_')) {
        // Extract classId from "CLASS_9"
        const classId = parseInt(roomId.replace('CLASS_', ''));
        const response = await courseApi.getClassMembers(classId);
        
        // Extract student codes from ClassMembers
        const studentCodes = response.data.map((member: { studentCode: string }) => member.studentCode);
        setParticipants(studentCodes);
      } else if (roomId.startsWith('GROUP_')) {
        // For groups: currently not implemented
        setParticipants([]);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setParticipants([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroupId = e.target.value;
    setSelectedGroupId(newGroupId);
    if (newGroupId) fetchGroupMembers(newGroupId);
    else setParticipants([]);
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-submit
    if (isCreatingMeeting) return;
    
    const title = (document.getElementById('mTitle') as HTMLInputElement).value;
    const time = (document.getElementById('mTime') as HTMLInputElement).value;

    if (participants.length === 0) {
      alert('Vui lòng chọn nhóm tham gia!');
      return;
    }

    setIsCreatingMeeting(true);
    try {
      // Get class/group info from selectedGroupId
      const selectedChat = chatList.find(chat => chat.id === selectedGroupId);
      
      await createMeeting(
        title, 
        time, 
        participants,
        selectedChat?.id,  // classId (e.g., "CLASS_9")
        selectedChat?.name, // className (e.g., "CN23B - Lập Trình Java")
        selectedChat?.name  // subjectName (same as className for now)
      );
      alert('Tạo cuộc họp thành công!');
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('📅 Cuộc họp đã được tạo', {
          body: `${title} - ${new Date(time).toLocaleString('vi-VN')}`,
          icon: '/favicon.ico',
          tag: 'meeting-created'
        });
      }
      
      // Reload meetings list
      const data = await getMeetings();
      setMeetings(data);
      // Reset form
      setSelectedGroupId('');
      setParticipants([]);
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setIsCreatingMeeting(false);
    }
  };


  // Load meetings on mount
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const data = await getMeetings();
        setMeetings(data);
      } catch (e) {
        console.error('Error loading meetings:', e);
      }
    };
    loadMeetings();
  }, []);

  // Delete meeting handler
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Bạn có chắc muốn xóa cuộc họp này?')) return;
    
    try {
      await deleteMeeting(meetingId);
      // Reload meetings list
      const data = await getMeetings();
      setMeetings(data);
    } catch (e) {
      console.error('Error deleting meeting:', e);
      alert('Lỗi xóa cuộc họp');
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Giao tiếp & Cộng tác</h1>
        <p className={styles.pageSubtitle}>Chat, họp trực tuyến và hỗ trợ AI</p>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {[
          { id: 'chat', label: '💬 Trò chuyện', icon: '💬' },
          { id: 'meeting', label: '📅 Lên lịch họp', icon: '📅' },
          { id: 'ai', label: '🤖 Trợ lý AI', icon: '🤖' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className={styles.chatLayout}>
          {/* Room List */}
          <div className={styles.roomListContainer}>
            <h3 className={styles.roomListTitle}>Phòng Chat</h3>
            
            {/* Phòng Chat Giảng Viên */}
            {chatList.filter(chat => chat.type === 'RoleChat').length > 0 && (
              <>
                <div className={`${styles.roomSectionTitle} ${styles.lecturer}`}>
                  👥 Phòng Chat Giảng Viên
                </div>
                {chatList
                  .filter(chat => chat.type === 'RoleChat')
                  .map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => switchRoom(chat.id)}
                      className={`${styles.roomItem} ${currentRoom === chat.id ? `${styles.active} ${styles.lecturer}` : styles.lecturer}`}
                    >
                      <div className={styles.roomName}>{chat.name}</div>
                    </div>
                  ))}
              </>
            )}
            
            {/* Lớp Học */}
            {chatList.filter(chat => chat.type === 'Class').length > 0 && (
              <>
                <div className={`${styles.roomSectionTitle} ${styles.class}`}>
                  📚 Lớp Học
                </div>
                {chatList
                  .filter(chat => chat.type === 'Class')
                  .map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => switchRoom(chat.id)}
                      className={`${styles.roomItem} ${currentRoom === chat.id ? `${styles.active} ${styles.class}` : styles.class}`}
                    >
                      <div className={styles.roomName}>{chat.name}</div>
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* Chat Area */}
          <div className="comm-chat-container">
            <div className={styles.chatHeader}>
              <strong>🟢 Phòng: {currentRoom}</strong>
            </div>
            <div className="comm-messages-list">
              {messages.map((m, idx) => (
                <div key={idx} className={`comm-message-bubble ${m.isSystem ? '' : (m.user === userName ? 'comm-msg-me' : 'comm-msg-other')}`}>
                  {!m.isSystem && <strong>{m.user}: </strong>}
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
            <div className="comm-chat-input-area">
              <input 
                value={msgInput} 
                onChange={e => setMsgInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder="Nhập tin nhắn..." 
              />
              <button className="comm-btn" onClick={sendMessage}>Gửi</button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Tab */}
      {activeTab === 'meeting' && (
        <div className={styles.meetingLayout}>
          {/* Form tao cuoc hop */}
          <div className="comm-card">
            <h2 className={styles.meetingTitle}>📅 Tạo cuộc họp mới</h2>
            <form onSubmit={handleSchedule}>
              <div className="comm-form-group">
                <label>Chọn Nhóm/Lớp:</label>
                <select className="comm-input-full" value={selectedGroupId} onChange={handleGroupChange}>
                  <option value="">-- Chọn nhóm --</option>
                  {chatList.map(chat => (
                    <option key={chat.id} value={chat.id}>{chat.name} ({chat.type})</option>
                  ))}
                </select>
              </div>
              <div className={styles.membersDisplay}>
                <label>Thành viên ({participants.length}):</label>
                <div className={styles.membersList}>
                  {isLoadingMembers ? 'Đang tải...' : participants.join(', ') || 'Chưa có'}
                </div>
              </div>
              <div className="comm-form-group">
                <label>Tiêu đề:</label>
                <input id="mTitle" className="comm-input-full" type="text" defaultValue="Họp nhóm" />
              </div>
              <div className="comm-form-group">
                <label>Thời gian:</label>
                <input id="mTime" className="comm-input-full" type="datetime-local" />
              </div>
              <button type="submit" className="comm-btn" disabled={isLoadingMembers || participants.length === 0 || isCreatingMeeting}>
                {isCreatingMeeting ? 'Đang tạo...' : 'Tạo cuộc họp'}
              </button>
            </form>
          </div>
          
          {/* Danh sach cuoc hop */}
          <div className="comm-card">
            <h2 className={styles.meetingTitle}>📋 Danh sách cuộc họp</h2>
            {meetings.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <p>Chưa có cuộc họp nào</p>
              </div>
            ) : (
              <div className={styles.meetingsList}>
                {meetings.map(meeting => (
                  <div key={meeting.id} className={styles.meetingCard}>
                    <div className={styles.meetingTitle}>{meeting.title}</div>
                    {(meeting.className || meeting.subjectName) && (
                      <div className={styles.meetingClass}>
                        📘 {meeting.className || meeting.subjectName}
                      </div>
                    )}
                    <div className={styles.meetingTime}>
                      🕒 {new Date(meeting.startTime).toLocaleString('vi-VN')}
                    </div>
                    <a 
                      href={meeting.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.meetingLink}
                    >
                      Tham gia họp
                    </a>
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className={styles.deleteButton}
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div className="comm-card">
          <h2 className={styles.meetingTitle}>🤖 Trợ lý AI</h2>
          <p className={styles.aiSubtitle}>Hỏi AI về tiến độ dự án, đề xuất cải thiện, hoặc bất kỳ câu hỏi nào!</p>
          <div className="ai-chat-box">
            {aiResponse.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🤖</div>
                <p>Hãy hỏi tôi bất cứ điều gì...</p>
              </div>
            )}
            {aiResponse.map((txt, i) => (
              <div key={i} className={`ai-msg ${txt.startsWith('🤖') ? 'ai-msg-bot' : 'ai-msg-user'}`}>
                {txt}
              </div>
            ))}
          </div>
          <div className="ai-input-group">
            <input 
              className={styles.aiInput}
              value={aiInput} 
              onChange={e => setAiInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAskAI()} 
              placeholder="Hỏi AI..." 
            />
            <button className="comm-btn" onClick={handleAskAI}>Hỏi</button>
          </div>
        </div>
      )}
    </div>
  );
}
