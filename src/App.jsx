
import React, { useState } from 'react';
import MonitoringDashboard from './components/MonitoringDashboard';
import ChatWindow from './components/ChatWindow';

function App() {
  // increments whenever ChatWindow sends a message
  const [batchTrigger, setBatchTrigger] = useState(0);

  const handleNewBatch = () => {
    setBatchTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Pass batchTrigger so dashboard starts a new row */}
      <MonitoringDashboard batchTrigger={batchTrigger} />

      
      <div className="mt-8 px-4">
        <ChatWindow onNewBatch={handleNewBatch} />
      </div>
    </div>
  );
}

export default App;
