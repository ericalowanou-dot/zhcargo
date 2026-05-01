/** Numéro WhatsApp business (sans +) — Bénin */
export const WHATSAPP_E164 = "22992686529";

export const WHATSAPP_DISPLAY = "+229 92 68 65 29";

export const WA_PRESET_TEXT = {
  product:
    "Bonjour ZH CARGO, j’aimerais des renseignements sur un produit (prix, disponibilité).",
  expertise:
    "Bonjour ZH CARGO, je souhaite une expertise import Chine (conseil, sourcing, transfert, groupage).",
  default:
    "Bonjour ZH CARGO, j’aurais une question concernant vos produits.",
} as const;

export function whatsappHref(text: string): string {
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}
