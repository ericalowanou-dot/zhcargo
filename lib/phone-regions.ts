export type CountryOption = {
  flag: string;
  name: string;
  dial: string;
  minDigits: number;
  maxDigits: number;
  iso: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { flag: "TG", name: "Togo", dial: "228", minDigits: 8, maxDigits: 8, iso: "TG" },
  { flag: "BJ", name: "Bénin", dial: "229", minDigits: 8, maxDigits: 10, iso: "BJ" },
  { flag: "CI", name: "Côte d'Ivoire", dial: "225", minDigits: 8, maxDigits: 10, iso: "CI" },
  { flag: "GA", name: "Gabon", dial: "241", minDigits: 8, maxDigits: 8, iso: "GA" },
  { flag: "BF", name: "Burkina Faso", dial: "226", minDigits: 8, maxDigits: 8, iso: "BF" },
  { flag: "SN", name: "Sénégal", dial: "221", minDigits: 9, maxDigits: 9, iso: "SN" },
];

export function buildE164(dial: string, national: string) {
  const clean = national.replace(/\D/g, "");
  return `+${dial}${clean}`;
}

export function e164ToIsoCountry(phone: string): string {
  for (const c of COUNTRY_OPTIONS) {
    if (phone.startsWith(`+${c.dial}`)) return c.iso;
  }
  return "TG";
}

export function maskPhoneForDisplay(phone: string) {
  for (const c of COUNTRY_OPTIONS) {
    if (phone.startsWith(`+${c.dial}`)) {
      const nat = phone.slice(`+${c.dial}`.length).replace(/\D/g, "");
      if (nat.length < 2) return `+${c.dial} •• •• •• ••`;
      return `+${c.dial} •• •• •• ${nat.slice(-2)}`;
    }
  }
  const d = phone.replace(/\D/g, "");
  const last2 = d.slice(-2);
  return d.length > 2 ? `+${d.slice(0, 3)} •• ${last2}` : phone;
}

export function phoneInitials(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 2) return "?";
  return d.slice(-2);
}

export function validateE164(phone: string): { ok: true } | { ok: false; error: string } {
  for (const c of COUNTRY_OPTIONS) {
    if (phone.startsWith(`+${c.dial}`)) {
      const nat = phone.slice(`+${c.dial}`.length).replace(/\D/g, "");
      if (nat.length < c.minDigits || nat.length > c.maxDigits) {
        return {
          ok: false,
          error: `Le numéro doit comporter entre ${c.minDigits} et ${c.maxDigits} chiffres.`,
        };
      }
      return { ok: true };
    }
  }
  return { ok: false, error: "Indicatif pays non pris en charge." };
}
