// FarmCode — Farm Page Script

// ── Crop definitions ────────────────────────────────────

const CROPS_META = {
  strawberry: { name: 'Strawberry',   price: 5,  daysToMature: 2, emoji: '🍓', desc: 'Easy problems fuel this sweet crop.' },
  sunflower:  { name: 'Sunflower',    price: 15, daysToMature: 3, emoji: '🌻', desc: 'Medium grind grows something beautiful.' },
  wheat:      { name: 'Wheat',        price: 30, daysToMature: 5, emoji: '🌾', desc: 'Hard problems deserve golden rewards.' },
  clover:     { name: 'Lucky Clover', price: 50, daysToMature: 7, emoji: '🍀', desc: 'Rare and magical, worth the wait.' },
};

const HARVEST_BONUS = 5;

// Stage 0 = empty, 1 = seed, 2 = sprout, 3 = growing, 4 = mature
// Accepts the full plot object; new plots store stage directly,
// legacy plots (waterings field) are handled for migration safety.
function computeStage(plot) {
  if (!plot.crop) return 0;
  if (plot.stage !== undefined) return plot.stage;
  // Legacy: compute from waterings
  const needed = CROPS_META[plot.crop].daysToMature - 1;
  if (needed <= 0 || plot.waterings >= needed) return 4;
  if (plot.waterings === 0) return 1;
  return 1 + Math.floor((plot.waterings / needed) * 3);
}

// Seed until mature; mature shows the real crop image
function getCropImage(crop, stage) {
  if (stage >= 4) return `../assets/crops/${crop}.png`;
  return `../assets/crops/seed.png`;
}

const STAGE_LABEL = {
  1: 'Just planted 🌱',
  2: 'Growing... 🌿',
  3: 'Almost there! 🌾',
  4: 'Ready to harvest! ✨',
};

// ── Date helper (local time, not UTC) ───────────────────
function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ── State ────────────────────────────────────────────────

let farmData = {
  coins: 0,
  totalSolved: 0,
  streak: 0,
  lastSolvedDate: '',
  lastLoginDate: '',
  plots: Array.from({ length: 6 }, (_, i) => ({
    id: i, crop: null, stage: 0, plantedAt: null, lastWateredDate: '',
  })),
};

// Plot IDs that just grew this load cycle — used to trigger grow-pop animation
let pendingGrowthIds = new Set();

// ── Daily growth check ───────────────────────────────────

// Advances stage for each eligible plot. Returns array of plot IDs that grew.
function checkCropGrowth(plots, todayStr) {
  const grew     = [];
  const withered = [];

  plots.forEach((plot) => {
    if (!plot.crop || plot.stage === 0) return;
    if (plot.stage === -1) return; // already withered

    // ── Mature crop: check for overdue harvest ─────────
    if (plot.stage === 4) {
      if (!plot.maturedAt) {
        plot.maturedAt = Date.now();
      } else {
        const daysSinceMatured = Math.floor(
          (Date.now() - plot.maturedAt) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceMatured >= 3) {
          plot.stage     = -1;
          plot.maturedAt = null;
          withered.push(plot.id);
        }
      }
      return; // mature crops don't grow further
    }

    const lastWatered = plot.lastWateredDate
      ? new Date(plot.lastWateredDate)
      : new Date(plot.plantedAt);
    const today = new Date(todayStr);
    const daysSinceWatered = Math.floor((today - lastWatered) / (1000 * 60 * 60 * 24));

    if (daysSinceWatered > 1) {
      plot.stage      = -1;
      plot.witheredAt = Date.now();
      withered.push(plot.id);
    } else if (plot.lastWateredDate !== todayStr) {
      plot.stage           = Math.min(4, (plot.stage ?? 1) + 1);
      plot.lastWateredDate = todayStr;
      grew.push(plot.id);
    }
  });

  return { grew, withered };
}

// ── Render helpers ───────────────────────────────────────

function renderCoins() {
  const val = farmData.coins;
  ['coinDisplay', 'shopCoinDisplay', 'sidebarCoins'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = id === 'sidebarCoins' ? val : `🪙 ${val} coins`;
  });
}

function renderStats() {
  const s = document.getElementById('sidebarStreak');
  const t = document.getElementById('sidebarTotal');
  if (s) s.textContent = farmData.streak;
  if (t) t.textContent = farmData.totalSolved;
}

