import { useState, useEffect, useCallback } from 'react';
import accountApi from '../../../api/accountApi';
import { toast } from 'react-toastify';
import { getToken } from '../../../utils/authStorage';
import styles from './AccountsPage.module.css';

interface Account {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Staff');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await accountApi.getAccounts(roleFilter);
      setAccounts((data as {data?: Account[]}).data || (data as unknown as Account[]) || []);
    } catch {
      toast.error('Lỗi tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    loadAccounts();
    
    // Get current user email from token
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
    setRole('Staff');
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

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Vô hiệu hóa tài khoản này?')) return;
    try {
      await accountApi.deactivateAccount(id);
      toast.success('Đã vô hiệu hóa!');
      loadAccounts();
    } catch {
      toast.error('Lỗi vô hiệu hóa');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await accountApi.reactivateAccount(id);
      toast.success('Đã kích hoạt lại!');
      loadAccounts();
    } catch {
      toast.error('Lỗi kích hoạt');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa vĩnh viễn tài khoản này? Hành động không thể hoàn tác!')) return;
    try {
      await accountApi.deleteAccount(id);
      toast.success('Đã xóa tài khoản!');
      loadAccounts();
    } catch {
      toast.error('Lỗi xóa tài khoản');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý Tài khoản</h1>
          <p className={styles.pageSubtitle}>Quản lý tài khoản Staff và Head Department</p>
        </div>
        <div>
          <button onClick={handleCreate} className={styles.createButton}>
            + Tạo tài khoản
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className={styles.filterCard}>
        <label className={styles.filterLabel}>Lọc theo vai trò:</label>
        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)} 
          className={styles.filterSelect}
        >
          <option value="">Tất cả tài khoản</option>
          <option value="Admin">Admin</option>
          <option value="Staff">Staff</option>
          <option value="HeadDepartment">Head Department</option>
          <option value="Lecturer">Lecturer</option>
          <option value="Student">Student</option>
        </select>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        {loading ? (
          <p className={styles.loading}>Đang tải...</p>
        ) : (
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeaderCell}>Email</th>
                <th className={styles.tableHeaderCell}>Họ tên</th>
                <th className={styles.tableHeaderCell}>Vai trò</th>
                <th className={styles.tableHeaderCell}>Trạng thái</th>
                <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {accounts.map((account) => {
                const isCurrentUser = account.email === currentUserEmail;
                return (
                  <tr key={account.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{account.email}</td>
                    <td className={`${styles.tableCell} ${styles.tableCellName}`}>
                      {account.fullName}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.badgeRole}>
                        {account.role}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={account.isActive ? styles.badgeActive : styles.badgeInactive}>
                        {account.isActive ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td className={`${styles.tableCell} ${styles.alignRight}`}>
                      <div className={styles.actionButtons}>
                        {account.isActive ? (
                          <button 
                            onClick={() => handleDeactivate(account.id)} 
                            disabled={isCurrentUser}
                            className={styles.buttonDeactivate}
                            title={isCurrentUser ? 'Không thể vô hiệu hóa tài khoản của chính bạn' : ''}
                          >
                            Vô hiệu hóa
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReactivate(account.id)} 
                            className={styles.buttonActivate}
                          >
                            Kích hoạt
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(account.id)} 
                          disabled={isCurrentUser}
                          className={styles.buttonDelete}
                          title={isCurrentUser ? 'Không thể xóa tài khoản của chính bạn' : ''}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Tạo tài khoản mới</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email:</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className={styles.formInput}
                placeholder="example@collabsphere.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password:</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className={styles.formInput}
                placeholder="********"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Họ tên:</label>
              <input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Nhập họ và tên đầy đủ"
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vai trò:</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className={styles.formSelect}
              >
                <option value="Staff">Staff</option>
                <option value="HeadDepartment">Head Department</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setShowModal(false)} className={styles.buttonCancel}>
                Hủy
              </button>
              <button onClick={handleSave} className={styles.buttonSave}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
