import { navigate, getState } from '../main.js';
import { loadPdf, addTextAnnotation, addSignatureImage, addBlankPage, deletePage, exportPdf, downloadPdf, getFormFields, fillFormField } from '../utils/pdfEngine.js';
import { loadPdfForRendering, renderPage, renderThumbnail, extractFormFieldPositions } from '../utils/pdfRenderer.js';
import { openSignatureModal } from './signature.js';
import { createThemeToggleBtn } from '../utils/theme.js';

const TEXT_FONTS = [
  { label: 'Sans', value: "'Inter', sans-serif" },
  { label: 'Serif', value: "'Georgia', 'Times New Roman', serif" },
  { label: 'Mono', value: "'SF Mono', 'Fira Code', 'Courier New', monospace" },
];

const TEXT_COLORS = [
  { label: 'Black', value: '#191c1e', rgb: { r: 0.098, g: 0.11, b: 0.118 } },
  { label: 'Blue', value: '#115cb9', rgb: { r: 0.067, g: 0.36, b: 0.725 } },
  { label: 'Red', value: '#ba1a1a', rgb: { r: 0.73, g: 0.1, b: 0.1 } },
  { label: 'Green', value: '#2e7d32', rgb: { r: 0.18, g: 0.49, b: 0.196 } },
  { label: 'Orange', value: '#e65100', rgb: { r: 0.9, g: 0.318, b: 0 } },
  { label: 'Purple', value: '#6a1b9a', rgb: { r: 0.416, g: 0.106, b: 0.604 } },
];

let editorState = {
  pdfLibDoc: null,
  pdfJsDoc: null,
  totalPages: 0,
  scale: 1.5,
  activeTool: 'cursor',
  annotations: [],
  originalBuffer: null,
  fileName: 'document.pdf',
};

