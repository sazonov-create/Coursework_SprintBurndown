// notifications.js — Toast-уведомления

const DURATION = 3000;

/**
 * Показывает toast-уведомление
 * @param {string} message
 * @param {'success'|'error'|'info'|'warn'} type
 */
export function showNotification(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, DURATION);
}
