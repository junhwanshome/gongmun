(function () {
  'use strict';

  let currentDoc = null;
  let currentType = 'draft';

  /* ══════════════════════════════════════════════
     초기화
  ══════════════════════════════════════════════ */
  function initPreview() {
    const params = new URLSearchParams(location.search);
    const id     = params.get('id');
    currentType  = params.get('type') || 'draft';

    if (!id) { showError('문서 ID가 없습니다.'); return; }

    // 1) 완성 문서
    try {
      const docs = JSON.parse(localStorage.getItem('doc_completed') || '[]');
      currentDoc  = docs.find(d => d.id === id) || null;
      if (currentDoc) currentType = 'completed';
    } catch (e) {}

    // 2) 임시저장 배열
    if (!currentDoc) {
      try {
        const drafts = JSON.parse(localStorage.getItem('doc_drafts') || '[]');
        currentDoc   = drafts.find(d => d.id === id) || null;
        if (currentDoc) currentType = 'draft';
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

  /* ══════════════════════════════════════════════
     상태 배지
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     문서 렌더링
  ══════════════════════════════════════════════ */
  function renderPreview(doc) {
    const container = document.getElementById('doc-preview');
    if (!container) return;

    const settings  = safeJSON('doc_settings');
    const orgDetail = safeJSON('doc_org_detail');
    const orgName   = settings.orgName  || orgDetail.orgName  || '○○기관';
    const f         = doc.fields || {};
    const tmpl      = doc.templateId || 'internal';

    const title    = f.title     || doc.title || '(제목 없음)';
    const receiver = f.receiver  || '';
    const via      = f.via       || '';
    const ref      = f.reference || f.ref || '';
    const docNum   = f.docNumber || f.docNum || '';
    const dateStr  = f.date      || doc.date  || '';

    let html = '';

    html += `<div class="doc-paper-inner">`;

    /* ──────────── 상단 본문 영역 ──────────── */
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
               <span class="doc-meta-label">제&nbsp;&nbsp;&nbsp;&nbsp;목</span>
               <span class="doc-colon">:</span>
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

    html += `</div>`; /* end doc-main-area */

    /* ──────────── 하단 기관정보 블록 ──────────── */
    html += `<div class="doc-org-footer">`;

    /* ⑥ 발신명의 */
    const senderName = f.senderName || orgName;
    html += `<div class="doc-sender-area">
               <span class="doc-sender-value">${esc(senderName)}</span>
             </div>`;
    html += `<hr class="doc-sender-divider">`;

    /* ⑦ 결재·협조자 */
    html += renderApprovalBlock(doc, settings, orgDetail);

    /* ⑧ 시행·접수 */
    html += renderExecRow(doc, settings, orgDetail, docNum, dateStr);

    /* ⑨ 주소·연락처 */
    html += renderFooterInfo(doc, settings, orgDetail);

    html += `</div>`; /* end doc-org-footer */
    html += `</div>`; /* end doc-paper-inner */

    container.innerHTML = html;
  }

  /* ══════════════════════════════════════════════
     메타 행 헬퍼
  ══════════════════════════════════════════════ */
  function metaRow(labelHtml, valueHtml) {
    return `<div class="doc-meta-row">
              <span class="doc-meta-label">${labelHtml}</span>
              <span class="doc-colon">:</span>
              <span class="doc-meta-value">${valueHtml}</span>
            </div>`;
  }

  /* ══════════════════════════════════════════════
     본문 빌더
     - 기호 자동 감지로 들여쓰기 적용
     - 사용자 입력 앞뒤 공백 무시
     - 날짜 변환 / 콜론 규칙 / 용어 순화
  ══════════════════════════════════════════════ */
  function buildBody(f, tmpl, appendEnd) {
    const raw = f.body || f.content || '';
    if (!raw.trim()) {
      const empty = `<div class="doc-body-line doc-body-empty">(본문 없음)</div>`;
      return appendEnd ? empty + `<div class="doc-body-line">&nbsp;&nbsp;끝.</div>` : empty;
    }

    /* 들여쓰기 규칙 (기호 → padding-left em) */
    const INDENT_RULES = [
      { re: /^(\d+)\.\s*/,       em: 0  },  // 1단계: 1.
      { re: /^[가-힣]\.\s*/,     em: 2  },  // 2단계: 가.
      { re: /^\d+\)\s*/,         em: 4  },  // 3단계: 1)
      { re: /^[가-힣]\)\s*/,     em: 6  },  // 4단계: 가)
      { re: /^\(\d+\)\s*/,       em: 8  },  // 5단계: (1)
      { re: /^\([가-힣]\)\s*/,   em: 10 },  // 6단계: (가)
      { re: /^[①-⑳]\s*/,       em: 12 },  // 7단계: ①
      { re: /^[㉮-㉻]\s*/,      em: 14 },  // 8단계: ㉮
    ];

    const lines = raw.split('\n');
    let html = '';

    lines.forEach((line, idx) => {
      const isLast = idx === lines.length - 1;

      /* 앞뒤 공백 제거 후 처리 */
      let trimmed = line.trimStart();

      /* 들여쓰기 감지 */
      let indentEm = -1;
      for (const rule of INDENT_RULES) {
        if (rule.re.test(trimmed)) {
          indentEm = rule.em;
          break;
        }
      }

      /* 텍스트 변환 적용 */
      trimmed = convertDate(trimmed);
      trimmed = applyColonSpace(trimmed);
      trimmed = convertTerms(trimmed);

      const styleAttr = indentEm >= 0
        ? `style="padding-left:${indentEm}em;"`
        : '';

      const endMark = (appendEnd && isLast)
        ? '&nbsp;&nbsp;끝.'
        : '';

      html += `<div class="doc-body-line" ${styleAttr}>${esc(trimmed)}${endMark}</div>`;
    });

    return html;
  }

  /* ══════════════════════════════════════════════
     날짜 변환
     2024.09.06 → 2024. 9. 6.
     2023.11.21(화) → 2023. 11. 21.(화)
  ══════════════════════════════════════════════ */
  function convertDate(text) {
    return text.replace(
      /(\d{4})\.(\d{1,2})\.(\d{1,2})(\.)?(\([월화수목금토일]\))?/g,
      (_, y, m, d, dot, day) => {
        const trailing = dot || '.';
        const dayStr   = day  || '';
        return `${y}. ${parseInt(m, 10)}. ${parseInt(d, 10)}${trailing}${dayStr}`;
      }
    );
  }

  /* ══════════════════════════════════════════════
     콜론 뒤 공백
     시간(숫자:숫자) 패턴은 제외
  ══════════════════════════════════════════════ */
  function applyColonSpace(text) {
    return text.replace(/:(?!\s)(?!\d{2})/g, ': ');
  }

  /* ══════════════════════════════════════════════
     행정용어 순화
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     붙임 파싱
  ══════════════════════════════════════════════ */
  function parseAttachments(raw) {
    if (!raw.trim()) return [];
    return raw.split('\n').map(l => l.trim()).filter(Boolean);
  }

  /* ══════════════════════════════════════════════
     붙임 렌더링
     "붙임  내용" (두 칸 띄어)
     1개 → 번호 없음 + 끝.
     2개↑ → 자동 번호 + 마지막에 끝.
  ══════════════════════════════════════════════ */
  function renderAttach(list) {
    let html = `<div class="doc-attach-area">`;
    /* 붙임 레이블: 고정 너비 없이 인라인, 뒤에 두 칸 */
    html += `<span class="doc-attach-label">붙&nbsp;&nbsp;&nbsp;&nbsp;임</span>`;
    html += `<span class="doc-attach-gap"></span>`; /* 두 칸 간격 */
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

  /* ══════════════════════════════════════════════
     결재·협조자 블록
     결재란: 좌측 정렬, 한 줄 가로, 서명 공간(밑줄 없음)
     협조자: 결재란 바로 아래, 공백 없음
  ══════════════════════════════════════════════ */
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

    /* 결재자 한 줄 좌측 정렬 */
    html += `<div class="doc-approval-row">`;
    list.forEach(ap => {
      html += `<div class="doc-approval-cell">
                 <span class="doc-approval-title">${esc(ap.title || '')}</span>
                 <span class="doc-approval-space"></span>
               </div>`;
    });
    html += `</div>`;

    /* 협조자 – 공백 없이 바로 */
    html += `<div class="doc-cooperator-row">
               <span class="doc-coop-label">협&nbsp;조&nbsp;자</span>
               <span class="doc-cooperator-value">${esc(cooperators)}</span>
             </div>`;

    html += `</div>`;
    return html;
  }

  /* ══════════════════════════════════════════════
     시행·접수 행
  ══════════════════════════════════════════════ */
  function renderExecRow(doc, settings, orgDetail, docNum, dateStr) {
    const orgCode  = settings.orgCode  || orgDetail.orgCode
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

  /* ══════════════════════════════════════════════
     주소·연락처 (hr 없음)
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     유틸리티
  ══════════════════════════════════════════════ */
  function safeJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showError(msg) {
    const c = document.getElementById('doc-preview');
    if (c) c.innerHTML = `<p style="color:red;padding:40px;">${esc(msg)}</p>`;
  }

  /* ══════════════════════════════════════════════
     이벤트 바인딩
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     완성 저장
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     삭제
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     진입점
  ══════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    initPreview();
    bindEvents();
  });

})();
