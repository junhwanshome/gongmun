// js/settings.js
// 기관 설정 페이지 기능

// =====================
// 페이지 초기화
// =====================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
});

// =====================
// 설정 불러오기
// =====================
function loadSettings() {
  const settings = Storage.getSettings();

  // 기관명
  const orgNameInput = document.getElementById('org-name');
  if (orgNameInput) {
    orgNameInput.value = settings.orgName || '';
  }

  // 결재라인
  renderApprovalLevels(settings.approvalLevels);

  // 수신처 목록
  renderReceivers(settings.receivers);
}

// =====================
// 결재라인 렌더링
// =====================
function renderApprovalLevels(levels) {
  const container = document.getElementById('approval-levels');
  if (!container) return;

  container.innerHTML = levels.map((level, idx) => `
    <div class="approval-level" id="approval-${idx}">
      <div class="approval-level-num">${idx + 1}</div>
      <input
        type="text"
        class="form-control"
        placeholder="직위 (예: 담당, 팀장, 과장, 관장)"
        value="${escapeHtml(level.title || '')}"
        onchange="updateApprovalLevel(${idx}, 'title', this.value)"
        id="approval-title-${idx}"
      />
      <input
        type="text"
        class="form-control"
        placeholder="이름 (선택)"
        value="${escapeHtml(level.name || '')}"
        onchange="updateApprovalLevel(${idx}, 'name', this.value)"
        id="approval-name-${idx}"
      />
      <button
        class="btn btn-danger btn-sm"
        onclick="removeApprovalLevel(${idx})"
        ${levels.length <= 2 ? 'disabled' : ''}
        title="삭제"
      >
        ✕
      </button>
    </div>
  `).join('');
}

// =====================
// 결재라인 업데이트
// =====================
function updateApprovalLevel(idx, field, value) {
  const settings = Storage.getSettings();
  if (settings.approvalLevels[idx]) {
    settings.approvalLevels[idx][field] = value;
    Storage.saveSettings(settings);
  }
}

// =====================
// 결재라인 추가
// =====================
function addApprovalLevel() {
  const settings = Storage.getSettings();

  if (settings.approvalLevels.length >= 7) {
    showToast('결재라인은 최대 7단계까지 가능해요', 'warning');
    return;
  }

  settings.approvalLevels.push({
    title: '',
    name: ''
  });

  Storage.saveSettings(settings);
  renderApprovalLevels(settings.approvalLevels);
  showToast('결재라인을 추가했어요', 'success');
}

// =====================
// 결재라인 삭제
// =====================
function removeApprovalLevel(idx) {
  const settings = Storage.getSettings();

  if (settings.approvalLevels.length <= 2) {
    showToast('결재라인은 최소 2단계가 필요해요', 'warning');
    return;
  }

  settings.approvalLevels.splice(idx, 1);
  Storage.saveSettings(settings);
  renderApprovalLevels(settings.approvalLevels);
  showToast('결재라인을 삭제했어요', 'success');
}

// =====================
// 결재라인 순서 미리보기
// =====================
function previewApprovalLine() {
  const settings = Storage.getSettings();
  const levels = settings.approvalLevels;

  if (levels.length === 0) {
    showToast('결재라인을 먼저 설정해주세요', 'warning');
    return;
  }

  const preview = levels
    .map(l => l.title || '미입력')
    .join(' → ');

  document.getElementById('approval-preview-text').textContent = preview;
  document.getElementById('approval-preview').style.display = 'block';
}

