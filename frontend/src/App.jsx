import React, { useState, Component } from 'react';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import InstallHeader from './components/InstallHeader';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ScannerScreen from './components/ScannerScreen';
import AllScansScreen from './components/AllScansScreen';
import AdminDashboard from './components/AdminDashboard';
import UserModal from './components/UserModal';
import './App.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorInfo: error ? error.toString() : 'Unknown Error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F172A',
          color: '#F8FAFC',
          padding: '24px',
          textAlign: 'center',
          gap: '16px'
        }}>
          <h2>QR Scanner Application</h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            App refreshed. Tap below to reload.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '12px 24px',
              background: '#10B981',
              color: '#FFF',
              border: 'none',
              borderRadius: '25px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔄 Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function MainApp() {
  const [activeTab, setActiveTab] = useState(() => {
    const isExplicitAdmin = typeof window !== 'undefined' && (
      window.location.search.includes('admin') || 
      window.location.hash.includes('admin') ||
      window.location.pathname.includes('admin')
    );
    return isExplicitAdmin ? 'admin' : 'scanner';
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

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
    <ErrorBoundary>
      <WebSocketProvider>
        <MainApp />
      </WebSocketProvider>
    </ErrorBoundary>
  );
}
