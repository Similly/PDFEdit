import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function run() {
  const p1 = await PDFDocument.create();
  p1.addPage();
  const p2 = await PDFDocument.create();
  p2.addPage();
  
  const b1 = await p1.save();
  const b2 = await p2.save();
  
  const merged = await PDFDocument.create();
  
  for (const b of [b1, b2]) {
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    const copied = await merged.copyPages(pdf, pdf.getPageIndices());
    copied.forEach(p => merged.addPage(p));
  }
  
  const final = await merged.save();
  console.log('Merged size:', final.byteLength);
}

run().catch(console.error);
