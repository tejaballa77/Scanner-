import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

const safeGetStorage = (key, fallback = '') => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || fallback;
    }
  } catch (e) {}
  return fallback;
};

const safeSetStorage = (key, val) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
  } catch (e) {}
};

export const WebSocketProvider = ({ children }) => {
  const [scans, setScans] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState(() => {
    return safeGetStorage('qr_scanner_user_name', '');
  });
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const updateUserName = (name) => {
    const trimmed = name ? name.trim() : '';
    setUserName(trimmed);
    if (trimmed) {
      safeSetStorage('qr_scanner_user_name', trimmed);
    }
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

    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'INITIAL_SCANS') {
            setScans(message.data);
          } else if (message.type === 'NEW_SCAN') {
            setScans((prev) => {
              const exists = prev.some((s) => s.id === message.data.id || s.raw_text === message.data.raw_text);
              if (exists) return prev;
              return [message.data, ...prev];
            });
          } else if (message.type === 'SCANS_CLEARED') {
            setScans([]);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch (e) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WebSocket connection error:", e);
    }
  }, []);

  useEffect(() => {
    fetchScans();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchScans, connectWebSocket]);

  const sendScan = async (rawText) => {
    if (!rawText || !rawText.trim()) return { success: false };

    try {
      const payload = {
        raw_text: rawText.trim(),
        user_name: userName || 'Staff',
      };

      const res = await fetch(`${getApiUrl()}/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        return { success: false, isDuplicate: true };
      }

      if (res.ok) {
        const newScan = await res.json();
        setScans((prev) => {
          const exists = prev.some((s) => s.id === newScan.id || s.raw_text === newScan.raw_text);
          if (exists) return prev;
          return [newScan, ...prev];
        });
        return { success: true, isDuplicate: false, data: newScan };
      }
    } catch (err) {
      console.error('Failed to send scan:', err);
    }
    return { success: false, isDuplicate: false };
  };

  const clearAllScans = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/scans`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setScans([]);
      }
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
        fetchScans,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
