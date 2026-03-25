import { navigate, getState } from '../main.js';
import { mergePdfs, exportPdf, downloadPdf, loadPdf } from '../utils/pdfEngine.js';
import { loadPdfForRendering, renderThumbnail } from '../utils/pdfRenderer.js';
import { PDFDocument } from 'pdf-lib';

/**
 * Merge View — Combine multiple PDFs
 */
export function renderMerge(app) {
  const state = getState();
  const files = state.pdfBuffers.map((buf, i) => ({
    buffer: buf,
    name: state.pdfFileNames[i] || `Document ${i + 1}.pdf`,
    annotations: state.pdfAnnotations?.[i] || [],
    size: buf.byteLength,
    pageCount: null,
  }));

  const container = document.createElement('div');
  container.className = 'merge-view';
  container.innerHTML = `
    <nav class="editor-topbar glass" id="merge-topbar">
      <div class="topbar-left">
        <button class="btn-icon" id="merge-btn-back" title="Back">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="topbar-brand">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="5" y="3" width="18" height="24" rx="2" fill="var(--primary-container)"/>
            <path d="M10 12H18M10 16H16M10 20H14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="topbar-filename">Merge Documents</span>
        </div>
      </div>
      <div class="topbar-right">
      </div>
    </nav>

    <div class="merge-body">
      <div class="merge-container">
        <div class="merge-header">
          <div class="merge-header-icon">
            <span class="material-symbols-outlined">dynamic_feed</span>
          </div>
          <h1 class="merge-title">Merge & Combine Documents</h1>
          <p class="merge-subtitle">Arrange your files in the preferred order before merging them into a single PDF.</p>
        </div>

        <div class="merge-file-list" id="merge-file-list"></div>

        <div class="merge-drop-zone" id="merge-drop-zone">
          <span class="material-symbols-outlined">add_circle_outline</span>
          <div>
            <p class="merge-drop-text">Drag and drop more files here</p>
            <p class="merge-drop-hint">or <label class="merge-browse-link" for="merge-file-input">browse files</label> from your computer</p>
          </div>
          <input type="file" id="merge-file-input" accept=".pdf,application/pdf" multiple class="sr-only" />
        </div>

        <div class="merge-status" id="merge-status">
          <span class="material-symbols-outlined">info</span>
          <span>Ready to merge</span>
          <span class="merge-status-detail" id="merge-status-detail"></span>
        </div>

        <div class="merge-actions" style="margin-top: var(--space-8); text-align: center; display: flex; justify-content: center;">
          <button class="btn-primary" id="btn-merge-execute" ${files.length < 2 ? 'disabled' : ''} style="padding: 18px 36px; font-size: 18px; width: 100%; max-width: 400px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 8px 24px rgba(17, 92, 185, 0.3); border-radius: var(--radius-lg);">
            <span class="material-symbols-outlined" style="font-size: 24px;">merge</span>
            Merge & Download
          </button>
        </div>
      </div>
    </div>
  `;

  app.appendChild(container);

  // Render file list
  renderFileList(container, files);
  updateStatus(container, files);

  // Removed one-off thumbnail setup, renderFileList handles it now.

  // Back
  container.querySelector('#merge-btn-back').addEventListener('click', () => {
    if (files.length === 1) {
      navigate('editor', { pdfBuffers: [files[0].buffer], pdfFileNames: [files[0].name], activePdfIndex: 0 });
    } else {
      if (window.confirm('Are you sure you want to leave? All your unsaved changes will be lost.')) {
        navigate('landing');
      }
    }
  });

  // Add more files
  const dropZone = container.querySelector('#merge-drop-zone');
  const mergeFileInput = container.querySelector('#merge-file-input');

  mergeFileInput.addEventListener('change', async (e) => {
    await addFiles(Array.from(e.target.files), container, files);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    await addFiles(newFiles, container, files);
  });

  // Merge
  container.querySelector('#btn-merge-execute').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-merge-execute');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" style="animation: pulse 1s infinite">hourglass_top</span> Merging...';

    try {
      const { addTextAnnotation, addSignatureImage } = await import('../utils/pdfEngine.js');
      
      const bakedBuffers = [];
      for (const file of files) {
        if (file.annotations && file.annotations.length > 0) {
          const doc = await PDFDocument.load(file.buffer);
          for (const ann of file.annotations) {
            if (ann.type === 'text') {
              await addTextAnnotation(doc, ann.page - 1, ann.text, ann.pdfX, ann.pdfY, ann.fontSize, ann.colorRgb || { r: 0.1, g: 0.11, b: 0.12 });
            } else if (ann.type === 'signature' && ann.pngBytes) {
              await addSignatureImage(doc, ann.page - 1, ann.pngBytes, ann.pdfX, ann.pdfY, ann.pdfW, ann.pdfH);
            }
          }
          const bytes = await doc.save();
          bakedBuffers.push(bytes.buffer);
        } else {
          bakedBuffers.push(file.buffer);
        }
      }

      const mergedPdf = await mergePdfs(bakedBuffers);
      const bytes = await exportPdf(mergedPdf);
      downloadPdf(bytes, 'merged_document.pdf');
      btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Done!';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">merge</span> Merge & Download';
      }, 2000);
    } catch (err) {
      console.error('Merge failed:', err);
      btn.innerHTML = '<span class="material-symbols-outlined">error</span> Failed';
      btn.disabled = false;
    }
  });
}

