import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function ScanItemCard({ scan, index }) {
  const [copied, setCopied] = useState(false);

  // Format UTC timestamp to local 12-hour time (e.g. 11:45 AM)
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(scan.raw_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="scan-item-card">
      <div className="badge-circle">
        {index}
      </div>

      <div className="scan-card-body">
        <div className="scan-card-top">
          <div className="scan-raw-text">
            {scan.raw_text}
          </div>
          <div className="scan-meta">
            <span className="scan-time">{formatTime(scan.created_at)}</span>
            <span className="scan-user">Scanned by {scan.user_name}</span>
          </div>
        </div>

        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy Raw Text"}</span>
        </button>
      </div>
    </div>
  );
}
