/**
 * Mode test (sans FedaPay) : le serveur confirme le paiement et génère la facture.
 *
 * - `PAYMENT_SIMULATION=true` : force la simulation (recommandé en staging).
 * - `PAYMENT_SIMULATION=false` : désactive (appels FedaPay réels si clés OK).
 * - Non défini : en `NODE_ENV=development`, simulation activée par défaut.
 *   En production, simulation désactivée sauf si `PAYMENT_SIMULATION=true`.
 */
export function isPaymentSimulation(): boolean {
  const v = process.env.PAYMENT_SIMULATION?.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return process.env.NODE_ENV === "development";
}
