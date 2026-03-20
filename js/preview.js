/**
 * js/preview.js
 * 공문서 미리보기 페이지 스크립트
 */

let currentDoc  = null;
let currentType = 'draft';

// ── 초기화 ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPreview();
  bindPreviewEvents();
});

function initPreview() {
  const params = getUrlParams();
  const id     = params.id;
  const type   = params.type || 'draft';

  if (!id) {
    showToast('문서 ID가 없습니다.', 'error');
    return;
  }

  currentType = type;
  currentDoc  = type === 'doc' ? Storage.getDoc(id) : Storage.getDraft(id);

  if (!currentDoc) {
    showToast('문서를 찾을 수 없습니다.', 'error');
    document.getElementById('doc-preview').innerHTML =
      '<p style="text-align:center;color:#e74c3c;">문서를 불러올 수 없습니다.</p>';
    return;
  }

  renderPreview(currentDoc);
  updateDocStatus();
}

// ── 미리보기 렌더링 ────────────────────────────────────────────────
function renderPreview(doc) {
  const container = document.getElementById('doc-preview');
  if (!container) return;

  const settings = Storage.getSettings();
  const detail   = ExtendedStorage.getOrgDetail();
  const logo     = LogoManager.get();
  const orgName  = settings.orgName || '○○기관';
  const today    = getTodayString();

  // 필드 파싱
  const fields         = doc.fields || {};
  const receiver       = fields.receiver       || '';
  const receiverDept   = fields['receiver-dept'] || '';
  const via            = fields.via            || '';
  const title          = fields.title          || '';
  const related        = fields.related        || '';
  const body           = fields.body           || '';
  const attachments    = fields.attachments    || '';
  const datetime       = fields.datetime       || '';
  const location       = fields.location       || '';
  const target         = fields.target         || '';
  const sponsorName    = fields['sponsor-name'] || '';
  const sponsorDetail  = fields['sponsor-detail'] || '';
  const docNumber      = fields.docNumber      || '';
  const receiptNumber  = fields.receiptNumber  || '';
  const templateId     = doc.templateId        || 'internal';

  let html = '<div class="doc-paper">';

  // ── 로고 / 기관명 헤더 ──────────────────────────────────────
  html += '<div class="doc-header">';
  if (logo) {
    html += `<div class="doc-logo-area"><img src="${logo}" alt="기관 로고" class="doc-logo"></div>`;
  }
  html += `<div class="doc-org-name">${escapeHtml(orgName)}</div>`;
  html += '<div class="doc-header-line"></div>';
  html += '</div>';

  // ── 문서 구분 표시 ───────────────────────────────────────────
  if (templateId === 'internal') {
    html += '<div class="doc-type-label">내 부 결 재</div>';
  }

  // ── 수신 ─────────────────────────────────────────────────────
  html += '<div class="doc-fields">';
  if (receiver) {
    if (templateId === 'internal') {
      html += `<div class="doc-field-row"><span class="doc-label">수신</span><span class="doc-value">내부결재</span></div>`;
    } else if (templateId === 'sponsor') {
      html += `<div class="doc-field-row"><span class="doc-label">수신</span><span class="doc-value">${escapeHtml(receiver)} 귀하</span></div>`;
      if (receiverDept) html += `<div class="doc-field-row"><span class="doc-label"></span><span class="doc-value">${escapeHtml(receiverDept)}</span></div>`;
    } else {
      html += `<div class="doc-field-row"><span class="doc-label">수신</span><span class="doc-value">${escapeHtml(receiver)}${receiverDept ? ` (${escapeHtml(receiverDept)})` : ''}</span></div>`;
    }
  }

  if (via && templateId !== 'internal') {
    html += `<div class="doc-field-row"><span class="doc-label">경유</span><span class="doc-value">${escapeHtml(via)}</span></div>`;
  }
  html += '</div>';

  // ── 제목 ─────────────────────────────────────────────────────
  html += `<div class="doc-title">${escapeHtml(title || '(제목 없음)')}</div>`;

  // ── 본문 ─────────────────────────────────────────────────────
  html += '<div class="doc-body">';

  if (related) {
    html += `<p class="doc-body-line">1. 관련: ${escapeHtml(related)}</p>`;
  }

  if (templateId === 'event') {
    const num = related ? '2' : '1';
    html += `<p class="doc-body-line">${num}. 다음과 같이 행사를 개최하오니 참석하여 주시기 바랍니다.</p>`;
    html += '<div class="doc-event-box">';
    if (datetime) html += `<p>가. 일&nbsp;&nbsp;시: ${escapeHtml(datetime)}</p>`;
    if (location) html += `<p>나. 장&nbsp;&nbsp;소: ${escapeHtml(location)}</p>`;
    if (target)   html += `<p>다. 대&nbsp;&nbsp;상: ${escapeHtml(target)}</p>`;
    if (body)     html += `<p>라. 내&nbsp;&nbsp;용: ${escapeHtml(body)}</p>`;
    html += '</div>';
  } else if (templateId === 'sponsor') {
    if (body) {
      html += `<p class="doc-body-line">${escapeHtml(body).replace(/\n/g, '<br>')}</p>`;
    } else {
      html += `<p class="doc-body-line">귀하의 따뜻한 후원에 깊이 감사드립니다.</p>`;
    }
    if (sponsorName)   html += `<p class="doc-body-line">후원자: ${escapeHtml(sponsorName)}</p>`;
    if (sponsorDetail) html += `<p class="doc-body-line">후원 내용: ${escapeHtml(sponsorDetail)}</p>`;
  } else {
    if (body) {
      const num = related ? '2' : '1';
      html += `<p class="doc-body-line">${num}. ${escapeHtml(body).replace(/\n/g, '<br>')}</p>`;
    }
  }

  html += '</div>';

  // ── 붙임 ─────────────────────────────────────────────────────
  if (attachments) {
    html += `<div class="doc-attachments"><span class="doc-attach-label">붙임</span> ${escapeHtml(attachments)}</div>`;
  }

  // ── 끝. ──────────────────────────────────────────────────────
  html += '<div class="doc-end">끝.</div>';

  // ── 발신명의 + 결재란 ────────────────────────────────────────
  html += '<div class="doc-footer-area">';

  if (templateId !== 'internal') {
    html += `<div class="doc-sender"><strong>${escapeHtml(orgName)}</strong></div>`;
  }

  html += renderApprovalSection(settings);
  html += '</div>';

  // ── 문서 하단 정보 ────────────────────────────────────────────
  if (templateId !== 'internal') {
    html += renderDocInfo(docNumber, receiptNumber, detail, today);
  }

  html += '</div>'; // .doc-paper

  container.innerHTML = html;

  // 제목 업데이트
  const titleEl = document.getElementById('preview-title');
  if (titleEl) titleEl.textContent = title || '미리보기';
}

