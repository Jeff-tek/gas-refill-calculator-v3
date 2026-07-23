// components/PWAInstallPrompt.tsx
"use client";

import { useEffect, useState, useRef } from "react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /* Register service worker */
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.debug("[SW] Registered"))
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }

    /* Detect install prompt */
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    /* Detect successful install */
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowPrompt(false);
      flashToast("App installed successfully");
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  function flashToast(msg: string) {
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 3000);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstalled(true);
      flashToast("App installed");
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  }

  function handleDismiss() {
    setShowPrompt(false);
    setDismissed(true);
  }

  /* Already installed or no prompt available */
  if (installed || !showPrompt) return null;

  return (
    <div className="pwa-prompt" role="dialog" aria-label="Install app prompt">
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#494fdf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="3" width="10" height="18" rx="5" />
            <rect x="10" y="1" width="4" height="3" rx="1" />
            <rect x="9" y="3" width="6" height="2" rx="1" />
            <line x1="12" y1="10" x2="12" y2="14" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </div>
        <div className="pwa-prompt-text">
          <strong>Install Gas Refill</strong>
          <span>Add to home screen for quick access</span>
        </div>
        <div className="pwa-prompt-actions">
          <button className="pwa-prompt-install" onClick={handleInstall}>
            Install
          </button>
          <button className="pwa-prompt-dismiss" onClick={handleDismiss} aria-label="Dismiss">
            &times;
          </button>
        </div>
      </div>
      {showToast && (
        <div className="pwa-toast">App installed successfully</div>
      )}
    </div>
  );
}
