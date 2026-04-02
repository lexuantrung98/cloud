import { useState, useEffect, useCallback } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import styles from '../StudentPages.module.css';

interface Subject {
  id: number;
  code: string;
  name: string;
}

interface Syllabus {
  id: number;
  subjectId: number;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export default function StudentSyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(0);
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSyllabuses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courseApi.getSyllabusBySubject(selectedSubjectId);
      setSyllabuses((data as {data?: Syllabus[]}).data || (data as unknown as Syllabus[]) || []);
    } catch {
      console.log('No syllabus found');
      setSyllabuses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedSubjectId > 0) {
      loadSyllabuses();
    } else {
      setSyllabuses([]);
    }
  }, [selectedSubjectId, loadSyllabuses]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  useEffect(() => {
    const loadEnrolledSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        const studentEmail = payload.email || payload.name;
        
        const classesData = await courseApi.getClassesByStudent(studentEmail);
        const classes = (classesData as {data?: unknown[]}).data || (classesData as unknown as unknown[]) || [];
        
        const uniqueSubjects = new Map<number, Subject>();
        classes.forEach((classItem: unknown) => {
          const item = classItem as { subject?: Subject };
          if (item.subject) {
            uniqueSubjects.set(item.subject.id, {
              id: item.subject.id,
              code: item.subject.code,
              name: item.subject.name
            });
          }
        });
        
        setSubjects(Array.from(uniqueSubjects.values()));
      } catch (error) {
        console.error('Error loading enrolled subjects:', error);
        toast.error('Lỗi tải danh sách môn học');
      }
    };
    loadEnrolledSubjects();
  }, []);

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
      toast.success('Tải xuống thành công!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi tải file');
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Giáo trình môn học</h1>
        <p className={styles.pageSubtitle}>Xem và tải giáo trình của các môn học</p>
      </div>

      <div className={styles.card} style={{ marginBottom: 20 }}>
        <label className={styles.formLabel}>Chọn môn học:</label>
        <select 
          value={selectedSubjectId} 
          onChange={(e) => setSelectedSubjectId(Number(e.target.value))} 
          className={styles.select}
        >
          <option value={0}>-- Chọn môn học để xem giáo trình --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code} - {subject.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSubjectId > 0 && (
        <div className={styles.card}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '2px solid #f0f0f0'
          }}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
              📚 Giáo trình môn: <span style={{ color: '#667eea' }}>{selectedSubject?.name}</span>
            </h3>
            <span className={styles.badge} style={{ background: '#e7f3ff', color: '#1890ff' }}>
              {syllabuses.length} giáo trình
            </span>
          </div>
          
          {loading ? (
            <div className={styles.loading}>
              <p className={styles.loadingText}>Đang tải...</p>
            </div>
          ) : syllabuses.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📄</div>
              <p className={styles.emptyStateTitle}>Chưa có giáo trình nào cho môn học này</p>
              <p className={styles.emptyStateText}>Vui lòng liên hệ giảng viên hoặc staff để được hỗ trợ</p>
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
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#f5f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.background = '#fafafa';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      background: '#e7f3ff', 
                      borderRadius: 8, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: 24
                    }}>
                      📄
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 600, color: '#333' }}>
                        {syllabus.fileName}
                      </h4>
                      <p style={{ margin: '0 0 2px 0', fontSize: 13, color: '#888' }}>
                        Người đăng tải: <strong>{syllabus.uploadedBy || 'N/A'}</strong>
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                        Ngày đăng tải: {new Date(syllabus.uploadedAt).toLocaleString('vi-VN', {
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
                    className={styles.successButton}
                    style={{ gap: 8 }}
                  >
                    📥 Tải xuống
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSubjectId === 0 && (
        <div className={styles.card} style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📚</div>
          <h2 style={{ fontSize: 20, color: '#333', marginBottom: 10 }}>Chọn môn học để xem giáo trình</h2>
          <p style={{ color: '#999', fontSize: 14 }}>
            Sử dụng dropdown phía trên để chọn môn học và xem danh sách giáo trình
          </p>
        </div>
      )}
    </div>
  );
}
