// Inventory page — wires modules to the DOM
import { getSelection, clearSelection, toggleSelection, toggleSelectAll } from '/js/selection.js';
import { printSelectedQR } from '/js/print.js';
import { viewLargeQR, closeQRModal } from '/js/qr-modal.js';

// ---- Selection bar UI ----
function updateSelectionUI() {
  const sel = getSelection();
  const count = Object.keys(sel).length;
  const bar = document.getElementById('selection-bar');
  const badge = document.getElementById('selection-count');

  if (count > 0) {
    bar.classList.remove('hidden');
    badge.textContent = count;
  } else {
    bar.classList.add('hidden');
  }

  // Sync checkboxes with stored selection
  document.querySelectorAll('.inv-checkbox').forEach(cb => {
    cb.checked = !!sel[cb.dataset.id];
  });

  // Update select-all state
  const allBoxes = document.querySelectorAll('.inv-checkbox');
  const selectAll = document.getElementById('select-all');
  if (allBoxes.length > 0) {
    const allChecked = Array.from(allBoxes).every(cb => cb.checked);
    const someChecked = Array.from(allBoxes).some(cb => cb.checked);
    selectAll.checked = allChecked;
    selectAll.indeterminate = someChecked && !allChecked;
  }
}

// ---- Expose handlers to inline onclick attributes ----
window.toggleSelection = (checkbox) => {
  toggleSelection(checkbox.dataset.id, checkbox.dataset.qr, checkbox.dataset.name, checkbox.checked);
  updateSelectionUI();
};

window.toggleSelectAll = (masterCheckbox) => {
  const allBoxes = document.querySelectorAll('.inv-checkbox');
  toggleSelectAll(masterCheckbox.checked, allBoxes);
  updateSelectionUI();
};

window.clearSelection = () => {
  clearSelection();
  updateSelectionUI();
};

window.printSelectedQR = () => {
  const sel = getSelection();
  printSelectedQR(Object.values(sel));
};

window.viewLargeQR = viewLargeQR;
window.closeQRModal = closeQRModal;

// ---- Init ----
document.addEventListener('DOMContentLoaded', updateSelectionUI);
