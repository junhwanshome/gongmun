// js/preview.js
// 미리보기 페이지 기능 (전면 수정)

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
      <span class="badge badge-warning">
        📝 임시저장
      </span>
    `;
  } else {
    statusEl.innerHTML = `
      <span class="badge badge-success">
        ✅ 완성 문서
      </span>
    `;
  }
}

// =====================
// 미리보기 렌더링 (전면 수정)
// =====================
function renderPreview(doc) {
  const container = document.getElementById('doc-preview');
  if (!container) return;

  const settings = Storage.getSettings();
  const detail = ExtendedStorage.getOrgDetail();
  const orgName = settings.orgName || '○○기관';
  const fields = doc.fields || {};
  const logo = LogoManager.get();

  // 제목 업데이트
  const titleEl = document.getElementById('preview-title');
  if (titleEl) {
    titleEl.textContent = fields.title || '문서 미리보기';
  }

  let html = '';

  // =====================
  // 두문 영역
  // =====================
  html += `<div class="doc-header-area">`;

  // 로고 + 기관명 영역
  html += `<div class="doc-logo-area">`;

  if (logo) {
    // 로고 있는 경우
    html += `
      <div class="doc-logo-wrap">
        <img
          src="${logo}"
          alt="${escapeHtml(orgName)}"
          class="doc-logo-img"
        />
      </div>
    `;
  } else {
    // 로고 없는 경우 기관명만
    html += `
      <div class="doc-org-name-only">
        ${escapeHtml(orgName)}
      </div>
    `;
  }

  html += `</div>`;

  // 구분선
  html += `<hr class="doc-header-line">`;

  // 수신
  html += `<div class="doc-field-row">`;
  html += `
    <span class="doc-field-label">수신</span>
    <span class="doc-field-value">
  `;

  if (doc.templateId === 'internal') {
    html += `내부결재`;
  } else if (doc.templateId === 'sponsor') {
    const honorific = fields['receiver-dept'] || '귀하';
    html += `${escapeHtml(fields.receiver || '')}
      ${honorific}`;
    if (fields.address) {
      html += `(${escapeHtml(fields.address)})`;
    }
  } else {
    html += escapeHtml(fields.receiver || '');
    if (fields['receiver-dept']) {
      html += `(${escapeHtml(fields['receiver-dept'])})`;
    }
  }

  html += `</span></div>`;

  // 경유
  if (doc.templateId !== 'internal') {
    html += `
      <div class="doc-field-row">
        <span class="doc-field-label">(경유)</span>
        <span class="doc-field-value">
          ${fields.via ? escapeHtml(fields.via) : ''}
        </span>
      </div>
    `;
  }

  // 제목
  html += `
    <div class="doc-field-row doc-title-row">
      <span class="doc-field-label">제목</span>
      <span class="doc-field-value doc-title-value">
        ${escapeHtml(fields.title || '')}
      </span>
    </div>
  `;

  html += `</div>`;

  // =====================
  // 본문 영역
  // =====================
  html += `<div class="doc-body-area">`;

  // 관련 근거
  if (fields.related) {
    html += `
      <div class="doc-body-text">
        ${escapeHtml(fields.related)
          .replace(/\n/g, '<br>')}
      </div>
    `;
  }

  // 행사 안내 특수 구조
  if (doc.templateId === 'event') {
    if (fields.body) {
      html += `
        <div class="doc-body-text">
          ${escapeHtml(fields.body)
            .replace(/\n/g, '<br>')}
        </div>
      `;
    }
    html += `<div class="doc-body-text">`;
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
        <div class="doc-body-text">
          ${escapeHtml(fields.body)
            .replace(/\n/g, '<br>')}
        </div>
      `;
    }
  }

  // 붙임 + 끝 표시
  if (fields.attachments) {
    html += `
      <div class="doc-attachments">
        붙임&nbsp;&nbsp;${
          escapeHtml(fields.attachments)
            .replace(/\n/g, '<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
        }&nbsp;&nbsp;끝.
      </div>
    `;
  } else {
    html += `<div class="doc-end">끝.</div>`;
  }

  html += `</div>`;

  // =====================
  // 결문 영역
  // =====================
  html += `<div class="doc-footer-area">`;

  // 발신명의 (내부결재 제외)
  if (doc.templateId !== 'internal') {
    html += `
      <div class="doc-sender">
        ${escapeHtml(orgName)}장
      </div>
    `;
  }

  // 결재란
  html += renderApprovalSection(settings);

  // 시행/접수 정보
  html += renderDocInfo(doc, fields, orgName, detail);

  html += `</div>`;

  container.innerHTML = html;
}

