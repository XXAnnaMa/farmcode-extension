# 🌾 FarmCode — LeetCode Farm

> Turn your LeetCode grind into a cozy farm adventure.

FarmCode is a Chrome Extension that gamifies LeetCode practice through a farm simulation. Solve problems, earn coins, buy seeds, and watch your crops grow — powered by an AI Agent that monitors your progress and intervenes when you need a nudge.

---

## ✨ Features

### 🌱 Farm Simulation
- Isometric hand-drawn farm view with 6 crop plots
- 4 crop types with unique growth timelines:

| Crop | Cost | Days to Harvest | Difficulty |
|------|------|----------------|------------|
| 🍓 Strawberry | 5 coins | 2 days | Easy |
| 🌻 Sunflower | 15 coins | 3 days | Medium |
| 🌾 Wheat | 30 coins | 5 days | Hard |
| 🍀 Lucky Clover | 50 coins | 7 days | Rare |

- Multi-stage growth: Seed → Sprout → Growing → Mature → Harvest
- Crops wither if not harvested within 3 days of maturity
- Neglected crops wither after missing daily check-ins
- Harvest countdown timer displayed on mature crops

### 🪙 Coin Economy
- Easy problem = 1 coin · Medium = 3 coins · Hard = 5 coins
- Spend coins in the Crop Shop to buy seeds
- Harvest mature crops for bonus coins
- Daily streak bonus rewards consistent practice

### 🤖 AI Agent (observe → reason → intervene)
- Runs every 30 minutes in the background
- Monitors time of day, daily goal progress, and streak data
- Classifies user status: `on_track` / `procrastinating` / `behind_schedule` / `completed`
- Delivers personalized interventions via:
  - System notifications
  - In-app farm message bar
  - Farm visual updates (crop withering)
- Powered by Claude API (bring your own key, ~$0.001 per check)

### 📊 Stats Dashboard
- Total problems solved with Easy / Medium / Hard breakdown
- Current streak and total coins earned
- Harvest count and farm progress tracking
- Visual progress bars for difficulty distribution

### 🔒 Privacy First
- Zero server-side storage — all data lives in your browser
- Your API key stored locally via `chrome.storage.local`
- LeetCode submission detection via DOM monitoring (no account access needed)
- Data never leaves your device

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Extension Manifest V3 |
| Frontend | Vanilla JS, HTML, CSS |
| AI Agent | Anthropic Claude API (claude-haiku) |
| Storage | chrome.storage.local |
| Background | Service Worker (chrome.alarms, chrome.notifications) |
| Architecture | Content Script ↔ Service Worker ↔ Extension Page |

---

## 🚀 Getting Started

### Install (Developer Mode)

1. Clone this repository
```bash
git clone https://github.com/XXAnnaMa/farmcode-extension.git
```

2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked** and select the `farmcode-extension` folder
5. Open any LeetCode problem — the 🌾 floating button will appear

### Setup

1. Click the floating button on LeetCode to open your farm
2. Go to **Settings** tab
3. Enter your Anthropic API Key
4. Set your daily problem goal
5. Start solving — every Accepted submission plants a seed 🌱

---

## 🤖 AI Agent Architecture

Every 30 minutes:

```
OBSERVE   →  Today's solved count, current time, streak, daily goal, farm state
    ↓
REASON    →  Claude API classifies status + selects intervention strategy
    ↓
INTERVENE →  System notification + in-app message bar + farm visual feedback
```

| Status | Condition | Action |
|--------|-----------|--------|
| `on_track` | Meeting daily goal | No interruption |
| `procrastinating` | Late in day, no problems solved | Warning notification |
| `behind_schedule` | Significantly behind goal | Strong nudge + farm alert |
| `completed` | Daily goal met | Celebration message |

---

## 🌱 Crop Lifecycle

```
Buy Seed → Plant → Daily Check-in Waters Crops → Mature → Harvest (within 3 days)
                                                              ↓
                                             Miss harvest → Wither → Clear & Replant
```

- Miss a daily check-in → crops stop growing
- Miss 2+ days → crops wither (withered image shown, Clear button appears)
- Mature crops not harvested within 3 days → also wither
- Harvest countdown: ⏰ 3d → 2d → 1d → wither

---

## 📁 Project Structure

```
farmcode-extension/
├── manifest.json         # MV3 config, permissions, CSP
├── background.js         # Service worker + AI Agent (runs every 30min)
├── content.js            # LeetCode DOM monitor + floating button + iframe panel
├── farm/
│   ├── farm.html         # Main farm UI (Farm, Shop, Stats, Settings tabs)
│   ├── farm.css          # Warm cream aesthetic styling
│   └── farm.js           # Farm logic, shop, stats, crop lifecycle
├── assets/
│   ├── farm_pic.png      # Isometric hand-drawn farm background
│   └── crops/            # Crop sprites (seed, strawberry, sunflower, wheat, clover, withered)
└── popup/
    └── popup.html        # Extension toolbar popup
```

---

## 🗺 Roadmap

- [x] LeetCode submission detection via DOM monitoring
- [x] Coin economy (Easy/Medium/Hard difficulty tiers)
- [x] Crop shop with 4 crop types
- [x] Multi-stage crop growth system
- [x] Crop wither & harvest timeout mechanics
- [x] AI Agent with observe → reason → intervene loop
- [x] Stats dashboard with difficulty breakdown
- [x] Daily streak tracking with timezone-aware logic
- [x] System notifications for Agent interventions
- [ ] Friend system with Firebase (water / steal crops)
- [ ] Chrome Web Store public release

---

## 📄 License

MIT
