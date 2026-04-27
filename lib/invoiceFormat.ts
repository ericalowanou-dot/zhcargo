/** Helpers facture (sans @react-pdf) — importables côté client. */

export function formatFcfa(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
      Math.round(amount),
    ) + " FCFA"
  );
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", " à");
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Numéro facture stable, style FACT-000123 (6 chiffres). */
export function generateInvoiceNumber(orderId: string): string {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) {
    h = Math.imul(31, h) + orderId.charCodeAt(i);
    h = h | 0;
  }
  const n = (Math.abs(h) % 1_000_000) as number;
  return `FACT-${String(n).padStart(6, "0")}`;
}

/** Facture téléchargeable une fois le paiement confirmé. */
export function canDownloadInvoice(status: string): boolean {
  return ["PAID", "PROCESSING", "TRANSIT", "DELIVERED"].includes(
    String(status || "").toUpperCase(),
  );
}
