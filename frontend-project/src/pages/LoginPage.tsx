import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import accountApi from '../api/accountApi';
import { setToken, setRole } from '../utils/authStorage';

interface LoginResponse {
  accessToken: string;
  role: string;
  email?: string;
  fullName?: string;
  id?: string;
  code?: string; // Mã sinh viên/giảng viên
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await accountApi.login({ email, password }) as unknown as LoginResponse;
      
      // Save token and role
      setToken(response.accessToken);
      setRole(response.role);
      
      // Save user info to localStorage
      const userInfo = {
        email: response.email || email, // Use login email if not returned
        fullName: response.fullName || '',
        id: response.id || '',
        role: response.role,
        code: response.code || '' // Mã sinh viên/giảng viên
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      // Redirect based on role
      if (response.role === 'Admin') {
        navigate('/admin');
      } else if (response.role === 'Staff') {
        navigate('/staff');
      } else if (response.role === 'HeadDepartment') {
        navigate('/head-department');
      } else if (response.role === 'Lecturer') {
        navigate('/lecturer');
      } else if (response.role === 'Student') {
        navigate('/student');
      } else {
        navigate('/');
      }
      
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px 50px',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: 400
      }}>
        <h1 style={{
          fontSize: 28,
          margin: '0 0 10px 0',
          color: '#333',
          textAlign: 'center'
        }}>
          CollabSphere
        </h1>
        <p style={{
          color: '#666',
          textAlign: 'center',
          margin: '0 0 30px 0',
          fontSize: 14
        }}>
          Unified Management System
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: '#333'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                transition: 'border-color 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={{ marginBottom: 30 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
              color: '#333'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                transition: 'border-color 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
