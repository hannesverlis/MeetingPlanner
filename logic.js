(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else if (typeof root !== 'undefined') {
    root.MeetingPlannerLogic = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HOURS_BY_DAY = [
    [10, 16], [10, 20], [10, 20], [10, 20], [10, 20], [10, 19], [10, 19]
  ];

  function cellKey(day, hour) {
    return day + '-' + hour;
  }

  function parseWeekInput(input) {
    const s = (input || '').trim();
    if (!s) return null;
    const num = parseInt(s, 10);
    if (!isNaN(num) && num >= 1 && num <= 53) {
      const year = new Date().getFullYear();
      const jan1 = new Date(year, 0, 1);
      const firstMonday = new Date(jan1);
      const dayOfWeek = jan1.getDay();
      const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      firstMonday.setDate(jan1.getDate() + toMonday);
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (num - 1) * 7);
      return weekStart;
    }
    const dateMatch = s.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
    if (dateMatch) {
      const d = parseInt(dateMatch[1], 10);
      const m = parseInt(dateMatch[2], 10) - 1;
      const y = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
      const fullYear = y < 100 ? 2000 + y : y;
      const date = new Date(fullYear, m, d);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
      }
    }
    return null;
  }

  function formatDate(d) {
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  }

  function getWeekNumber(d) {
    const temp = new Date(d.getTime());
    temp.setHours(0, 0, 0, 0);
    temp.setDate(temp.getDate() + 3 - (temp.getDay() + 6) % 7);
    const jan1 = new Date(temp.getFullYear(), 0, 1);
    return 1 + Math.round(((temp - jan1) / 86400000 - 3 + (jan1.getDay() + 6) % 7) / 7);
  }

  function getWeekLabel(start) {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return 'Nädal ' + getWeekNumber(start) + ' • ' + formatDate(start) + ' – ' + formatDate(end);
  }

  function buildTimeSlots() {
    const slots = [];
    for (let day = 0; day < 7; day++) {
      const [start, end] = HOURS_BY_DAY[day];
      for (let hour = start; hour <= end; hour++) {
        slots.push({ day, hour, hourLabel: String(hour) });
      }
    }
    return slots;
  }

  function getColspan(day) {
    const [start, end] = HOURS_BY_DAY[day];
    return end - start + 1;
  }

  function isFirstSlotOfDay(slot) {
    return slot.hour === HOURS_BY_DAY[slot.day][0];
  }

  function greenShade(count) {
    if (count === 0) return null;
    const lightness = 95 - count * 12;
    const sat = 40 + count * 12;
    return 'hsl(120, ' + sat + '%, ' + Math.max(25, lightness) + '%)';
  }

  function parseStateFromJson(parsed) {
    const state = {};
    for (const key of Object.keys(parsed || {})) {
      state[key] = new Set(parsed[key]);
    }
    return state;
  }

  function serializeState(state) {
    const out = {};
    for (const key of Object.keys(state)) {
      out[key] = Array.from(state[key]);
    }
    return out;
  }

  function getCount(state, day, hour) {
    const key = cellKey(day, hour);
    return (state[key] && state[key].size) || 0;
  }

  function isSelected(state, day, hour, personIndex) {
    const key = cellKey(day, hour);
    return !!(state[key] && state[key].has(personIndex));
  }

  function applyToggle(state, day, hour, personIndex) {
    const next = {};
    for (const k of Object.keys(state)) next[k] = new Set(state[k]);
    const key = cellKey(day, hour);
    if (!next[key]) next[key] = new Set();
    if (next[key].has(personIndex)) next[key].delete(personIndex);
    else next[key].add(personIndex);
    if (next[key].size === 0) delete next[key];
    return next;
  }

  function applySetRange(state, personIndex, slotIndexFrom, slotIndexTo, selected) {
    const timeSlots = buildTimeSlots();
    const low = Math.min(slotIndexFrom, slotIndexTo);
    const high = Math.max(slotIndexFrom, slotIndexTo);
    const next = {};
    for (const k of Object.keys(state)) next[k] = new Set(state[k]);
    for (let i = low; i <= high; i++) {
      const slot = timeSlots[i];
      const key = cellKey(slot.day, slot.hour);
      if (!next[key]) next[key] = new Set();
      if (selected) next[key].add(personIndex);
      else next[key].delete(personIndex);
      if (next[key].size === 0) delete next[key];
    }
    return next;
  }

  return {
    HOURS_BY_DAY,
    cellKey,
    parseWeekInput,
    formatDate,
    getWeekNumber,
    getWeekLabel,
    buildTimeSlots,
    getColspan,
    isFirstSlotOfDay,
    greenShade,
    parseStateFromJson,
    serializeState,
    getCount,
    isSelected,
    applyToggle,
    applySetRange
  };
}));
