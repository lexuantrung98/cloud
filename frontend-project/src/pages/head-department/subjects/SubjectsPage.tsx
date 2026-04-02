import { useState, useEffect, useCallback } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import { ArrowLeft, Download } from 'lucide-react';
import styles from './SubjectsPage.module.css';

interface Subject {
  id: number;
  code: string;
  name: string;
  credits: number;
  description?: string;
}

interface Syllabus {
  id: number;
  subjectId: number;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export default function HeadDepartmentSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loadingSyllabuses, setLoadingSyllabuses] = useState(false);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const response = await courseApi.getSubjects();
      const data = response.data?.data || response.data || [];
      setSubjects(data);
    } catch {
      toast.error('Lỗi tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const loadSyllabuses = useCallback(async (subjectId: number) => {
    setLoadingSyllabuses(true);
    try {
      const data = await courseApi.getSyllabusBySubject(subjectId);
      setSyllabuses((data as {data?: Syllabus[]}).data || (data as unknown as Syllabus[]) || []);
    } catch {
      setSyllabuses([]);
    } finally {
      setLoadingSyllabuses(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    loadSyllabuses(subject.id);
  };

  const handleBackToList = () => {
    setSelectedSubject(null);
    setSyllabuses([]);
  };

  const handleDownload = async (syllabusId: number, fileName: string) => {
    try {
      const response = await courseApi.downloadSyllabus(syllabusId);
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Lỗi tải file');
    }
  };

  // Show syllabuses view if subject is selected
  if (selectedSubject) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <button onClick={handleBackToList} className={styles.backButton}>
            <ArrowLeft size={16} />
            Quay lại danh sách môn học
          </button>
          <h1 className={styles.pageTitle}>
            Giáo trình môn: {selectedSubject.name}
          </h1>
          <p className={styles.pageSubtitle}>
            {selectedSubject.code} • {selectedSubject.credits} tín chỉ
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>📚 Danh sách giáo trình</h3>
            <span className={styles.badge}>
              {syllabuses.length} giáo trình
            </span>
          </div>
          
          {loadingSyllabuses ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Đang tải...</p>
            </div>
          ) : syllabuses.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📄</div>
              <p className={styles.emptyStateTitle}>Chưa có giáo trình nào cho môn học này</p>
              <p className={styles.emptyStateText}>Liên hệ Staff hoặc Admin để upload giáo trình</p>
            </div>
          ) : (
            <div className={styles.syllabusGrid}>
              {syllabuses.map((syllabus) => (
                <div key={syllabus.id} className={styles.syllabusItem}>
                  <div className={styles.syllabusInfo}>
                    <div className={styles.syllabusIcon}>📄</div>
                    <div className={styles.syllabusDetails}>
                      <h4>{syllabus.fileName}</h4>
                      <p>Người upload: <strong>{syllabus.uploadedBy || 'N/A'}</strong></p>
                      <p>
                        Ngày upload: {new Date(syllabus.uploadedAt).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownload(syllabus.id, syllabus.fileName)}
                    className={styles.downloadButton}
                  >
                    <Download size={16} />
                    Tải xuống
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show subjects list
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Danh sách Môn học</h1>
        <p className={styles.pageSubtitle}>Xem tất cả các môn học và giáo trình trong hệ thống</p>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>Đang tải...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📖</div>
            <p className={styles.emptyStateTitle}>Chưa có môn học nào</p>
            <p className={styles.emptyStateText}>Danh sách môn học sẽ hiển thị tại đây khi có dữ liệu</p>
          </div>
        ) : (
          <div className={styles.subjectGrid}>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                onClick={() => handleSelectSubject(subject)}
                className={styles.subjectCard}
              >
                <div className={styles.subjectCardHeader}>
                  <div className={styles.codeBadge}>{subject.code}</div>
                  <div className={styles.creditsBadge}>{subject.credits} TC</div>
                </div>
                
                <h3 className={styles.subjectTitle}>{subject.name}</h3>
                
                {subject.description && (
                  <p className={styles.subjectDescription}>{subject.description}</p>
                )}
                
                <div className={styles.subjectAction}>📚 Xem giáo trình →</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && subjects.length > 0 && (
        <div className={styles.statsCard}>
          <p className={styles.statsText}>
            📊 Tổng cộng: <strong>{subjects.length}</strong> môn học | <strong>{subjects.reduce((sum, s) => sum + s.credits, 0)}</strong> tín chỉ
          </p>
        </div>
      )}
    </div>
  );
}
