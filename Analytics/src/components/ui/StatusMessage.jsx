import React from 'react';

const StatusMessage = ({ message, type, onClose }) => {
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
