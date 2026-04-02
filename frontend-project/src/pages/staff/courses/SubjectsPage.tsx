import { useState, useEffect } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import styles from '../StaffPages.module.css';

interface Subject {
  id: number;
  code: string;
  name: string;
  credits: number;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errorDetails: string[] } | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(3);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await courseApi.getSubjects();
      setSubjects((data as { data?: Subject[] }).data || (data as unknown as Subject[]) || []);
    } catch {
      toast.error('Lỗi tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCode('');
    setName('');
    setCredits(3);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      await courseApi.createSubject({ code, name, credits });
      toast.success('Tạo môn học thành công!');
      setShowModal(false);
      loadSubjects();
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa?')) return;
    try {
      await courseApi.deleteSubject(id);
      toast.success('Xóa thành công!');
      loadSubjects();
    } catch {
      toast.error('Lỗi xóa môn học');
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
      const response = await courseApi.importSubjects(selectedFile);
      const apiResponse = response.data || response;
      const result = apiResponse.data || apiResponse;

      if (!result || (result.successCount === undefined && result.errorCount === undefined)) {
        toast.error('Lỗi: Không nhận được kết quả import từ server');
        return;
      }

      setImportResult({
        successCount: result.successCount || 0,
        errorCount: result.errorCount || 0,
        errorDetails: result.errorDetails || []
      });

      if (result.successCount > 0) {
        toast.success(`✓ Import thành công ${result.successCount} môn học!`);
      }

      if (result.errorCount > 0) {
        toast.warning(`⚠️ Có ${result.errorCount} lỗi, xem chi tiết bên dưới`);
      }

      loadSubjects();
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; response?: { data?: { message?: string } } };
      if (err?.message?.includes('ERR_UPLOAD_FILE_CHANGED') || err?.code === 'ERR_UPLOAD_FILE_CHANGED') {
        toast.info('File đã được upload, đang kiểm tra kết quả...');
        setTimeout(() => loadSubjects(), 1000);
      } else {
        toast.error(err.response?.data?.message || 'Lỗi import file');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý Môn học</h1>
          <p className={styles.pageSubtitle}>Tạo, sửa, xóa và import môn học</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowImportModal(true)} className={styles.successButton}>
            📤 Import Excel
          </button>
          <button onClick={handleCreate} className={styles.infoButton}>
            + Tạo mới
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <p className={styles.loading}>Đang tải...</p>
        ) : (
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeaderCell}>Mã môn</th>
                <th className={styles.tableHeaderCell}>Tên môn học</th>
                <th className={styles.tableHeaderCell}>Số tín chỉ</th>
                <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.bold}`}>{subject.code}</td>
                  <td className={styles.tableCell}>{subject.name}</td>
                  <td className={styles.tableCell}>{subject.credits}</td>
                  <td className={`${styles.tableCell} ${styles.alignRight}`}>
                    <button onClick={() => handleDelete(subject.id)} className={styles.dangerButton}>
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
            <h2 className={styles.modalTitle}>Tạo môn học mới</h2>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mã môn:</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên môn:</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số tín chỉ:</label>
              <input type="number" value={credits} onChange={(e) => setCredits(Number(e.target.value))} className={styles.input} />
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
            <h2 className={styles.modalTitle}>📤 Import Excel Môn Học</h2>

            <div className={styles.infoBox}>
              <h4 className={styles.infoBoxTitle}>📋 Format file Excel:</h4>
              <ul className={styles.infoBoxList}>
                <li><strong>Cột A:</strong> Mã môn (VD: IT001, IT002)</li>
                <li><strong>Cột B:</strong> Tên môn học</li>
                <li><strong>Cột C:</strong> Số tín chỉ (số nguyên)</li>
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
                    <p className={styles.resultSuccessText}>✓ Thành công: {importResult.successCount} môn học</p>
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
    </div>
  );
}
