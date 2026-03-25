import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * PDF Engine — Core manipulation using pdf-lib
 * All operations are 100% client-side.
 */

export async function loadPdf(arrayBuffer) {
  return await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
}

export async function createBlankPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  return pdf;
}

export async function addTextAnnotation(pdfDoc, pageIndex, text, x, y, fontSize = 12, color = { r: 0.1, g: 0.11, b: 0.12 }) {
  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageHeight = page.getHeight();

  page.drawText(text, {
    x: x,
    y: pageHeight - y - fontSize,
    size: fontSize,
    font: font,
    color: rgb(color.r, color.g, color.b),
  });
}

export async function addSignatureImage(pdfDoc, pageIndex, pngImageBytes, x, y, width, height) {
  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];
  const pageHeight = page.getHeight();
  const pngImage = await pdfDoc.embedPng(pngImageBytes);

  page.drawImage(pngImage, {
    x: x,
    y: pageHeight - y - height,
    width: width,
    height: height,
  });
}

export function addBlankPage(pdfDoc, width = 595.28, height = 841.89) {
  pdfDoc.addPage([width, height]);
  return pdfDoc.getPageCount();
}

export function deletePage(pdfDoc, pageIndex) {
  pdfDoc.removePage(pageIndex);
  return pdfDoc.getPageCount();
}

export async function mergePdfs(pdfBuffers) {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf;
}

export function getFormFields(pdfDoc) {
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name,
    }));
  } catch {
    return [];
  }
}

export function fillFormField(pdfDoc, fieldName, value) {
  try {
    const form = pdfDoc.getForm();
    const field = form.getTextField(fieldName);
    if (field) {
      field.setText(value);
    }
  } catch (e) {
    console.warn('Could not fill form field:', fieldName, e);
  }
}

export async function exportPdf(pdfDoc) {
  return await pdfDoc.save();
}

export function downloadPdf(bytes, filename = 'document.pdf') {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
