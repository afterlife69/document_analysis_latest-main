// src/utils/pdfProcessing.js
import { PDFExtract } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();

// Extract text from a PDF buffer
export async function extractTextFromBuffer(buffer) {
  const options = {}; // Default options; customize if needed
  const data = await pdfExtract.extractBuffer(buffer, options);
  // Combine text from all pages
  const text = data.pages
    .map(page => page.content.map(item => item.str).join(' '))
    .join('\n');
  return text;
}
