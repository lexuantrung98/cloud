import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import styles from '../StudentPages.module.css';

interface Class {
  id: number;
  name: string;
  code: string;
  subjectName?: string;
  semester: string;
  year: number;
  lecturerName?: string;
  lecturerEmail?: string;
}

export default function StudentClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  const getStudentCode = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.code) return user.code;
        if (user.studentCode) return user.studentCode;
      } catch {
        console.error('Failed to parse user');
      }
    }
    
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.code || payload.studentCode || payload.sub || '';
      } catch {
        console.error('Failed to parse token');
      }
    }
    
    return '';
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const studentCode = getStudentCode();
      
      if (!studentCode) {
        toast.error('Không thể xác định người dùng');
        setClasses([]);
        return;
      }

      const response = await courseApi.getClassesByStudent(studentCode);
      const data = response.data?.data || response.data || [];
      
      setClasses(data);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Lỗi tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Lớp học của tôi</h1>
        <p className={styles.pageSubtitle}>Xem danh sách lớp học được phân công</p>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <p className={styles.loadingText}>Đang tải...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🎓</div>
            <p className={styles.emptyStateTitle}>Bạn chưa đăng ký lớp học nào</p>
            <p className={styles.emptyStateText}>Vui lòng liên hệ giảng viên hoặc quản trị viên để được thêm vào lớp</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                onClick={() => navigate(`/student/classes/${classItem.id}`)}
                className={styles.classCard}
              >
                <div style={{ marginBottom: 12 }}>
                  <span className={styles.badgeCode}>
                    {classItem.code || `C${classItem.id}`}
                  </span>
                  <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                    {classItem.semester} - {classItem.year}
                  </span>
                </div>
                
                <h3 className={styles.classCardTitle}>
                  {classItem.name}
                </h3>
                
                <div className={styles.infoBox}>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                    📖 <strong>Môn học:</strong> {classItem.subjectName || 'Chưa có'} 
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    👨‍🏫 <strong>Giảng viên:</strong> {classItem.lecturerName || classItem.lecturerEmail || 'Chưa có'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && classes.length > 0 && (
        <div className={styles.infoBox} style={{ marginTop: 16 }}>
          <p style={{ color: '#0369a1', fontSize: 14, margin: 0 }}>
            🎓 Bạn đang học <strong>{classes.length}</strong> lớp trong học kỳ này
          </p>
        </div>
      )}
    </div>
  );
}
