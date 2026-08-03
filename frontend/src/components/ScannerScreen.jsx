import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2 } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScannerScreen() {
  const [autoSaveNotification, setAutoSaveNotification] = useState('');
  const lastScannedTimeRef = useRef(0);
  const lastScannedTextRef = useRef('');
  const html5QrcodeRef = useRef(null);
  const { sendScan } = useWebSocket();

  const triggerVibration = (pattern) => {
    if (navigator && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  const startCamera = async () => {
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
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      };

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          const now = Date.now();
          // Debounce identical scans within 1.5 seconds to prevent duplicate spam
          if (decodedText === lastScannedTextRef.current && (now - lastScannedTimeRef.current) < 1500) {
            return;
          }

          lastScannedTextRef.current = decodedText;
          lastScannedTimeRef.current = now;

          // 1. PhonePe-style double vibration on QR detect
          triggerVibration([100, 50, 100]);

          // 2. Instant automatic zero-click save to database
          await sendScan(decodedText);

          // 3. Show brief auto-save confirmation toast
          const previewText = decodedText.length > 25 ? decodedText.substring(0, 25) + '...' : decodedText;
          setAutoSaveNotification(`Saved: "${previewText}"`);
          setTimeout(() => setAutoSaveNotification(''), 1600);
        },
        () => {}
      );

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
      // Retry standard start if initial call fails
      try {
        if (html5QrcodeRef.current && !html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.start(
            { facingMode: "user" },
            { fps: 30, qrbox: { width: 270, height: 270 } },
            async (decodedText) => {
              triggerVibration([100, 50, 100]);
              await sendScan(decodedText);
              setAutoSaveNotification("Saved QR Code!");
              setTimeout(() => setAutoSaveNotification(''), 1600);
            },
            () => {}
          );
        }
      } catch (fallbackErr) {}
    }
  };

  useEffect(() => {
    // Automatically start camera immediately on screen mount
    startCamera();

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="scanner-screen-fullscreen">
      {/* 100% Fullscreen Camera Viewfinder */}
      <div className="viewfinder-fullscreen">
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

        {/* Auto-Save Toast Notification Overlay */}
        {autoSaveNotification && (
          <div className="auto-save-toast">
            <CheckCircle2 size={20} color="#10B981" />
            <span>{autoSaveNotification}</span>
          </div>
        )}
      </div>
    </div>
  );
}
