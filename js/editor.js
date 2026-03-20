/**
 * js/editor.js
 * 공문서 에디터 페이지 스크립트
 */

// ── 전역 변수 ──────────────────────────────────────────────────────
let currentDocId       = null;
let currentTemplateId  = 'internal';
let isModified         = false;
let checkResults       = [];
let realtimeCheckTimer = null;
let autoSaveTimer      = null;

// ── 초기화 ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  bindEditorEvents();
  autoSaveTimer = startAutoSave(autoSaveDocument, 30000);
});

function initEditor() {
  const params     = getUrlParams();
  const docId      = params.id;
  const docType    = params.type || 'draft';
  const templateId = params.template || 'internal';

  if (docId) {
    loadExistingDocument(docId, docType);
  } else {
    currentDocId = generateId('doc');
    selectTemplate(templateId, true);
  }
  loadOrgSettings();
}

// ── 기관 설정 불러오기 ─────────────────────────────────────────────
function loadOrgSettings() {
  const settings = Storage.getSettings();
  const orgNameEl = document.getElementById('org-name-display');
  if (orgNameEl) orgNameEl.textContent = settings.orgName || '기관명 미설정';

  if (!settings.orgName) {
    const notice = document.getElementById('org-name-notice');
    if (notice) notice.style.display = 'block';
  }

  loadReceiverOptions();
}

