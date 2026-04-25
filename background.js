// FarmCode — Background Service Worker

const COIN_REWARDS  = { Easy: 1, Medium: 3, Hard: 5 };
const HARVEST_BONUS = 5;

// ── Storage helpers ─────────────────────────────────────
function getStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['farmData', 'apiKey'], (result) => resolve(result));
  });
}

function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

const DEFAULT_STATE = {
  coins: 0,
  totalSolved: 0,
  difficultyCount: { Easy: 0, Medium: 0, Hard: 0 },
  totalCoinsEarned: 0,
  harvestCount: 0,
  streak: 0,
  lastSolvedDate: '',
  plots: Array.from({ length: 6 }, (_, i) => ({
    id: i,
    crop: null,
    stage: 0,
    plantedAt: null,
    lastWateredDate: '',
  })),
};

// ── One-time reset to v2.0 clean state ─────────────────
// Runs on every SW start but exits immediately if already on v2.0.
// Uses a single atomic set() (no clear()) to avoid the race where
// the SW is killed between clear() and the follow-up set().
chrome.storage.local.get(['dataVersion'], (result) => {
  if (chrome.runtime.lastError) return;
  if (result.dataVersion === '2.0') return;
  console.log('FarmCode: upgrading storage to v2.0');
  chrome.storage.local.set({ dataVersion: '2.0', farmData: DEFAULT_STATE }, () => {
    if (chrome.runtime.lastError) console.warn('FarmCode: storage upgrade failed', chrome.runtime.lastError);
    else console.log('FarmCode: storage reset to v2.0 complete');
  });
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({ dataVersion: '2.0', farmData: DEFAULT_STATE });
  }
});

// ── Agent alarm ─────────────────────────────────────────
chrome.alarms.create('agentCheck', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'agentCheck') runAgent();
});

