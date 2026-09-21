export const DEFAULT_SETTINGS = Object.freeze({ theme: 'light', width: 760, scale: 2, format: 'png', fontSize: 'standard', prompt: false, compact: false });
const allowed = {
  theme: ['light', 'dark'], width: [600, 760, 960], scale: [1, 2, 3],
  format: ['png', 'jpg'], fontSize: ['small', 'standard', 'large'],
  prompt: [false, true], compact: [false, true],
};
const STORAGE_KEY = 'exportSettings';
let pendingWrite = Promise.resolve();
export function normalizeSettings(value) {
  return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) =>
    [key, allowed[key].includes(value?.[key]) ? value[key] : fallback]));
}
export async function loadSettings() {
  await pendingWrite;
  try {
    const stored = await globalThis.chrome?.storage?.local?.get(STORAGE_KEY);
    return normalizeSettings(stored?.[STORAGE_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveSettings(value) {
  const snapshot = normalizeSettings(value);
  // Serialize writes in this content script so an older change cannot finish last.
  pendingWrite = pendingWrite.then(async () => {
    try {
      const storage = globalThis.chrome?.storage?.local;
      if (!storage) return false;
      await storage.set({ [STORAGE_KEY]: snapshot });
      return true;
    } catch {
      console.warn('Answer Imagifier: could not save export settings.');
      return false;
    }
  });
  return pendingWrite;
}