// ── 결재란 렌더링 ──────────────────────────────────────────────────
function renderApprovalSection(settings) {
  const levels      = settings.approvalLevels || DEFAULT_APPROVAL;
  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');

  let html = '<div class="doc-approval-wrap">';

  // 협조자 영역
  if (cooperators.length > 0) {
    html += '<table class="doc-approval-table doc-coop-table">';
    html += '<thead><tr><th colspan="2">협 조</th></tr></thead>';
    html += '<tbody><tr>';
    html += `<td class="approval-title-cell">${cooperators.map(c => escapeHtml(c.title || '')).join('<br>')}</td>`;
    html += `<td class="approval-sign-cell">${cooperators.map(c => escapeHtml(c.name  || '')).join('<br>')}</td>`;
    html += '</tr></tbody></table>';
  }

  // 결재라인 테이블
  html += '<table class="doc-approval-table">';
  html += '<thead><tr>';
  levels.forEach(lv => {
    html += `<th>${escapeHtml(lv.title || '')}</th>`;
  });
  html += '</tr></thead>';
  html += '<tbody><tr>';
  levels.forEach(lv => {
    html += `<td class="approval-sign-cell">${escapeHtml(lv.name || '')}</td>`;
  });
  html += '</tr></tbody></table>';

  html += '</div>';
  return html;
}

