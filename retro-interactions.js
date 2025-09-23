(function () {
  const lang = (document.documentElement.lang || 'ja').toLowerCase();
  const storagePrefix = 'takuma_site_';
  const localKeys = {
    visits: `${storagePrefix}visits_${lang}`,
    claps: `${storagePrefix}claps`,
    bbs: `${storagePrefix}bbs_entries_${lang}`
  };
  const MAX_ENTRIES = 20;
  const endpoint = typeof window !== 'undefined' && window.__GAS_ENDPOINT__ ? String(window.__GAS_ENDPOINT__).trim() : '';

  const state = {
    remote: Boolean(endpoint),
    counters: {
      visits: Number(localStorage.getItem(localKeys.visits) || '0') || 0,
      claps: Number(localStorage.getItem(localKeys.claps) || '0') || 0
    },
    messages: [],
    refs: {}
  };

  function formatCount(num) {
    const safeNum = Number.isFinite(num) ? num : 0;
    return safeNum.toString().padStart(6, '0');
  }

  function createTextOutput(content) {
    if (!content) {
      return lang === 'ja' ? 'まだ書き込みはありません。' : 'No messages yet.';
    }
    return content;
  }

  async function sendRequest(action, payload) {
    if (!state.remote) return null;
    try {
      const body = JSON.stringify({ action, lang, ...(payload || {}) });
      const res = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || data.ok === false) {
        throw new Error(data && data.error ? data.error : 'Unknown error');
      }
      return data;
    } catch (error) {
      console.warn('GAS request failed:', error);
      state.remote = false;
      return null;
    }
  }

  function updateCounterDisplay(value) {
    const span = state.refs.counterSpan;
    if (span) {
      span.textContent = formatCount(Number(value) || 0);
    }
  }

  function updateClapDisplay(value) {
    const span = state.refs.clapSpan;
    if (span) {
      span.textContent = Number(value) || 0;
    }
  }

  function formatDate(timestamp) {
    const date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const locale = lang === 'ja' ? 'ja-JP' : undefined;
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderMessages(entries) {
    const list = state.refs.bbsList;
    if (!list) return;

    list.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'bbs-entry';
      empty.textContent = createTextOutput('');
      list.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'bbs-entry';

      const meta = document.createElement('div');
      meta.className = 'bbs-entry__meta';
      meta.textContent = `${entry.name} / ${formatDate(entry.timestamp)}`;

      const message = document.createElement('div');
      message.className = 'bbs-entry__message';
      message.textContent = entry.message;

      item.appendChild(meta);
      item.appendChild(message);
      list.appendChild(item);
    });
  }

  function sanitize(input) {
    return String(input || '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 24);
  }

  function sanitizeMessage(input) {
    return String(input || '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 160);
  }

  function localIncrementVisit() {
    const current = Number(localStorage.getItem(localKeys.visits) || '0') || 0;
    const next = current + 1;
    localStorage.setItem(localKeys.visits, String(next));
    return next;
  }

  function localIncrementClap() {
    const current = Number(localStorage.getItem(localKeys.claps) || '0') || 0;
    const next = current + 1;
    localStorage.setItem(localKeys.claps, String(next));
    return next;
  }

  function localSaveMessages(entries) {
    try {
      const payload = entries.slice(0, MAX_ENTRIES).map((entry) => ({
        name: entry.name,
        message: entry.message,
        timestamp: entry.timestamp,
        lang
      }));
      localStorage.setItem(localKeys.bbs, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to save local messages', error);
    }
  }

  function localLoadMessages() {
    try {
      const raw = localStorage.getItem(localKeys.bbs);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => (entry.lang || lang) === lang)
        .map((entry) => ({
          name: sanitize(entry.name) || (lang === 'ja' ? '匿名さん' : 'Anonymous'),
          message: sanitizeMessage(entry.message),
          timestamp: Number(entry.timestamp) || Date.now()
        }))
        .filter((entry) => entry.message)
        .slice(0, MAX_ENTRIES);
    } catch (error) {
      console.warn('Failed to load local messages', error);
      return [];
    }
  }

  function normalizeMessages(entries) {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) => {
        const message = sanitizeMessage(entry.message);
        if (!message) return null;
        const rawTimestamp = entry.timestamp || entry.ts || Date.now();
        const parsed = new Date(rawTimestamp);
        const timestamp = Number.isFinite(parsed.getTime()) ? parsed.getTime() : Date.now();
        return {
          name: sanitize(entry.name) || (lang === 'ja' ? '匿名さん' : 'Anonymous'),
          message,
          timestamp
        };
      })
      .filter(Boolean)
      .slice(0, MAX_ENTRIES);
  }

  function syncLocalState() {
    localStorage.setItem(localKeys.visits, String(state.counters.visits));
    localStorage.setItem(localKeys.claps, String(state.counters.claps));
    localSaveMessages(state.messages);
  }

  async function handleVisit() {
    if (state.remote) {
      const response = await sendRequest('visit');
      if (response) {
        if (Number.isFinite(Number(response.visits))) {
          state.counters.visits = Number(response.visits);
        }
        if (Number.isFinite(Number(response.claps))) {
          state.counters.claps = Number(response.claps);
        }
        state.messages = normalizeMessages(response.messages);
        updateCounterDisplay(state.counters.visits);
        updateClapDisplay(state.counters.claps);
        syncLocalState();
        renderMessages(state.messages);
        return;
      }
    }

    state.counters.visits = localIncrementVisit();
    state.counters.claps = Number(localStorage.getItem(localKeys.claps) || '0') || 0;
    updateCounterDisplay(state.counters.visits);
    updateClapDisplay(state.counters.claps);
    state.messages = localLoadMessages();
    renderMessages(state.messages);
  }

  function setupClapButton() {
    const button = state.refs.clapButton;
    if (!button) return;

    button.addEventListener('click', async () => {
      button.disabled = true;
      let handled = false;

      if (state.remote) {
        const response = await sendRequest('clap');
        if (response) {
          if (Number.isFinite(Number(response.claps))) {
            state.counters.claps = Number(response.claps);
          } else {
            state.counters.claps += 1;
          }
          if (Number.isFinite(Number(response.visits))) {
            state.counters.visits = Number(response.visits);
          }
          handled = true;
        }
      }

      if (!handled) {
        state.counters.claps = localIncrementClap();
      }

      updateClapDisplay(state.counters.claps);
      syncLocalState();
      button.classList.add('clap-button--active');
      window.setTimeout(() => button.classList.remove('clap-button--active'), 260);
      button.disabled = false;
    });
  }

  function setupBbs() {
    const form = state.refs.bbsForm;
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const rawName = formData.get('name') || '';
      const rawMessage = formData.get('message') || '';
      const name = sanitize(rawName) || (lang === 'ja' ? '匿名さん' : 'Anonymous');
      const message = sanitizeMessage(rawMessage);

      if (!message) {
        return;
      }

      if (state.remote) {
        const response = await sendRequest('message', { name, message });
        if (response) {
          state.messages = normalizeMessages(response.messages);
          renderMessages(state.messages);
          syncLocalState();
          form.reset();
          return;
        }
      }

      const newEntry = {
        name,
        message,
        timestamp: Date.now()
      };
      state.messages = [newEntry, ...localLoadMessages()].slice(0, MAX_ENTRIES);
      localSaveMessages(state.messages);
      renderMessages(state.messages);
      form.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    state.refs = {
      counterSpan: document.getElementById('visit-count'),
      clapSpan: document.getElementById('clap-count'),
      clapButton: document.getElementById('clap-button'),
      bbsForm: document.getElementById('bbs-form'),
      bbsList: document.getElementById('bbs-list')
    };

    updateCounterDisplay(state.counters.visits);
    updateClapDisplay(state.counters.claps);
    state.messages = localLoadMessages();
    renderMessages(state.messages);

    await handleVisit();
    setupClapButton();
    setupBbs();
  });
})();
