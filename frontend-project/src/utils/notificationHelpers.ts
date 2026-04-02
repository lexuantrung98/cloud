/**
 * Notification Helper Utilities
 * Date grouping, filtering, and icon mapping
 */

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  icon?: string;
}

export type FilterType = 'all' | 'unread' | 'read';
export type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

/**
 * Notification type to icon mapping
 */
export const NOTIFICATION_ICONS: Record<string, string> = {
  project: '📂',
  assignment: '📝',
  grade: '⭐',
  message: '💬',
  announcement: '📢',
  deadline: '⏰',
  meeting: '📅',
  system: '⚙️',
  achievement: '🏆',
  submission: '📤',
  feedback: '💭',
  alert: '🚨',
  default: '🔔',
};

/**
 * Get icon for notification type
 */
export function getNotificationIcon(type: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  return NOTIFICATION_ICONS[type.toLowerCase()] || NOTIFICATION_ICONS.default;
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(
  notifications: Notification[]
): Record<DateGroup, Notification[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<DateGroup, Notification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);

    if (date >= today) {
      groups.today.push(notification);
    } else if (date >= yesterday) {
      groups.yesterday.push(notification);
    } else if (date >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}

/**
 * Get label for date group
 */
export function getDateGroupLabel(group: DateGroup): string {
  const labels: Record<DateGroup, string> = {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    thisWeek: 'Tuần này',
    older: 'Cũ hơn',
  };
  return labels[group];
}

/**
 * Filter notifications
 */
export function filterNotifications(
  notifications: Notification[],
  filter: FilterType
): Notification[] {
  switch (filter) {
    case 'unread':
      return notifications.filter((n) => !n.isRead);
    case 'read':
      return notifications.filter((n) => n.isRead);
    case 'all':
    default:
      return notifications;
  }
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get filter counts
 */
export function getFilterCounts(notifications: Notification[]): Record<FilterType, number> {
  return {
    all: notifications.length,
    unread: notifications.filter((n) => !n.isRead).length,
    read: notifications.filter((n) => n.isRead).length,
  };
}
