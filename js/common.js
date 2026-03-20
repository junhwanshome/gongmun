/**
 * js/common.js
 * 공통 유틸리티 - 전체 완성본
 */

/* ════════════════════════════════════════════════════════
   Storage - localStorage CRUD
════════════════════════════════════════════════════════ */
var Storage = {

  // 설정
  getSettings: function() {
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
    } catch(e) {
      return { orgName: '', approvalLevels: [], receivers: [] };
    }
  },

  saveSettings: function(settings) {
    try {
      localStorage.setItem('doc_settings', JSON.stringify(settings));
      return true;
    } catch(e) {
      return false;
    }
  },

  // 임시저장 문서
  getAllDrafts: function() {
    try {
      var list = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('draft_') === 0) {
          var item = JSON.parse(localStorage.getItem(key));
          if (item) list.push(item);
        }
      }
      list.sort(function(a, b) {
        return new Date(b.savedAt) - new Date(a.savedAt);
      });
      return list;
    } catch(e) { return []; }
  },

  getDraft: function(id) {
    try {
      var item = localStorage.getItem('draft_' + id);
      if (!item) {
        // id에 이미 draft_ 포함된 경우
        item = localStorage.getItem(id);
      }
      return item ? JSON.parse(item) : null;
    } catch(e) { return null; }
  },

  saveDraft: function(draft) {
    try {
      var key = 'draft_' + draft.id;
      localStorage.setItem(key, JSON.stringify(draft));
      return true;
    } catch(e) { return false; }
  },

  deleteDraft: function(id) {
    try {
      localStorage.removeItem('draft_' + id);
      localStorage.removeItem(id);
      return true;
    } catch(e) { return false; }
  },

  // 완성 문서
  getAllDocs: function() {
    try {
      var list = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('doc_') === 0 &&
            key !== 'doc_settings' &&
            key !== 'doc_logo' &&
            key !== 'doc_org_detail' &&
            key !== 'doc_cooperators') {
          var item = JSON.parse(localStorage.getItem(key));
          if (item) list.push(item);
        }
      }
      list.sort(function(a, b) {
        return new Date(b.completedAt || b.savedAt) - new Date(a.completedAt || a.savedAt);
      });
      return list;
    } catch(e) { return []; }
  },

  getDoc: function(id) {
    try {
      var item = localStorage.getItem('doc_' + id);
      if (!item) item = localStorage.getItem(id);
      return item ? JSON.parse(item) : null;
    } catch(e) { return null; }
  },

  saveDoc: function(doc) {
    try {
      var key = doc.id.indexOf('doc_') === 0 ? doc.id : 'doc_' + doc.id;
      localStorage.setItem(key, JSON.stringify(doc));
      return true;
    } catch(e) { return false; }
  },

  deleteDoc: function(id) {
    try {
      localStorage.removeItem('doc_' + id);
      localStorage.removeItem(id);
      return true;
    } catch(e) { return false; }
  }
};

/* ════════════════════════════════════════════════════════
   ExtendedStorage - 기관 상세정보
════════════════════════════════════════════════════════ */
var ExtendedStorage = {

  getOrgDetail: function() {
    try {
      var s = localStorage.getItem('doc_org_detail');
      return s ? JSON.parse(s) : {
        zipCode: '', address: '', homepage: '',
        tel: '', fax: '', email: '', disclosure: ''
      };
    } catch(e) {
      return { zipCode: '', address: '', homepage: '',
               tel: '', fax: '', email: '', disclosure: '' };
    }
  },

  saveOrgDetail: function(detail) {
    try {
      localStorage.setItem('doc_org_detail', JSON.stringify(detail));
      return true;
    } catch(e) { return false; }
  }
};

/* ════════════════════════════════════════════════════════
   LogoManager - 로고 이미지 관리
════════════════════════════════════════════════════════ */
var LogoManager = {

  save: function(file) {
    return new Promise(function(resolve) {
      if (!file) { resolve(false); return; }
      if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다.', 'error');
        resolve(false); return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('파일 크기는 2MB 이하여야 합니다.', 'error');
        resolve(false); return;
      }
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          localStorage.setItem('doc_logo', e.target.result);
          resolve(true);
        } catch(err) {
          showToast('로고 저장 실패: 저장 공간이 부족합니다.', 'error');
          resolve(false);
        }
      };
      reader.onerror = function() {
        showToast('파일 읽기에 실패했습니다.', 'error');
        resolve(false);
      };
      reader.readAsDataURL(file);
    });
  },

  get: function() {
    try { return localStorage.getItem('doc_logo') || null; }
    catch(e) { return null; }
  },

  remove: function() {
    try { localStorage.removeItem('doc_logo'); return true; }
    catch(e) { return false; }
  },

  exists: function() {
    return !!this.get();
  }
};

/* ════════════════════════════════════════════════════════
   Modal - 모달 열기/닫기
════════════════════════════════════════════════════════ */
var Modal = {
  open: function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },
  close: function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
};

/* ════════════════════════════════════════════════════════
   유틸리티 함수들
════════════════════════════════════════════════════════ */