export async function renderEditor(app) {
  const state = getState();
  const buffer = state.pdfBuffers[state.activePdfIndex];
  editorState.originalBuffer = buffer.slice(0);
  editorState.fileName = state.pdfFileNames[state.activePdfIndex] || 'document.pdf';
  editorState.annotations = (state.pdfAnnotations && state.pdfAnnotations[state.activePdfIndex]) || [];
  editorState.activeTool = 'cursor';

  const container = document.createElement('div');
  container.className = 'editor';
  container.dataset.activeTool = 'cursor';
  container.innerHTML = `
    <nav class="editor-topbar glass" id="editor-topbar">
      <div class="topbar-left">
        <button class="btn-icon" id="btn-back" title="Back to Home">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="topbar-brand">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="5" y="3" width="18" height="24" rx="2" fill="var(--primary-container)"/>
            <path d="M10 12H18M10 16H16M10 20H14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="topbar-filename" id="topbar-filename">${editorState.fileName}</span>
        </div>
      </div>

      <div class="topbar-tools" id="topbar-tools">
        <div class="tool-group">
          <button class="btn-icon tool-btn active" data-tool="cursor" title="Select (V)">
            <span class="material-symbols-outlined">arrow_selector_tool</span>
          </button>
          <button class="btn-icon tool-btn" data-tool="text" title="Add Text (T)">
            <span class="material-symbols-outlined">title</span>
          </button>
        </div>
        <div class="tool-divider"></div>
        <div class="tool-group">
          <button class="btn-icon tool-btn" data-tool="sign" title="Sign Document (S)">
            <span class="material-symbols-outlined">draw</span>
          </button>
        </div>
        <div class="tool-divider"></div>
        <div class="tool-group">
          <button class="btn-icon" id="btn-add-page" title="Add Page">
            <span class="material-symbols-outlined">note_add</span>
          </button>
          <button class="btn-icon" id="btn-delete-page" title="Delete Current Page">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div class="topbar-right" id="topbar-right">
        <button class="btn-secondary" id="btn-merge-nav" title="Merge PDFs">
          <span class="material-symbols-outlined">dynamic_feed</span>
          Merge
        </button>
        <div id="theme-toggle-slot"></div>
        <button class="btn-primary" id="btn-download">
          <span class="material-symbols-outlined">download</span>
          Download
        </button>
      </div>
    </nav>

    <div class="editor-body">
      <aside class="editor-sidebar" id="editor-sidebar">
        <div class="sidebar-header">
          <span class="material-symbols-outlined">filter_none</span>
          <span>Pages</span>
        </div>
        <div class="sidebar-thumbnails" id="sidebar-thumbnails">
          <div class="loading-indicator">
            <span class="material-symbols-outlined" style="animation: pulse 1.5s infinite">hourglass_top</span>
            Loading...
          </div>
        </div>
        <div class="sidebar-info" id="sidebar-info"></div>
      </aside>

      <main class="editor-canvas-area" id="editor-canvas-area">
        <div class="pages-scroll-container" id="pages-scroll-container"></div>
        <div class="zoom-bar" id="zoom-bar">
          <button class="btn-icon" id="btn-zoom-out" title="Zoom Out">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <span class="zoom-level" id="zoom-level">150%</span>
          <button class="btn-icon" id="btn-zoom-in" title="Zoom In">
            <span class="material-symbols-outlined">add</span>
          </button>
          <span class="page-count-label" id="page-count-label">${editorState.fileName}</span>
        </div>
      </main>
    </div>
  `;

  app.appendChild(container);

  // ── Theme toggle ──
  container.querySelector('#theme-toggle-slot').appendChild(createThemeToggleBtn());

  // Load PDFs
  try {
    editorState.pdfLibDoc = await loadPdf(buffer.slice(0));
    editorState.pdfJsDoc = await loadPdfForRendering(buffer.slice(0));
    editorState.totalPages = editorState.pdfJsDoc.numPages;
  } catch (err) {
    console.error('Failed to load PDF:', err);
    container.querySelector('#pages-scroll-container').innerHTML = `
      <div class="error-state">
        <span class="material-symbols-outlined" style="font-size: 48px; color: var(--error);">error</span>
        <p>Could not load PDF. The file may be corrupted or encrypted.</p>
        <button class="btn-secondary" id="btn-error-back">Go Back</button>
      </div>
    `;
    container.querySelector('#btn-error-back')?.addEventListener('click', () => navigate('landing'));
    return;
  }

  // Render ALL pages & thumbnails
  await renderAllPages(container);
  renderAllThumbnails(container);
  updateSidebarInfo(container);

  // ── Event Listeners ──
  setupEventListeners(container);
}

/**
 * Render all pages in a scrollable container
 */
async function renderAllPages(container) {
  const scrollContainer = container.querySelector('#pages-scroll-container');
  scrollContainer.innerHTML = '';

  for (let pageNum = 1; pageNum <= editorState.totalPages; pageNum++) {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'page-wrapper';
    pageWrapper.dataset.page = pageNum;

    const pageLabel = document.createElement('div');
    pageLabel.className = 'page-label';
    pageLabel.textContent = `Page ${pageNum} of ${editorState.totalPages}`;
    pageWrapper.appendChild(pageLabel);

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container';

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas';
    canvas.dataset.page = pageNum;
    canvasContainer.appendChild(canvas);

    const annotationLayer = document.createElement('div');
    annotationLayer.className = 'annotation-layer';
    annotationLayer.dataset.page = pageNum;
    canvasContainer.appendChild(annotationLayer);

    const formFieldLayer = document.createElement('div');
    formFieldLayer.className = 'form-field-layer';
    formFieldLayer.dataset.page = pageNum;
    canvasContainer.appendChild(formFieldLayer);

    pageWrapper.appendChild(canvasContainer);
    scrollContainer.appendChild(pageWrapper);

    // Render page
    try {
      const dims = await renderPage(editorState.pdfJsDoc, pageNum, canvas, editorState.scale);
      annotationLayer.style.width = dims.width + 'px';
      annotationLayer.style.height = dims.height + 'px';
      formFieldLayer.style.width = dims.width + 'px';
      formFieldLayer.style.height = dims.height + 'px';

      // Render annotations for this page
      renderPageAnnotations(annotationLayer, pageNum, dims);

      // Always render form fields
      await renderPageFormFields(formFieldLayer, pageNum, dims);

      // Setup text click handler for this page
      setupAnnotationLayerClick(annotationLayer, pageNum, container);
    } catch (err) {
      console.warn('Failed to render page', pageNum, err);
      canvasContainer.innerHTML = `<div class="error-state" style="padding: var(--space-8);">
        <span class="material-symbols-outlined" style="color: var(--error);">error</span>
        <p>Could not render page ${pageNum}</p>
      </div>`;
    }
  }

  container.querySelector('#page-count-label').textContent = `${editorState.totalPages} Pages`;
  container.querySelector('#zoom-level').textContent = `${Math.round(editorState.scale * 100)}%`;

  // Update scroll spy for sidebar highlighting
  setupScrollSpy(container);
}

