import { navigate, getState } from '../main.js';
import { createThemeToggleBtn } from '../utils/theme.js';

/**
 * Landing Page — Hero with drag & drop upload
 */
export function renderLanding(app) {
  const container = document.createElement('div');
  container.className = 'landing';
  container.innerHTML = `
    <nav class="landing-nav glass" id="landing-nav">
      <div class="landing-nav-brand">
        <div class="logo-icon" id="logo-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="1" width="18" height="24" rx="2" fill="var(--primary-container)" opacity="0.15"/>
            <rect x="5" y="3" width="18" height="24" rx="2" fill="var(--primary-container)"/>
            <path d="M10 12H18M10 16H16M10 20H14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M17 3V8.5C17 8.78 17.22 9 17.5 9H23" stroke="var(--primary-fixed-dim)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <span class="logo-text">PDF Edit</span>
      </div>
      <div id="landing-nav-actions"></div>
    </nav>

    <main class="landing-hero">
      <div class="hero-content animate-fade-in">
        <div class="hero-badge">
          <span class="material-symbols-outlined">verified_user</span>
          100% Client-Side — Your files never leave your browser
        </div>
        <h1 class="hero-title">PDF Edit</h1>
        <p class="hero-subtitle">
          High-precision, client-side PDF processing. Edit, sign, merge and fill forms — 
          entirely in your browser with total privacy by design.
        </p>
        
        <div class="upload-zone" id="upload-zone">
          <div class="upload-zone-inner" id="upload-zone-inner">
            <div class="upload-icon">
              <span class="material-symbols-outlined">upload_file</span>
            </div>
            <p class="upload-text">Drop your PDF here</p>
            <p class="upload-hint">Supports multi-page documents up to 100MB</p>
            <label class="btn-primary upload-btn" for="file-input" id="upload-btn-label">
              <span class="material-symbols-outlined">folder_open</span>
              Browse Files
            </label>
            <input type="file" id="file-input" accept=".pdf,application/pdf" multiple class="sr-only" />
          </div>
        </div>
      </div>

      <section class="features-section" id="features">
        <div class="features-grid">
          <div class="feature-card animate-slide-up" style="animation-delay: 0.1s">
            <div class="feature-icon-wrap">
              <span class="material-symbols-outlined">edit_note</span>
            </div>
            <h3>Edit & Annotate</h3>
            <p>Add text, fill forms, and annotate your documents with precision tools.</p>
          </div>
          <div class="feature-card animate-slide-up" style="animation-delay: 0.2s">
            <div class="feature-icon-wrap">
              <span class="material-symbols-outlined">draw</span>
            </div>
            <h3>Sign Documents</h3>
            <p>Draw your signature or type it — we'll convert it into a natural handwriting style.</p>
          </div>
          <div class="feature-card animate-slide-up" style="animation-delay: 0.3s">
            <div class="feature-icon-wrap">
              <span class="material-symbols-outlined">dynamic_feed</span>
            </div>
            <h3>Merge & Organize</h3>
            <p>Combine multiple PDFs, add or remove pages to create the perfect document.</p>
          </div>
          <div class="feature-card animate-slide-up" style="animation-delay: 0.4s">
            <div class="feature-icon-wrap">
              <span class="material-symbols-outlined">shield</span>
            </div>
            <h3>Total Privacy</h3>
            <p>Processing happens entirely in your browser. No data is stored or transmitted to any server.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <p>PDF Edit — All processing happens locally in your browser.</p>
    </footer>
  `;

  app.appendChild(container);

  // ── Theme toggle ──
  container.querySelector('#landing-nav-actions').appendChild(createThemeToggleBtn());

  // ── Upload handling ──
  const uploadZone = container.querySelector('#upload-zone');
  const uploadZoneInner = container.querySelector('#upload-zone-inner');
  const fileInput = container.querySelector('#file-input');

  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZoneInner.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZoneInner.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZoneInner.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length) handleFiles(files);
  });
}

async function handleFiles(files) {
  const fileList = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
  if (!fileList.length) return;

  const buffers = [];
  const names = [];
  for (const file of fileList) {
    const buffer = await file.arrayBuffer();
    buffers.push(buffer);
    names.push(file.name);
  }

  if (buffers.length === 1) {
    navigate('editor', { pdfBuffers: buffers, pdfFileNames: names, pdfAnnotations: [[]], activePdfIndex: 0 });
  } else {
    navigate('merge', { pdfBuffers: buffers, pdfFileNames: names, pdfAnnotations: names.map(() => []) });
  }
}
