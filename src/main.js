import './index.css';
import './views/views.css';
import { renderLanding } from './views/landing.js';
import { renderEditor } from './views/editor.js';
import { renderMerge } from './views/merge.js';
import { initTheme } from './utils/theme.js';

// Apply saved / system theme before first paint
initTheme();


/**
 * App State
 */
const state = {
  currentView: 'landing',
  pdfBuffers: [],      // ArrayBuffer[] for loaded PDFs
  pdfFileNames: [],    // string[] for file names
  pdfAnnotations: [],  // Object[][] for floating annotations per file
  activePdfIndex: 0,
};

/**
 * Router — SPA navigation
 */
export function navigate(view, data = {}) {
  state.currentView = view;
  Object.assign(state, data);
  render();
}

export function getState() {
  return state;
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  switch (state.currentView) {
    case 'landing':
      renderLanding(app);
      break;
    case 'editor':
      renderEditor(app);
      break;
    case 'merge':
      renderMerge(app);
      break;
    default:
      renderLanding(app);
  }
}

// Initial render
render();
