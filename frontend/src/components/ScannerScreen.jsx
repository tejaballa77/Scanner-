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

      // High-Definition 1080p / 4K camera constraints for 100% native clarity
      const hdConstraints = {
        facingMode: "environment",
        width: { min: 1280, ideal: 1920, max: 3840 },
        height: { min: 720, ideal: 1080, max: 2160 },
        focusMode: { ideal: "continuous" }
      };

      const config = {
        fps: 60,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.85),
            height: Math.floor(minEdge * 0.85)
          };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      try {
        await html5QrcodeRef.current.start(
          hdConstraints,
          config,
          handleQrSuccess,
          () => {}
        );
      } catch (envErr) {
        console.warn("HD Rear camera failed, trying default environment camera:", envErr);
        try {
          await html5QrcodeRef.current.start(
            { facingMode: "environment" },
            config,
            handleQrSuccess,
            () => {}
          );
        } catch (fallback1) {
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
