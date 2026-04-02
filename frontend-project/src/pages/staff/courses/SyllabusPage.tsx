import { useState, useEffect, useCallback } from "react";
import courseApi from "../../../api/courseApi";
import { toast } from "react-toastify";
import styles from '../StaffPages.module.css';

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

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(0);
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSyllabuses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courseApi.getSyllabusBySubject(selectedSubjectId);
      setSyllabuses(
        (data as { data?: Syllabus[] }).data ||
          (data as unknown as Syllabus[]) ||
          [],
      );
    } catch {
      setSyllabuses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const data = await courseApi.getSubjects();
        setSubjects(
          (data as { data?: Subject[] }).data ||
            (data as unknown as Subject[]) ||
            [],
        );
      } catch {
        toast.error("Lỗi tải danh sách môn học");
      }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubjectId > 0) {
      loadSyllabuses();
    }
  }, [selectedSubjectId, loadSyllabuses]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedSubjectId === 0) {
      toast.error("Vui lòng chọn môn học trước");
      return;
    }

    try {
      await courseApi.uploadSyllabus(selectedSubjectId, file);
      toast.success("Upload giáo trình thành công!");
      loadSyllabuses();
    } catch {
      toast.error("Lỗi upload giáo trình");
    }
    e.target.value = "";
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Xóa giáo trình này?")) return;

    try {
      await courseApi.deleteSyllabus(id);
      toast.success("Xóa thành công!");
      loadSyllabuses();
    } catch {
      toast.error("Lỗi xóa giáo trình");
    }
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
      toast.success('Tải xuống thành công!');
    } catch {
      toast.error('Lỗi tải file');
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div>
      <div className={styles.pageHeaderSingle}>
        <h1 className={styles.pageTitle}>Quản lý Giáo trình</h1>
        <p className={styles.pageSubtitle}>Upload và quản lý giáo trình cho các môn học</p>
      </div>

      <div className={styles.filterCard}>
        <label className={styles.formLabel}>Chọn môn học:</label>
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
          className={styles.select}
        >
          <option value={0}>-- Chọn môn học --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code} - {subject.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSubjectId > 0 && (
        <>
          <div className={styles.uploadCard}>
            <p className={styles.pageSubtitle} style={{ margin: '0 0 15px 0' }}>
              📚 Upload giáo trình cho môn:{" "}
              <strong>{selectedSubject?.name}</strong>
            </p>
            <label className={styles.uploadLabel}>
              📤 Chọn file để upload
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={handleUpload}
                className={styles.uploadHiddenInput}
              />
            </label>
            <p className={styles.uploadHint}>
              Hỗ trợ: PDF, Word, PowerPoint
            </p>
          </div>

          <div className={styles.card}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>
              Giáo trình đã upload ({syllabuses.length})
            </h3>

            {loading ? (
              <p className={styles.loading}>Đang tải...</p>
            ) : syllabuses.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateIcon}>📚</p>
                <p className={styles.emptyStateText}>Chưa có giáo trình nào cho môn học này</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeaderCell}>Tên file</th>
                    <th className={styles.tableHeaderCell}>Người upload</th>
                    <th className={styles.tableHeaderCell}>Ngày giờ upload</th>
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
                        {new Date(syllabus.uploadedAt).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className={styles.tableCellActions}>
                        <button
                          onClick={() => handleDownload(syllabus.id, syllabus.fileName)}
                          className={styles.successButton}
                          style={{ padding: '6px 12px' }}
                        >
                          Tải xuống
                        </button>
                        <button
                          onClick={() => handleDelete(syllabus.id)}
                          className={styles.dangerButton}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
