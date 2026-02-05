(function () {
  'use strict';

  const PERSONS = ['I', 'To', 'M', 'Ta', 'JS', 'H'];
  const DAY_NAMES = ['E', 'T', 'K', 'N', 'R', 'L', 'P'];

  // Tunnid päevade kaupa: [start, end] (inclusive)
  const HOURS_BY_DAY = [
    [10, 16],  // E 10-16 (tööpäev, 9 eemaldatud)
    [10, 20],  // T 10-20
    [10, 20],  // K 10-20
    [10, 20],  // N 10-20
    [10, 20],  // R 10-20
    [10, 19],  // L 10-19
    [10, 19]   // P 10-19
  ];

  let weekStart = getWeekStartForCurrentWeek();
  let state = {}; // { "day-hour": Set(personIndex), ... }

  function getWeekStartForCurrentWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
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

  function getWeekLabel(start) {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return 'Nädal ' + getWeekNumber(start) + ' • ' + formatDate(start) + ' – ' + formatDate(end);
  }

  function getWeekNumber(d) {
    const temp = new Date(d.getTime());
    temp.setHours(0, 0, 0, 0);
    temp.setDate(temp.getDate() + 3 - (temp.getDay() + 6) % 7);
    const jan1 = new Date(temp.getFullYear(), 0, 1);
    return 1 + Math.round(((temp - jan1) / 86400000 - 3 + (jan1.getDay() + 6) % 7) / 7);
  }

  function getStorageKey() {
    return 'meeting-planner-' + weekStart.getTime();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        state = {};
        for (const key of Object.keys(parsed)) {
          state[key] = new Set(parsed[key]);
        }
        return;
      }
    } catch (_) {}
    state = {};
  }

  function saveState() {
    const out = {};
    for (const key of Object.keys(state)) {
      out[key] = Array.from(state[key]);
    }
    localStorage.setItem(getStorageKey(), JSON.stringify(out));
  }

  function cellKey(day, hour) {
    return day + '-' + hour;
  }

  function getCount(day, hour) {
    const key = cellKey(day, hour);
    return (state[key] && state[key].size) || 0;
  }

  function isSelected(day, hour, personIndex) {
    const key = cellKey(day, hour);
    return state[key] && state[key].has(personIndex);
  }

  function toggle(day, hour, personIndex) {
    const key = cellKey(day, hour);
    if (!state[key]) state[key] = new Set();
    if (state[key].has(personIndex)) {
      state[key].delete(personIndex);
    } else {
      state[key].add(personIndex);
    }
    if (state[key].size === 0) delete state[key];
    saveState();
  }

  function setRange(personIndex, slotIndexFrom, slotIndexTo, selected) {
    const timeSlots = buildTimeSlots();
    const low = Math.min(slotIndexFrom, slotIndexTo);
    const high = Math.max(slotIndexFrom, slotIndexTo);
    for (let i = low; i <= high; i++) {
      const slot = timeSlots[i];
      const key = cellKey(slot.day, slot.hour);
      if (!state[key]) state[key] = new Set();
      if (selected) state[key].add(personIndex);
      else state[key].delete(personIndex);
      if (state[key].size === 0) delete state[key];
    }
    saveState();
  }

  function isFirstSlotOfDay(slot) {
    return slot.hour === HOURS_BY_DAY[slot.day][0];
  }

  function buildTimeSlots() {
    const slots = [];
    for (let day = 0; day < 7; day++) {
      const [start, end] = HOURS_BY_DAY[day];
      for (let hour = start; hour <= end; hour++) {
        slots.push({
          day,
          hour,
          hourLabel: String(hour)
        });
      }
    }
    return slots;
  }

  function getColspan(day) {
    const [start, end] = HOURS_BY_DAY[day];
    return end - start + 1;
  }

  function greenShade(count) {
    if (count === 0) return null;
    const lightness = 95 - count * 12;
    const sat = 40 + count * 12;
    return 'hsl(120, ' + sat + '%, ' + Math.max(25, lightness) + '%)';
  }

  function renderTable() {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');
    const timeSlots = buildTimeSlots();

    let dayRow = '<tr><th class="person-col" rowspan="2">Inimene</th>';
    for (let d = 0; d < 7; d++) {
      dayRow += '<th class="day-group" colspan="' + getColspan(d) + '">' + DAY_NAMES[d] + '</th>';
    }
    dayRow += '</tr>';

    let hourRow = '<tr>';
    for (let i = 0; i < timeSlots.length; i++) {
      const dayStart = isFirstSlotOfDay(timeSlots[i]) ? ' day-start' : '';
      hourRow += '<th class="time-col' + dayStart + '" data-slot-index="' + i + '">' + timeSlots[i].hourLabel + '</th>';
    }
    hourRow += '</tr>';

    thead.innerHTML = dayRow + hourRow;

    tbody.innerHTML = PERSONS.map(function (personName, personIndex) {
      const cells = timeSlots.map(function (slot, slotIndex) {
        const count = getCount(slot.day, slot.hour);
        const sel = isSelected(slot.day, slot.hour, personIndex);
        const bg = sel ? (greenShade(count) || '') : '';
        const style = bg ? ('background-color:' + bg) : '';
        const dayStart = isFirstSlotOfDay(slot) ? ' day-start' : '';
        const cls = 'cell' + (sel ? ' selected' : '') + dayStart;
        return '<td class="' + cls + '" style="' + style + '" data-day="' + slot.day + '" data-hour="' + slot.hour + '" data-person="' + personIndex + '" data-slot-index="' + slotIndex + '">' + (sel ? '✓' : '') + '</td>';
      }).join('');
      return '<tr><td class="person-cell">' + personName + '</td>' + cells + '</tr>';
    }).join('');

    let dragState = null;

    function onDocMouseUp() {
      dragState = null;
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('mouseup', onDocMouseUp);
    }

    function onDocMouseMove(e) {
      if (!dragState) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !el.classList || !el.classList.contains('cell')) return;
      const person = parseInt(el.getAttribute('data-person'), 10);
      if (person !== dragState.personIndex) return;
      const slotIndex = parseInt(el.getAttribute('data-slot-index'), 10);
      setRange(dragState.personIndex, dragState.startSlotIndex, slotIndex, dragState.paintValue);
      renderTable();
    }

    document.querySelectorAll('#table-body .cell').forEach(function (el) {
      el.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        const day = parseInt(el.getAttribute('data-day'), 10);
        const hour = parseInt(el.getAttribute('data-hour'), 10);
        const person = parseInt(el.getAttribute('data-person'), 10);
        const slotIndex = parseInt(el.getAttribute('data-slot-index'), 10);
        const paintValue = !isSelected(day, hour, person);
        setRange(person, slotIndex, slotIndex, paintValue);
        dragState = { personIndex: person, startSlotIndex: slotIndex, paintValue: paintValue };
        document.addEventListener('mousemove', onDocMouseMove);
        document.addEventListener('mouseup', onDocMouseUp);
        renderTable();
      });
    });
  }

  function applyWeek(newStart) {
    if (!newStart) return;
    weekStart = new Date(newStart.getTime());
    weekStart.setHours(0, 0, 0, 0);
    loadState();
    document.getElementById('week-label').textContent = getWeekLabel(weekStart);
    renderTable();
  }

  function init() {
    loadState();
    document.getElementById('week-label').textContent = getWeekLabel(weekStart);

    document.getElementById('week-input').addEventListener('change', function () {
      const parsed = parseWeekInput(this.value);
      if (parsed) applyWeek(parsed);
    });
    document.getElementById('week-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const parsed = parseWeekInput(this.value);
        if (parsed) applyWeek(parsed);
      }
    });

    renderTable();
  }

  init();
})();
