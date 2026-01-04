import React from 'react';

const AnalyticsModal = ({ isOpen, data, onClose }) => {
    if (!isOpen || !data) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="analytics-modal" onClick={handleBackdropClick}>
            <div className="analytics-modal-content">
                <span className="modal-close" onClick={onClose}>&times;</span>
                <div className="modal-header">
                    <h3>{data.word} - {new Date(data.date).toLocaleDateString()}</h3>
                </div>
                <div className="modal-body">
                    <div className="modal-section">
                        <h4>📊 Summary</h4>
                        <p><strong>Average Time:</strong> {data.dayAvgTime}s</p>
                        <p><strong>Total Attempts:</strong> {data.dayTotalAttempts}</p>
                        <p><strong>Correct Attempts:</strong> {data.dayCorrectAttempts}</p>
                        <p><strong>Accuracy:</strong> {data.dayTotalAttempts > 0 ? Math.round((data.dayCorrectAttempts / data.dayTotalAttempts) * 100) : 0}%</p>
                        <p><strong>Speaker Clicks:</strong> {data.speakerClicks}</p>
                    </div>

                    <div className="modal-section">
                        <h4>📝 Attempts Detail</h4>
                        <div className="attempts-list">
                            {data.attempts.map((attempt, index) => (
                                <div
                                    key={index}
                                    className="attempt-item"
                                    style={{
                                        background: attempt.isCorrect ? '#d4edda' : '#f8d7da',
                                        margin: '4px 0',
                                        padding: '6px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <strong>Attempt {index + 1}:</strong> "{attempt.word}"
                                    <span style={{ color: '#666' }}>({attempt.timeTaken}s)</span>
                                    <span
                                        style={{
                                            color: attempt.isCorrect ? '#155724' : '#721c24',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {attempt.isCorrect ? ' ✓ Correct' : ' ✗ Incorrect'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {data.backspaces.length > 0 && (
                        <div className="modal-section">
                            <h4>⌫ Backspaces</h4>
                            <div className="backspace-list">
                                {data.backspaces.map((partial, index) => (
                                    <span key={index} className="backspace-item">"{partial}"</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsModal;
