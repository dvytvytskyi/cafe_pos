import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';
import {
  formatPriceInputLive,
  formatPriceInputBlur,
  insertPriceDecimalSeparator,
  isPriceDecimalKey,
} from './format-price';

/** Prevent the follow-up change event from undoing a manual decimal insert. */
const skipNextInputChange = new WeakMap<HTMLInputElement, boolean>();

export function onPriceInputChange(
  e: ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void
) {
  const input = e.currentTarget;
  if (skipNextInputChange.get(input)) {
    skipNextInputChange.delete(input);
    return;
  }
  setter(formatPriceInputLive(e.target.value));
}

export function onPriceInputBlur(
  e: FocusEvent<HTMLInputElement>,
  setter: (val: string) => void
) {
  setter(formatPriceInputBlur(e.target.value));
}

export function onPriceInputKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  setter: (val: string) => void
) {
  if (!isPriceDecimalKey(e.key, e.code)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  e.preventDefault();
  e.stopPropagation();

  const input = e.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const { value, cursor } = insertPriceDecimalSeparator(input.value, start, end);

  skipNextInputChange.set(input, true);
  setter(value);

  // Wait for React to commit the controlled value before moving the cursor.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      input.setSelectionRange(cursor, cursor);
    });
  });
}
