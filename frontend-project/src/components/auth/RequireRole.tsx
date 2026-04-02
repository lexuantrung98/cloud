import { Navigate, Outlet } from 'react-router-dom';
import { getRole } from '../../utils/authStorage';

interface RequireRoleProps {
  allowedRoles: string[];
}

export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const userRole = getRole();
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <Outlet />;
}
