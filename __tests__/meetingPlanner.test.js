const Logic = require('../logic.js');

describe('MeetingPlanner logic', function () {

  describe('cellKey', function () {
    it('tagastab day-hour stringi', function () {
      expect(Logic.cellKey(0, 10)).toBe('0-10');
      expect(Logic.cellKey(3, 20)).toBe('3-20');
    });
  });

  describe('parseWeekInput', function () {
    it('tagastab null tühja sisendi korral', function () {
      expect(Logic.parseWeekInput('')).toBeNull();
      expect(Logic.parseWeekInput('   ')).toBeNull();
      expect(Logic.parseWeekInput(null)).toBeNull();
    });

    it('parsib nädala numbri 1–53', function () {
      const r = Logic.parseWeekInput('6');
      expect(r).toBeInstanceOf(Date);
      expect(r.getDay()).toBe(1);
    });

    it('parsib kuupäeva', function () {
      const r = Logic.parseWeekInput('3.02.2025');
      expect(r).toBeInstanceOf(Date);
      expect(r.getFullYear()).toBeGreaterThanOrEqual(2025);
      expect(r.getMonth()).toBe(1);
      expect(r.getDate()).toBeGreaterThanOrEqual(1);
      expect(r.getDate()).toBeLessThanOrEqual(7);
    });
  });

  describe('formatDate', function () {
    it('vormindab kuupäeva', function () {
      const d = new Date(2025, 0, 15);
      expect(Logic.formatDate(d)).toBe('15.1.2025');
    });
  });

  describe('getWeekNumber', function () {
    it('tagastab numbri 1–53', function () {
      const d = new Date(2025, 0, 6);
      const n = Logic.getWeekNumber(d);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(53);
    });
  });

  describe('getWeekLabel', function () {
    it('sisaldab Nädal ja kuupäevi', function () {
      const start = new Date(2025, 0, 6);
      start.setHours(0, 0, 0, 0);
      const label = Logic.getWeekLabel(start);
      expect(label).toMatch(/Nädal \d+ • .* – .*/);
    });
  });

  describe('buildTimeSlots', function () {
    it('tagastab massiivi slotidest', function () {
      const slots = Logic.buildTimeSlots();
      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);
    });

    it('iga slotil on day, hour, hourLabel', function () {
      const slots = Logic.buildTimeSlots();
      expect(slots[0]).toHaveProperty('day');
      expect(slots[0]).toHaveProperty('hour');
      expect(slots[0]).toHaveProperty('hourLabel');
    });

    it('E (0) algab kell 10 ja lõpeb 16', function () {
      const slots = Logic.buildTimeSlots();
      const day0 = slots.filter(s => s.day === 0);
      expect(day0[0].hour).toBe(10);
      expect(day0[day0.length - 1].hour).toBe(16);
    });

    it('T (1) tunnid 10–20', function () {
      const slots = Logic.buildTimeSlots();
      const day1 = slots.filter(s => s.day === 1);
      expect(day1[0].hour).toBe(10);
      expect(day1[day1.length - 1].hour).toBe(20);
    });
  });

  describe('getColspan', function () {
    it('E on 7 tundi (10–16)', function () {
      expect(Logic.getColspan(0)).toBe(7);
    });
    it('T on 11 tundi (10–20)', function () {
      expect(Logic.getColspan(1)).toBe(11);
    });
    it('L on 10 tundi (10–19)', function () {
      expect(Logic.getColspan(5)).toBe(10);
    });
  });

  describe('isFirstSlotOfDay', function () {
    it('tõene esimese tunni korral', function () {
      expect(Logic.isFirstSlotOfDay({ day: 0, hour: 10 })).toBe(true);
      expect(Logic.isFirstSlotOfDay({ day: 1, hour: 10 })).toBe(true);
    });
    it('väär teise tunni korral', function () {
      expect(Logic.isFirstSlotOfDay({ day: 0, hour: 11 })).toBe(false);
    });
  });

  describe('greenShade', function () {
    it('tagastab null count 0 korral', function () {
      expect(Logic.greenShade(0)).toBeNull();
    });
    it('tagastab hsl stringi count 1–5 korral', function () {
      expect(Logic.greenShade(1)).toMatch(/^hsl\(120,/);
      expect(Logic.greenShade(5)).toMatch(/^hsl\(120,/);
    });
  });

  describe('parseStateFromJson / serializeState', function () {
    it('serialize ja parse on pöörduvad', function () {
      const state = { '0-10': new Set([0, 1]), '1-14': new Set([2]) };
      const json = Logic.serializeState(state);
      expect(json).toEqual({ '0-10': [0, 1], '1-14': [2] });
      const back = Logic.parseStateFromJson(json);
      expect(back['0-10'].has(0)).toBe(true);
      expect(back['0-10'].has(1)).toBe(true);
      expect(back['1-14'].has(2)).toBe(true);
    });
  });

  describe('getCount / isSelected', function () {
    it('getCount tagastab valijate arvu', function () {
      const state = { '0-10': new Set([0, 1]) };
      expect(Logic.getCount(state, 0, 10)).toBe(2);
      expect(Logic.getCount(state, 0, 11)).toBe(0);
    });
    it('isSelected tõene kui inimene on valinud', function () {
      const state = { '0-10': new Set([0, 1]) };
      expect(Logic.isSelected(state, 0, 10, 0)).toBe(true);
      expect(Logic.isSelected(state, 0, 10, 2)).toBe(false);
    });
  });

  describe('applyToggle', function () {
    it('lisab valiku kui puudub', function () {
      const state = {};
      const next = Logic.applyToggle(state, 0, 10, 0);
      expect(Logic.isSelected(next, 0, 10, 0)).toBe(true);
    });
    it('eemaldab valiku kui olemas', function () {
      const state = { '0-10': new Set([0]) };
      const next = Logic.applyToggle(state, 0, 10, 0);
      expect(Logic.isSelected(next, 0, 10, 0)).toBe(false);
    });
  });

  describe('applySetRange', function () {
    it('märgib vahemiku valituks', function () {
      const slots = Logic.buildTimeSlots();
      const state = {};
      const idx0 = slots.findIndex(s => s.day === 0 && s.hour === 10);
      const idx2 = slots.findIndex(s => s.day === 0 && s.hour === 12);
      const next = Logic.applySetRange(state, 0, idx0, idx2, true);
      expect(Logic.isSelected(next, 0, 10, 0)).toBe(true);
      expect(Logic.isSelected(next, 0, 11, 0)).toBe(true);
      expect(Logic.isSelected(next, 0, 12, 0)).toBe(true);
    });
  });
});
