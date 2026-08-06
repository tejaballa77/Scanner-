import React, { useState } from 'react';
import { User, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function UserModal({ isOpen, onClose }) {
  const { userName, updateUserName } = useWebSocket();
  const [nameInput, setNameInput] = useState(userName || '');

  if (!isOpen) return null;

  const handleClose = () => {
    if (!userName) {
      updateUserName('Staff');
    }
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = nameInput.trim() || 'Staff';
    updateUserName(finalName);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Scanner User Identity</h2>
          <button 
            type="button"
            className="icon-btn" 
            onClick={handleClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
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
          >
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