// ID 생성
function generateId(prefix) {
  prefix = prefix || 'id';
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// 날짜 포맷: 2024. 1. 15.
function formatDate(date) {
  if (!date) date = new Date();
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return y + '. ' + m + '. ' + d + '.';
}

// 날짜 포맷 (짧게): 01/15 14:30
function formatDateShort(date) {
  if (!date) date = new Date();
  var m  = String(date.getMonth() + 1).padStart(2, '0');
  var d  = String(date.getDate()).padStart(2, '0');
  var hh = String(date.getHours()).padStart(2, '0');
  var mm = String(date.getMinutes()).padStart(2, '0');
  return m + '/' + d + ' ' + hh + ':' + mm;
}

// 오늘 날짜 문자열
function getTodayString() {
  return formatDate(new Date());
}

// HTML 이스케이프
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// 문자열 자르기
function truncate(str, len) {
  len = len || 30;
  if (!str) return '';
  return str.length > len ? str.substr(0, len) + '…' : str;
}

// URL 파라미터 파싱 ← 이게 핵심!
function getUrlParams() {
  var params = {};
  var search = window.location.search;
  if (!search) return params;
  var query = search.substring(1);
  var pairs = query.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    if (pair.length === 2) {
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
  }
  return params;
}

// 클립보드 복사
function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity  = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

// 나라 맞춤법 검사기 열기
function openSpellChecker() {
  window.open(
    'https://www.nara-speller.co.kr/speller/',
    'speller',
    'width=900,height=650,scrollbars=yes,resizable=yes'
  );
}

/* ════════════════════════════════════════════════════════
   Toast 알림
════════════════════════════════════════════════════════ */
function showToast(message, type) {
  type = type || 'info';

  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:9999;' +
      'display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  toast.style.cssText =
    'padding:10px 18px;border-radius:8px;font-size:0.88rem;' +
    'font-weight:500;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.15);' +
    'animation:toastIn .25s ease;min-width:200px;max-width:340px;' +
    'font-family:inherit;';

  var bgMap = {
    success: '#27ae60',
    error:   '#e74c3c',
    warning: '#f39c12',
    info:    '#3498db'
  };
  toast.style.background = bgMap[type] || bgMap.info;

  container.appendChild(toast);

  setTimeout(function() {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

/* ════════════════════════════════════════════════════════
   문서 목록 렌더링
════════════════════════════════════════════════════════ */
function renderDocList(docs, containerId, type) {
  var container = document.getElementById(containerId);
  if (!container) return;
  if (!docs || docs.length === 0) return;

  var iconMap = {
    internal:    '📋',
    government:  '🏛️',
    cooperation: '🤝',
    sponsor:     '💝',
    event:       '📢'
  };

  var html = '<div class="doc-list">';
  docs.forEach(function(doc) {
    var icon    = iconMap[doc.templateId] || '📄';
    var title   = escapeHtml(truncate(doc.title || '(제목 없음)', 28));
    var dateStr = formatDateShort(new Date(doc.savedAt || doc.completedAt || Date.now()));
    var docId   = escapeHtml(doc.id);
    var docType = type || 'draft';

    html +=
      '<div class="doc-list-item">' +
        '<span class="doc-icon">' + icon + '</span>' +
        '<div class="doc-info">' +
          '<span class="doc-title-text">' + title + '</span>' +
          '<span class="doc-date">' + dateStr + '</span>' +
        '</div>' +
        '<div class="doc-actions">' +
          '<button class="btn btn-sm btn-primary" ' +
            'onclick="editDocument(\'' + docId + '\',\'' + docType + '\')">수정</button>' +
          '<button class="btn btn-sm btn-secondary" ' +
            'onclick="openDocument(\'' + docId + '\',\'' + docType + '\')">보기</button>' +
          '<button class="btn btn-sm btn-danger" ' +
            'onclick="deleteDoc(\'' + docId + '\',\'' + docType + '\')">삭제</button>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

// 문서 수정 (에디터로 이동)
function editDocument(id, type) {
  window.location.href = 'editor.html?id=' + id + '&type=' + (type || 'draft');
}

// 문서 보기 (미리보기로 이동)
function openDocument(id, type) {
  window.location.href = 'preview.html?id=' + id + '&type=' + (type || 'draft');
}

// 문서 삭제
function deleteDoc(id, type) {
  if (!confirm('이 문서를 삭제하시겠습니까?')) return;
  if (type === 'doc') {
    Storage.deleteDoc(id);
  } else {
    Storage.deleteDraft(id);
  }
  showToast('문서가 삭제되었습니다.', 'info');
  setTimeout(function() { window.location.reload(); }, 800);
}

/* ════════════════════════════════════════════════════════
   자동저장 타이머
════════════════════════════════════════════════════════ */
function startAutoSave(callback, interval) {
  return setInterval(callback, interval || 30000);
}

function stopAutoSave(timerId) {
  if (timerId) clearInterval(timerId);
}

/* ════════════════════════════════════════════════════════
   doc-list 스타일 (동적 주입)
════════════════════════════════════════════════════════ */
(function injectDocListStyle() {
  if (document.getElementById('doc-list-style')) return;
  var style = document.createElement('style');
  style.id  = 'doc-list-style';
  style.textContent = [
    '.doc-list { display:flex; flex-direction:column; gap:8px; }',
    '.doc-list-item {',
    '  display:flex; align-items:center; gap:10px;',
    '  background:#fff; border:1px solid #e0e0e0; border-radius:8px;',
    '  padding:10px 14px; transition:.15s;',
    '}',
    '.doc-list-item:hover { border-color:#3498db; background:#f8fbff; }',
    '.doc-icon  { font-size:1.4rem; flex-shrink:0; }',
    '.doc-info  { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }',
    '.doc-title-text { font-size:0.9rem; font-weight:500; color:#2c3e50;',
    '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.doc-date  { font-size:0.78rem; color:#999; }',
    '.doc-actions { display:flex; gap:6px; flex-shrink:0; }',
    '@media(max-width:600px){',
    '  .doc-list-item { flex-wrap:wrap; }',
    '  .doc-actions   { width:100%; justify-content:flex-end; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
})();
