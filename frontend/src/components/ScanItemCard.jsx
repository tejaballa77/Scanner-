import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScanItemCard({ scan, index }) {
  const [copied, setCopied] = useState(false);
  const { userName } = useWebSocket();

  // Safely resolve current local saved user name
  const currentSavedName = (
    userName || 
    (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('qr_scanner_user_name') : '') ||
    'Staff'
  ).trim().toLowerCase();

  const scanUserName = (scan.user_name || '').trim().toLowerCase();
  const isOwnScan = currentSavedName !== '' && currentSavedName !== 'staff' && scanUserName === currentSavedName;

  // Format exact India Standard Time (IST - Asia/Kolkata)
  const formatISTTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(scan.raw_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`chat-message-row ${isOwnScan ? 'own-message' : 'other-message'}`}>
      <div className={`whatsapp-bubble ${isOwnScan ? 'bubble-own' : 'bubble-other'}`}>
        {/* Scanned Raw Text */}
        <div className="chat-raw-text">
          {scan.raw_text}
        </div>

        {/* Bottom Metadata & User Name */}
        <div className="chat-meta-bar">
          <span className="chat-user-name">
            {isOwnScan ? 'You' : scan.user_name}
          </span>

          <div className="chat-meta-right">
            <span className="chat-timestamp">{formatISTTime(scan.created_at)} IST</span>
            <button className="chat-copy-icon" onClick={handleCopy} title="Copy Raw Text">
              {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
