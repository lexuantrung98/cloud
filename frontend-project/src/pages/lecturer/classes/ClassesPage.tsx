import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import { getToken } from '../../../utils/authStorage';
import styles from '../LecturerPages.module.css';

interface Class {
  id: number;
  name: string;
  code: string;
  subjectId: number;
  subjectName?: string;
  semester: string;
  year: number;
  studentCount?: number;
}

interface ClassMember {
  id: number;
  userId: string;
  studentCode?: string;
  fullName?: string;
  email?: string;
}

interface Syllabus {
  id: number;
  fileName: string;
  uploadedBy?: string;
  uploadedAt: string;
  subjectId: number;
}

export default function LecturerClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loadingSyllabuses, setLoadingSyllabuses] = useState(false);

  const getUserEmail = () => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email || payload.sub || '';
      } catch {
        console.error('Failed to parse token');
        return '';
      }
    }
    return '';
  };

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await courseApi.getClasses();
      let data = response.data?.data || response.data || [];
      
      const userEmail = getUserEmail();
      if (userEmail) {
        data = data.filter((c: Class & { lecturerEmail?: string }) => 
          c.lecturerEmail === userEmail
        );
      }
      
      setClasses(data);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Lỗi tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClassMembers = async (classId: number) => {
    setLoadingMembers(true);
    try {
      const response = await courseApi.getClassMembers(classId);
      const data = response.data?.data || response.data || [];
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Lỗi tải danh sách sinh viên');
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadSyllabuses = async (subjectId: number) => {
    setLoadingSyllabuses(true);
    try {
      const response = await courseApi.getSyllabusBySubject(subjectId);
      
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response)) {
        data = response;
      }
      
      setSyllabuses(data);
    } catch (error) {
      console.error('Error loading syllabuses:', error);
      setSyllabuses([]);
    } finally {
      setLoadingSyllabuses(false);
    }
  };

  const handleDownloadSyllabus = async (syllabusId: number, fileName: string) => {
    try {
      const response = await courseApi.downloadSyllabus(syllabusId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Tải file thành công!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi tải file');
    }
  };

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleViewClass = (classId: number) => {
    setSelectedClass(classId);
    const currentClass = classes.find(c => c.id === classId);
    loadClassMembers(classId);
    
    if (currentClass?.subjectId) {
      loadSyllabuses(currentClass.subjectId);
    }
  };

  const handleBack = () => {
    setSelectedClass(null);
    setMembers([]);
  };

  if (selectedClass) {
    const currentClass = classes.find(c => c.id === selectedClass);
    
    return (
      <div>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderWithActions}>
            <button onClick={handleBack} className={styles.backButton}>
              ← Quay lại danh sách lớp
            </button>
            <button
              onClick={() => navigate(`/lecturer/projects/create?classId=${selectedClass}`)}
              className={styles.successButton}
            >
              📁 Tạo dự án mới
            </button>
          </div>
          <h1 className={styles.pageTitle}>Chi tiết lớp: {currentClass?.name}</h1>
          <p className={styles.pageSubtitle}>
            {currentClass?.code} • {currentClass?.semester} - {currentClass?.year}
          </p>
        </div>

        {/* Syllabuses Section */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>📚 Giáo trình môn học</h2>
          
          {loadingSyllabuses ? (
            <div className={styles.loading}>
              <p className={styles.loadingText}>Đang tải giáo trình...</p>
            </div>
          ) : syllabuses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Chưa có giáo trình nào</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeaderCell}>Tên file</th>
                  <th className={styles.tableHeaderCell}>Người upload</th>
                  <th className={styles.tableHeaderCell}>Ngày upload</th>
                  <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {syllabuses.map((syllabus) => (
                  <tr key={syllabus.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} ${styles.bold}`}>
                      📄 {syllabus.fileName}
                    </td>
                    <td className={styles.tableCell}>
                      {syllabus.uploadedBy || 'N/A'}
                    </td>
                    <td className={styles.tableCell}>
                      {new Date(syllabus.uploadedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className={`${styles.tableCell} ${styles.alignRight}`}>
                      <button
                        onClick={() => handleDownloadSyllabus(syllabus.id, syllabus.fileName)}
                        className={styles.infoButton}
                      >
                        ⬇️ Tải xuống
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Students Section */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>👥 Danh sách Sinh viên</h2>
          
          {loadingMembers ? (
            <div className={styles.loading}>
              <p className={styles.loadingText}>Đang tải...</p>
            </div>
          ) : members.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Chưa có sinh viên nào trong lớp</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeaderCell}>STT</th>
                  <th className={styles.tableHeaderCell}>Mã SV</th>
                  <th className={styles.tableHeaderCell}>Họ tên</th>
                  <th className={styles.tableHeaderCell}>Email</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={member.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{index + 1}</td>
                    <td className={styles.tableCell}>
                      <span className={styles.badgeCode}>
                        {member.studentCode || member.userId}
                      </span>
                    </td>
                    <td className={`${styles.tableCell} ${styles.bold}`}>{member.fullName || 'N/A'}</td>
                    <td className={styles.tableCell}>{member.email || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.infoBox}>
          <p className={styles.infoBoxText}>
            📊 Tổng số sinh viên: <strong>{members.length}</strong>
          </p>
        </div>
      </div>
    );
  }

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
            <div className={styles.emptyStateIcon}>🏫</div>
            <p className={styles.emptyStateTitle}>Bạn chưa được phân công lớp học nào</p>
            <p className={styles.emptyStateText}>Vui lòng liên hệ quản trị viên để được phân công</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                onClick={() => handleViewClass(classItem.id)}
                className={styles.classCard}
              >
                <div className={styles.classCardContent}>
                  <div className={styles.classCardLeft}>
                    <div className={styles.classCardMeta}>
                      <span className={styles.badge}>
                        {classItem.code || `C${classItem.id}`}
                      </span>
                      <span style={{ fontSize: 13, color: '#999' }}>
                        {classItem.semester} - {classItem.year}
                      </span>
                    </div>
                    <h3 className={styles.classCardTitle}>{classItem.name}</h3>
                    <p className={styles.classCardSubject}>
                      📖 {classItem.subjectName || 'Chưa có môn học'}
                    </p>
                  </div>
                  <div className={styles.classCardRight}>
                    <div className={styles.badgePill}>
                      👥 {classItem.studentCount || 0} SV
                    </div>
                    <div className={styles.badgeView}>
                      Xem chi tiết →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && classes.length > 0 && (
        <div className={styles.infoBox}>
          <p className={styles.infoBoxText}>
            📊 Bạn đang giảng dạy <strong>{classes.length}</strong> lớp học
          </p>
        </div>
      )}
    </div>
  );
}
