import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScanItemCard({ scan, index }) {
  const [copied, setCopied] = useState(false);
  const { userName } = useWebSocket();

  const isOwnScan = userName && scan.user_name && scan.user_name.trim().toLowerCase() === userName.trim().toLowerCase();

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            <span className="chat-timestamp">{formatTime(scan.created_at)}</span>
            <button className="chat-copy-icon" onClick={handleCopy} title="Copy Raw Text">
              {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
