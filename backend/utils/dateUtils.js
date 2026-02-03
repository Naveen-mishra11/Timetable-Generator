const WEEKDAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Returns a Date object for the next occurrence of the given weekday.
 * If today is the same weekday, it returns next week (not today).
 *
 * @param {string} weekday - e.g. "Monday"
 * @param {Date} [fromDate] - default: now
 */
function getNextWeekdayDate(weekday, fromDate = new Date()) {
  const target = WEEKDAY_INDEX[weekday];
  if (target === undefined) {
    throw new Error(`Invalid weekday: ${weekday}`);
  }

  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  let diff = (target - day + 7) % 7;

  // If same day, choose next week
  if (diff === 0) diff = 7;

  const next = new Date(start);
  next.setDate(start.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDate(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

module.exports = {
  getNextWeekdayDate,
  isSameDate,
};
