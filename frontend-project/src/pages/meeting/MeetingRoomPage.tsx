import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';

const COMMUNICATION_API_URL = 'http://localhost:5015';

interface ChatMsg {
  user: string;
  content: string;
  time: string;
}

// Google Meet Style SVG Icons
const Icons = {
  mic: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  ),
  micOff: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
    </svg>
  ),
  videocam: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  videocamOff: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
    </svg>
  ),
  presentToAll: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 3H3c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h18c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 16.02H3V4.98h18v14.04zM10 12H8l4-4 4 4h-2v4h-4v-4z"/>
    </svg>
  ),
  callEnd: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
    </svg>
  ),
  chat: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  ),
  people: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ),
  backHand: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 24c-3.26 0-6.19-1.99-7.4-5.02l-3.03-7.61c-.31-.79.49-1.56 1.28-1.23l.29.12c.45.19.81.54 1.01.98L6.5 15H7V3.5C7 2.67 7.67 2 8.5 2s1.5.67 1.5 1.5V12h1V1.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v10c0 4.69-3.81 8.5-8.5 8.5z"/>
    </svg>
  ),
  moreVert: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  ),
  send: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  ),
  close: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  ),
  info: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  ),
  security: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  ),
};

// Control Button Component
const ControlButton = ({ 
  onClick, 
  active = true, 
  danger = false,
  highlight = false,
  disabled = false,
  icon,
  title,
  badge
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  badge?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: 56,
      height: 56,
      borderRadius: '50%',
      border: 'none',
      background: danger ? '#ea4335' : highlight ? '#8ab4f8' : !active ? '#ea4335' : '#3c4043',
      color: highlight ? '#202124' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s, transform 0.1s',
      opacity: disabled ? 0.5 : 1,
      position: 'relative'
    }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'scale(1.05)')}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
  >
    {icon}
    {badge && (
      <span style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#1a73e8',
        border: '2px solid #202124'
      }} />
    )}
  </button>
);

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [hasMediaStream, setHasMediaStream] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.code || currentUser.id || 'guest';
  const userName = currentUser.fullName || currentUser.email || 'Khách';

  const avatarColors = ['#1e88e5', '#43a047', '#e53935', '#8e24aa', '#fb8c00', '#00acc1'];
  const getColor = (i: number) => avatarColors[i % avatarColors.length];

  // SignalR
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${COMMUNICATION_API_URL}/meetingHub`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    
    connectionRef.current = conn;
    conn.on('ReceiveMessage', (user: string, msg: string) => {
      setMessages(prev => [...prev, { user, content: msg, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    });
    conn.on('AllUsers', (users: string[]) => setParticipants(users));
    conn.on('UserLeft', (id: string) => setParticipants(prev => prev.filter(p => p !== id)));

    conn.start().then(() => {
      setIsConnected(true);
      conn.invoke('JoinMeeting', meetingId, userId);
    }).catch(() => {});

    return () => { conn.stop(); };
  }, [meetingId, userId]);

  // Media - graceful fallback when permission denied
  useEffect(() => {
    const initMedia = async () => {
      try {
        console.log('Requesting media access...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('Media stream obtained');
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
        setIsMicOn(true);
        setHasMediaStream(true);
      } catch (err) {
        console.log('Media not available, using avatar mode:', err);
        // Don't show error - just use avatar mode
        setHasMediaStream(false);
        setIsCameraOn(false);
        setIsMicOn(false);
      }
    };

    initMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleMic = () => {
    const s = localStreamRef.current;
    if (!s) {
      console.log('No stream for mic toggle');
      return;
    }
    const newState = !isMicOn;
    console.log('Toggle mic to:', newState);
    s.getAudioTracks().forEach(t => { 
      t.enabled = newState;
      console.log('Audio track enabled:', t.enabled);
    });
    setIsMicOn(newState);
  };

  const toggleCamera = () => {
    const s = localStreamRef.current;
    if (!s) {
      console.log('No stream for camera toggle');
      return;
    }
    const newState = !isCameraOn;
    console.log('Toggle camera to:', newState);
    s.getVideoTracks().forEach(t => { 
      t.enabled = newState;
      console.log('Video track enabled:', t.enabled);
    });
    setIsCameraOn(newState);
  };

  const toggleScreen = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      setIsScreenSharing(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = s;
        if (screenVideoRef.current) screenVideoRef.current.srcObject = s;
        setIsScreenSharing(true);
        s.getVideoTracks()[0].onended = () => setIsScreenSharing(false);
      } catch { /* cancelled */ }
    }
  };

  const toggleHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (next && connectionRef.current && isConnected) {
      connectionRef.current.invoke('SendMessage', meetingId, 'Hệ thống', `✋ ${userName} giơ tay`);
    }
  };

  const sendMsg = () => {
    if (!msgInput.trim() || !connectionRef.current || !isConnected) return;
    connectionRef.current.invoke('SendMessage', meetingId, userName, msgInput);
    setMsgInput('');
  };

  const leave = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    connectionRef.current?.stop();
    if (window.history.length > 1) { navigate(-1); } else { navigate('/'); }
  };

  return (
    <div style={{ height: '100vh', background: '#202124', display: 'flex', flexDirection: 'column', fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
      {/* Header */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#e8eaed', fontSize: 18 }}>{meetingId?.slice(0, 3)}-{meetingId?.slice(3, 7)}-{meetingId?.slice(7, 10)}</span>
        </div>
        <div style={{ color: '#e8eaed', fontSize: 14 }}>
          {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#9aa0a6', display: 'flex', alignItems: 'center', gap: 4 }}>
            {Icons.security}
          </span>
          <button style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', padding: 8 }}>{Icons.info}</button>
        </div>
      </header>



      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#202124' }}>
        <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column' }}>
          {/* Video */}
          <div style={{ flex: 1, background: '#3c4043', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {isScreenSharing ? (
              <video ref={screenVideoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : isCameraOn ? (
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ width: 140, height: 140, borderRadius: '50%', background: getColor(0), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, color: '#fff' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              {!isMicOn && <span style={{ display: 'flex' }}>{Icons.micOff}</span>}
              {isHandRaised && <span>✋</span>}
              {userName}
            </div>

            {isScreenSharing && (
              <div style={{ position: 'absolute', top: 8, left: 8, background: '#1a73e8', padding: '4px 12px', borderRadius: 4, color: '#fff', fontSize: 12 }}>
                Bạn đang trình chiếu
              </div>
            )}
          </div>

          {participants.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
              {participants.slice(1).map((_, i) => (
                <div key={i} style={{ width: 160, height: 90, borderRadius: 8, background: '#3c4043', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: getColor(i + 1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        {showChat && (
          <div style={{ width: 360, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: 16 }}>Tin nhắn trong cuộc gọi</span>
              <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}>{Icons.close}</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {messages.length === 0 ? (
                <p style={{ color: '#5f6368', textAlign: 'center', marginTop: 60, fontSize: 14 }}>Tin nhắn chỉ hiển thị trong cuộc gọi</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: getColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
                        {m.user.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{m.user}</span>
                      <span style={{ color: '#5f6368', fontSize: 12 }}>{m.time}</span>
                    </div>
                    <p style={{ margin: '0 0 0 36px', fontSize: 14 }}>{m.content}</p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8 }}>
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Gửi tin nhắn cho mọi người"
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #dadce0', borderRadius: 24, outline: 'none', fontSize: 14 }}
              />
              <button onClick={sendMsg} disabled={!msgInput.trim()} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: msgInput.trim() ? '#1a73e8' : '#e8eaed', color: msgInput.trim() ? '#fff' : '#9aa0a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.send}
              </button>
            </div>
          </div>
        )}

        {/* Participants */}
        {showParticipants && (
          <div style={{ width: 360, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: 16 }}>Mọi người ({participants.length})</span>
              <button onClick={() => setShowParticipants(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}>{Icons.close}</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {participants.map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: getColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>
                    {i === 0 ? userName.charAt(0) : String.fromCharCode(64 + i)}
                  </div>
                  <span style={{ flex: 1, fontSize: 14 }}>{i === 0 ? `${userName} (Bạn)` : `Thành viên ${i}`}</span>
                  {i === 0 && !isMicOn && <span style={{ color: '#ea4335', display: 'flex' }}>{Icons.micOff}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ height: 80, background: '#202124', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <ControlButton onClick={toggleMic} active={isMicOn} disabled={!hasMediaStream} icon={isMicOn ? Icons.mic : Icons.micOff} title={isMicOn ? 'Tắt tiếng' : 'Bật tiếng'} />
        <ControlButton onClick={toggleCamera} active={isCameraOn} disabled={!hasMediaStream} icon={isCameraOn ? Icons.videocam : Icons.videocamOff} title={isCameraOn ? 'Tắt camera' : 'Bật camera'} />
        <ControlButton onClick={toggleScreen} highlight={isScreenSharing} icon={Icons.presentToAll} title={isScreenSharing ? 'Dừng trình chiếu' : 'Trình chiếu ngay'} />
        <ControlButton onClick={toggleHand} highlight={isHandRaised} icon={Icons.backHand} title={isHandRaised ? 'Hạ tay' : 'Giơ tay'} />
        
        <button onClick={leave} title="Rời khỏi cuộc gọi" style={{ width: 56, height: 40, borderRadius: 24, border: 'none', background: '#ea4335', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          {Icons.callEnd}
        </button>

        <div style={{ width: 48 }} />

        <ControlButton onClick={() => { setShowChat(!showChat); setShowParticipants(false); }} highlight={showChat} icon={Icons.chat} title="Chat" badge={messages.length > 0 && !showChat} />
        <ControlButton onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }} highlight={showParticipants} icon={Icons.people} title="Mọi người" />
        <ControlButton onClick={() => {}} icon={Icons.moreVert} title="Tùy chọn khác" />
      </div>
    </div>
  );
}
