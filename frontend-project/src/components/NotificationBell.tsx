import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { createServiceClient } from '../api/axiosClient';
import { onForegroundMessage } from '../firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';
import { getToken } from '../utils/authStorage';
import {
  type Notification,
  type FilterType,
  type DateGroup,
  getNotificationIcon,
  groupNotificationsByDate,
  getDateGroupLabel,
  filterNotifications,
  formatRelativeTime,
  getFilterCounts,
} from '../utils/notificationHelpers';
import styles from './NotificationBell.module.css';

// Create API client
const apiClient = createServiceClient('/api');

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<DateGroup>>(new Set());
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) {
      console.log('No token, skipping notification fetch');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/communication/Notifications?limit=50', {
        ...({ skipAutoLogout: true } as unknown as Record<string, unknown>),
      });
      
      // Safely handle response - ensure it's an array
      let notifs: Notification[] = [];
      if (Array.isArray(response)) {
        notifs = response as unknown as Notification[];
      } else if (response && typeof response === 'object' && 'data' in response) {
        const data = (response as { data: unknown }).data;
        notifs = Array.isArray(data) ? (data as Notification[]) : [];
      }
      
      setNotifications(notifs);
      
      const count = notifs.filter((n) => !n.isRead).length;
      setUnreadCount(count);
      
      // Trigger pulse animation if count increased
      if (count > unreadCount) {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 2000);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [unreadCount]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await apiClient.get('/communication/Notifications/count/unread', {
        ...({ skipAutoLogout: true } as unknown as Record<string, unknown>),
      });
      const newCount = (response as unknown as { count: number }).count;
      
      // Trigger pulse if count increased
      if (newCount > unreadCount) {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 2000);
      }
      
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [unreadCount]);

  // Mark as read (optimistic update)
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiClient.put(`/communication/Notifications/${id}/read`, {}, {
        ...({ skipAutoLogout: true } as unknown as Record<string, unknown>),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
      // Revert on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setLoading(true);
      
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await apiClient.put('/communication/Notifications/read-all');
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Lỗi khi đánh dấu đã đọc');
      // Revert on error
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await apiClient.delete(`/communication/Notifications/${id}`, {
        ...({ skipAutoLogout: true } as unknown as Record<string, unknown>),
      });
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Lỗi khi xóa thông báo');
      // Revert on error
      fetchNotifications();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      setIsOpen(false);
      window.location.href = notification.actionUrl;
    }
  }, [markAsRead]);

  // Toggle date group collapse
  const toggleGroupCollapse = useCallback((group: DateGroup) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  }, []);

  // Filter notifications when filter changes
  useEffect(() => {
    try {
      if (Array.isArray(notifications)) {
        setFilteredNotifications(filterNotifications(notifications, filter));
      } else {
        console.warn('Notifications is not an array:', notifications);
        setFilteredNotifications([]);
      }
    } catch (error) {
      console.error('Error filtering notifications:', error);
      setFilteredNotifications([]);
    }
  }, [notifications, filter]);

  // Initial fetch with token retry
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkTokenAndFetch = () => {
      const token = getToken();
      if (token) {
        fetchNotifications();
        return true;
      }
      return false;
    };

    const tokenCheckInterval = setInterval(() => {
      attempts++;
      const success = checkTokenAndFetch();

      if (success || attempts >= maxAttempts) {
        clearInterval(tokenCheckInterval);
      }
    }, 500);

    // Poll for updates every 5 seconds (real-time notifications)
    const updateInterval = setInterval(fetchUnreadCount, 5000);

    return () => {
      clearInterval(tokenCheckInterval);
      clearInterval(updateInterval);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // Listen for Firebase foreground messages
  useEffect(() => {
    onForegroundMessage((payload: unknown) => {
      const message = payload as MessagePayload;
      console.log('📩 New notification received:', message);

      // Refresh notifications
      fetchNotifications();

      // Show toast
      const title = message.notification?.title || 'Thông báo mới';
      const body = message.notification?.body || '';
      toast.info(`${title}: ${body}`, {
        autoClose: 5000,
        onClick: () => {
          if (message.data?.actionUrl) {
            window.location.href = message.data.actionUrl as string;
          }
        },
      });
    });
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Group notifications by date
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const filterCounts = getFilterCounts(notifications);

  // Skeleton loading component
  const SkeletonItem = () => (
    <div className={styles.skeleton}>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonBody}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonMessage} />
          <div className={styles.skeletonTime} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.bellButton}
        aria-label="Notifications"
      >
        <Bell className={styles.bellIcon} />
        {unreadCount > 0 && (
          <span className={`${styles.badge} ${hasNewNotification ? styles.badgePulse : ''}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className={styles.backdrop} onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className={styles.panel}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerTop}>
                <h3 className={styles.title}>Thông báo</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className={styles.markAllButton}
                  >
                    Đánh dấu tất cả
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className={styles.filterTabs}>
                <button
                  onClick={() => setFilter('all')}
                  className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                >
                  Tất cả
                  {filterCounts.all > 0 && (
                    <span className={styles.filterTabCount}>{filterCounts.all}</span>
                  )}
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`${styles.filterTab} ${filter === 'unread' ? styles.filterTabActive : ''}`}
                >
                  Chưa đọc
                  {filterCounts.unread > 0 && (
                    <span className={styles.filterTabCount}>{filterCounts.unread}</span>
                  )}
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`${styles.filterTab} ${filter === 'read' ? styles.filterTabActive : ''}`}
                >
                  Đã đọc
                  {filterCounts.read > 0 && (
                    <span className={styles.filterTabCount}>{filterCounts.read}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className={styles.listContainer}>
              {loading && notifications.length === 0 ? (
                // Skeleton loading
                <>
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                </>
              ) : filteredNotifications.length === 0 ? (
                // Empty state
                <div className={styles.emptyState}>
                  <Bell className={styles.emptyIcon} />
                  <p className={styles.emptyText}>
                    {filter === 'unread'
                      ? 'Không có thông báo chưa đọc'
                      : filter === 'read'
                      ? 'Không có thông báo đã đọc'
                      : 'Chưa có thông báo nào'}
                  </p>
                </div>
              ) : (
                // Grouped notifications
                (Object.entries(groupedNotifications) as [DateGroup, Notification[]][]).map(
                  ([group, groupNotifs]) =>
                    groupNotifs.length > 0 && (
                      <div key={group} className={styles.dateGroup}>
                        {/* Date Group Header */}
                        <div
                          className={`${styles.dateGroupHeader} ${
                            collapsedGroups.has(group) ? styles.dateGroupCollapsed : ''
                          }`}
                          onClick={() => toggleGroupCollapse(group)}
                        >
                          <ChevronDown className={styles.dateGroupChevron} />
                          <span>{getDateGroupLabel(group)}</span>
                          <span className={styles.dateGroupCount}>{groupNotifs.length}</span>
                        </div>

                        {/* Notifications in Group */}
                        {!collapsedGroups.has(group) &&
                          groupNotifs.map((notification) => (
                            <div
                              key={notification.id}
                              className={`${styles.notificationItem} ${
                                !notification.isRead ? styles.notificationItemUnread : ''
                              }`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className={styles.notificationContent}>
                                {/* Icon */}
                                <div className={styles.notificationIcon}>
                                  {getNotificationIcon(notification.type, notification.icon)}
                                </div>

                                {/* Body */}
                                <div className={styles.notificationBody}>
                                  <div className={styles.notificationHeader}>
                                    <p className={styles.notificationTitle}>
                                      {notification.title}
                                    </p>
                                    {!notification.isRead && (
                                      <span className={styles.unreadDot} />
                                    )}
                                  </div>
                                  <p className={styles.notificationMessage}>
                                    {notification.message}
                                  </p>
                                  <p className={styles.notificationTime}>
                                    {formatRelativeTime(notification.createdAt)}
                                  </p>
                                </div>

                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className={styles.deleteButton}
                                  aria-label="Delete"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                )
              )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className={styles.footer}>
                <button
                  onClick={() => {
                    toast.info('Xem tất cả thông báo');
                    setIsOpen(false);
                  }}
                  className={styles.viewAllButton}
                >
                  Xem tất cả thông báo
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
