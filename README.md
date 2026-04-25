# 🌾 FarmCode — LeetCode Farm

> Turn your LeetCode grind into a cozy farm adventure.

FarmCode is a Chrome Extension that gamifies LeetCode practice through a farm simulation. Solve problems, earn coins, buy seeds, and watch your crops grow — powered by an AI Agent that monitors your progress and intervenes when you need a nudge.

---

## ✨ Features

**Farm Simulation**
- Isometric farm view with 6 crop plots
- 4 crop types: Strawberry, Sunflower, Wheat, Lucky Clover
- Multi-stage growth system: Seed → Sprout → Growing → Harvest

**Coin Economy**
- Easy problem = 1 coin · Medium = 3 coins · Hard = 5 coins
- Spend coins in the Crop Shop to buy seeds
- Harvest mature crops for bonus coins

**AI Agent (observe → reason → intervene)**
- Monitors time of day, daily goal progress, and streak data
- Classifies user status: `on_track` / `procrastinating` / `behind_schedule` / `completed`
- Delivers personalized interventions via system notifications and in-app messages
- Powered by Claude API (bring your own key)

**Stats Dashboard**
- Total problems solved with Easy / Medium / Hard breakdown
- Current streak and coin history
- Farm progress tracking

**Privacy First**
- No chat content stored — analysis runs client-side
- Your API key stays in your browser via `chrome.storage.local`

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Extension Manifest V3 |
| Frontend | Vanilla JS, HTML, CSS |
| AI | Anthropic Claude API |
| Storage | chrome.storage.local |
| Background | Service Worker (chrome.alarms, chrome.notifications) |

---

## 🚀 Getting Started

### Install (Developer Mode)

1. Clone this repository
```bash
git clone https://github.com/YOUR_USERNAME/farmcode-extension.git
```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer Mode** (top right toggle)

4. Click **Load unpacked** and select the `farmcode-extension` folder

5. Open any LeetCode problem — the 🌾 floating button will appear

### Setup

1. Click the floating button on LeetCode to open your farm
2. Go to **Settings** tab
3. Enter your [Anthropic API Key](https://console.anthropic.com)
4. Set your daily problem goal
5. Start solving problems!

---

## 🤖 AI Agent Architecture

```
Every 30 minutes:

OBSERVE  →  Read today's solved count, time, streak, daily goal
REASON   →  Claude API classifies status + decides action  
INTERVENE → Notification + in-app message + farm visual update
```

The agent uses `claude-haiku` for low-cost, fast decisions. Each check costs less than $0.001.

---

## 📁 Project Structure

```
farmcode-extension/
├── manifest.json         # MV3 config
├── background.js         # Service worker + AI Agent
├── content.js            # LeetCode DOM monitor + floating button
├── farm/
│   ├── farm.html         # Main farm UI
│   ├── farm.css
│   └── farm.js           # Farm logic, shop, stats
├── assets/
│   ├── farm_pic.png      # Isometric farm background
│   └── crops/            # Crop images
└── popup/
    └── popup.html        # Extension toolbar popup
```

---

## 🗺 Roadmap

- [x] LeetCode submission detection
- [x] Coin economy + crop shop
- [x] Multi-stage crop growth
- [x] AI Agent (observe → reason → intervene)
- [x] Stats dashboard
- [ ] Friend system with Firebase (water / steal crops)
- [ ] Chrome Web Store release

---

## 📄 License

MIT
