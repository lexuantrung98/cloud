import { createServiceClient } from './axiosClient';
import * as signalR from '@microsoft/signalr';
import { getToken } from '../utils/authStorage';

// In production (Docker), use relative path (nginx proxy)
// In development, use localhost with specific port
const COMMUNICATION_BASE_URL = import.meta.env.MODE === 'production' 
  ? '' 
  : 'http://localhost:5015';

// API URL for REST calls (always include /api prefix)
const COMMUNICATION_API_URL = `${COMMUNICATION_BASE_URL}/api`;

// Create axios client with automatic JWT injection
const communicationClient = createServiceClient(COMMUNICATION_API_URL);

// Types
export interface ChatUser {
  id: string;
  name: string;
  role: string;
}

export interface ChatItem {
  id: string;
  name: string;
  type: string;
}

export interface ChatMessage {
  id?: string;
  user: string;
  content: string;
  timestamp?: string;
  isRead?: boolean;
  isSystem?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  startTime: string;
  link: string;
  participants: string[];
  className?: string;
  subjectName?: string;
  groupName?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'Class' | 'Group';
  description?: string;
}

// SignalR ChatHub Connection
let chatConnection: signalR.HubConnection | null = null;

export const createChatConnection = (
  onMessageReceived: (user: string, message: string, timestamp: string) => void,
  onUserJoined?: (user: string) => void,
  onUserLeft?: (user: string) => void
) => {
  if (chatConnection) {
    chatConnection.stop();
  }

  // SignalR hub URL - NOT under /api, directly at /chatHub
  const hubUrl = `${COMMUNICATION_BASE_URL}/chatHub`;
  
  chatConnection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => getToken() || ''
    })
    .withAutomaticReconnect()
    .build();

  // Event handlers
  chatConnection.on('ReceiveMessage', (data: { user: string; content: string; timestamp: string }) => {
    onMessageReceived(data.user, data.content, data.timestamp);
  });

  if (onUserJoined) {
    chatConnection.on('UserJoined', onUserJoined);
  }

  if (onUserLeft) {
    chatConnection.on('UserLeft', onUserLeft);
  }

  chatConnection.start()
    .then(() => console.log('ChatHub connected'))
    .catch(err => console.error('ChatHub connection error:', err));

  return chatConnection;
};

export const joinChatRoom = async (roomId: string) => {
  if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
    await chatConnection.invoke('JoinRoom', roomId);
  }
};

export const leaveChatRoom = async (roomId: string) => {
  if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
    await chatConnection.invoke('LeaveRoom', roomId);
  }
};

export const sendMessageViaSignalR = async (roomId: string, user: string, content: string) => {
  if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
    await chatConnection.invoke('SendMessage', roomId, user, content);
  }
};

export const disconnectChat = () => {
  if (chatConnection) {
    chatConnection.stop();
    chatConnection = null;
  }
};

// API Functions

// Chat List - Route: api/ChatList/{userId}
export const getChatList = async (
  userId: string, 
  role?: string, 
  email?: string,
  studentId?: string
): Promise<ChatItem[]> => {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (email) params.append('email', email);
  if (studentId) params.append('studentId', studentId);
  
  return await communicationClient.get(`/ChatList/${userId}?${params.toString()}`);
};

// Chat History with Pagination - Route: api/Chat/history/{roomId}
export const getChatHistory = async (
  roomId: string, 
  page: number = 1, 
  pageSize: number = 50
): Promise<{ data: ChatMessage[]; page: number; pageSize: number; total: number; totalPages: number }> => {
  const response = await communicationClient.get(
    `/Chat/history/${roomId}?page=${page}&pageSize=${pageSize}`
  ) as unknown as { data: ChatMessage[]; page: number; pageSize: number; total: number; totalPages: number };
  return response;
};

// Mark Messages as Read - Route: api/Chat/mark-read
export const markMessagesAsRead = async (messageIds: string[]) => {
  return await communicationClient.post('/Chat/mark-read', { messageIds });
};

// Delete Message (Soft Delete) - Route: api/Chat/{messageId}
export const deleteMessage = async (messageId: string) => {
  return await communicationClient.delete(`/Chat/${messageId}`);
};

// Get Student's Chat Rooms (Classes + Groups) - Route: api/Chat/rooms/student/{studentCode}
export const getStudentRooms = async (studentCode: string): Promise<Room[]> => {
  const response = await communicationClient.get(`/Chat/rooms/student/${studentCode}`);
  console.log('getStudentRooms raw response:', response);
  console.log('getStudentRooms response type:', typeof response, Array.isArray(response));
  // communicationClient might auto-unwrap, check if response IS array or has .data
  return (Array.isArray(response) ? response : response.data) as Room[];
};

// AI Chat - Route: api/AI/chat
export const askAI = async (question: string): Promise<string> => {
  const response = await communicationClient.post('/AI/chat', { question }) as unknown as { answer: string };
  return response.answer || '';
};

// Get Meetings - Route: api/Meeting
export const getMeetings = async (): Promise<Meeting[]> => {
  return await communicationClient.get('/Meeting');
};

// Get Meetings by User - Route: api/Meeting/user/{userId}
export const getMeetingsByUser = async (userId: string): Promise<Meeting[]> => {
  return await communicationClient.get(`/Meeting/user/${userId}`);
};

// Create Meeting - Route: api/Meeting/create
export const createMeeting = async (
  title: string,
  startTime: string,
  participants: string[],
  classId?: string,
  className?: string,
  subjectName?: string,
  groupId?: string,
  groupName?: string
): Promise<Meeting> => {
  const response = await communicationClient.post('/Meeting/create', {
    title,
    startTime,
    participants,
    classId,
    className,
    subjectName,
    groupId,
    groupName
  });
  return response.data;
};

// Delete Meeting - Route: api/Meeting/{id}
export const deleteMeeting = async (id: string): Promise<void> => {
  await communicationClient.delete(`/Meeting/${id}`);
};

// File Upload - Route: api/File/upload
export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await communicationClient.post('/File/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as unknown as { url: string };
  return response.url || '';
};

export default communicationClient;
