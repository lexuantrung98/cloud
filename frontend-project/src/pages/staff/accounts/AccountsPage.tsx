import { useState, useEffect, useCallback } from 'react';
import accountApi from '../../../api/accountApi';
import { toast } from 'react-toastify';
import { getToken } from '../../../utils/authStorage';
import styles from '../StaffPages.module.css';

interface Account {
  id: string;
  email: string;
  fullName: string;
  code?: string;
  role: string;
  isActive: boolean;
}

export default function StaffAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errorDetails: string[] } | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Student');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await accountApi.getAccounts(roleFilter);
      setAccounts((data as { data?: Account[] }).data || (data as unknown as Account[]) || []);
    } catch {
      toast.error('Lỗi tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    loadAccounts();
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserEmail(payload.email || payload.sub || '');
      } catch {
        console.error('Failed to parse token');
      }
    }
  }, [loadAccounts]);

  const handleCreate = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('Student');
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      await accountApi.createAccount({ email, password, fullName, role });
      toast.success('Tạo tài khoản thành công!');
      setShowModal(false);
      loadAccounts();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Lỗi tạo tài khoản');
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
      const response = await accountApi.importAccounts(selectedFile);
      const result = response.data || response;

      setImportResult(result);

      if (result.successCount > 0) {
        toast.success(`✓ Import thành công ${result.successCount} tài khoản!`);
      }

      if (result.errorCount > 0) {
        toast.warning(`⚠️ Có ${result.errorCount} lỗi, xem chi tiết bên dưới`);
      }

      loadAccounts();
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; response?: { data?: { message?: string } } };
      if (err?.message?.includes('ERR_UPLOAD_FILE_CHANGED') || err?.code === 'ERR_UPLOAD_FILE_CHANGED') {
        toast.info('File đã được upload, đang kiểm tra kết quả...');
        setTimeout(() => loadAccounts(), 1000);
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
          <h1 className={styles.pageTitle}>Quản lý Tài khoản</h1>
          <p className={styles.pageSubtitle}>Quản lý tài khoản Lecturer và Student</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowImportModal(true)} className={styles.successButton}>
            📤 Import Excel
          </button>
          <button onClick={handleCreate} className={styles.primaryButton}>
            + Tạo tài khoản
          </button>
        </div>
      </div>

      <div className={styles.filterCard}>
        <label className={styles.formLabel}>Lọc theo vai trò:</label>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={styles.select}>
          <option value="">Tất cả tài khoản</option>
          <option value="Lecturer">Lecturer</option>
          <option value="Student">Student</option>
        </select>
      </div>

      <div className={styles.card}>
        {loading ? <p className={styles.loading}>Đang tải...</p> : (
          <>
            {accounts.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateIcon}>📋</p>
                <p className={styles.emptyStateTitle}>Chưa có tài khoản nào</p>
                <p className={styles.emptyStateText}>Bạn chỉ thấy tài khoản của mình và các tài khoản do bạn tạo</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeaderCell}>Email</th>
                    <th className={styles.tableHeaderCell}>Họ tên</th>
                    <th className={styles.tableHeaderCell}>Mã SV</th>
                    <th className={styles.tableHeaderCell}>Vai trò</th>
                    <th className={styles.tableHeaderCell}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => {
                    const isCurrentUser = account.email === currentUserEmail;
                    return (
                      <tr key={account.id} className={`${styles.tableRow} ${isCurrentUser ? styles.highlight : ''}`}>
                        <td className={styles.tableCell}>
                          {account.email}
                          {isCurrentUser && <span className={styles.currentUserLabel}>(Bạn)</span>}
                        </td>
                        <td className={`${styles.tableCell} ${styles.bold}`}>{account.fullName}</td>
                        <td className={styles.tableCell}>
                          {account.role === 'Student' && account.code ? (
                            <span className={styles.codeBadge}>{account.code}</span>
                          ) : (
                            <span className={styles.notAssigned}>-</span>
                          )}
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.roleBadge}>{account.role}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={`${styles.statusBadge} ${account.isActive ? styles.active : styles.inactive}`}>
                            {account.isActive ? 'Hoạt động' : 'Vô hiệu'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Tạo tài khoản mới</h2>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email:</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password:</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Họ tên:</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vai trò:</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.select}>
                <option value="Student">Student</option>
                <option value="Lecturer">Lecturer</option>
              </select>
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
            <h2 className={styles.modalTitle}>📤 Import Excel</h2>

            <div className={styles.infoBox}>
              <h4 className={styles.infoBoxTitle}>📋 Format file Excel:</h4>
              <ul className={styles.infoBoxList}>
                <li><strong>Cột A:</strong> Họ và tên (VD: Nguyễn Văn A)</li>
                <li><strong>Cột B:</strong> Email (VD: nguyenvana@student.uit.edu.vn)</li>
                <li><strong>Cột C:</strong> Vai trò - Role (VD: Student, Lecturer, Staff)</li>
              </ul>
              <p className={styles.infoBoxHint}>
                💡 Dòng 1 là header (bỏ qua), dữ liệu bắt đầu từ dòng 2. Mã sinh viên sẽ tự động tạo (SV000001, SV000002...).
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
                    <p className={styles.resultSuccessText}>✓ Thành công: {importResult.successCount} tài khoản</p>
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
