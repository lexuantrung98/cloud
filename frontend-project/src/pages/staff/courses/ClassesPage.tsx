import { useState, useEffect } from 'react';
import courseApi from '../../../api/courseApi';
import accountApi from '../../../api/accountApi';
import type { LecturerDto } from '../../../api/accountApi';
import { toast } from 'react-toastify';
import styles from '../StaffPages.module.css';

interface ClassItem {
  id: number;
  code: string;
  subjectName?: string;
  subject?: { name: string };
  semester: string;
  year: number;
  lecturerName?: string;
  lecturerEmail?: string;
}

interface SubjectItem {
  id: number;
  name: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [lecturers, setLecturers] = useState<LecturerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errorDetails: string[] } | null>(null);

  const [code, setCode] = useState('');
  const [subjectId, setSubjectId] = useState(0);
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState(2024);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [assignEmail, setAssignEmail] = useState('');

  useEffect(() => {
    loadClasses();
    loadSubjects();
    loadLecturers();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await courseApi.getClasses();
      setClasses((data as { data?: ClassItem[] }).data || (data as unknown as ClassItem[]) || []);
    } catch {
      toast.error('Lỗi tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await courseApi.getSubjects();
      setSubjects((data as { data?: SubjectItem[] }).data || (data as unknown as SubjectItem[]) || []);
    } catch (err) {
      console.error('Load subjects error:', err);
    }
  };

  const loadLecturers = async () => {
    try {
      const response = await accountApi.getLecturers();
      const lecturerData = response.data?.data || response.data || [];
      setLecturers(lecturerData);
    } catch (err) {
      console.error('Load lecturers error:', err);
    }
  };

  const handleCreate = () => {
    setCode('');
    setSubjectId(0);
    setSemester('');
    setYear(2024);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      await courseApi.createClass({ code, subjectId, semester, year });
      toast.success('Tạo lớp thành công!');
      setShowModal(false);
      loadClasses();
    } catch {
      toast.error('Lỗi tạo lớp');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa lớp học?')) return;
    try {
      await courseApi.deleteClass(id);
      toast.success('Xóa thành công!');
      loadClasses();
    } catch {
      toast.error('Lỗi xóa lớp');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const response = await courseApi.importClasses(selectedFile);
      const result = (response as unknown as {data?: unknown}).data || response;

      setImportResult({
        successCount: (result as {successCount?: number}).successCount || 0,
        errorCount: (result as {errorCount?: number}).errorCount || 0,
        errorDetails: (result as {errorDetails?: string[]}).errorDetails || []
      });

      if ((result as {successCount?: number}).successCount && (result as {successCount?: number}).successCount! > 0) {
        toast.success(`✓ Import thành công ${(result as {successCount?: number}).successCount} lớp học!`);
        loadClasses();
      }

      if ((result as {errorCount?: number}).errorCount && (result as {errorCount?: number}).errorCount! > 0) {
        toast.warning(`⚠️ Có ${(result as {errorCount?: number}).errorCount} lỗi, xem chi tiết bên dưới`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Lỗi import file');
    } finally {
      setImporting(false);
    }
  };

  const handleAssignLecturer = (classId: number) => {
    setSelectedClassId(classId);
    setAssignEmail('');
    setAssignModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedClassId || !assignEmail.trim()) {
      toast.error('Vui lòng nhập email giảng viên');
      return;
    }

    try {
      await courseApi.assignLecturer(selectedClassId, assignEmail);
      toast.success('Đã phân công giảng viên thành công!');
      setAssignModalOpen(false);
      loadClasses();
    } catch (err) {
      toast.error((err as Error).message || 'Lỗi phân công giảng viên');
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý Lớp học</h1>
          <p className={styles.pageSubtitle}>Tạo, quản lý lớp học và phân công giảng viên</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowImportModal(true)} className={styles.successButton}>
            📤 Import Excel
          </button>
          <button onClick={handleCreate} className={styles.infoButton}>
            + Tạo lớp
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? <p className={styles.loading}>Đang tải...</p> : (
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeaderCell}>Mã lớp</th>
                <th className={styles.tableHeaderCell}>Môn học</th>
                <th className={styles.tableHeaderCell}>Giảng viên</th>
                <th className={styles.tableHeaderCell}>Học kỳ</th>
                <th className={styles.tableHeaderCell}>Năm</th>
                <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.bold}`}>{cls.code}</td>
                  <td className={styles.tableCell}>{cls.subjectName || cls.subject?.name || 'N/A'}</td>
                  <td className={styles.tableCell}>
                    {cls.lecturerName ? (
                      <div className={styles.lecturerInfo}>
                        <div className={styles.lecturerName}>{cls.lecturerName}</div>
                        <div className={styles.lecturerEmail}>{cls.lecturerEmail}</div>
                      </div>
                    ) : (
                      <span className={styles.notAssigned}>Chưa phân công</span>
                    )}
                  </td>
                  <td className={styles.tableCell}>{cls.semester}</td>
                  <td className={styles.tableCell}>{cls.year}</td>
                  <td className={styles.tableCellActions}>
                    <button
                      onClick={() => handleAssignLecturer(cls.id)}
                      className={styles.successButton}
                      style={{ padding: '6px 12px', marginRight: 8 }}
                    >
                      {cls.lecturerName ? '🔄 Đổi GV' : '👨‍🏫 Phân công'}
                    </button>
                    <button onClick={() => handleDelete(cls.id)} className={styles.dangerButton}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Tạo lớp học mới</h2>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mã lớp:</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Môn học:</label>
              <select value={subjectId} onChange={(e) => setSubjectId(Number(e.target.value))} className={styles.select}>
                <option value={0}>-- Chọn môn --</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Học kỳ:</label>
              <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="VD: HK1" className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Năm:</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={styles.input} />
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setShowModal(false)} className={styles.cancelButton}>Hủy</button>
              <button onClick={handleSave} className={styles.saveButton}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <h2 className={styles.modalTitle}>📤 Import Excel Lớp Học</h2>

            <div className={styles.infoBox}>
              <h4 className={styles.infoBoxTitle}>📋 Format file Excel:</h4>
              <ul className={styles.infoBoxList}>
                <li><strong>Cột A:</strong> Mã lớp học (VD: IT001.T1002)</li>
                <li><strong>Cột B:</strong> Mã môn học (VD: IT001)</li>
                <li><strong>Cột C:</strong> Học kỳ (VD: HK1)</li>
                <li><strong>Cột D:</strong> Email giảng viên (tùy chọn)</li>
                <li><strong>Cột E:</strong> Năm (VD: 2024)</li>
              </ul>
              <p className={styles.infoBoxHint}>
                💡 Dòng 1 là header (bỏ qua), dữ liệu bắt đầu từ dòng 2
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Chọn file Excel (.xlsx):</label>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className={styles.fileInput} />
              {selectedFile && (
                <p className={styles.fileSelected}>✓ Đã chọn: {selectedFile.name}</p>
              )}
            </div>

            {importResult && (
              <div className={styles.importResult}>
                {importResult.successCount > 0 && (
                  <div className={styles.resultSuccess}>
                    <p className={styles.resultSuccessText}>✓ Thành công: {importResult.successCount} lớp học</p>
                  </div>
                )}

                {importResult.errorCount > 0 && (
                  <div className={styles.resultError}>
                    <p className={styles.resultErrorTitle}>⚠️ Lỗi: {importResult.errorCount} dòng</p>
                    <div className={styles.errorList}>
                      {importResult.errorDetails.map((error: string, index: number) => (
                        <div key={index} className={styles.errorItem}>{error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className={styles.cancelButton}
                disabled={importing}
              >
                {importResult ? 'Đóng' : 'Hủy'}
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className={styles.successButton}
                style={{ opacity: selectedFile && !importing ? 1 : 0.6, cursor: selectedFile && !importing ? 'pointer' : 'not-allowed' }}
              >
                {importing ? '⏳ Đang import...' : '📤 Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Lecturer Modal */}
      {assignModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>👨‍🏫 Phân công giảng viên</h2>
            <p className={styles.modalSubtitle}>
              Nhập email của giảng viên để tự động lấy thông tin từ AccountService
            </p>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Chọn giảng viên: <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Chọn giảng viên --</option>
                {lecturers.map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.email}>
                    {lecturer.fullName} ({lecturer.email})
                  </option>
                ))}
              </select>
              <small style={{ color: '#888', fontSize: 12 }}>
                Hệ thống sẽ tự động lấy thông tin giảng viên từ AccountService
              </small>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setAssignModalOpen(false)} className={styles.cancelButton}>
                Hủy
              </button>
              <button onClick={handleSaveAssignment} className={styles.successButton}>
                Phân công
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
