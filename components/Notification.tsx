
import React from 'react';

interface NotificationProps {
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  const baseClasses = "fixed bottom-5 left-5 md:bottom-auto md:top-5 md:left-auto md:right-5 p-4 rounded-lg shadow-xl z-[100] flex items-center gap-4 transition-all duration-500 transform animate-slide-in min-w-[300px]";
  
  const typeClasses = {
    success: 'bg-green-50 border border-green-300 text-green-900',
    error: 'bg-red-50 border border-red-300 text-red-900',
    info: 'bg-stone-100 border border-stone-300 text-stone-700', // Quiet style for "No updates"
  };
  
  const icon = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };
  
  return (
    <div className={`${baseClasses} ${typeClasses[notification.type]}`} role="alert">
      <div className="flex-shrink-0">
        {icon[notification.type]}
      </div>
      <div className="flex-1">
        <span className="font-semibold text-sm">{notification.message}</span>
      </div>
      <button onClick={onClose} className="text-xl font-bold opacity-50 hover:opacity-100 p-1" aria-label="إغلاق">
        &times;
      </button>
    </div>
  );
};

export default Notification;
