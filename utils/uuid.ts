/**
 * Generates a UUID v4 string.
 * Falls back to a math-based generator if crypto.randomUUID is not available
 * (e.g., in non-secure contexts).
 */
export const generateUUID = (): string => {
  // Check if crypto.randomUUID is available (Modern browsers + Secure Context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers or insecure contexts (HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};