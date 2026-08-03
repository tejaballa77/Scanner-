import React, { useState } from 'react';
import { Download, Copy, Trash2, Search, RefreshCw, Check, QrCode } from 'lucide-react';
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
    
    const headers = ['#', 'User Name', 'Timestamp', 'Extracted QR Data'];
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
    link.setAttribute('download', `QR_Scanned_Data_${new Date().toISOString().slice(0, 10)}.csv`);
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
    <div className="simple-admin-page">
      <div className="simple-admin-container">
        {/* Simple Header */}
        <div className="simple-header">
          <div className="simple-title">
            <QrCode size={28} color="#10B981" />
            <div>
              <h2>QR Scanned Data Dashboard</h2>
              <p>Live User Scans Overview ({scans.length} unique items)</p>
            </div>
          </div>

          <div className="simple-actions">
            <button className="simple-btn" onClick={fetchScans} title="Refresh">
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
            <button className="simple-btn" onClick={copyAllText} disabled={scans.length === 0}>
              {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
              <span>{copied ? 'Copied' : 'Copy All'}</span>
            </button>
            <button className="simple-btn btn-green" onClick={exportToCSV} disabled={scans.length === 0}>
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            {scans.length > 0 && (
              <button className="simple-btn btn-clear" onClick={clearAllScans}>
                <Trash2 size={15} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="simple-search">
          <Search size={16} color="#94A3B8" />
          <input 
            type="text" 
            placeholder="Search by user name or QR text..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Simple Data Table */}
        <div className="simple-table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th style={{ width: '180px' }}>User Name</th>
                <th style={{ width: '140px' }}>Time</th>
                <th>Extracted QR Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.length > 0 ? (
                filteredScans.map((scan, idx) => (
                  <tr key={scan.id || idx}>
                    <td className="td-idx">{scans.length - idx}</td>
                    <td className="td-user">
                      <span className="user-badge">{scan.user_name}</span>
                    </td>
                    <td className="td-time">
                      {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="td-text">{scan.raw_text}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="td-empty">
                    {searchQuery ? "No scans match your search query." : "No scanned data yet. Mobile scans will appear here live in real-time."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
