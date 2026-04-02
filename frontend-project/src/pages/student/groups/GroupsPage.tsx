import { useState, useEffect } from 'react';
import courseApi from '../../../api/courseApi';
import { toast } from 'react-toastify';
import { getToken } from '../../../utils/authStorage';

interface Group {
  id: number;
  name: string;
  description?: string;
  classId: number;
  className?: string;
  memberCount: number;
  maxMembers?: number;
}

interface GroupMember {
  id: number;
  userId: string;
  studentCode?: string;
  studentName?: string;
  studentEmail?: string;
  role?: string;
  joinedAt: string;
}

export default function StudentGroupsPage() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'join'>('my');
  const [joining, setJoining] = useState(false);

  const getUserId = () => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId || '';
      } catch {
        return '';
      }
    }
    return '';
  };

  const getStudentCode = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.code || user.studentCode || '';
      } catch {
        return '';
      }
    }
    return '';
  };

  const loadMyGroups = async () => {
    setLoading(true);
    try {
      const studentCode = getStudentCode();
      
      // Get classes student is in using optimized endpoint
      const classesResponse = await courseApi.getClassesByStudent(studentCode);
      const studentClasses = classesResponse.data?.data || classesResponse.data || [];

      const userId = getUserId();
      const myGroupsList: Group[] = [];
      const availableGroupsList: Group[] = [];

      // For each class student is in
      for (const cls of studentClasses) {
        try {
          // CHANGED: Get groups from ProjectService instead of CourseService
          const groupsResponse = await fetch(`http://localhost:5234/api/ProjectGroups/class/${cls.code}`, {
            headers: {
              'Authorization': `Bearer ${getToken()}`
            }
          });
          const projectGroups = await groupsResponse.json();
          
          // Convert ProjectService groups to CourseService format
          const groups = Array.isArray(projectGroups) ? projectGroups : (projectGroups.data || []);
          
          let foundMyGroup = false;
          
          // Check which groups student belongs to
          for (const group of groups) {
            // ProjectService group structure: { id (GUID), name, classId, members, maxMembers }
            const groupMembers = group.members || [];
            
            const isGroupMember = groupMembers.some((m: { userId?: string; studentCode?: string; studentId?: string }) => 
              m.userId === userId || m.studentCode === studentCode || m.studentId === studentCode
            );

            if (isGroupMember) {
              myGroupsList.push({ 
                id: parseInt(group.id.substring(0, 8), 16) || Math.random(), // Convert GUID to number for compatibility
                name: group.name,
                classId: cls.id,
                className: cls.name,
                memberCount: groupMembers.length,
                maxMembers: group.maxMembers || 5
              });
              foundMyGroup = true;
            } else if (!foundMyGroup) {
              // Only show available groups if student hasn't joined any group in this class
              availableGroupsList.push({ 
                id: parseInt(group.id.substring(0, 8), 16) || Math.random(),
                name: group.name,
                classId: cls.id,
                className: cls.name,
                memberCount: groupMembers.length,
                maxMembers: group.maxMembers || 5
              });
            }
          }
          
          // If student already has a group in this class, remove available groups of this class
          if (foundMyGroup) {
            const filteredAvailable = availableGroupsList.filter(g => g.classId !== cls.id);
            availableGroupsList.length = 0;
            availableGroupsList.push(...filteredAvailable);
          }
        } catch (error) {
          console.error(`Error checking class ${cls.id}:`, error);
        }
      }

      setMyGroups(myGroupsList);
      setAvailableGroups(availableGroupsList);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Lỗi tải danh sách nhóm');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: number) => {
    try {
      const response = await courseApi.getGroupMembers(groupId);
      const data = response.data?.data || response.data || [];
      setMembers(data);
    } catch {
      toast.error('Lỗi tải danh sách thành viên');
      setMembers([]);
    }
  };

  useEffect(() => {
    loadMyGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    loadMembers(group.id);
  };

  const handleJoinGroup = async (groupId: number) => {
    const studentCode = getStudentCode();
    if (!studentCode) {
      toast.error('Không thể xác định mã sinh viên');
      return;
    }

    setJoining(true);
    try {
      await courseApi.joinGroup(groupId, studentCode);
      toast.success('Tham gia nhóm thành công!');
      // Reload groups to update UI
      await loadMyGroups();
      setActiveTab('my');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMsg = err.response?.data?.message || 'Không thể tham gia nhóm';
      toast.error(errorMsg);
    } finally {
      setJoining(false);
    }
  };

  if (selectedGroup) {
    return (
      <div>
        <div style={{ marginBottom: 30 }}>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#667eea',
              border: '1px solid #667eea',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            ← Quay lại danh sách nhóm
          </button>
          <h1 style={{ fontSize: 28, margin: 0, color: '#333' }}>{selectedGroup.name}</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>
            {selectedGroup.className} • {selectedGroup.description || 'Không có mô tả'}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 20, margin: '0 0 16px 0' }}>Thành viên ({members.length})</h2>
          
          {members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chưa có thành viên</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>STT</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Mã SV</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Họ tên</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 12 }}>{idx + 1}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '4px 8px',
                        background: '#e7f3ff',
                        color: '#1890ff',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {member.studentCode || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontWeight: 500 }}>{member.studentName || 'N/A'}</td>
                    <td style={{ padding: 12, color: '#666' }}>{member.studentEmail || 'N/A'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '4px 8px',
                        background: member.role === 'Leader' ? '#fffaeb' : '#e7f3ff',
                        color: member.role === 'Leader' ? '#f59e0b' : '#1890ff',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {member.role || 'Member'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: '#333' }}>Quản lý Nhóm</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Xem nhóm của bạn hoặc tham gia nhóm mới</p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid #f0f0f0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab('my')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'my' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'my' ? '#667eea' : '#666',
              fontWeight: activeTab === 'my' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 15
            }}
          >
            👥 Nhóm của tôi ({myGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('join')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'join' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'join' ? '#667eea' : '#666',
              fontWeight: activeTab === 'join' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 15
            }}
          >
            ➕ Tham gia nhóm ({availableGroups.length})
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <p style={{ fontSize: 16 }}>Đang tải...</p>
          </div>
        ) : activeTab === 'my' ? (
          // My Groups Tab
          myGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <p style={{ fontSize: 16, marginBottom: 10 }}>Bạn chưa có nhóm nào</p>
              <p style={{ fontSize: 14 }}>Chuyển sang tab "Tham gia nhóm" để tìm và tham gia nhóm</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
              {myGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  style={{
                    padding: 20,
                    background: '#fff',
                    border: '2px solid #e8e8e8',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(102,126,234,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      padding: '6px 12px',
                      background: '#667eea',
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      {group.className}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px 0', color: '#333' }}>
                    {group.name}
                  </h3>
                  
                  {group.description && (
                    <p style={{ fontSize: 14, color: '#666', margin: '0 0 12px 0' }}>
                      {group.description}
                    </p>
                  )}

                  <div style={{
                    padding: '8px 12px',
                    background: '#f0f9ff',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#667eea',
                    fontWeight: 600
                  }}>
                    👥 {group.memberCount}/{group.maxMembers || '∞'} thành viên
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Join Group Tab
          availableGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <p style={{ fontSize: 16, marginBottom: 10 }}>Không có nhóm nào để tham gia</p>
              <p style={{ fontSize: 14 }}>Bạn đã tham gia nhóm trong tất cả các lớp hoặc chưa có nhóm nào được tạo</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
              {availableGroups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    padding: 20,
                    background: '#fff',
                    border: '2px solid #e8e8e8',
                    borderRadius: 12,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      padding: '6px 12px',
                      background: '#10b981',
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      {group.className}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px 0', color: '#333' }}>
                    {group.name}
                  </h3>
                  
                  {group.description && (
                    <p style={{ fontSize: 14, color: '#666', margin: '0 0 12px 0' }}>
                      {group.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      padding: '8px 12px',
                      background: '#f0f9ff',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#667eea',
                      fontWeight: 600
                    }}>
                      👥 {group.memberCount}/{group.maxMembers || '∞'}
                    </div>
                    
                    {group.maxMembers && group.memberCount >= group.maxMembers ? (
                      <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Đã đầy</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Còn chỗ</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoinGroup(group.id)}
                    disabled={joining || (group.maxMembers !== undefined && group.memberCount >= group.maxMembers)}
                    style={{
                      width: '100%',
                      padding: '10px 20px',
                      background: (group.maxMembers !== undefined && group.memberCount >= group.maxMembers) ? '#d1d5db' : '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: (group.maxMembers !== undefined && group.memberCount >= group.maxMembers) ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: 14
                    }}
                  >
                    {joining ? 'Đang tham gia...' : (group.maxMembers !== undefined && group.memberCount >= group.maxMembers) ? 'Nhóm đã đầy' : '➕ Tham gia nhóm'}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {!loading && activeTab === 'my' && myGroups.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#f0f9ff',
          borderRadius: 8,
          border: '1px solid #e0f2fe'
        }}>
          <p style={{ color: '#0369a1', fontSize: 14, margin: 0 }}>
            👥 Bạn đang tham gia <strong>{myGroups.length}</strong> nhóm  
          </p>
        </div>
      )}
    </div>
  );
}