function setupAnnotationLayerClick(annotationLayer, pageNum, container) {
  annotationLayer.addEventListener('click', (e) => {
    if (editorState.activeTool === 'text' && e.target === annotationLayer) {
      const rect = annotationLayer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      editorState.annotations.push({
        type: 'text',
        page: pageNum,
        x, y,
        text: 'New Text',
        fontSize: 14,
        fontFamily: TEXT_FONTS[0].value,
        color: TEXT_COLORS[0].value,
        colorRgb: TEXT_COLORS[0].rgb,
        bold: false,
        italic: false,
        underline: false,
      });

      // Re-render just this page's annotations
      const dims = { width: parseInt(annotationLayer.style.width), height: parseInt(annotationLayer.style.height) };
      renderPageAnnotations(annotationLayer, pageNum, dims);

      // Auto-focus the newly created text
      const contentEditableEls = annotationLayer.querySelectorAll('.annotation-text-content');
      if (contentEditableEls.length > 0) {
        contentEditableEls[contentEditableEls.length - 1].focus();
      }
    }
  });
}

/**
 * Render annotations for a specific page
 */
function renderPageAnnotations(layer, pageNum, dims) {
  layer.innerHTML = '';

  const pageAnnotations = editorState.annotations.filter(a => a.page === pageNum);

  pageAnnotations.forEach((ann) => {
    if (ann.type === 'text') {
      // Ensure defaults for older annotations
      if (!ann.fontFamily) ann.fontFamily = TEXT_FONTS[0].value;
      if (!ann.color) ann.color = TEXT_COLORS[0].value;
      if (!ann.colorRgb) ann.colorRgb = TEXT_COLORS[0].rgb;
      if (ann.bold === undefined) ann.bold = false;
      if (ann.italic === undefined) ann.italic = false;
      if (ann.underline === undefined) ann.underline = false;

      const wrapper = document.createElement('div');
      wrapper.className = 'annotation annotation-text-wrapper';
      wrapper.style.left = ann.x + 'px';
      wrapper.style.top = ann.y + 'px';

      const el = document.createElement('div');
      el.className = 'annotation-text-content';
      el.style.fontSize = (ann.fontSize * editorState.scale) + 'px';
      el.style.fontFamily = ann.fontFamily;
      el.style.color = ann.color;
      if (ann.bold) el.style.fontWeight = '700';
      if (ann.italic) el.style.fontStyle = 'italic';
      if (ann.underline) el.style.textDecoration = 'underline';
      el.contentEditable = true;
      el.spellcheck = false;
      el.textContent = ann.text;

      // ── Floating mini-toolbar (below the text) ──
      const toolbar = document.createElement('div');
      toolbar.className = 'ann-toolbar';
      toolbar.innerHTML = `
        <div class="ann-toolbar-row">
          <select class="ann-font-select" title="Font">
            ${TEXT_FONTS.map((f, i) => `<option value="${i}" ${ann.fontFamily === f.value ? 'selected' : ''} style="font-family:${f.value}">${f.label}</option>`).join('')}
          </select>
          <div class="ann-size-control">
            <button class="ann-size-btn" data-delta="-2" title="Decrease size">&minus;</button>
            <span class="ann-size-value">${ann.fontSize}</span>
            <button class="ann-size-btn" data-delta="2" title="Increase size">+</button>
          </div>
          <div class="ann-format-btns">
            <button class="ann-fmt-btn${ann.bold ? ' active' : ''}" data-fmt="bold" title="Bold (B)"><b>B</b></button>
            <button class="ann-fmt-btn${ann.italic ? ' active' : ''}" data-fmt="italic" title="Italic (I)"><i>I</i></button>
            <button class="ann-fmt-btn${ann.underline ? ' active' : ''}" data-fmt="underline" title="Underline (U)"><u>U</u></button>
          </div>
          <div class="ann-color-dots">
            ${TEXT_COLORS.map((c, i) => `<button class="ann-color-dot${ann.color === c.value ? ' active' : ''}" data-color-idx="${i}" style="background:${c.value}" title="${c.label}"></button>`).join('')}
          </div>
          <button class="ann-delete-btn" title="Delete">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      `;

      wrapper.appendChild(el);
      wrapper.appendChild(toolbar);

      // ── Font select ──
      toolbar.querySelector('.ann-font-select').addEventListener('change', (e) => {
        const font = TEXT_FONTS[parseInt(e.target.value)];
        ann.fontFamily = font.value;
        el.style.fontFamily = font.value;
      });

      // ── Size buttons ──
      toolbar.querySelectorAll('.ann-size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const delta = parseInt(btn.dataset.delta);
          ann.fontSize = Math.max(8, Math.min(72, ann.fontSize + delta));
          el.style.fontSize = (ann.fontSize * editorState.scale) + 'px';
          toolbar.querySelector('.ann-size-value').textContent = ann.fontSize;
        });
      });

      // ── Bold / Italic / Underline ──
      toolbar.querySelectorAll('.ann-fmt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const fmt = btn.dataset.fmt;
          ann[fmt] = !ann[fmt];
          btn.classList.toggle('active', ann[fmt]);
          if (fmt === 'bold') el.style.fontWeight = ann.bold ? '700' : '400';
          if (fmt === 'italic') el.style.fontStyle = ann.italic ? 'italic' : 'normal';
          if (fmt === 'underline') el.style.textDecoration = ann.underline ? 'underline' : 'none';
        });
      });

      // ── Color dots ──
      toolbar.querySelectorAll('.ann-color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const c = TEXT_COLORS[parseInt(dot.dataset.colorIdx)];
          ann.color = c.value;
          ann.colorRgb = c.rgb;
          el.style.color = c.value;
          toolbar.querySelectorAll('.ann-color-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
        });
      });

      // ── Delete ──
      toolbar.querySelector('.ann-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = editorState.annotations.indexOf(ann);
        if (idx !== -1) editorState.annotations.splice(idx, 1);
        renderPageAnnotations(layer, pageNum, dims);
      });

      // ── Drag with cross-page support ──
      wrapper.addEventListener('mousedown', (e) => {
        if (editorState.activeTool !== 'cursor' || e.target.closest('.ann-toolbar')) {
          return;
        }

        const rect = wrapper.getBoundingClientRect();
        const dragOffsetX = e.clientX - rect.left;
        const dragOffsetY = e.clientY - rect.top;
        wrapper.style.cursor = 'move';
        wrapper.style.zIndex = '50';
        e.preventDefault();

        const onMouseMove = (eMove) => {
          const layerRect = layer.getBoundingClientRect();
          ann.x = eMove.clientX - layerRect.left - dragOffsetX;
          ann.y = eMove.clientY - layerRect.top - dragOffsetY;
          wrapper.style.left = ann.x + 'px';
          wrapper.style.top = ann.y + 'px';
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          wrapper.style.cursor = '';
          wrapper.style.zIndex = '';

          // Check cross-page movement
          const scrollContainer = layer.closest('.pages-scroll-container');
          if (!scrollContainer) return;
          const pageWrappers = scrollContainer.querySelectorAll('.page-wrapper');
          const wrapperRect = wrapper.getBoundingClientRect();
          const annCenterY = wrapperRect.top + wrapperRect.height / 2;

          for (const pw of pageWrappers) {
            const pwRect = pw.querySelector('.canvas-container').getBoundingClientRect();
            if (annCenterY >= pwRect.top && annCenterY <= pwRect.bottom) {
              const newPage = parseInt(pw.dataset.page);
              if (newPage !== pageNum) {
                const newLayer = pw.querySelector('.annotation-layer');
                if (newLayer) {
                  const newLayerRect = newLayer.getBoundingClientRect();
                  ann.x = wrapperRect.left - newLayerRect.left;
                  ann.y = wrapperRect.top - newLayerRect.top;
                  ann.page = newPage;
                  // Re-render both layers
                  renderPageAnnotations(layer, pageNum, dims);
                  const newDims = { width: parseInt(newLayer.style.width), height: parseInt(newLayer.style.height) };
                  renderPageAnnotations(newLayer, newPage, newDims);
                }
              }
              break;
            }
          }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      el.addEventListener('input', () => {
        ann.text = el.textContent;
      });

      layer.appendChild(wrapper);
    } else if (ann.type === 'signature') {
      const el = document.createElement('div');
      el.className = 'annotation annotation-signature';
      el.style.left = ann.x + 'px';
      el.style.top = ann.y + 'px';
      el.style.width = ann.width + 'px';
      el.style.height = ann.height + 'px';

      const img = document.createElement('img');
      img.src = ann.dataUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.draggable = false;
      el.appendChild(img);

      // ── Signature Drag with cross-page support ──
      el.addEventListener('mousedown', (e) => {
        if (editorState.activeTool !== 'cursor') return;

        const rect = el.getBoundingClientRect();
        const dragOffsetX = e.clientX - rect.left;
        const dragOffsetY = e.clientY - rect.top;
        el.style.cursor = 'move';
        el.style.zIndex = '50';
        e.preventDefault();

        const onMouseMove = (eMove) => {
          const layerRect = layer.getBoundingClientRect();
          ann.x = eMove.clientX - layerRect.left - dragOffsetX;
          ann.y = eMove.clientY - layerRect.top - dragOffsetY;
          el.style.left = ann.x + 'px';
          el.style.top = ann.y + 'px';
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          el.style.cursor = '';
          el.style.zIndex = '';

          // Check cross-page movement
          const scrollContainer = layer.closest('.pages-scroll-container');
          if (!scrollContainer) return;
          const pageWrappers = scrollContainer.querySelectorAll('.page-wrapper');
          const wrapperRect = el.getBoundingClientRect();
          const annCenterY = wrapperRect.top + wrapperRect.height / 2;

          for (const pw of pageWrappers) {
            const pwRect = pw.querySelector('.canvas-container').getBoundingClientRect();
            if (annCenterY >= pwRect.top && annCenterY <= pwRect.bottom) {
              const newPage = parseInt(pw.dataset.page);
              if (newPage !== pageNum) {
                const newLayer = pw.querySelector('.annotation-layer');
                if (newLayer) {
                  const newLayerRect = newLayer.getBoundingClientRect();
                  ann.x = wrapperRect.left - newLayerRect.left;
                  ann.y = wrapperRect.top - newLayerRect.top;
                  ann.page = newPage;
                  // Re-render both layers
                  renderPageAnnotations(layer, pageNum, dims);
                  const newDims = { width: parseInt(newLayer.style.width), height: parseInt(newLayer.style.height) };
                  renderPageAnnotations(newLayer, newPage, newDims);
                }
              }
              break;
            }
          }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // ── Signature Delete ──
      const delBtn = document.createElement('button');
      delBtn.className = 'sig-delete-btn';
      delBtn.title = 'Delete';
      delBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
      el.appendChild(delBtn);

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = editorState.annotations.indexOf(ann);
        if (idx !== -1) editorState.annotations.splice(idx, 1);
        renderPageAnnotations(layer, pageNum, dims);
      });

      // ── Signature Resize ──
      const resizer = document.createElement('div');
      resizer.className = 'sig-resizer';
      resizer.title = 'Resize';
      resizer.innerHTML = '<span class="material-symbols-outlined">zoom_out_map</span>';
      el.appendChild(resizer);

      resizer.addEventListener('mousedown', (e) => {
        if (editorState.activeTool !== 'cursor') return;
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startW = ann.width;
        const startH = ann.height;
        const ratio = startW / startH;

        const onResizeMove = (eMove) => {
          // Adjust width based on mouse movement relative to the current scale
          // Since the element scales visually, we apply direct pixel math scaled by editorState.scale?
          // No, x/y movements are screen pixels, we can just apply them to width (which is container width)
          const dx = (eMove.clientX - startX) / editorState.scale;
          const newW = Math.max(40, startW + dx);
          const newH = newW / ratio;

          ann.width = newW;
          ann.height = newH;
          el.style.width = newW + 'px';
          el.style.height = newH + 'px';
        };

        const onResizeUp = () => {
          document.removeEventListener('mousemove', onResizeMove);
          document.removeEventListener('mouseup', onResizeUp);
        };

        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
      });

      layer.appendChild(el);
    }
  });
}

