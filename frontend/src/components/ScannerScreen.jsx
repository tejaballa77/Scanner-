import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScannerScreen() {
  const [autoSaveNotification, setAutoSaveNotification] = useState(null);
  const [cameraError, setCameraError] = useState(null);
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

  const captureCameraSnapshot = () => {
    try {
      const videoElem = document.querySelector("#html5-qrcode-reader video");
      if (!videoElem || !videoElem.videoWidth || !videoElem.videoHeight) return null;

      const canvas = document.createElement("canvas");
      const targetWidth = Math.min(1080, videoElem.videoWidth);
      const targetHeight = Math.floor((videoElem.videoHeight / videoElem.videoWidth) * targetWidth);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoElem, 0, 0, targetWidth, targetHeight);

      return canvas.toDataURL("image/jpeg", 0.90);
    } catch (e) {
      console.error("Camera photo snapshot capture error:", e);
      return null;
    }
  };

  const handleQrSuccess = async (decodedText) => {
    const now = Date.now();
    if (decodedText === lastScannedTextRef.current && (now - lastScannedTimeRef.current) < 1500) {
      return;
    }

    lastScannedTextRef.current = decodedText;
    lastScannedTimeRef.current = now;

    const photoSnapshot = captureCameraSnapshot();
    const res = await sendScan(decodedText, photoSnapshot);

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
    setCameraError(null);
    const element = document.getElementById("html5-qrcode-reader");
    if (!element) return;

    const config = {
      fps: 30,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(minEdge * 0.85),
          height: Math.floor(minEdge * 0.85)
        };
      },
      aspectRatio: 1.0
    };

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

      // Try explicit hardware back camera selection first
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          ) || devices[devices.length - 1];

          await html5QrcodeRef.current.start(
            backCamera.id,
            config,
            handleQrSuccess,
            () => {}
          );
        } else {
          throw new Error("No cameras enumerated");
        }
      } catch (devErr) {
        // Fallback to environment facingMode
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
      setCameraError("Camera permission blocked or unavailable. Tap to retry.");
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

        {/* Camera Failure Fallback Overlay */}
        {cameraError && (
          <div 
            onClick={startCamera}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '24px',
              gap: '16px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <Camera size={48} color="#10B981" />
            <p style={{ color: '#F8FAFC', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {cameraError}
            </p>
            <button style={{
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '25px',
              padding: '12px 28px',
              fontWeight: 700,
              cursor: 'pointer'
            }}>
              📷 Tap to Start Camera
            </button>
          </div>
        )}

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
