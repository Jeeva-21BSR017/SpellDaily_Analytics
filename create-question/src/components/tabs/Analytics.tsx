import React from 'react';
import { StatusType } from '../../types';

interface AnalyticsProps {
  showStatusMessage: (message: string, type: StatusType) => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ showStatusMessage }) => {
  return (
    <div className="analytics">
      <h2>📊 Analytics Report</h2>
      <div className="analytics-placeholder">
        <p>Analytics functionality will be implemented here.</p>
        <p>This will include:</p>
        <ul>
          <li>User performance analytics</li>
          <li>App usage statistics</li>
          <li>Question difficulty analysis</li>
          <li>Time-based performance tracking</li>
        </ul>
      </div>
    </div>
  );
};

export default Analytics;