/**
 * Render form fields for a specific page — always active
 */
async function renderPageFormFields(layer, pageNum, dims) {
  try {
    const fields = await extractFormFieldPositions(editorState.pdfJsDoc, pageNum);
    if (!fields.length) return;

    fields.forEach(field => {
      const [x1, y1, x2, y2] = field.rect;
      const scaledX = x1 * editorState.scale;
      const scaledY = dims.height - (y2 * editorState.scale);
      const scaledW = (x2 - x1) * editorState.scale;
      const scaledH = (y2 - y1) * editorState.scale;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-field-input';
      input.placeholder = field.fieldName || 'Field';
      input.value = field.fieldValue || '';
      input.style.position = 'absolute';
      input.style.left = scaledX + 'px';
      input.style.top = scaledY + 'px';
      input.style.width = scaledW + 'px';
      input.style.height = scaledH + 'px';
      input.dataset.fieldName = field.fieldName;

      input.addEventListener('change', (e) => {
        try {
          fillFormField(editorState.pdfLibDoc, field.fieldName, e.target.value);
        } catch (err) {
          console.warn('Could not fill field:', err);
        }
      });

      layer.appendChild(input);
    });
  } catch {
    // No form fields on this page
  }
}

/**
 * Scroll spy — highlight active thumbnail based on scroll position
 */