function loadReceiverOptions() {
  const settings  = Storage.getSettings();
  const receivers = settings.receivers || [];
  const select    = document.getElementById('receiver-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- 자주 쓰는 수신처 선택 --</option>';
  receivers.forEach((r, idx) => {
    if (r.title || r.dept) {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${r.title || ''} ${r.dept ? `(${r.dept})` : ''}`.trim();
      select.appendChild(opt);
    }
  });

  select.addEventListener('change', () => {
    const idx = parseInt(select.value);
    if (isNaN(idx)) return;
    const r = receivers[idx];
    if (!r) return;
    const receiverInput = document.getElementById('field-receiver');
    const deptInput     = document.getElementById('field-receiver-dept');
    if (receiverInput) receiverInput.value = r.title || '';
    if (deptInput)     deptInput.value     = r.dept  || '';
    onFieldInput();
  });
}

// ── 기존 문서 불러오기 ─────────────────────────────────────────────
function loadExistingDocument(id, type) {
  const doc = type === 'doc' ? Storage.getDoc(id) : Storage.getDraft(id);
  if (!doc) {
    showToast('문서를 찾을 수 없습니다.', 'error');
    return;
  }

  currentDocId      = id;
  currentTemplateId = doc.templateId || 'internal';
  selectTemplate(currentTemplateId, true);

  // 저장된 필드 값 복원
  if (doc.fields) {
    Object.keys(doc.fields).forEach(key => {
      const el = document.getElementById(`field-${key}`);
      if (el) el.value = doc.fields[key] || '';
    });
  }

  if (doc.content) {
    const editor = document.getElementById('editor-content');
    if (editor) editor.value = doc.content;
  }

  updatePreviewContent();
  runRealtimeCheck();
  showToast('문서를 불러왔습니다.', 'success');
}

// ── 템플릿 선택 ────────────────────────────────────────────────────
function selectTemplate(templateId, clearFields = true) {
  if (typeof TEMPLATES === 'undefined') return;

  currentTemplateId = templateId;

  // 버튼 활성화
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.template === templateId);
  });

  const template = TEMPLATES[templateId];
  if (!template) return;

  renderGuidePanel(template);
  renderFormFields(template, clearFields);
  updatePreviewContent();
}

// ── 가이드 패널 렌더링 ─────────────────────────────────────────────
function renderGuidePanel(template) {
  const panel = document.getElementById('guide-panel');
  if (!panel) return;

  const items = (template.guide || []).map(g => `<li>${escapeHtml(g)}</li>`).join('');
  panel.innerHTML = `
    <div class="guide-card">
      <h4>📌 ${escapeHtml(template.name)} 작성 가이드</h4>
      <ul class="guide-list">${items}</ul>
    </div>`;
}

// ── 폼 필드 렌더링 ─────────────────────────────────────────────────
function renderFormFields(template, clearFields = true) {
  const container = document.getElementById('form-fields');
  if (!container) return;

  const settings  = Storage.getSettings();
  const receivers = settings.receivers || [];

  // 수신처 선택 옵션
  const receiverOptions = receivers.map((r, i) =>
    `<option value="${i}">${escapeHtml(r.title || '')} ${r.dept ? `(${escapeHtml(r.dept)})` : ''}</option>`
  ).join('');

  let html = '';

  // ── 수신처 선택 (공통) ─────────────────────────────────────────
  html += `
    <div class="field-row">
      <label>자주 쓰는 수신처</label>
      <select id="receiver-select" class="form-select">
        <option value="">-- 선택 --</option>
        ${receiverOptions}
      </select>
    </div>`;

  // ── 수신 ───────────────────────────────────────────────────────
  if (template.id === 'internal') {
    html += `
      <div class="field-row">
        <label class="required">수신</label>
        <input type="text" id="field-receiver" class="form-input"
               placeholder="내부결재" value="내부결재">
      </div>`;
  } else if (template.id === 'sponsor') {
    html += `
      <div class="field-row">
        <label class="required">수신</label>
        <input type="text" id="field-receiver" class="form-input"
               placeholder="홍길동 귀하">
        <input type="text" id="field-receiver-dept" class="form-input mt-1"
               placeholder="주소 (예: 서울시 강남구 …)">
      </div>`;
  } else {
    html += `
      <div class="field-row">
        <label class="required">수신</label>
        <input type="text" id="field-receiver" class="form-input"
               placeholder="예: ○○시장">
        <input type="text" id="field-receiver-dept" class="form-input mt-1"
               placeholder="참조 부서 (예: 사회복지과장)">
      </div>`;
  }

  // ── 경유 (내부결재 제외) ───────────────────────────────────────
  if (template.id !== 'internal') {
    html += `
      <div class="field-row">
        <label>경유</label>
        <input type="text" id="field-via" class="form-input"
               placeholder="경유 기관 (없으면 비워두세요)">
      </div>`;
  }

  // ── 제목 ───────────────────────────────────────────────────────
  html += `
    <div class="field-row">
      <label class="required">제목</label>
      <input type="text" id="field-title" class="form-input"
             placeholder="문서 제목을 입력하세요">
    </div>`;

  // ── 관련 근거 ──────────────────────────────────────────────────
  if (['government','cooperation','event'].includes(template.id)) {
    html += `
      <div class="field-row">
        <label>관련 근거</label>
        <input type="text" id="field-related" class="form-input"
               placeholder="예: 사회복지사업법 제○조, 업무협약 제○항">
      </div>`;
  }

  // ── 행사 전용 필드 ─────────────────────────────────────────────
  if (template.id === 'event') {
    html += `
      <div class="field-row">
        <label class="required">행사 일시</label>
        <input type="text" id="field-datetime" class="form-input"
               placeholder="예: 2024. 5. 15. 14:00">
      </div>
      <div class="field-row">
        <label class="required">장소</label>
        <input type="text" id="field-location" class="form-input"
               placeholder="예: ○○복지관 대강당">
      </div>
      <div class="field-row">
        <label>대상</label>
        <input type="text" id="field-target" class="form-input"
               placeholder="예: 지역 내 사회복지기관 종사자">
      </div>`;
  }

  // ── 후원자 주소 ────────────────────────────────────────────────
  if (template.id === 'sponsor') {
    html += `
      <div class="field-row">
        <label>후원자 성명</label>
        <input type="text" id="field-sponsor-name" class="form-input"
               placeholder="예: 홍길동">
      </div>
      <div class="field-row">
        <label>후원 내용</label>
        <input type="text" id="field-sponsor-detail" class="form-input"
               placeholder="예: 후원금 500,000원 (2024. 1. 15.)">
      </div>`;
  }

  // ── 본문 ───────────────────────────────────────────────────────
  html += `
    <div class="field-row">
      <label class="required">본문</label>
      <textarea id="field-body" class="form-textarea" rows="6"
                placeholder="문서 본문을 입력하세요."></textarea>
    </div>`;

  // ── 붙임 ───────────────────────────────────────────────────────
  html += `
    <div class="field-row">
      <label>붙임</label>
      <input type="text" id="field-attachments" class="form-input"
             placeholder="예: 사업계획서 1부.  (없으면 비워두세요)">
    </div>`;

  // ── 시행번호 / 접수번호 ────────────────────────────────────────
  html += `
    <div class="field-row field-row-half">
      <div>
        <label>시행번호</label>
        <input type="text" id="field-docNumber" class="form-input"
               placeholder="예: 사회복지과-123">
      </div>
      <div>
        <label>접수번호</label>
        <input type="text" id="field-receiptNumber" class="form-input"
               placeholder="예: 사회복지과-456">
      </div>
    </div>`;

  container.innerHTML = html;

  // 필드 초기화
  if (clearFields) clearAllFields();

  // 수신처 선택 이벤트 재바인딩
  loadReceiverOptions();

  // 입력 이벤트 등록
  container.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input',  onFieldInput);
    el.addEventListener('change', onFieldInput);
  });
}

// ── 필드 초기화 ────────────────────────────────────────────────────
function clearAllFields() {
  document.querySelectorAll('#form-fields input, #form-fields textarea').forEach(el => {
    if (el.id === 'field-receiver' && currentTemplateId === 'internal') {
      el.value = '내부결재';
    } else {
      el.value = '';
    }
  });
  updatePreviewContent();
}

// ── 예시 채우기 ────────────────────────────────────────────────────
function fillExample() {
  if (typeof TEMPLATES === 'undefined') return;
  const template = TEMPLATES[currentTemplateId];
  if (!template || !template.example) return;

  const ex = template.example;
  Object.keys(ex).forEach(key => {
    const el = document.getElementById(`field-${key}`);
    if (el) el.value = ex[key] || '';
  });

  updatePreviewContent();
  runRealtimeCheck();
  showToast('예시가 채워졌습니다.', 'info');
}

// ── 필드 입력 이벤트 ───────────────────────────────────────────────
function onFieldInput() {
  isModified = true;
  updatePreviewContent();

  clearTimeout(realtimeCheckTimer);
  realtimeCheckTimer = setTimeout(runRealtimeCheck, 800);
}

// ── 미리보기 업데이트 ──────────────────────────────────────────────
function updatePreviewContent() {
  const editor = document.getElementById('editor-content');
  if (!editor) return;
  editor.value = buildDocumentContent();
}

// ── 문서 내용 생성 ─────────────────────────────────────────────────
function buildDocumentContent() {
  const settings = Storage.getSettings();
  const detail   = ExtendedStorage.getOrgDetail();
  const orgName  = settings.orgName || '○○기관';
  const today    = getTodayString();

  const f = key => {
    const el = document.getElementById(`field-${key}`);
    return el ? el.value.trim() : '';
  };

  const receiver        = f('receiver');
  const receiverDept    = f('receiver-dept');
  const via             = f('via');
  const title           = f('title');
  const related         = f('related');
  const body            = f('body');
  const attachments     = f('attachments');
  const datetime        = f('datetime');
  const location        = f('location');
  const target          = f('target');
  const sponsorName     = f('sponsor-name');
  const sponsorDetail   = f('sponsor-detail');
  const docNumber       = f('docNumber');
  const receiptNumber   = f('receiptNumber');

  let lines = [];

  // ── 수신 ─────────────────────────────────────────────────────
  if (currentTemplateId === 'internal') {
    lines.push('수신: 내부결재');
  } else if (currentTemplateId === 'sponsor') {
    if (receiver) {
      lines.push(`수신: ${receiver} 귀하`);
      if (receiverDept) lines.push(`      ${receiverDept}`);
    }
  } else {
    if (receiver) {
      const deptStr = receiverDept ? `(${receiverDept})` : '';
      lines.push(`수신: ${receiver} ${deptStr}`.trim());
    }
  }

  // ── 경유 ─────────────────────────────────────────────────────
  if (via && currentTemplateId !== 'internal') {
    lines.push(`경유: ${via}`);
  }

  lines.push('');

  // ── 제목 ─────────────────────────────────────────────────────
  lines.push(`제목: ${title || '(제목을 입력하세요)'}`);
  lines.push('');

  // ── 관련 근거 ────────────────────────────────────────────────
  if (related) {
    lines.push(`1. 관련: ${related}`);
  }

  // ── 행사 정보 ────────────────────────────────────────────────
  if (currentTemplateId === 'event') {
    if (related) {
      lines.push(`2. 다음과 같이 행사를 개최하오니 참석하여 주시기 바랍니다.`);
      lines.push('');
      lines.push('  - 다      음 -');
    } else {
      lines.push('1. 다음과 같이 행사를 개최하오니 참석하여 주시기 바랍니다.');
      lines.push('');
      lines.push('  - 다      음 -');
    }
    lines.push('');
    if (datetime) lines.push(`  가. 일  시: ${datetime}`);
    if (location) lines.push(`  나. 장  소: ${location}`);
    if (target)   lines.push(`  다. 대  상: ${target}`);
    if (body)     lines.push(`  라. 내  용: ${body}`);
    lines.push('');
  } else if (currentTemplateId === 'sponsor') {
    // ── 후원자 감사 ────────────────────────────────────────────
    if (body) {
      lines.push(body);
      lines.push('');
    } else {
      lines.push(`귀하의 따뜻한 후원에 깊이 감사드립니다.`);
      lines.push('');
      if (sponsorName)   lines.push(`후원자: ${sponsorName}`);
      if (sponsorDetail) lines.push(`후원 내용: ${sponsorDetail}`);
      lines.push('');
    }
  } else {
    // ── 일반 본문 ──────────────────────────────────────────────
    if (body) {
      const bodyNum = related ? '2' : '1';
      lines.push(`${bodyNum}. ${body}`);
      lines.push('');
    }
  }

  // ── 붙임 ─────────────────────────────────────────────────────
  if (attachments) {
    lines.push(`붙임  ${attachments}`);
    lines.push('');
  }

  lines.push('끝.');
  lines.push('');

  // ── 발신명의 (내부결재 제외) ──────────────────────────────────
  if (currentTemplateId !== 'internal') {
    lines.push(`발신명의: ${orgName}`);
    lines.push('');
  }

  // ── 결재라인 ─────────────────────────────────────────────────
  const approvalLevels = settings.approvalLevels || DEFAULT_APPROVAL;
  const approvalStr = approvalLevels.map(lv =>
    `${lv.title}${lv.name ? `(${lv.name})` : ''}`
  ).join(' → ');
  lines.push(`결재: ${approvalStr}`);
  lines.push('');

  // ── 협조자 ───────────────────────────────────────────────────
  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');
  if (cooperators.length > 0) {
    const coopStr = cooperators.map(c =>
      `${c.title || ''}${c.name ? `(${c.name})` : ''}`
    ).join(', ');
    lines.push(`협조자: ${coopStr}`);
    lines.push('');
  }

  // ── 시행/접수 번호 + 하단 정보 ───────────────────────────────
  if (currentTemplateId !== 'internal') {
    const docLine = docNumber     ? `시행 ${docNumber}` : '';
    const recLine = receiptNumber ? `접수 ${receiptNumber}` : '';
    const numLine = [docLine, recLine].filter(Boolean).join('  ');
    if (numLine) { lines.push(numLine); }

    const infoLines = [];
    if (detail.zipCode)  infoLines.push(`우 ${detail.zipCode}`);
    if (detail.address)  infoLines.push(detail.address);
    if (detail.homepage) infoLines.push(`/ ${detail.homepage}`);
    if (infoLines.length) lines.push(infoLines.join('  '));

    const contactLines = [];
    if (detail.tel)   contactLines.push(`전화 ${detail.tel}`);
    if (detail.fax)   contactLines.push(`팩스 ${detail.fax}`);
    if (detail.email) contactLines.push(`/ ${detail.email}`);
    if (detail.disclosure) contactLines.push(`/ ${detail.disclosure}`);
    if (contactLines.length) lines.push(contactLines.join('  '));
  }

  return lines.join('\n');
}

// ── 실시간 규칙 검사 ───────────────────────────────────────────────
function runRealtimeCheck() {
  const editor = document.getElementById('editor-content');
  if (!editor) return;

  checkResults = Checker.checkAll(editor.value, currentTemplateId);
  CheckerUI.renderSidePanel(checkResults);
  updateCheckSummary(checkResults);
}

function updateCheckSummary(results) {
  const summaryEl = document.getElementById('check-summary');
  if (!summaryEl) return;

  const errors   = results.filter(r => r.level === 'error').length;
  const warnings = results.filter(r => r.level === 'warning').length;
  const infos    = results.filter(r => r.level === 'info').length;

  if (results.length === 0) {
    summaryEl.innerHTML = '<span class="badge badge-success">✅ 이상 없음</span>';
  } else {
    let html = '';
    if (errors)   html += `<span class="badge badge-error">오류 ${errors}</span> `;
    if (warnings) html += `<span class="badge badge-warning">경고 ${warnings}</span> `;
    if (infos)    html += `<span class="badge badge-info">안내 ${infos}</span>`;
    summaryEl.innerHTML = html;
  }
}

// ── 규칙 검사 모달 ─────────────────────────────────────────────────
function openCheckModal() {
  runRealtimeCheck();
  CheckerUI.renderCheckModal(checkResults, 'check-modal-body');
  Modal.open('check-modal');
}

// ── 자동 수정 ──────────────────────────────────────────────────────
function applyAutoFix() {
  const editor = document.getElementById('editor-content');
  if (!editor) return;

  const before  = editor.value;
  const fixed   = Checker.applyAllFixes(before, checkResults);
  editor.value  = fixed;

  runRealtimeCheck();
  isModified = true;

  const fixedCount = checkResults.filter(r => r.level === 'error').length;
  showToast(`${fixedCount}개 오류가 자동 수정되었습니다.`, 'success');
  Modal.close('check-modal');
}

// ── 순화어 모달 ────────────────────────────────────────────────────
function openPurifyModal() {
  const editor = document.getElementById('editor-content');
  if (!editor) return;
  CheckerUI.renderPurifyModal(editor.value, 'purify-modal-body');
  Modal.open('purify-modal');
}

// ── 맞춤법 검사 팝업 ───────────────────────────────────────────────
function openSpellCheckerPopup() {
  const editor = document.getElementById('editor-content');
  if (editor && editor.value.trim()) {
    copyToClipboard(editor.value);
  }
  openSpellChecker();
}

// ── 임시저장 ───────────────────────────────────────────────────────
function saveDraft() {
  const editor = document.getElementById('editor-content');
  if (!editor) return;

  const titleEl = document.getElementById('field-title');
  const title   = titleEl ? titleEl.value.trim() : '';

  if (!title && !editor.value.trim()) {
    showToast('제목 또는 내용을 입력하세요.', 'warning');
    return;
  }

  const draft = {
    id:         currentDocId,
    templateId: currentTemplateId,
    title:      title || '(제목 없음)',
    content:    editor.value,
    fields:     collectFields(),
    savedAt:    new Date().toISOString()
  };

  Storage.saveDraft(draft);
  isModified = false;

  const saveStatus = document.getElementById('save-status');
  if (saveStatus) {
    saveStatus.textContent = `임시저장 완료 (${formatDateShort(new Date())})`;
    saveStatus.className = 'save-status saved';
  }

  showToast('임시저장되었습니다. ✅', 'success');
}

function autoSaveDocument() {
  if (!isModified) return;
  saveDraft();

  const saveStatus = document.getElementById('save-status');
  if (saveStatus) {
    saveStatus.textContent = `자동저장 (${formatDateShort(new Date())})`;
  }
}

// ── 필드 수집 ──────────────────────────────────────────────────────
function collectFields() {
  const fields = {};
  document.querySelectorAll('#form-fields input, #form-fields textarea').forEach(el => {
    if (el.id && el.id.startsWith('field-')) {
      const key = el.id.replace('field-', '');
      fields[key] = el.value;
    }
  });
  return fields;
}

// ── 미리보기 이동 ──────────────────────────────────────────────────
function goToPreview() {
  const editor = document.getElementById('editor-content');
  if (!editor || !editor.value.trim()) {
    showToast('내용을 입력해주세요.', 'warning');
    return;
  }
  saveDraft();
  window.location.href = `preview.html?id=${currentDocId}&type=draft`;
}

// ── 이벤트 바인딩 ──────────────────────────────────────────────────
function bindEditorEvents() {

  // 템플릿 버튼
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isModified) {
        if (!confirm('변경 내용이 있습니다. 템플릿을 변경하면 내용이 초기화됩니다.\n계속하시겠습니까?')) return;
      }
      selectTemplate(btn.dataset.template, true);
      isModified = false;
    });
  });

  // 임시저장 버튼
  const saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) saveDraftBtn.addEventListener('click', saveDraft);

  // 예시 채우기
  const fillExampleBtn = document.getElementById('fill-example-btn');
  if (fillExampleBtn) fillExampleBtn.addEventListener('click', fillExample);

  // 규칙 검사
  const ruleCheckBtn = document.getElementById('rule-check-btn');
  if (ruleCheckBtn) ruleCheckBtn.addEventListener('click', openCheckModal);

  // 자동 수정
  const autoFixBtn = document.getElementById('auto-fix-btn');
  if (autoFixBtn) autoFixBtn.addEventListener('click', applyAutoFix);

  // 순화어
  const purifyBtn = document.getElementById('purify-btn');
  if (purifyBtn) purifyBtn.addEventListener('click', openPurifyModal);

  // 맞춤법 검사
  const spellBtn = document.getElementById('spell-check-btn');
  if (spellBtn) spellBtn.addEventListener('click', openSpellCheckerPopup);

  // 미리보기
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) previewBtn.addEventListener('click', goToPreview);

  // 에디터 입력
  const editorContent = document.getElementById('editor-content');
  if (editorContent) {
    editorContent.addEventListener('input', () => {
      isModified = true;
      clearTimeout(realtimeCheckTimer);
      realtimeCheckTimer = setTimeout(runRealtimeCheck, 800);
    });
  }

  // 모달 닫기 버튼
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) Modal.close(modal.id);
    });
  });

  // 키보드 단축키
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveDraft();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      goToPreview();
    }
  });

  // 페이지 이탈 경고
  window.addEventListener('beforeunload', e => {
    if (isModified) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
