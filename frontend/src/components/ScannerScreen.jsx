import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScannerScreen() {
  const [autoSaveNotification, setAutoSaveNotification] = useState(null);
  const [cameraError, setCameraError] = useState(false);
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

  const handleQrSuccess = async (decodedText) => {
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
  };

  const startCamera = async () => {
    setCameraError(false);
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
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      };

      // Try camera constraints in order of preference
      let cameraSelection = { facingMode: "environment" };

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rearCam = devices.find(d => {
            const label = d.label.toLowerCase();
            return label.includes('back') || label.includes('rear') || label.includes('environment');
          }) || devices[devices.length - 1]; // Use last camera (usually rear camera)

          if (rearCam) {
            cameraSelection = { deviceId: { exact: rearCam.id } };
          }
        }
      } catch (camListErr) {}

      try {
        await html5QrcodeRef.current.start(cameraSelection, config, handleQrSuccess, () => {});
      } catch (primaryErr) {
        // Fallback 1: Generic environment facing mode
        try {
          await html5QrcodeRef.current.start({ facingMode: "environment" }, config, handleQrSuccess, () => {});
        } catch (fallback1) {
          // Fallback 2: Any available camera
          await html5QrcodeRef.current.start({ facingMode: "user" }, config, handleQrSuccess, () => {});
        }
      }

      // Ensure video element fits 100% viewport
      const videoElem = document.querySelector("#html5-qrcode-reader video");
      if (videoElem) {
        videoElem.setAttribute("playsinline", "true");
        videoElem.setAttribute("autoplay", "true");
        videoElem.style.width = "100%";
        videoElem.style.height = "100%";
        videoElem.style.objectFit = "cover";
      }
    } catch (finalErr) {
      console.error("Camera startup error:", finalErr);
      setCameraError(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 200);

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

        {cameraError && (
          <div className="camera-permission-overlay" onClick={startCamera}>
            <Camera size={52} color="#10B981" />
            <div className="start-cam-btn">
              📷 Tap to Allow & Turn On Camera
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Ensure camera permissions are enabled in your mobile browser settings
            </p>
          </div>
        )}

        {/* Framing Reticle Overlay */}
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
