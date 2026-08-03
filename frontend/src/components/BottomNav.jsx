import React from 'react';
import { QrCode, ListFilter } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
        onClick={() => setActiveTab('scanner')}
      >
        {activeTab === 'scanner' && <div className="nav-indicator" />}
        <QrCode size={24} />
        <span>Scanner</span>
      </button>

      <button 
        className={`nav-tab ${activeTab === 'scans' ? 'active' : ''}`}
        onClick={() => setActiveTab('scans')}
      >
        {activeTab === 'scans' && <div className="nav-indicator" />}
        <ListFilter size={24} />
        <span>All Scans</span>
      </button>
    </nav>
  );
}