function setupScrollSpy(container) {
  const scrollArea = container.querySelector('#editor-canvas-area');
  const thumbs = container.querySelectorAll('.thumbnail-item');

  scrollArea.addEventListener('scroll', () => {
    const pageWrappers = container.querySelectorAll('.page-wrapper');
    const scrollTop = scrollArea.scrollTop;
    const areaHeight = scrollArea.clientHeight;

    let activePage = 1;
    for (const wrapper of pageWrappers) {
      const wrapperTop = wrapper.offsetTop - scrollArea.offsetTop;
      if (scrollTop + areaHeight / 3 >= wrapperTop) {
        activePage = parseInt(wrapper.dataset.page);
      }
    }

    thumbs.forEach(t => {
      t.classList.toggle('active', parseInt(t.dataset.page) === activePage);
    });
  });
}

async function renderAllThumbnails(container) {
  const thumbContainer = container.querySelector('#sidebar-thumbnails');
  thumbContainer.innerHTML = '';

  for (let i = 1; i <= editorState.totalPages; i++) {
    const thumbWrap = document.createElement('div');
    thumbWrap.className = `thumbnail-item${i === 1 ? ' active' : ''}`;
    thumbWrap.dataset.page = i;

    const canvas = document.createElement('canvas');
    canvas.className = 'thumbnail-canvas';
    thumbWrap.appendChild(canvas);

    const label = document.createElement('span');
    label.className = 'thumbnail-label';
    label.textContent = i;
    thumbWrap.appendChild(label);

    thumbContainer.appendChild(thumbWrap);

    // Click thumbnail → scroll to page
    thumbWrap.addEventListener('click', () => {
      const target = container.querySelector(`.page-wrapper[data-page="${i}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      thumbContainer.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
      thumbWrap.classList.add('active');
    });

    try {
      await renderThumbnail(editorState.pdfJsDoc, i, canvas, 140);
    } catch (e) {
      console.warn('Thumbnail render failed for page', i);
    }
  }
}

function updateSidebarInfo(container) {
  const info = container.querySelector('#sidebar-info');
  info.innerHTML = `
    <div class="info-item">
      <span class="material-symbols-outlined">description</span>
      <span>${editorState.totalPages} Pages</span>
    </div>
  `;
}

function setupEventListeners(container) {
  // Back
  container.querySelector('#btn-back').addEventListener('click', () => {
    if (window.confirm('Are you sure you want to leave? All unsaved changes will be lost.')) {
      navigate('landing');
    }
  });

  // Tool selection (no more form tool — forms always active)
  container.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool === 'sign') {
        openSignatureModal((signatureData) => {
          placeSignature(container, signatureData);
        });
        return;
      }
      selectTool(container, tool);
    });
  });

  // Zoom
  container.querySelector('#btn-zoom-in').addEventListener('click', async () => {
    editorState.scale = Math.min(3, editorState.scale + 0.25);
    await renderAllPages(container);
  });

  container.querySelector('#btn-zoom-out').addEventListener('click', async () => {
    editorState.scale = Math.max(0.5, editorState.scale - 0.25);
    await renderAllPages(container);
  });

  // Add page
  container.querySelector('#btn-add-page').addEventListener('click', async () => {
    addBlankPage(editorState.pdfLibDoc);
    await reloadPdf(container);
  });

  // Delete page — deletes the page currently most visible in viewport
  container.querySelector('#btn-delete-page').addEventListener('click', async () => {
    if (editorState.totalPages <= 1) return;
    const activePage = getActivePageFromScroll(container);
    deletePage(editorState.pdfLibDoc, activePage - 1);
    // Remove annotations for deleted page and shift subsequent
    editorState.annotations = editorState.annotations
      .filter(a => a.page !== activePage)
      .map(a => ({ ...a, page: a.page > activePage ? a.page - 1 : a.page }));
    await reloadPdf(container);
  });

  // Download
  container.querySelector('#btn-download').addEventListener('click', async () => {
    await applyAnnotationsToPdf();
    const bytes = await exportPdf(editorState.pdfLibDoc);
    downloadPdf(bytes, editorState.fileName.replace('.pdf', '_edited.pdf'));
    // Reload to keep editing
    editorState.pdfLibDoc = await loadPdf(bytes);
  });

  // Merge navigation
  container.querySelector('#btn-merge-nav').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-merge-nav');
    btn.disabled = true;
    try {
      const bytes = await exportPdf(editorState.pdfLibDoc); // Serialize with forms, but DO NOT bake annotations
      
      const state = getState();
      state.pdfBuffers[state.activePdfIndex || 0] = bytes.buffer;
      
      if (!state.pdfAnnotations) state.pdfAnnotations = [];
      state.pdfAnnotations[state.activePdfIndex || 0] = editorState.annotations.map(a => ({
        ...a,
        pdfX: a.x / editorState.scale,
        pdfY: a.y / editorState.scale,
        pdfW: a.width ? (a.width / editorState.scale) : undefined,
        pdfH: a.height ? (a.height / editorState.scale) : undefined,
      }));
      
      navigate('merge', { 
        pdfBuffers: state.pdfBuffers, 
        pdfFileNames: state.pdfFileNames,
        pdfAnnotations: state.pdfAnnotations
      });
    } catch (err) {
      console.error('Failed to save state before navigating:', err);
      btn.disabled = false;
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return;
    if (getState().currentView !== 'editor') return;

    switch (e.key.toLowerCase()) {
      case 'v': selectTool(container, 'cursor'); break;
      case 't': selectTool(container, 'text'); break;
      case 's':
        if (!e.ctrlKey && !e.metaKey) {
          openSignatureModal((data) => placeSignature(container, data));
        }
        break;
    }
  });
}

async function reloadPdf(container) {
  const bytes = await exportPdf(editorState.pdfLibDoc);
  editorState.pdfLibDoc = await loadPdf(bytes);
  editorState.pdfJsDoc = await loadPdfForRendering(bytes);
  editorState.totalPages = editorState.pdfJsDoc.numPages;
  await renderAllPages(container);
  await renderAllThumbnails(container);
  updateSidebarInfo(container);
}

function getActivePageFromScroll(container) {
  const scrollArea = container.querySelector('#editor-canvas-area');
  const pageWrappers = container.querySelectorAll('.page-wrapper');
  const scrollTop = scrollArea.scrollTop;
  const areaHeight = scrollArea.clientHeight;

  let activePage = 1;
  for (const wrapper of pageWrappers) {
    const wrapperTop = wrapper.offsetTop - scrollArea.offsetTop;
    if (scrollTop + areaHeight / 3 >= wrapperTop) {
      activePage = parseInt(wrapper.dataset.page);
    }
  }
  return activePage;
}

function selectTool(container, tool) {
  editorState.activeTool = tool;
  container.dataset.activeTool = tool;
  container.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
}

function placeSignature(container, signatureData) {
  // Place on the currently visible page
  const activePage = getActivePageFromScroll(container);
  editorState.annotations.push({
    type: 'signature',
    page: activePage,
    x: 100,
    y: 100,
    width: signatureData.width || 200,
    height: signatureData.height || 80,
    dataUrl: signatureData.dataUrl,
    pngBytes: signatureData.pngBytes,
  });
  selectTool(container, 'cursor');

  // Re-render annotations on the active page
  const layer = container.querySelector(`.annotation-layer[data-page="${activePage}"]`);
  if (layer) {
    const dims = { width: parseInt(layer.style.width), height: parseInt(layer.style.height) };
    renderPageAnnotations(layer, activePage, dims);
  }
}

async function applyAnnotationsToPdf() {
  for (const ann of editorState.annotations) {
    if (ann.type === 'text') {
      const pdfX = ann.x / editorState.scale;
      const pdfY = ann.y / editorState.scale;
      await addTextAnnotation(editorState.pdfLibDoc, ann.page - 1, ann.text, pdfX, pdfY, ann.fontSize, ann.colorRgb || { r: 0.1, g: 0.11, b: 0.12 });
    } else if (ann.type === 'signature' && ann.pngBytes) {
      const pdfX = ann.x / editorState.scale;
      const pdfY = ann.y / editorState.scale;
      const pdfW = ann.width / editorState.scale;
      const pdfH = ann.height / editorState.scale;
      await addSignatureImage(editorState.pdfLibDoc, ann.page - 1, ann.pngBytes, pdfX, pdfY, pdfW, pdfH);
    }
  }
}