// =====================
// 수신처 렌더링
// =====================
function renderReceivers(receivers) {
  const container = document.getElementById('receiver-list');
  if (!container) return;

  if (!receivers || receivers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>📭</span>
        <p>저장된 수신처가 없어요</p>
      </div>
    `;
    return;
  }

  container.innerHTML = receivers.map((receiver, idx) => `
    <div class="receiver-item" id="receiver-${idx}">
      <input
        type="text"
        class="form-control"
        placeholder="수신자 (예: ○○시장)"
        value="${escapeHtml(receiver.name || '')}"
        onchange="updateReceiver(${idx}, 'name', this.value)"
      />
      <input
        type="text"
        class="form-control"
        placeholder="담당부서 (예: 사회복지과장)"
        value="${escapeHtml(receiver.dept || '')}"
        onchange="updateReceiver(${idx}, 'dept', this.value)"
      />
      <button
        class="btn btn-danger btn-sm"
        onclick="removeReceiver(${idx})"
        title="삭제"
      >
        ✕
      </button>
    </div>
  `).join('');
}

// =====================
// 수신처 업데이트
// =====================
function updateReceiver(idx, field, value) {
  const settings = Storage.getSettings();
  if (settings.receivers[idx]) {
    settings.receivers[idx][field] = value;
    Storage.saveSettings(settings);
  }
}

// =====================
// 수신처 추가
// =====================
function addReceiver() {
  const settings = Storage.getSettings();

  if (settings.receivers.length >= 20) {
    showToast('수신처는 최대 20개까지 저장 가능해요', 'warning');
    return;
  }

  settings.receivers.push({
    name: '',
    dept: ''
  });

  Storage.saveSettings(settings);
  renderReceivers(settings.receivers);
  showToast('수신처를 추가했어요', 'success');

  // 마지막 추가된 입력창으로 포커스
  setTimeout(() => {
    const inputs = document.querySelectorAll(
      '#receiver-list .receiver-item:last-child input'
    );
    if (inputs[0]) inputs[0].focus();
  }, 100);
}

// =====================
// 수신처 삭제
// =====================
function removeReceiver(idx) {
  const settings = Storage.getSettings();
  settings.receivers.splice(idx, 1);
  Storage.saveSettings(settings);
  renderReceivers(settings.receivers);
  showToast('수신처를 삭제했어요', 'success');
}

// =====================
// 전체 설정 저장
// =====================
function saveAllSettings() {
  const settings = Storage.getSettings();

  // 기관명 저장
  const orgNameInput = document.getElementById('org-name');
  if (orgNameInput) {
    settings.orgName = orgNameInput.value.trim();
  }

  // 결재라인 현재 입력값 저장
  const levels = [];
  document.querySelectorAll('.approval-level').forEach((el, idx) => {
    const titleInput = document.getElementById(`approval-title-${idx}`);
    const nameInput = document.getElementById(`approval-name-${idx}`);
    if (titleInput) {
      levels.push({
        title: titleInput.value.trim(),
        name: nameInput ? nameInput.value.trim() : ''
      });
    }
  });

  if (levels.length > 0) {
    settings.approvalLevels = levels;
  }

  // 빈 항목 필터링
  settings.approvalLevels = settings.approvalLevels.filter(
    l => l.title.trim() !== ''
  );

  if (settings.approvalLevels.length < 2) {
    showToast('결재라인은 최소 2단계가 필요해요', 'warning');
    return;
  }

  Storage.saveSettings(settings);
  showToast('설정이 저장되었어요!', 'success');

  // 1초 후 메인으로 이동
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// =====================
// 설정 초기화
// =====================
function resetSettings() {
  if (!confirm('모든 설정을 초기화할까요?\n저장된 내용이 모두 삭제돼요!')) {
    return;
  }

  localStorage.removeItem('doc_settings');
  loadSettings();
  showToast('설정이 초기화되었어요', 'success');
}

// =====================
// 기본값으로 초기화
// =====================
function setDefaultApproval() {
  if (!confirm('기본 결재라인(담당→과장→관장)으로 설정할까요?')) {
    return;
  }

  const settings = Storage.getSettings();
  settings.approvalLevels = [
    { title: '담당', name: '' },
    { title: '과장', name: '' },
    { title: '관장', name: '' }
  ];

  Storage.saveSettings(settings);
  renderApprovalLevels(settings.approvalLevels);
  showToast('기본 결재라인으로 설정했어요', 'success');
}

function setDefaultReceivers() {
  if (!confirm('기본 수신처 목록으로 설정할까요?')) {
    return;
  }

  const settings = Storage.getSettings();
  settings.receivers = [
    { name: '○○시장', dept: '사회복지과장' },
    { name: '○○구청장', dept: '복지정책과장' },
    { name: '○○사회복지협의회장', dept: '사무국장' },
    { name: '○○교육지원청교육장', dept: '교육복지과장' },
    { name: '○○보건소장', dept: '건강증진과장' }
  ];

  Storage.saveSettings(settings);
  renderReceivers(settings.receivers);
  showToast('기본 수신처로 설정했어요', 'success');
}

// =====================
// 이벤트 바인딩
// =====================
function bindEvents() {

  // 저장 버튼
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAllSettings);
  }

  // 초기화 버튼
  const resetBtn = document.getElementById('reset-settings-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }

  // 결재라인 추가 버튼
  const addApprovalBtn = document.getElementById('add-approval-btn');
  if (addApprovalBtn) {
    addApprovalBtn.addEventListener('click', addApprovalLevel);
  }

  // 수신처 추가 버튼
  const addReceiverBtn = document.getElementById('add-receiver-btn');
  if (addReceiverBtn) {
    addReceiverBtn.addEventListener('click', addReceiver);
  }

  // 기본값 버튼들
  const defaultApprovalBtn = document.getElementById(
    'default-approval-btn'
  );
  if (defaultApprovalBtn) {
    defaultApprovalBtn.addEventListener('click', setDefaultApproval);
  }

  const defaultReceiverBtn = document.getElementById(
    'default-receiver-btn'
  );
  if (defaultReceiverBtn) {
    defaultReceiverBtn.addEventListener('click', setDefaultReceivers);
  }

  // 미리보기 버튼
  const previewBtn = document.getElementById('preview-approval-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', previewApprovalLine);
  }

  // 기관명 입력시 자동저장
  const orgNameInput = document.getElementById('org-name');
  if (orgNameInput) {
    orgNameInput.addEventListener('blur', () => {
      const settings = Storage.getSettings();
      settings.orgName = orgNameInput.value.trim();
      Storage.saveSettings(settings);
    });
  }
}
