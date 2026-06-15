const PK_MOBILE_NATIONAL = /^3[0-9]{9}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Keep at most 10 national digits (3XX…); strips pasted +92/0. */
export function sanitizePakistanPhoneInput(raw: string): string {
  let digits = digitsOnly(raw);
  if (digits.startsWith("92")) digits = digits.slice(2);
  while (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }
  if (digits.startsWith("0") && digits.length <= 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function isValidPakistanMobileNational(national: string): boolean {
  return PK_MOBILE_NATIONAL.test(national);
}

/** Display: 300 1234567 */
export function formatPakistanPhoneDisplay(national: string): string {
  const d = sanitizePakistanPhoneInput(national);
  if (d.length <= 3) return d;
  return `${d.slice(0, 3)} ${d.slice(3)}`.trim();
}

/** API payload: +923001234567 */
export function toPakistanE164(national: string): string | null {
  const d = sanitizePakistanPhoneInput(national);
  if (!isValidPakistanMobileNational(d)) return null;
  return `+92${d}`;
}
