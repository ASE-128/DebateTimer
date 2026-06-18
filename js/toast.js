function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'i'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  }

  return toast;
}

function showConfirm(title, message, onConfirm, onCancel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box">
      <h2>${title}</h2>
      <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">${message}</p>
      <div class="modal-actions">
        <button class="primary" id="confirmBtn">确认</button>
        <button id="cancelBtn">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => backdrop.classList.add('active'));

  const confirmBtn = backdrop.querySelector('#confirmBtn');
  const cancelBtn = backdrop.querySelector('#cancelBtn');

  function close() {
    backdrop.classList.remove('active');
    setTimeout(() => backdrop.remove(), 300);
  }

  confirmBtn.addEventListener('click', () => {
    close();
    if (onConfirm) onConfirm();
  });

  cancelBtn.addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      close();
      if (onCancel) onCancel();
    }
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', escHandler);
      close();
      if (onCancel) onCancel();
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast, showConfirm };
}
