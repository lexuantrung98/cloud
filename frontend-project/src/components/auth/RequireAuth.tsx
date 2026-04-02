import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { getToken, setToken, setRole, isTokenExpired } from '../../utils/authStorage';

export default function RequireAuth() {
  const [searchParams] = useSearchParams();
  
  // Get token from URL (for cross-origin auth from AccountService)
  const urlToken = searchParams.get('token');
  const urlRole = searchParams.get('role');
  
  // Process token synchronously with useMemo
  const token = useMemo(() => {
    if (urlToken && urlRole) {
      setToken(urlToken);
      setRole(urlRole);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return urlToken;
    }
    return getToken();
  }, [urlToken, urlRole]);
  
  // Redirect if no token or expired
  if (!token || isTokenExpired()) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}
