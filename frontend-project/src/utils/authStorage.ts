// Authentication storage utilities
const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getRole = (): string | null => {
  return localStorage.getItem(ROLE_KEY);
};

export const setRole = (role: string): void => {
  localStorage.setItem(ROLE_KEY, role);
};

export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
};

export const isTokenExpired = (): boolean => {
 const token = getToken();
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch {
    return true;
  }
};

export const redirectToLogin = (): void => {
  clearAuth();
  window.location.href = '/login';
};
