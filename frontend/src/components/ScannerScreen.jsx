import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScannerScreen() {
  const [autoSaveNotification, setAutoSaveNotification] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
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
        setIsCameraActive(true);
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
          if (decodedText === lastScannedTextRef.current && (now - lastScannedTimeRef.current) < 1500) {
            return;
          }

          lastScannedTextRef.current = decodedText;
          lastScannedTimeRef.current = now;

          const res = await sendScan(decodedText);

          if (res && res.isDuplicate) {
            triggerVibration([200, 100, 200]);
            setAutoSaveNotification({ text: 'Already included', isDuplicate: true });
            setTimeout(() => setAutoSaveNotification(null), 1600);
          } else {
            triggerVibration([120, 80, 120]);
            const previewText = decodedText.length > 25 ? decodedText.substring(0, 25) + '...' : decodedText;
            setAutoSaveNotification({ text: `Saved: "${previewText}"`, isDuplicate: false });
            setTimeout(() => setAutoSaveNotification(null), 1600);
          }
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

      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera start error:", err);
      try {
        if (html5QrcodeRef.current && !html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.start(
            { facingMode: "user" },
            { fps: 30, qrbox: { width: 270, height: 270 } },
            async (decodedText) => {
              triggerVibration([120, 80, 120]);
              await sendScan(decodedText);
              setAutoSaveNotification({ text: "Saved QR Code!", isDuplicate: false });
              setTimeout(() => setAutoSaveNotification(null), 1600);
            },
            () => {}
          );
          setIsCameraActive(true);
        }
      } catch (fallbackErr) {
        setIsCameraActive(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="scanner-screen-fullscreen">
      <div className="viewfinder-fullscreen">
        <div id="html5-qrcode-reader"></div>

        {!isCameraActive && (
          <div 
            onClick={startCamera}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#0F172A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              cursor: 'pointer',
              zIndex: 30,
              padding: '24px',
              textAlign: 'center'
            }}
          >
            <Camera size={52} color="#10B981" />
            <button 
              style={{
                padding: '14px 28px',
                background: 'var(--primary-emerald)',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: '30px',
                fontSize: '1.05rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📷 Tap to Open Camera
            </button>
          </div>
        )}

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
