// js/common.js
// 공통 기능 모음

// =====================
// localStorage 관리
// =====================
const Storage = {

  getSettings() {
    const data = localStorage.getItem('doc_settings');
    return data ? JSON.parse(data) : {
      orgName: '',
      approvalLevels: [
        { title: '담당', name: '' },
        { title: '과장', name: '' },
        { title: '관장', name: '' }
      ],
      cooperators: [],
      receivers: [
        { name: '○○시장', dept: '사회복지과장' },
        { name: '○○구청장', dept: '복지정책과장' },
        {
          name: '○○사회복지협의회장',
          dept: '사무국장'
        }
      ]
    };
  },

  saveSettings(settings) {
    localStorage.setItem(
      'doc_settings',
      JSON.stringify(settings)
    );
  },

  getDrafts() {
    const data = localStorage.getItem('doc_drafts');
    return data ? JSON.parse(data) : [];
  },

  saveDraft(draft) {
    const drafts = this.getDrafts();
    const idx = drafts.findIndex(
      d => d.id === draft.id
    );
    if (idx > -1) {
      drafts[idx] = draft;
    } else {
      drafts.unshift(draft);
    }
    if (drafts.length > 20) drafts.pop();
    localStorage.setItem(
      'doc_drafts',
      JSON.stringify(drafts)
    );
  },

  deleteDraft(id) {
    const drafts = this.getDrafts()
      .filter(d => d.id !== id);
    localStorage.setItem(
      'doc_drafts',
      JSON.stringify(drafts)
    );
  },

  getDraftById(id) {
    return this.getDrafts()
      .find(d => d.id === id) || null;
  },

  getDocuments() {
    const data = localStorage.getItem('doc_documents');
    return data ? JSON.parse(data) : [];
  },

  saveDocument(doc) {
    const docs = this.getDocuments();
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx > -1) {
      docs[idx] = doc;
    } else {
      docs.unshift(doc);
    }
    if (docs.length > 100) docs.pop();
    localStorage.setItem(
      'doc_documents',
      JSON.stringify(docs)
    );
  },

  deleteDocument(id) {
    const docs = this.getDocuments()
      .filter(d => d.id !== id);
    localStorage.setItem(
      'doc_documents',
      JSON.stringify(docs)
    );
  },

  getDocumentById(id) {
    return this.getDocuments()
      .find(d => d.id === id) || null;
  }
};

// =====================
// 기관 상세 정보 관리
// =====================
const ExtendedStorage = {

  getOrgDetail() {
    const data = localStorage.getItem('doc_org_detail');
    return data ? JSON.parse(data) : {
      zipCode: '',
      address: '',
      homepage: '',
      tel: '',
      fax: '',
      email: '',
      disclosure: '공개'
    };
  },

  saveOrgDetail(detail) {
    localStorage.setItem(
      'doc_org_detail',
      JSON.stringify(detail)
    );
  }
};

// =====================
// 로고 이미지 관리
// =====================
const LogoManager = {

  save(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject('파일이 없어요');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        reject('파일 크기는 2MB 이하여야 해요');
        return;
      }

      if (!file.type.startsWith('image/')) {
        reject('이미지 파일만 업로드 가능해요');
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          localStorage.setItem(
            'doc_logo',
            e.target.result
          );
          resolve(e.target.result);
        } catch (err) {
          reject('저장 실패! 용량을 확인해주세요');
        }
      };

      reader.onerror = () => {
        reject('파일 읽기 실패');
      };

      reader.readAsDataURL(file);
    });
  },

  get() {
    return localStorage.getItem('doc_logo') || null;
  },

  remove() {
    localStorage.removeItem('doc_logo');
  },

  exists() {
    return !!localStorage.getItem('doc_logo');
  }
};

// =====================
// ID 생성
// =====================
function generateId() {
  return Date.now().toString(36) +
    Math.random().toString(36).substr(2);
}

