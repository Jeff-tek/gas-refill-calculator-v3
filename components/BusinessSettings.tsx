// components/BusinessSettings.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { loadSettings, saveSettings, loadCostPrice, saveCostPrice } from "@/lib/storage";
import type { BusinessSettings } from "@/lib/types";
import { Settings, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

const DEFAULT: BusinessSettings = {
  businessName: "Gas Refill Terminal",
  receiptFooter: "Thank you for your patronage!",
  currencySymbol: "\u20A6",
  currencyCode: "NGN",
};

export default function BusinessSettingsDialog({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const saved = loadSettings();
    return saved ?? DEFAULT;
  });
  const [costPrice, setCostPrice] = useState(() => loadCostPrice("0"));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show modal on mount
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function handleSave() {
    saveSettings(settings);
    saveCostPrice(costPrice.replace(/,/g, ""));
    flash("Settings saved");
    setTimeout(() => {
      ref.current?.close();
      onClose();
    }, 300);
  }

  function handleClose() {
    ref.current?.close();
    onClose();
  }

  return (
    <>
      <dialog ref={ref} className="settings-dialog" onClose={onClose}>
        <div className="settings-body">
          <div className="settings-header">
            <Settings size={16} />
            <h2>Business Settings</h2>
            <button className="settings-close" onClick={handleClose}>
              <X size={14} />
            </button>
          </div>

          <div className="settings-fields">
            <div className="sf-group">
              <label htmlFor="biz-name">Business Name</label>
              <input
                id="biz-name"
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                placeholder="Gas Refill Terminal"
              />
            </div>

            <div className="sf-group">
              <label htmlFor="currency-symbol">Currency Symbol</label>
              <input
                id="currency-symbol"
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                placeholder="₦"
                maxLength={5}
                className="sf-short"
              />
            </div>

            <div className="sf-group">
              <label htmlFor="currency-code">Currency Code</label>
              <input
                id="currency-code"
                type="text"
                value={settings.currencyCode}
                onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value.toUpperCase() })}
                placeholder="NGN"
                maxLength={3}
                className="sf-short"
              />
            </div>

            <div className="sf-group">
              <label htmlFor="cost-price">Cost Price per kg (what you pay)</label>
              <input
                id="cost-price"
                type="text"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="sf-group">
              <label htmlFor="receipt-footer">Receipt Footer</label>
              <textarea
                id="receipt-footer"
                value={settings.receiptFooter}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                placeholder="Thank you for your patronage!"
                rows={2}
              />
            </div>
          </div>

          <div className="settings-actions">
            <button className="settings-cancel" onClick={handleClose}>Cancel</button>
            <button className="settings-confirm" onClick={handleSave}>Save Settings</button>
          </div>
        </div>

        {toast && <div className="settings-toast">{toast}</div>}
      </dialog>
    </>
  );
}
