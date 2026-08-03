import React, { useState } from 'react';
import { Search, Edit3, Inbox, User } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import ScanItemCard from './ScanItemCard';

export default function AllScansScreen({ onOpenUserModal }) {
  const { scans, userName } = useWebSocket();
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
      {/* User Identity Bar with Edit Name Option */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} color="#10B981" />
          <span style={{ fontSize: '0.85rem', color: '#E2E8F0' }}>
            Logged in as: <strong style={{ color: '#10B981' }}>{userName || 'Staff'}</strong>
          </span>
        </div>

        <button 
          onClick={onOpenUserModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Edit3 size={13} />
          <span>Edit Name</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          className="search-input"
          placeholder="Search scans by text or user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Total Scans Count Header */}
      {scans.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            Total Scans: <strong>{scans.length}</strong>
          </span>
        </div>
      )}

      {/* WhatsApp Group Feed List */}
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
              {searchQuery ? "Try searching for a different keyword." : "Switch to Scanner tab to capture QR codes."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
