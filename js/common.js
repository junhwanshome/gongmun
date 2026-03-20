/**
 * js/common.js
 * 공통 유틸리티 - doc_drafts 배열 방식 + draft_ 개별 방식 모두 지원
 */

/* ══════════════════════════════════════════
   유틸 함수
══════════════════════════════════════════ */
function getUrlParams() {
  var p = {}, q = window.location.search.replace('?', '');
  if (!q) return p;
  q.split('&').forEach(function (pair) {
    var parts = pair.split('=');
    if (parts[0]) p[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
  });
  return p;
}

function generateId(prefix) {
  prefix = prefix || 'id';
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(str, len) {
  len = len || 30;
  if (!str) return '';
  return str.length > len ? str.substr(0, len) + '…' : str;
}

function getTodayString() {
  var d = new Date();
  return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
}

function formatDateShort(date) {
  if (!date) date = new Date();
  if (typeof date === 'string') date = new Date(date);
  var mo = String(date.getMonth() + 1).padStart(2, '0');
  var dd = String(date.getDate()).padStart(2, '0');
  var hh = String(date.getHours()).padStart(2, '0');
  var mm = String(date.getMinutes()).padStart(2, '0');
  return mo + '/' + dd + ' ' + hh + ':' + mm;
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
  } else {
    fallbackCopy(text);
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
}

function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.textContent = message;
  var bg = { success: '#27ae60', error: '#e74c3c', warning: '#e67e22', info: '#2980b9' };
  toast.style.cssText = 'padding:11px 20px;border-radius:8px;font-size:.88rem;font-weight:500;color:#fff;'
    + 'background:' + (bg[type] || bg.info) + ';box-shadow:0 4px 18px rgba(0,0,0,.18);'
    + 'min-width:180px;max-width:320px;font-family:inherit;pointer-events:auto;';
  container.appendChild(toast);
  setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

/* ══════════════════════════════════════════
   Modal
══════════════════════════════════════════ */
var Modal = {
  open: function (id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; el.classList.add('active'); }
  },
  close: function (id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('active'); }
  }
};

/* ══════════════════════════════════════════
   Storage
   - 임시저장: doc_drafts (배열) 방식 우선
     + draft_{id} 개별 방식도 병행 지원
   - 완성문서: doc_{id} 개별 키 방식
══════════════════════════════════════════ */
var Storage = {

  /* ── 설정 ── */
  getSettings: function () {
    try {
      var s = localStorage.getItem('doc_settings');
      return s ? JSON.parse(s) : {
        orgName: '',
        approvalLevels: [
          { title: '담당', name: '' },
          { title: '과장', name: '' },
          { title: '관장', name: '' }
        ],
        receivers: []
      };
    } catch (e) {
      return { orgName: '', approvalLevels: [], receivers: [] };
    }
  },

  saveSettings: function (s) {
    try { localStorage.setItem('doc_settings', JSON.stringify(s)); return true; }
    catch (e) { return false; }
  },

  /* ══════════════════════════════════════
     임시저장 — doc_drafts 배열 방식 우선
  ══════════════════════════════════════ */
  _getDraftsArray: function () {
    try {
      var raw = localStorage.getItem('doc_drafts');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        /* 객체(맵) 형태로 저장된 경우 배열로 변환 */
        if (typeof parsed === 'object' && parsed !== null) {
          return Object.values(parsed);
        }
      }
    } catch (e) {}
    return [];
  },

  _saveDraftsArray: function (arr) {
    try { localStorage.setItem('doc_drafts', JSON.stringify(arr)); return true; }
    catch (e) { return false; }
  },

  getAllDrafts: function () {
    /* 1) doc_drafts 배열 방식 */
    var list = this._getDraftsArray();

    /* 2) draft_{id} 개별 키 방식도 병합 */
    var ids = list.map(function (d) { return d.id; });
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('draft_') === 0) {
        try {
          var item = JSON.parse(localStorage.getItem(key));
          if (item && ids.indexOf(item.id) === -1) {
            list.push(item);
            ids.push(item.id);
          }
        } catch (e2) {}
      }
    }

    return list.sort(function (a, b) {
      return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
    });
  },

  getDraft: function (id) {
    /* doc_drafts 배열에서 먼저 찾기 */
    var list = this._getDraftsArray();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    /* draft_{id} 개별 키에서 찾기 */
    try {
      var raw = localStorage.getItem('draft_' + id) || localStorage.getItem(id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveDraft: function (draft) {
    /* doc_drafts 배열 방식으로 저장 */
    var list = this._getDraftsArray();
    var idx  = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === draft.id) { idx = i; break; }
    }
    if (idx >= 0) {
      list[idx] = draft;
    } else {
      list.unshift(draft);
    }
    var ok = this._saveDraftsArray(list);

    /* draft_{id} 개별 키에도 동시 저장 (호환성) */
    try { localStorage.setItem('draft_' + draft.id, JSON.stringify(draft)); } catch (e) {}

    return ok;
  },

  deleteDraft: function (id) {
    /* doc_drafts 배열에서 제거 */
    var list = this._getDraftsArray().filter(function (d) { return d.id !== id; });
    this._saveDraftsArray(list);
    /* 개별 키도 제거 */
    try { localStorage.removeItem('draft_' + id); } catch (e) {}
    try { localStorage.removeItem(id); } catch (e) {}
    return true;
  },

  /* ══════════════════════════════════════
     완성 문서 — doc_{id} 개별 키 방식
  ══════════════════════════════════════ */
  getAllDocs: function () {
    var list = [];
    var skip = ['doc_settings', 'doc_logo', 'doc_org_detail', 'doc_cooperators', 'doc_drafts'];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('doc_') === 0 && skip.indexOf(key) === -1) {
        try {
          var item = JSON.parse(localStorage.getItem(key));
          if (item) list.push(item);
        } catch (e) {}
      }
    }
    return list.sort(function (a, b) {
      return new Date(b.completedAt || b.savedAt || 0) - new Date(a.completedAt || a.savedAt || 0);
    });
  },

  getDoc: function (id) {
    try {
      var raw = localStorage.getItem('doc_' + id) || localStorage.getItem(id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveDoc: function (doc) {
    try {
      var key = (doc.id && doc.id.indexOf('doc_') === 0) ? doc.id : 'doc_' + doc.id;
      localStorage.setItem(key, JSON.stringify(doc));
      return true;
    } catch (e) { return false; }
  },

  deleteDoc: function (id) {
    try { localStorage.removeItem('doc_' + id); } catch (e) {}
    try { localStorage.removeItem(id); } catch (e) {}
    return true;
  }
};

/* ══════════════════════════════════════════
   ExtendedStorage — 기관 상세 정보
══════════════════════════════════════════ */
var ExtendedStorage = {
  getOrgDetail: function () {
    try { return JSON.parse(localStorage.getItem('doc_org_detail') || '{}'); }
    catch (e) { return {}; }
  },
  saveOrgDetail: function (d) {
    try { localStorage.setItem('doc_org_detail', JSON.stringify(d)); return true; }
    catch (e) { return false; }
  }
};

/* ══════════════════════════════════════════
   LogoManager
══════════════════════════════════════════ */
var LogoManager = {
  get: function () {
    try { return localStorage.getItem('doc_logo') || ''; } catch (e) { return ''; }
  },
  save: function (dataUrl) {
    try { localStorage.setItem('doc_logo', dataUrl); return true; } catch (e) { return false; }
  },
  remove: function () {
    try { localStorage.removeItem('doc_logo'); return true; } catch (e) { return false; }
  }
};
