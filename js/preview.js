/**
 * js/preview.js
 * 공문서 미리보기 - 완전 개선본
 */

var currentDoc  = null;
var currentType = 'draft';

document.addEventListener('DOMContentLoaded', function() {
  initPreview();
  bindPreviewEvents();
});

// ── 초기화 ─────────────────────────────────────────────────────────
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
    var preview = document.getElementById('doc-preview');
    if (preview) preview.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:60px;">문서를 불러올 수 없습니다.</p>';
    return;
  }

  renderPreview(currentDoc);
  updateDocStatus();
}

// ── 미리보기 렌더링 ────────────────────────────────────────────────
function renderPreview(doc) {
  var container = document.getElementById('doc-preview');
  if (!container) return;

  var settings    = Storage.getSettings();
  var detail      = ExtendedStorage.getOrgDetail();
  var logo        = LogoManager.get();
  var orgName     = settings.orgName || '○○기관';
  var today       = getTodayString();
  var templateId  = doc.templateId || 'internal';
  var fields      = doc.fields || {};
  var cooperators = [];
  try { cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]'); } catch(e) {}

  // 필드값 파싱
  var receiver      = fields.receiver       || '';
  var receiverDept  = fields['receiver-dept'] || '';
  var via           = fields.via            || '';
  var title         = fields.title          || '';
  var related       = fields.related        || '';
  var body          = fields.body           || '';
  var attachments   = fields.attachments    || '';
  var datetime      = fields.datetime       || '';
  var location      = fields.location       || '';
  var target        = fields.target         || '';
  var sponsorName   = fields['sponsor-name']   || '';
  var sponsorDetail = fields['sponsor-detail'] || '';
  var docNumber     = fields.docNumber      || '';
  var receiptNumber = fields.receiptNumber  || '';

  var html = '<div class="doc-paper">';

  // ══════════════════════════════════════════
  // 1. 헤더 (로고 + 기관명 + 이중 구분선)
  // ══════════════════════════════════════════
  html += '<div class="doc-header">';

  if (logo) {
    // 로고가 있으면 중앙에 크게
    html += '<div class="doc-logo-wrap"><img src="' + logo + '" alt="기관 로고" class="doc-logo-img"></div>';
  } else {
    // 로고 없으면 기관명 텍스트
    html += '<div class="doc-orgname-text">' + escapeHtml(orgName) + '</div>';
  }

  // 이중 구분선 (굵은선 + 얇은선)
  html += '<div class="doc-header-lines"><div class="doc-line-thick"></div><div class="doc-line-thin"></div></div>';
  html += '</div>';

  // ══════════════════════════════════════════
  // 2. 수신 / 경유
  // ══════════════════════════════════════════
  html += '<div class="doc-receiver-area">';

  if (templateId === 'internal') {
    html += '<div class="doc-field-row"><span class="doc-label">수신자</span><span class="doc-value">내부결재</span></div>';
  } else if (receiver) {
    if (templateId === 'sponsor') {
      html += '<div class="doc-field-row"><span class="doc-label">수신자</span><span class="doc-value">' + escapeHtml(receiver) + ' 귀하</span></div>';
      if (receiverDept) html += '<div class="doc-field-row"><span class="doc-label"></span><span class="doc-value">' + escapeHtml(receiverDept) + '</span></div>';
    } else {
      html += '<div class="doc-field-row"><span class="doc-label">수신자</span><span class="doc-value">' + escapeHtml(receiver) + (receiverDept ? ' (' + escapeHtml(receiverDept) + ')' : '') + '</span></div>';
    }
  }

  if (via && templateId !== 'internal') {
    html += '<div class="doc-field-row"><span class="doc-label">(경유)</span><span class="doc-value">' + escapeHtml(via) + '</span></div>';
  }

  html += '</div>';

  // ══════════════════════════════════════════
  // 3. 제목 (굵게 + 밑줄 + 좌측정렬)
  // ══════════════════════════════════════════
  html += '<div class="doc-title-area">';
  html += '<span class="doc-title-label">제목</span>';
  html += '<span class="doc-title-text">' + escapeHtml(title || '(제목 없음)') + '</span>';
  html += '</div>';

  // ══════════════════════════════════════════
  // 4. 본문
  // ══════════════════════════════════════════
  html += '<div class="doc-body-area">';

  if (templateId === 'event') {
    var num1 = 1;
    if (related) {
      html += '<p class="doc-body-para"><span class="doc-para-num">' + num1 + '.</span> 관련: ' + escapeHtml(related) + '</p>';
      num1++;
    }
    html += '<p class="doc-body-para"><span class="doc-para-num">' + num1 + '.</span> 다음과 같이 행사를 개최하오니 참석하여 주시기 바랍니다.</p>';
    html += '<div class="doc-event-table">';
    if (datetime) html += '<div class="doc-event-row"><span class="doc-event-label">가. 일&nbsp;&nbsp;시</span><span class="doc-event-value">: ' + escapeHtml(datetime) + '</span></div>';
    if (location) html += '<div class="doc-event-row"><span class="doc-event-label">나. 장&nbsp;&nbsp;소</span><span class="doc-event-value">: ' + escapeHtml(location) + '</span></div>';
    if (target)   html += '<div class="doc-event-row"><span class="doc-event-label">다. 대&nbsp;&nbsp;상</span><span class="doc-event-value">: ' + escapeHtml(target) + '</span></div>';
    if (body)     html += '<div class="doc-event-row"><span class="doc-event-label">라. 내&nbsp;&nbsp;용</span><span class="doc-event-value">: ' + escapeHtml(body) + '</span></div>';
    html += '</div>';

  } else if (templateId === 'sponsor') {
    var sponsorBody = body || '귀하의 따뜻한 후원에 깊이 감사드립니다. 소중한 후원은 이용자들의 복지 향상을 위해 소중히 사용하겠습니다.';
    html += '<p class="doc-body-para">' + escapeHtml(sponsorBody).replace(/\n/g, '<br>') + '</p>';
    if (sponsorName)   html += '<p class="doc-body-para">후원자: ' + escapeHtml(sponsorName) + '</p>';
    if (sponsorDetail) html += '<p class="doc-body-para">후원 내용: ' + escapeHtml(sponsorDetail) + '</p>';

  } else {
    var paraNum = 1;
    if (related) {
      html += '<p class="doc-body-para"><span class="doc-para-num">' + paraNum + '.</span> 관련: ' + escapeHtml(related) + '</p>';
      paraNum++;
    }
    if (body) {
      // 줄바꿈 처리
      var bodyLines = body.split('\n');
      bodyLines.forEach(function(line, idx) {
        if (idx === 0) {
          html += '<p class="doc-body-para"><span class="doc-para-num">' + paraNum + '.</span> ' + escapeHtml(line) + '</p>';
        } else if (line.trim()) {
          html += '<p class="doc-body-sub">' + escapeHtml(line) + '</p>';
        }
      });
    }
  }

  html += '</div>';

  // ══════════════════════════════════════════
  // 5. 붙임
  // ══════════════════════════════════════════
  if (attachments) {
    html += '<div class="doc-attach-area">';
    // 붙임 항목을 줄바꿈으로 분리
    var attachLines = attachments.split(/\n|,/).filter(function(s){ return s.trim(); });
    if (attachLines.length === 1) {
      html += '<div class="doc-attach-row">';
      html += '<span class="doc-attach-label">붙임</span>';
      html += '<span class="doc-attach-item">1. ' + escapeHtml(attachLines[0].trim()) + '&nbsp;&nbsp;&nbsp;끝.</span>';
      html += '</div>';
    } else {
      attachLines.forEach(function(line, idx) {
        html += '<div class="doc-attach-row">';
        if (idx === 0) {
          html += '<span class="doc-attach-label">붙임</span>';
        } else {
          html += '<span class="doc-attach-label"></span>';
        }
        if (idx === attachLines.length - 1) {
          html += '<span class="doc-attach-item">' + (idx+1) + '. ' + escapeHtml(line.trim()) + '&nbsp;&nbsp;&nbsp;끝.</span>';
        } else {
          html += '<span class="doc-attach-item">' + (idx+1) + '. ' + escapeHtml(line.trim()) + '</span>';
        }
        html += '</div>';
      });
    }
    html += '</div>';
  } else {
    // 붙임 없을 때 끝. 표시
    html += '<div class="doc-end-mark">끝.</div>';
  }

  // ══════════════════════════════════════════
  // 6. 발신명의 (내부결재 제외)
  // ══════════════════════════════════════════
  if (templateId !== 'internal') {
    html += '<div class="doc-sender-area">';
    html += '<div class="doc-sender-name">' + escapeHtml(orgName) + '</div>';
    html += '</div>';
  }

  // ══════════════════════════════════════════
  // 7. 결재란
  // ══════════════════════════════════════════
  html += renderApprovalTable(settings, cooperators, templateId);

  // ══════════════════════════════════════════
  // 8. 하단 구분선 + 시행번호 + 주소
  // ══════════════════════════════════════════
  if (templateId !== 'internal') {
    html += renderDocFooter(docNumber, receiptNumber, detail, today);
  }

  html += '</div>'; // .doc-paper

  container.innerHTML = html;

  // 제목 업데이트
  var titleEl = document.getElementById('preview-title');
  if (titleEl) titleEl.textContent = title || '미리보기';
}

