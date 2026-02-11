'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'meetings.json');

app.use(express.json());
app.use(express.static(__dirname));

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function isValidMeetingId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 64;
}

app.get('/api/meetings/:id/state', function (req, res) {
  const id = req.params.id;
  const weekStart = req.query.weekStart;
  if (!isValidMeetingId(id)) {
    return res.status(400).json({ error: 'Invalid meeting ID' });
  }
  if (!weekStart || !String(weekStart).match(/^\d+$/)) {
    return res.status(400).json({ error: 'Missing or invalid weekStart' });
  }
  const store = readStore();
  const meeting = store[id] || {};
  const state = meeting[weekStart] || {};
  res.json(state);
});

app.put('/api/meetings/:id/state', function (req, res) {
  const id = req.params.id;
  const weekStart = req.query.weekStart;
  if (!isValidMeetingId(id)) {
    return res.status(400).json({ error: 'Invalid meeting ID' });
  }
  if (!weekStart || !String(weekStart).match(/^\d+$/)) {
    return res.status(400).json({ error: 'Missing or invalid weekStart' });
  }
  const state = req.body;
  if (state !== null && typeof state !== 'object') {
    return res.status(400).json({ error: 'Body must be a JSON object' });
  }
  const store = readStore();
  if (!store[id]) store[id] = {};
  store[id][weekStart] = state || {};
  writeStore(store);
  res.json(store[id][weekStart]);
});

app.listen(PORT, function () {
  console.log('MeetingPlanner server at http://localhost:' + PORT);
});
