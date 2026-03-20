/**
 * js/preview.js
 * 공문서 미리보기 페이지 스크립트
 * preview.html 인라인 스크립트가 없을 경우 이 파일로 대체 가능
 */
(function () {
  'use strict';

  var currentDoc  = null;
  var currentType = 'draft';

  /* ══════════════════ 초기화 ══════════════════ */
  function initPreview() {
    var params = getUrlParams();
    var id     = params.id;
    var type   = params.type || 'draft';
    if (!id) { showToast('문서 ID가 없습니다.', 'error'); return; }

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

  /* ══════════════════ 상태 배지 ══════════════════ */
  function updateStatus() {
    if (!currentDoc) return;
    var badge = document.getElementById('doc-status');
    var title = document.getElementById('preview-title');
    if (title) title.textContent = currentDoc.title || '(제목 없음)';
    if (badge) {
      if (currentType === 'doc') { badge.textContent = '✅ 완성'; badge.className = 'doc-status-badge badge-complete'; }
      else { badge.textContent = '📝 임시저장'; badge.className = 'doc-status-badge badge-draft'; }
    }
    if (currentType === 'doc') {
      ['complete-btn','complete-btn-b'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) { b.disabled = true; b.style.opacity = '.5'; b.style.cursor = 'not-allowed'; }
      });
    }
  }

  /* ══════════════════ 문서 렌더링 ══════════════════ */
  function renderPreview(doc) {
    var container = document.getElementById('doc-preview');
    if (!container) return;

    var settings = Storage.getSettings();
    var detail   = ExtendedStorage.getOrgDetail();
    var logo     = LogoManager.get();
    var orgName  = settings.orgName || '○○기관';
    var f        = doc.fields || {};
    var tmpl     = doc.templateId || 'internal';

    var docNo      = f.docNo   || f.문서번호 || '';
    var rcptNo     = f.rcptNo  || f.접수번호 || '';
    var classification = f.classification || f.분류번호 || '';
    var dateStr    = f.date    || f.날짜 || getTodayString();
    var receiver   = f.receiver || f.수신 || '';
    var reference  = f.reference || f.참조 || '';
    var via        = f.via     || f.경유 || '';
    var title      = f.title   || f.제목 || doc.title || '';
    var body       = f.body    || f.내용 || f.본문 || '';
    var purpose    = f.purpose || f.목적 || '';
    var attachments = f.attachments || f.붙임 || '';
    var senderName  = f.senderName  || f.발신명의 || orgName;
    var address    = f.address  || detail.address || '';
    var contact    = f.contact  || detail.phone   || '';
    var faxNo      = f.fax     || detail.fax      || '';
    var homepage   = f.homepage || detail.homepage || '';
    var eventDate   = f.eventDate   || f.행사일시 || '';
    var eventPlace  = f.eventPlace  || f.행사장소 || '';
    var eventTarget = f.eventTarget || f.대상     || '';
    var grantAmount = f.grantAmount || f.후원금액 || '';
    var grantDate   = f.grantDate   || f.후원일자 || '';
    var sponsorName = f.sponsorName || f.후원자성명 || '';

    var cooperators = [];
    try { cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]'); } catch (e) { cooperators = []; }
    if (!Array.isArray(cooperators)) cooperators = [];

    var html = '';

    /* 1. 머리 */
    html += '<div class="doc-head">';
    if (classification) html += '<div class="doc-head-classification">분류번호: ' + escapeHtml(classification) + '</div>';
    if (logo) html += '<img class="doc-logo-img" src="' + logo + '" alt="기관로고">';
    else       html += '<div class="doc-org-name-big">' + escapeHtml(orgName) + '</div>';
    html += '<hr class="doc-head-underline">';
    html += '</div>';

    /* 2. 수신·참조·경유 */
    html += '<table class="doc-meta-table">';
    if (via)        html += '<tr><td class="doc-meta-label">경  유</td><td class="doc-meta-value">' + escapeHtml(via)       + '</td></tr>';
    if (receiver) {
      html += '<tr><td class="doc-meta-label">수  신</td><td class="doc-meta-value">' + escapeHtml(receiver) + '</td></tr>';
    } else {
      var rcvs = (settings.receivers || []).map(function (r) { return typeof r === 'object' ? (r.name || '') : r; }).filter(Boolean);
      html += '<tr><td class="doc-meta-label">수  신</td><td class="doc-meta-value">' + escapeHtml(rcvs.join(', ') || '(수신처 없음)') + '</td></tr>';
    }
    if (reference)  html += '<tr><td class="doc-meta-label">참  조</td><td class="doc-meta-value">' + escapeHtml(reference) + '</td></tr>';
    html += '</table>';

    /* 3. 제목 */
    html += '<div class="doc-title-row">제  목: ' + escapeHtml(title) + '</div>';

    /* 4. 본문 */
    html += buildBody(tmpl, f, body, purpose, eventDate, eventPlace, eventTarget, grantAmount, grantDate, sponsorName);

    /* 5. 붙임 */
    if (attachments && attachments.trim()) {
      var items = attachments.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      html += '<div class="doc-attach-section"><div class="doc-attach-label">붙  임</div>';
      items.forEach(function (item, idx) {
        html += '<div class="doc-attach-item">' + (idx + 1) + '. ' + escapeHtml(item) + '&nbsp;&nbsp;1부.</div>';
      });
      html += '<div class="doc-attach-end">끝.</div></div>';
    } else {
      html += '<div style="text-align:right;font-weight:700;margin:14px 0 24px;font-size:11pt;">끝.</div>';
    }

    /* 6. 발신명의 */
    html += '<div class="doc-sender-row">' + escapeHtml(senderName) + '</div>';

    /* 7. 결재란 */
    html += renderApprovalBlock(settings, cooperators);

    /* 8. 하단 정보 */
    html += renderFooterInfo(docNo, rcptNo, dateStr, orgName, address, contact, faxNo, homepage);

    container.innerHTML = html;
  }

  /* ── 본문 빌더 ── */
  function buildBody(tmpl, f, body, purpose, eventDate, eventPlace, eventTarget, grantAmount, grantDate, sponsorName) {
    var html = '<div class="doc-body-section">';

    if (tmpl === 'event') {
      html += '<div class="doc-body-item"><span class="doc-body-item-num">1.</span><span>귀 기관의 무궁한 발전을 기원합니다.</span></div>';
      html += '<div class="doc-body-item"><span class="doc-body-item-num">2.</span><span>아래와 같이 행사를 안내드립니다.</span></div>';
      html += '</div>';
      html += '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:10.5pt;">';
      [['행사명', f.title||f.제목||''], ['일  시', eventDate], ['장  소', eventPlace], ['대  상', eventTarget], ['내  용', body]].forEach(function (r) {
        if (r[1]) html += '<tr><th style="background:#f5f5f5;border:1px solid #ccc;padding:6px 12px;width:80px;text-align:center;font-weight:600;">' + r[0] + '</th><td style="border:1px solid #ccc;padding:6px 12px;">' + escapeHtml(r[1]) + '</td></tr>';
      });
      html += '</table>';
      if (purpose) { html += '<div class="doc-body-section"><div class="doc-body-item"><span class="doc-body-item-num">3.</span><span>' + escapeHtml(purpose) + '</span></div></div>'; }
    } else if (tmpl === 'sponsor') {
      html += '<div class="doc-body-item"><span class="doc-body-item-num">1.</span><span>귀하의 따뜻한 후원에 진심으로 감사드립니다.</span></div>';
      if (sponsorName) html += '<div class="doc-body-item"><span class="doc-body-item-num">2.</span><span>후원자: ' + escapeHtml(sponsorName) + '</span></div>';
      if (grantDate)   html += '<div class="doc-body-item"><span class="doc-body-item-num">3.</span><span>후원일자: ' + escapeHtml(grantDate) + '</span></div>';
      if (grantAmount) html += '<div class="doc-body-item"><span class="doc-body-item-num">4.</span><span>후원금액: ' + escapeHtml(grantAmount) + '</span></div>';
      if (body)        html += '<div class="doc-body-item"><span class="doc-body-item-num">5.</span><span>' + escapeHtml(body) + '</span></div>';
      html += '</div>';
    } else {
      var paras = [purpose, body].filter(Boolean);
      if (paras.length === 0) paras = [''];
      paras.forEach(function (p, idx) {
        html += '<div class="doc-body-item"><span class="doc-body-item-num">' + (idx + 1) + '.</span><span>' + escapeHtml(p) + '</span></div>';
      });
      html += '</div>';
    }
    return html;
  }

  /* ── 결재란 ── */
  function renderApprovalBlock(settings, cooperators) {
    var levels = settings.approvalLevels;
    if (!levels || levels.length === 0) levels = [{title:'담당',name:''},{title:'과장',name:''},{title:'관장',name:''}];
    var html = '<div class="doc-approval-wrap">';
    if (cooperators.length) {
      html += '<div class="doc-coop-block"><div class="doc-coop-title">협 조 자</div><table class="approval-table"><thead><tr>';
      cooperators.forEach(function (c) { html += '<th>' + escapeHtml(typeof c === 'object' ? (c.title||c.name||'') : c) + '</th>'; });
      html += '</tr></thead><tbody><tr>';
      cooperators.forEach(function (c) { html += '<td>' + escapeHtml(typeof c === 'object' ? (c.sign||'') : '') + '</td>'; });
      html += '</tr></tbody></table></div>';
    }
    html += '<table class="approval-table"><thead><tr>';
    levels.forEach(function (l) { html += '<th>' + escapeHtml(l.title||'') + '</th>'; });
    html += '</tr></thead><tbody><tr>';
    levels.forEach(function (l) { html += '<td>' + escapeHtml(l.name||'') + '</td>'; });
    html += '</tr></tbody></table></div>';
    return html;
  }

  /* ── 하단 정보 ── */
  function renderFooterInfo(docNo, rcptNo, dateStr, orgName, address, contact, faxNo, homepage) {
    var html = '<hr class="doc-footer-divider"><hr class="doc-footer-thin">';
    html += '<div class="doc-footer-info"><div class="doc-footer-left">';
    html += '<div class="doc-num-row"><span class="doc-num-item"><span class="doc-num-label">시행</span> ' + escapeHtml(docNo||(orgName+'-')) + '&nbsp;&nbsp;&nbsp;(' + escapeHtml(dateStr) + ')</span>';
    html += '<span class="doc-num-item"><span class="doc-num-label">접수</span> (' + escapeHtml(rcptNo||'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') + ')</span></div>';
    if (address) html += '<div>' + escapeHtml(address) + '</div>';
    html += '</div><div class="doc-footer-right">';
    if (contact)  html += '<div>☎ ' + escapeHtml(contact) + '</div>';
    if (faxNo)    html += '<div>📠 ' + escapeHtml(faxNo) + '</div>';
    if (homepage) html += '<div>🌐 ' + escapeHtml(homepage) + '</div>';
    html += '</div></div>';
    return html;
  }

  /* ── 일반 텍스트 ── */
  function buildPlainText(doc) {
    var f = doc.fields || {};
    var s = Storage.getSettings();
    var lines = [s.orgName||'','','수신: '+(f.receiver||f.수신||'')];
    if (f.reference||f.참조) lines.push('참조: '+(f.reference||f.참조||''));
    lines.push('','제목: '+(f.title||f.제목||doc.title||''),'',f.purpose||f.목적||'',f.body||f.내용||f.본문||'','');
    var attach = f.attachments||f.붙임||'';
    if (attach.trim()) { lines.push('붙임'); attach.split('\n').forEach(function(a,i){ if(a.trim()) lines.push((i+1)+'. '+a.trim()+'  1부.'); }); }
    lines.push('끝.','',f.senderName||f.발신명의||s.orgName||'');
    return lines.join('\n');
  }

  /* ══════════════════ 이벤트 바인딩 ══════════════════ */
  function bindEvents() {
    function el(id, fn) { var e = document.getElementById(id); if (e) e.addEventListener('click', fn); }

    el('back-btn', function () { window.location.href = 'index.html'; });

    function goEdit() {
      if (!currentDoc) return;
      window.location.href = 'editor.html?id=' + encodeURIComponent(currentDoc.id) + '&type=' + currentType;
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

    function openComplete() { if (currentType !== 'doc') Modal.open('complete-modal'); }
    el('complete-btn',   openComplete);
    el('complete-btn-b', openComplete);
    el('complete-cancel-btn',  function () { Modal.close('complete-modal'); });
    el('complete-confirm-btn', function () { Modal.close('complete-modal'); saveAsComplete(); });

    function openDelete() { Modal.open('delete-modal'); }
    el('delete-btn',   openDelete);
    el('delete-btn-b', openDelete);
    el('delete-cancel-btn',  function () { Modal.close('delete-modal'); });
    el('delete-confirm-btn', function () { Modal.close('delete-modal'); doDelete(); });

    ['complete-modal','delete-modal'].forEach(function (id) {
      var overlay = document.getElementById(id);
      if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) Modal.close(id); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { Modal.close('complete-modal'); Modal.close('delete-modal'); }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); doPrint(); }
    });
  }

  /* ── 완성 저장 ── */
  function saveAsComplete() {
    if (!currentDoc) return;
    var doc = JSON.parse(JSON.stringify(currentDoc));
    doc.completedAt = new Date().toISOString();
    doc.status = 'complete';
    var saved = Storage.saveDoc(doc);
    if (saved && currentType === 'draft') Storage.deleteDraft(currentDoc.id);
    if (saved) { showToast('✅ 완성 문서함에 저장되었습니다.', 'success'); currentType = 'doc'; currentDoc = doc; updateStatus(); }
    else showToast('저장 중 오류가 발생했습니다.', 'error');
  }

  /* ── 삭제 ── */
  function doDelete() {
    if (!currentDoc) return;
    if (currentType === 'doc') Storage.deleteDoc(currentDoc.id); else Storage.deleteDraft(currentDoc.id);
    showToast('🗑️ 삭제되었습니다.', 'info');
    setTimeout(function () { window.location.href = 'index.html'; }, 800);
  }

  /* ══════════════════ DOMContentLoaded ══════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initPreview();
    bindEvents();
  });
})();
