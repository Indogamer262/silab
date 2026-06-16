// QR Modal — view & close large QR code
let currentQRCode = '';
let currentQRName = '';

export function viewLargeQR(code, name) {
  const modal = document.getElementById('qr-modal');
  const backdrop = document.getElementById('qr-backdrop');
  const content = document.getElementById('qr-content');
  const img = document.getElementById('large-qr-img');
  const label = document.getElementById('qr-modal-label');
  const desc = document.getElementById('qr-modal-desc');

  currentQRCode = code;
  currentQRName = name;

  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
  label.textContent = code;
  desc.textContent = name;

  modal.classList.remove('hidden');
  setTimeout(() => {
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    content.classList.remove('opacity-0', 'scale-95');
    content.classList.add('opacity-100', 'scale-100');
  }, 10);
}

export function closeQRModal() {
  const modal = document.getElementById('qr-modal');
  const backdrop = document.getElementById('qr-backdrop');
  const content = document.getElementById('qr-content');

  backdrop.classList.remove('opacity-100');
  backdrop.classList.add('opacity-0');
  content.classList.remove('opacity-100', 'scale-100');
  content.classList.add('opacity-0', 'scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

export function getCurrentQR() {
  return { code: currentQRCode, name: currentQRName };
}
