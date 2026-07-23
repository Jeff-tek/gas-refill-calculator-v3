// lib/__tests__/storage.test.ts
import {
  getItem,
  setItem,
  removeItem,
  loadGsp,
  saveGsp,
  loadHistory,
  saveHistory,
  loadBottles,
  saveBottles,
  loadExpenses,
  saveExpenses,
  loadSettings,
  saveSettings,
  loadCostPrice,
  saveCostPrice,
  exportBackupData,
  importBackupData,
  clearAllData,
} from "../storage";

beforeEach(() => {
  // Clear all storage keys before each test
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ok */ }
      });
    }
  } catch {
    /* localStorage not available */
  }
});

describe("core getItem/setItem", () => {
  it("stores and retrieves values", () => {
    setItem("test-key", "hello");
    expect(getItem("test-key")).toBe("hello");
  });

  it("returns null for missing keys", () => {
    expect(getItem("nonexistent")).toBeNull();
  });

  it("overwrites existing values", () => {
    setItem("test-key", "first");
    setItem("test-key", "second");
    expect(getItem("test-key")).toBe("second");
  });
});

describe("in-memory fallback", () => {
  let origGetItem: any;
  let origSetItem: any;
  let origRemoveItem: any;

  beforeAll(() => {
    origGetItem = Storage.prototype.getItem;
    origSetItem = Storage.prototype.setItem;
    origRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.getItem = null as any;
    Storage.prototype.setItem = null as any;
    Storage.prototype.removeItem = null as any;
  });

  afterAll(() => {
    Storage.prototype.getItem = origGetItem;
    Storage.prototype.setItem = origSetItem;
    Storage.prototype.removeItem = origRemoveItem;
  });

  it("falls back to memory when localStorage is broken", () => {
    setItem("mem-key", "mem-value");
    expect(getItem("mem-key")).toBe("mem-value");
    removeItem("mem-key");
    expect(getItem("mem-key")).toBeNull();
  });
});

describe("removeItem", () => {
  it("removes stored values", () => {
    setItem("test-key", "value");
    removeItem("test-key");
    expect(getItem("test-key")).toBeNull();
  });
});

describe("GSP storage", () => {
  it("returns fallback when no GSP stored", () => {
    expect(loadGsp("1500")).toBe("1500");
  });

  it("saves and loads GSP", () => {
    saveGsp("2000");
    expect(loadGsp("1500")).toBe("2000");
  });

  it("overwrites previous GSP", () => {
    saveGsp("1000");
    saveGsp("2500");
    expect(loadGsp("1500")).toBe("2500");
  });
});

describe("history storage", () => {
  it("returns empty array when no history stored", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("saves and loads history", () => {
    const txns = [
      {
        ts: 1000,
        gsp: 1700,
        csr: 0,
        mode: "A" as const,
        input: 5000,
        finalKg: 2.94,
        filledKg: 2.94,
        paymentMethod: "cash" as const,
        bottleId: "bottle-1",
      },
    ];
    saveHistory(txns);
    expect(loadHistory()).toEqual(txns);
  });

  it("handles corrupted history", () => {
    setItem("gasrefill_history_v1", "not-json");
    expect(loadHistory()).toEqual([]);
  });
});

describe("bottle storage", () => {
  it("returns empty array when no bottles stored", () => {
    expect(loadBottles()).toEqual([]);
  });

  it("saves and loads bottles", () => {
    const bottles = [
      {
        id: "b1",
        name: "Bottle #1",
        capacity: 55,
        remaining: 55,
        createdAt: 1000,
      },
    ];
    saveBottles(bottles);
    expect(loadBottles()).toEqual(bottles);
  });
});

describe("expense storage", () => {
  it("returns empty array when no expenses", () => {
    expect(loadExpenses()).toEqual([]);
  });

  it("saves and loads expenses", () => {
    const expenses = [
      {
        id: "e1",
        date: 1000,
        category: "transport" as const,
        description: "Fuel for delivery",
        amount: 5000,
      },
    ];
    saveExpenses(expenses);
    expect(loadExpenses()).toEqual(expenses);
  });
});

describe("settings storage", () => {
  it("returns null when no settings stored", () => {
    expect(loadSettings()).toBeNull();
  });

  it("saves and loads settings", () => {
    const settings = {
      businessName: "Test Biz",
      receiptFooter: "Thanks!",
      currencySymbol: "₦",
      currencyCode: "NGN",
    };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });
});

describe("cost price storage", () => {
  it("returns fallback when not set", () => {
    expect(loadCostPrice("0")).toBe("0");
  });

  it("saves and loads cost price", () => {
    saveCostPrice("1200");
    expect(loadCostPrice("0")).toBe("1200");
  });
});

describe("corrupted data handling", () => {
  it("handles corrupted history JSON", () => {
    setItem("gasrefill_history_v1", "{corrupted");
    expect(loadHistory()).toEqual([]);
  });

  it("handles corrupted bottles JSON", () => {
    setItem("gasrefill_bottles_v1", "{corrupted");
    expect(loadBottles()).toEqual([]);
  });

  it("handles corrupted expenses JSON", () => {
    setItem("gasrefill_expenses_v1", "{corrupted");
    expect(loadExpenses()).toEqual([]);
  });

  it("handles corrupted settings JSON", () => {
    setItem("gasrefill_settings_v1", "{corrupted");
    expect(loadSettings()).toBeNull();
  });
});

describe("exportBackupData", () => {
  it("exports valid backup structure", () => {
    saveHistory([{
      ts: 1, gsp: 1700, csr: 0, mode: "A" as const,
      input: 5000, finalKg: 2.94, filledKg: 2.94,
      paymentMethod: "cash" as const, bottleId: "b1",
    }]);
    const backup = exportBackupData();
    expect(backup.version).toBe(1);
    expect(backup.transactions).toHaveLength(1);
    expect(backup.exportedAt).toBeGreaterThan(0);
  });
});

describe("importBackupData", () => {
  it("imports valid backup data", () => {
    const data = {
      version: 1,
      exportedAt: Date.now(),
      businessName: "Test",
      transactions: [{
        ts: 1, gsp: 1700, csr: 0, mode: "A" as const,
        input: 5000, finalKg: 2.94, filledKg: 2.94,
        paymentMethod: "cash" as const, bottleId: "b1",
      }],
      bottles: [],
      expenses: [],
      settings: {
        businessName: "Imported Biz",
        receiptFooter: "Thanks",
        currencySymbol: "₦",
        currencyCode: "NGN",
      },
    };
    const result = importBackupData(data);
    expect(result.transactions).toBe(1);
    expect(loadHistory()).toHaveLength(1);
    const settings = loadSettings();
    expect(settings?.businessName).toBe("Imported Biz");
  });

  it("throws on invalid version", () => {
    expect(() => importBackupData({ version: 999 } as any)).toThrow("Invalid backup");
  });
});

describe("clearAllData", () => {
  it("clears all storage keys", () => {
    saveGsp("2000");
    saveHistory([{
      ts: 1, gsp: 1700, csr: 0, mode: "A" as const,
      input: 5000, finalKg: 2.94, filledKg: 2.94,
      paymentMethod: "cash" as const, bottleId: "b1",
    }]);
    saveBottles([{ id: "b1", name: "B", capacity: 55, remaining: 55, createdAt: 1 }]);
    clearAllData();
    expect(loadGsp("0")).toBe("0");
    expect(loadHistory()).toEqual([]);
    expect(loadBottles()).toEqual([]);
  });
});
