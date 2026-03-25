/**
 * Signature Modal — Draw or type a signature
 */

let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;
let activeTab = 'draw';

const SIG_COLORS = [
  { label: 'Black', value: '#191c1e' },
  { label: 'Blue', value: '#115cb9' },
  { label: 'Red', value: '#ba1a1a' },
];

export function openSignatureModal(onApply) {
  // Reset tab state
  activeTab = 'draw';
  isDrawing = false;
  
  // Remove existing modal
  document.querySelector('.signature-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'signature-modal-overlay';
  overlay.innerHTML = `
    <div class="signature-modal glass animate-scale-in">
      <div class="sig-modal-header">
        <h2>Add Signature</h2>
        <button class="btn-icon" id="sig-close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="sig-tabs">
        <button class="sig-tab active" data-tab="draw">
          <span class="material-symbols-outlined">draw</span>
          Draw
        </button>
        <button class="sig-tab" data-tab="type">
          <span class="material-symbols-outlined">keyboard</span>
          Type
        </button>
      </div>

      <div class="sig-content">
        <div class="sig-draw-area" id="sig-draw-area">
          <canvas id="sig-canvas" width="540" height="180"></canvas>
          <p class="sig-draw-hint">Draw your signature above</p>
        </div>
        <div class="sig-type-area hidden" id="sig-type-area">
          <input type="text" class="sig-type-input" id="sig-type-input" placeholder="Type your full name" autocomplete="off" />
          <div class="sig-type-preview" id="sig-type-preview">
            <span class="sig-preview-text" id="sig-preview-text"></span>
          </div>
          <div class="sig-font-options" id="sig-font-options">
            <button class="sig-font-btn active" data-prefix="" data-font="'Dancing Script', cursive" style="font-family: 'Dancing Script', cursive">Script</button>
            <button class="sig-font-btn" data-prefix="" data-font="'Brush Script MT', cursive" style="font-family: 'Brush Script MT', cursive; font-size: 16px;">Brush</button>
            <button class="sig-font-btn" data-prefix="italic 600 " data-font="'Inter', sans-serif" style="font-family: Inter; font-style: italic; font-weight: 600">Italic</button>
          </div>
        </div>
      </div>

      <div class="sig-actions">
        <div class="sig-actions-left" style="display:flex; align-items:center; gap:16px;">
          <button class="btn-ghost" id="sig-clear">
            <span class="material-symbols-outlined">delete</span>
            Clear
          </button>
          <div class="sig-color-picker" id="sig-color-picker" style="display:flex; align-items:center; gap:6px;">
            ${SIG_COLORS.map((c, i) => `<button class="ann-color-dot${i===0?' active':''}" data-color="${c.value}" style="background:${c.value}; width:20px; height:20px;" title="${c.label}"></button>`).join('')}
          </div>
        </div>
        <div class="sig-actions-right">
          <button class="btn-secondary" id="sig-cancel">Cancel</button>
          <button class="btn-primary" id="sig-apply">
            <span class="material-symbols-outlined">check</span>
            Apply Signature
          </button>
        </div>
      </div>

      <p class="sig-legal">By clicking "Apply Signature", I agree that this signature is as legally binding as a handwritten one.</p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Setup drawing canvas
  signatureCanvas = overlay.querySelector('#sig-canvas');
  signatureCtx = signatureCanvas.getContext('2d');
  signatureCtx.strokeStyle = SIG_COLORS[0].value;
  signatureCtx.lineWidth = 2.5;
  signatureCtx.lineCap = 'round';
  signatureCtx.lineJoin = 'round';

  let selectedFont = "'Dancing Script', cursive";
  let selectedFontPrefix = "";
  let selectedColor = SIG_COLORS[0].value;

  // Drawing events
  signatureCanvas.addEventListener('mousedown', startDraw);
  signatureCanvas.addEventListener('mousemove', draw);
  signatureCanvas.addEventListener('mouseup', stopDraw);
  signatureCanvas.addEventListener('mouseleave', stopDraw);

  // Touch support
  signatureCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = signatureCanvas.getBoundingClientRect();
    startDraw({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
  });
  signatureCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = signatureCanvas.getBoundingClientRect();
    draw({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
  });
  signatureCanvas.addEventListener('touchend', stopDraw);

  // Tabs
  overlay.querySelectorAll('.sig-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      overlay.querySelectorAll('.sig-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      overlay.querySelector('#sig-draw-area').classList.toggle('hidden', activeTab !== 'draw');
      overlay.querySelector('#sig-type-area').classList.toggle('hidden', activeTab !== 'type');
      if (activeTab === 'type') {
        const input = overlay.querySelector('#sig-type-input');
        input.focus();
      }
    });
  });

  // Type input
  const typeInput = overlay.querySelector('#sig-type-input');
  const previewText = overlay.querySelector('#sig-preview-text');
  typeInput.addEventListener('input', () => {
    previewText.textContent = typeInput.value;
    previewText.style.font = `${selectedFontPrefix}32px ${selectedFont}`;
  });

  // Font options
  overlay.querySelectorAll('.sig-font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFont = btn.dataset.font;
      selectedFontPrefix = btn.dataset.prefix || "";
      overlay.querySelectorAll('.sig-font-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      previewText.style.font = `${selectedFontPrefix}32px ${selectedFont}`;
    });
  });

  // Color options
  overlay.querySelectorAll('.sig-color-picker .ann-color-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      overlay.querySelectorAll('.sig-color-picker .ann-color-dot').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      signatureCtx.strokeStyle = selectedColor;
      previewText.style.color = selectedColor;
      // Recolor existing strokes
      const ctx = signatureCanvas.getContext('2d');
      ctx.save();
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      ctx.restore();
    });
  });

  // Clear
  overlay.querySelector('#sig-clear').addEventListener('click', () => {
    if (activeTab === 'draw') {
      signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    } else {
      typeInput.value = '';
      previewText.textContent = '';
    }
  });

  // Cancel
  const closeModal = () => overlay.remove();
  overlay.querySelector('#sig-cancel').addEventListener('click', closeModal);
  overlay.querySelector('#sig-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Apply
  overlay.querySelector('#sig-apply').addEventListener('click', () => {
    let dataUrl, pngBytes, width, height;

    if (activeTab === 'draw') {
      // Crop to signature bounds
      const cropped = getCroppedCanvas(signatureCanvas);
      if (!cropped) return;
      dataUrl = cropped.toDataURL('image/png');
      width = Math.min(cropped.width, 200);
      height = Math.min(cropped.height, 80);
      cropped.toBlob(blob => {
        blob.arrayBuffer().then(buf => {
          onApply({ dataUrl, pngBytes: new Uint8Array(buf), width, height });
        });
      }, 'image/png');
    } else {
      // Render typed text to canvas
      const text = typeInput.value.trim();
      if (!text) return;
      const tmpCanvas = document.createElement('canvas');
      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCanvas.width = 400;
      tmpCanvas.height = 120;
      tmpCtx.font = `${selectedFontPrefix}40px ${selectedFont}`;
      tmpCtx.fillStyle = selectedColor;
      tmpCtx.textBaseline = 'middle';
      tmpCtx.fillText(text, 10, 60);

      const cropped = getCroppedCanvas(tmpCanvas);
      if (!cropped) return;
      dataUrl = cropped.toDataURL('image/png');
      width = Math.min(cropped.width, 200);
      height = Math.min(cropped.height, 80);
      cropped.toBlob(blob => {
        blob.arrayBuffer().then(buf => {
          onApply({ dataUrl, pngBytes: new Uint8Array(buf), width, height });
        });
      }, 'image/png');
    }

    closeModal();
  });
}

function startDraw(e) {
  isDrawing = true;
  signatureCtx.beginPath();
  signatureCtx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
  if (!isDrawing) return;
  signatureCtx.lineTo(e.offsetX, e.offsetY);
  signatureCtx.stroke();
}

function stopDraw() {
  isDrawing = false;
}

function getCroppedCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        hasContent = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasContent) return null;

  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return croppedCanvas;
}
