/** Display amount with comma decimal separator (e.g. 4.5 → "4,50"). */
export function formatPriceDisplay(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

/** Strip invalid characters from a price input field. */
export function sanitizePriceInput(val: string): string {
  return val.replace(/[^\d.,]/g, '');
}

/** Live EU price input — free typing; comma decimal, up to 2 fraction digits. */
export function formatPriceInputLive(val: string): string {
  let sanitized = sanitizePriceInput(val);
  if (!sanitized) return '';

  // Allow dot as decimal separator while typing (e.g. "2.1" → "2,1")
  if (!sanitized.includes(',') && sanitized.includes('.')) {
    const dotPos = sanitized.indexOf('.');
    sanitized =
      sanitized.slice(0, dotPos) +
      ',' +
      sanitized.slice(dotPos + 1).replace(/\./g, '');
  }

  const commaPos = sanitized.indexOf(',');
  if (commaPos >= 0) {
    const intRaw = sanitized.slice(0, commaPos).replace(/[.,]/g, '');
    const decRaw = sanitized.slice(commaPos + 1).replace(/\D/g, '').slice(0, 2);
    if (decRaw.length === 0) {
      return intRaw ? `${intRaw},` : ',';
    }
    return `${intRaw || '0'},${decRaw}`;
  }

  return sanitized.replace(/[.,]/g, '');
}

/** Insert comma at cursor; used when browser blocks "," in decimal inputs. */
export function insertPriceDecimalSeparator(
  value: string,
  selectionStart: number,
  selectionEnd: number
): { value: string; cursor: number } {
  if (value.includes(',')) {
    const commaIdx = value.indexOf(',');
    return { value, cursor: commaIdx + 1 };
  }

  const raw = value.slice(0, selectionStart) + ',' + value.slice(selectionEnd);
  const formatted = formatPriceInputLive(raw);
  const commaIdx = formatted.indexOf(',');
  const cursor = commaIdx >= 0 ? commaIdx + 1 : formatted.length;
  return { value: formatted, cursor };
}

export function isPriceDecimalKey(key: string, code?: string): boolean {
  if (key === ',' || key === '.' || key === 'Decimal') return true;
  if (code === 'Comma' || code === 'Period' || code === 'NumpadDecimal') return true;
  return false;
}

/** Normalize on blur — always two decimal places. */
export function formatPriceInputBlur(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';
  return formatPriceDisplay(parsePriceInput(trimmed));
}

/** Convert user-facing price string to dot-decimal for parsing/validation. */
export function normalizePriceForValidation(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (trimmed.includes(',')) {
    return trimmed.replace(/\./g, '').replace(',', '.');
  }
  return trimmed;
}

/** Parse a localized price input to a number (0 when empty/invalid). */
export function parsePriceInput(val: string): number {
  const normalized = normalizePriceForValidation(val);
  if (!normalized) return 0;
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}
