// js/editor.js
// 문서 작성 에디터 기능

// =====================
// 전역 변수
// =====================
let currentDocId = null;
let currentTemplateId = 'internal';
let isModified = false;
let checkResults = null;
let realtimeCheckTimer = null;

// =====================
// 페이지 초기화
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  bindEditorEvents();
  startAutoSave(autoSaveDocument, 30000);
});

// =====================
// 에디터 초기화
// =====================
function initEditor() {
  const id = getUrlParam('id');
  const type = getUrlParam('type');
  const templateId = getUrlParam('template');

  if (id) {
    loadExistingDocument(id, type);
  } else {
    currentDocId = generateId();
    if (templateId && TEMPLATES[templateId]) {
      selectTemplate(templateId);
    } else {
      selectTemplate('internal');
    }
  }

  loadOrgSettings();
}

// =====================
// 기관 설정 불러오기
// =====================
function loadOrgSettings() {
  const settings = Storage.getSettings();

  const orgNameEl = document.getElementById(
    'org-name-display'
  );
  if (orgNameEl) {
    orgNameEl.textContent =
      settings.orgName || '기관명 미설정';
  }

  loadReceiverOptions();
}

// =====================
// 수신처 옵션 로드
// =====================
function loadReceiverOptions() {
  const settings = Storage.getSettings();
  const select = document.getElementById('receiver-select');
  if (!select) return;

  select.innerHTML = `
    <option value="">저장된 수신처 선택</option>
    ${settings.receivers.map(r => `
      <option
        value="${escapeHtml(r.name)}"
        data-dept="${escapeHtml(r.dept)}">
        ${escapeHtml(r.name)}
        ${r.dept ? `(${escapeHtml(r.dept)})` : ''}
      </option>
    `).join('')}
  `;

  select.addEventListener('change', () => {
    const selected = select.options[select.selectedIndex];
    if (selected.value) {
      const receiverInput = document.getElementById(
        'field-receiver'
      );
      const deptInput = document.getElementById(
        'field-receiver-dept'
      );
      if (receiverInput) receiverInput.value = selected.value;
      if (deptInput) {
        deptInput.value = selected.dataset.dept || '';
      }
      updatePreviewContent();
    }
  });
}

// =====================
// 기존 문서 불러오기
// =====================
function loadExistingDocument(id, type) {
  let doc = null;

  if (type === 'draft') {
    doc = Storage.getDraftById(id);
  } else {
    doc = Storage.getDocumentById(id);
  }

  if (!doc) {
    showToast('문서를 찾을 수 없어요', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
    return;
  }

  currentDocId = doc.id;
  currentTemplateId = doc.templateId || 'internal';

  selectTemplate(currentTemplateId, false);

  if (doc.fields) {
    Object.keys(doc.fields).forEach(key => {
      const input = document.getElementById(`field-${key}`);
      if (input) {
        input.value = doc.fields[key] || '';
      }
    });
  }

  const textarea = document.getElementById('editor-content');
  if (textarea && doc.content) {
    textarea.value = doc.content;
  }

  updatePreviewContent();
  runRealtimeCheck();

  showToast('문서를 불러왔어요', 'success');
}

// =====================
// 템플릿 선택
// =====================
function selectTemplate(templateId, clearFields = true) {
  if (!TEMPLATES[templateId]) return;

  currentTemplateId = templateId;

  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.template === templateId
    );
  });

  const template = TEMPLATES[templateId];

  renderGuidePanel(template);
  renderFormFields(template, clearFields);
  updatePreviewContent();
}

