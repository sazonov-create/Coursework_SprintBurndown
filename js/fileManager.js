// fileManager.js — Экспорт и импорт JSON

/**
 * Экспортирует стейт в JSON-файл
 * @param {Object} state
 */
export function exportJSON(state) {
  try {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprintburndown_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[FileManager] Ошибка экспорта:', error);
    throw error;
  }
}

/**
 * Импортирует стейт из JSON-файла
 * @param {File} file
 * @returns {Promise<Object>}
 */
export function importJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'application/json') {
      reject(new Error('Файл должен быть формата JSON'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target.result);
        if (!state.sprints || !Array.isArray(state.sprints)) {
          reject(new Error('Некорректный формат файла'));
          return;
        }
        resolve(state);
      } catch {
        reject(new Error('Ошибка парсинга JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
