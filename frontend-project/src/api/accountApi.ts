import { createServiceClient } from './axiosClient';

// In production (Docker), use relative path (nginx proxy)
// In development, use localhost with specific port
const baseURL = import.meta.env.MODE === 'production' 
  ? '/api' 
  : (import.meta.env.VITE_ACCOUNT_SERVICE_URL || 'http://localhost:5010/api');

const client = createServiceClient(baseURL);

interface CreateAccountDto {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface LecturerDto {
  id: string;
  email: string;
  fullName: string;
  code: string;
}

// Account Service APIs
export const accountApi = {
  // Authentication
  login: (credentials: { email: string; password: string }) =>
    client.post('/auth/login', credentials),

  // Account Management
  getAccounts: (role?: string) =>
    client.get('/auth/accounts', { params: { role } }),

  getLecturers: () =>
    client.get<{ data: LecturerDto[] }>('/auth/lecturers'),

  createAccount: (data: CreateAccountDto) => client.post('/auth/create-account', data),
  deactivateAccount: (id: string) => client.put(`/auth/deactivate/${id}`),
  reactivateAccount: (id: string) => client.put(`/auth/reactivate/${id}`),
  deleteAccount: (id: string) => client.delete(`/auth/accounts/${id}`),
  importAccounts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/auth/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export default accountApi;