// =====================
// 가이드 패널 렌더링
// =====================
function renderGuidePanel(template) {
  const panel = document.getElementById('guide-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="guide-panel">
      <div class="guide-panel-title">
        💡 ${template.name} 작성 가이드
      </div>
      <ul class="guide-list">
        ${template.guide.map(g => `
          <li>${g}</li>
        `).join('')}
      </ul>
    </div>
  `;
}

// =====================
// 폼 필드 렌더링
// =====================
function renderFormFields(template, clearFields = true) {
  const container = document.getElementById('form-fields');
  if (!container) return;

  const settings = Storage.getSettings();
  let html = '';

  // =====================
  // 공통 필드 - 수신
  // =====================
  html += `
    <div class="form-group">
      <label class="form-label required">수신</label>
      <div style="display:flex;gap:8px;margin-bottom:4px">
        <select class="form-control"
          id="receiver-select"
          style="max-width:220px">
          <option value="">저장된 수신처 선택</option>
          ${settings.receivers.map(r => `
            <option
              value="${escapeHtml(r.name)}"
              data-dept="${escapeHtml(r.dept)}">
              ${escapeHtml(r.name)}
              ${r.dept ? `(${escapeHtml(r.dept)})` : ''}
            </option>
          `).join('')}
        </select>
      </div>
  `;

  if (template.id === 'internal') {
    html += `
      <input type="text"
        class="form-control"
        id="field-receiver"
        value="내부결재"
        readonly
        style="background:#f8f9fa"
      />
    `;
  } else if (template.id === 'sponsor') {
    html += `
      <div style="display:flex;gap:8px">
        <input type="text"
          class="form-control"
          id="field-receiver"
          placeholder="후원자 성명 (예: 홍길동)"
          oninput="onFieldInput()"
        />
        <input type="text"
          class="form-control"
          id="field-receiver-dept"
          placeholder="귀하"
          value="귀하"
          style="max-width:80px"
          oninput="onFieldInput()"
        />
      </div>
      <div class="form-hint">
        수신란에 성명 뒤 "귀하"를 붙여요
      </div>
    `;
  } else {
    html += `
      <div style="display:flex;gap:8px">
        <input type="text"
          class="form-control"
          id="field-receiver"
          placeholder="수신자 직위 (예: ○○시장)"
          oninput="onFieldInput()"
        />
        <input type="text"
          class="form-control"
          id="field-receiver-dept"
          placeholder="담당부서 (예: 사회복지과장)"
          oninput="onFieldInput()"
        />
      </div>
      <div class="form-hint">
        괄호 안에 담당부서 과장을 표시해요
      </div>
    `;
  }
  html += `</div>`;

  // =====================
  // 경유 (내부결재 제외)
  // =====================
  if (template.id !== 'internal') {
    html += `
      <div class="form-group">
        <label class="form-label">경유</label>
        <input type="text"
          class="form-control"
          id="field-via"
          placeholder="경유기관이 있는 경우만 입력"
          oninput="onFieldInput()"
        />
        <div class="form-hint">
          경유기관이 없으면 비워두세요
        </div>
      </div>
    `;
  }

  // =====================
  // 제목
  // =====================
  html += `
    <div class="form-group">
      <label class="form-label required">제목</label>
      <input type="text"
        class="form-control"
        id="field-title"
        placeholder="문서 내용을 간단명확하게 표현해요"
        oninput="onFieldInput()"
      />
    </div>
  `;

  // =====================
  // 관련 근거
  // =====================
  if (template.id === 'cooperation' ||
      template.id === 'event' ||
      template.id === 'government') {
    html += `
      <div class="form-group">
        <label class="form-label">관련 근거</label>
        <input type="text"
          class="form-control"
          id="field-related"
          placeholder="예: 관련: ○○복지관-123(2024. 1. 1.)"
          oninput="onFieldInput()"
        />
        <div class="form-hint">
          관련 문서가 있으면 입력해요
        </div>
      </div>
    `;
  }

  // =====================
  // 행사 안내 전용 필드
  // =====================
  if (template.id === 'event') {
    html += `
      <div class="form-group">
        <label class="form-label required">일시</label>
        <input type="text"
          class="form-control"
          id="field-datetime"
          placeholder="예: 2024. 2. 1.(목) 14:00~16:00"
          oninput="onFieldInput()"
        />
      </div>
      <div class="form-group">
        <label class="form-label required">장소</label>
        <input type="text"
          class="form-control"
          id="field-location"
          placeholder="예: ○○복지관 3층 대회의실"
          oninput="onFieldInput()"
        />
      </div>
      <div class="form-group">
        <label class="form-label">대상</label>
        <input type="text"
          class="form-control"
          id="field-target"
          placeholder="예: 지역 복지기관 담당자"
          oninput="onFieldInput()"
        />
      </div>
    `;
  }

  // =====================
  // 후원자 감사 전용 필드
  // =====================
  if (template.id === 'sponsor') {
    html += `
      <div class="form-group">
        <label class="form-label">수신자 주소</label>
        <input type="text"
          class="form-control"
          id="field-address"
          placeholder="예: 우12345 ○○시 ○○구 ○○로 123"
          oninput="onFieldInput()"
        />
      </div>
    `;
  }

  // =====================
  // 본문
  // =====================
  html += `
    <div class="form-group">
      <label class="form-label required">
        본문 내용
      </label>
      <textarea
        class="form-control"
        id="field-body"
        rows="10"
        placeholder="본문 내용을 입력해요&#10;육하원칙(누가, 무엇을, 언제, 어디서, 왜, 어떻게)에 따라 작성해요"
        oninput="onFieldInput()"
      ></textarea>
    </div>
  `;

  // =====================
  // 붙임
  // =====================
  html += `
    <div class="form-group">
      <label class="form-label">붙임</label>
      <textarea
        class="form-control"
        id="field-attachments"
        rows="3"
        placeholder="예: 1. ○○○ 계획서 1부.&#10;    2. ○○○ 서류 1부."
        oninput="onFieldInput()"
      ></textarea>
      <div class="form-hint">
        붙임 서류가 없으면 비워두세요
      </div>
    </div>
  `;

  // =====================
  // 시행번호 / 접수번호
  // =====================
  html += `
    <div class="card"
      style="background:var(--gray-100);
        padding:16px;
        margin-top:8px">
      <div style="font-size:13px;
        font-weight:700;
        color:var(--gray-700);
        margin-bottom:12px">
        📌 시행/접수 정보
      </div>
      <div style="display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px">
        <div class="form-group"
          style="margin-bottom:0">
          <label class="form-label">시행번호</label>
          <input type="text"
            class="form-control"
            id="field-docNumber"
            placeholder="예: 임마누엘집 2024-001"
            oninput="onFieldInput()"
          />
          <div class="form-hint">
            문서 등록번호를 입력해요
          </div>
        </div>
        <div class="form-group"
          style="margin-bottom:0">
          <label class="form-label">접수번호</label>
          <input type="text"
            class="form-control"
            id="field-receiptNumber"
            placeholder="접수 후 입력 (선택)"
            oninput="onFieldInput()"
          />
          <div class="form-hint">
            접수시 기재해요
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // =====================
  // 수신처 선택 이벤트
  // =====================
  const select = document.getElementById('receiver-select');
  if (select) {
    select.addEventListener('change', () => {
      const selected = select.options[select.selectedIndex];
      if (selected.value) {
        const receiverInput = document.getElementById(
          'field-receiver'
        );
        const deptInput = document.getElementById(
          'field-receiver-dept'
        );
        if (receiverInput) {
          receiverInput.value = selected.value;
        }
        if (deptInput) {
          deptInput.value = selected.dataset.dept || '';
        }
        onFieldInput();
      }
    });
  }

  if (clearFields) {
    clearAllFields();
  }
}

// =====================
// 필드 초기화
// =====================
function clearAllFields() {
  document.querySelectorAll(
    '#form-fields input, #form-fields textarea'
  ).forEach(el => {
    if (el.readOnly) return;
    el.value = '';
  });

  const textarea = document.getElementById('editor-content');
  if (textarea) textarea.value = '';

  updatePreviewContent();
}

// =====================
// 예시 채우기
// =====================
function fillExample() {
  const template = TEMPLATES[currentTemplateId];
  if (!template || !template.example) return;

  const example = template.example;

  Object.keys(example).forEach(key => {
    const input = document.getElementById(`field-${key}`);
    if (input) {
      input.value = example[key];
    }
  });

  onFieldInput();
  showToast('예시가 채워졌어요!', 'success');
}

// =====================
// 필드 입력 이벤트
// =====================
function onFieldInput() {
  isModified = true;
  updatePreviewContent();

  if (realtimeCheckTimer) clearTimeout(realtimeCheckTimer);
  realtimeCheckTimer = setTimeout(() => {
    runRealtimeCheck();
  }, 800);
}

// =====================
// 미리보기 내용 생성
// =====================
function updatePreviewContent() {
  const textarea = document.getElementById('editor-content');
  if (!textarea) return;

  const content = buildDocumentContent();
  textarea.value = content;
}

// =====================
// 문서 내용 생성
// =====================
function buildDocumentContent() {
  const template = TEMPLATES[currentTemplateId];
  if (!template) return '';

  const settings = Storage.getSettings();
  const detail = ExtendedStorage.getOrgDetail();
  const orgName = settings.orgName || '○○기관';
  const today = getTodayString();

  const getValue = (id) => {
    const el = document.getElementById(`field-${id}`);
    return el ? el.value.trim() : '';
  };

  const receiver = getValue('receiver');
  const receiverDept = getValue('receiver-dept');
  const via = getValue('via');
  const title = getValue('title');
  const related = getValue('related');
  const body = getValue('body');
  const attachments = getValue('attachments');
  const datetime = getValue('datetime');
  const location = getValue('location');
  const target = getValue('target');
  const address = getValue('address');
  const docNumber = getValue('docNumber');
  const receiptNumber = getValue('receiptNumber');

  let content = '';

  // 기관명
  content += `${orgName}\n\n`;

  // 수신
  if (currentTemplateId === 'internal') {
    content += `수신  내부결재\n`;
  } else if (currentTemplateId === 'sponsor') {
    const honorific = getValue('receiver-dept') || '귀하';
    content += `수신  ${receiver} ${honorific}`;
    if (address) content += `(${address})`;
    content += '\n';
  } else {
    content += `수신  ${receiver}`;
    if (receiverDept) content += `(${receiverDept})`;
    content += '\n';
  }

  // 경유
  if (currentTemplateId !== 'internal') {
    content += `(경유) ${via || ''}\n`;
  }

  // 제목
  content += `제목  ${title}\n\n`;

  // 관련 근거
  if (related) content += `${related}\n\n`;

  // 행사 안내 특수 구조
  if (currentTemplateId === 'event') {
    if (body) content += `${body}\n\n`;
    if (datetime) content += `1. 일시: ${datetime}\n`;
    if (location) content += `2. 장소: ${location}\n`;
    if (target) content += `3. 대상: ${target}\n`;
    content += '\n';
  } else {
    if (body) content += `${body}\n\n`;
  }

  // 붙임 + 끝
  if (attachments) {
    content += `붙임  ${attachments}  끝.\n\n`;
  } else {
    content += `끝.\n\n`;
  }

  // 발신명의 (내부결재 제외)
  if (currentTemplateId !== 'internal') {
    content += `\n${orgName}장\n\n`;
  }

  // 결재라인
  const approvalLine = settings.approvalLevels
    .map((l, idx) => {
      return idx === 0
        ? `★${l.title || '담당'}`
        : (l.title || '');
    })
    .join('  ');
  content += `${approvalLine}\n`;

  // 협조자
  if (settings.cooperators &&
      settings.cooperators.length > 0) {
    const coopLine = settings.cooperators
      .map(c => c.title || '')
      .join('  ');
    content += `협조자  ${coopLine}\n`;
  }

  content += '\n';

  // 시행/접수
  const docNum = docNumber || `${orgName}-`;
  content += `시행  ${docNum} (${today})`;
  content += `  접수 (\n\n`;

  // 주소 정보
  content += `우 ${detail.zipCode || ''} `;
  content += `${detail.address || ''} / `;
  content += `${detail.homepage || ''}\n`;
  content += `전화 ${detail.tel || ''} `;
  content += `전송 ${detail.fax || ''} / `;
  content += `${detail.email || ''} / `;
  content += `${detail.disclosure || '공개'}\n`;

  return content;
}

// =====================
// 실시간 체크 실행
// =====================
function runRealtimeCheck() {
  const textarea = document.getElementById('editor-content');
  if (!textarea) return;

  const text = textarea.value;
  checkResults = Checker.checkAll(text);

  CheckerUI.renderSidePanel(
    checkResults,
    'realtime-check-panel'
  );

  updateCheckSummary(checkResults);
}

// =====================
// 체크 요약 업데이트
// =====================
function updateCheckSummary(results) {
  const summaryEl = document.getElementById('check-summary');
  if (!summaryEl) return;

  const errors = results.errors.reduce(
    (acc, c) => acc + c.issues.length, 0
  );
  const warnings = results.warnings.reduce(
    (acc, c) => acc + c.issues.length, 0
  );

  if (errors === 0 && warnings === 0) {
    summaryEl.innerHTML = `
      <span style="color:#28a745">✅ 문제 없음</span>
    `;
  } else {
    summaryEl.innerHTML = `
      ${errors > 0 ?
        `<span style="color:#dc3545">
          ❌ ${errors}
        </span>` : ''}
      ${warnings > 0 ?
        `<span style="color:#856404">
          ⚠️ ${warnings}
        </span>` : ''}
    `;
  }
}

// =====================
// 규칙 체크 모달 열기
// =====================
function openCheckModal() {
  const textarea = document.getElementById('editor-content');
  if (!textarea || !textarea.value.trim()) {
    showToast('먼저 내용을 입력해주세요', 'warning');
    return;
  }

  checkResults = Checker.checkAll(textarea.value);
  CheckerUI.renderCheckModal(checkResults);
  Modal.open('check-modal');
}

// =====================
// 자동 수정 실행
// =====================
function applyAutoFix() {
  if (!checkResults) return;

  const textarea = document.getElementById('editor-content');
  if (!textarea) return;

  const fixed = Checker.applyAllFixes(
    textarea.value,
    checkResults
  );
  textarea.value = fixed;

  isModified = true;
  Modal.close('check-modal');

  setTimeout(() => {
    runRealtimeCheck();
    openCheckModal();
  }, 300);

  showToast('자동 수정이 완료되었어요!', 'success');
}

// =====================
// 순화어 모달 열기
// =====================
function openPurifyModal() {
  const textarea = document.getElementById('editor-content');
  if (!textarea || !textarea.value.trim()) {
    showToast('먼저 내용을 입력해주세요', 'warning');
    return;
  }

  checkResults = Checker.checkAll(textarea.value);
  CheckerUI.renderPurifyModal(checkResults);
  Modal.open('purify-modal');
}

// =====================
// 맞춤법 검사 팝업
// =====================
function openSpellCheckerPopup() {
  const textarea = document.getElementById('editor-content');
  if (!textarea || !textarea.value.trim()) {
    showToast('먼저 내용을 입력해주세요', 'warning');
    return;
  }

  copyToClipboard(textarea.value);
  openSpellChecker();

  showToast(
    '텍스트가 복사되었어요! 팝업에 붙여넣기 해주세요',
    'success',
    4000
  );
}

// =====================
// 임시저장
// =====================
function saveDraft() {
  const textarea = document.getElementById('editor-content');
  const titleInput = document.getElementById('field-title');

  const draft = {
    id: currentDocId,
    templateId: currentTemplateId,
    title: titleInput
      ? titleInput.value.trim() || '제목 없음'
      : '제목 없음',
    content: textarea ? textarea.value : '',
    fields: collectFields(),
    updatedAt: new Date().toISOString(),
    type: 'draft'
  };

  Storage.saveDraft(draft);
  isModified = false;

  const statusEl = document.getElementById('save-status');
  if (statusEl) {
    statusEl.textContent =
      `저장됨 ${formatDate(draft.updatedAt)}`;
    statusEl.className = 'save-status saved';
  }

  showToast('임시저장 되었어요!', 'success');
}

// =====================
// 자동저장
// =====================
function autoSaveDocument() {
  if (!isModified) return;
  saveDraft();
}

// =====================
// 필드 값 수집
// =====================
function collectFields() {
  const fields = {};

  document.querySelectorAll(
    '#form-fields input, #form-fields textarea'
  ).forEach(el => {
    if (el.id && el.id.startsWith('field-')) {
      const key = el.id.replace('field-', '');
      fields[key] = el.value;
    }
  });

  return fields;
}

// =====================
// 미리보기로 이동
// =====================
function goToPreview() {
  const textarea = document.getElementById('editor-content');
  if (!textarea || !textarea.value.trim()) {
    showToast('내용을 먼저 입력해주세요', 'warning');
    return;
  }

  saveDraft();

  window.location.href =
    `preview.html?id=${currentDocId}&type=draft`;
}

// =====================
// 이벤트 바인딩
// =====================
function bindEditorEvents() {

  // 템플릿 버튼
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isModified) {
        if (!confirm(
          '템플릿을 변경하면 현재 내용이 지워져요.\n계속할까요?'
        )) return;
      }
      selectTemplate(btn.dataset.template);
    });
  });

  // 임시저장 버튼
  const saveDraftBtn = document.getElementById(
    'save-draft-btn'
  );
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', saveDraft);
  }

  // 맞춤법 검사 버튼
  const spellBtn = document.getElementById('spell-check-btn');
  if (spellBtn) {
    spellBtn.addEventListener(
      'click', openSpellCheckerPopup
    );
  }

  // 규칙 체크 버튼
  const checkBtn = document.getElementById('rule-check-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', openCheckModal);
  }

  // 순화어 버튼
  const purifyBtn = document.getElementById('purify-btn');
  if (purifyBtn) {
    purifyBtn.addEventListener('click', openPurifyModal);
  }

  // 미리보기 버튼
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', goToPreview);
  }

  // 예시 채우기 버튼
  const exampleBtn = document.getElementById(
    'fill-example-btn'
  );
  if (exampleBtn) {
    exampleBtn.addEventListener('click', fillExample);
  }

  // 자동수정 버튼
  const autoFixBtn = document.getElementById('auto-fix-btn');
  if (autoFixBtn) {
    autoFixBtn.addEventListener('click', applyAutoFix);
  }

  // 모달 닫기 버튼들
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      Modal.closeAll();
    });
  });

  // 에디터 직접 입력시 체크
  const textarea = document.getElementById('editor-content');
  if (textarea) {
    textarea.addEventListener('input', () => {
      isModified = true;
      if (realtimeCheckTimer) {
        clearTimeout(realtimeCheckTimer);
      }
      realtimeCheckTimer = setTimeout(() => {
        runRealtimeCheck();
      }, 800);
    });
  }

  // 단축키
  document.addEventListener('keydown', (e) => {
    // Ctrl+S : 임시저장
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveDraft();
    }
    // Ctrl+Enter : 미리보기
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      goToPreview();
    }
  });

  // 페이지 이탈 경고
  window.addEventListener('beforeunload', (e) => {
    if (isModified) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
