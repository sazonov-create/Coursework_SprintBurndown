// storage.js — Работа с localStorage

const STORAGE_KEY = 'sprintburndown_state';

/**
 * Сохраняет весь стейт приложения в localStorage
 * @param {Object} state
 */
export function saveState(state) {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('[Storage] Ошибка сохранения:', error);
    throw error;
  }
}

/**
 * Загружает стейт из localStorage
 * @returns {Object|null}
 */
export function loadState() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('[Storage] Ошибка загрузки:', error);
    return null;
  }
}

/**
 * Очищает localStorage
 */
export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Storage] Ошибка очистки:', error);
  }
}
