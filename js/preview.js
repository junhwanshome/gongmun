(function () {
  'use strict';

  let currentDoc = null;
  let currentType = 'draft';

  /* ── 초기화 ─────────────────────────────────────────── */
  function initPreview() {
    const params = new URLSearchParams(location.search);
    const id     = params.get('id');
    currentType  = params.get('type') || 'draft';

    if (!id) { showError('문서 ID가 없습니다.'); return; }

    // 1) 완성 문서 우선
    try {
      const docs = JSON.parse(localStorage.getItem('doc_completed') || '[]');
      currentDoc = docs.find(d => d.id === id) || null;
      if (currentDoc) { currentType = 'completed'; }
    } catch (e) {}

    // 2) 임시저장 배열
    if (!currentDoc) {
      try {
        const drafts = JSON.parse(localStorage.getItem('doc_drafts') || '[]');
        currentDoc = drafts.find(d => d.id === id) || null;
        if (currentDoc) { currentType = 'draft'; }
      } catch (e) {}
    }

    // 3) 개별 draft_ 키
    if (!currentDoc) {
      const raw = localStorage.getItem('draft_' + id);
      if (raw) { try { currentDoc = JSON.parse(raw); currentType = 'draft'; } catch (e) {} }
    }

    if (!currentDoc) { showError('문서를 찾을 수 없습니다.'); return; }

    renderPreview(currentDoc);
    updateStatus();
  }

  /* ── 상태 배지 ──────────────────────────────────────── */
  function updateStatus() {
    const badge = document.getElementById('status-badge');
    if (!badge) return;
    if (currentType === 'completed') {
      badge.textContent = '완성';
      badge.className = 'badge badge-completed';
      const btn = document.getElementById('btn-complete');
      if (btn) btn.disabled = true;
    } else {
      badge.textContent = '임시저장';
      badge.className = 'badge badge-draft';
    }
  }

  /* ── 문서 렌더링 ─────────────────────────────────────── */
  function renderPreview(doc) {
    const container = document.getElementById('doc-preview');
    if (!container) return;

    const settings = (() => {
      try { return JSON.parse(localStorage.getItem('doc_settings') || '{}'); } catch (e) { return {}; }
    })();
    const orgDetail = (() => {
      try { return JSON.parse(localStorage.getItem('doc_org_detail') || '{}'); } catch (e) { return {}; }
    })();

    const orgName  = settings.orgName  || orgDetail.orgName  || '○○기관';
    const f        = doc.fields || {};
    const tmpl     = doc.templateId || 'internal';

    const title    = f.title    || doc.title || '(제목 없음)';
    const receiver = f.receiver || '';
    const via      = f.via      || '';
    const ref      = f.reference || f.ref || '';
    const docNum   = f.docNumber || f.docNum || '';
    const dateStr  = f.date     || doc.date  || '';

    let html = '';

    /* ── doc-paper-inner: flex column으로 본문↑ 기관정보↓ ── */
    html += `<div class="doc-paper-inner">`;

    /* ━━━ 상단 본문 영역 ━━━ */
    html += `<div class="doc-main-area">`;

    /* ① 기관명 */
    html += `
      <div class="doc-header-area">
        <div class="doc-org-name">${escapeHtml(orgName)}</div>
      </div>`;

    /* ② 수신·경유·참조 */
    html += `<div class="doc-meta-area">`;
    html += `
      <div class="doc-meta-row">
        <span class="doc-meta-label">수&nbsp;&nbsp;&nbsp;&nbsp;신</span>
        <span class="doc-meta-colon">:</span>
        <span class="doc-meta-value">${escapeHtml(receiver)}</span>
      </div>`;
    if (via) {
      html += `
      <div class="doc-meta-row">
        <span class="doc-meta-label">경&nbsp;&nbsp;&nbsp;&nbsp;유</span>
        <span class="doc-meta-colon">:</span>
        <span class="doc-meta-value">${escapeHtml(via)}</span>
      </div>`;
    }
    if (ref) {
      html += `
      <div class="doc-meta-row">
        <span class="doc-meta-label">참&nbsp;&nbsp;&nbsp;&nbsp;조</span>
        <span class="doc-meta-colon">:</span>
        <span class="doc-meta-value">${escapeHtml(ref)}</span>
      </div>`;
    }
    html += `</div>`;

    /* ③ 제목 */
    html += `
      <div class="doc-title-area">
        <span class="doc-title-label">제&nbsp;&nbsp;&nbsp;&nbsp;목</span>
        <span class="doc-title-colon">:</span>
        <span class="doc-title-text">${escapeHtml(title)}</span>
      </div>`;

    /* ★ 구분선 1: 제목 바로 아래 ★ */
    html += `<hr class="doc-title-divider">`;

    /* ④ 본문 */
    html += `<div class="doc-body-area">${buildBody(f, tmpl)}</div>`;

    /* ⑤ 붙임 */
    const attachments = f.attachments || f.attach || '';
    if (attachments) {
      html += `
      <div class="doc-attach-area">
        <span class="doc-attach-label">붙&nbsp;&nbsp;&nbsp;&nbsp;임</span>
        <span class="doc-attach-colon">:</span>
        <span class="doc-attach-value">${escapeHtml(attachments)}</span>
      </div>`;
    }

    html += `</div>`;
    /* ━━━ 상단 본문 영역 끝 ━━━ */

    /* ━━━ 하단 기관정보 블록 (항상 용지 하단 고정) ━━━ */
    html += `<div class="doc-org-footer">`;

    /* ⑥ 발신명의 */
    const senderName = f.senderName || orgName;
    html += `
      <div class="doc-sender-area">
        <span class="doc-sender-value">${escapeHtml(senderName)}</span>
      </div>`;

    /* ★ 구분선 2: 발신명의 바로 아래 ★ */
    html += `<hr class="doc-sender-divider">`;

    /* ⑦ 결재란 + 협조자 */
    html += renderApprovalBlock(doc, settings, orgDetail);

    /* ⑧ 시행·접수 행 */
    html += renderExecRow(doc, settings, orgDetail, docNum, dateStr);

    /* ⑨ 주소·연락처 */
    html += renderFooterInfo(doc, settings, orgDetail);

    html += `</div>`;
    /* ━━━ 하단 기관정보 블록 끝 ━━━ */

    html += `</div>`;
    /* ── doc-paper-inner 끝 ── */

    container.innerHTML = html;
  }

  /* ── 본문 빌더 ──────────────────────────────────────── */
  function buildBody(f, tmpl) {
    const body = f.body || f.content || '';
    if (!body) return '<p style="color:#aaa;">(본문 없음)</p>';
    return `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`;
  }

  /* ── ⑦ 결재란 + 협조자 ──────────────────────────────── */
  function renderApprovalBlock(doc, settings, orgDetail) {
    const approvers   = settings.approvers   || orgDetail.approvers   || [];
    const cooperators = settings.cooperators || orgDetail.cooperators || '';

    const approverList = approvers.length
      ? approvers
      : [
          { title: '담당',    name: '' },
          { title: '사무국장', name: '' },
          { title: '원장',    name: '' }
        ];

    let html = '<div class="doc-approval-wrap">';

    /* 결재자: 한 줄 가로 나열 */
    html += '<div class="doc-approval-row">';
    approverList.forEach(ap => {
      html += `
        <div class="doc-approval-cell">
          <div class="doc-approval-title">${escapeHtml(ap.title || '')}</div>
          <div class="doc-approval-sign"></div>
          <div class="doc-approval-name">${escapeHtml(ap.name || '')}</div>
        </div>`;
    });
    html += '</div>';

    /* 협조자 */
    html += `
      <div class="doc-cooperator-row">
        <span class="doc-cooperator-label">협&nbsp;조&nbsp;자</span>
        <span class="doc-cooperator-value">${escapeHtml(cooperators)}</span>
      </div>`;

    html += '</div>';
    return html;
  }

  /* ── ⑧ 시행·접수 행 ─────────────────────────────────── */
  function renderExecRow(doc, settings, orgDetail, docNum, dateStr) {
    const orgCode  = settings.orgCode  || orgDetail.orgCode
                  || orgDetail.orgName || settings.orgName || '○○';
    const execNum  = docNum
      ? `${orgCode} ${docNum}`
      : `${orgCode} ${new Date().getFullYear()} - `;
    const execDate = dateStr
      ? `(${dateStr})`
      : `(${new Date().getFullYear()}.　.　.)`;

    return `
      <div class="doc-exec-row">
        <span class="doc-exec-label">시&nbsp;&nbsp;&nbsp;행</span>
        <span class="doc-exec-value">${escapeHtml(execNum)}&nbsp;&nbsp;${escapeHtml(execDate)}</span>
        <span class="doc-exec-spacer"></span>
        <span class="doc-exec-label">접&nbsp;&nbsp;&nbsp;수</span>
        <span class="doc-exec-recv">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
      </div>`;
  }

  /* ── ⑨ 주소·연락처: hr 완전 없음 ───────────────────── */
  function renderFooterInfo(doc, settings, orgDetail) {
    const zip      = orgDetail.zip      || settings.zip      || '';
    const addr     = orgDetail.address  || settings.address  || '';
    const homepage = orgDetail.homepage || settings.homepage || '';
    const tel      = orgDetail.tel      || settings.tel      || '';
    const fax      = orgDetail.fax      || settings.fax      || '';
    const email    = orgDetail.email    || settings.email    || '';
    const openness = orgDetail.openness || settings.openness || '공개';

    let addrStr = '';
    if (zip)      addrStr += `우 ${escapeHtml(zip)}&nbsp;&nbsp;`;
    if (addr)     addrStr += `주소 ${escapeHtml(addr)}`;
    if (homepage) addrStr += `&nbsp;/&nbsp;${escapeHtml(homepage)}`;

    let contactStr = '';
    if (tel)      contactStr += `전화(${escapeHtml(tel)})`;
    if (fax)      contactStr += `&nbsp;&nbsp;전송(${escapeHtml(fax)})`;
    if (email)    contactStr += `&nbsp;/&nbsp;${escapeHtml(email)}`;
    if (openness) contactStr += `&nbsp;/&nbsp;${escapeHtml(openness)}`;

    return `
      <div class="doc-footer-wrap">
        <div class="doc-footer-addr">${addrStr}</div>
        <div class="doc-footer-contact">${contactStr}</div>
      </div>`;
  }

  /* ── 유틸 ───────────────────────────────────────────── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showError(msg) {
    const c = document.getElementById('doc-preview');
    if (c) c.innerHTML = `<p style="color:red;padding:40px;">${escapeHtml(msg)}</p>`;
  }

  /* ── 이벤트 바인딩 ──────────────────────────────────── */
  function bindEvents() {
    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.addEventListener('click', () => history.back());

    const btnEdit = document.getElementById('btn-edit');
    if (btnEdit) btnEdit.addEventListener('click', () => {
      if (!currentDoc) return;
      location.href = `editor.html?id=${currentDoc.id}&type=${currentType}`;
    });

    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) btnCopy.addEventListener('click', () => {
      const el = document.getElementById('doc-preview');
      if (!el) return;
      navigator.clipboard.writeText(el.innerText || '')
        .then(() => alert('복사되었습니다.'))
        .catch(() => alert('복사에 실패했습니다.'));
    });

    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    const btnComplete = document.getElementById('btn-complete');
    if (btnComplete) btnComplete.addEventListener('click', saveAsComplete);

    const btnDelete = document.getElementById('btn-delete');
    if (btnDelete) btnDelete.addEventListener('click', doDelete);

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); window.print(); }
    });
  }

  /* ── 완성 저장 ──────────────────────────────────────── */
  function saveAsComplete() {
    if (!currentDoc) return;
    try {
      const list = JSON.parse(localStorage.getItem('doc_completed') || '[]');
      const idx  = list.findIndex(d => d.id === currentDoc.id);
      const item = Object.assign({}, currentDoc, { completedAt: new Date().toISOString() });
      if (idx >= 0) list[idx] = item; else list.push(item);
      localStorage.setItem('doc_completed', JSON.stringify(list));
      currentType = 'completed';
      updateStatus();
      alert('완성 문서함에 저장되었습니다.');
    } catch (e) {
      alert('저장에 실패했습니다.');
    }
  }

  /* ── 삭제 ───────────────────────────────────────────── */
  function doDelete() {
    if (!currentDoc) return;
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;
    try {
      ['doc_drafts', 'doc_completed'].forEach(key => {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        const next = list.filter(d => d.id !== currentDoc.id);
        localStorage.setItem(key, JSON.stringify(next));
      });
      localStorage.removeItem('draft_' + currentDoc.id);
      location.href = 'index.html';
    } catch (e) {
      alert('삭제에 실패했습니다.');
    }
  }

  /* ── 진입점 ─────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initPreview();
    bindEvents();
  });

})();
