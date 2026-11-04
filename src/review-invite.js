export const REVIEW_URL = 'https://chromewebstore.google.com/detail/answer-imagifier-for-chat/llhbppnankbnkddcmhfejoegcembkdfe/reviews';
const STORAGE_KEY = 'reviewInviteShown';
let claimed = false;

// Keep this separate from export preferences so saving settings cannot reset it.
export async function claimReviewInvite() {
  if (claimed) return false;
  claimed = true;
  try {
    const storage = globalThis.chrome?.storage?.local;
    const stored = await storage?.get(STORAGE_KEY);
    if (stored?.[STORAGE_KEY] === true) return false;
    await storage?.set({ [STORAGE_KEY]: true });
  } catch {
    // A storage failure must not interrupt the switch; suppress repeats in this page.
  }
  return true;
}
