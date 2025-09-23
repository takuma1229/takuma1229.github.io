const SPREADSHEET_ID = '1T_U4kr51FBsZNq5wnhyAM7g8suxoQRLWNl1zSQYsAbA';
const COUNTER_SHEET_NAME = 'Counters';
const MESSAGE_SHEET_NAME = 'Messages';
const MAX_STORED_MESSAGES = 400;
const MAX_RESPONSE_MESSAGES = 20;

function doGet() {
  return createResponse({ ok: true, message: 'Use POST with an action parameter.' });
}

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return createResponse({ ok: false, error: 'NO_DATA' });
    }

    const payload = parsePayload(e.postData.getDataAsString());
    const action = String(payload.action || '').toLowerCase();
    const lang = (payload.lang || 'ja').toString().slice(0, 5).toLowerCase();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const counterSheet = ensureCounterSheet(ss);
    const messageSheet = ensureMessageSheet(ss);

    let result = { ok: true };

    switch (action) {
      case 'visit': {
        const visits = incrementCounter(counterSheet, 'visits', 1);
        const claps = getCounter(counterSheet, 'claps');
        result.visits = visits;
        result.claps = claps;
        result.messages = listMessages(messageSheet, lang);
        break;
      }
      case 'clap': {
        const claps = incrementCounter(counterSheet, 'claps', 1);
        const visits = getCounter(counterSheet, 'visits');
        result.claps = claps;
        result.visits = visits;
        break;
      }
      case 'message': {
        const name = sanitizeName(payload.name);
        const message = sanitizeMessage(payload.message);
        if (!message) {
          return createResponse({ ok: false, error: 'EMPTY_MESSAGE' });
        }
        appendMessage(messageSheet, { lang, name, message });
        result.messages = listMessages(messageSheet, lang);
        break;
      }
      case 'list': {
        result.visits = getCounter(counterSheet, 'visits');
        result.claps = getCounter(counterSheet, 'claps');
        result.messages = listMessages(messageSheet, lang);
        break;
      }
      default:
        return createResponse({ ok: false, error: 'UNKNOWN_ACTION' });
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function parsePayload(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function ensureCounterSheet(ss) {
  let sheet = ss.getSheetByName(COUNTER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(COUNTER_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Key', 'Value']);
  }
  return sheet;
}

function ensureMessageSheet(ss) {
  let sheet = ss.getSheetByName(MESSAGE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MESSAGE_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Lang', 'Name', 'Message']);
  }
  return sheet;
}

function getCounter(sheet, key) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const range = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < range.length; i += 1) {
    if (range[i][0] === key) {
      const value = Number(range[i][1]);
      return Number.isFinite(value) ? value : 0;
    }
  }
  return 0;
}

function incrementCounter(sheet, key, amount) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.appendRow([key, amount]);
    return amount;
  }

  const dataRange = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < dataRange.length; i += 1) {
    const rowIndex = i + 2;
    if (dataRange[i][0] === key) {
      const current = Number(sheet.getRange(rowIndex, 2).getValue()) || 0;
      const next = current + amount;
      sheet.getRange(rowIndex, 2).setValue(next);
      return next;
    }
  }

  const initial = amount;
  sheet.appendRow([key, initial]);
  return initial;
}

function appendMessage(sheet, entry) {
  sheet.appendRow([new Date(), entry.lang, entry.name, entry.message]);
  trimMessageSheet(sheet);
}

function trimMessageSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const maxRows = MAX_STORED_MESSAGES + 1; // include header row
  if (lastRow > maxRows) {
    const rowsToDelete = lastRow - maxRows;
    sheet.deleteRows(2, rowsToDelete);
  }
}

function listMessages(sheet, lang) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const range = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const results = [];
  for (let i = range.length - 1; i >= 0 && results.length < MAX_RESPONSE_MESSAGES; i -= 1) {
    const row = range[i];
    if (lang && row[1] && row[1].toString().toLowerCase() !== lang) {
      continue;
    }
    const timestamp = row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime();
    results.push({
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      lang: row[1] || lang,
      name: row[2] || 'Anonymous',
      message: row[3] || ''
    });
  }
  return results;
}

function sanitizeName(value) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 24) || 'Anonymous';
}

function sanitizeMessage(value) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 160);
}

function createResponse(payload) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  if (typeof output.setHeader === 'function') {
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return output;
}
