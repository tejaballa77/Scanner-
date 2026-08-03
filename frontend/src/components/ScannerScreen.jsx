import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle2, Camera } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function ScannerScreen() {
  const [autoSaveNotification, setAutoSaveNotification] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(false);

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
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } else {
        html5QrcodeRef.current = new Html5Qrcode("html5-qrcode-reader", {
          verbose: false,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        });
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: { ideal: "environment" },
              width: { min: 1280, ideal: 1920, max: 3840 },
              height: { min: 720, ideal: 1080, max: 2160 },
              focusMode: { ideal: "continuous" }
            } 
          });
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr) {}
      }

      const devices = await Html5Qrcode.getCameras();

      const config = {
        fps: 30,
        qrbox: { width: 270, height: 270 },
        aspectRatio: 1.0,
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      };

      let cameraConstraint = {
        facingMode: { ideal: "environment" },
        width: { min: 1280, ideal: 1920, max: 3840 },
        height: { min: 720, ideal: 1080, max: 2160 },
        focusMode: { ideal: "continuous" }
      };

      if (devices && devices.length > 0) {
        const rearCamera = devices.find(d => {
          const label = d.label.toLowerCase();
          return label.includes('back') || label.includes('environment') || label.includes('rear');
        });
        
        if (rearCamera) {
          cameraConstraint = {
            deviceId: { exact: rearCamera.id },
            width: { min: 1280, ideal: 1920, max: 3840 },
            height: { min: 720, ideal: 1080, max: 2160 },
            focusMode: { ideal: "continuous" }
          };
        }
      }

      await html5QrcodeRef.current.start(
        cameraConstraint,
        config,
        async (decodedText) => {
          const now = Date.now();
          // Debounce identical scans within 1.5 seconds to prevent spam
          if (decodedText === lastScannedTextRef.current && (now - lastScannedTimeRef.current) < 1500) {
            return;
          }

          lastScannedTextRef.current = decodedText;
          lastScannedTimeRef.current = now;

          // 1. Trigger PhonePe-style double vibration on scan
          triggerVibration([100, 50, 100]);

          // 2. AUTOMATIC INSTANT SAVE TO DATABASE (ZERO CLICKS NEEDED)
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

      setIsScanningActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      try {
        if (html5QrcodeRef.current && !html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.start(
            { facingMode: "environment" },
            { 
              fps: 30, 
              qrbox: { width: 270, height: 270 },
              formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
              experimentalFeatures: { useBarCodeDetectorIfSupported: false }
            },
            async (decodedText) => {
              triggerVibration([100, 50, 100]);
              await sendScan(decodedText);
              setAutoSaveNotification("Saved QR Code!");
              setTimeout(() => setAutoSaveNotification(''), 1600);
            },
            () => {}
          );
          setIsScanningActive(true);
          return;
        }
      } catch (fallbackErr) {}

      setIsScanningActive(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="scanner-screen-fullscreen">
      {/* Fullscreen HD Rear Camera Viewfinder */}
      <div className="viewfinder-fullscreen">
        <div id="html5-qrcode-reader"></div>

        {!isScanningActive && (
          <div 
            onClick={startCamera}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#000',
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
            <Camera size={52} color="#FFFFFF" />
            <button 
              style={{
                padding: '14px 28px',
                background: 'var(--primary-emerald)',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: '30px',
                fontSize: '1.05rem',
                border: 'none'
              }}
            >
              📷 Tap to Turn On Camera
            </button>
          </div>
        )}

        {isScanningActive && (
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
        )}

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
