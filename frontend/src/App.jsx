import React, { useState, useEffect } from 'react';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import InstallHeader from './components/InstallHeader';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ScannerScreen from './components/ScannerScreen';
import AllScansScreen from './components/AllScansScreen';
import UserModal from './components/UserModal';
import './App.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' or 'scans'
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const { userName } = useWebSocket();

  // Prompt user modal on first load if nickname is empty
  useEffect(() => {
    if (!userName) {
      setIsUserModalOpen(true);
    }
  }, [userName]);

  const toggleFlash = () => {
    setIsFlashOn((prev) => !prev);
  };

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
