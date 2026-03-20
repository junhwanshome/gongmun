/**
 * js/editor.js
 * 공문서 에디터 페이지 스크립트 (중복선언 수정본)
 */

// ── 전역 변수 (단 한 번만 선언) ───────────────────────────────────
var currentDocId       = null;
var currentTemplateId  = 'internal';
var isModified         = false;
var checkResults       = [];
var realtimeCheckTimer = null;
var editorAutoSaveTimer = null;   // ← 이름 변경으로 충돌 방지

// ── 초기화 ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initEditor();
  bindEditorEvents();

  // 30초마다 자동저장
  editorAutoSaveTimer = setInterval(function() {
    if (isModified) autoSaveDocument();
  }, 30000);
});

// ── 에디터 초기화 ──────────────────────────────────────────────────
function initEditor() {
  var params     = getUrlParams();
  var docId      = params.id;
  var docType    = params.type || 'draft';
  var templateId = params.template || 'internal';

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
  var settings = Storage.getSettings();
  var orgNameEl = document.getElementById('org-name-display');
  if (orgNameEl) orgNameEl.textContent = settings.orgName || '기관명 미설정';

  if (!settings.orgName) {
    var notice = document.getElementById('org-name-notice');
    if (notice) notice.style.display = 'flex';
  }
  loadReceiverOptions();
}

