export interface PrivateDocumentWindow {
  close: () => void;
  location: { replace: (url: string) => void };
  opener: Window | null;
}

/**
 * Keeps the user gesture attached to opening the browser tab. The URL factory
 * performs the RLS-protected document lookup and private Storage signed-URL
 * creation; it never receives service credentials.
 */
export async function openPrivateDocumentFromClick(
  createUrl: () => Promise<string>,
  openWindow: () => PrivateDocumentWindow | null,
): Promise<void> {
  const target = openWindow();
  if (!target) throw new Error("Your browser blocked the document window. Allow pop-ups for this site and try again.");
  target.opener = null;
  try {
    target.location.replace(await createUrl());
  } catch (error) {
    target.close();
    throw error;
  }
}
