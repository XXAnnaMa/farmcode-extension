// FarmCode — Content Script (injected into leetcode.com)
console.log('FarmCode content.js loaded');

// Temp debug: type farmDebug() in console after an Accepted submission appears
window.farmDebug = function () {
  const all = document.querySelectorAll('*');
  const results = [];
  for (const el of all) {
    if (el.textContent.trim() === 'Accepted' && el.children.length === 0) {
      results.push({
        tag:       el.tagName,
        className: el.className,
        color:     getComputedStyle(el).color,
        parent:    el.parentElement?.className,
      });
    }
  }
  console.log('Accepted elements found:', results);
  return results;
};

(function () {
  'use strict';

  function isExtensionContextValid() {
    try {
      return !!(chrome?.runtime?.id);
    } catch (e) {
      return false;
    }
  }

  const FARM_PAGE_URL = chrome.runtime.getURL('farm/farm.html');

  // ── Floating button ─────────────────────────────────────

  const btn = document.createElement('div');
  btn.id = 'farmcode-float-btn';
  Object.assign(btn.style, {
    position:       'fixed',
    bottom:         '24px',
    right:          '24px',
    width:          '56px',
    height:         '56px',
    borderRadius:   '50%',
    background:     '#E8F0E8',
    border:         '2px solid #A8C5A0',
    boxShadow:      '0 4px 16px rgba(120,160,120,0.25)',
    cursor:         'pointer',
    zIndex:         '2147483647',
    overflow:       'hidden',
    transition:     'transform 0.2s ease, box-shadow 0.2s ease',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '26px',
  });

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('assets/crops/icon_float.png');
  icon.alt = 'FarmCode';
  Object.assign(icon.style, {
    width:         '56px',
    height:        '56px',
    borderRadius:  '50%',
    display:       'block',
    pointerEvents: 'none',
    userSelect:    'none',
  });
  btn.appendChild(icon);

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 20px rgba(120,160,120,0.45)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 16px rgba(120,160,120,0.25)';
  });

  // ── Floating panel (iframe) ─────────────────────────────

  const panel = document.createElement('div');
  panel.id = 'farmcode-panel';
  Object.assign(panel.style, {
    position:     'fixed',
    bottom:       '24px',
    right:        '90px',
    width:        '380px',
    height:       '520px',
    background:   '#FEFAF3',
    borderRadius: '16px',
    boxShadow:    '0 8px 32px rgba(100,130,100,0.20)',
    border:       '1px solid #E8E0D0',
    zIndex:       '2147483646',
    display:      'none',
    flexDirection: 'column',
    overflow:     'hidden',
    // pop-in animation via transition
    opacity:      '0',
    transform:    'scale(0.92) translateY(12px)',
    transition:   'opacity 0.22s ease, transform 0.22s cubic-bezier(.34,1.56,.64,1)',
    transformOrigin: 'bottom right',
  });

  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position:   'absolute',
    top:        '10px',
    right:      '12px',
    width:      '24px',
    height:     '24px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color:      '#9B8A76',
    fontSize:   '13px',
    cursor:     'pointer',
    borderRadius: '6px',
    zIndex:     '1',
    transition: 'background 0.15s',
  });
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = '#EDE0CE'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = ''; });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hidePanel(); });

  // iframe
  const iframe = document.createElement('iframe');
  iframe.src = FARM_PAGE_URL;
  iframe.addEventListener('load', () => {
    console.log('FarmCode: iframe loaded');
  });
  Object.assign(iframe.style, {
    width:   '100%',
    height:  '100%',
    border:  'none',
    display: 'block',
  });

  panel.appendChild(closeBtn);
  panel.appendChild(iframe);

  // ── Panel show / hide ──────────────────────────────────

  let panelVisible = false;

  function showPanel() {
    panel.style.visibility = 'visible';
    panel.style.display = 'flex';
    // trigger transition on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.opacity   = '1';
        panel.style.transform = 'scale(1) translateY(0)';
      });
    });
    panelVisible = true;
  }

  function hidePanel() {
    panel.style.opacity   = '0';
    panel.style.transform = 'scale(0.92) translateY(12px)';
    panelVisible = false;
    setTimeout(() => {
      if (!panelVisible) {
        panel.style.display = 'none';
        panel.style.visibility = 'hidden';
      }
    }, 220);
  }

  // Toggle on icon click
  btn.addEventListener('click', () => {
    if (panelVisible) {
      hidePanel();
    } else {
      showPanel();
    }
  });

  // ── Right-click context menu ────────────────────────────

  const menu = document.createElement('div');
  menu.id = 'farmcode-context-menu';
  Object.assign(menu.style, {
    position:     'fixed',
    background:   '#fff',
    borderRadius: '10px',
    padding:      '5px 0',
    boxShadow:    '0 4px 16px rgba(0,0,0,0.14)',
    zIndex:       '2147483647',
    display:      'none',
    fontFamily:   'Nunito, Segoe UI, sans-serif',
    fontSize:     '13px',
    fontWeight:   '600',
    minWidth:     '140px',
  });

  function menuItem(label, onClick) {
    const item = document.createElement('div');
    item.textContent = label;
    Object.assign(item.style, {
      padding:      '8px 16px',
      cursor:       'pointer',
      color:        '#5C4A35',
      borderRadius: '6px',
    });
    item.addEventListener('mouseenter', () => { item.style.background = '#FFF3DC'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; });
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
      menu.style.display = 'none';
    });
    return item;
  }

  menu.appendChild(menuItem('Open in new tab 🌾', () => {
    window.open(FARM_PAGE_URL, '_blank');
  }));
  menu.appendChild(menuItem('Hide button', () => {
    btn.style.display = 'none';
    hidePanel();
  }));

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const mx = Math.min(e.clientX, window.innerWidth  - 160);
    const my = Math.min(e.clientY, window.innerHeight - 90);
    menu.style.left    = `${mx}px`;
    menu.style.top     = `${my}px`;
    menu.style.display = 'block';
  });

  document.addEventListener('click', () => { menu.style.display = 'none'; });

  // ── Mount ──────────────────────────────────────────────

  function mount() {
    if (!document.getElementById('farmcode-float-btn')) {
      panel.style.display = 'none';
      panel.style.visibility = 'hidden';
      document.body.appendChild(panel);
      document.body.appendChild(btn);
      document.body.appendChild(menu);

      setTimeout(() => {
        btn.style.setProperty('background-color', '#FFF8EE', 'important');
        btn.style.setProperty('background', '#FFF8EE', 'important');
        btn.style.setProperty('z-index', '2147483647', 'important');
      }, 100);

      console.log('FarmCode float button mounted');
    }
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  // ── Stealth mode: apply on load and react to changes ───
  if (chrome.runtime?.id) {
    chrome.storage.local.get(['stealthMode'], (result) => {
      if (chrome.runtime.lastError) return;
      if (result.stealthMode) btn.style.display = 'none';
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.stealthMode) {
        btn.style.display = changes.stealthMode.newValue ? 'none' : 'flex';
      }
    });
  }

  // ── Submission detection ────────────────────────────────

  function getDifficulty() {
    const el = document.querySelector(
      '[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'
    );
    console.log('FarmCode: getDifficulty el =', el, el ? el.textContent.trim() : 'not found');
    if (!el) return 'Medium';
    const t = el.textContent.trim();
    if (t.includes('Easy')) return 'Easy';
    if (t.includes('Hard')) return 'Hard';
    return 'Medium';
  }

  function onProblemSolved(difficulty) {
    if (!isExtensionContextValid()) {
      observer.disconnect();
      return;
    }
    const solvedKey = `${document.title}_${new Date().toDateString()}`;
    if (sessionStorage.getItem(solvedKey)) return;
    sessionStorage.setItem(solvedKey, '1');
    const cropMap = { Easy: 'strawberry', Medium: 'sunflower', Hard: 'wheat' };
    const msg = {
      type: 'PROBLEM_SOLVED',
      difficulty,
      crop: cropMap[difficulty],
      timestamp: Date.now(),
      problemTitle: document.title.replace(' - LeetCode', '').trim(),
    };
    console.log('FarmCode: Sending message', msg);
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('FarmCode: sendMessage error', chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.warn('FarmCode: sendMessage failed', e.message);
      observer.disconnect();
    }
  }

  // ── Accepted detection — uses confirmed selector ────────

  const observer = new MutationObserver(() => {
    if (!isExtensionContextValid()) {
      observer.disconnect();
      return;
    }
    const greenParent = document.querySelector('[class*="text-green-s"]');
    if (greenParent && greenParent.textContent.includes('Accepted')) {
      const difficulty = getDifficulty();
      console.log('FarmCode: Detected Accepted!', difficulty);
      onProblemSolved(difficulty);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree:   true,
  });

  // ── URL change: reset guard for next submission ─────────

  let lastUrl = location.href;
  const urlInterval = setInterval(() => {
    if (!isExtensionContextValid()) {
      clearInterval(urlInterval);
      observer.disconnect();
      return;
    }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('FarmCode: URL changed', lastUrl);
    }
  }, 1000);

})();
