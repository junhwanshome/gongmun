// js/preview.js
// 미리보기 페이지 기능

// =====================
// 전역 변수
// =====================
let currentDoc = null;
let currentType = 'draft';

// =====================
// 페이지 초기화
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initPreview();
  bindPreviewEvents();
});

// =====================
// 미리보기 초기화
// =====================
function initPreview() {
  const id = getUrlParam('id');
  const type = getUrlParam('type') || 'draft';
  currentType = type;

  if (!id) {
    showToast('문서를 찾을 수 없어요', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
    return;
  }

  // 문서 불러오기
  if (type === 'draft') {
    currentDoc = Storage.getDraftById(id);
  } else {
    currentDoc = Storage.getDocumentById(id);
  }

  if (!currentDoc) {
    showToast('문서를 찾을 수 없어요', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
    return;
  }

  // 미리보기 렌더링
  renderPreview(currentDoc);

  // 상태 표시
  updateDocStatus(type);
}

// =====================
// 문서 상태 표시
// =====================
function updateDocStatus(type) {
  const statusEl = document.getElementById('doc-status');
  if (!statusEl) return;

  if (type === 'draft') {
    statusEl.innerHTML = `
      <span class="badge badge-warning">📝 임시저장</span>
    `;
  } else {
    statusEl.innerHTML = `
      <span class="badge badge-success">✅ 완성 문서</span>
    `;
  }
}

// =====================
// 미리보기 렌더링
// =====================
function renderPreview(doc) {
  const container = document.getElementById('doc-preview');
  if (!container) return;

  const settings = Storage.getSettings();
  const orgName = settings.orgName || '○○사회복지관';
  const template = TEMPLATES[doc.templateId];
  const fields = doc.fields || {};

  // 제목 업데이트
  const titleEl = document.getElementById('preview-title');
  if (titleEl) {
    titleEl.textContent = doc.title || '제목 없음';
  }

  let html = '';

  // 기관명
  html += `
    <div class="doc-preview-header">
      ${escapeHtml(orgName)}
    </div>
  `;

  // 수신
  html += `<div class="doc-preview-field">`;
  html += `<div class="doc-preview-field-label">수신</div>`;
  html += `<div class="doc-preview-field-value">`;

  if (doc.templateId === 'internal') {
    html += `내부결재`;
  } else if (doc.templateId === 'sponsor') {
    const honorific = fields['receiver-dept'] || '귀하';
    html += `${escapeHtml(fields.receiver || '')} ${honorific}`;
    if (fields.address) {
      html += `(${escapeHtml(fields.address)})`;
    }
  } else {
    html += escapeHtml(fields.receiver || '');
    if (fields['receiver-dept']) {
      html += `(${escapeHtml(fields['receiver-dept'])})`;
    }
  }
  html += `</div></div>`;

  // 경유
  if (doc.templateId !== 'internal') {
    html += `
      <div class="doc-preview-field">
        <div class="doc-preview-field-label">(경유)</div>
        <div class="doc-preview-field-value">
          ${fields.via ? escapeHtml(fields.via) : ''}
        </div>
      </div>
    `;
  }

  // 제목
  html += `
    <div class="doc-preview-field">
      <div class="doc-preview-field-label">제목</div>
      <div class="doc-preview-field-value" 
        style="font-weight:700">
        ${escapeHtml(fields.title || '')}
      </div>
    </div>
  `;

  html += `<hr class="divider">`;

  // 관련 근거
  if (fields.related) {
    html += `
      <div class="doc-preview-body">
        ${escapeHtml(fields.related)}
      </div>
    `;
  }

  // 행사 안내 특수 구조
  if (doc.templateId === 'event') {
    if (fields.body) {
      html += `
        <div class="doc-preview-body">
          ${escapeHtml(fields.body).replace(/\n/g, '<br>')}
        </div>
      `;
    }

    html += `<div class="doc-preview-body">`;
    if (fields.datetime) {
      html += `1. 일시: ${escapeHtml(fields.datetime)}<br>`;
    }
    if (fields.location) {
      html += `2. 장소: ${escapeHtml(fields.location)}<br>`;
    }
    if (fields.target) {
      html += `3. 대상: ${escapeHtml(fields.target)}<br>`;
    }
    html += `</div>`;
  } else {
    // 일반 본문
    if (fields.body) {
      html += `
        <div class="doc-preview-body">
          ${escapeHtml(fields.body).replace(/\n/g, '<br>')}
        </div>
      `;
    }
  }

  // 붙임 + 끝 표시
  html += `<div class="doc-preview-body">`;
  if (fields.attachments) {
    html += `붙임&nbsp;&nbsp;${
      escapeHtml(fields.attachments)
        .replace(/\n/g, '<br>')
    }&nbsp;&nbsp;끝.`;
  } else {
    html += `끝.`;
  }
  html += `</div>`;

  // 발신명의 (내부결재 제외)
  if (doc.templateId !== 'internal') {
    html += `
      <div class="doc-preview-footer">
        <div class="doc-preview-sender">
          ${escapeHtml(orgName)}장
        </div>
      </div>
    `;
  }

  // 결재란
  html += renderApprovalTable(settings.approvalLevels);

  // 시행/접수 정보
  html += `
    <div style="
      margin-top: 20px;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
      padding-top: 10px;
    ">
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <span>시행 ${escapeHtml(orgName)}-
          ${formatDateShort(new Date().toISOString())}
        </span>
        <span>접수</span>
      </div>
      <div style="margin-top:4px">
        우 ○○○○○ ○○시 ○○구 ○○로 123 /
        www.example.com
      </div>
      <div>
        전화 ( ) / 전송 ( ) /
        전자우편 example@example.com /
        <span style="
          border: 1px solid #dee2e6;
          padding: 0 4px;
        ">공개</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// =====================
// 결재란 렌더링
// =====================
function renderApprovalTable(levels) {
  if (!levels || levels.length === 0) return '';

  let html = `
    <table class="approval-table">
      <tr>
        ${levels.map(l => `
          <th>${escapeHtml(l.title || '')}</th>
        `).join('')}
      </tr>
      <tr>
        ${levels.map(l => `
          <td>${escapeHtml(l.name || '')}</td>
        `).join('')}
      </tr>
    </table>
  `;

  return html;
}

// =====================
// 완성 문서로 저장
// =====================
function saveAsComplete() {
  if (!currentDoc) return;

  if (!confirm('완성 문서로 저장할까요?\n임시저장에서 완성 목록으로 이동해요')) {
    return;
  }

  // 완성 문서로 저장
  const completeDoc = {
    ...currentDoc,
    type: 'document',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  Storage.saveDocument(completeDoc);

  // 임시저장에서 삭제
  if (currentType === 'draft') {
    Storage.deleteDraft(currentDoc.id);
  }

  currentType = 'document';
  currentDoc = completeDoc;

  updateDocStatus('document');
  showToast('완성 문서로 저장되었어요!', 'success');

  // URL 업데이트
  const newUrl = `preview.html?id=${currentDoc.id}&type=document`;
  window.history.replaceState(null, '', newUrl);
}

// =====================
// 인쇄
// =====================
function printDocument() {
  window.print();
}

// =====================
// 텍스트 복사
// =====================
function copyDocumentText() {
  if (!currentDoc) return;

  const textarea = document.getElementById('copy-content');
  if (textarea) {
    copyToClipboard(textarea.value);
  } else {
    // 미리보기에서 텍스트 추출
    const content = buildTextContent(currentDoc);
    copyToClipboard(content);
  }
}

// =====================
// 텍스트 내용 생성 (복사용)
// =====================
function buildTextContent(doc) {
  const settings = Storage.getSettings();
  const orgName = settings.orgName || '○○사회복지관';
  const fields = doc.fields || {};

  let text = '';

  text += `${orgName}\n\n`;

  // 수신
  if (doc.templateId === 'internal') {
    text += `수신  내부결재\n`;
  } else if (doc.templateId === 'sponsor') {
    const honorific = fields['receiver-dept'] || '귀하';
    text += `수신  ${fields.receiver || ''} ${honorific}`;
    if (fields.address) text += `(${fields.address})`;
    text += '\n';
  } else {
    text += `수신  ${fields.receiver || ''}`;
    if (fields['receiver-dept']) {
      text += `(${fields['receiver-dept']})`;
    }
    text += '\n';
  }

  // 경유
  if (doc.templateId !== 'internal') {
    text += `(경유) ${fields.via || ''}\n`;
  }

  // 제목
  text += `제목  ${fields.title || ''}\n\n`;

  // 관련
  if (fields.related) {
    text += `${fields.related}\n\n`;
  }

  // 행사 안내 특수 구조
  if (doc.templateId === 'event') {
    if (fields.body) text += `${fields.body}\n\n`;
    if (fields.datetime) text += `1. 일시: ${fields.datetime}\n`;
    if (fields.location) text += `2. 장소: ${fields.location}\n`;
    if (fields.target) text += `3. 대상: ${fields.target}\n`;
    text += '\n';
  } else {
    if (fields.body) text += `${fields.body}\n\n`;
  }

  // 붙임 + 끝
  if (fields.attachments) {
    text += `붙임  ${fields.attachments}  끝.\n\n`;
  } else {
    text += `끝.\n\n`;
  }

  // 발신명의
  if (doc.templateId !== 'internal') {
    text += `${orgName}장\n\n`;
  }

  // 결재라인
  const approvalLine = settings.approvalLevels
    .map(l => l.title)
    .join('  ');
  text += `${approvalLine}\n`;

  return text;
}

// =====================
// 복사 모달 열기
// =====================
function openCopyModal() {
  if (!currentDoc) return;

  const content = buildTextContent(currentDoc);
  const textarea = document.getElementById('copy-content');
  if (textarea) {
    textarea.value = content;
  }

  Modal.open('copy-modal');
}

// =====================
// 수정하러 가기
// =====================
function goToEdit() {
  if (!currentDoc) return;

  // 완성 문서면 임시저장으로 복사
  if (currentType === 'document') {
    const draftDoc = {
      ...currentDoc,
      type: 'draft',
      updatedAt: new Date().toISOString()
    };
    Storage.saveDraft(draftDoc);
  }

  window.location.href =
    `editor.html?id=${currentDoc.id}&type=draft`;
}

// =====================
// 문서 삭제
// =====================
function deleteCurrentDoc() {
  if (!currentDoc) return;

  if (!confirm('이 문서를 삭제할까요?\n삭제된 문서는 복구할 수 없어요')) {
    return;
  }

  if (currentType === 'draft') {
    Storage.deleteDraft(currentDoc.id);
  } else {
    Storage.deleteDocument(currentDoc.id);
  }

  showToast('문서가 삭제되었어요', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// =====================
// 이벤트 바인딩
// =====================
function bindPreviewEvents() {

  // 수정 버튼
  const editBtn = document.getElementById('edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', goToEdit);
  }

  // 완성저장 버튼
  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', saveAsComplete);
  }

  // 인쇄 버튼
  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', printDocument);
  }

  // 복사 버튼
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', openCopyModal);
  }

  // 복사 모달 복사 버튼
  const copyModalBtn = document.getElementById('copy-modal-btn');
  if (copyModalBtn) {
    copyModalBtn.addEventListener('click', () => {
      const textarea = document.getElementById('copy-content');
      if (textarea) {
        copyToClipboard(textarea.value);
        Modal.close('copy-modal');
      }
    });
  }

  // 삭제 버튼
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteCurrentDoc);
  }

  // 모달 닫기
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      Modal.closeAll();
    });
  });

  // 뒤로가기 버튼
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // 단축키
  document.addEventListener('keydown', (e) => {
    // Ctrl+P : 인쇄
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      printDocument();
    }
    // Ctrl+C : 복사 모달
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      openCopyModal();
    }
  });
}