// ── 문서 하단 정보 렌더링 ──────────────────────────────────────────
function renderDocInfo(docNumber, receiptNumber, detail, today) {
  let html = '<div class="doc-info-area">';
  html += '<div class="doc-info-line">';

  if (docNumber)     html += `<span>시행 ${escapeHtml(docNumber)}</span>`;
  if (receiptNumber) html += `<span>접수 ${escapeHtml(receiptNumber)}</span>`;
  if (today)         html += `<span>${today}</span>`;
  html += '</div>';

  if (detail.zipCode || detail.address) {
    html += '<div class="doc-info-line">';
    if (detail.zipCode) html += `<span>우 ${escapeHtml(detail.zipCode)}</span>`;
    if (detail.address) html += `<span>${escapeHtml(detail.address)}</span>`;
    if (detail.homepage) html += `<span>/ ${escapeHtml(detail.homepage)}</span>`;
    html += '</div>';
  }

  if (detail.tel || detail.fax || detail.email) {
    html += '<div class="doc-info-line">';
    if (detail.tel)         html += `<span>전화 ${escapeHtml(detail.tel)}</span>`;
    if (detail.fax)         html += `<span>팩스 ${escapeHtml(detail.fax)}</span>`;
    if (detail.email)       html += `<span>/ ${escapeHtml(detail.email)}</span>`;
    if (detail.disclosure)  html += `<span>/ ${escapeHtml(detail.disclosure)}</span>`;
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ── 문서 상태 표시 ─────────────────────────────────────────────────
function updateDocStatus() {
  const statusEl = document.getElementById('doc-status');
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

  const completeDoc = {
    ...currentDoc,
    id:          currentDoc.id.startsWith('doc_') ? currentDoc.id : `doc_${Date.now()}`,
    completedAt: new Date().toISOString()
  };

  Storage.saveDoc(completeDoc);

  if (currentType === 'draft') {
    Storage.deleteDraft(currentDoc.id);
  }

  currentDoc  = completeDoc;
  currentType = 'doc';

  updateDocStatus();
  showToast('완성 문서로 저장되었습니다! ✅', 'success');
  Modal.close('complete-confirm-modal');

  // URL 업데이트
  const newUrl = `preview.html?id=${completeDoc.id}&type=doc`;
  window.history.replaceState(null, '', newUrl);
}

// ── 인쇄 ───────────────────────────────────────────────────────────
function printDocument() {
  window.print();
}

// ── 텍스트 복사 ────────────────────────────────────────────────────
function buildTextContent(doc) {
  if (!doc) return '';
  return doc.content || '';
}

function openCopyModal() {
  const text = buildTextContent(currentDoc);
  copyToClipboard(text);
  showToast('클립보드에 복사되었습니다! 📋', 'success');
}

// ── 에디터로 이동 ──────────────────────────────────────────────────
function goToEdit() {
  if (!currentDoc) return;
  window.location.href = `editor.html?id=${currentDoc.id}&type=${currentType}`;
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
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

// ── 이벤트 바인딩 ──────────────────────────────────────────────────
function bindPreviewEvents() {

  // 수정 버튼
  ['edit-btn', 'edit-btn-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', goToEdit);
  });

  // 복사 버튼
  ['copy-btn', 'copy-btn-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openCopyModal);
  });

  // 인쇄 버튼
  ['print-btn', 'print-btn-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', printDocument);
  });

  // 완성 저장 버튼
  ['complete-btn', 'complete-btn-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => Modal.open('complete-confirm-modal'));
  });

  // 완성 저장 확인
  const confirmCompleteBtn = document.getElementById('confirm-complete-btn');
  if (confirmCompleteBtn) confirmCompleteBtn.addEventListener('click', saveAsComplete);

  // 삭제 버튼
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => Modal.open('delete-confirm-modal'));

  // 삭제 확인
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteCurrentDoc);

  // 뒤로 가기
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'index.html');

  // 모달 닫기
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) Modal.close(modal.id);
    });
  });

  // Ctrl+P → 인쇄
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      printDocument();
    }
  });
}
