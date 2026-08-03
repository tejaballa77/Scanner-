import React, { useState } from 'react';
import { Download, Copy, Trash2, Search, RefreshCw, Check, ShieldCheck } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function AdminDashboard() {
  const { scans, clearAllScans, fetchScans, isConnected } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredScans = scans.filter((scan) => {
    const q = searchQuery.toLowerCase();
    return (
      scan.raw_text.toLowerCase().includes(q) ||
      scan.user_name.toLowerCase().includes(q)
    );
  });

  const exportToCSV = () => {
    if (scans.length === 0) return;
    
    const headers = ['#', 'User Name', 'Timestamp', 'Raw Scanned Text'];
    const rows = scans.map((s, idx) => [
      scans.length - idx,
      `"${s.user_name.replace(/"/g, '""')}"`,
      `"${new Date(s.created_at).toLocaleString()}"`,
      `"${s.raw_text.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `QR_Scans_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyAllText = () => {
    if (scans.length === 0) return;
    const allText = scans.map(s => s.raw_text).join('\n');
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Header Bar */}
      <header className="admin-header">
        <div className="admin-title-group">
          <ShieldCheck size={26} color="#10B981" />
          <div>
            <h1>QR Scanner Admin Dashboard</h1>
            <span className="admin-subtitle">Live Shared Feed & Data Export</span>
          </div>
        </div>

        <div className="admin-status-badge">
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          <span>{isConnected ? 'Real-Time Sync Live' : 'Connecting...'}</span>
        </div>
      </header>

      {/* Action Controls Bar */}
      <div className="admin-controls-bar">
        <div className="search-box-large">
          <Search size={18} color="#94A3B8" />
          <input 
            type="text" 
            placeholder="Search by scanned text or user name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-action-buttons">
          <button className="btn-secondary" onClick={fetchScans} title="Refresh Scans">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button className="btn-secondary" onClick={copyAllText} disabled={scans.length === 0}>
            {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied All' : 'Copy All Text'}</span>
          </button>

          <button className="btn-primary" onClick={exportToCSV} disabled={scans.length === 0}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          {scans.length > 0 && (
            <button className="btn-danger" onClick={clearAllScans} title="Clear All History">
              <Trash2 size={16} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Unique Scans</span>
          <span className="stat-value">{scans.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Team Members</span>
          <span className="stat-value">
            {new Set(scans.map(s => s.user_name)).size}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User Name</th>
              <th>Time</th>
              <th>Raw Scanned Text</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredScans.length > 0 ? (
              filteredScans.map((scan, idx) => (
                <tr key={scan.id || idx}>
                  <td className="col-idx">{scans.length - idx}</td>
                  <td className="col-user">
                    <span className="user-pill">{scan.user_name}</span>
                  </td>
                  <td className="col-time">
                    {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="col-text">{scan.raw_text}</td>
                  <td className="col-action">
                    <button 
                      className="table-copy-btn"
                      onClick={() => navigator.clipboard.writeText(scan.raw_text)}
                      title="Copy text"
                    >
                      <Copy size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-table-msg">
                  {searchQuery ? 'No scans match your search query.' : 'No scans available yet. Scanned QR codes from mobile users will appear here live!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
