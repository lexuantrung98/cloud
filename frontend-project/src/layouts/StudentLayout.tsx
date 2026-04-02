import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { clearAuth, getToken } from '../utils/authStorage';
import { useState } from 'react';
import NotificationBell from '../components/NotificationBell';
import styles from './StudentLayout.module.css';

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      {/* Mobile Menu Button */}
      <button onClick={toggleSidebar} className={styles.mobileMenuButton}>
        ☰
      </button>

      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isSidebarOpen ? styles.open : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logoTitle}>CollabSphere</h2>
          <p className={styles.logoSubtitle}>Student Portal</p>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userRole}>🎓 Sinh viên</div>
          <div className={styles.userName}>{userFullName || 'Sinh viên'}</div>
        </div>

        {/* Navigation */}
        <div className={styles.navContainer}>
          {/* Learning Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>📚 HỌC TẬP</h3>

            <Link to="/student/classes" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('classes') ? styles.navItemActive : ''}`}>
                🏫 Lớp học của tôi
              </div>
            </Link>
          </div>

          {/* Project Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>📂 DỰ ÁN</h3>

            <Link to="/student/projects" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('projects') ? styles.navItemActive : ''}`}>
                📋 Dự án của tôi
              </div>
            </Link>
          </div>

          {/* Communication Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>💬 GIAO TIẾP & CỘNG TÁC</h3>

            <Link to="/student/communication" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('communication') ? styles.navItemActive : ''}`}>
                🗨️ Chat & Họp trực tuyến
              </div>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className={styles.logoutContainer}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Top Header with Notification Bell */}
        <div className={styles.topHeader}>
          <NotificationBell />
        </div>

        {/* Page Content */}
        <div className={styles.pageContent}>
          <div className={styles.pageInner}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