// =====================
// 결재란 렌더링 (전면 수정)
// =====================
function renderApprovalSection(settings) {
  const levels = settings.approvalLevels || [];
  const cooperators = settings.cooperators || [];

  if (levels.length === 0) return '';

  let html = `<div class="doc-approval-wrap">`;

  // 결재라인 테이블
  html += `
    <table class="doc-approval-table">
      <tr>
  `;

  // 직위 행 (첫번째는 ★ 발의자)
  levels.forEach((l, idx) => {
    const title = idx === 0
      ? `★ ${escapeHtml(l.title || '담당')}`
      : escapeHtml(l.title || '');
    html += `<th>${title}</th>`;
  });

  html += `</tr><tr>`;

  // 서명 행
  levels.forEach(l => {
    html += `
      <td class="doc-approval-sign">
        ${escapeHtml(l.name || '')}
      </td>
    `;
  });

  html += `</tr></table>`;

  // 협조자 테이블
  if (cooperators.length > 0) {
    html += `
      <div class="doc-cooperator-wrap">
        <table class="doc-approval-table">
          <tr>
            <td class="doc-cooperator-label"
              rowspan="2">
              협조자
            </td>
    `;

    cooperators.forEach(c => {
      html += `
        <th>${escapeHtml(c.title || '')}</th>
      `;
    });

    html += `</tr><tr>`;

    cooperators.forEach(c => {
      html += `
        <td class="doc-approval-sign">
          ${escapeHtml(c.name || '')}
        </td>
      `;
    });

    html += `</tr></table></div>`;
  }

  html += `</div>`;

  return html;
}

// =====================
// 문서 하단 정보 렌더링
// =====================
function renderDocInfo(doc, fields, orgName, detail) {
  const today = getTodayString();

  // 시행번호
  const docNumber = fields.docNumber || '';
  const receiptNumber = fields.receiptNumber || '';

  let html = `
    <div class="doc-info-area">
      <hr class="doc-info-line">
      <div class="doc-info-row">
        <span class="doc-info-item">
          시행&nbsp;
          ${escapeHtml(docNumber || `${orgName}-`)}
          &nbsp;(${today})
        </span>
        <span class="doc-info-item">
          접수&nbsp;
          ${receiptNumber
            ? escapeHtml(receiptNumber)
            : '(&nbsp;&nbsp;&nbsp;&nbsp;)'}
        </span>
      </div>
      <div class="doc-info-address">
        우 ${escapeHtml(detail.zipCode || '○○○○○')}
        &nbsp;
        ${escapeHtml(detail.address || '주소를 입력해주세요')}
        &nbsp;/&nbsp;
        ${detail.homepage
          ? escapeHtml(detail.homepage)
          : 'www.example.com'}
      </div>
      <div class="doc-info-contact">
        전화 ${escapeHtml(detail.tel || '( )')}
        &nbsp;
        전송 ${escapeHtml(detail.fax || '( )')}
        &nbsp;/&nbsp;
        ${escapeHtml(detail.email || 'email@example.com')}
        &nbsp;/&nbsp;
        <span class="doc-info-disclosure">
          ${escapeHtml(detail.disclosure || '공개')}
        </span>
      </div>
    </div>
  `;

  return html;
}

