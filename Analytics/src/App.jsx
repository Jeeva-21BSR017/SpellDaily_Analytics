import React, { useState } from 'react';
import './App.css';
import Analytics from './components/tabs/Analytics';
import StatusMessageComponent from './components/ui/StatusMessage';
import Header from './components/Layout/Header';
import Container from './components/Layout/Container';

const App = () => {
  const [statusMessage, setStatusMessage] = useState(null);

  const showStatusMessage = (message, type) => {
    setStatusMessage({ message, type });
    // Auto clear after 5 seconds
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const clearStatusMessage = () => {
    setStatusMessage(null);
  };

  return (
    <div className="App">
      <Container>
        <Header />
        {statusMessage && (
          <StatusMessageComponent
            message={statusMessage.message}
            type={statusMessage.type}
            onClose={clearStatusMessage}
          />
        )}
        <div className="tab-content-wrapper">
          <div className="section-container">
            <Analytics showStatusMessage={showStatusMessage} />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default App;