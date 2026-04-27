/** Clé d’opérateur = pays + moteur, pour l’app et l’envoi FedaPay (mode). */

export type MoneyOperator = {
  id: string;
  name: string;
  emoji: string;
  /**
   * Chemin d’appel FedaPay sendNow( mode ) — ex. mtn, moov, orange, wave
   */
  fedapayMode: string;
  /** Indication USSD côté client (Togo) */
  ussd?: string;
};

const TG: MoneyOperator[] = [
  { id: "tg_tmoney", name: "TMoney (Togocel)", emoji: "", fedapayMode: "mtn", ussd: "*145#" },
  { id: "tg_flooz", name: "Flooz (Moov Africa)", emoji: "", fedapayMode: "moov", ussd: "*155#" },
];

const BJ: MoneyOperator[] = [
  { id: "bj_mtn", name: "MTN Mobile Money", emoji: "", fedapayMode: "mtn" },
  { id: "bj_flooz", name: "Flooz (Moov)", emoji: "", fedapayMode: "moov" },
];

const CI: MoneyOperator[] = [
  { id: "ci_orange", name: "Orange Money", emoji: "", fedapayMode: "orange" },
  { id: "ci_mtn", name: "MTN MoMo", emoji: "", fedapayMode: "mtn" },
  { id: "ci_wave", name: "Wave", emoji: "", fedapayMode: "wave" },
];

const GA: MoneyOperator[] = [
  { id: "ga_airtel", name: "Airtel Money", emoji: "", fedapayMode: "airtel" },
  { id: "ga_flooz", name: "Flooz", emoji: "", fedapayMode: "moov" },
];

const BF: MoneyOperator[] = [
  { id: "bf_orange", name: "Orange Money", emoji: "", fedapayMode: "orange" },
  { id: "bf_flooz", name: "Flooz", emoji: "", fedapayMode: "moov" },
];

const SN: MoneyOperator[] = [
  { id: "sn_orange", name: "Orange Money", emoji: "", fedapayMode: "orange" },
  { id: "sn_wave", name: "Wave", emoji: "", fedapayMode: "wave" },
  { id: "sn_free", name: "Free Money", emoji: "", fedapayMode: "mtn" },
];

const BY_COUNTRY: Record<string, MoneyOperator[]> = {
  TG: TG,
  BJ: BJ,
  CI: CI,
  GA: GA,
  BF: BF,
  SN: SN,
};

export function getOperatorsForCountry(iso: string | undefined | null) {
  const c = (iso || "TG").toUpperCase();
  return BY_COUNTRY[c] ?? BY_COUNTRY.TG!;
}

export function getOperatorById(
  id: string,
  countryIso: string,
): MoneyOperator | undefined {
  return getOperatorsForCountry(countryIso).find((o) => o.id === id);
}

/**
 * Texte d’attente côté client (étape 3) selon l’opérateur
 */
export function getPaymentWaitHints(operatorId: string, operatorName: string) {
  if (operatorId === "tg_tmoney") {
    return "Composez *145# sur votre téléphone et confirmez le paiement TMoney.";
  }
  if (operatorId === "tg_flooz") {
    return "Composez *155# sur votre téléphone et confirmez le paiement Flooz.";
  }
  return `Confirmez le paiement ${operatorName} sur votre appareil mobile.`;
}
