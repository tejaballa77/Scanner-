import React, { useState } from 'react';
import { User, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function UserModal({ isOpen, onClose }) {
  const { userName, updateUserName } = useWebSocket();
  const [nameInput, setNameInput] = useState(userName || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      updateUserName(nameInput.trim());
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Scanner User Identity</h2>
          {userName && (
            <button className="icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        <p className="modal-sub">
          Enter your name so all team members can see who scanned each QR code.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            className="modal-input" 
            placeholder="e.g. Teja, Rahul, Suresh" 
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />

          <button 
            type="submit" 
            className="modal-save-btn"
            disabled={!nameInput.trim()}
          >
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
