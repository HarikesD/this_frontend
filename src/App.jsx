import ChatWindow from './components/ChatWindow';
import MonitoringDashboard from './components/MonitoringDashboard';


function App() {
  return (
    <div className="min-h-screen bg-gray-50">
    {/* 1. Monitoring dashboard at the top */}
    <MonitoringDashboard />

    {/* 2. Your existing chat area below */}
    <div className="mt-8 px-4">
      <ChatWindow />
    </div>
  </div>
  );
}

export default App;
