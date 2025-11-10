import React from 'react';
import { formatDistanceToNow } from 'date-fns';

function NotificationModal({ 
  isOpen, 
  onClose, 
  notifications, 
  loading, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onRefresh 
}) {
  if (!isOpen) return null;

  // Filter notifications for display (7-day rule for read notifications)
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  const displayNotifications = notifications.filter(notif => {
    // Always show unread notifications (regardless of age)
    if (!notif.isRead) return true;
    
    // Show read notifications only if less than 7 days old
    return new Date(notif.createdAt) > sevenDaysAgo;
  });

  const unreadNotifications = displayNotifications.filter(n => !n.isRead);
  const readNotifications = displayNotifications.filter(n => n.isRead);

  const getCategoryIcon = (category) => {
    const icons = {
      emergency: '🚨',
      traffic: '🚦',
      weather: '🌤️',
      community: '👥',
      jobs: '💼',
      blood_donation: '🩸',
      lost_found: '🔍'
    };
    return icons[category] || '📢';
  };

  const getCategoryColor = (category) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800',
      traffic: 'bg-yellow-100 text-yellow-800',
      weather: 'bg-blue-100 text-blue-800',
      community: 'bg-green-100 text-green-800',
      jobs: 'bg-purple-100 text-purple-800',
      blood_donation: 'bg-red-100 text-red-800',
      lost_found: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
  };

  const NotificationItem = ({ notification, isUnread = false }) => (
    <div
      onClick={() => handleNotificationClick(notification)}
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
        isUnread ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <span className="text-2xl">{getCategoryIcon(notification.category)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${
              isUnread ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {notification.title}
            </p>
            {isUnread && (
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
            )}
          </div>
          <p className={`text-sm mt-1 ${
            isUnread ? 'text-gray-800' : 'text-gray-600'
          }`}>
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              getCategoryColor(notification.category)
            }`}>
              {notification.category.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop - Click outside to close */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed top-16 right-4 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadNotifications.length > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Refresh"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">You'll see alerts from your area here</p>
            </div>
          ) : (
            <>
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                    <p className="text-sm font-medium text-blue-900">
                      {unreadNotifications.length} new notification{unreadNotifications.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {unreadNotifications.map(notification => (
                    <NotificationItem 
                      key={notification._id} 
                      notification={notification} 
                      isUnread={true}
                    />
                  ))}
                </>
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-700">Recent (Last 7 days)</p>
                    </div>
                  )}
                  {readNotifications.map(notification => (
                    <NotificationItem 
                      key={notification._id} 
                      notification={notification} 
                      isUnread={false}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationModal;