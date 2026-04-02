import { useState, useEffect } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import styles from './ClassesPage.module.css';

interface Class {
  id: number;
  name: string;
  code: string;
  subjectName?: string;
  semester: string;
  year: number;
  lecturerName?: string;
  lecturerEmail?: string;
  studentCount?: number;
}

export default function HeadDepartmentClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await courseApi.getClasses();
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

  const filteredClasses = classes.filter((classItem) =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.subjectName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Danh sách Lớp học</h1>
        <p className={styles.pageSubtitle}>Xem tất cả các lớp học trong hệ thống</p>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="🔍 Tìm kiếm theo tên lớp, mã lớp, hoặc môn học..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>Đang tải...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🏫</div>
            <p className={styles.emptyStateTitle}>
              {searchTerm ? 'Không tìm thấy lớp học nào' : 'Chưa có lớp học nào'}
            </p>
            <p className={styles.emptyStateText}>
              {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Danh sách lớp học sẽ hiển thị tại đây khi có dữ liệu'}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeaderCell}>Mã lớp</th>
                <th className={styles.tableHeaderCell}>Tên lớp</th>
                <th className={styles.tableHeaderCell}>Môn học</th>
                <th className={styles.tableHeaderCell}>Học kỳ</th>
                <th className={styles.tableHeaderCell}>Giảng viên</th>
                <th className={`${styles.tableHeaderCell} ${styles.alignCenter}`}>Số SV</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((classItem) => (
                <tr key={classItem.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <span className={styles.codeBadge}>
                      {classItem.code || `C${classItem.id}`}
                    </span>
                  </td>
                  <td className={`${styles.tableCell} ${styles.tableCellName}`}>
                    {classItem.name}
                  </td>
                  <td className={styles.tableCell}>
                    {classItem.subjectName || '-'}
                  </td>
                  <td className={styles.tableCell}>
                    {classItem.semester} - {classItem.year}
                  </td>
                  <td className={styles.tableCell}>
                    {classItem.lecturerName || classItem.lecturerEmail || 'Chưa phân công'}
                  </td>
                  <td className={`${styles.tableCell} ${styles.alignCenter}`}>
                    <span className={styles.countBadge}>
                      {classItem.studentCount || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filteredClasses.length > 0 && (
        <div className={styles.statsCard}>
          <p className={styles.statsText}>
            📊 {searchTerm ? `Tìm thấy: ${filteredClasses.length}/${classes.length}` : `Tổng cộng: ${classes.length}`} lớp học
          </p>
        </div>
      )}
    </div>
  );
}
