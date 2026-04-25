// FarmCode - Popup Script

const DAILY_GOAL = 3;

const CROP_EMOJIS = ['🌱', '🌾', '🌽', '🍅', '🥕', '🌻', '🍓', '🥦'];

async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['farmState'], (result) => {
      resolve(result.farmState || {
        plots: Array(6).fill(null),
        totalSolved: 0,
        streak: 0,
        lastActiveDate: null,
        todaySolved: 0,
        cropsGrown: 0,
      });
    });
  });
}

function renderMiniGrid(plots) {
  const grid = document.getElementById('farmMiniGrid');
  grid.innerHTML = '';
  plots.forEach((crop) => {
    const cell = document.createElement('div');
    cell.className = `mini-plot ${crop ? 'planted' : 'empty'}`;
    if (crop) {
      cell.textContent = crop.emoji || '🌱';
      cell.removeAttribute('data-empty');
    }
    grid.appendChild(cell);
  });
}

function updateProgress(state) {
  const today = state.todaySolved || 0;
  const total = state.totalSolved || 0;
  const crops = state.cropsGrown || 0;
  const streak = state.streak || 0;

  document.getElementById('todaySolved').textContent = today;
  document.getElementById('totalSolved').textContent = total;
  document.getElementById('cropsGrown').textContent = crops;
  document.getElementById('streakCount').textContent = streak;

  const pct = Math.min((today / DAILY_GOAL) * 100, 100);
  document.getElementById('progressBarFill').style.width = `${pct}%`;
  document.getElementById('progressLabel').textContent = `${today} / ${DAILY_GOAL} daily goal`;
}

async function init() {
  const state = await loadState();
  updateProgress(state);
  renderMiniGrid(state.plots);

  document.getElementById('openFarmBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_FARM' });
    window.close();
  });

  document.getElementById('openLeetCodeBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://leetcode.com/problemset/' });
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
