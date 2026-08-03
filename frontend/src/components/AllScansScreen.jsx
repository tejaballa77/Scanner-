import React, { useState } from 'react';
import { Search, Trash2, Inbox } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import ScanItemCard from './ScanItemCard';

export default function AllScansScreen() {
  const { scans, clearAllScans } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredScans = scans.filter((scan) => {
    const query = searchQuery.toLowerCase();
    return (
      scan.raw_text.toLowerCase().includes(query) ||
      scan.user_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="all-scans-screen">
      {/* Search Input Bar */}
      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          className="search-input"
          placeholder="Search scans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Clear All Data Option */}
      {scans.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            Total Scans: <strong>{scans.length}</strong>
          </span>
          <button 
            onClick={clearAllScans}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)' 
            }}
            title="Clear all stored scans"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      )}

      {/* Feed List */}
      <div className="scan-feed-list">
        {filteredScans.length > 0 ? (
          filteredScans.map((scan, idx) => (
            <ScanItemCard 
              key={scan.id || idx} 
              scan={scan} 
              index={scans.length - idx} 
            />
          ))
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px 16px', 
            color: 'var(--text-muted)',
            gap: '12px',
            textAlign: 'center'
          }}>
            <Inbox size={48} strokeWidth={1.5} />
            <p style={{ fontSize: '0.95rem' }}>
              {searchQuery ? "No scans match your search query." : "No scanned data yet."}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
              {searchQuery ? "Try searching for a different keyword." : "Switch to Scanner tab and tap SEND to store QR codes."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
