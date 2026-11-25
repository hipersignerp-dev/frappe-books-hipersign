import type { SelectFileOptions } from 'utils/types';

export type SelectedFile = {
  name: string;
  data: Uint8Array;
};

export function downloadFile(
  data: string | Uint8Array,
  fileName: string,
  type = 'application/octet-stream'
) {
  let content: string | ArrayBuffer;
  if (typeof data === 'string') {
    content = data;
  } else {
    const bytes = new Uint8Array(data.byteLength);
    bytes.set(data);
    content = bytes.buffer;
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url));
}

export function pickFile(
  options?: Partial<SelectFileOptions>
): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getAcceptedExtensions(options?.filters);
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function selectFile(
  options?: Partial<SelectFileOptions>
): Promise<SelectedFile | null> {
  const file = await pickFile(options);
  if (!file) {
    return null;
  }

  return { name: file.name, data: new Uint8Array(await file.arrayBuffer()) };
}

export async function printHtml(html: string): Promise<boolean> {
  const popup = window.open('', '_blank');
  if (!popup) {
    return false;
  }

  popup.document.open();
  popup.document.write(`<!DOCTYPE html>${html}`);
  popup.document.close();
  void printPopupWhenReady(popup).catch((error) => {
    if (!popup.closed) {
      popup.close();
    }

    throw error;
  });
  return true;
}

/**
 * Prints a page from a hidden frame in this one: the print dialog opens over
 * the current screen, with no new tab or window, and the frame goes after.
 */
export async function printHtmlInPage(html: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'print';
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(frame);
  const view = frame.contentWindow!;
  const remove = () => frame.remove();
  try {
    view.document.open();
    view.document.write(html);
    view.document.close();
    await waitForPrintContent(view);
    view.addEventListener('afterprint', () => setTimeout(remove), { once: true });
    view.focus();
    view.print();
    // Browsers whose print() returns before the dialog closes still remove it.
    setTimeout(remove, 60_000);
  } catch (error) {
    remove();
    throw error;
  }
}

async function printPopupWhenReady(popup: Window) {
  await waitForPrintContent(popup);
  if (popup.closed) {
    return;
  }

  popup.focus();
  popup.addEventListener('afterprint', () => popup.close(), { once: true });
  popup.print();
}

function getAcceptedExtensions(
  filters?: { extensions: string[] }[]
): string {
  const extensions = filters?.flatMap((filter) => filter.extensions) ?? [];
  return extensions.length
    ? extensions.map((extension) => `.${extension}`).join(',')
    : '*/*';
}

async function waitForPrintContent(popup: Window) {
  const images = Array.from(popup.document.images).filter(
    (image) => !image.complete
  );
  const imageReady = Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
  const fontsReady = popup.document.fonts?.ready ?? Promise.resolve();

  await Promise.race([
    Promise.all([imageReady, fontsReady]),
    new Promise<void>((resolve) => window.setTimeout(resolve, 3_000)),
  ]);
  await new Promise<void>((resolve) => window.setTimeout(resolve));
}
