import React, { useState } from 'react';
import './App.css';
import { TabType, StatusMessage, QuestionFormData, GameMode } from './types';
import Tabs from './components/ui/Tabs';
import CreateQuestions from './components/tabs/CreateQuestions';
import Analytics from './components/tabs/Analytics';
import SyllableTest from './components/tabs/SyllableTest';
import StatusMessageComponent from './components/ui/StatusMessage';
import Header from './components/Layout/Header';
import Container from './components/Layout/Container';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('create-questions');
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  
  // Debug: Add console log to verify App is rendering
  console.log('App component is rendering');
  const [formData, setFormData] = useState<QuestionFormData>({
    uid: '',
    date: new Date().toISOString().split('T')[0],
    reviewWords: '',
    gameSequence: [],
    wordHints: '',
    wordDistractors: '',
    sentenceTemplates: '',
    wordPartsData: '',
    fillupsBlankPositions: '',
    twoOptionDistractors: '',
    wordMeanings: '',
    contextChoice: '',
    correctSentence: '',
    syllableData: '',
  });
  window.setFormData = setFormData; // Expose for debugging

  const availableGameModes: GameMode[] = [
    '4-option',
    'typing',
    'fillups',
    'word-parts',
    'letter-scramble',
    'correct-word',
    '2-option',
    'words-meaning',
    'context-choice',
    'correct-sentence',
  ];

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setStatusMessage(null);
  };

  const showStatusMessage = (message: string, type: StatusMessage['type']) => {
    setStatusMessage({ message, type });
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const clearStatusMessage = () => {
    setStatusMessage(null);
  };

  const updateFormData = (updates: Partial<QuestionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const clearForm = () => {
    setFormData({
      uid: '',
      date: new Date().toISOString().split('T')[0],
      reviewWords: '',
      gameSequence: [],
      wordHints: '',
      wordDistractors: '',
      sentenceTemplates: '',
      wordPartsData: '',
      fillupsBlankPositions: '',
      twoOptionDistractors: '',
      wordMeanings: '',
      contextChoice: '',
      correctSentence: '',
      syllableData: '',
    });
    showStatusMessage('Form cleared successfully!', 'info');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'create-questions':
        return (
          <CreateQuestions
            formData={formData}
            updateFormData={updateFormData}
            availableGameModes={availableGameModes}
            showStatusMessage={showStatusMessage}
            clearForm={clearForm}
          />
        );
      case 'analytics':
        return <Analytics showStatusMessage={showStatusMessage} />;
      default:
        return null;
    }
  };

  return (
    <div className="App">
      <Container>
        <Header />
        <Tabs activeTab={activeTab} onTabChange={handleTabChange} />
        {statusMessage && (
          <StatusMessageComponent
            message={statusMessage.message}
            type={statusMessage.type}
            onClose={clearStatusMessage}
          />
        )}
        <div className="tab-content-wrapper">
          {renderActiveTab()}
        </div>
      </Container>
    </div>
  );
};

export default App;