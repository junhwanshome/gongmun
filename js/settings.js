/**
 * js/settings.js
 * 기관 설정 페이지 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
  loadOrgDetailFields();
  loadLogoPreview();
  renderCooperators();
});

// ── 설정 불러오기 ──────────────────────────────────────────────────
function loadSettings() {
  const settings = Storage.getSettings();

  // 기관명
  const orgNameInput = document.getElementById('org-name');
  if (orgNameInput) orgNameInput.value = settings.orgName || '';

  // 결재라인
  if (!settings.approvalLevels || settings.approvalLevels.length === 0) {
    settings.approvalLevels = DEFAULT_APPROVAL;
    Storage.saveSettings(settings);
  }
  renderApprovalLevels(settings.approvalLevels);

  // 수신처
  renderReceivers(settings.receivers || []);

  // 결재 테이블 미리보기 업데이트
  updateApprovalTablePreview();
}

// ── 기관 상세정보 필드 불러오기 ────────────────────────────────────
function loadOrgDetailFields() {
  const detail = ExtendedStorage.getOrgDetail();
  const fields = ['zipCode','address','homepage','tel','fax','email','disclosure'];
  fields.forEach(key => {
    const el = document.getElementById(`org-${key}`);
    if (el) el.value = detail[key] || '';
  });
}

// ── 로고 미리보기 불러오기 ─────────────────────────────────────────
function loadLogoPreview() {
  const logo = LogoManager.get();
  const preview = document.getElementById('logo-preview');
  const deleteBtn = document.getElementById('delete-logo-btn');
  if (!preview) return;

  if (logo) {
    preview.src = logo;
    preview.style.display = 'block';
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
  } else {
    preview.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
}

// ── 결재라인 렌더링 ────────────────────────────────────────────────
function renderApprovalLevels(levels) {
  const container = document.getElementById('approval-levels');
  if (!container) return;

  container.innerHTML = '';
  levels.forEach((level, idx) => {
    const div = document.createElement('div');
    div.className = 'approval-level-item';
    div.innerHTML = `
      <span class="level-num">${idx + 1}단계</span>
      <input type="text" class="form-input approval-title"
             placeholder="직위 (예: 담당)" value="${escapeHtml(level.title || '')}"
             data-idx="${idx}" data-field="title">
      <input type="text" class="form-input approval-name"
             placeholder="성명 (선택)" value="${escapeHtml(level.name || '')}"
             data-idx="${idx}" data-field="name">
      <button class="btn btn-sm btn-danger remove-approval-btn"
              data-idx="${idx}" ${levels.length <= 2 ? 'disabled' : ''}>삭제</button>
    `;
    container.appendChild(div);
  });

  updateApprovalTablePreview();
}

// ── 결재라인 테이블 미리보기 ───────────────────────────────────────
function updateApprovalTablePreview() {
  const preview = document.getElementById('approval-table-preview');
  if (!preview) return;

  const settings = Storage.getSettings();
  const levels = settings.approvalLevels || DEFAULT_APPROVAL;
  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');

  let html = '<table class="approval-preview-table"><thead><tr>';

  if (cooperators.length > 0) {
    html += '<th colspan="2" style="text-align:center">협조</th>';
  }
  levels.forEach(lv => {
    html += `<th>${escapeHtml(lv.title || '')}</th>`;
  });
  html += '</tr></thead><tbody><tr>';

  if (cooperators.length > 0) {
    const coopNames = cooperators.map(c => escapeHtml(c.name || '')).join('<br>');
    const coopTitles = cooperators.map(c => escapeHtml(c.title || '')).join('<br>');
    html += `<td style="text-align:center">${coopTitles}</td>`;
    html += `<td style="min-width:60px;height:50px">${coopNames}</td>`;
  }

  levels.forEach(lv => {
    html += `<td style="min-width:60px;height:50px">${escapeHtml(lv.name || '')}</td>`;
  });
  html += '</tr></tbody></table>';

  preview.innerHTML = html;
  document.getElementById('approval-preview').style.display = 'block';
}

// ── 협조자 렌더링 ──────────────────────────────────────────────────
function renderCooperators() {
  const list = document.getElementById('cooperator-list');
  if (!list) return;

  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');

  if (cooperators.length === 0) {
    list.innerHTML = '<p class="empty-state">등록된 협조자가 없습니다.</p>';
    return;
  }

  list.innerHTML = cooperators.map((c, idx) => `
    <div class="cooperator-item">
      <span class="coop-num">${idx + 1}</span>
      <input type="text" class="form-input" placeholder="직위"
             value="${escapeHtml(c.title || '')}"
             onchange="updateCooperator(${idx},'title',this.value)">
      <input type="text" class="form-input" placeholder="성명"
             value="${escapeHtml(c.name || '')}"
             onchange="updateCooperator(${idx},'name',this.value)">
      <button class="btn btn-sm btn-danger"
              onclick="removeCooperator(${idx})">삭제</button>
    </div>
  `).join('');
}

function updateCooperator(idx, field, value) {
  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');
  if (cooperators[idx]) cooperators[idx][field] = value;
  localStorage.setItem('doc_cooperators', JSON.stringify(cooperators));
  updateApprovalTablePreview();
}

function addCooperator() {
  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');
  if (cooperators.length >= 5) {
    showToast('협조자는 최대 5명까지 등록할 수 있습니다.', 'warning');
    return;
  }
  cooperators.push({ title: '', name: '' });
  localStorage.setItem('doc_cooperators', JSON.stringify(cooperators));
  renderCooperators();
  updateApprovalTablePreview();
  showToast('협조자가 추가되었습니다.', 'success');
}

function removeCooperator(idx) {
  const cooperators = JSON.parse(localStorage.getItem('doc_cooperators') || '[]');
  cooperators.splice(idx, 1);
  localStorage.setItem('doc_cooperators', JSON.stringify(cooperators));
  renderCooperators();
  updateApprovalTablePreview();
  showToast('협조자가 삭제되었습니다.', 'info');
}

// ── 수신처 렌더링 ──────────────────────────────────────────────────
function renderReceivers(receivers) {
  const container = document.getElementById('receiver-list');
  if (!container) return;

  if (receivers.length === 0) {
    container.innerHTML = '<p class="empty-state">등록된 수신처가 없습니다. 아래 버튼으로 추가하세요.</p>';
    return;
  }

  container.innerHTML = receivers.map((r, idx) => `
    <div class="receiver-item">
      <span class="receiver-num">${idx + 1}</span>
      <input type="text" class="form-input" placeholder="수신자 직위"
             value="${escapeHtml(r.title || '')}"
             onchange="updateReceiver(${idx},'title',this.value)">
      <input type="text" class="form-input" placeholder="담당부서"
             value="${escapeHtml(r.dept || '')}"
             onchange="updateReceiver(${idx},'dept',this.value)">
      <button class="btn btn-sm btn-danger"
              onclick="removeReceiver(${idx})">삭제</button>
    </div>
  `).join('');
}

function updateReceiver(idx, field, value) {
  const settings = Storage.getSettings();
  if (!settings.receivers) settings.receivers = [];
  if (settings.receivers[idx]) settings.receivers[idx][field] = value;
  Storage.saveSettings(settings);
}

function addReceiver() {
  const settings = Storage.getSettings();
  if (!settings.receivers) settings.receivers = [];
  if (settings.receivers.length >= 20) {
    showToast('수신처는 최대 20개까지 등록할 수 있습니다.', 'warning');
    return;
  }
  settings.receivers.push({ title: '', dept: '' });
  Storage.saveSettings(settings);
  renderReceivers(settings.receivers);
  showToast('수신처가 추가되었습니다.', 'success');
}

function removeReceiver(idx) {
  const settings = Storage.getSettings();
  if (!settings.receivers) return;
  settings.receivers.splice(idx, 1);
  Storage.saveSettings(settings);
  renderReceivers(settings.receivers);
  showToast('수신처가 삭제되었습니다.', 'info');
}

// ── 전체 설정 저장 ─────────────────────────────────────────────────
function saveAllSettings() {
  const settings = Storage.getSettings();

  // 기관명
  const orgNameEl = document.getElementById('org-name');
  if (orgNameEl) settings.orgName = orgNameEl.value.trim();

  // 결재라인 수집
  const titleInputs = document.querySelectorAll('.approval-title');
  const nameInputs  = document.querySelectorAll('.approval-name');
  const levels = [];
  titleInputs.forEach((input, idx) => {
    const title = input.value.trim();
    const name  = nameInputs[idx] ? nameInputs[idx].value.trim() : '';
    if (title) levels.push({ title, name });
  });

  if (levels.length < 2) {
    showToast('결재라인은 최소 2단계 이상이어야 합니다.', 'error');
    return;
  }
  settings.approvalLevels = levels;

  Storage.saveSettings(settings);

  // 기관 상세정보 저장
  const detail = {};
  ['zipCode','address','homepage','tel','fax','email','disclosure'].forEach(key => {
    const el = document.getElementById(`org-${key}`);
    detail[key] = el ? el.value.trim() : '';
  });
  ExtendedStorage.saveOrgDetail(detail);

  showToast('설정이 저장되었습니다! ✅', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
}

// ── 설정 초기화 ────────────────────────────────────────────────────
function resetSettings() {
  if (!confirm('모든 설정을 초기화하시겠습니까?\n(임시저장 문서와 완성 문서는 유지됩니다)')) return;

  const settings = Storage.getSettings();
  settings.orgName = '';
  settings.approvalLevels = DEFAULT_APPROVAL;
  settings.receivers = [];
  Storage.saveSettings(settings);

  ExtendedStorage.saveOrgDetail({
    zipCode:'', address:'', homepage:'', tel:'', fax:'', email:'', disclosure:''
  });

  LogoManager.remove();
  localStorage.removeItem('doc_cooperators');

  loadSettings();
  loadOrgDetailFields();
  loadLogoPreview();
  renderCooperators();
  showToast('설정이 초기화되었습니다.', 'info');
}

// ── 기본값 설정 ────────────────────────────────────────────────────
function setDefaultApproval() {
  if (!confirm('결재라인을 기본값(담당→과장→관장)으로 설정하시겠습니까?')) return;
  const settings = Storage.getSettings();
  settings.approvalLevels = JSON.parse(JSON.stringify(DEFAULT_APPROVAL));
  Storage.saveSettings(settings);
  renderApprovalLevels(settings.approvalLevels);
  showToast('기본 결재라인이 설정되었습니다.', 'success');
}

function setDefaultReceivers() {
  if (!confirm('수신처를 기본값으로 설정하시겠습니까?')) return;
  const settings = Storage.getSettings();
  settings.receivers = JSON.parse(JSON.stringify(DEFAULT_RECEIVERS));
  Storage.saveSettings(settings);
  renderReceivers(settings.receivers);
  showToast('기본 수신처가 설정되었습니다.', 'success');
}

// ── 이벤트 바인딩 ──────────────────────────────────────────────────
function bindEvents() {
  // 저장 버튼
  ['save-settings-btn', 'save-settings-btn-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', saveAllSettings);
  });

  // 초기화 버튼
  const resetBtn = document.getElementById('reset-settings-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetSettings);

  // 결재라인 추가
  const addApprovalBtn = document.getElementById('add-approval-btn');
  if (addApprovalBtn) addApprovalBtn.addEventListener('click', () => {
    const settings = Storage.getSettings();
    if ((settings.approvalLevels || []).length >= 7) {
      showToast('결재라인은 최대 7단계까지 가능합니다.', 'warning');
      return;
    }
    settings.approvalLevels = settings.approvalLevels || [];
    settings.approvalLevels.push({ title: '', name: '' });
    Storage.saveSettings(settings);
    renderApprovalLevels(settings.approvalLevels);
    showToast('결재 단계가 추가되었습니다.', 'success');
  });

  // 결재라인 삭제 (이벤트 위임)
  const approvalContainer = document.getElementById('approval-levels');
  if (approvalContainer) {
    approvalContainer.addEventListener('click', e => {
      if (e.target.classList.contains('remove-approval-btn')) {
        const idx = parseInt(e.target.dataset.idx);
        const settings = Storage.getSettings();
        if ((settings.approvalLevels || []).length <= 2) {
          showToast('결재라인은 최소 2단계 이상이어야 합니다.', 'warning');
          return;
        }
        settings.approvalLevels.splice(idx, 1);
        Storage.saveSettings(settings);
        renderApprovalLevels(settings.approvalLevels);
        showToast('결재 단계가 삭제되었습니다.', 'info');
      }
    });

    // 결재라인 입력 변경 (이벤트 위임)
    approvalContainer.addEventListener('input', e => {
      const input = e.target;
      const idx   = parseInt(input.dataset.idx);
      const field = input.dataset.field;
      if (isNaN(idx) || !field) return;
      const settings = Storage.getSettings();
      if (settings.approvalLevels && settings.approvalLevels[idx]) {
        settings.approvalLevels[idx][field] = input.value;
        Storage.saveSettings(settings);
        updateApprovalTablePreview();
      }
    });
  }

  // 결재라인 기본값
  const defaultApprovalBtn = document.getElementById('default-approval-btn');
  if (defaultApprovalBtn) defaultApprovalBtn.addEventListener('click', setDefaultApproval);

  // 결재 미리보기
  const previewApprovalBtn = document.getElementById('preview-approval-btn');
  if (previewApprovalBtn) previewApprovalBtn.addEventListener('click', updateApprovalTablePreview);

  // 수신처 추가
  const addReceiverBtn = document.getElementById('add-receiver-btn');
  if (addReceiverBtn) addReceiverBtn.addEventListener('click', addReceiver);

  // 수신처 기본값
  const defaultReceiverBtn = document.getElementById('default-receiver-btn');
  if (defaultReceiverBtn) defaultReceiverBtn.addEventListener('click', setDefaultReceivers);

  // 협조자 추가
  const addCoopBtn = document.getElementById('add-cooperator-btn');
  if (addCoopBtn) addCoopBtn.addEventListener('click', addCooperator);

  // 로고 업로드
  const logoInput = document.getElementById('logo-input');
  if (logoInput) logoInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await LogoManager.save(file);
    if (ok) {
      loadLogoPreview();
      showToast('로고가 업로드되었습니다! ✅', 'success');
    }
  });

  // 로고 삭제
  const deleteLogoBtn = document.getElementById('delete-logo-btn');
  if (deleteLogoBtn) deleteLogoBtn.addEventListener('click', () => {
    if (!confirm('로고를 삭제하시겠습니까?')) return;
    LogoManager.remove();
    loadLogoPreview();
    showToast('로고가 삭제되었습니다.', 'info');
  });

  // 드래그앤드롭 로고 업로드
  const dropZone = document.getElementById('logo-drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const ok = await LogoManager.save(file);
      if (ok) {
        loadLogoPreview();
        showToast('로고가 업로드되었습니다! ✅', 'success');
      }
    });
  }

  // 기관명 자동저장 (blur)
  const orgNameInput = document.getElementById('org-name');
  if (orgNameInput) orgNameInput.addEventListener('blur', () => {
    const settings = Storage.getSettings();
    settings.orgName = orgNameInput.value.trim();
    Storage.saveSettings(settings);
  });
}
