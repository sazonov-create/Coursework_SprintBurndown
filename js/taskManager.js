// taskManager.js — CRUD операций задач

/**
 * Класс Task
 */
export class Task {
  constructor(id, title, points, status = 'todo') {
    this.id = id;
    this.title = title;
    this.points = points;
    this.status = status;
    this.createdAt = new Date().toISOString();
  }
}

/**
 * Создаёт новую задачу в спринте
 * @param {Object} sprint
 * @param {string} title
 * @param {number} points
 * @param {string} status
 * @returns {Task}
 */
export function createTask(sprint, title, points, status = 'todo') {
  if (!sprint) throw new Error('Нет активного спринта');
  if (!title || !title.trim()) throw new Error('Название задачи обязательно');

  const pts = parseInt(points, 10);
  if (isNaN(pts) || pts < 1) throw new Error('Story Points должны быть больше 0');

  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const task = new Task(id, title.trim(), pts, status);
  sprint.tasks.push(task);
  return task;
}

/**
 * Обновляет задачу
 * @param {Object} sprint
 * @param {string} id
 * @param {string} title
 * @param {number} points
 * @param {string} status
 * @returns {Task}
 */
export function updateTask(sprint, id, title, points, status) {
  const task = sprint.tasks.find(t => t.id === id);
  if (!task) throw new Error('Задача не найдена');
  if (!title || !title.trim()) throw new Error('Название задачи обязательно');

  const pts = parseInt(points, 10);
  if (isNaN(pts) || pts < 1) throw new Error('Story Points должны быть больше 0');

  task.title = title.trim();
  task.points = pts;
  task.status = status;
  return task;
}

/**
 * Удаляет задачу из спринта
 * @param {Object} sprint
 * @param {string} id
 */
export function deleteTask(sprint, id) {
  sprint.tasks = sprint.tasks.filter(t => t.id !== id);
}

/**
 * Меняет статус задачи
 * @param {Object} sprint
 * @param {string} id
 * @param {string} newStatus
 */
export function changeTaskStatus(sprint, id, newStatus) {
  const task = sprint.tasks.find(t => t.id === id);
  if (task) task.status = newStatus;
}

/**
 * Ищет задачи по заголовку
 * @param {Object} sprint
 * @param {string} query
 * @returns {Task[]}
 */
export function searchTasks(sprint, query) {
  if (!sprint) return [];
  const q = query.toLowerCase().trim();
  if (!q) return sprint.tasks;
  return sprint.tasks.filter(t => t.title.toLowerCase().includes(q));
}

/**
 * Возвращает задачи по статусу
 * @param {Object} sprint
 * @param {string} status
 * @returns {Task[]}
 */
export function getTasksByStatus(sprint, status) {
  if (!sprint) return [];
  return sprint.tasks.filter(t => t.status === status);
}
