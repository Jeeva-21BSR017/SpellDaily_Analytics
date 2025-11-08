import React from 'react';
import { StatusMessageProps } from '../../types';

const StatusMessage: React.FC<StatusMessageProps> = ({ message, type, onClose }) => {
  const getClassName = () => {
    const baseClass = 'status-message';
    return `${baseClass} ${baseClass}--${type}`;
  };

  return (
    <div className={getClassName()}>
      <span className="status-message__text">{message}</span>
      {onClose && (
        <button className="status-message__close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

export default StatusMessage;