function renderStatsTab() {
  const d = farmData;
  const total = d.totalSolved || 0;

  // Summary cards
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('statsTotalSolved', total);
  el('statsStreak',      d.streak ?? 0);
  el('statsTotalCoins',  d.totalCoinsEarned || d.coins || 0);

  // Difficulty counts & bar widths
  const diff   = d.difficultyCount || { Easy: 0, Medium: 0, Hard: 0 };
  const easy   = diff.Easy   || 0;
  const medium = diff.Medium || 0;
  const hard   = diff.Hard   || 0;
  const diffTotal = easy + medium + hard || 1;
  el('countEasy',   easy);
  el('countMedium', medium);
  el('countHard',   hard);
  const pct = (n) => `${Math.round((n / diffTotal) * 100)}%`;
  const bar = (id, val) => { const e = document.getElementById(id); if (e) e.style.width = pct(val); };
  bar('barEasy',   easy);
  bar('barMedium', medium);
  bar('barHard',   hard);

  // Farm progress
  const planted = (d.plots ?? []).filter(p => p.crop).length;
  el('statsPlanted',  `${planted} / 6`);
  el('statsHarvests', d.harvestCount ?? 0);
}

function renderAgentMessage() {
  const msgBar  = document.getElementById('agentMessageBar');
  const msgText = document.getElementById('agentMessageText');
  if (!msgBar || !msgText) return;

  if (farmData.agentMessage) {
    msgText.textContent = farmData.agentMessage;
    msgBar.style.display = 'flex';
  } else {
    msgBar.style.display = 'none';
  }
}

