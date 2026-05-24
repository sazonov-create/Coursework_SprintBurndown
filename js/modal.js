// modal.js — Работа с модальными окнами

/**
 * Открывает модальное окно по ID
 * @param {string} id
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

/**
 * Закрывает модальное окно по ID
 * @param {string} id
 */
export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

/**
 * Инициализирует все кнопки закрытия модалок
 */
export function initModalCloseButtons() {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) closeModal(modalId);
    });
  });

  // Закрытие по клику на оверлей
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}