// =====================
// 날짜 포맷
// =====================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours()
    .toString().padStart(2, '0');
  const min = date.getMinutes()
    .toString().padStart(2, '0');
  return `${y}. ${m}. ${d}. ${h}:${min}`;
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}. ${m}. ${d}.`;
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}. ${m}. ${d}.`;
}

// =====================
// 토스트 알림
// =====================
function showToast(message, type = 'default',
  duration = 3000) {

  let container = document.getElementById(
    'toast-container'
  );
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    default: 'ℹ️'
  };

  toast.innerHTML = `
    <span>${icons[type] || icons.default}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// =====================
// 모달 관리
// =====================
const Modal = {
  open(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  },

  close(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  },

  closeAll() {
    document.querySelectorAll(
      '.modal-overlay.show'
    ).forEach(m => {
      m.classList.remove('show');
    });
    document.body.style.overflow = '';
  }
};

// 모달 외부 클릭시 닫기
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    Modal.closeAll();
  }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    Modal.closeAll();
  }
});

// =====================
// 팝업 창 열기
// =====================
function openSpellChecker() {
  const width = 900;
  const height = 650;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(
    'https://www.nara-speller.co.kr/speller/',
    '맞춤법검사기',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
}

// =====================
// 클립보드 복사
// =====================
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('클립보드에 복사되었어요!', 'success');
    return true;
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('클립보드에 복사되었어요!', 'success');
    return true;
  }
}

// =====================
// 문서 목록 렌더링
// =====================
function renderDocList(docs, containerId,
  type = 'draft') {

  const container = document.getElementById(containerId);
  if (!container) return;

  if (docs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>${type === 'draft' ? '📝' : '✅'}</span>
        <p>${type === 'draft'
          ? '임시저장된 문서가 없어요'
          : '완성된 문서가 없어요'
        }</p>
      </div>
    `;
    return;
  }

  container.innerHTML = docs.map(doc => `
    <div class="doc-item"
      onclick="openDocument(
        '${doc.id}', '${type}'
      )">
      <div class="doc-item-info">
        <div class="doc-item-title">
          ${TEMPLATES[doc.templateId]?.icon || '📄'}
          ${doc.title || '제목 없음'}
        </div>
        <div class="doc-item-meta">
          <span class="doc-item-badge">
            ${TEMPLATES[doc.templateId]?.name || '문서'}
          </span>
          <span>${formatDate(doc.updatedAt)}</span>
        </div>
      </div>
      <div class="doc-item-actions">
        <button class="btn btn-sm btn-outline"
          onclick="event.stopPropagation();
            editDocument('${doc.id}', '${type}')">
          수정
        </button>
        <button class="btn btn-sm btn-danger"
          onclick="event.stopPropagation();
            deleteDoc('${doc.id}', '${type}')">
          삭제
        </button>
      </div>
    </div>
  `).join('');
}

// =====================
// 문서 열기/수정/삭제
// =====================
function openDocument(id, type) {
  window.location.href =
    `preview.html?id=${id}&type=${type}`;
}

function editDocument(id, type) {
  window.location.href =
    `editor.html?id=${id}&type=${type}`;
}

function deleteDoc(id, type) {
  if (!confirm('정말 삭제할까요?')) return;

  if (type === 'draft') {
    Storage.deleteDraft(id);
    showToast('임시저장 문서를 삭제했어요', 'success');
  } else {
    Storage.deleteDocument(id);
    showToast('완성 문서를 삭제했어요', 'success');
  }

  setTimeout(() => location.reload(), 500);
}

// =====================
// URL 파라미터
// =====================
function getUrlParam(name) {
  const params = new URLSearchParams(
    window.location.search
  );
  return params.get(name);
}

// =====================
// 문자열 유틸
// =====================
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen
    ? str.substring(0, maxLen) + '...'
    : str;
}

// =====================
// 자동저장 타이머
// =====================
let autoSaveTimer = null;

function startAutoSave(callback, delay = 30000) {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    callback();
  }, delay);
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}