function renderPlot(plot, index) {
  const plotEl = document.querySelector(`[data-index="${index}"]`);
  if (!plotEl) return;

  plotEl.innerHTML = '';
  plotEl.style.overflow = 'visible';

  // ── Empty plot ─────────────────────────────────────────
  if (!plot.crop || plot.stage === 0) {
    const label = document.createElement('div');
    label.className = 'plot-label';
    label.textContent = '+ Plant';
    label.style.cssText = `
      color: white;
      font-size: 11px;
      font-weight: 700;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      cursor: pointer;
      z-index: 2;
      transition: transform 0.15s, background 0.15s;
      background: rgba(0,0,0,0.18);
      padding: 3px 8px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.3);
      white-space: nowrap;
    `;
    plotEl.appendChild(label);
    return;
  }

  // ── Withered plot ─────────────────────────────────────
  if (plot.stage === -1) {
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('assets/crops/seed_withered.png');
    img.style.cssText = `
      width: 52px;
      height: 52px;
      object-fit: contain;
      display: block;
      pointer-events: none;
    `;
    plotEl.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'plot-clear-btn';
    btn.textContent = 'Clear';
    btn.style.cssText = `
      position: absolute;
      left: calc(50% + 30px);
      top: 50%;
      transform: translateY(-50%);
      background: #9B8A76;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      z-index: 10;
    `;
    plotEl.appendChild(btn);
    return;
  }

  const stage = computeStage(plot);

  // ── Tooltip ────────────────────────────────────────────
  plotEl.setAttribute('data-tooltip', STAGE_LABEL[stage] ?? '');

  // ── Crop image ─────────────────────────────────────────
  const img = document.createElement('img');
  img.className = 'plot-img';
  img.alt = CROPS_META[plot.crop]?.name ?? plot.crop;
  img.src = stage >= 4
    ? chrome.runtime.getURL(`assets/crops/${plot.crop}.png`)
    : chrome.runtime.getURL('assets/crops/seed.png');
  img.style.cssText = `
    width: 52px;
    height: 52px;
    object-fit: contain;
    display: block;
    pointer-events: none;
    animation: cropFloat 2s ease-in-out infinite;
  `;

  if (pendingGrowthIds.has(plot.id)) {
    img.style.animation = 'grow-pop 0.5s ease-out';
    img.addEventListener('animationend', () => {
      img.style.animation = 'cropFloat 2s ease-in-out infinite';
    }, { once: true });
  }

  img.addEventListener('error', () => {
    img.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -60%);
      font-size: 44px;
      line-height: 1;
      z-index: 3;
    `;
    fallback.textContent = CROPS_META[plot.crop]?.emoji ?? '🌱';
    plotEl.appendChild(fallback);
  });
  plotEl.appendChild(img);

  // ── Harvest button (stage 4 only) ─────────────────────
  if (stage >= 4) {
    const btn = document.createElement('button');
    btn.className = 'plot-harvest-btn';
    btn.textContent = 'Harvest';
    btn.style.cssText = `
      position: absolute;
      left: calc(50% + 30px);
      top: 50%;
      transform: translateY(-50%);
      background: #D4956A;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      z-index: 10;
      transition: background 0.15s, transform 0.15s;
    `;
    plotEl.appendChild(btn);
    if (plot.maturedAt) {
      const daysLeft = Math.max(0, 3 - Math.floor(
        (Date.now() - plot.maturedAt) / (1000 * 60 * 60 * 24)
      ));
      const timeLabel = document.createElement('div');
      timeLabel.textContent = `⏰ ${daysLeft} day(s)`;
      timeLabel.style.cssText = `
        position: absolute;
        left: calc(50% + 30px);
        top: calc(50% - 22px);
        transform: translateX(0);
        color: #5C5C5C;
        font-size: 9px;
        font-weight: 600;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
      `;
      plotEl.appendChild(timeLabel);
    }
  }
}

function renderPlots() {
  farmData.plots.forEach((plot) => renderPlot(plot, plot.id));
}

function renderShop() {
  const container = document.getElementById('shopContainer');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(CROPS_META).forEach(([key, meta]) => {
    const canAfford = farmData.coins >= meta.price;
    const need      = meta.price - farmData.coins;

    const card = document.createElement('div');
    card.className = 'shop-card';

    // ── card top: image with emoji fallback (no inline handlers) ──
    const cardTop = document.createElement('div');
    cardTop.className = 'shop-card-top';

    const cropImg = document.createElement('img');
    cropImg.className = 'shop-crop-img';
    cropImg.src = `../assets/crops/${key}.png`;
    cropImg.alt = meta.name;
    const fallbackEl = document.createElement('div');
    fallbackEl.className = 'shop-crop-fallback';
    fallbackEl.textContent = meta.emoji;
    fallbackEl.style.display = 'none';
    cropImg.addEventListener('error', () => {
      cropImg.style.display = 'none';
      fallbackEl.style.display = 'block';
    });
    cardTop.appendChild(cropImg);
    cardTop.appendChild(fallbackEl);

    // ── card body ──
    const cardBody = document.createElement('div');
    cardBody.className = 'shop-card-body';
    cardBody.innerHTML = `
      <div class="shop-card-name">${meta.name}</div>
      <div class="shop-card-desc">${meta.desc}</div>
      <div class="shop-card-meta">⏱ ${meta.daysToMature} days to harvest</div>
    `;

    // ── card footer ──
    const cardFooter = document.createElement('div');
    cardFooter.className = 'shop-card-footer';
    const priceEl = document.createElement('span');
    priceEl.className = 'shop-card-price';
    priceEl.textContent = `🪙 ${meta.price}`;
    const buyBtn = document.createElement('button');
    buyBtn.className = `shop-buy-btn${canAfford ? '' : ' disabled'}`;
    buyBtn.textContent = canAfford ? 'Buy & Plant' : `Need ${need} more 🪙`;
    cardFooter.appendChild(priceEl);
    cardFooter.appendChild(buyBtn);

    card.appendChild(cardTop);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);

    if (canAfford) {
      buyBtn.addEventListener('click', () => openPlotSelector(key));
    }

    container.appendChild(card);
  });
}

// ── Actions ──────────────────────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  if (tabName === 'shop') renderShop();
  if (tabName === 'stats') renderStatsTab();
  if (tabName === 'settings') loadSettings();
}

// ── Settings ─────────────────────────────────────────────

function showFeedback(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 2500);
}

function loadSettings() {
  if (!chrome.runtime?.id) return;
  chrome.storage.local.get(['apiKey', 'stealthMode', 'farmData'], (result) => {
    // API Key — show first 8 chars masked
    const keyInput = document.getElementById('apiKeyInput');
    if (keyInput && result.apiKey) {
      keyInput.placeholder = result.apiKey.slice(0, 8) + '••••••••';
    }
    // Daily Goal
    const goalInput = document.getElementById('dailyGoalInput');
    if (goalInput) {
      goalInput.value = result.farmData?.dailyGoal ?? 3;
    }
    // Stealth Mode
    const toggle = document.getElementById('stealthModeToggle');
    if (toggle) {
      toggle.checked = !!result.stealthMode;
    }
  });
}

function openPlotSelector(cropKey) {
  const modal = document.getElementById('plotSelectorModal');
  const grid  = document.getElementById('plotSelectorGrid');
  const title = document.getElementById('selectorTitle');
  title.textContent = `Choose a plot to plant your ${CROPS_META[cropKey].name}`;
  grid.innerHTML = '';

  farmData.plots.forEach((plot) => {
    const cell = document.createElement('div');
    if (plot.crop) {
      cell.className = 'selector-plot occupied';
      cell.textContent = CROPS_META[plot.crop]?.name ?? plot.crop;
    } else {
      cell.className = 'selector-plot available';
      cell.textContent = 'Empty — Plant here';
      cell.addEventListener('click', () => {
        plantCrop(cropKey, plot.id);
        modal.style.display = 'none';
      });
    }
    grid.appendChild(cell);
  });

  modal.style.display = 'flex';
}

function plantCrop(cropKey, plotIndex) {
  if (farmData.coins < CROPS_META[cropKey].price) return;
  farmData.coins -= CROPS_META[cropKey].price;
  const today = getLocalDateStr();
  farmData.plots[plotIndex] = {
    id: plotIndex,
    crop: cropKey,
    stage: 1,
    plantedAt: Date.now(),
    lastWateredDate: today,
  };
  switchTab('farm');
  saveAndRender();
}

function showCoinToast(plotEl) {
  const toast = document.createElement('div');
  toast.className = 'coin-toast';
  toast.textContent = `+${HARVEST_BONUS} 🪙`;
  plotEl.appendChild(toast);
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

function harvestCrop(plotIndex) {
  const plotEl = document.querySelector(`.farm-plot[data-index="${plotIndex}"]`);
  const img = plotEl?.querySelector('.plot-img');

  // Show coin toast immediately
  if (plotEl) showCoinToast(plotEl);

  const doHarvest = () => {
    farmData.coins += HARVEST_BONUS;
    farmData.harvestCount = (farmData.harvestCount ?? 0) + 1;
    farmData.plots[plotIndex] = {
      id: plotIndex, crop: null, stage: 0, plantedAt: null, lastWateredDate: '',
    };
    saveAndRender();
  };

  if (img) {
    // Override inline animation with harvest-out (inline wins over class)
    img.style.animation = 'harvest-out 0.5s ease-out forwards';
    img.style.pointerEvents = 'none';
    setTimeout(doHarvest, 500);
  } else {
    doHarvest();
  }
}

function clearWitheredCrop(plotIndex) {
  farmData.plots[plotIndex] = {
    id: plotIndex, crop: null, stage: 0, plantedAt: null, lastWateredDate: '',
  };
  saveAndRender();
}

function saveAndRender() {
  if (!chrome.runtime?.id) return;
  chrome.storage.local.set({ farmData }, () => {
    if (chrome.runtime.lastError) {
      console.warn('FarmCode: save error', chrome.runtime.lastError);
      return;
    }
    renderCoins();
    renderStats();
    renderPlots();
    renderAgentMessage();
    renderShop();
  });
}

// ── Load from storage ────────────────────────────────────

function loadFarm() {
  if (!chrome.runtime?.id) return;

  try {
    chrome.storage.local.get(['farmData'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('FarmCode: storage error', chrome.runtime.lastError);
        return;
      }

      if (result.farmData) {
        farmData = result.farmData;
      }

      // Migration: ensure 6 plots exist
      if (!farmData.plots || farmData.plots.length < 6) {
        farmData.plots = Array.from({ length: 6 }, (_, i) =>
          farmData.plots?.[i] ?? { id: i, crop: null, stage: 0, plantedAt: null, lastWateredDate: '' }
        );
      }

      // ── Daily growth check ─────────────────────────────
      const todayStr = getLocalDateStr();
      const firstOpenToday = (farmData.lastLoginDate ?? '') !== todayStr;

      if (firstOpenToday) {
        const { grew, withered } = checkCropGrowth(farmData.plots, todayStr);
        farmData.lastLoginDate = todayStr;
        pendingGrowthIds = new Set(grew);
        if (grew.length > 0 || withered.length > 0) {
          chrome.storage.local.set({ farmData });
        }
        if (grew.length > 0) {
          const justMatured = grew.filter(id => farmData.plots[id]?.stage === 4);
          if (justMatured.length > 0) {
            chrome.runtime.sendMessage({
              type:    'SHOW_NOTIFICATION',
              message: `${justMatured.length} crop(s) are ready to harvest! Don't wait too long 🌟`,
            }).catch(() => {});
          }
        }
        if (withered.length > 0) {
          chrome.runtime.sendMessage({
            type:    'SHOW_NOTIFICATION',
            message: `${withered.length} crop(s) have withered! Clear them and plant again 🥀`,
          }).catch(() => {});
        }
      } else {
        pendingGrowthIds = new Set();
      }

      renderCoins();
      renderStats();
      renderPlots();
      renderAgentMessage();
      pendingGrowthIds = new Set(); // clear after render

      if (document.getElementById('tab-shop')?.classList.contains('active')) renderShop();
      if (document.getElementById('tab-stats')?.classList.contains('active')) renderStatsTab();
    });
  } catch (e) {
    console.warn('FarmCode: context invalidated, stopping interval');
    clearInterval(farmInterval);
  }
}

