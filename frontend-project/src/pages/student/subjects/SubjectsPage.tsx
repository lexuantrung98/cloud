import { useState, useEffect } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import styles from '../StudentPages.module.css';

interface Subject {
  id: number;
  code: string;
  name: string;
  credits: number;
  description?: string;
}

interface Syllabus {
  id: number;
  title: string;
  description?: string;
  academicYear: string;
  filePath?: string;
}

export default function StudentSubjectsPage() {
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
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Lỗi tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const loadSyllabuses = async (subjectId: number) => {
    setLoadingSyllabuses(true);
    try {
      const response = await courseApi.getSyllabusBySubject(subjectId);
      const data = response.data?.data || response.data || [];
      setSyllabuses(data);
    } catch (error) {
      console.error('Error loading syllabuses:', error);
      setSyllabuses([]);
    } finally {
      setLoadingSyllabuses(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    loadSyllabuses(subject.id);
  };

  const handleBack = () => {
    setSelectedSubject(null);
    setSyllabuses([]);
  };

  if (selectedSubject) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <button onClick={handleBack} className={styles.backButton}>
            ← Quay lại danh sách môn học
          </button>
          <h1 className={styles.pageTitle}>{selectedSubject.name}</h1>
          <p className={styles.pageSubtitle}>
            {selectedSubject.code} • {selectedSubject.credits} tín chỉ
          </p>
        </div>

        {selectedSubject.description && (
          <div className={styles.infoBox} style={{ marginBottom: 20 }}>
            <p style={{ color: '#0369a1', fontSize: 14, margin: 0 }}>
              📝 {selectedSubject.description}
            </p>
          </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>📚 Giáo trình</h2>
          
          {loadingSyllabuses ? (
            <div className={styles.loading}>
              <p className={styles.loadingText}>Đang tải...</p>
            </div>
          ) : syllabuses.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📄</div>
              <p className={styles.emptyStateTitle}>Chưa có giáo trình cho môn học này</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {syllabuses.map((syllabus) => (
                <div
                  key={syllabus.id}
                  style={{
                    padding: 20,
                    background: '#fafafa',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', color: '#333' }}>
                        📄 {syllabus.title}
                      </h3>
                      {syllabus.description && (
                        <p style={{ fontSize: 14, color: '#666', margin: '0 0 8px 0' }}>
                          {syllabus.description}
                        </p>
                      )}
                      <div style={{ fontSize: 13, color: '#999' }}>
                        Năm học: <strong>{syllabus.academicYear}</strong>
                      </div>
                    </div>
                    {syllabus.filePath && (
                      <span className={styles.badge} style={{ background: '#52c41a', color: '#fff' }}>
                        Có file
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Môn học & Giáo trình</h1>
        <p className={styles.pageSubtitle}>Xem chi tiết môn học và chương trình học</p>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <p className={styles.loadingText}>Đang tải...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📖</div>
            <p className={styles.emptyStateTitle}>Chưa có môn học nào</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                onClick={() => handleSelectSubject(subject)}
                className={styles.classCard}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className={styles.badgeCode} style={{ background: '#e7f3ff', color: '#1890ff' }}>
                    {subject.code}
                  </span>
                  <span className={styles.badgePill}>
                    {subject.credits} TC
                  </span>
                </div>
                
                <h3 className={styles.classCardTitle}>
                  {subject.name}
                </h3>
                
                {subject.description && (
                  <p style={{ 
                    fontSize: 13, 
                    color: '#666', 
                    margin: '0 0 12px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {subject.description}
                  </p>
                )}
                
                <div style={{
                  marginTop: 12,
                  padding: '6px 12px',
                  background: '#667eea',
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  Xem giáo trình →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && subjects.length > 0 && (
        <div className={styles.infoBox} style={{ marginTop: 16 }}>
          <p style={{ color: '#0369a1', fontSize: 14, margin: 0 }}>
            📚 Tổng cộng: <strong>{subjects.length}</strong> môn học
          </p>
        </div>
      )}
    </div>
  );
}