function renderFileList(container, files) {
  const list = container.querySelector('#merge-file-list');
  list.innerHTML = '';

  files.forEach((file, idx) => {
    const card = document.createElement('div');
    card.className = 'merge-file-card animate-fade-in';
    card.dataset.fileIdx = idx;
    card.draggable = true;

    const sizeStr = formatFileSize(file.size);

    card.innerHTML = `
      <div class="file-drag-handle">
        <span class="material-symbols-outlined">drag_indicator</span>
      </div>
      <div class="file-thumb">
        <canvas class="file-thumb-canvas" width="48" height="64"></canvas>
      </div>
      <div class="file-info">
        <h4 class="file-name">${file.name}</h4>
        <p class="file-meta">
          <span class="file-size">${sizeStr}</span>
          <span class="file-meta-dot">•</span>
          <span class="file-pages">${file.pageCount ? file.pageCount + ' Pages' : 'Loading...'}</span>
        </p>
      </div>
      <div class="file-actions">
        <button class="btn-icon file-edit-btn" data-idx="${idx}" title="Open in Editor">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn-icon file-move-up" data-idx="${idx}" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
          <span class="material-symbols-outlined">arrow_upward</span>
        </button>
        <button class="btn-icon file-move-down" data-idx="${idx}" title="Move Down" ${idx === files.length - 1 ? 'disabled' : ''}>
          <span class="material-symbols-outlined">arrow_downward</span>
        </button>
        <button class="btn-icon file-remove-btn" data-idx="${idx}" title="Remove">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    `;

    list.appendChild(card);

    // Cache and render thumbnail
    const canvas = card.querySelector('.file-thumb-canvas');
    if (!file.pdfDoc) {
      loadPdfForRendering(file.buffer.slice(0)).then(doc => {
        file.pdfDoc = doc;
        file.pageCount = doc.numPages;
        card.querySelector('.file-pages').textContent = `${file.pageCount} Pages`;
        updateStatus(container, files);
        renderThumbnail(doc, 1, canvas, 60);
      }).catch(e => console.warn('Thumbnail err:', e));
    } else {
      renderThumbnail(file.pdfDoc, 1, canvas, 60).catch(e => console.warn(e));
    }
  });

  // Event listeners
  list.querySelectorAll('.file-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const state = getState();
      navigate('editor', {
        pdfBuffers: files.map(f => f.buffer),
        pdfFileNames: files.map(f => f.name),
        pdfAnnotations: files.map(f => f.annotations),
        activePdfIndex: idx,
      });
    });
  });

  list.querySelectorAll('.file-move-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (idx > 0) {
        [files[idx], files[idx - 1]] = [files[idx - 1], files[idx]];
        renderFileList(container, files);
        updateStatus(container, files);
      }
    });
  });

  list.querySelectorAll('.file-move-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (idx < files.length - 1) {
        [files[idx], files[idx + 1]] = [files[idx + 1], files[idx]];
        renderFileList(container, files);
        updateStatus(container, files);
      }
    });
  });

  list.querySelectorAll('.file-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      files.splice(idx, 1);
      renderFileList(container, files);
      updateStatus(container, files);
      // Update merge button
      container.querySelector('#btn-merge-execute').disabled = files.length < 2;
    });
  });

  // Drag & drop reorder
  let dragIdx = null;
  list.querySelectorAll('.merge-file-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      dragIdx = parseInt(card.dataset.fileIdx);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragIdx = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-target');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-target');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-target');
      const dropIdx = parseInt(card.dataset.fileIdx);
      if (dragIdx !== null && dragIdx !== dropIdx) {
        const [item] = files.splice(dragIdx, 1);
        files.splice(dropIdx, 0, item);
        renderFileList(container, files);
        updateStatus(container, files);
      }
    });
  });
}

async function addFiles(newFiles, container, files) {
  for (const file of newFiles) {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) continue;
    const buffer = await file.arrayBuffer();
    const newEntry = {
      buffer,
      name: file.name,
      annotations: [],
      size: buffer.byteLength,
      pageCount: null,
    };
    files.push(newEntry);

  }

  renderFileList(container, files);
  updateStatus(container, files);
  container.querySelector('#btn-merge-execute').disabled = files.length < 2;
}

function updateStatus(container, files) {
  const detail = container.querySelector('#merge-status-detail');
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);
  detail.textContent = `${files.length} Files • ${formatFileSize(totalSize)}${totalPages ? ` • ${totalPages} Pages` : ''}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
