import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * PDF Renderer — Rendering using pdfjs-dist
 */

export async function loadPdfForRendering(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

export async function renderPage(pdfDoc, pageNum, canvas, scale = 1.5) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = viewport.width + 'px';
  canvas.style.height = viewport.height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  return { width: viewport.width, height: viewport.height, scale };
}

export async function renderThumbnail(pdfDoc, pageNum, canvas, maxWidth = 160) {
  const page = await pdfDoc.getPage(pageNum);
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;
}

export async function getPageDimensions(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  return { width: viewport.width, height: viewport.height };
}

export async function extractFormFieldPositions(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const annotations = await page.getAnnotations({ intent: 'display' });

  return annotations
    .filter(ann => ann.subtype === 'Widget')
    .map(ann => ({
      id: ann.id,
      fieldName: ann.fieldName,
      fieldType: ann.fieldType,
      rect: ann.rect,
      fieldValue: ann.fieldValue || '',
    }));
}
