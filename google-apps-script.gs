/**
 * REVENUE REGISTER — Google Sheets sync backend
 * -----------------------------------------------
 * Paste this whole file into the Apps Script editor of a Google Sheet
 * (Extensions > Apps Script), then deploy it as a Web App.
 * Full step-by-step instructions are in README.md.
 *
 * What it does:
 *  - POST { secret, action:'push', data: {...} }  -> saves the app's full
 *    state into a hidden "AppData" sheet as one JSON blob (simple + robust),
 *    and also mirrors the register, customers, deposits and momo
 *    confirmations into human-readable sheets so you (or your accountant)
 *    can view/filter them directly in Google Sheets.
 *  - GET  ?secret=...&action=pull  -> returns the saved JSON blob so the
 *    app can restore it on another device.
 */

const SHEET_APPDATA = 'AppData';
const SHEET_REGISTER = 'Register';
const SHEET_CUSTOMERS = 'Customers';
const SHEET_DEPOSITS = 'Deposits';
const SHEET_MOMO = 'MomoConfirmations';
const SHEET_BRANCHES = 'Branches';
const SHEET_CHEQUES = 'Cheques';

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET') || '';
}

function checkSecret_(provided) {
  const expected = getSecret_();
  // If no secret has been configured yet, allow through (first-time setup).
  if (!expected) return true;
  return provided === expected;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function doGet(e) {
  try {
    const action = (e.parameter.action || 'pull');
    if (!checkSecret_(e.parameter.secret)) return jsonOut_({ ok: false, error: 'Invalid secret' });
    if (action === 'pull') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = getOrCreateSheet_(ss, SHEET_APPDATA);
      const raw = sh.getRange('A1').getValue();
      if (!raw) return jsonOut_({ ok: true, data: null });
      return jsonOut_({ ok: true, data: JSON.parse(raw) });
    }
    return jsonOut_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!checkSecret_(body.secret)) return jsonOut_({ ok: false, error: 'Invalid secret' });
    if (body.action !== 'push') return jsonOut_({ ok: false, error: 'Unknown action' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = body.data || {};

    // 1) Save the raw JSON blob — this is the source of truth for pulling back into the app.
    const appDataSheet = getOrCreateSheet_(ss, SHEET_APPDATA);
    appDataSheet.getRange('A1').setValue(JSON.stringify(data));
    appDataSheet.getRange('B1').setValue(new Date());

    // 2) Mirror into readable sheets (best-effort; failures here don't block the save above).
    try { mirrorRegister_(ss, data); } catch (err) { /* ignore */ }
    try { mirrorCustomers_(ss, data); } catch (err) { /* ignore */ }
    try { mirrorDeposits_(ss, data); } catch (err) { /* ignore */ }
    try { mirrorMomo_(ss, data); } catch (err) { /* ignore */ }
    try { mirrorBranches_(ss, data); } catch (err) { /* ignore */ }
    try { mirrorCheques_(ss, data); } catch (err) { /* ignore */ }

    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function writeTable_(sh, header, rows) {
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  sh.setFrozenRows(1);
}

function branchNameOf_(data, id) {
  const b = (data.branches || []).find(function (x) { return x.id === id; });
  return b ? b.name : '';
}

function mirrorRegister_(ss, data) {
  const sh = getOrCreateSheet_(ss, SHEET_REGISTER);
  const entries = (data.entries || []).slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.seq || 0) - (b.seq || 0);
  });
  const header = ['Date', 'Branch', 'Line Type', 'Department', 'Customer', 'Cash', 'Cheque', 'Note'];
  const rows = entries.map(function (r) {
    return [r.date, branchNameOf_(data, r.branchId), r.lineType, r.department || '', r.customer || '', r.cash || 0, r.cheque || 0, r.note || ''];
  });
  writeTable_(sh, header, rows);
}

function mirrorCustomers_(ss, data) {
  const sh = getOrCreateSheet_(ss, SHEET_CUSTOMERS);
  const header = ['Name', 'Branch', 'Department', 'Contact', 'Opening Balance', 'Notes'];
  const rows = (data.customers || []).map(function (c) {
    return [c.name, branchNameOf_(data, c.branchId), c.department || '', c.contact || '', c.balance || '', c.notes || ''];
  });
  writeTable_(sh, header, rows);
}

function mirrorBranches_(ss, data) {
  const sh = getOrCreateSheet_(ss, SHEET_BRANCHES);
  const header = ['Name', 'Code'];
  const rows = (data.branches || []).map(function (b) { return [b.name, b.code || '']; });
  writeTable_(sh, header, rows);
}

function mirrorCheques_(ss, data) {
  const sh = getOrCreateSheet_(ss, SHEET_CHEQUES);
  const header = ['Due Date', 'Receipt Date', 'Drawer', 'Bank', 'Cheque Number', 'Amount', 'Department', 'Branch', 'Presented', 'Entry Date'];
  const rows = [];
  (data.entries || []).forEach(function (e) {
    (e.chequeDetails || []).forEach(function (cd) {
      rows.push([cd.dueDate || '', cd.receiptDate || '', cd.drawer || e.customer || '', cd.bank || '', cd.chequeNumber || '', cd.amount || 0, e.department || '', branchNameOf_(data, e.branchId), cd.presented ? 'Yes' : 'No', e.date]);
    });
  });
  writeTable_(sh, header, rows);
}

function mirrorDeposits_(ss, data) {
  const sh = getOrCreateSheet_(ss, SHEET_DEPOSITS);
  const banks = (data.coa && data.coa.banks) || [];
  const header = ['Date', 'Branch', 'Bank Account', 'Type', 'Amount', 'Staff', 'Reference', 'Verified', 'Notes'];
  const rows = (data.deposits || []).map(function (d) {
    const bank = banks.find(function (b) { return b.id === d.bankId; });
    return [d.date, branchNameOf_(data, d.branchId), bank ? (bank.name + ' (' + bank.code + ')') : '', d.type, d.amount, d.staff, d.reference || '', d.verified ? 'Yes' : 'No', d.notes || ''];
  });
  writeTable_(sh, header, rows);
}

function mirrorMomo_(ss, data) {
  const sh = getOrCreateSheet_(ss, SHEET_MOMO);
  const wallets = (data.coa && data.coa.momo) || [];
  const header = ['Date', 'Branch', 'Wallet', 'Department', 'Amount', 'Staff', 'Reference', 'Confirmed', 'Notes'];
  const rows = (data.momoConfirmations || []).map(function (m) {
    const w = wallets.find(function (x) { return x.id === m.walletId; });
    return [m.date, branchNameOf_(data, m.branchId), w ? (w.name + ' (' + w.code + ')') : '', m.department || '', m.amount, m.staff, m.reference || '', m.confirmed ? 'Yes' : 'No', m.notes || ''];
  });
  writeTable_(sh, header, rows);
}

/**
 * Run this once from the Apps Script editor (select function, click Run)
 * to set your shared secret. Change YOUR-SECRET-HERE first.
 */
function setSharedSecretOnce() {
  PropertiesService.getScriptProperties().setProperty('SHARED_SECRET', 'YOUR-SECRET-HERE');
}
