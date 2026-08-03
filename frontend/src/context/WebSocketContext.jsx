import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [scans, setScans] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('qr_scanner_user_name') || 'Staff';
  });
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const updateUserName = (name) => {
    const trimmed = name.trim() || 'Anonymous';
    setUserName(trimmed);
    localStorage.setItem('qr_scanner_user_name', trimmed);
  };

  const getApiUrl = () => {
    return '/api';
  };

  const getWsUrl = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws`;
  };

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/scans`);
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsUrl = getWsUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_SCAN') {
          setScans((prev) => {
            if (prev.some((s) => s.id === message.data.id)) return prev;
            return [message.data, ...prev];
          });
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        } else if (message.type === 'DELETE_SCAN') {
          setScans((prev) => prev.filter((s) => s.id !== message.data.id));
        } else if (message.type === 'CLEAR_ALL_SCANS') {
          setScans([]);
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected. Retrying in 3s...');
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    fetchScans();
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchScans, connectWebSocket]);

  const sendScan = async (rawText) => {
    if (!rawText.trim()) return { success: false, isDuplicate: false };
    try {
      const res = await fetch(`${getApiUrl()}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName || 'Anonymous',
          raw_text: rawText
        })
      });
      if (res.ok) {
        return { success: true, isDuplicate: false };
      }
      if (res.status === 409) {
        return { success: false, isDuplicate: true };
      }
      return { success: false, isDuplicate: false };
    } catch (err) {
      console.error('Failed to send scan:', err);
      return { success: false, isDuplicate: false };
    }
  };

  const clearAllScans = async () => {
    try {
      await fetch(`${getApiUrl()}/scans`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear scans:', err);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        scans,
        isConnected,
        userName,
        updateUserName,
        sendScan,
        clearAllScans,
        fetchScans
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
