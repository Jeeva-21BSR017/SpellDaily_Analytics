import React from 'react';
import { AnalyticsData, WordsByDate } from '../../types';

interface AnalyticsTableProps {
  data: AnalyticsData[];
  onWordClick: (word: string, date: string, attemptIndex: number) => void;
}

const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ data, onWordClick }) => {
  // Group data by word and date
  const groupDataByWordAndDate = (data: AnalyticsData[]): {
    wordsByDate: WordsByDate;
    sortedDates: string[];
    sortedWords: string[];
    dateStartTimes: { [date: string]: string | null };
  } => {
    const wordsByDate: WordsByDate = {};
    const allDates = new Set<string>();
    const allWords = new Set<string>();
    const dateStartTimes: { [date: string]: string | null } = {};

    data.forEach(item => {
      const date = new Date(item.submittedAt).toDateString();
      const word = item.word;
      allDates.add(date);
      allWords.add(word);

      // Track the earliest start time for each date using testStartTime field
      if (item.testStartTime) {
        if (!dateStartTimes[date] || new Date(item.testStartTime) < new Date(dateStartTimes[date]!)) {
          dateStartTimes[date] = item.testStartTime;
        }
      } else {
        // If no testStartTime exists for this date yet, mark it as null if not set
        if (!dateStartTimes[date]) {
          dateStartTimes[date] = null;
        }
      }

      if (!wordsByDate[word]) {
        wordsByDate[word] = {};
      }
      if (!wordsByDate[word][date]) {
        wordsByDate[word][date] = [];
      }
      wordsByDate[word][date].push(item);
    });

    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedWords = Array.from(allWords).sort();

    return { wordsByDate, sortedDates, sortedWords, dateStartTimes };
  };

  const { wordsByDate, sortedDates, sortedWords, dateStartTimes } = groupDataByWordAndDate(data);

  const renderAttemptCell = (
    word: string,
    date: string,
    attemptIndex: 0 | 1,
    dayData?: AnalyticsData[]
  ) => {
    if (!dayData || dayData.length === 0) {
      return <td key={`${word}-${date}-${attemptIndex}`} className="attempt-cell">-</td>;
    }

    const firstAttempt = dayData[0].check[0];
    const secondAttempt = dayData[0].check[1];

    if (attemptIndex === 0 && firstAttempt) {
      // First attempt shows its own result (no yellow for first attempt)
      const cellClass = firstAttempt.isCorrect ? 'attempt-correct-table' : 'attempt-incorrect-table';
      return (
        <td
          key={`${word}-${date}-${attemptIndex}`}
          className={`attempt-cell ${cellClass}`}
          onClick={() => onWordClick(word, date, attemptIndex)}
          style={{ cursor: 'pointer' }}
        >
          <div className="attempt-content">
            <div className="attempt-item-table">{firstAttempt.word}</div>
          </div>
        </td>
      );
    }

    if (attemptIndex === 1 && secondAttempt) {
      // Check if first wrong and second correct (yellow)
      const isMixed = firstAttempt && !firstAttempt.isCorrect && secondAttempt.isCorrect;
      const cellClass = isMixed ? 'attempt-mixed-table' :
        (secondAttempt.isCorrect ? 'attempt-correct-table' : 'attempt-incorrect-table');
      return (
        <td
          key={`${word}-${date}-${attemptIndex}`}
          className={`attempt-cell ${cellClass}`}
          onClick={() => onWordClick(word, date, attemptIndex)}
          style={{ cursor: 'pointer' }}
        >
          <div className="attempt-content">
            <div className="attempt-item-table">{secondAttempt.word}</div>
          </div>
        </td>
      );
    }

    return <td key={`${word}-${date}-${attemptIndex}`} className="attempt-cell">-</td>;
  };

  if (data.length === 0) {
    return (
      <div className="analytics-table-container">
        <p>No analytics data to display.</p>
      </div>
    );
  }

  return (
    <div className="analytics-table-container">
      <table className="analytics-table">
        <thead>
          <tr>
            <th className="word-column">Word</th>
            <th>Attempt</th>
            {sortedDates.map((date, index) => {
              const dateStr = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              let timeStr = "-";
              if (dateStartTimes[date]) {
                const startTime = new Date(dateStartTimes[date]!);
                timeStr = startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              }
              return (
                <th key={date} className="day-header">
                  Day {index + 1}<br />
                  {dateStr}<br />
                  <span style={{ fontSize: '0.85em', color: '#666' }}>🕐 {timeStr}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedWords.map(word => (
            <React.Fragment key={word}>
              {/* First attempt row */}
              <tr>
                <td className="word-column" rowSpan={2}>{word}</td>
                <td style={{
                  position: 'sticky',
                  left: '120px',
                  background: 'white',
                  zIndex: 15,
                  boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  color: '#495057'
                }}>
                  Attempt 1
                </td>
                {sortedDates.map(date =>
                  renderAttemptCell(word, date, 0, wordsByDate[word][date])
                )}
              </tr>

              {/* Second attempt row */}
              <tr>
                <td style={{
                  position: 'sticky',
                  left: '120px',
                  background: 'white',
                  zIndex: 15,
                  boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  color: '#495057'
                }}>
                  Attempt 2
                </td>
                {sortedDates.map(date =>
                  renderAttemptCell(word, date, 1, wordsByDate[word][date])
                )}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnalyticsTable;