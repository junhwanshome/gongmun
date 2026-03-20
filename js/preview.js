/**
 * js/preview.js
 * 공문서 미리보기 - 전체 수정사항 반영
 */
(function () {
  'use strict';

  let currentDoc  = null;
  let currentType = 'draft';

  function initPreview() {
    const params = new URLSearchParams(location.search);
    const id     = params.get('id');
    currentType  = params.get('type') || 'draft';

    if (!id) { showError('문서 ID가 없습니다.'); return; }

    try {
      const docs = JSON.parse(localStorage.getItem('doc_completed') || '[]');
      currentDoc = docs.find(d => d.id === id) || null;
      if (currentDoc) currentType = 'completed';
    } catch (e) {}

    if (!currentDoc) {
      try {
        const drafts = JSON.parse(localStorage.getItem('doc_drafts') || '[]');
        currentDoc   = drafts.find(d => d.id === id) || null;
        if (currentDoc) currentType = 'draft';
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

  function updateStatus() {
    const badge = document.getElementById('status-badge');
    if (!badge) return;
    if (currentType === 'completed') {
      badge.textContent = '완성';
      badge.className   = 'badge badge-completed';
      const btn = document.getElementById('btn-complete');
      if (btn) btn.disabled = true;
    } else {
      badge.textContent = '임시저장';
      badge.className   = 'badge badge-draft';
    }
  }

  function renderPreview(doc) {
    const container = document.getElementById('doc-preview');
    if (!container) return;

    const settings  = safeJSON('doc_settings');
    const orgDetail = safeJSON('doc_org_detail');
    const orgName   = settings.orgName || orgDetail.orgName || '○○기관';
    const f         = doc.fields || {};
    const tmpl      = doc.templateId || 'internal';

    const title    = f.title     || doc.title || '(제목 없음)';
    const receiver = f.receiver  || '';
    const via      = f.via       || '';
    const ref      = f.reference || f.ref || '';
    const docNum   = f.docNo     || f.docNumber || f.docNum || '';
    const dateStr  = f.date      || doc.date || '';

    let html = '';
    html += `<div class="doc-paper-inner">`;
    html += `<div class="doc-main-area">`;

    /* ① 기관명 */
    html += `<div class="doc-header-area">
               <div class="doc-org-name">${esc(orgName)}</div>
             </div>`;

    /* ② 수신·경유·참조 */
    html += `<div class="doc-meta-area">`;
    html += metaRow('수&nbsp;&nbsp;&nbsp;&nbsp;신', esc(receiver));
    if (via) html += metaRow('경&nbsp;&nbsp;&nbsp;&nbsp;유', esc(via));
    if (ref) html += metaRow('참&nbsp;&nbsp;&nbsp;&nbsp;조', esc(ref));
    html += `</div>`;

    /* ③ 제목 */
    html += `<div class="doc-title-area">
               <span class="doc-row-label">제&nbsp;&nbsp;&nbsp;&nbsp;목</span>
               <span class="doc-row-colon">:&nbsp;</span>
               <span class="doc-title-text">${esc(title)}</span>
             </div>`;
    html += `<hr class="doc-title-divider">`;

    /* ④ 본문 */
    const attachList = parseAttachments(f.attachments || f.attach || '');
    html += `<div class="doc-body-area">${buildBody(f, tmpl, attachList.length === 0)}</div>`;

    /* ⑤ 붙임 */
    if (attachList.length > 0) {
      html += renderAttach(attachList);
    }

    html += `</div>`;

    /* 하단 기관정보 블록 */
    html += `<div class="doc-org-footer">`;
    const senderName = f.senderName || orgName;
    html += `<div class="doc-sender-area">
               <span class="doc-sender-value">${esc(senderName)}</span>
             </div>`;
    html += `<hr class="doc-sender-divider">`;
    html += renderApprovalBlock(doc, settings, orgDetail);
    html += renderExecRow(doc, settings, orgDetail, docNum, dateStr);
    html += renderFooterInfo(doc, settings, orgDetail);
    html += `</div>`;
    html += `</div>`;

    container.innerHTML = html;
  }

  function metaRow(labelHtml, valueHtml) {
    return `<div class="doc-meta-row">
              <span class="doc-row-label">${labelHtml}</span>
              <span class="doc-row-colon">:&nbsp;</span>
              <span class="doc-row-value">${valueHtml}</span>
            </div>`;
  }

  /* ══════════════════════════════════════════════
     본문 빌더
     ★ purpose: 번호 없이 단독 출력
     ★ body: 사용자 입력 그대로 출력
     ★ 들여쓰기 자동 감지
     ★ \u00A0 포함 앞뒤 공백 완전 제거
  ══════════════════════════════════════════════ */
  function buildBody(f, tmpl, appendEnd) {
    let rawLines = [];

    if (tmpl === 'event') {
      rawLines.push('1. 귀 기관의 무궁한 발전을 기원합니다.');
      rawLines.push('2. 아래와 같이 행사를 안내드립니다.');
      if (f.eventDate)   rawLines.push('일  시: ' + (f.eventDate   || ''));
      if (f.eventPlace)  rawLines.push('장  소: ' + (f.eventPlace  || ''));
      if (f.eventTarget) rawLines.push('대  상: ' + (f.eventTarget || ''));
      if (f.body)        rawLines.push('내  용: ' + (f.body        || ''));
      if (f.purpose)     rawLines.push('3. ' + f.purpose);
    } else if (tmpl === 'sponsor') {
      rawLines.push('1. 귀하의 따뜻한 후원에 진심으로 감사드립니다.');
      if (f.sponsorName) rawLines.push('2. 후원자: '   + f.sponsorName);
      if (f.grantDate)   rawLines.push('3. 후원일자: ' + f.grantDate);
      if (f.grantAmount) rawLines.push('4. 후원금액: ' + f.grantAmount);
      if (f.body) {
        f.body.split('\n').forEach(line => rawLines.push(line));
      }
    } else {
      /* internal / government / cooperation
         purpose: 번호 없이 단독 출력, 빈 줄로 body와 구분
         body: 사용자가 직접 번호 입력 → 그대로 출력 */
      if (f.purpose) {
        f.purpose.split('\n').forEach(line => rawLines.push(line));
        rawLines.push('');
      }
      if (f.body) {
        f.body.split('\n').forEach(line => rawLines.push(line));
      }
    }

    const raw = rawLines.join('\n');

    if (!raw.trim()) {
      const empty = `<div class="doc-body-line doc-body-empty">(본문 없음)</div>`;
      return appendEnd
        ? empty + `<div class="doc-body-line">&nbsp;&nbsp;끝.</div>`
        : empty;
    }

    const INDENT_RULES = [
      { re: /^(\d+\.)\s*/,       em: 0 },
      { re: /^([가-힣]\.)\s*/,   em: 2 },
      { re: /^(\d+\))\s*/,       em: 4 },
      { re: /^([가-힣]\))\s*/,   em: 6 },
      { re: /^(\(\d+\))\s*/,     em: 8 },
      { re: /^(\([가-힣]\))\s*/, em: 10 },
      { re: /^([①-⑳])\s*/,     em: 12 },
      { re: /^([㉮-㉻])\s*/,    em: 14 },
    ];

    const lines = raw.split('\n');
    let html = '';

    lines.forEach((line, idx) => {
      const isLast = idx === lines.length - 1;

      const trimmed = line
        .replace(/^[\s\u00A0]+/, '')
        .replace(/[\s\u00A0]+$/, '');

      if (trimmed === '') {
        html += `<div class="doc-body-line">&nbsp;</div>`;
        return;
      }

      let indentEm = 0;
      let symbol   = '';
      let content  = trimmed;

      for (const rule of INDENT_RULES) {
        const m = trimmed.match(rule.re);
        if (m) {
          indentEm = rule.em;
          symbol   = m[0].replace(/[\s\u00A0]+$/, '');
          content  = trimmed.slice(m[0].length)
                            .replace(/^[\s\u00A0]+/, '');
          break;
        }
      }

      const displayContent = convertTerms(applyColonSpace(convertDate(content)));
      const displaySymbol  = symbol ? `${esc(symbol)}&nbsp;` : '';
      const endMark        = (appendEnd && isLast) ? '&nbsp;&nbsp;끝.' : '';

      html += `<div class="doc-body-line" style="padding-left:${indentEm * 0.5}em;">`
            + displaySymbol
            + esc(displayContent)
            + endMark
            + `</div>`;
    });

    return html;
  }

  function convertDate(text) {
    return text.replace(
      /(\d{4})\.(\d{1,2})\.(\d{1,2})(\.)?(\([월화수목금토일]\))?/g,
      (_, y, m, d, dot, day) =>
        `${y}. ${parseInt(m, 10)}. ${parseInt(d, 10)}${dot || '.'}${day || ''}`
    );
  }

  function applyColonSpace(text) {
    return text.replace(/:(?!\s)(?!\d{2})/g, ': ');
  }

  function convertTerms(text) {
    const map = {
      '홈페이지': '누리집',
      '다운로드': '내려받기',
      '업로드':   '올리기',
      '매뉴얼':   '설명서',
      'MOU':      '업무협약',
      '당해':     '그',
      '금일':     '오늘',
      '익일':     '다음 날',
      '향후':     '앞으로',
    };
    Object.entries(map).forEach(([k, v]) => { text = text.replaceAll(k, v); });
    return text;
  }

  function parseAttachments(raw) {
    if (!raw.trim()) return [];
    return raw.split('\n')
      .map(l => {
        const trimmed = l
          .replace(/^[\s\u00A0]+/, '')
          .replace(/[\s\u00A0]+$/, '');
        if (!trimmed) return '';
        const withoutNum = trimmed.replace(/^\d+\.\s*/, '');
        return withoutNum.endsWith('.') ? withoutNum : withoutNum + '.';
      })
      .filter(Boolean);
  }

  function renderAttach(list) {
    let html = `<div class="doc-attach-area">`;
    html += `<span class="doc-attach-label">붙&nbsp;&nbsp;&nbsp;&nbsp;임&nbsp;&nbsp;</span>`;
    html += `<span class="doc-attach-content">`;

    if (list.length === 1) {
      html += `<span class="doc-attach-line">${esc(list[0])}&nbsp;&nbsp;끝.</span>`;
    } else {
      list.forEach((item, i) => {
        const isLast  = i === list.length - 1;
        const endMark = isLast ? '&nbsp;&nbsp;끝.' : '';
        html += `<span class="doc-attach-line">${i + 1}.&nbsp;${esc(item)}${endMark}</span>`;
      });
    }

    html += `</span></div>`;
    return html;
  }

  function renderApprovalBlock(doc, settings, orgDetail) {
    const approvers   = settings.approvers   || orgDetail.approvers   || [];
    const cooperators = settings.cooperators || orgDetail.cooperators || '';

    const list = approvers.length
      ? approvers
      : [
          { title: '담당',     name: '' },
          { title: '사무국장', name: '' },
          { title: '원장',     name: '' },
        ];

    let html = `<div class="doc-approval-wrap">`;
    html += `<div class="doc-approval-row">`;
    list.forEach(ap => {
      html += `<div class="doc-approval-cell">
                 <span class="doc-approval-title">${esc(ap.title || '')}</span>
                 <span class="doc-approval-space"></span>
               </div>`;
    });
    html += `</div>`;
    html += `<div class="doc-cooperator-row">
               <span class="doc-coop-label">협&nbsp;조&nbsp;자</span>
               <span class="doc-cooperator-value">${esc(cooperators)}</span>
             </div>`;
    html += `</div>`;
    return html;
  }

  function renderExecRow(doc, settings, orgDetail, docNum, dateStr) {
    const orgCode = settings.orgCode  || orgDetail.orgCode
                 || orgDetail.orgName || settings.orgName || '○○';
    const execNum  = docNum
      ? `${orgCode} ${docNum}`
      : `${orgCode} ${new Date().getFullYear()} - `;
    const execDate = dateStr
      ? `(${convertDate(dateStr)})`
      : `(${new Date().getFullYear()}.　.　.)`;

    return `<div class="doc-exec-row">
              <span class="doc-exec-label">시&nbsp;&nbsp;&nbsp;행</span>
              <span class="doc-exec-value">${esc(execNum)}&nbsp;${esc(execDate)}</span>
              <span class="doc-exec-spacer"></span>
              <span class="doc-exec-label">접&nbsp;&nbsp;&nbsp;수</span>
              <span class="doc-exec-recv">(<span class="doc-exec-date-space"></span>)</span>
            </div>`;
  }

  function renderFooterInfo(doc, settings, orgDetail) {
    const zip      = orgDetail.zip      || settings.zip      || '';
    const addr     = orgDetail.address  || settings.address  || '';
    const homepage = orgDetail.homepage || settings.homepage || '';
    const tel      = orgDetail.tel      || settings.tel      || '';
    const fax      = orgDetail.fax      || settings.fax      || '';
    const email    = orgDetail.email    || settings.email    || '';
    const openness = orgDetail.openness || settings.openness || '공개';

    let addrLine = '';
    if (zip)      addrLine += `우 ${esc(zip)}&nbsp;&nbsp;`;
    if (addr)     addrLine += `주소 ${esc(addr)}`;
    if (homepage) addrLine += `&nbsp;/&nbsp;${esc(homepage)}`;

    let contactLine = '';
    if (tel)      contactLine += `전화(${esc(tel)})`;
    if (fax)      contactLine += `&nbsp;&nbsp;전송(${esc(fax)})`;
    if (email)    contactLine += `&nbsp;/&nbsp;${esc(email)}`;
    if (openness) contactLine += `&nbsp;/&nbsp;${esc(openness)}`;

    return `<div class="doc-footer-wrap">
              <div class="doc-footer-addr">${addrLine}</div>
              <div class="doc-footer-contact">${contactLine}</div>
            </div>`;
  }

  function safeJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  function showError(msg) {
    const c = document.getElementById('doc-preview');
    if (c) c.innerHTML = `<p style="color:red;padding:40px;">${esc(msg)}</p>`;
  }

  function bindEvents() {
    const $ = id => document.getElementById(id);

    const btnBack = $('btn-back');
    if (btnBack) btnBack.addEventListener('click', () => history.back());

    const btnEdit = $('btn-edit');
    if (btnEdit) btnEdit.addEventListener('click', () => {
      if (!currentDoc) return;
      location.href = `editor.html?id=${currentDoc.id}&type=${currentType}`;
    });

    const btnCopy = $('btn-copy');
    if (btnCopy) btnCopy.addEventListener('click', () => {
      const el = $('doc-preview');
      if (!el) return;
      navigator.clipboard.writeText(el.innerText || '')
        .then(() => alert('복사되었습니다.'))
        .catch(() => alert('복사에 실패했습니다.'));
    });

    const btnPrint = $('btn-print');
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    const btnComplete = $('btn-complete');
    if (btnComplete) btnComplete.addEventListener('click', saveAsComplete);

    const btnDelete = $('btn-delete');
    if (btnDelete) btnDelete.addEventListener('click', doDelete);

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); window.print(); }
    });
  }

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

  function doDelete() {
    if (!currentDoc) return;
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;
    try {
      ['doc_drafts', 'doc_completed'].forEach(key => {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(list.filter(d => d.id !== currentDoc.id)));
      });
      localStorage.removeItem('draft_' + currentDoc.id);
      location.href = 'index.html';
    } catch (e) {
      alert('삭제에 실패했습니다.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPreview();
    bindEvents();
  });

})();
