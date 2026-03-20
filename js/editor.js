/* js/editor.js */
(function () {
  'use strict';

  /* ── 전역 상태 ── */
  var currentDocId = null;
  var currentTemplate = null;
  var isModified = false;
  var autosaveTimer = null;
  var activeCell = null;
  var selStart = null, selEnd = null;

  /* ── 셀 스타일 상수 ── */
  var CELL_STYLE_TH = [
    'border:1.5px solid #2c3e50',
    'padding:6px 10px',
    'background:#eaf2fb',
    'font-weight:700',
    'text-align:center',
    'vertical-align:middle',
    'word-break:keep-all',
    'color:#1a252f',
    'font-size:0.88rem',
    'line-height:1.5'
  ].join(';');

  var CELL_STYLE_TD = [
    'border:1px solid #aab7c4',
    'padding:6px 10px',
    'background:#fff',
    'vertical-align:middle',
    'word-break:keep-all',
    'color:#2c3e50',
    'font-size:0.88rem',
    'line-height:1.5'
  ].join(';');

  /* ── 셀 생성 헬퍼 (커서 중앙 + auto layout) ── */
  function makeCell(tag, styleStr) {
    var el = document.createElement(tag);
    el.style.cssText = styleStr;
    el.contentEditable = 'true';
    el.innerHTML = '<br>';
    return el;
  }

  /* ══════════════════════════════════════════
     템플릿 필드 정의
  ══════════════════════════════════════════ */
  var TEMPLATE_FIELDS = {
    internal: [
      { id: 'org',      label: '기관명',    type: 'text',     placeholder: '예) 홍길동부서' },
      { id: 'receiver', label: '수신',      type: 'text',     placeholder: '예) 수신자' },
      { id: 'ref',      label: '참조',      type: 'text',     placeholder: '(선택)' },
      { id: 'title',    label: '제목',      type: 'text',     placeholder: '문서 제목' },
      { id: 'body',     label: '내용',      type: 'rich',     placeholder: '본문 내용' },
      { id: 'attach',   label: '붙임',      type: 'textarea', placeholder: '붙임 목록 (줄바꿈으로 구분)' },
      { id: 'dept',     label: '부서명',    type: 'text',     placeholder: '예) 총무팀' },
      { id: 'contact',  label: '연락처',    type: 'text',     placeholder: '예) 02-000-0000' },
      { id: 'date',     label: '시행일자',  type: 'date',     placeholder: '' }
    ],
    government: [
      { id: 'org',      label: '기관명',    type: 'text',     placeholder: '예) ○○시청' },
      { id: 'receiver', label: '수신',      type: 'text',     placeholder: '예) 수신처' },
      { id: 'ref',      label: '참조',      type: 'text',     placeholder: '(선택)' },
      { id: 'docnum',   label: '문서번호',  type: 'text',     placeholder: '예) 총무-1234' },
      { id: 'title',    label: '제목',      type: 'text',     placeholder: '문서 제목' },
      { id: 'body',     label: '내용',      type: 'rich',     placeholder: '본문 내용' },
      { id: 'attach',   label: '붙임',      type: 'textarea', placeholder: '붙임 목록 (줄바꿈으로 구분)' },
      { id: 'dept',     label: '부서명',    type: 'text',     placeholder: '예) 행정지원과' },
      { id: 'contact',  label: '연락처',    type: 'text',     placeholder: '예) 02-000-0000' },
      { id: 'date',     label: '시행일자',  type: 'date',     placeholder: '' }
    ],
    cooperation: [
      { id: 'org',      label: '발신기관',  type: 'text',     placeholder: '예) ○○기관' },
      { id: 'receiver', label: '수신기관',  type: 'text',     placeholder: '예) △△기관' },
      { id: 'title',    label: '제목',      type: 'text',     placeholder: '협조 요청 제목' },
      { id: 'body',     label: '내용',      type: 'rich',     placeholder: '협조 요청 내용' },
      { id: 'attach',   label: '붙임',      type: 'textarea', placeholder: '붙임 목록 (줄바꿈으로 구분)' },
      { id: 'dept',     label: '담당부서',  type: 'text',     placeholder: '예) 기획팀' },
      { id: 'contact',  label: '연락처',    type: 'text',     placeholder: '예) 02-000-0000' },
      { id: 'date',     label: '요청일자',  type: 'date',     placeholder: '' }
    ],
    sponsor: [
      { id: 'org',      label: '주최기관',  type: 'text',     placeholder: '예) ○○협회' },
      { id: 'receiver', label: '수신',      type: 'text',     placeholder: '예) 후원사 담당자' },
      { id: 'title',    label: '제목',      type: 'text',     placeholder: '후원 요청 제목' },
      { id: 'body',     label: '내용',      type: 'rich',     placeholder: '후원 요청 내용' },
      { id: 'attach',   label: '붙임',      type: 'textarea', placeholder: '첨부 서류 목록' },
      { id: 'dept',     label: '담당자',    type: 'text',     placeholder: '예) 홍길동' },
      { id: 'contact',  label: '연락처',    type: 'text',     placeholder: '예) 010-0000-0000' },
      { id: 'date',     label: '제출일자',  type: 'date',     placeholder: '' }
    ],
    event: [
      { id: 'org',      label: '주관기관',  type: 'text',     placeholder: '예) ○○위원회' },
      { id: 'receiver', label: '수신',      type: 'text',     placeholder: '예) 관계자 일동' },
      { id: 'title',    label: '행사명',    type: 'text',     placeholder: '행사 제목' },
      { id: 'body',     label: '내용',      type: 'rich',     placeholder: '행사 안내 내용' },
      { id: 'attach',   label: '붙임',      type: 'textarea', placeholder: '첨부 목록' },
      { id: 'dept',     label: '담당부서',  type: 'text',     placeholder: '예) 행사운영팀' },
      { id: 'contact',  label: '연락처',    type: 'text',     placeholder: '예) 02-000-0000' },
      { id: 'date',     label: '행사일자',  type: 'date',     placeholder: '' }
    ]
  };

  /* ══════════════════════════════════════════
     예시 데이터
  ══════════════════════════════════════════ */
  var EXAMPLES = {
    internal: {
      org: '○○부서',
      receiver: '○○팀장',
      ref: '홍길동 과장',
      title: '2025년 상반기 업무보고',
      body: '1. 관련 근거: 내부규정 제5조\n2. 상반기 업무 추진 현황을 아래와 같이 보고합니다.\n   가. 추진 실적: 목표 대비 95% 달성\n   나. 향후 계획: 하반기 계획 수립 예정',
      attach: '업무보고서 1부.',
      dept: '총무팀',
      contact: '02-000-0000',
      date: new Date().toISOString().slice(0, 10)
    },
    government: {
      org: '○○시청',
      receiver: '△△구청장',
      ref: '행정지원과장',
      docnum: '총무-2025-001',
      title: '행정업무 협조 요청',
      body: '1. 관련 근거: 지방자치법 제00조\n2. 귀 기관의 발전을 기원합니다.\n3. 아래 사항에 대한 협조를 요청합니다.\n   가. 협조 내용: 자료 제출\n   나. 제출 기한: 2025. 7. 31.',
      attach: '협조 요청서 1부.',
      dept: '행정지원과',
      contact: '02-000-0000',
      date: new Date().toISOString().slice(0, 10)
    },
    cooperation: {
      org: '○○기관',
      receiver: '△△기관',
      title: '상호 협력사업 협조 요청',
      body: '1. 귀 기관의 무궁한 발전을 기원합니다.\n2. 상호 발전을 위한 협력사업 추진에 대한 협조를 요청합니다.\n   가. 사업명: 지역 공동 프로그램\n   나. 협조 내용: 인력 및 시설 지원',
      attach: '협력사업 계획서 1부.',
      dept: '기획팀',
      contact: '02-000-0000',
      date: new Date().toISOString().slice(0, 10)
    },
    sponsor: {
      org: '○○협회',
      receiver: '후원사 담당자',
      title: '제1회 ○○ 행사 후원 요청',
      body: '1. 귀사의 발전을 기원합니다.\n2. 저희 협회에서 주관하는 행사에 대한 후원을 요청드립니다.\n   가. 행사명: 제1회 ○○ 행사\n   나. 후원 금액: 000만 원\n   다. 사용 계획: 행사 운영비 일체',
      attach: '후원 요청서 1부, 사업계획서 1부.',
      dept: '홍길동',
      contact: '010-0000-0000',
      date: new Date().toISOString().slice(0, 10)
    },
    event: {
      org: '○○위원회',
      receiver: '관계자 일동',
      title: '2025년 ○○ 행사 안내',
      body: '1. 관련 근거: 위원회 운영규정 제10조\n2. 아래와 같이 행사를 안내드립니다.\n   가. 일시: 2025. 8. 15. 10:00\n   나. 장소: ○○홀\n   다. 주요 내용: 시상식 및 기념공연',
      attach: '행사 일정표 1부.',
      dept: '행사운영팀',
      contact: '02-000-0000',
      date: new Date().toISOString().slice(0, 10)
    }
  };

  /* ══════════════════════════════════════════
     초기화
  ══════════════════════════════════════════ */
  function initEditor() {
    var params = getUrlParams();
    currentDocId = params.id || null;
    var type = params.type || 'internal';

    if (currentDocId) {
      var saved = loadDraft(currentDocId);
      if (saved) {
        currentTemplate = saved.type || type;
        selectTemplate(currentTemplate, false);
        fillFields(saved);
        setSaveStatus('saved');
        return;
      }
    }
    currentDocId = generateId();
    currentTemplate = type;
    selectTemplate(currentTemplate, false);
    prefillOrgDefaults();
    setSaveStatus('new');
  }

  function prefillOrgDefaults() {
    var org = localStorage.getItem('defaultOrg') || '';
    var dept = localStorage.getItem('defaultDept') || '';
    var contact = localStorage.getItem('defaultContact') || '';
    if (org) setFieldValue('org', org);
    if (dept) setFieldValue('dept', dept);
    if (contact) setFieldValue('contact', contact);
  }

  /* ══════════════════════════════════════════
     템플릿 선택
  ══════════════════════════════════════════ */
  function selectTemplate(tpl, resetFields) {
    currentTemplate = tpl;
    if (resetFields === undefined) resetFields = true;

    document.querySelectorAll('.tpl-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tpl === tpl);
    });

    renderFormFields(tpl);
    if (resetFields) {
      clearFields();
      prefillOrgDefaults();
      setSaveStatus('new');
    }
    updatePreview();
  }

  /* ══════════════════════════════════════════
     폼 필드 렌더링
  ══════════════════════════════════════════ */
  function renderFormFields(tpl) {
    var fields = TEMPLATE_FIELDS[tpl] || TEMPLATE_FIELDS.internal;
    var container = document.getElementById('form-fields');
    if (!container) return;

    var html = '';
    fields.forEach(function (f) {
      html += '<div class="field-group" data-field="' + f.id + '">';
      html += '<label class="field-label">' + f.label + '</label>';

      if (f.type === 'rich') {
        html += '<div class="rich-toolbar">'
          + '<button type="button" onclick="applyFormat(\'bold\')" title="굵게"><b>B</b></button>'
          + '<button type="button" onclick="applyFormat(\'italic\')" title="기울임"><i>I</i></button>'
          + '<button type="button" onclick="applyFormat(\'underline\')" title="밑줄"><u>U</u></button>'
          + '<button type="button" onclick="applyAlign(\'left\')" title="왼쪽 정렬">◀</button>'
          + '<button type="button" onclick="applyAlign(\'center\')" title="가운데 정렬">■</button>'
          + '<button type="button" onclick="applyAlign(\'right\')" title="오른쪽 정렬">▶</button>'
          + '<button type="button" onclick="showTablePopup()" title="표 삽입">표</button>'
          + '</div>';
        html += '<div class="rich-editor" id="field-' + f.id + '" contenteditable="true" '
          + 'data-placeholder="' + (f.placeholder || '') + '" '
          + 'oninput="onFieldInput()"></div>';
      } else if (f.type === 'textarea') {
        html += '<textarea class="field-input" id="field-' + f.id + '" '
          + 'placeholder="' + (f.placeholder || '') + '" '
          + 'oninput="onFieldInput()" rows="3"></textarea>';
      } else if (f.type === 'date') {
        html += '<input type="date" class="field-input" id="field-' + f.id + '" '
          + 'oninput="onFieldInput()" />';
      } else {
        html += '<input type="text" class="field-input" id="field-' + f.id + '" '
          + 'placeholder="' + (f.placeholder || '') + '" '
          + 'oninput="onFieldInput()" />';
      }
      html += '</div>';
    });

    container.innerHTML = html;
  }

  /* ══════════════════════════════════════════
     필드 값 Get / Set
  ══════════════════════════════════════════ */
  function setFieldValue(id, value) {
    var el = document.getElementById('field-' + id);
    if (!el) return;
    if (el.contentEditable === 'true') {
      el.innerHTML = value || '';
    } else {
      el.value = value || '';
    }
  }

  function getFieldValue(id) {
    var el = document.getElementById('field-' + id);
    if (!el) return '';
    if (el.contentEditable === 'true') return el.innerHTML || '';
    return el.value || '';
  }

  function fillFields(data) {
    var fields = TEMPLATE_FIELDS[currentTemplate] || [];
    fields.forEach(function (f) {
      if (data[f.id] !== undefined) setFieldValue(f.id, data[f.id]);
    });
  }

  function clearFields() {
    var fields = TEMPLATE_FIELDS[currentTemplate] || [];
    fields.forEach(function (f) { setFieldValue(f.id, ''); });
  }

  function collectFields() {
    var data = { type: currentTemplate };
    var fields = TEMPLATE_FIELDS[currentTemplate] || [];
    fields.forEach(function (f) { data[f.id] = getFieldValue(f.id); });
    return data;
  }

  function getDocTitle() {
    return getFieldValue('title') || '제목 없음';
  }

  /* ══════════════════════════════════════════
     저장 상태 표시
  ══════════════════════════════════════════ */
  function setSaveStatus(status) {
    var el = document.getElementById('save-status');
    if (!el) return;
    var map = { saved: '저장됨', saving: '저장 중…', new: '새 문서', error: '저장 오류' };
    el.textContent = map[status] || '';
  }

  /* ══════════════════════════════════════════
     미리보기 - richToText (이전 상태 복원)
  ══════════════════════════════════════════ */
  function richToText(html) {
    if (!html) return '';
    var div = document.createElement('div');
    div.innerHTML = html;

    /* 표 → ASCII 텍스트 변환 (이전 방식 복원) */
    div.querySelectorAll('table').forEach(function (table) {
      var rows = Array.from(table.querySelectorAll('tr'));
      if (!rows.length) { table.remove(); return; }

      /* 2차원 배열로 셀 텍스트 수집 */
      var grid = rows.map(function (tr) {
        return Array.from(tr.querySelectorAll('th, td')).map(function (cell) {
          return cell.textContent.trim();
        });
      });

      var colCount = grid.reduce(function (m, r) { return Math.max(m, r.length); }, 0);

      /* 컬럼 최대 너비 계산 (한글 2바이트 고려) */
      function dispLen(s) {
        var len = 0;
        for (var i = 0; i < s.length; i++) {
          len += s.charCodeAt(i) > 127 ? 2 : 1;
        }
        return len;
      }
      function padCell(s, w) {
        var d = w - dispLen(s);
        return s + ' '.repeat(Math.max(0, d));
      }

      var colWidths = [];
      for (var c = 0; c < colCount; c++) {
        var w = 4;
        grid.forEach(function (row) {
          if (row[c]) w = Math.max(w, dispLen(row[c]) + 2);
        });
        colWidths.push(w);
      }

      /* 텍스트 표 생성 */
      var lines = [];
      grid.forEach(function (row, ri) {
        var cells = colWidths.map(function (w, ci) {
          return ' ' + padCell(row[ci] || '', w - 1);
        });
        lines.push('|' + cells.join('|') + '|');
        /* 헤더 아래 구분선 */
        if (ri === 0) {
          var sep = colWidths.map(function (w) { return '-'.repeat(w); });
          lines.push('|' + sep.join('|') + '|');
        }
      });

      var pre = document.createElement('pre');
      pre.style.cssText = 'font-family:monospace;font-size:0.85rem;white-space:pre;margin:8px 0;';
      pre.textContent = lines.join('\n');
      table.replaceWith(pre);
    });

    /* <br> → 줄바꿈 */
    div.querySelectorAll('br').forEach(function (br) {
      br.replaceWith('\n');
    });

    /* 블록 요소 → 줄바꿈 */
    div.querySelectorAll('p, div, li').forEach(function (el) {
      el.insertAdjacentText('afterend', '\n');
    });

    return div.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ══════════════════════════════════════════
     금액 변환
  ══════════════════════════════════════════ */
  function convertAmount(text) {
    return text.replace(/\b(\d{4,})\b/g, function (m) {
      return Number(m).toLocaleString('ko-KR');
    });
  }

  /* ══════════════════════════════════════════
     미리보기 업데이트
  ══════════════════════════════════════════ */
  function updatePreview() {
    var el = document.getElementById('preview-output');
    if (!el) return;

    var f = collectFields();
    var bodyText = richToText(f.body);
    bodyText = convertAmount(bodyText);

    var lines = [];

    /* 기관명 */
    if (f.org) lines.push(f.org, '');

    /* 수신 / 참조 */
    if (f.receiver) lines.push('수신 : ' + f.receiver);
    if (f.ref) lines.push('참조 : ' + f.ref);
    if (f.receiver || f.ref) lines.push('');

    /* 문서번호 (government) */
    if (f.docnum) { lines.push('문서번호 : ' + f.docnum); lines.push(''); }

    /* 제목 */
    if (f.title) { lines.push('제  목 : ' + f.title); lines.push(''); }

    /* 본문 */
    if (bodyText) { lines.push(bodyText); lines.push(''); }

    /* 붙임 */
    if (f.attach && f.attach.trim()) {
      lines.push('붙  임 : ' + f.attach.trim().split('\n').join('\n        '));
      lines.push('');
    }

    /* 시행/발신 정보 */
    var meta = [];
    if (f.dept) meta.push(f.dept);
    if (f.contact) meta.push(f.contact);
    if (f.date) meta.push(f.date);
    if (meta.length) lines.push(meta.join('  |  '));

    el.value = lines.join('\n');
  }

  /* ══════════════════════════════════════════
     예시 채우기
  ══════════════════════════════════════════ */
  function fillExample() {
    var ex = EXAMPLES[currentTemplate];
    if (!ex) return;
    fillFields(ex);
    isModified = true;
    updatePreview();
    showToast('예시 내용이 채워졌습니다.');
  }

  /* ══════════════════════════════════════════
     저장 / 미리보기
  ══════════════════════════════════════════ */
  function saveDraft() {
    var data = collectFields();
    data.id = currentDocId;
    data.updatedAt = new Date().toISOString();
    data.title = getDocTitle();

    setSaveStatus('saving');
    try {
      localStorage.setItem('draft_' + currentDocId, JSON.stringify(data));
      var list = safeJSON(localStorage.getItem('doc_drafts')) || [];
      var idx = list.findIndex(function (d) { return d.id === currentDocId; });
      var meta = { id: currentDocId, title: data.title, type: currentTemplate, updatedAt: data.updatedAt };
      if (idx >= 0) list[idx] = meta; else list.unshift(meta);
      localStorage.setItem('doc_drafts', JSON.stringify(list));
      setSaveStatus('saved');
      isModified = false;
      showToast('임시저장 완료');
    } catch (e) {
      setSaveStatus('error');
      showToast('저장 실패: ' + e.message, 'error');
    }
  }

  function goPreview() {
    saveDraft();
    var url = 'preview.html?id=' + currentDocId + '&type=' + currentTemplate;
    window.open(url, '_blank');
  }

  /* ══════════════════════════════════════════
     표 삽입
  ══════════════════════════════════════════ */
  function insertTable() {
    var rows = parseInt(document.getElementById('tbl-rows').value, 10) || 3;
    var cols = parseInt(document.getElementById('tbl-cols').value, 10) || 3;
    closeTablePopup();

    var table = document.createElement('table');
    table.style.cssText = [
      'border-collapse:collapse',
      'width:100%',
      'margin:8px 0',
      'table-layout:auto',
      'font-size:0.88rem'
    ].join(';');

    for (var r = 0; r < rows; r++) {
      var tr = document.createElement('tr');
      for (var c = 0; c < cols; c++) {
        var cell = makeCell(r === 0 ? 'th' : 'td', r === 0 ? CELL_STYLE_TH : CELL_STYLE_TD);
        tr.appendChild(cell);
      }
      table.appendChild(tr);
    }

    var bodyField = document.getElementById('field-body');
    if (!bodyField) return;
    bodyField.focus();
    var sel = window.getSelection();
    if (sel && sel.rangeCount) {
      var range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      range.setStartAfter(table);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      bodyField.appendChild(table);
    }
    isModified = true;
    updatePreview();
  }

  /* ── 행 추가 ── */
  function addRow() {
    var cell = getActiveCell();
    if (!cell) { showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var tr = cell.closest('tr');
    var cells = Array.from(tr.querySelectorAll('td, th'));
    var newTr = document.createElement('tr');
    cells.forEach(function (ref) {
      var td = makeCell('td', CELL_STYLE_TD);
      var w = ref.style.cssText.match(/width:[^;]+/);
      if (w) td.style.width = w[0].replace('width:', '').trim();
      newTr.appendChild(td);
    });
    tr.insertAdjacentElement('afterend', newTr);
    isModified = true; updatePreview();
  }

  /* ── 열 추가 ── */
  function addCol() {
    var cell = getActiveCell();
    if (!cell) { showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var table = cell.closest('table');
    var idx = Array.from(cell.parentNode.children).indexOf(cell);
    table.querySelectorAll('tr').forEach(function (tr, i) {
      var ref = tr.children[idx];
      var newCell = makeCell(i === 0 ? 'th' : 'td', i === 0 ? CELL_STYLE_TH : CELL_STYLE_TD);
      if (ref) ref.insertAdjacentElement('afterend', newCell);
      else tr.appendChild(newCell);
    });
    isModified = true; updatePreview();
  }

  /* ── 행 삭제 ── */
  function deleteRow() {
    var cell = getActiveCell();
    if (!cell) { showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var tr = cell.closest('tr');
    var table = tr.closest('table');
    if (table.rows.length <= 1) { showToast('마지막 행은 삭제할 수 없습니다.', 'warning'); return; }
    tr.remove();
    isModified = true; updatePreview();
  }

  /* ── 열 삭제 ── */
  function deleteCol() {
    var cell = getActiveCell();
    if (!cell) { showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var idx = Array.from(cell.parentNode.children).indexOf(cell);
    var table = cell.closest('table');
    var cols = table.rows[0] ? table.rows[0].cells.length : 0;
    if (cols <= 1) { showToast('마지막 열은 삭제할 수 없습니다.', 'warning'); return; }
    Array.from(table.rows).forEach(function (tr) {
      if (tr.cells[idx]) tr.deleteCell(idx);
    });
    isModified = true; updatePreview();
  }

  /* ── 셀 병합 ── */
  function mergeCells() {
    if (!selStart || !selEnd) { showToast('병합할 셀 범위를 드래그하세요.', 'warning'); return; }
    var r1 = Math.min(selStart.row, selEnd.row), r2 = Math.max(selStart.row, selEnd.row);
    var c1 = Math.min(selStart.col, selEnd.col), c2 = Math.max(selStart.col, selEnd.col);
    var table = selStart.cell.closest('table');
    var rows = Array.from(table.rows);
    var text = [];
    for (var r = r1; r <= r2; r++) {
      for (var c = c1; c <= c2; c++) {
        if (rows[r] && rows[r].cells[c]) {
          text.push(rows[r].cells[c].textContent.trim());
          if (r !== r1 || c !== c1) rows[r].cells[c].remove();
        }
      }
    }
    var anchor = rows[r1].cells[c1];
    anchor.rowSpan = r2 - r1 + 1;
    anchor.colSpan = c2 - c1 + 1;
    anchor.textContent = text.filter(Boolean).join(' ');
    selStart = selEnd = null;
    isModified = true; updatePreview();
  }

  /* ── 셀 분리 ── */
  function unmergeCells() {
    var cell = getActiveCell();
    if (!cell) { showToast('분리할 셀을 클릭하세요.', 'warning'); return; }
    var rs = cell.rowSpan || 1, cs = cell.colSpan || 1;
    if (rs === 1 && cs === 1) { showToast('병합된 셀이 아닙니다.', 'warning'); return; }
    var table = cell.closest('table');
    var rows = Array.from(table.rows);
    var startRow = cell.closest('tr').rowIndex;
    var startCol = Array.from(cell.parentNode.children).indexOf(cell);
    cell.rowSpan = cell.colSpan = 1;
    for (var r = 0; r < rs; r++) {
      for (var c = 0; c < cs; c++) {
        if (r === 0 && c === 0) continue;
        var newCell = makeCell('td', CELL_STYLE_TD);
        var targetRow = rows[startRow + r];
        if (targetRow) {
          var refCell = targetRow.cells[startCol + c - (r === 0 ? 1 : 0)];
          if (refCell) refCell.insertAdjacentElement('afterend', newCell);
          else targetRow.appendChild(newCell);
        }
      }
    }
    isModified = true; updatePreview();
  }

  /* ── 활성 셀 감지 ── */
  function getActiveCell() {
    return activeCell;
  }

  /* ── 셀 선택 초기화 ── */
  function initCellSelection() {
    document.addEventListener('mousedown', function (e) {
      var cell = e.target.closest('td, th');
      if (cell) {
        activeCell = cell;
        var table = cell.closest('table');
        var rows = Array.from(table.rows);
        var ri = cell.closest('tr').rowIndex;
        var ci = Array.from(cell.parentNode.children).indexOf(cell);
        selStart = { cell: cell, row: ri, col: ci };
        selEnd = selStart;
      }
    });
    document.addEventListener('mouseover', function (e) {
      if (!selStart) return;
      var cell = e.target.closest('td, th');
      if (cell && cell.closest('table') === selStart.cell.closest('table')) {
        var ri = cell.closest('tr').rowIndex;
        var ci = Array.from(cell.parentNode.children).indexOf(cell);
        selEnd = { cell: cell, row: ri, col: ci };
      }
    });
    document.addEventListener('mouseup', function () {
      /* 선택 유지 */
    });
  }

  /* ══════════════════════════════════════════
     Tab 키 → 다음 셀 이동
  ══════════════════════════════════════════ */
  function moveToNextCell(e) {
    if (e.key !== 'Tab') return;
    var cell = e.target.closest('td, th');
    if (!cell) return;
    e.preventDefault();
    var cells = Array.from(cell.closest('table').querySelectorAll('td, th'));
    var idx = cells.indexOf(cell);
    var next = cells[idx + (e.shiftKey ? -1 : 1)];
    if (next) { next.focus(); activeCell = next; }
  }

  /* ══════════════════════════════════════════
     정렬 적용
  ══════════════════════════════════════════ */
  function applyAlign(dir) {
    document.execCommand('justify' + dir.charAt(0).toUpperCase() + dir.slice(1));
  }

  /* ══════════════════════════════════════════
     필드 입력 이벤트
  ══════════════════════════════════════════ */
  function onFieldInput() {
    isModified = true;
    updatePreview();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraft, 5000);
  }

  /* ══════════════════════════════════════════
     이벤트 바인딩
  ══════════════════════════════════════════ */
  function bindEvents() {
    /* 템플릿 버튼 */
    document.querySelectorAll('.tpl-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectTemplate(btn.dataset.tpl, true);
      });
    });

    /* 저장 버튼 */
    var btnSave = document.getElementById('btn-save');
    if (btnSave) btnSave.addEventListener('click', saveDraft);

    /* 미리보기 버튼 */
    var btnPreview = document.getElementById('btn-preview');
    if (btnPreview) btnPreview.addEventListener('click', goPreview);

    /* 예시 채우기 */
    var btnExample = document.getElementById('btn-example');
    if (btnExample) btnExample.addEventListener('click', fillExample);

    /* 표 삽입 팝업 */
    var btnTable = document.getElementById('btn-insert-table');
    if (btnTable) btnTable.addEventListener('click', insertTable);

    /* 표 조작 버튼 */
    var tableActions = {
      'btn-add-row': addRow,
      'btn-add-col': addCol,
      'btn-del-row': deleteRow,
      'btn-del-col': deleteCol,
      'btn-merge': mergeCells,
      'btn-unmerge': unmergeCells
    };
    Object.keys(tableActions).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', tableActions[id]);
    });

    /* Tab 키 → 셀 이동 */
    document.addEventListener('keydown', moveToNextCell);

    /* Ctrl+S 저장 */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
    });

    /* Ctrl+Shift+R 강력 새로고침 */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        location.reload(true);
      }
    });
  }

  /* ══════════════════════════════════════════
     유틸리티
  ══════════════════════════════════════════ */
  function safeJSON(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
  }

  function loadDraft(id) {
    return safeJSON(localStorage.getItem('draft_' + id));
  }

  /* ══════════════════════════════════════════
     테이블 팝업 제어
  ══════════════════════════════════════════ */
  function showTablePopup() {
    var popup = document.getElementById('table-popup');
    if (popup) popup.style.display = 'flex';
  }

  function closeTablePopup() {
    var popup = document.getElementById('table-popup');
    if (popup) popup.style.display = 'none';
  }

  /* ══════════════════════════════════════════
     전역 노출 (HTML에서 직접 호출하는 함수들)
  ══════════════════════════════════════════ */
  window.selectTemplate = selectTemplate;
  window.onFieldInput = onFieldInput;
  window.applyFormat = function (cmd) { document.execCommand(cmd); };
  window.applyAlign = applyAlign;
  window.showTablePopup = showTablePopup;
  window.closeTablePopup = closeTablePopup;
  window.insertTable = insertTable;
  window.addRow = addRow;
  window.addCol = addCol;
  window.deleteRow = deleteRow;
  window.deleteCol = deleteCol;
  window.mergeCells = mergeCells;
  window.unmergeCells = unmergeCells;
  window.fillExample = fillExample;
  window.saveDraft = saveDraft;
  window.goPreview = goPreview;

  /* ══════════════════════════════════════════
     DOMContentLoaded
  ══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initEditor();
    bindEvents();
    initCellSelection();
  });

})();
