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

    try {
      const docs = JSON.parse(localStorage.getItem('doc_completed') || '[]');
      currentDoc = docs.find(d => d.id === id) || null;
      if (currentDoc) { currentType = 'completed'; }
    } catch (e) {}

    if (!currentDoc) {
      try {
        const drafts = JSON.parse(localStorage.getItem('doc_drafts') || '[]');
        currentDoc = drafts.find(d => d.id === id) || null;
        if (currentDoc) { currentType = 'draft'; }
      } catch (e) {}
    }

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
    html += `<div class="doc-paper-inner">`;
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
    html += `<div class="doc-body-area">${buildBody(f.body || f.content || '')}</div>`;

    /* ⑤ 붙임 */
    html += renderAttachments(f);

    html += `</div>`;

    /* ━━━ 하단 기관정보 블록 ━━━ */
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
    html += `</div>`;

    container.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════
     본문 빌더 – 공문서 규칙 전체 적용
  ═══════════════════════════════════════════════════════ */
  function buildBody(raw) {
    if (!raw || !raw.trim()) return '<p class="body-empty">(본문 없음)</p>';

    raw = applyTermReplace(raw);
    raw = applyDateFormat(raw);

    const lines = raw.split('\n');
    let html = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        html += '<div class="body-blank"></div>';
        continue;
      }
      const parsed = parseBodyLine(line);
      html += renderBodyLine(parsed);
    }

    return html;
  }

  /* ── 항목 기호 감지 ──────────────────────────────────── */
  function parseBodyLine(line) {
    const patterns = [
      { level: 8, re: /^(\s*)(㉮|㉯|㉰|㉱|㉲|㉳|㉴|㉵|㉶|㉷|㉸|㉹|㉺|㉻)\s(.+)/ },
      { level: 7, re: /^(\s*)(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)\s(.+)/ },
      { level: 6, re: /^(\s*)\((가|나|다|라|마|바|사|아|자|차|카|타|파|하)\)\s(.+)/ },
      { level: 5, re: /^(\s*)\((\d+)\)\s(.+)/ },
      { level: 4, re: /^(\s*)(가|나|다|라|마|바|사|아|자|차|카|타|파|하)\)\s(.+)/ },
      { level: 3, re: /^(\s*)(\d+)\)\s(.+)/ },
      { level: 2, re: /^(\s*)(가|나|다|라|마|바|사|아|자|차|카|타|파|하)\.\s(.+)/ },
      { level: 1, re: /^(\s*)(\d+)\.\s(.+)/ },
    ];

    for (const p of patterns) {
      const m = line.match(p.re);
      if (m) {
        let symbol;
        if (p.level === 5)      symbol = `(${m[2]})`;
        else if (p.level === 6) symbol = `(${m[2]})`;
        else if (p.level === 7 || p.level === 8) symbol = m[2];
        else if (p.level === 3 || p.level === 4) symbol = `${m[2]})`;
        else                    symbol = `${m[2]}.`;
        return { level: p.level, symbol, content: m[3].trim() };
      }
    }

    return { level: 0, symbol: '', content: line };
  }

  /* ── 항목 줄 HTML 생성 ───────────────────────────────── */
  function renderBodyLine(parsed) {
    const { level, symbol, content } = parsed;

    /* ★ 들여쓰기: 2단계=2em, 3단계=4em, 4단계=6em ... ★
       1단계는 0em (왼쪽 기본선)                          */
    const indentEm = level > 1 ? (level - 1) * 2 : 0;

    const formattedContent = formatColon(escapeHtml(content));

    if (level === 0) {
      return `<div class="body-line"
                   style="padding-left:${indentEm}em;"
              >${formatColon(escapeHtml(content))}</div>`;
    }

    const symbolWidth = getSymbolWidth(level);
    return `
      <div class="body-item" style="padding-left:${indentEm}em;">
        <span class="body-item-symbol"
              style="min-width:${symbolWidth}em;"
        >${escapeHtml(symbol)}&nbsp;</span>
        <span class="body-item-content">${formattedContent}</span>
      </div>`;
  }

  /* ── 기호 너비 ───────────────────────────────────────── */
  function getSymbolWidth(level) {
    const w = { 1:1.6, 2:1.6, 3:1.8, 4:1.8, 5:2.2, 6:2.2, 7:1.4, 8:1.4 };
    return w[level] || 1.6;
  }

  /* ── 쌍점(:) 뒤 1칸 띄우기 ──────────────────────────── */
  function formatColon(str) {
    /* 시간(09:30) 제외하고 콜론 뒤 공백 없으면 추가 */
    return str.replace(/(:)(?!\s)(?!\d{2})/g, ': ');
  }

  /* ── 날짜 자동 변환 ──────────────────────────────────── */
  function applyDateFormat(str) {
    return str.replace(
      /(\d{4})\.0?(\d{1,2})\.0?(\d{1,2})\.?/g,
      (_, y, m, d) => `${y}. ${parseInt(m)}. ${parseInt(d)}.`
    );
  }

  /* ── 용어 순화 ───────────────────────────────────────── */
  function applyTermReplace(str) {
    const terms = [
      ['홈페이지','누리집'], ['다운로드','내려받기'],
      ['매뉴얼','설명서'],   ['체크리스트','점검표'],
      ['인프라','기반'],     ['로드맵','단계별 이행안'],
      ['가이드북','안내서'], ['스크린도어','안전문'],
      ['당해','그'],         ['금일','오늘'],
      ['향후','앞으로'],     ['게첨하다','걸다'],
      ['징구','요구'],       ['제고하다','높이다'],
      ['득하다','받다'],     ['상이한','서로 다른'],
      ['부합하는','맞는'],   ['공지 사항','알림 사항'],
      ['공지사항','알림 사항'],
    ];
    terms.forEach(([f, t]) => { str = str.split(f).join(t); });
    return str;
  }

  /* ═══════════════════════════════════════════════════════
     붙임 렌더링
     - 1개: 번호 없이, 같은 줄 끝에 끝.
     - 2개↑: 번호 자동, 마지막 줄 끝에 끝.
     - 없음: 본문 아래 끝.
  ═══════════════════════════════════════════════════════ */
  function renderAttachments(f) {
    const raw = f.attachments || f.attach || '';

    /* 붙임 없음 → 본문 바로 아래 끝. */
    if (!raw.trim()) {
      return `<div class="body-end-mark">&nbsp;&nbsp;끝.</div>`;
    }

    const items = raw.split(/\n|\//).map(s => s.trim()).filter(Boolean);

    let html = '<div class="doc-attach-area">';

    /* ★ 레이블: "붙  임" 뒤 1자 공백만 ★ */
    html += '<span class="doc-attach-label">붙&nbsp;&nbsp;&nbsp;&nbsp;임</span>';
    html += '<span class="doc-attach-gap"></span>';
    html += '<span class="doc-attach-body">';

    if (items.length === 1) {
      /* 1개: 번호 없음, 바로 내용 + 끝. */
      html += `<span class="doc-attach-item">${escapeHtml(items[0])}&nbsp;&nbsp;끝.</span>`;
    } else {
      /* 2개↑: 번호 자동 */
      items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        html += `
          <div class="doc-attach-item-row">
            <span class="doc-attach-num">${idx + 1}.&nbsp;</span>
            <span class="doc-attach-item-text">
              ${escapeHtml(item)}${isLast ? '&nbsp;&nbsp;끝.' : ''}
            </span>
          </div>`;
      });
    }

    html += '</span>';
    html += '</div>';
    return html;
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
    html += '<div class="doc-approval-row">';
    approverList.forEach(ap => {
      html += `
        <div class="doc-approval-cell">
          <span class="doc-approval-title">${escapeHtml(ap.title || '')}</span>
          <span class="doc-approval-sign"></span>
        </div>`;
    });
    html += '</div>';

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
    const orgCode   = settings.orgCode  || orgDetail.orgCode
                   || orgDetail.orgName || settings.orgName || '○○';
    const formatted = dateStr ? applyDateFormat(dateStr) : '';
    const execNum   = docNum
      ? `${orgCode} ${docNum}`
      : `${orgCode} ${new Date().getFullYear()} - `;
    const execDate  = formatted
      ? `(${formatted})`
      : `(${new Date().getFullYear()}.　.　.)`;

    return `
      <div class="doc-exec-row">
        <span class="doc-exec-label">시&nbsp;&nbsp;&nbsp;행</span>
        <span class="doc-exec-value">${escapeHtml(execNum)}&nbsp;&nbsp;${escapeHtml(execDate)}</span>
        <span class="doc-exec-spacer"></span>
        <span class="doc-exec-label">접&nbsp;&nbsp;&nbsp;수</span>
        <span class="doc-exec-recv">(</span>
        <span class="doc-exec-recv-space"></span>
        <span class="doc-exec-recv">)</span>
      </div>`;
  }

  /* ── ⑨ 주소·연락처 ──────────────────────────────────── */
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
