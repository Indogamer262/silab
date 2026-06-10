// Selection Management
const STORAGE_KEY = 'qr_selection';

export function getSelection() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveSelection(sel) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
}

export function clearSelection() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function toggleSelection(id, qrCode, name, checked) {
  const sel = getSelection();
  if (checked) {
    sel[id] = { qrCode, name };
  } else {
    delete sel[id];
  }
  saveSelection(sel);
  return sel;
}

export function toggleSelectAll(checked, checkboxes) {
  const sel = getSelection();
  checkboxes.forEach(cb => {
    if (checked) {
      sel[cb.dataset.id] = { qrCode: cb.dataset.qr, name: cb.dataset.name };
    } else {
      delete sel[cb.dataset.id];
    }
  });
  saveSelection(sel);
  return sel;
}
