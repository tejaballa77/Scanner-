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

  const getOfflineQueue = () => {
    try {
      const raw = safeGetStorage('qr_offline_queue', '[]');
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  };

  const setOfflineQueue = (queue) => {
    safeSetStorage('qr_offline_queue', JSON.stringify(queue));
  };

  const syncOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      try {
        const res = await fetch(`${getApiUrl()}/scans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          const newScan = await res.json();
          setScans((prev) => {
            const exists = prev.some((s) => s.id === newScan.id || s.raw_text === newScan.raw_text);
            if (exists) return prev;
            return [newScan, ...prev];
          });
        } else if (res.status !== 409) {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }
    setOfflineQueue(remaining);
  }, []);

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
        syncOfflineQueue();
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
          } else if (message.type === 'DELETE_SCAN') {
            setScans((prev) => prev.filter((s) => s.id !== message.data.id));
          } else if (message.type === 'BULK_DELETE_SCANS') {
            const deleteIds = new Set(message.data.ids);
            setScans((prev) => prev.filter((s) => !deleteIds.has(s.id)));
          } else if (message.type === 'SCANS_CLEARED' || message.type === 'CLEAR_ALL_SCANS') {
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
  }, [syncOfflineQueue]);

  useEffect(() => {
    fetchScans();
    connectWebSocket();

    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchScans, connectWebSocket, syncOfflineQueue]);

  const sendScan = async (rawText, photoData = null) => {
    if (!rawText || !rawText.trim()) return { success: false };

    const activeName = (
      userName || 
      (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('qr_scanner_user_name') : '') || 
      'Staff'
    ).trim();

    const payload = {
      raw_text: rawText.trim(),
      user_name: activeName || 'Staff',
      photo_data: photoData || null,
    };

    try {
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
      console.error('Network offline, queuing scan locally:', err);
    }

    // Offline handling: Queue locally and show in local feed immediately
    const offlineItem = {
      id: 'offline_' + Date.now(),
      raw_text: payload.raw_text,
      user_name: payload.user_name,
      photo_data: payload.photo_data,
      created_at: new Date().toISOString(),
      isOffline: true
    };

    const currentQueue = getOfflineQueue();
    const isDup = currentQueue.some(q => q.raw_text === payload.raw_text) || scans.some(s => s.raw_text === payload.raw_text);
    
    if (isDup) {
      return { success: false, isDuplicate: true };
    }

    setOfflineQueue([...currentQueue, payload]);
    setScans((prev) => [offlineItem, ...prev]);

    return { success: true, isDuplicate: false, data: offlineItem };
  };

  const deleteSingleScan = async (id) => {
    try {
      const res = await fetch(`${getApiUrl()}/scans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setScans((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  const deleteBulkScans = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      const res = await fetch(`${getApiUrl()}/scans/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const idSet = new Set(ids);
        setScans((prev) => prev.filter((s) => !idSet.has(s.id)));
      }
    } catch (err) {
      console.error('Failed to bulk delete scans:', err);
    }
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
        deleteSingleScan,
        deleteBulkScans,
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
