// sprintManager.js — CRUD операций спринтов

/**
 * Класс Sprint
 */
export class Sprint {
  constructor(id, name, startDate, endDate) {
    this.id = id;
    this.name = name;
    this.startDate = startDate;
    this.endDate = endDate;
    this.tasks = [];
    this.snapshots = [];
  }
}

/**
 * Класс Snapshot — фиксация остатка SP на дату
 */
export class Snapshot {
  constructor(date, remainingPoints) {
    this.date = date;
    this.remainingPoints = remainingPoints;
  }
}

/**
 * Создаёт новый спринт
 * @param {Sprint[]} sprints
 * @param {string} name
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Sprint}
 */
export function createSprint(sprints, name, startDate, endDate) {
  if (!name || !name.trim()) throw new Error('Название спринта обязательно');
  if (!startDate || !endDate) throw new Error('Укажите даты спринта');
  if (new Date(startDate) >= new Date(endDate)) throw new Error('Дата начала должна быть раньше даты окончания');

  const id = `sprint_${Date.now()}`;
  const sprint = new Sprint(id, name.trim(), startDate, endDate);
  sprints.push(sprint);
  return sprint;
}

/**
 * Обновляет существующий спринт
 * @param {Sprint[]} sprints
 * @param {string} id
 * @param {string} name
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Sprint}
 */
export function updateSprint(sprints, id, name, startDate, endDate) {
  const sprint = sprints.find(s => s.id === id);
  if (!sprint) throw new Error('Спринт не найден');
  if (!name || !name.trim()) throw new Error('Название спринта обязательно');
  if (!startDate || !endDate) throw new Error('Укажите даты спринта');
  if (new Date(startDate) >= new Date(endDate)) throw new Error('Дата начала должна быть раньше даты окончания');

  sprint.name = name.trim();
  sprint.startDate = startDate;
  sprint.endDate = endDate;
  return sprint;
}

/**
 * Удаляет спринт по ID
 * @param {Sprint[]} sprints
 * @param {string} id
 * @returns {Sprint[]}
 */
export function deleteSprint(sprints, id) {
  return sprints.filter(s => s.id !== id);
}

/**
 * Находит спринт по ID
 * @param {Sprint[]} sprints
 * @param {string} id
 * @returns {Sprint|undefined}
 */
export function findSprint(sprints, id) {
  return sprints.find(s => s.id === id);
}

/**
 * Добавляет снапшот к спринту
 * @param {Sprint} sprint
 * @returns {Snapshot}
 */
export function addSnapshot(sprint) {
  const remainingPoints = sprint.tasks
    .filter(t => t.status !== 'done')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  const snap = new Snapshot(new Date().toISOString(), remainingPoints);
  sprint.snapshots.push(snap);
  return snap;
}
