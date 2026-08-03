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
  const [activeTab, setActiveTab] = useState(() => {
    // Default to 'admin' dashboard if opened on desktop or if URL contains admin
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const isUrlAdmin = typeof window !== 'undefined' && (
      window.location.search.includes('admin') || 
      window.location.hash.includes('admin') ||
      window.location.pathname.includes('admin')
    );
    return (isDesktop || isUrlAdmin) ? 'admin' : 'scanner';
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const { userName } = useWebSocket();

  // Prompt user modal on first load if nickname is empty (only in mobile scanner mode)
  useEffect(() => {
    if (!userName && activeTab !== 'admin') {
      setIsUserModalOpen(true);
    }
  }, [userName, activeTab]);

  const toggleFlash = () => {
    setIsFlashOn((prev) => !prev);
  };

  if (activeTab === 'admin') {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: 'var(--bg-dark)' }}>
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
