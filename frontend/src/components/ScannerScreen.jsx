import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScannerScreen() {
  const [autoSaveNotification, setAutoSaveNotification] = useState(null);
  const lastScannedTimeRef = useRef(0);
  const lastScannedTextRef = useRef('');
  const html5QrcodeRef = useRef(null);
  const { sendScan } = useWebSocket();

  const triggerVibration = (pattern) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const success = navigator.vibrate(pattern);
        if (!success) {
          navigator.vibrate(200);
        }
      } catch (e) {
        try {
          navigator.vibrate(200);
        } catch (e2) {}
      }
    }
  };

  const handleQrSuccess = async (decodedText) => {
    const now = Date.now();
    if (decodedText === lastScannedTextRef.current && (now - lastScannedTimeRef.current) < 1500) {
      return;
    }

    lastScannedTextRef.current = decodedText;
    lastScannedTimeRef.current = now;

    const res = await sendScan(decodedText);

    if (res && res.isDuplicate) {
      triggerVibration([250, 100, 250]);
      setAutoSaveNotification({ text: 'Already included', isDuplicate: true });
      setTimeout(() => setAutoSaveNotification(null), 1600);
    } else {
      triggerVibration([180, 80, 180]);
      const previewText = decodedText.length > 25 ? decodedText.substring(0, 25) + '...' : decodedText;
      setAutoSaveNotification({ text: `Saved: "${previewText}"`, isDuplicate: false });
      setTimeout(() => setAutoSaveNotification(null), 1600);
    }
  };

  const startCamera = async () => {
    const element = document.getElementById("html5-qrcode-reader");
    if (!element) return;

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("html5-qrcode-reader", {
          verbose: false,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        });
      }

      if (html5QrcodeRef.current.isScanning) {
        return;
      }

      const config = {
        fps: 30,
        qrbox: { width: 270, height: 270 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      };

      try {
        await html5QrcodeRef.current.start(
          { facingMode: "environment" },
          config,
          handleQrSuccess,
          () => {}
        );
      } catch (envErr) {
        await html5QrcodeRef.current.start(
          { facingMode: "user" },
          config,
          handleQrSuccess,
          () => {}
        );
      }

      const videoElem = document.querySelector("#html5-qrcode-reader video");
      if (videoElem) {
        videoElem.setAttribute("playsinline", "true");
        videoElem.setAttribute("autoplay", "true");
        videoElem.style.width = "100%";
        videoElem.style.height = "100%";
        videoElem.style.objectFit = "cover";
      }
    } catch (err) {
      console.error("Camera start error:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      if (isMounted) {
        startCamera();
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().catch(() => {});
          }
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="scanner-screen-fullscreen">
      <div className="viewfinder-fullscreen" onClick={startCamera}>
        <div id="html5-qrcode-reader"></div>

        {/* Reticle Overlay Frame */}
        <div className="reticle-overlay-fullscreen">
          <div className="reticle-frame-large">
            <div className="corner top-left" />
            <div className="corner top-right" />
            <div className="corner bottom-left" />
            <div className="corner bottom-right" />
            <div className="laser-line" />
          </div>
          <div className="viewfinder-instruction">
            Place the code inside the frame
          </div>
        </div>

        {/* Toast Notification Overlay */}
        {autoSaveNotification && (
          <div className={`auto-save-toast ${autoSaveNotification.isDuplicate ? 'toast-duplicate' : ''}`}>
            {autoSaveNotification.isDuplicate ? (
              <AlertTriangle size={20} color="#F59E0B" />
            ) : (
              <CheckCircle2 size={20} color="#10B981" />
            )}
            <span>{autoSaveNotification.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
