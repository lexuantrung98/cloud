import { useState, useEffect, useCallback } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import styles from '../StaffPages.module.css';

interface ClassItem {
  id: number;
  code: string;
  subjectName?: string;
  subject?: { name: string };
}

interface Member {
  id: number;
  studentCode?: string;
  fullName?: string;
  email?: string;
}

export default function EnrollmentPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [studentCode, setStudentCode] = useState('');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);

  useEffect(() => {
    courseApi.getClasses()
      .then(data => setClasses((data as {data?: ClassItem[]}).data || (data as unknown as ClassItem[]) || []))
      .catch(() => toast.error('Lỗi tải danh sách lớp'));
  }, []);

  const refreshMembers = useCallback(() => {
    if (selectedClassId > 0) {
      courseApi.getClassMembers(selectedClassId)
        .then(data => setMembers((data as {data?: Member[]}).data || (data as unknown as Member[]) || []))
        .catch(() => toast.error('Lỗi tải danh sách sinh viên'));
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId > 0) {
      refreshMembers();
    }
  }, [selectedClassId, refreshMembers]);

  const handleAddStudent = async () => {
    if (!studentCode.trim()) {
      toast.error('Vui lòng nhập mã sinh viên');
      return;
    }
    if (selectedClassId === 0) {
      toast.error('Vui lòng chọn lớp');
      return;
    }

    try {
      await courseApi.addMember(selectedClassId, studentCode);
      toast.success('Thêm sinh viên thành công!');
      setStudentCode('');
      refreshMembers();
    } catch {
      toast.error('Lỗi thêm sinh viên');
    }
  };

  const handleRemove = async (memberId: number) => {
    if (!window.confirm('Xóa sinh viên khỏi lớp?')) return;
    
    try {
      await courseApi.removeMember(selectedClassId, memberId);
      toast.success('Xóa thành công!');
      refreshMembers();
    } catch {
      toast.error('Lỗi xóa sinh viên');
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
    if (selectedClassId === 0) {
      toast.error('Vui lòng chọn lớp trước');
      return;
    }
    
    setImporting(true);
    setImportCount(null);
    
    try {
      const result = await courseApi.importMembers(selectedClassId, selectedFile);
      const count = (result as {data?: number}).data || (result as unknown as number) || 0;
      
      setImportCount(count);
      if (count > 0) {
        toast.success(`✓ Import thành công ${count} sinh viên!`);
        refreshMembers();
      } else {
        toast.warning('Không có sinh viên nào được thêm. Kiểm tra file Excel.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Lỗi import file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle} style={{ marginTop: 0 }}>Quản lý Sinh viên</h1>
      <p className={styles.pageSubtitle} style={{ marginBottom: 30 }}>Thêm sinh viên vào lớp học</p>

      <div className={styles.filterCard}>
        <label className={styles.formLabel}>Chọn lớp học:</label>
        <select value={selectedClassId} onChange={(e) => setSelectedClassId(Number(e.target.value))} className={styles.select}>
          <option value={0}>-- Chọn lớp --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.code} - {cls.subjectName || cls.subject?.name}</option>
          ))}
        </select>
      </div>

      {selectedClassId > 0 && (
        <>
          <div className={styles.inputGroup}>
            <input 
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              placeholder="Nhập mã sinh viên"
              className={`${styles.input} ${styles.inputFlex}`}
              onKeyPress={(e) => e.key === 'Enter' && handleAddStudent()}
            />
            <button onClick={handleAddStudent} className={styles.infoButton}>
              Thêm SV
            </button>
            <button onClick={() => setShowImportModal(true)} className={styles.successButton}>
              📤 Import Excel
            </button>
          </div>

          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Danh sách sinh viên ({members.length})</h3>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeaderCell}>MSSV</th>
                  <th className={styles.tableHeaderCell}>Họ tên</th>
                  <th className={styles.tableHeaderCell}>Email</th>
                  <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} ${styles.bold}`}>{member.studentCode || 'N/A'}</td>
                    <td className={styles.tableCell}>{member.fullName || 'N/A'}</td>
                    <td className={styles.tableCell}>{member.email || 'N/A'}</td>
                    <td className={`${styles.tableCell} ${styles.alignRight}`}>
                      <button onClick={() => handleRemove(member.id)} className={styles.dangerButton}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <h2 className={styles.modalTitle}>📤 Import Excel Sinh Viên</h2>

            <div className={styles.infoBox}>
              <h4 className={styles.infoBoxTitle}>📋 Format file Excel:</h4>
              <ul className={styles.infoBoxList}>
                <li><strong>Cột A:</strong> Mã sinh viên (VD: SV000001, SV000002)</li>
              </ul>
              <p className={styles.infoBoxHint}>
                💡 Dòng 1 là header (bỏ qua), dữ liệu bắt đầu từ dòng 2. Hệ thống sẽ tự động lấy thông tin sinh viên từ AccountService.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Chọn file Excel (.xlsx):</label>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className={styles.fileInput} />
              {selectedFile && (
                <p className={styles.fileSelected}>✓ Đã chọn: {selectedFile.name}</p>
              )}
            </div>

            {importCount !== null && (
              <div className={styles.importResult}>
                {importCount > 0 ? (
                  <div className={styles.resultSuccess}>
                    <p className={styles.resultSuccessText}>✓ Thành công: {importCount} sinh viên</p>
                  </div>
                ) : (
                  <div className={styles.resultError}>
                    <p className={styles.resultErrorTitle}>⚠️ Không có sinh viên nào được thêm. Kiểm tra lại file Excel.</p>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportCount(null);
                }}
                className={styles.cancelButton}
                disabled={importing}
              >
                {importCount !== null ? 'Đóng' : 'Hủy'}
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