// ── 수신처 옵션 로드 ───────────────────────────────────────────────
function loadReceiverOptions() {
  var settings  = Storage.getSettings();
  var receivers = settings.receivers || [];
  var select    = document.getElementById('receiver-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- 자주 쓰는 수신처 선택 --</option>';
  receivers.forEach(function(r, idx) {
    if (r.title || r.dept) {
      var opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = (r.title || '') + (r.dept ? ' (' + r.dept + ')' : '');
      select.appendChild(opt);
    }
  });

  select.onchange = function() {
    var idx = parseInt(select.value);
    if (isNaN(idx)) return;
    var r = receivers[idx];
    if (!r) return;
    var receiverInput = document.getElementById('field-receiver');
    var deptInput     = document.getElementById('field-receiver-dept');
    if (receiverInput) receiverInput.value = r.title || '';
    if (deptInput)     deptInput.value     = r.dept  || '';
    onFieldInput();
  };
}

// ── 기존 문서 불러오기 ─────────────────────────────────────────────
function loadExistingDocument(id, type) {
  var doc = (type === 'doc') ? Storage.getDoc(id) : Storage.getDraft(id);
  if (!doc) {
    showToast('문서를 찾을 수 없습니다.', 'error');
    return;
  }

  currentDocId      = id;
  currentTemplateId = doc.templateId || 'internal';
  selectTemplate(currentTemplateId, true);

  if (doc.fields) {
    Object.keys(doc.fields).forEach(function(key) {
      var el = document.getElementById('field-' + key);
      if (el) el.value = doc.fields[key] || '';
    });
  }

  if (doc.content) {
    var editor = document.getElementById('editor-content');
    if (editor) editor.value = doc.content;
  }

  updatePreviewContent();
  runRealtimeCheck();
  showToast('문서를 불러왔습니다.', 'success');
}

// ── 템플릿 선택 ────────────────────────────────────────────────────
function selectTemplate(templateId, clearFields) {
  if (clearFields === undefined) clearFields = true;
  if (typeof TEMPLATES === 'undefined') return;

  currentTemplateId = templateId;

  document.querySelectorAll('.template-btn').forEach(function(btn) {
    if (btn.dataset.template === templateId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  var template = TEMPLATES[templateId];
  if (!template) return;

  renderGuidePanel(template);
  renderFormFields(template, clearFields);
  updatePreviewContent();
}

// ── 가이드 패널 렌더링 ─────────────────────────────────────────────
function renderGuidePanel(template) {
  var panel = document.getElementById('guide-panel');
  if (!panel) return;

  var items = (template.guide || []).map(function(g) {
    return '<li>' + escapeHtml(g) + '</li>';
  }).join('');

  panel.innerHTML =
    '<div class="guide-card">' +
      '<h4>📌 ' + escapeHtml(template.name) + ' 작성 가이드</h4>' +
      '<ul class="guide-list">' + items + '</ul>' +
    '</div>';
}

// ── 폼 필드 렌더링 ─────────────────────────────────────────────────
function renderFormFields(template, clearFields) {
  if (clearFields === undefined) clearFields = true;
  var container = document.getElementById('form-fields');
  if (!container) return;

  var settings  = Storage.getSettings();
  var receivers = settings.receivers || [];

  var receiverOptions = receivers.map(function(r, i) {
    return '<option value="' + i + '">' +
      escapeHtml(r.title || '') +
      (r.dept ? ' (' + escapeHtml(r.dept) + ')' : '') +
      '</option>';
  }).join('');

  var html = '';

  // 수신처 선택
  html += '<div class="field-row">' +
    '<label>자주 쓰는 수신처</label>' +
    '<select id="receiver-select" class="form-select">' +
      '<option value="">-- 선택 --</option>' +
      receiverOptions +
    '</select>' +
  '</div>';

  // 수신
  if (template.id === 'internal') {
    html += '<div class="field-row">' +
      '<label class="required">수신</label>' +
      '<input type="text" id="field-receiver" class="form-input" value="내부결재">' +
    '</div>';
  } else if (template.id === 'sponsor') {
    html += '<div class="field-row">' +
      '<label class="required">수신</label>' +
      '<input type="text" id="field-receiver" class="form-input" placeholder="홍길동 귀하">' +
      '<input type="text" id="field-receiver-dept" class="form-input mt-1" placeholder="주소">' +
    '</div>';
  } else {
    html += '<div class="field-row">' +
      '<label class="required">수신</label>' +
      '<input type="text" id="field-receiver" class="form-input" placeholder="예: ○○시장">' +
      '<input type="text" id="field-receiver-dept" class="form-input mt-1" placeholder="참조 부서 (예: 사회복지과장)">' +
    '</div>';
  }

  // 경유 (내부결재 제외)
  if (template.id !== 'internal') {
    html += '<div class="field-row">' +
      '<label>경유</label>' +
      '<input type="text" id="field-via" class="form-input" placeholder="경유 기관 (없으면 비워두세요)">' +
    '</div>';
  }

  // 제목
  html += '<div class="field-row">' +
    '<label class="required">제목</label>' +
    '<input type="text" id="field-title" class="form-input" placeholder="문서 제목을 입력하세요">' +
  '</div>';

  // 관련 근거
  if (template.id === 'government' || template.id === 'cooperation' || template.id === 'event') {
    html += '<div class="field-row">' +
      '<label>관련 근거</label>' +
      '<input type="text" id="field-related" class="form-input" placeholder="예: 사회복지사업법 제○조">' +
    '</div>';
  }

  // 행사 전용
  if (template.id === 'event') {
    html += '<div class="field-row">' +
      '<label class="required">행사 일시</label>' +
      '<input type="text" id="field-datetime" class="form-input" placeholder="예: 2024. 5. 15. 14:00">' +
    '</div>' +
    '<div class="field-row">' +
      '<label class="required">장소</label>' +
      '<input type="text" id="field-location" class="form-input" placeholder="예: ○○복지관 대강당">' +
    '</div>' +
    '<div class="field-row">' +
      '<label>대상</label>' +
      '<input type="text" id="field-target" class="form-input" placeholder="예: 지역 내 사회복지기관 종사자">' +
    '</div>';
  }

  // 후원자 전용
  if (template.id === 'sponsor') {
    html += '<div class="field-row">' +
      '<label>후원자 성명</label>' +
      '<input type="text" id="field-sponsor-name" class="form-input" placeholder="예: 홍길동">' +
    '</div>' +
    '<div class="field-row">' +
      '<label>후원 내용</label>' +
      '<input type="text" id="field-sponsor-detail" class="form-input" placeholder="예: 후원금 500,000원 (2024. 1. 15.)">' +
    '</div>';
  }

  // 본문
  html += '<div class="field-row">' +
    '<label class="required">본문</label>' +
    '<textarea id="field-body" class="form-textarea" rows="6" placeholder="문서 본문을 입력하세요."></textarea>' +
  '</div>';

  // 붙임
  html += '<div class="field-row">' +
    '<label>붙임</label>' +
    '<input type="text" id="field-attachments" class="form-input" placeholder="예: 사업계획서 1부.">' +
  '</div>';

  // 시행번호 / 접수번호
  html += '<div class="field-row field-row-half">' +
    '<div>' +
      '<label>시행번호</label>' +
      '<input type="text" id="field-docNumber" class="form-input" placeholder="예: 사회복지과-123">' +
    '</div>' +
    '<div>' +
      '<label>접수번호</label>' +
      '<input type="text" id="field-receiptNumber" class="form-input" placeholder="예: 사회복지과-456">' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  if (clearFields) clearAllFields();

  // 수신처 이벤트 재바인딩
  loadReceiverOptions();

  // 입력 이벤트
  container.querySelectorAll('input, textarea, select').forEach(function(el) {
    el.addEventListener('input',  onFieldInput);
    el.addEventListener('change', onFieldInput);
  });
}

// ── 필드 초기화 ────────────────────────────────────────────────────
function clearAllFields() {
  document.querySelectorAll('#form-fields input, #form-fields textarea').forEach(function(el) {
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
  var template = TEMPLATES[currentTemplateId];
  if (!template || !template.example) return;

  var ex = template.example;
  Object.keys(ex).forEach(function(key) {
    var el = document.getElementById('field-' + key);
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
  var editor = document.getElementById('editor-content');
  if (!editor) return;
  editor.value = buildDocumentContent();
}

// ── 문서 내용 생성 ─────────────────────────────────────────────────
function buildDocumentContent() {
  var settings = Storage.getSettings();
  var detail   = (typeof ExtendedStorage !== 'undefined')
                   ? ExtendedStorage.getOrgDetail()
                   : {};
  var orgName  = settings.orgName || '○○기관';
  var today    = getTodayString();

  function f(key) {
    var el = document.getElementById('field-' + key);
    return el ? el.value.trim() : '';
  }

  var receiver       = f('receiver');
  var receiverDept   = f('receiver-dept');
  var via            = f('via');
  var title          = f('title');
  var related        = f('related');
  var body           = f('body');
  var attachments    = f('attachments');
  var datetime       = f('datetime');
  var location       = f('location');
  var target         = f('target');
  var sponsorName    = f('sponsor-name');
  var sponsorDetail  = f('sponsor-detail');
  var docNumber      = f('docNumber');
  var receiptNumber  = f('receiptNumber');

  var lines = [];

  // 수신
  if (currentTemplateId === 'internal') {
    lines.push('수신: 내부결재');
  } else if (currentTemplateId === 'sponsor') {
    if (receiver) {
      lines.push('수신: ' + receiver + ' 귀하');
      if (receiverDept) lines.push('      ' + receiverDept);
    }
  } else {
    if (receiver) {
      lines.push('수신: ' + receiver + (receiverDept ? ' (' + receiverDept + ')' : ''));
    }
  }

  // 경유
  if (via && currentTemplateId !== 'internal') {
    lines.push('경유: ' + via);
  }

  lines.push('');
  lines.push('제목: ' + (title || '(제목을 입력하세요)'));
  lines.push('');

  // 관련
  if (related) {
    lines.push('1. 관련: ' + related);
  }

  // 행사
  if (currentTemplateId === 'event') {
    var num = related ? '2' : '1';
    lines.push(num + '. 다음과 같이 행사를 개최하오니 참석하여 주시기 바랍니다.');
    lines.push('');
    lines.push('  - 다      음 -');
    lines.push('');
    if (datetime) lines.push('  가. 일  시: ' + datetime);
    if (location) lines.push('  나. 장  소: ' + location);
    if (target)   lines.push('  다. 대  상: ' + target);
    if (body)     lines.push('  라. 내  용: ' + body);
    lines.push('');
  } else if (currentTemplateId === 'sponsor') {
    if (body) {
      lines.push(body);
    } else {
      lines.push('귀하의 따뜻한 후원에 깊이 감사드립니다.');
    }
    if (sponsorName)   lines.push('후원자: ' + sponsorName);
    if (sponsorDetail) lines.push('후원 내용: ' + sponsorDetail);
    lines.push('');
  } else {
    if (body) {
      var bodyNum = related ? '2' : '1';
      lines.push(bodyNum + '. ' + body);
      lines.push('');
    }
  }

  // 붙임
  if (attachments) {
    lines.push('붙임  ' + attachments);
    lines.push('');
  }

  lines.push('끝.');
  lines.push('');

  // 발신명의
  if (currentTemplateId !== 'internal') {
    lines.push('발신명의: ' + orgName);
    lines.push('');
  }

  // 결재라인
  var approvalLevels = settings.approvalLevels || [
    { title: '담당' }, { title: '과장' }, { title: '관장' }
  ];
  var approvalStr = approvalLevels.map(function(lv) {
    return lv.title + (lv.name ? '(' + lv.name + ')' : '');
  }).join(' → ');
  lines.push('결재: ' + approvalStr);
  lines.push('');

  // 협조자
  try {
    var cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');
    if (cooperators.length > 0) {
      var coopStr = cooperators.map(function(c) {
        return (c.title || '') + (c.name ? '(' + c.name + ')' : '');
      }).join(', ');
      lines.push('협조자: ' + coopStr);
      lines.push('');
    }
  } catch(e) {}

  // 시행/접수 + 하단 정보
  if (currentTemplateId !== 'internal') {
    var numParts = [];
    if (docNumber)     numParts.push('시행 ' + docNumber);
    if (receiptNumber) numParts.push('접수 ' + receiptNumber);
    if (numParts.length) lines.push(numParts.join('  '));

    if (detail) {
      var addrParts = [];
      if (detail.zipCode)  addrParts.push('우 ' + detail.zipCode);
      if (detail.address)  addrParts.push(detail.address);
      if (detail.homepage) addrParts.push('/ ' + detail.homepage);
      if (addrParts.length) lines.push(addrParts.join('  '));

      var contactParts = [];
      if (detail.tel)        contactParts.push('전화 ' + detail.tel);
      if (detail.fax)        contactParts.push('팩스 ' + detail.fax);
      if (detail.email)      contactParts.push('/ ' + detail.email);
      if (detail.disclosure) contactParts.push('/ ' + detail.disclosure);
      if (contactParts.length) lines.push(contactParts.join('  '));
    }
  }

  return lines.join('\n');
}

// ── 실시간 규칙 검사 ───────────────────────────────────────────────
function runRealtimeCheck() {
  var editor = document.getElementById('editor-content');
  if (!editor) return;
  if (typeof Checker === 'undefined') return;

  checkResults = Checker.checkAll(editor.value, currentTemplateId);

  if (typeof CheckerUI !== 'undefined') {
    CheckerUI.renderSidePanel(checkResults);
  }
  updateCheckSummary(checkResults);
}

function updateCheckSummary(results) {
  var summaryEl = document.getElementById('check-summary');
  if (!summaryEl) return;

  var errors   = results.filter(function(r) { return r.level === 'error';   }).length;
  var warnings = results.filter(function(r) { return r.level === 'warning'; }).length;
  var infos    = results.filter(function(r) { return r.level === 'info';    }).length;

  if (results.length === 0) {
    summaryEl.innerHTML = '<span class="badge badge-success">✅ 이상 없음</span>';
  } else {
    var html = '';
    if (errors)   html += '<span class="badge badge-error">오류 ' + errors + '</span> ';
    if (warnings) html += '<span class="badge badge-warning">경고 ' + warnings + '</span> ';
    if (infos)    html += '<span class="badge badge-info">안내 ' + infos + '</span>';
    summaryEl.innerHTML = html;
  }
}

// ── 규칙 검사 모달 ─────────────────────────────────────────────────
function openCheckModal() {
  runRealtimeCheck();
  if (typeof CheckerUI !== 'undefined') {
    CheckerUI.renderCheckModal(checkResults, 'check-modal-body');
  }
  Modal.open('check-modal');
}

// ── 자동 수정 ──────────────────────────────────────────────────────
function applyAutoFix() {
  var editor = document.getElementById('editor-content');
  if (!editor) return;
  if (typeof Checker === 'undefined') return;

  var fixed = Checker.applyAllFixes(editor.value, checkResults);
  editor.value = fixed;

  runRealtimeCheck();
  isModified = true;
  showToast('오류가 자동 수정되었습니다.', 'success');
  Modal.close('check-modal');
}

// ── 순화어 모달 ────────────────────────────────────────────────────
function openPurifyModal() {
  var editor = document.getElementById('editor-content');
  if (!editor) return;
  if (typeof CheckerUI !== 'undefined') {
    CheckerUI.renderPurifyModal(editor.value, 'purify-modal-body');
  }
  Modal.open('purify-modal');
}

// ── 임시저장 ───────────────────────────────────────────────────────
function saveDraft() {
  var editor  = document.getElementById('editor-content');
  var titleEl = document.getElementById('field-title');
  if (!editor) return;

  var title = titleEl ? titleEl.value.trim() : '';

  if (!title && !editor.value.trim()) {
    showToast('제목 또는 내용을 입력하세요.', 'warning');
    return;
  }

  var draft = {
    id:         currentDocId,
    templateId: currentTemplateId,
    title:      title || '(제목 없음)',
    content:    editor.value,
    fields:     collectFields(),
    savedAt:    new Date().toISOString()
  };

  Storage.saveDraft(draft);
  isModified = false;

  var saveStatus = document.getElementById('save-status');
  if (saveStatus) {
    saveStatus.textContent = '임시저장 완료 (' + formatDateShort(new Date()) + ')';
    saveStatus.className = 'save-status saved';
  }
  showToast('임시저장되었습니다. ✅', 'success');
}

function autoSaveDocument() {
  if (!isModified) return;
  saveDraft();
  var saveStatus = document.getElementById('save-status');
  if (saveStatus) {
    saveStatus.textContent = '자동저장 (' + formatDateShort(new Date()) + ')';
  }
}

// ── 필드 수집 ──────────────────────────────────────────────────────
function collectFields() {
  var fields = {};
  document.querySelectorAll('#form-fields input, #form-fields textarea').forEach(function(el) {
    if (el.id && el.id.indexOf('field-') === 0) {
      var key = el.id.replace('field-', '');
      fields[key] = el.value;
    }
  });
  return fields;
}

// ── 미리보기 이동 ──────────────────────────────────────────────────
function goToPreview() {
  var editor = document.getElementById('editor-content');
  if (!editor || !editor.value.trim()) {
    showToast('내용을 입력해주세요.', 'warning');
    return;
  }
  saveDraft();
  window.location.href = 'preview.html?id=' + currentDocId + '&type=draft';
}

// ── 이벤트 바인딩 ──────────────────────────────────────────────────
function bindEditorEvents() {

  // 템플릿 버튼
  document.querySelectorAll('.template-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (isModified) {
        if (!confirm('변경 내용이 있습니다. 템플릿을 변경하면 내용이 초기화됩니다.\n계속하시겠습니까?')) return;
      }
      selectTemplate(btn.dataset.template, true);
      isModified = false;
    });
  });

  // 임시저장
  var saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) saveDraftBtn.addEventListener('click', saveDraft);

  // 예시채우기
  var fillExampleBtn = document.getElementById('fill-example-btn');
  if (fillExampleBtn) fillExampleBtn.addEventListener('click', fillExample);

  // 규칙검사
  var ruleCheckBtn = document.getElementById('rule-check-btn');
  if (ruleCheckBtn) ruleCheckBtn.addEventListener('click', openCheckModal);

  // 자동수정
  var autoFixBtn = document.getElementById('auto-fix-btn');
  if (autoFixBtn) autoFixBtn.addEventListener('click', applyAutoFix);

  // 순화어
  var purifyBtn = document.getElementById('purify-btn');
  if (purifyBtn) purifyBtn.addEventListener('click', openPurifyModal);

  // 미리보기
  var previewBtn = document.getElementById('preview-btn');
  if (previewBtn) previewBtn.addEventListener('click', goToPreview);

  // 에디터 직접 입력
  var editorContent = document.getElementById('editor-content');
  if (editorContent) {
    editorContent.addEventListener('input', function() {
      isModified = true;
      clearTimeout(realtimeCheckTimer);
      realtimeCheckTimer = setTimeout(runRealtimeCheck, 800);
    });
  }

  // 모달 닫기
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var modal = btn.closest('.modal-overlay');
      if (modal) Modal.close(modal.id);
    });
  });

  // 키보드 단축키
  document.addEventListener('keydown', function(e) {
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
  window.addEventListener('beforeunload', function(e) {
    if (isModified) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
