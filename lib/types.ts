// lib/types.ts
export type FillMode = "A" | "B";
export type PaymentMethod = "cash" | "transfer";

export interface Bottle {
  id: string;
  name: string;
  capacity: number;
  remaining: number;
  createdAt: number;
  closedAt?: number;
}

export interface Transaction {
  /** Epoch ms; also used as the stable unique id for delete/lookup. */
  ts: number;
  /** GSP (naira per kg) used for this transaction. */
  gsp: number;
  /** Current Scale Reading at the start of the fill (kg). */
  csr: number;
  /** A = price customer pays, B = kg customer wants. */
  mode: FillMode;
  /** Raw input: naira in Mode A, kg in Mode B. */
  input: number;
  /** Expected final scale reading (kg), full precision. */
  finalKg: number;
  /** Kg dispensed in this fill, full precision. */
  filledKg: number;
  /** Cost in naira (Mode B only). */
  cost?: number;
  /** Cash or transfer. */
  paymentMethod: PaymentMethod;
  /** Which bottle this fill belongs to. */
  bottleId: string;
}
