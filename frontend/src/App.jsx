import React, { useState, useEffect } from 'react';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import InstallHeader from './components/InstallHeader';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ScannerScreen from './components/ScannerScreen';
import AllScansScreen from './components/AllScansScreen';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' or 'scans' or 'admin'
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const { userName } = useWebSocket();

  // Check URL parameters for Admin Dashboard route (?admin=true or #admin or /admin)
  const isAdminRoute = 
    window.location.search.includes('admin') || 
    window.location.hash.includes('admin') ||
    window.location.pathname.includes('admin');

  // Prompt user modal on first load if nickname is empty
  useEffect(() => {
    if (!userName && !isAdminRoute) {
      setIsUserModalOpen(true);
    }
  }, [userName, isAdminRoute]);

  const toggleFlash = () => {
    setIsFlashOn((prev) => !prev);
  };

  if (isAdminRoute || activeTab === 'admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="app-container">
      <InstallHeader />
      <Header 
        activeTab={activeTab} 
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onToggleFlash={toggleFlash}
        flashActive={isFlashOn}
      />

      <main className="main-content">
        {activeTab === 'scanner' ? (
          <ScannerScreen 
            isFlashOn={isFlashOn} 
            setIsFlashOn={setIsFlashOn} 
          />
        ) : (
          <AllScansScreen />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <WebSocketProvider>
      <MainApp />
    </WebSocketProvider>
  );
}
