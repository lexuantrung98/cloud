import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { clearAuth, getToken } from '../utils/authStorage';
import { useState } from 'react';
import NotificationBell from '../components/NotificationBell';
import styles from './LecturerLayout.module.css';

export default function LecturerLayout() {
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
          <p className={styles.logoSubtitle}>Lecturer Panel</p>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userRole}>👨‍🏫 Giảng viên</div>
          <div className={styles.userName}>{userFullName || 'Giảng viên'}</div>
        </div>

        {/* Navigation */}
        <div className={styles.navContainer}>
          {/* Teaching Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>📚 GIẢNG DẠY</h3>

            <Link to="/lecturer/classes" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('classes') ? styles.navItemActive : ''}`}>
                🏫 Lớp học của tôi
              </div>
            </Link>

            <Link to="/lecturer/groups" className={styles.navLink} onClick={closeSidebar}>
              <div
                className={`${styles.navItem} ${
                  isActive('groups') && !isActive('projects') ? styles.navItemActive : ''
                }`}
              >
                👥 Quản lý Nhóm
              </div>
            </Link>
          </div>

          {/* Project Management Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>📂 QUẢN LÝ DỰ ÁN</h3>

            <Link to="/lecturer/projects" className={styles.navLink} onClick={closeSidebar}>
              <div
                className={`${styles.navItem} ${
                  isActive('projects') &&
                  !isActive('create') &&
                  !isActive('grade') &&
                  !isActive('progress')
                    ? styles.navItemActive
                    : ''
                }`}
              >
                📋 Danh sách Dự án
              </div>
            </Link>

            <Link to="/lecturer/projects/create" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('create') ? styles.navItemActive : ''}`}>
                ➕ Tạo Dự án mới
              </div>
            </Link>

            <Link to="/lecturer/projects/grade" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('grade') ? styles.navItemActive : ''}`}>
                📝 Chấm điểm
              </div>
            </Link>
          </div>

          {/* Communication Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>💬 GIAO TIẾP & CỘNG TÁC</h3>

            <Link to="/lecturer/communication" className={styles.navLink} onClick={closeSidebar}>
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
