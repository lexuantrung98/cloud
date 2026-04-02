import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { clearAuth, getToken } from '../utils/authStorage';
import { useState } from 'react';
import styles from './HeadDepartmentLayout.module.css';

export default function HeadDepartmentLayout() {
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

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>CollabSphere</h2>
          <p className={styles.sidebarSubtitle}>Head Department Panel</p>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userRole}>👔 Trưởng phòng</div>
          <div className={styles.userName}>{userFullName || 'Trưởng phòng'}</div>
        </div>

        {/* Navigation */}
        <div className={styles.navContainer}>
          {/* Teaching Management Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>
              📚 QUẢN LÝ GIẢNG DẠY
            </h3>
            
            <Link to="/head-department/classes" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('classes') ? styles.navItemActive : ''}`}>
                🏫 Danh sách Lớp học
              </div>
            </Link>

            <Link to="/head-department/subjects" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('subjects') ? styles.navItemActive : ''}`}>
                📖 Danh sách Môn học
              </div>
            </Link>
          </div>

          {/* Project Management Section */}
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>
              📂 QUẢN LÝ DỰ ÁN
            </h3>
            
            <Link to="/head-department/projects" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('projects') && !isActive('approval') ? styles.navItemActive : ''}`}>
                📊 Tổng quan Dự án
              </div>
            </Link>

            <Link to="/head-department/projects/approval" className={styles.navLink} onClick={closeSidebar}>
              <div className={`${styles.navItem} ${isActive('approval') ? styles.navItemActive : ''}`}>
                ✅ Duyệt Dự án
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

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentContainer}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