// ── Agent: call Claude Haiku and act on decision ────────
async function runAgent() {
  try {
    const stored = await getStorage();
    const apiKey = stored.apiKey;
    console.log('FarmCode Agent: storage keys present:', Object.keys(stored));
    console.log('FarmCode Agent: apiKey found:', !!apiKey, apiKey ? apiKey.substring(0, 10) + '...' : 'null');
    if (!apiKey) return;

    const data = stored.farmData ?? DEFAULT_STATE;
    const hour = new Date().getHours();
    const todayStr = new Date().toISOString().slice(0, 10);
    const solvedToday  = data.lastSolvedDate === todayStr ? 1 : 0;
    const dailyGoal    = data.dailyGoal ?? 3;
    const streak       = data.streak ?? 0;
    const growingCrops = (data.plots ?? []).filter(p => p.crop && p.stage > 0 && p.stage < 4).length;

    const prompt = `You are a friendly farm assistant for a gamified LeetCode tracker called FarmCode.
Current state:
- Hour of day: ${hour}
- Problems solved today: ${solvedToday}
- Daily goal: ${dailyGoal}
- Current streak: ${streak} days
- Growing crops (need watering via solving): ${growingCrops}

Decide whether to send an encouraging message. Reply ONLY with valid JSON (no markdown) in this exact shape:
{"status":"idle"|"warning"|"hint","action":"none"|"show_warning"|"show_hint","message":"<short friendly message, max 80 chars, or empty string if action is none>"}

Rules:
- If hour is between 20-23 and solvedToday < dailyGoal, use show_warning.
- If growingCrops > 0 and solvedToday === 0 and hour >= 12, use show_hint.
- Otherwise, use none/idle with empty message.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('FarmCode agent: API error', response.status, errText);
      return;
    }

    const json = await response.json();
    const raw  = json.content?.[0]?.text ?? '';
    console.log('FarmCode agent raw:', raw);

    let decision;
    try {
      const text  = json.content[0].text;
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      decision = JSON.parse(clean);
    } catch {
      console.warn('FarmCode agent: could not parse JSON', raw);
      return;
    }

    await handleAgentDecision(decision, data);
  } catch (e) {
    console.warn('FarmCode agent error:', e);
  }
}

async function handleAgentDecision(decision, data) {
  if (!decision || decision.action === 'none') return;

  const message = (decision.message ?? '').slice(0, 120);
  if (!message) return;

  // Desktop notification
  chrome.notifications.create({
    type:    'basic',
    iconUrl: 'icons/icon48.png',
    title:   'FarmCode 🌾',
    message,
  }, () => { if (chrome.runtime.lastError) console.warn('FarmCode: notification error', chrome.runtime.lastError); });

  // Persist message into farmData so farm.html can show the agent bar
  const updated = { ...(data ?? DEFAULT_STATE), agentMessage: message, agentStatus: decision.status ?? 'hint' };
  await setStorage({ farmData: updated });
  console.log('FarmCode agent decision applied:', decision.action, message);

  // Notify all open extension pages (farm panel iframe etc.) to refresh
  chrome.runtime.sendMessage({ type: 'FARM_UPDATE' }).catch(() => {});
}

// ── PROBLEM_SOLVED logic extracted for async/await ──────
async function handleProblemSolved(message) {
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(['farmData'], resolve)
  );

  const data = result.farmData
    ? JSON.parse(JSON.stringify(result.farmData))
    : JSON.parse(JSON.stringify(DEFAULT_STATE));

  if (!data.plots || data.plots.length < 6) {
    data.plots = Array.from({ length: 6 }, (_, i) =>
      data.plots?.[i] || { id: i, crop: null, stage: 0, plantedAt: null, lastWateredDate: '' }
    );
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  // ── Coins & difficulty counters ──────────────────────
  const reward = COIN_REWARDS[message.difficulty] ?? 1;
  data.coins           += reward;
  data.totalCoinsEarned = (data.totalCoinsEarned ?? 0) + reward;
  data.totalSolved      += 1;
  if (!data.difficultyCount) data.difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
  data.difficultyCount[message.difficulty] = (data.difficultyCount[message.difficulty] || 0) + 1;

  // ── Streak ───────────────────────────────────────────
  console.log('STREAK BEFORE:', {
    lastSolvedDate: data.lastSolvedDate,
    today,
    yesterday,
    streak: data.streak,
  });

  if (data.lastSolvedDate === yesterday) {
    data.streak += 1;
  } else if (data.lastSolvedDate !== today) {
    data.streak = 1;
  }

  console.log('STREAK AFTER:', data.streak);
  data.lastSolvedDate = today;

  // ── Water all planted plots (once per day) ───────────
  data.plots.forEach((plot) => {
    if (plot.crop && plot.stage !== -1 && plot.lastWateredDate !== today) {
      if (plot.stage !== undefined) {
        if (plot.stage < 4) plot.stage += 1;
      } else {
        plot.waterings += 1; // legacy format
      }
      plot.lastWateredDate = today;
    }
  });

  await new Promise((resolve, reject) => {
    chrome.storage.local.set({ farmData: data }, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });

  console.log('FarmCode: Saved — coins:', data.coins, 'streak:', data.streak);
  return { coins: data.coins };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('FarmCode background received:', message.type);

  if (message.type === 'PROBLEM_SOLVED') {
    handleProblemSolved(message)
      .then((result) => sendResponse({ success: true, coins: result.coins }))
      .catch((e) => {
        console.warn('FarmCode: handleProblemSolved error', e);
        sendResponse({ success: false });
      });
    return true; // keep message channel open for async response
  }

  if (message.type === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type:    'basic',
      iconUrl: 'icons/icon48.png',
      title:   'FarmCode 🌾',
      message: message.message,
    }, () => { if (chrome.runtime.lastError) console.warn('FarmCode: notification error', chrome.runtime.lastError); });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_FARM') {
    chrome.tabs.create({ url: chrome.runtime.getURL('farm/farm.html') });
    sendResponse({ success: true });
    return true;
  }

  return true;
});
