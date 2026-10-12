/**
 * Puts text on the clipboard. Resolves to false when the browser has no clipboard or refuses
 * (not a secure page, permission denied), so the caller can show the text for copying by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
