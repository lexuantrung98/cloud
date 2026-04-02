import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { clearAuth, getToken } from '../utils/authStorage';
import { useState } from 'react';
import styles from './StaffLayout.module.css';

export default function StaffLayout() {
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
          <p className={styles.sidebarSubtitle}>Unified Management</p>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userRole}>👨‍💼 Nhân viên</div>
          <div className={styles.userName}>{userFullName || 'Nhân viên'}</div>
        </div>

        {/* Navigation */}
        <div className={styles.navContainer}>
          {/* Account Management */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>
              👤 QUẢN LÝ TÀI KHOẢN
            </h3>
            <Link to="/staff/accounts" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('accounts') ? styles.navItemActive : ''}`}>
                👥 Quản lý Tài khoản
              </div>
            </Link>
          </div>

          {/* Course Management */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>
              📚 QUẢN LÝ KHÓA HỌC
            </h3>
            
            <Link to="/staff/subjects" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('subjects') ? styles.navItemActive : ''}`}>
                📖 Quản lý Môn học
              </div>
            </Link>

            <Link to="/staff/syllabus" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('syllabus') ? styles.navItemActive : ''}`}>
                📋 Quản lý Giáo trình
              </div>
            </Link>

            <Link to="/staff/classes" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('classes') ? styles.navItemActive : ''}`}>
                🏫 Quản lý Lớp học
              </div>
            </Link>

            <Link to="/staff/enrollment" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('enrollment') ? styles.navItemActive : ''}`}>
                ✍️ Quản lý Đăng ký
              </div>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className={styles.logoutSection}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content - Centered with Max-Width (Balanced) */}
      <div className={styles.mainContent}>
        {/* Centered Container with Max-Width */}
        <div className={styles.contentContainer}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
