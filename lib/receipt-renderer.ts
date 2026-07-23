// lib/receipt-renderer.ts
//
// Canvas-based receipt renderer for daily summaries.
// Generates a non-editable image (PNG blob) from transaction data.
// The receipt shows a clean, print-style layout that cannot be tampered
// with during sharing — it's a raster image, not editable text.

import type { Transaction } from "./types";
import { fmt2, group, naira, kg } from "./precision";

function revenueOf(t: Transaction): number {
  return t.mode === "A" ? t.input : (t.cost ?? t.input * t.gsp);
}

function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Generate a canvas containing a daily sales receipt.
 *  Returns a Promise<Blob> (PNG image) suitable for sharing.
 */
export async function renderDailyReceipt(
  items: Transaction[],
  businessName: string,
  dateLabel: string,
  footer?: string
): Promise<Blob> {
  if (items.length === 0) throw new Error("No transactions to render");

  // Sort by timestamp
  const sorted = [...items].sort((a, b) => a.ts - b.ts);

  // Compute summary
  let kgSum = 0;
  let revSum = 0;
  let cashRev = 0;
  let transferRev = 0;
  sorted.forEach((t) => {
    kgSum += t.filledKg;
    const rev = revenueOf(t);
    revSum += rev;
    if (t.paymentMethod === "transfer") transferRev += rev;
    else cashRev += rev;
  });

  const fillCount = sorted.length;

  // Canvas setup
  const margin = 24;
  const lineHeight = 20;
  const smallLine = 16;
  const col1X = margin;
  const col2X = margin + 140;
  const valueX = 400; // right-align values
  const width = 460;
  let y = margin;

  // Estimate height: header + lines + footer
  const headerHeight = 90;
  const summaryLines = 8;
  const txnStartY = headerHeight + summaryLines * lineHeight + 40;
  const txnHeight = sorted.length * (smallLine + 4) + 20;
  const footerHeight = 50;
  const totalHeight = txnStartY + txnHeight + footerHeight + margin;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = totalHeight;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D context not available");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, totalHeight);

  // ── Header ──
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 18px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.fillText(businessName || "GAS REFILL STATION", width / 2, y + 18);

  ctx.font = "bold 14px 'Courier New', Courier, monospace";
  ctx.fillText("DAILY SALES SUMMARY", width / 2, y + 40);

  ctx.font = "11px 'Courier New', Courier, monospace";
  ctx.fillStyle = "#555555";
  ctx.fillText(dateLabel, width / 2, y + 56);

  // Divider
  y += 72;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Summary ──
  y += 12;
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "12px 'Courier New', Courier, monospace";
  ctx.textAlign = "left";

  function summaryRow(label: string, value: string, yp: number) {
    ctx.fillStyle = "#333333";
    ctx.font = "12px 'Courier New', Courier, monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, col1X, yp);
    ctx.textAlign = "right";
    ctx.fillText(value, valueX, yp);
  }

  summaryRow("Fills", String(fillCount), y);
  y += lineHeight;
  summaryRow("Kg Dispensed", kg(kgSum) + " kg", y);
  y += lineHeight;
  summaryRow("Total Revenue", naira(revSum), y);
  y += lineHeight;
  summaryRow("Cash", naira(cashRev), y);
  y += lineHeight;
  summaryRow("Transfer", naira(transferRev), y);

  // Divider
  y += 8;
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();

  // ── Transactions ──
  y += 16;
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 11px 'Courier New', Courier, monospace";
  ctx.textAlign = "left";
  ctx.fillText("#  Time     Mode    Payment    Amount         Kg", col1X, y);
  y += smallLine;

  sorted.forEach((t, i) => {
    ctx.fillStyle = "#333333";
    ctx.font = "11px 'Courier New', Courier, monospace";
    ctx.textAlign = "left";

    const time = clockTime(t.ts);
    const modeLabel = t.mode === "A" ? "Price" : "KgWnt";
    const payLabel = t.paymentMethod === "transfer" ? "Xfer" : "Cash";
    const amountStr = t.mode === "A" ? naira(t.input) : kg(t.input) + "kg";
    const filledStr = kg(t.filledKg) + "kg";

    const line = `${String(i + 1).padStart(2)}  ${time}  ${modeLabel}  ${payLabel}  ${amountStr.padStart(9)}  ${filledStr.padStart(8)}`;
    ctx.fillText(line, col1X, y);

    y += smallLine + 2;
  });

  // ── Footer ──
  y += 12;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();
  ctx.setLineDash([]);

  y += 16;
  ctx.fillStyle = "#555555";
  ctx.font = "10px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  const footerText = footer || "Thank you for your patronage!";
  ctx.fillText(footerText, width / 2, y);

  // Timestamp
  y += smallLine;
  ctx.fillText(
    "Generated " + new Date().toLocaleString(),
    width / 2,
    y
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate receipt image"));
    }, "image/png");
  });
}

/** Render a bottle summary as an image. */
export async function renderBottleReceipt(
  bottleName: string,
  startDate: string,
  endDate: string,
  fillCount: number,
  usedKg: number,
  totalRev: number,
  totalCost: number,
  totalExpenses: number,
  netProfit: number,
  cashRev: number,
  transferRev: number,
  costPricePerKg: number,
  businessName: string,
  footer?: string
): Promise<Blob> {
  const margin = 24;
  const lineHeight = 20;
  const width = 460;
  let y = margin;

  const lineCount = 14;
  const totalHeight = margin + 70 + lineCount * lineHeight + 60 + margin;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = totalHeight;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D context not available");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, totalHeight);

  // Header
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 18px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.fillText(businessName || "GAS REFILL STATION", width / 2, y + 18);
  ctx.font = "bold 14px 'Courier New', Courier, monospace";
  ctx.fillText("BOTTLE SUMMARY", width / 2, y + 40);
  ctx.font = "11px 'Courier New', Courier, monospace";
  ctx.fillStyle = "#555555";
  ctx.fillText(bottleName + "  |  " + startDate + " – " + endDate, width / 2, y + 56);

  y += 72;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();
  ctx.setLineDash([]);

  y += 14;
  function row(label: string, value: string) {
    ctx.fillStyle = "#333333";
    ctx.font = "12px 'Courier New', Courier, monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, margin, y);
    ctx.textAlign = "right";
    ctx.fillText(value, width - margin, y);
    y += lineHeight;
  }

  row("Fills", String(fillCount));
  row("Kg Dispensed", kg(usedKg) + " kg");
  row("Revenue", naira(totalRev));
  row("Cash", naira(cashRev));
  row("Transfer", naira(transferRev));
  row("Gas Cost (" + naira(costPricePerKg) + "/kg)", "-" + naira(totalCost));
  if (totalExpenses > 0) row("Other Expenses", "-" + naira(totalExpenses));

  y += 4;
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();

  y += 10;
  ctx.fillStyle = netProfit >= 0 ? "#16a34a" : "#dc2626";
  ctx.font = "bold 14px 'Courier New', Courier, monospace";
  ctx.textAlign = "left";
  ctx.fillText("NET PROFIT", margin, y);
  ctx.textAlign = "right";
  ctx.fillText((netProfit >= 0 ? "" : "-") + naira(Math.abs(netProfit)), width - margin, y);

  y += 24;
  ctx.fillStyle = "#555555";
  ctx.font = "10px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.fillText(footer || "Thank you for your patronage!", width / 2, y);
  y += 14;
  ctx.fillText("Generated " + new Date().toLocaleString(), width / 2, y);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate receipt image"));
    }, "image/png");
  });
}
