import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { clearAuth, getToken } from '../utils/authStorage';
import { useState } from 'react';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Get user full name from token (initialize once)
  const getUserFullName = () => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.fullName || payload.name || '';
      } catch {
        console.error('Failed to parse token');
        return '';
      }
    }
    return '';
  };
  
  const [userFullName] = useState(getUserFullName);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layoutContainer}>
      {/* Mobile Menu Toggle */}
      <button
        className={styles.menuToggle}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isSidebarOpen ? styles.active : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar - Fixed */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>CollabSphere</h2>
          <p className={styles.sidebarSubtitle}>Admin Panel</p>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userRole}>👑 Admin</div>
          <div className={styles.userName}>{userFullName || 'Administrator'}</div>
        </div>

        {/* Navigation */}
        <div className={styles.navContainer}>
          {/* Account Management */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>
              👤 QUẢN LÝ HỆ THỐNG
            </h3>
            <Link to="/admin/accounts" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('accounts') ? styles.navItemActive : ''}`}>
                👥 Quản lý Tài khoản
              </div>
            </Link>
          </div>

          {/* System Info */}
          <div className={styles.adminInfo}>
            <div className={styles.adminInfoTitle}>📊 QUYỀN HẠN ADMIN</div>
            <div className={styles.adminInfoContent}>
              • Xem tất cả tài khoản<br/>
              • Tạo Staff/HeadDepartment<br/>
              • Kích hoạt/Vô hiệu hóa<br/>
              • Xóa tài khoản vĩnh viễn
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className={styles.logoutSection}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content - Centered with Max-Width */}
      <div className={styles.mainContent}>
        {/* Centered Container with Max-Width */}
        <div className={styles.contentContainer}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
