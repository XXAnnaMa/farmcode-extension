# 🌾 FarmCode

> Turn your LeetCode grind into a cozy farm adventure.

FarmCode is a Chrome Extension that gamifies LeetCode practice through an isometric farm simulation. Solve problems, earn coins, grow crops — and let an AI Agent keep you accountable.

![Farm View](assets/farm_pic.png)

---

## ✨ Features

### 🌱 Farm Simulation
- Isometric hand-drawn farm with 6 crop plots
- 4 crop types: Strawberry 🍓 · Sunflower 🌻 · Wheat 🌾 · Lucky Clover 🍀
- Multi-stage growth: Seed → Sprout → Growing → Mature
- Crops wither if not harvested within 3 days — stay on top of your farm!
- Neglect your daily goal and crops wilt 🥀

### 🪙 Coin Economy
| Difficulty | Coins Earned |
|-----------|-------------|
| Easy | +1 🪙 |
| Medium | +3 🪙 |
| Hard | +5 🪙 |

- Spend coins in the **Crop Shop** to buy seeds
- Harvest mature crops for bonus coins
- Daily streaks keep your farm healthy

### 🤖 AI Learning Agent
Runs every 30 minutes with an **observe → reason → intervene** loop:

```
OBSERVE   →  today's solves, time of day, streak, daily goal
REASON    →  Claude API classifies: on_track / procrastinating / behind_schedule / completed
INTERVENE →  system notification + in-app farm message
```

- Powered by Claude API (bring your own key — costs < $0.001 per check)
- Personalized messages based on your actual progress

### 📊 Stats Dashboard
- Total problems solved with Easy / Medium / Hard breakdown
- Current streak tracker
- Farm progress overview

### 🔒 Privacy First
- Zero server-side storage — all data lives in your browser
- API key stored locally via `chrome.storage.local`
- Submission data never leaves your device

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Extension Manifest V3 |
| Frontend | Vanilla JS · HTML · CSS |
| AI Agent | Anthropic Claude API (claude-haiku) |
| Storage | chrome.storage.local |
| Background | Service Worker · chrome.alarms · chrome.notifications |

---

## 🚀 Getting Started

### Install (Developer Mode)

```bash
git clone https://github.com/XXAnnaMa/farmcode-extension.git
```

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked** → select the `farmcode-extension` folder
4. Open any LeetCode problem — the 🌾 floating button appears in the bottom right

### First-Time Setup

1. Click the floating 🌾 button on LeetCode
2. Go to **Settings** tab
3. Enter your [Anthropic API Key](https://console.anthropic.com)
4. Set your daily problem goal
5. Start solving — your farm grows with you!

---

## 🏗 Architecture

```
farmcode-extension/
├── manifest.json         # MV3 configuration
├── background.js         # Service worker + AI Agent engine
├── content.js            # LeetCode DOM monitor + floating panel
├── farm/
│   ├── farm.html         # Main UI (farm, shop, stats, settings)
│   ├── farm.css
│   └── farm.js           # Farm logic, growth system, shop, agent display
├── assets/
│   ├── farm_pic.png      # Isometric farm background (AI-generated)
│   └── crops/            # Crop sprites (seed, mature, withered states)
└── popup/
    └── popup.html        # Extension toolbar popup
```

---

## 🤖 AI Agent Design

The agent follows a minimal, cost-efficient architecture:

- **Model**: `claude-haiku` — fast and cheap (~$0.001/check)
- **Frequency**: Every 30 minutes via `chrome.alarms`
- **Input context**: time of day · solves today · daily goal · streak · growing crops
- **Output**: JSON with `status`, `action`, `message`
- **Actions**: `none` · `show_hint` · `show_warning`

This design keeps API costs under $1/month for active users.

---

## 🗺 Roadmap

- [x] Real-time LeetCode submission detection via DOM monitoring
- [x] Coin economy + crop shop
- [x] Multi-stage crop growth with daily check-ins
- [x] Crop wither system (neglect penalty)
- [x] Harvest timeout (3-day countdown)
- [x] AI Agent (observe → reason → intervene)
- [x] Stats dashboard with difficulty breakdown
- [x] Streak tracking with timezone-aware date logic
- [ ] Friend system with Firebase (water / steal crops)
- [ ] Chrome Web Store release

---

## 📄 License

MIT
