import React from 'react';
import { useNotification } from './NotificationContext';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const NotificationItem = ({ notification, onClose }) => {
  const { id, message, type } = notification;
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };
  
  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-yellow-50';
      default: return 'bg-blue-50';
    }
  };
  
  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-green-400';
      case 'error': return 'border-red-400';
      case 'warning': return 'border-yellow-400';
      default: return 'border-blue-400';
    }
  };

  return (
    <div 
      className={`${getBgColor()} border-l-4 ${getBorderColor()} p-4 mb-2 rounded-r shadow-md flex items-start`}
      role="alert"
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm">{message}</p>
      </div>
      <button 
        onClick={() => onClose(id)} 
        className="ml-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const Notifications = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onClose={removeNotification} 
        />
      ))}
    </div>
  );
};

export default Notifications;