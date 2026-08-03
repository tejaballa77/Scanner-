import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export default function InstallHeader() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone (installed PWA) mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsDismissed(true);
      }
    } else {
      alert("To install this app on your phone home screen:\n\n• Android Chrome: Tap 3 dots (⋮) top right ➔ 'Install app' or 'Add to Home Screen'\n• iPhone Safari: Tap Share icon (⎋) bottom center ➔ 'Add to Home Screen'");
    }
  };

  // Hide header completely if running inside installed app or dismissed
  if (isStandalone || isDismissed) return null;

  return (
    <div className="install-header-banner">
      <div className="install-banner-left">
        <Smartphone size={18} color="#10B981" />
        <span className="install-banner-text">Install App on Mobile</span>
      </div>

      <div className="install-banner-actions">
        <button className="install-btn-small" onClick={handleInstallClick}>
          <Download size={14} />
          <span>Install</span>
        </button>
        <button className="dismiss-btn-small" onClick={() => setIsDismissed(true)} title="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