// =====================
// 완성 문서로 저장
// =====================
function saveAsComplete() {
  if (!currentDoc) return;

  const completeDoc = {
    ...currentDoc,
    type: 'document',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  Storage.saveDocument(completeDoc);

  if (currentType === 'draft') {
    Storage.deleteDraft(currentDoc.id);
  }

  currentType = 'document';
  currentDoc = completeDoc;

  updateDocStatus('document');
  showToast('완성 문서로 저장되었어요!', 'success');

  const newUrl =
    `preview.html?id=${currentDoc.id}&type=document`;
  window.history.replaceState(null, '', newUrl);
}

// =====================
// 인쇄
// =====================
function printDocument() {
  window.print();
}

// =====================
// 텍스트 내용 생성 (복사용)
// =====================
function buildTextContent(doc) {
  const settings = Storage.getSettings();
  const detail = ExtendedStorage.getOrgDetail();
  const orgName = settings.orgName || '○○기관';
  const fields = doc.fields || {};
  const today = getTodayString();

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

  // 행사 안내
  if (doc.templateId === 'event') {
    if (fields.body) text += `${fields.body}\n\n`;
    if (fields.datetime) {
      text += `1. 일시: ${fields.datetime}\n`;
    }
    if (fields.location) {
      text += `2. 장소: ${fields.location}\n`;
    }
    if (fields.target) {
      text += `3. 대상: ${fields.target}\n`;
    }
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
    text += `\n${orgName}장\n\n`;
  }

  // 결재라인
  const approvalLine = settings.approvalLevels
    .map((l, idx) => {
      const title = l.title || '';
      return idx === 0 ? `★${title}` : title;
    })
    .join('  ');
  text += `${approvalLine}\n\n`;

  // 협조자
  if (settings.cooperators &&
      settings.cooperators.length > 0) {
    const coopLine = settings.cooperators
      .map(c => c.title || '')
      .join('  ');
    text += `협조자  ${coopLine}\n\n`;
  }

  // 시행/접수
  const docNumber = fields.docNumber || `${orgName}-`;
  text += `시행  ${docNumber} (${today})`;
  text += `  접수 (\n\n`;

  // 주소
  text += `우 ${detail.zipCode || ''} `;
  text += `${detail.address || ''} / `;
  text += `${detail.homepage || ''}\n`;
  text += `전화 ${detail.tel || ''} `;
  text += `전송 ${detail.fax || ''} / `;
  text += `${detail.email || ''} / `;
  text += `${detail.disclosure || '공개'}\n`;

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
  const completeBtn = document.getElementById(
    'complete-btn'
  );
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      Modal.open('complete-confirm-modal');
    });
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
  const copyModalBtn = document.getElementById(
    'copy-modal-btn'
  );
  if (copyModalBtn) {
    copyModalBtn.addEventListener('click', () => {
      const textarea = document.getElementById(
        'copy-content'
      );
      if (textarea) {
        copyToClipboard(textarea.value);
        Modal.close('copy-modal');
      }
    });
  }

  // 삭제 버튼
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      Modal.open('delete-confirm-modal');
    });
  }

  // 완성 저장 확인
  const confirmCompleteBtn = document.getElementById(
    'confirm-complete-btn'
  );
  if (confirmCompleteBtn) {
    confirmCompleteBtn.addEventListener('click', () => {
      Modal.close('complete-confirm-modal');
      saveAsComplete();
    });
  }

  // 삭제 확인
  const confirmDeleteBtn = document.getElementById(
    'confirm-delete-btn'
  );
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      Modal.close('delete-confirm-modal');
      deleteCurrentDoc();
    });
  }

  // 모달 닫기
  document.querySelectorAll('.modal-close')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        Modal.closeAll();
      });
    });

  // 뒤로가기
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // 하단 버튼들
  const editBtnBottom = document.getElementById(
    'edit-btn-bottom'
  );
  if (editBtnBottom) {
    editBtnBottom.addEventListener('click', goToEdit);
  }

  const copyBtnBottom = document.getElementById(
    'copy-btn-bottom'
  );
  if (copyBtnBottom) {
    copyBtnBottom.addEventListener(
      'click', openCopyModal
    );
  }

  const printBtnBottom = document.getElementById(
    'print-btn-bottom'
  );
  if (printBtnBottom) {
    printBtnBottom.addEventListener(
      'click', printDocument
    );
  }

  const completeBtnBottom = document.getElementById(
    'complete-btn-bottom'
  );
  if (completeBtnBottom) {
    completeBtnBottom.addEventListener('click', () => {
      Modal.open('complete-confirm-modal');
    });
  }

  // 단축키
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      printDocument();
    }
  });
}