// ── 결재란 렌더링 ──────────────────────────────────────────────────
function renderApprovalTable(settings, cooperators, templateId) {
  var levels = settings.approvalLevels || [
    { title:'담당', name:'' },
    { title:'과장', name:'' },
    { title:'관장', name:'' }
  ];

  var html = '<div class="doc-approval-area">';

  // 협조자 라벨 (원본처럼 ★ 협조자 좌측 표시)
  if (cooperators.length > 0) {
    html += '<div class="doc-coop-label">★ 협조자</div>';
  }

  html += '<div class="doc-approval-right">';

  // 협조자 테이블
  if (cooperators.length > 0) {
    html += '<table class="doc-approval-table doc-coop-table">';
    html += '<thead><tr><th colspan="2">협&nbsp;&nbsp;조</th></tr></thead>';
    html += '<tbody><tr>';
    html += '<td class="approval-cell-title">' + cooperators.map(function(c){ return escapeHtml(c.title||''); }).join('<br>') + '</td>';
    html += '<td class="approval-cell-sign">'  + cooperators.map(function(c){ return escapeHtml(c.name ||''); }).join('<br>') + '</td>';
    html += '</tr></tbody></table>';
  }

  // 결재라인 테이블
  html += '<table class="doc-approval-table">';
  html += '<thead><tr>';
  levels.forEach(function(lv) {
    html += '<th>' + escapeHtml(lv.title || '') + '</th>';
  });
  html += '</tr></thead>';
  html += '<tbody><tr>';
  levels.forEach(function(lv) {
    html += '<td class="approval-cell-sign">' + escapeHtml(lv.name || '') + '</td>';
  });
  html += '</tr></tbody></table>';

  html += '</div>'; // .doc-approval-right
  html += '</div>'; // .doc-approval-area

  return html;
}