// ── Event listeners ──────────────────────────────────────

document.getElementById('plotSelectorClose')?.addEventListener('click', () => {
  document.getElementById('plotSelectorModal').style.display = 'none';
});
document.getElementById('plotSelectorCancel')?.addEventListener('click', () => {
  document.getElementById('plotSelectorModal').style.display = 'none';
});
document.getElementById('plotSelectorModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('plotSelectorModal')) {
    document.getElementById('plotSelectorModal').style.display = 'none';
  }
});

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'FARM_UPDATE') loadFarm();
  });
} catch (e) {
  console.warn('FarmCode: could not register message listener', e);
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.farmData) {
      console.log('storage changed, new coins:', changes.farmData.newValue?.coins);
      console.log('storage changed, new totalSolved:', changes.farmData.newValue?.totalSolved);
      console.log('storage changed, new streak:', changes.farmData.newValue?.streak);
      farmData = changes.farmData.newValue;
      renderCoins();
      renderStats();
      renderPlots();
      renderAgentMessage();
    }
  });
} catch (e) {
  console.warn('FarmCode: could not register storage listener', e);
}

// ── Init ─────────────────────────────────────────────────

window.addEventListener('load', () => {
  // ── Settings event listeners ───────────────────────────
  document.getElementById('saveApiKey')?.addEventListener('click', () => {
    const val = document.getElementById('apiKeyInput').value.trim();
    if (!val || !chrome.runtime?.id) return;
    chrome.storage.local.set({ apiKey: val }, () => {
      document.getElementById('apiKeyInput').value = '';
      document.getElementById('apiKeyInput').placeholder = val.slice(0, 8) + '••••••••';
      showFeedback('apiKeyFeedback', '✓ Saved');
    });
  });

  document.getElementById('saveDailyGoal')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('dailyGoalInput').value);
    if (isNaN(val) || val < 1 || val > 10 || !chrome.runtime?.id) return;
    chrome.storage.local.get(['farmData'], (result) => {
      const data = result.farmData ?? farmData;
      data.dailyGoal = val;
      chrome.storage.local.set({ farmData: data }, () => {
        showFeedback('dailyGoalFeedback', '✓ Saved');
      });
    });
  });

  document.getElementById('stealthModeToggle')?.addEventListener('change', (e) => {
    if (!chrome.runtime?.id) return;
    const enabled = e.target.checked;
    chrome.storage.local.set({ stealthMode: enabled });
  });

  // ── Agent bar dismiss ────────────────────────────────
  document.getElementById('agentMessageClose')?.addEventListener('click', () => {
    farmData.agentMessage = null;
    farmData.agentStatus  = null;
    saveAndRender();
  });

  const farmScene = document.getElementById('farmScene');
  console.log('farm.js load event, farmScene:', !!farmScene);

  if (farmScene) {
    farmScene.addEventListener('click', (e) => {
      console.log('click:', e.target.className);
      if (e.target.classList.contains('plot-label')) {
        switchTab('shop');
      }
      if (e.target.classList.contains('plot-harvest-btn')) {
        const index = parseInt(e.target.closest('.farm-plot').dataset.index);
        e.target.textContent = 'Harvested!';
        e.target.style.background = '#A8C5A0';
        setTimeout(() => harvestCrop(index), 500);
      }
      if (e.target.classList.contains('plot-clear-btn')) {
        const index = parseInt(e.target.closest('.farm-plot').dataset.index);
        clearWitheredCrop(index);
      }
    });

    farmScene.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('plot-label')) {
        e.target.style.transform = 'scale(1.12)';
      }
      if (e.target.classList.contains('plot-harvest-btn')) {
        e.target.style.background = '#C4855A';
        e.target.style.transform = 'translateY(-50%) scale(1.05)';
      }
    });

    farmScene.addEventListener('mouseout', (e) => {
      if (e.target.classList.contains('plot-label')) {
        e.target.style.transform = 'scale(1)';
      }
      if (e.target.classList.contains('plot-harvest-btn')) {
        e.target.style.background = '#D4956A';
        e.target.style.transform = 'translateY(-50%) scale(1)';
      }
    });
  }

  loadFarm();
});

const farmInterval = setInterval(loadFarm, 5000);
