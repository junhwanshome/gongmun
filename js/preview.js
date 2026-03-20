/**
 * js/preview.js
 * 공문서 미리보기 — 기관명 아래 구분선, 결재란 테두리 없음
 */
(function () {
  'use strict';

  var currentDoc  = null;
  var currentType = 'draft';

  /* ══════════════════════════════════════════
     초기화
  ══════════════════════════════════════════ */
  function initPreview() {
    var params = getUrlParams();
    var id     = params.id;
    var type   = params.type || 'draft';

    if (!id) {
      showToast('문서 ID가 없습니다.', 'error');
      return;
    }

    currentType = type;
    currentDoc  = (type === 'doc') ? Storage.getDoc(id) : Storage.getDraft(id);

    if (!currentDoc) {
      showToast('문서를 찾을 수 없습니다.', 'error');
      var c = document.getElementById('doc-preview');
      if (c) c.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:60px 0;">문서를 찾을 수 없습니다.</p>';
      return;
    }

    renderPreview(currentDoc);
    updateStatus();
  }

  /* ══════════════════════════════════════════
     상태 배지
  ══════════════════════════════════════════ */
  function updateStatus() {
    if (!currentDoc) return;
    var badge   = document.getElementById('doc-status');
    var titleEl = document.getElementById('preview-title');
    if (titleEl) titleEl.textContent = currentDoc.title || '(제목 없음)';
    if (badge) {
      if (currentType === 'doc') {
        badge.textContent = '✅ 완성';
        badge.className   = 'doc-status-badge badge-complete';
      } else {
        badge.textContent = '📝 임시저장';
        badge.className   = 'doc-status-badge badge-draft';
      }
    }
    if (currentType === 'doc') {
      ['complete-btn', 'complete-btn-b'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) { b.disabled = true; b.style.opacity = '.5'; b.style.cursor = 'not-allowed'; }
      });
    }
  }

  /* ══════════════════════════════════════════
     문서 렌더링
  ══════════════════════════════════════════ */
  function renderPreview(doc) {
    var container = document.getElementById('doc-preview');
    if (!container) return;

    var settings = Storage.getSettings();
    var detail   = ExtendedStorage.getOrgDetail();
    var logo     = LogoManager.get();
    var orgName  = settings.orgName || '○○기관';
    var f        = doc.fields || {};
    var tmpl     = doc.templateId || 'internal';

    var docNo       = f.docNo       || f['문서번호']   || '';
    var rcptNo      = f.rcptNo      || f['접수번호']   || '';
    var classNo     = f.classNo     || f['분류번호']   || '';
    var dateStr     = f.date        || f['날짜']       || getTodayString();
    var receiver    = f.receiver    || f['수신']       || '';
    var reference   = f.reference   || f['참조']       || '';
    var via         = f.via         || f['경유']       || '';
    var title       = f.title       || f['제목']       || doc.title || '';
    var body        = f.body        || f['내용']       || f['본문'] || '';
    var purpose     = f.purpose     || f['목적']       || '';
    var attachments = f.attachments || f['붙임']       || '';
    var senderName  = f.senderName  || f['발신명의']   || orgName;
    var address     = f.address     || detail.address  || '';
    var contact     = f.contact     || detail.phone    || '';
    var faxNo       = f.fax         || detail.fax      || '';
    var homepage    = f.homepage    || detail.homepage || '';
    var eventDate   = f.eventDate   || f['행사일시']   || '';
    var eventPlace  = f.eventPlace  || f['행사장소']   || '';
    var eventTarget = f.eventTarget || f['대상']       || '';
    var grantAmount = f.grantAmount || f['후원금액']   || '';
    var grantDate   = f.grantDate   || f['후원일자']   || '';
    var sponsorName = f.sponsorName || f['후원자성명'] || '';

    var cooperators = [];
    try { cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]'); }
    catch (e) { cooperators = []; }
    if (!Array.isArray(cooperators)) cooperators = [];

    var html = '';

    /* ── 1. 기관명 ── */
    html += '<div class="doc-header-area">';
    if (classNo) {
      html += '<div class="doc-classno">분류번호: ' + escapeHtml(classNo) + '</div>';
    }
    if (logo) {
      html += '<div class="doc-logo-wrap"><img class="doc-logo-img" src="' + logo + '" alt="기관로고"></div>';
    } else {
      html += '<div class="doc-org-name">' + escapeHtml(orgName) + '</div>';
    }
    html += '</div>';

    /* ★ 구분선: 기관명 바로 아래에만 ★ */
    html += '<hr class="doc-org-divider">';

    /* ── 2. 수신·경유·참조 ── */
    html += '<div class="doc-meta-area">';
    if (via) {
      html += '<div class="doc-meta-row">'
            + '<span class="doc-meta-label">경&nbsp;&nbsp;유</span>'
            + '<span class="doc-meta-value">' + escapeHtml(via) + '</span>'
            + '</div>';
    }
    var recvDisplay = receiver;
    if (!recvDisplay) {
      var rcvs = (settings.receivers || [])
        .map(function (r) { return typeof r === 'object' ? (r.name || '') : r; })
        .filter(Boolean);
      recvDisplay = rcvs.join(', ') || '';
    }
    html += '<div class="doc-meta-row">'
          + '<span class="doc-meta-label">수&nbsp;&nbsp;신</span>'
          + '<span class="doc-meta-value">' + escapeHtml(recvDisplay) + '</span>'
          + '</div>';
    if (reference) {
      html += '<div class="doc-meta-row">'
            + '<span class="doc-meta-label">참&nbsp;&nbsp;조</span>'
            + '<span class="doc-meta-value">' + escapeHtml(reference) + '</span>'
            + '</div>';
    }
    html += '</div>';

    /* ── 3. 제목 (구분선 없음) ── */
    html += '<div class="doc-title-area">'
          + '<span class="doc-title-label">제&nbsp;&nbsp;&nbsp;목:</span>'
          + '<span class="doc-title-text">' + escapeHtml(title) + '</span>'
          + '</div>';

    /* ── 4. 본문 ── */
    html += buildBody(tmpl, f, body, purpose,
              eventDate, eventPlace, eventTarget,
              grantAmount, grantDate, sponsorName);

    /* ── 5. 붙임 ── */
    if (attachments && attachments.trim()) {
      var items = attachments.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      html += '<div class="doc-attach-area">';
      html += '<div class="doc-attach-label">붙&nbsp;&nbsp;임</div>';
      items.forEach(function (item, idx) {
        html += '<div class="doc-attach-item">' + (idx + 1) + '. ' + escapeHtml(item) + '&nbsp;&nbsp;1부.</div>';
      });
      html += '<div class="doc-end-mark">끝.</div>';
      html += '</div>';
    } else {
      html += '<div class="doc-end-mark">끝.</div>';
    }

    /* ── 6. 발신명의 ── */
    html += '<div class="doc-sender-area">' + escapeHtml(senderName) + '</div>';

    /* ── 7. 결재란 ── */
    html += renderApprovalBlock(settings, cooperators);

    /* ── 8. 하단 정보 ── */
    html += renderFooterInfo(docNo, rcptNo, dateStr, orgName, address, contact, faxNo, homepage);

    container.innerHTML = html;
  }

  /* ══════════════════════════════════════════
     본문 빌더
  ══════════════════════════════════════════ */
  function buildBody(tmpl, f, body, purpose,
      eventDate, eventPlace, eventTarget,
      grantAmount, grantDate, sponsorName) {

    var html = '<div class="doc-body-area">';

    if (tmpl === 'event') {
      html += '<div class="doc-body-item"><span class="doc-body-num">1.</span>'
            + '<span>귀 기관의 무궁한 발전을 기원합니다.</span></div>';
      html += '<div class="doc-body-item"><span class="doc-body-num">2.</span>'
            + '<span>아래와 같이 행사를 안내드립니다.</span></div>';
      html += '</div>';
      html += '<table class="doc-event-table">';
      var eRows = [
        ['행&nbsp;사&nbsp;명', f.title || f['제목'] || ''],
        ['일&nbsp;&nbsp;&nbsp;시', eventDate],
        ['장&nbsp;&nbsp;&nbsp;소', eventPlace],
        ['대&nbsp;&nbsp;&nbsp;상', eventTarget],
        ['내&nbsp;&nbsp;&nbsp;용', body]
      ];
      eRows.forEach(function (r) {
        if (r[1]) {
          html += '<tr><th>' + r[0] + '</th><td>' + escapeHtml(r[1]) + '</td></tr>';
        }
      });
      html += '</table>';
      if (purpose) {
        html += '<div class="doc-body-area"><div class="doc-body-item">'
              + '<span class="doc-body-num">3.</span>'
              + '<span>' + escapeHtml(purpose) + '</span></div></div>';
      }

    } else if (tmpl === 'sponsor') {
      html += '<div class="doc-body-item"><span class="doc-body-num">1.</span>'
            + '<span>귀하의 따뜻한 후원에 진심으로 감사드립니다.</span></div>';
      if (sponsorName) html += '<div class="doc-body-item"><span class="doc-body-num">2.</span><span>후원자: '   + escapeHtml(sponsorName) + '</span></div>';
      if (grantDate)   html += '<div class="doc-body-item"><span class="doc-body-num">3.</span><span>후원일자: ' + escapeHtml(grantDate)   + '</span></div>';
      if (grantAmount) html += '<div class="doc-body-item"><span class="doc-body-num">4.</span><span>후원금액: ' + escapeHtml(grantAmount) + '</span></div>';
      if (body)        html += '<div class="doc-body-item"><span class="doc-body-num">5.</span><span>'          + escapeHtml(body)         + '</span></div>';
      html += '</div>';

    } else {
      var paras = [purpose, body].filter(Boolean);
      if (paras.length === 0) paras = [''];
      paras.forEach(function (p, idx) {
        html += '<div class="doc-body-item">'
              + '<span class="doc-body-num">' + (idx + 1) + '.</span>'
              + '<span>' + escapeHtml(p) + '</span></div>';
      });
      html += '</div>';
    }

    return html;
  }

  /* ══════════════════════════════════════════
     결재란 — 테두리(사각박스) 완전 제거
  ══════════════════════════════════════════ */
  function renderApprovalBlock(settings, cooperators) {
    var levels = settings.approvalLevels;
    if (!levels || levels.length === 0) {
      levels = [
        { title: '담당', name: '' },
        { title: '과장', name: '' },
        { title: '관장', name: '' }
      ];
    }

    var html = '<div class="doc-approval-area">';

    /* 협조자 */
    if (cooperators.length) {
      html += '<div class="doc-coop-block">';
      html += '<div class="doc-coop-title">협조자</div>';
      html += '<div class="doc-approval-row">';
      cooperators.forEach(function (c) {
        var ctitle = typeof c === 'object' ? (c.title || c.name || '') : c;
        var cname  = typeof c === 'object' ? (c.name  || '') : '';
        html += '<div class="doc-approval-cell">'
              + '<span class="doc-approval-title">' + escapeHtml(ctitle) + '</span>'
              + '<span class="doc-approval-sign"></span>'
              + '<span class="doc-approval-name">'  + escapeHtml(cname)  + '</span>'
              + '</div>';
      });
      html += '</div></div>';
    }

    /* 결재자 */
    html += '<div class="doc-approval-row">';
    levels.forEach(function (l) {
      html += '<div class="doc-approval-cell">'
            + '<span class="doc-approval-title">' + escapeHtml(l.title || '') + '</span>'
            + '<span class="doc-approval-sign"></span>'
            + '<span class="doc-approval-name">'  + escapeHtml(l.name  || '') + '</span>'
            + '</div>';
    });
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════════
     하단 정보선
  ══════════════════════════════════════════ */
  function renderFooterInfo(docNo, rcptNo, dateStr, orgName, address, contact, faxNo, homepage) {
    var html = '<div class="doc-footer-area">';
    html += '<hr class="doc-footer-thick">';
    html += '<hr class="doc-footer-thin">';
    html += '<div class="doc-footer-content">';
    html += '<div class="doc-footer-left">';
    html += '<div class="doc-footer-numrow">';
    html += '<span><strong>시행</strong>&nbsp;'
          + escapeHtml(docNo || (orgName + '-'))
          + '&nbsp;&nbsp;(' + escapeHtml(dateStr) + ')</span>';
    html += '<span><strong>접수</strong>&nbsp;('
          + (rcptNo ? escapeHtml(rcptNo) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
          + ')</span>';
    html += '</div>';
    if (address) html += '<div class="doc-footer-addr">' + escapeHtml(address) + '</div>';
    html += '</div>';
    html += '<div class="doc-footer-right">';
    if (contact)  html += '<div>☎&nbsp;' + escapeHtml(contact)  + '</div>';
    if (faxNo)    html += '<div>팩스&nbsp;' + escapeHtml(faxNo)  + '</div>';
    if (homepage) html += '<div>' + escapeHtml(homepage) + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════════
     일반 텍스트 변환 (복사용)
  ══════════════════════════════════════════ */
  function buildPlainText(doc) {
    var f = doc.fields || {};
    var s = Storage.getSettings();
    var lines = [];
    lines.push(s.orgName || '');
    lines.push('');
    if (f.via || f['경유']) lines.push('경유: ' + (f.via || f['경유'] || ''));
    lines.push('수신: ' + (f.receiver || f['수신'] || ''));
    if (f.reference || f['참조']) lines.push('참조: ' + (f.reference || f['참조'] || ''));
    lines.push('');
    lines.push('제 목: ' + (f.title || f['제목'] || doc.title || ''));
    lines.push('');
    if (f.purpose || f['목적']) lines.push('1. ' + (f.purpose || f['목적'] || ''));
    if (f.body    || f['내용']) lines.push('2. ' + (f.body    || f['내용'] || ''));
    lines.push('');
    var attach = f.attachments || f['붙임'] || '';
    if (attach.trim()) {
      lines.push('붙임');
      attach.split('\n').forEach(function (a, i) {
        if (a.trim()) lines.push('  ' + (i + 1) + '. ' + a.trim() + '  1부.');
      });
    }
    lines.push('끝.');
    lines.push('');
    lines.push(f.senderName || f['발신명의'] || s.orgName || '');
    return lines.join('\n');
  }

  /* ══════════════════════════════════════════
     이벤트 바인딩
  ══════════════════════════════════════════ */
  function bindEvents() {
    function el(id, fn) {
      var e = document.getElementById(id);
      if (e) e.addEventListener('click', fn);
    }

    el('back-btn', function () { window.location.href = 'index.html'; });

    function goEdit() {
      if (!currentDoc) return;
      window.location.href = 'editor.html?id='
        + encodeURIComponent(currentDoc.id) + '&type=' + currentType;
    }
    el('edit-btn',   goEdit);
    el('edit-btn-b', goEdit);

    function doCopy() {
      if (!currentDoc) return;
      copyToClipboard(buildPlainText(currentDoc));
      showToast('📋 클립보드에 복사되었습니다.', 'success');
    }
    el('copy-btn',   doCopy);
    el('copy-btn-b', doCopy);

    function doPrint() { window.print(); }
    el('print-btn',   doPrint);
    el('print-btn-b', doPrint);

    function openComplete() {
      if (currentType !== 'doc') Modal.open('complete-modal');
    }
    el('complete-btn',   openComplete);
    el('complete-btn-b', openComplete);
    el('complete-cancel-btn',  function () { Modal.close('complete-modal'); });
    el('complete-confirm-btn', function () { Modal.close('complete-modal'); saveAsComplete(); });

    function openDelete() { Modal.open('delete-modal'); }
    el('delete-btn',   openDelete);
    el('delete-btn-b', openDelete);
    el('delete-cancel-btn',  function () { Modal.close('delete-modal'); });
    el('delete-confirm-btn', function () { Modal.close('delete-modal'); doDelete(); });

    ['complete-modal', 'delete-modal'].forEach(function (id) {
      var overlay = document.getElementById(id);
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) Modal.close(id);
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        Modal.close('complete-modal');
        Modal.close('delete-modal');
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        doPrint();
      }
    });
  }

  /* ══════════════════════════════════════════
     완성 저장
  ══════════════════════════════════════════ */
  function saveAsComplete() {
    if (!currentDoc) return;
    var doc = JSON.parse(JSON.stringify(currentDoc));
    doc.completedAt = new Date().toISOString();
    doc.status = 'complete';
    var saved = Storage.saveDoc(doc);
    if (saved && currentType === 'draft') Storage.deleteDraft(currentDoc.id);
    if (saved) {
      showToast('✅ 완성 문서함에 저장되었습니다.', 'success');
      currentType = 'doc';
      currentDoc  = doc;
      updateStatus();
    } else {
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  }

  /* ══════════════════════════════════════════
     삭제
  ══════════════════════════════════════════ */
  function doDelete() {
    if (!currentDoc) return;
    if (currentType === 'doc') Storage.deleteDoc(currentDoc.id);
    else Storage.deleteDraft(currentDoc.id);
    showToast('🗑️ 삭제되었습니다.', 'info');
    setTimeout(function () { window.location.href = 'index.html'; }, 800);
  }

  /* ══════════════════════════════════════════
     DOMContentLoaded
  ══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initPreview();
    bindEvents();
  });

})();