// ── 문서 하단 정보 렌더링 ──────────────────────────────────────────
function renderDocFooter(docNumber, receiptNumber, detail, today) {
  var html = '<div class="doc-footer-area">';

  // 굵은 구분선
  html += '<div class="doc-footer-line"></div>';

  // 시행번호 / 접수번호 행
  html += '<div class="doc-footer-row doc-footer-numbers">';
  if (docNumber) {
    html += '<span>시행&nbsp;&nbsp;' + escapeHtml(docNumber) + '</span>';
  }
  if (receiptNumber) {
    html += '<span class="doc-footer-receipt">접수&nbsp;(' + escapeHtml(receiptNumber) + ')</span>';
  } else {
    html += '<span class="doc-footer-receipt">접수&nbsp;&nbsp;(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>';
  }
  html += '</div>';

  // 주소 행
  if (detail && (detail.zipCode || detail.address)) {
    html += '<div class="doc-footer-row">';
    if (detail.zipCode) html += '<span>우 ' + escapeHtml(detail.zipCode) + '&nbsp;&nbsp;</span>';
    if (detail.address) html += '<span>' + escapeHtml(detail.address) + '&nbsp;&nbsp;</span>';
    if (detail.homepage) html += '<span>/ ' + escapeHtml(detail.homepage) + '</span>';
    html += '</div>';
  }

  // 연락처 행
  if (detail && (detail.tel || detail.fax || detail.email)) {
    html += '<div class="doc-footer-row">';
    if (detail.tel)        html += '<span>전화' + escapeHtml(detail.tel) + '&nbsp;&nbsp;</span>';
    if (detail.fax)        html += '<span>팩스' + escapeHtml(detail.fax) + '&nbsp;&nbsp;</span>';
    if (detail.email)      html += '<span>/ ' + escapeHtml(detail.email) + '&nbsp;&nbsp;</span>';
    if (detail.disclosure) html += '<span>/ ' + escapeHtml(detail.disclosure) + '</span>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ── 문서 상태 표시 ─────────────────────────────────────────────────
function updateDocStatus() {
  var statusEl = document.getElementById('doc-status');
  if (!statusEl || !currentDoc) return;
  if (currentType === 'doc') {
    statusEl.innerHTML = '<span class="badge badge-success">✅ 완성 문서</span>';
  } else {
    statusEl.innerHTML = '<span class="badge badge-warning">📝 임시저장</span>';
  }
}

// ── 완성 문서로 저장 ───────────────────────────────────────────────
function saveAsComplete() {
  if (!currentDoc) return;

  var completeDoc = {};
  for (var k in currentDoc) { completeDoc[k] = currentDoc[k]; }
  completeDoc.completedAt = new Date().toISOString();
  if (completeDoc.id.indexOf('doc_') !== 0) {
    completeDoc.id = 'doc_' + completeDoc.id;
  }

  Storage.saveDoc(completeDoc);
  if (currentType === 'draft') Storage.deleteDraft(currentDoc.id);

  currentDoc  = completeDoc;
  currentType = 'doc';
  updateDocStatus();
  showToast('완성 문서로 저장되었습니다! ✅', 'success');
  Modal.close('complete-confirm-modal');
  window.history.replaceState(null, '', 'preview.html?id=' + completeDoc.id + '&type=doc');
}

// ── 인쇄 ───────────────────────────────────────────────────────────
function printDocument() { window.print(); }

// ── 복사 ───────────────────────────────────────────────────────────
function openCopyModal() {
  if (currentDoc && currentDoc.content) {
    copyToClipboard(currentDoc.content);
  }
  showToast('클립보드에 복사되었습니다! 📋', 'success');
}

// ── 에디터로 이동 ──────────────────────────────────────────────────
function goToEdit() {
  if (!currentDoc) return;
  window.location.href = 'editor.html?id=' + currentDoc.id + '&type=' + currentType;
}

// ── 문서 삭제 ──────────────────────────────────────────────────────
function deleteCurrentDoc() {
  if (!currentDoc) return;
  if (currentType === 'doc') {
    Storage.deleteDoc(currentDoc.id);
  } else {
    Storage.deleteDraft(currentDoc.id);
  }
  showToast('문서가 삭제되었습니다.', 'info');
  Modal.close('delete-confirm-modal');
  setTimeout(function() { window.location.href = 'index.html'; }, 800);
}

// ── 이벤트 바인딩 ──────────────────────────────────────────────────
function bindPreviewEvents() {

  // 수정 버튼
  ['edit-btn','edit-btn-bottom'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', goToEdit);
  });

  // 복사 버튼
  ['copy-btn','copy-btn-bottom'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openCopyModal);
  });

  // 인쇄 버튼
  ['print-btn','print-btn-bottom'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', printDocument);
  });

  // 완성 저장 버튼
  ['complete-btn','complete-btn-bottom'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function() { Modal.open('complete-confirm-modal'); });
  });

  // 완성 확인
  var confirmCompleteBtn = document.getElementById('confirm-complete-btn');
  if (confirmCompleteBtn) confirmCompleteBtn.addEventListener('click', saveAsComplete);

  // 삭제 버튼
  var deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', function() { Modal.open('delete-confirm-modal'); });

  // 삭제 확인
  var confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteCurrentDoc);

  // 뒤로 가기
  var backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', function() { window.location.href = 'index.html'; });

  // 모달 닫기
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var modal = btn.closest('.modal-overlay');
      if (modal) Modal.close(modal.id);
    });
  });

  // Ctrl+P
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      printDocument();
    }
  });
}
