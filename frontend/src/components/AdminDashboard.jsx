import React, { useState } from 'react';
import { Download, Copy, Search, RefreshCw, Check, QrCode, X, Maximize2, Trash2, CheckSquare, Square } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function AdminDashboard() {
  const { scans, clearAllScans, deleteSingleScan, deleteBulkScans, fetchScans } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedQrImage, setSelectedQrImage] = useState(null);
  const [selectedScanIds, setSelectedScanIds] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredScans = scans.filter((scan) => {
    const q = searchQuery.toLowerCase();
    return (
      scan.raw_text.toLowerCase().includes(q) ||
      scan.user_name.toLowerCase().includes(q)
    );
  });

  const isAllSelected = filteredScans.length > 0 && filteredScans.every(s => selectedScanIds.includes(s.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedScanIds([]);
    } else {
      setSelectedScanIds(filteredScans.map(s => s.id));
    }
  };

  const toggleSelectScan = (id) => {
    setSelectedScanIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedScanIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedScanIds.length} selected scan(s)?`)) {
      await deleteBulkScans(selectedScanIds);
      setSelectedScanIds([]);
    }
  };

  const handleDeleteSingle = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this scan record?")) {
      await deleteSingleScan(id);
      setSelectedScanIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleClearHistory = async () => {
    setShowClearConfirm(false);
    await clearAllScans();
    setSelectedScanIds([]);
  };

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

  const getQrImageUrl = (text) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(text)}`;
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

            {/* Bulk Delete Selected Button */}
            {selectedScanIds.length > 0 && (
              <button className="simple-btn btn-clear" onClick={handleDeleteSelected}>
                <Trash2 size={15} />
                <span>Delete Selected ({selectedScanIds.length})</span>
              </button>
            )}

            {/* Clear All History Button */}
            {scans.length > 0 && (
              <button className="simple-btn btn-clear" onClick={() => setShowClearConfirm(true)}>
                <Trash2 size={15} />
                <span>Clear History</span>
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
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={filteredScans.length === 0}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th style={{ width: '50px' }}>#</th>
                <th style={{ width: '100px', textAlign: 'center' }}>QR CODE IMAGE</th>
                <th style={{ width: '150px' }}>USER NAME</th>
                <th style={{ width: '130px' }}>TIME</th>
                <th>EXTRACTED QR DATA</th>
                <th style={{ width: '70px', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.length > 0 ? (
                filteredScans.map((scan, idx) => {
                  const displayImgUrl = scan.photo_data || getQrImageUrl(scan.raw_text);
                  const isRealSnapshot = !!scan.photo_data;
                  const isSelected = selectedScanIds.includes(scan.id);

                  return (
                    <tr key={scan.id || idx} style={{ backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelectScan(scan.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td className="td-idx">{scans.length - idx}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div 
                          onClick={() => setSelectedQrImage({ url: displayImgUrl, text: scan.raw_text, user: scan.user_name, isRealSnapshot })}
                          style={{
                            display: 'inline-flex',
                            position: 'relative',
                            cursor: 'pointer',
                            padding: '4px',
                            background: '#FFFFFF',
                            borderRadius: '8px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            transition: 'transform 0.15s ease'
                          }}
                          className="qr-thumb-wrapper"
                          title={isRealSnapshot ? "Click to view camera photo snapshot" : "Click to view QR code image"}
                        >
                          <img 
                            src={displayImgUrl} 
                            alt="Camera Snapshot / QR Code" 
                            style={{ width: '48px', height: '48px', borderRadius: '4px', display: 'block', objectFit: 'cover' }} 
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            background: 'rgba(0,0,0,0.75)',
                            borderRadius: '3px',
                            padding: '1px 3px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <Maximize2 size={10} color="#FFFFFF" />
                          </div>
                        </div>
                      </td>
                      <td className="td-user">
                        <span className="user-badge">{scan.user_name}</span>
                      </td>
                      <td className="td-time">
                        {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="td-text">{scan.raw_text}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={(e) => handleDeleteSingle(scan.id, e)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#EF4444',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete scan record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="td-empty">
                    {searchQuery ? "No scans match your search query." : "No scanned data yet. Mobile scans will appear here live in real-time."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear All History Confirmation Modal */}
      {showClearConfirm && (
        <div 
          onClick={() => setShowClearConfirm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1E293B',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444'
            }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: 0, color: '#FFF', fontSize: '1.2rem' }}>
              Clear All Scan History?
            </h3>

            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently clear all <strong>{scans.length}</strong> scan records from the database? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button 
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F1F5F9',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleClearHistory}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Large QR Code Preview Modal */}
      {selectedQrImage && (
        <div 
          onClick={() => setSelectedQrImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setSelectedQrImage(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#FFF',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#FFF', textAlign: 'center' }}>
              {selectedQrImage.isRealSnapshot ? 'Camera Photo Snapshot' : 'QR Code Image Preview'}
            </h3>
            
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
              Scanned by {selectedQrImage.user}
            </p>

            <div style={{ background: '#FFF', padding: '12px', borderRadius: '12px' }}>
              <img 
                src={selectedQrImage.url} 
                alt="Large Preview" 
                style={{ width: '240px', height: '240px', display: 'block', objectFit: 'cover', borderRadius: '8px' }} 
              />
            </div>

            <p style={{ 
              margin: 0, 
              fontSize: '0.85rem', 
              color: '#94A3B8', 
              wordBreak: 'break-all', 
              textAlign: 'center',
              maxHeight: '80px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              padding: '8px 12px',
              borderRadius: '8px',
              width: '100%'
            }}>
              {selectedQrImage.text}
            </p>

            <a 
              href={selectedQrImage.url} 
              download="scanned_qr_code.png"
              target="_blank"
              rel="noopener noreferrer"
              className="simple-btn btn-green"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <Download size={16} />
              <span>Download Image</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
