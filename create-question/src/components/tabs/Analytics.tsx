import React, { useState } from 'react';
import { StatusType, AnalyticsData, AnalyticsModalData } from '../../types';
import { AnalyticsService } from '../../services/analyticsService';
import AnalyticsTable from '../analytics/AnalyticsTable';
import AnalyticsModal from '../analytics/AnalyticsModal';

interface AnalyticsProps {
  showStatusMessage: (message: string, type: StatusType) => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ showStatusMessage }) => {
  const [code, setCode] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalData, setModalData] = useState<AnalyticsModalData | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Validate and format code input
  const handleCodeChange = (value: string) => {
    // Remove any non-alphanumeric characters and limit to 6 characters
    const formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    setCode(formattedValue);
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    const validation = AnalyticsService.validateCode(code);
    
    if (!validation.isValid) {
      showStatusMessage(validation.error!, 'error');
      return;
    }

    setIsLoading(true);
    try {
      showStatusMessage('Fetching analytics data...', 'info');
      
      const data = await AnalyticsService.fetchAnalytics(code);
      
      if (data.length === 0) {
        showStatusMessage(`No analytics data found for code "${code}".`, 'error');
        setShowResults(false);
        setAnalyticsData([]);
        return;
      }

      setAnalyticsData(data);
      setShowResults(true);
      showStatusMessage(`Found ${data.length} analytics records for code "${code}".`, 'success');
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showStatusMessage(`❌ Error fetching analytics: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setShowResults(false);
      setAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear analytics data
  const clearAnalytics = () => {
    setCode('');
    setAnalyticsData([]);
    setShowResults(false);
    setModalData(null);
    setShowModal(false);
    showStatusMessage('Analytics cleared.', 'info');
  };

  // Handle word click to show details
  const handleWordClick = (word: string, date: string, attemptIndex: number) => {
    const wordData = analyticsData.find(item => 
      item.word === word && new Date(item.submittedAt).toDateString() === date
    );
    
    if (!wordData) return;

    const dayTotalAttempts = wordData.check.length;
    const dayCorrectAttempts = wordData.check.filter(attempt => attempt.isCorrect).length;
    const dayAvgTime = dayTotalAttempts > 0 
      ? Math.round(wordData.check.reduce((sum, attempt) => sum + attempt.timeTaken, 0) / dayTotalAttempts) 
      : 0;

    // Get all attempts for this word across all dates for comprehensive view
    const allWordData = analyticsData.filter(item => item.word === word);
    const allWordAttempts = allWordData.reduce((acc, item) => acc + item.check.length, 0);
    const allWordCorrect = allWordData.reduce((acc, item) => 
      acc + item.check.filter(attempt => attempt.isCorrect).length, 0);
    const allWordAvgTime = allWordData.length > 0 
      ? Math.round(
          allWordData.reduce((acc, item) => 
            acc + item.check.reduce((sum, attempt) => sum + attempt.timeTaken, 0), 0) / 
          allWordData.reduce((acc, item) => acc + item.check.length, 0)
        ) 
      : 0;

    const modalData: AnalyticsModalData = {
      word,
      date,
      dayTotalAttempts,
      dayCorrectAttempts,
      dayAvgTime,
      allWordAttempts,
      allWordCorrect,
      allWordAvgTime,
      attempts: wordData.check,
      speakerClicks: wordData.speakerClicks,
      backspaces: wordData.backspace
    };

    setModalData(modalData);
    setShowModal(true);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      fetchAnalytics();
    }
  };

  return (
    <div className="analytics">
      <h2>📊 Analytics Report</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="form-group">
          <label htmlFor="analytics-code">Enter 6-Character Alphanumeric Code to View Analytics</label>
          <input
            type="text"
            id="analytics-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="AbC123"
            maxLength={6}
            disabled={isLoading}
            style={{
              borderColor: code.length === 6 ? '#28a745' : code.length > 0 ? '#ffc107' : '#e9ecef',
              backgroundColor: code.length === 6 ? '#d4edda' : code.length > 0 ? '#fff3cd' : 'white'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <button 
          type="button" 
          className="btn" 
          onClick={fetchAnalytics}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? '⏳ Loading...' : '📊 Fetch Analytics'}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={clearAnalytics}
          disabled={isLoading}
          style={{ marginLeft: '10px' }}
        >
          🗑️ Clear
        </button>
      </div>

      {showResults && (
        <div className="analytics-results">
          <div className="analytics-container">
            <AnalyticsTable 
              data={analyticsData} 
              onWordClick={handleWordClick}
            />
          </div>
        </div>
      )}

      <AnalyticsModal
        isOpen={showModal}
        data={modalData}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default Analytics;