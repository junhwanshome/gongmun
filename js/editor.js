/**
 * js/editor.js
 * 공문서 에디터 - contenteditable 표 편집 지원
 */
(function () {
  'use strict';

  var currentDocId      = null;
  var currentTemplateId = 'internal';
  var isModified        = false;
  var editorAutoSave    = null;
  var realtimeTimer     = null;
  var selectedCells     = [];   /* 병합용 선택 셀 목록 */
  var activeBodyEditor  = null; /* 현재 포커스된 body-editor */

  /* ══════════════════════════════════════════════
     템플릿 정의
  ══════════════════════════════════════════════ */
  var TEMPLATE_FIELDS = {
    internal: {
      label: '내부결재',
      fields: [
        { id:'title',       label:'제목',     type:'text',     placeholder:'문서 제목을 입력하세요', required:true },
        { id:'date',        label:'날짜',     type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'receiver',    label:'수신',     type:'text',     placeholder:'예) 관장' },
        { id:'purpose',     label:'목적',     type:'textarea', placeholder:'문서 작성 목적을 입력하세요', rows:4 },
        { id:'body',        label:'내용',     type:'rich',     placeholder:'주요 내용을 입력하세요' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)', rows:4 },
        { id:'senderName',  label:'발신명의', type:'text',     placeholder:'예) 임마누엘집' }
      ]
    },
    government: {
      label: '지자체보고',
      fields: [
        { id:'title',       label:'제목',     type:'text',     placeholder:'문서 제목을 입력하세요', required:true },
        { id:'date',        label:'날짜',     type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'receiver',    label:'수신',     type:'text',     placeholder:'예) ○○시장' },
        { id:'reference',   label:'참조',     type:'text',     placeholder:'예) ○○과장' },
        { id:'docNo',       label:'문서번호', type:'text',     placeholder:'예) 복지-1234' },
        { id:'purpose',     label:'목적',     type:'textarea', placeholder:'보고 목적을 입력하세요', rows:4 },
        { id:'body',        label:'내용',     type:'rich',     placeholder:'보고 내용을 입력하세요' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)', rows:4 },
        { id:'senderName',  label:'발신명의', type:'text',     placeholder:'예) 임마누엘집' }
      ]
    },
    cooperation: {
      label: '타기관협조',
      fields: [
        { id:'title',       label:'제목',     type:'text',     placeholder:'문서 제목을 입력하세요', required:true },
        { id:'date',        label:'날짜',     type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'receiver',    label:'수신',     type:'text',     placeholder:'예) ○○기관장' },
        { id:'reference',   label:'참조',     type:'text',     placeholder:'예) ○○담당자' },
        { id:'docNo',       label:'문서번호', type:'text',     placeholder:'예) 복지-1234' },
        { id:'purpose',     label:'협조 요청 목적', type:'textarea', placeholder:'협조 요청 목적을 입력하세요', rows:4 },
        { id:'body',        label:'협조 내용',      type:'rich',     placeholder:'협조 요청 내용을 입력하세요' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)', rows:4 },
        { id:'senderName',  label:'발신명의', type:'text',     placeholder:'예) 임마누엘집' }
      ]
    },
    sponsor: {
      label: '후원자감사',
      fields: [
        { id:'title',       label:'제목',       type:'text',     placeholder:'예) 후원금 감사 인사', required:true },
        { id:'date',        label:'날짜',       type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'sponsorName', label:'후원자 성명', type:'text',     placeholder:'후원자 이름' },
        { id:'grantDate',   label:'후원일자',   type:'text',     placeholder:'예) 2024. 3. 1.' },
        { id:'grantAmount', label:'후원금액',   type:'text',     placeholder:'예) 금500,000원(금오십만원정)' },
        { id:'body',        label:'감사 내용',  type:'rich',     placeholder:'감사 내용을 입력하세요' },
        { id:'senderName',  label:'발신명의',   type:'text',     placeholder:'예) 임마누엘집' }
      ]
    },
    event: {
      label: '행사안내',
      fields: [
        { id:'title',       label:'행사명',   type:'text',     placeholder:'행사명을 입력하세요', required:true },
        { id:'date',        label:'날짜',     type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'receiver',    label:'수신',     type:'text',     placeholder:'예) 관계자 귀중' },
        { id:'eventDate',   label:'행사일시', type:'text',     placeholder:'예) 2024. 4. 5. 14:00' },
        { id:'eventPlace',  label:'행사장소', type:'text',     placeholder:'행사 장소를 입력하세요' },
        { id:'eventTarget', label:'대상',     type:'text',     placeholder:'행사 대상을 입력하세요' },
        { id:'body',        label:'행사내용', type:'rich',     placeholder:'행사 내용을 입력하세요' },
        { id:'purpose',     label:'기타사항', type:'textarea', placeholder:'기타 안내 사항', rows:4 },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)', rows:4 },
        { id:'senderName',  label:'발신명의', type:'text',     placeholder:'예) 임마누엘집' }
      ]
    }
  };

  /* ══════════════════════════════════════════════
     예시 데이터
  ══════════════════════════════════════════════ */
  var EXAMPLES = {
    internal: {
      title:'2024년 사회복지시설 운영현황 보고', date:'2024. 3. 20.', receiver:'관장',
      purpose:'2024년도 1분기 운영현황을 보고하고자 합니다.',
      body:'1. 이용자 현황: 총 45명\n2. 프로그램 운영: 12개 프로그램\n3. 예산 집행률: 23.5%',
      attachments:'2024년 1분기 운영현황 보고서', senderName:'복지팀장'
    },
    government: {
      title:'2024년 사회복지시설 운영현황 보고', date:'2024. 3. 20.',
      receiver:'○○시장', reference:'사회복지과장', docNo:'복지-2024-0001',
      purpose:'「사회복지사업법」 제6조에 따라 2024년도 1분기 운영현황을 보고합니다.',
      body:'1. 시설 현황\n가. 시설명: 임마누엘집\n나. 정원: 50명\n2. 이용자 현황: 45명',
      attachments:'운영현황 보고서 1부', senderName:'임마누엘집'
    },
    cooperation: {
      title:'자원봉사자 파견 협조 요청', date:'2024. 3. 20.',
      receiver:'○○대학교 사회복지학과장', reference:'봉사활동 담당교수', docNo:'복지-2024-0002',
      purpose:'당 시설 이용자 여가활동 지원을 위한 자원봉사자 파견을 요청합니다.',
      body:'1. 봉사 일시: 2024. 4. 1.(월) ~ 4. 30.(화)\n2. 봉사 내용: 여가활동 보조\n3. 필요 인원: 5명',
      attachments:'봉사활동 계획서 1부', senderName:'임마누엘집'
    },
    sponsor: {
      title:'후원금 접수 감사 인사', date:'2024. 3. 20.',
      sponsorName:'홍길동', grantDate:'2024. 3. 15.', grantAmount:'금500,000원(금오십만원정)',
      body:'귀하의 따뜻한 마음과 정성 어린 후원에 깊이 감사드립니다.',
      senderName:'임마누엘집'
    },
    event: {
      title:'2024년 봄 나들이 행사 안내', date:'2024. 3. 20.',
      receiver:'관계자 귀중', eventDate:'2024. 4. 5.(금) 10:00 ~ 17:00',
      eventPlace:'○○공원', eventTarget:'시설 이용자 및 가족',
      body:'봄을 맞이하여 이용자와 가족이 함께하는 나들이 행사를 개최합니다.',
      purpose:'참가 신청: 3. 29.(금)까지 전화 또는 방문 접수',
      attachments:'행사 세부 일정표 1부', senderName:'임마누엘집'
    }
  };

  /* ══════════════════════════════════════════════
     초기화
  ══════════════════════════════════════════════ */
  function initEditor() {
    var params  = getUrlParams();
    var tmplId  = params.template || 'internal';
    var docId   = params.id;
    var docType = params.type || 'draft';

    if (docId) {
      var existing = (docType === 'doc') ? Storage.getDoc(docId) : Storage.getDraft(docId);
      if (existing) {
        currentDocId      = existing.id;
        currentTemplateId = existing.templateId || tmplId;
        selectTemplate(currentTemplateId);
        fillFields(existing.fields || {});
        setSaveStatus('불러옴');
        return;
      }
    }

    currentDocId = generateId('draft');
    selectTemplate(tmplId);
    prefillOrgDefaults();
  }

  /* ══════════════════════════════════════════════
     기관 기본값
  ══════════════════════════════════════════════ */
  function prefillOrgDefaults() {
    var settings = Storage.getSettings();
    setFieldValue('senderName', settings.orgName || '');
    setFieldValue('date', getTodayString());
  }

  /* ══════════════════════════════════════════════
     템플릿 선택
  ══════════════════════════════════════════════ */
  function selectTemplate(tmplId) {
    if (!TEMPLATE_FIELDS[tmplId]) tmplId = 'internal';
    currentTemplateId = tmplId;

    document.querySelectorAll('.tpl-btn').forEach(function (btn) {
      btn.classList.remove('active');
      if (btn.dataset.template === tmplId) btn.classList.add('active');
    });

    var guide = document.getElementById('guide-panel');
    if (guide) {
      guide.innerHTML = '<strong>' + TEMPLATE_FIELDS[tmplId].label + '</strong> 작성 가이드: '
        + '제목은 간결하게, 본문은 육하원칙에 따라 작성하세요.';
    }

    renderFormFields(tmplId);
    prefillOrgDefaults();
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     폼 필드 렌더링
     ★ type:'rich' → contenteditable div
     ★ type:'textarea' → textarea
     ★ type:'text' → input
  ══════════════════════════════════════════════ */
  function renderFormFields(tmplId) {
    var container = document.getElementById('form-fields');
    if (!container) return;

    var tpl = TEMPLATE_FIELDS[tmplId];
    if (!tpl) return;

    var html = '';
    tpl.fields.forEach(function (f) {
      html += '<div class="form-group">';
      html += '<label class="form-label" for="field-' + f.id + '">'
            + f.label
            + (f.required ? ' <span style="color:#e74c3c;">*</span>' : '')
            + '</label>';

      if (f.type === 'rich') {
        /* ── contenteditable 영역 ── */
        html += '<div class="body-editor-wrap">'
              + '<div'
              + ' id="field-' + f.id + '"'
              + ' class="body-editor"'
              + ' contenteditable="true"'
              + ' data-field="' + f.id + '"'
              + ' data-placeholder="' + (f.placeholder || '') + '"'
              + '></div>'
              + '</div>';
      } else if (f.type === 'textarea') {
        var rows = f.rows || 3;
        html += '<textarea id="field-' + f.id + '" name="' + f.id + '" '
              + 'class="form-control form-textarea" rows="' + rows + '" '
              + 'placeholder="' + (f.placeholder || '') + '"></textarea>';
      } else {
        html += '<input id="field-' + f.id + '" name="' + f.id + '" type="text" '
              + 'class="form-control" '
              + 'placeholder="' + (f.placeholder || '') + '">';
      }

      html += '</div>';
    });

    container.innerHTML = html;
    bindFieldEvents();
  }

  /* ══════════════════════════════════════════════
     필드 이벤트 바인딩
  ══════════════════════════════════════════════ */
  function bindFieldEvents() {
    var container = document.getElementById('form-fields');
    if (!container) return;

    /* textarea / input */
    container.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        isModified = true;
        setSaveStatus('미저장');
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(updatePreview, 400);
      });
    });

    /* contenteditable */
    container.querySelectorAll('.body-editor').forEach(function (el) {
      el.addEventListener('focus', function () {
        activeBodyEditor = el;
        var toolbar = document.getElementById('format-toolbar');
        if (toolbar) toolbar.classList.add('visible');
      });
      el.addEventListener('blur', function (e) {
        /* 툴바 버튼 클릭 시에는 blur 무시 */
        var toolbar = document.getElementById('format-toolbar');
        if (toolbar && toolbar.contains(e.relatedTarget)) return;
        setTimeout(function () {
          var focused = document.activeElement;
          if (toolbar && !toolbar.contains(focused)) {
            toolbar.classList.remove('visible');
          }
        }, 150);
      });
      el.addEventListener('input', function () {
        isModified = true;
        setSaveStatus('미저장');
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(updatePreview, 400);
      });
      el.addEventListener('keydown', function (e) {
        /* Tab → 표 셀 이동 또는 들여쓰기 */
        if (e.key === 'Tab') {
          e.preventDefault();
          var cell = getParentCell(e.target);
          if (cell) {
            moveToNextCell(cell, e.shiftKey);
          } else {
            document.execCommand('insertText', false, '\u00a0\u00a0');
          }
        }
      });
      /* 셀 클릭 시 선택 표시 */
      el.addEventListener('click', function (e) {
        var cell = getParentCell(e.target);
        if (cell) {
          handleCellClick(cell, e);
        } else {
          clearCellSelection();
        }
      });
    });
  }

  /* ══════════════════════════════════════════════
     필드 값 읽기/쓰기
  ══════════════════════════════════════════════ */
  function setFieldValue(id, value) {
    var el = document.getElementById('field-' + id);
    if (!el) return;
    if (el.classList.contains('body-editor')) {
      /* rich 필드: 줄바꿈 → <br>, HTML 그대로 저장된 경우 그대로 삽입 */
      if (value && (value.indexOf('<') !== -1)) {
        el.innerHTML = value;
      } else {
        el.innerHTML = value
          ? value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                 .replace(/\n/g, '<br>')
          : '';
      }
    } else {
      el.value = value || '';
    }
  }

  function getFieldValue(id) {
    var el = document.getElementById('field-' + id);
    if (!el) return '';
    if (el.classList.contains('body-editor')) {
      return el.innerHTML.trim();
    }
    return el.value.trim();
  }

  /* ══════════════════════════════════════════════
     모든 필드 수집
  ══════════════════════════════════════════════ */
  function collectFields() {
    var tpl    = TEMPLATE_FIELDS[currentTemplateId];
    var fields = {};
    if (!tpl) return fields;
    tpl.fields.forEach(function (f) {
      var val = getFieldValue(f.id);
      if (val) fields[f.id] = val;
    });
    return fields;
  }

  function fillFields(fields) {
    Object.keys(fields).forEach(function (key) {
      setFieldValue(key, fields[key]);
    });
    updatePreview();
  }

  function getDocTitle() {
    var title = getFieldValue('title');
    if (!title) title = getFieldValue('sponsorName') ? '후원자 감사 서한' : '';
    if (!title) title = TEMPLATE_FIELDS[currentTemplateId].label + ' 문서';
    return title;
  }

  function setSaveStatus(msg) {
    var el = document.getElementById('save-status');
    if (el) el.textContent = msg;
  }

  /* ══════════════════════════════════════════════
     에디터 textarea 미리보기 업데이트
     ★ rich 필드는 innerText 로 텍스트 추출
  ══════════════════════════════════════════════ */
  function richToText(html) {
    if (!html) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    /* table → 각 행을 탭으로 구분한 텍스트로 변환 */
    tmp.querySelectorAll('tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('td, th');
      var rowText = Array.from(cells).map(function(c){ return c.innerText || c.textContent; }).join('\t');
      var p = document.createElement('p');
      p.textContent = rowText;
      tr.parentNode.replaceChild(p, tr);
    });
    tmp.querySelectorAll('table').forEach(function(t){ t.replaceWith(t.innerText || ''); });
    return tmp.innerText || tmp.textContent || '';
  }

  function updatePreview() {
    var ta = document.getElementById('editor-content');
    if (!ta) return;

    var settings = Storage.getSettings();
    var orgName  = settings.orgName || '○○기관';
    var f        = collectFields();
    var lines    = [];

    /* rich 필드는 텍스트로 변환 */
    var bodyText = richToText(f.body || '');

    lines.push(orgName);
    lines.push('');
    if (f.via)       lines.push('경  유: ' + f.via);
    if (f.receiver)  lines.push('수  신: ' + f.receiver);
    if (f.reference) lines.push('참  조: ' + f.reference);
    lines.push('');
    lines.push('제  목: ' + (f.title || ''));
    lines.push('');

    if (currentTemplateId === 'event') {
      lines.push('1. 귀 기관의 무궁한 발전을 기원합니다.');
      lines.push('2. 아래와 같이 행사를 안내드립니다.');
      lines.push('');
      if (f.eventDate)   lines.push('   일  시: ' + f.eventDate);
      if (f.eventPlace)  lines.push('   장  소: ' + f.eventPlace);
      if (f.eventTarget) lines.push('   대  상: ' + f.eventTarget);
      if (bodyText)      lines.push('   내  용: ' + bodyText);
      if (f.purpose)     lines.push('3. ' + f.purpose);
    } else if (currentTemplateId === 'sponsor') {
      lines.push('1. 귀하의 따뜻한 후원에 진심으로 감사드립니다.');
      if (f.sponsorName) lines.push('2. 후원자: '   + f.sponsorName);
      if (f.grantDate)   lines.push('3. 후원일자: ' + f.grantDate);
      if (f.grantAmount) lines.push('4. 후원금액: ' + f.grantAmount);
      if (bodyText) {
        bodyText.split('\n').forEach(function (line) { lines.push(line); });
      }
    } else {
      if (f.purpose) {
        lines.push(f.purpose);
        lines.push('');
      }
      if (bodyText) {
        bodyText.split('\n').forEach(function (line) { lines.push(line); });
      }
    }

    lines.push('');
    if (f.attachments) {
      lines.push('붙  임');
      f.attachments.split('\n').forEach(function (a, i) {
        var trimmed = a.replace(/^[\s\u00A0]+/, '').replace(/[\s\u00A0]+$/, '');
        if (trimmed) {
          var item = trimmed.endsWith('.') ? trimmed : trimmed + '.';
          lines.push('  ' + (i + 1) + '. ' + item);
        }
      });
    }
    lines.push('끝.');
    lines.push('');
    lines.push(f.senderName || orgName);

    ta.value = lines.join('\n');
  }

  /* ══════════════════════════════════════════════
     예시 채우기
  ══════════════════════════════════════════════ */
  function fillExample() {
    var ex = EXAMPLES[currentTemplateId];
    if (!ex) return;
    fillFields(ex);
    isModified = true;
    setSaveStatus('미저장');
    if (typeof showToast === 'function') showToast('예시 데이터를 채웠습니다.', 'info');
  }

  /* ══════════════════════════════════════════════
     임시저장
  ══════════════════════════════════════════════ */
  function saveDraft() {
    var fields = collectFields();
    var title  = getDocTitle();
    if (!currentDocId) currentDocId = generateId('draft');

    var draft = {
      id:         currentDocId,
      templateId: currentTemplateId,
      title:      title,
      fields:     fields,
      content:    document.getElementById('editor-content')
                    ? document.getElementById('editor-content').value : '',
      savedAt:    new Date().toISOString(),
      status:     'draft'
    };

    var ok = Storage.saveDraft(draft);
    if (ok) {
      isModified = false;
      setSaveStatus('저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }));
      if (typeof showToast === 'function') showToast('💾 임시저장되었습니다.', 'success');
    } else {
      if (typeof showToast === 'function') showToast('저장 중 오류가 발생했습니다.', 'error');
    }
    return ok;
  }

  /* ══════════════════════════════════════════════
     미리보기 이동
  ══════════════════════════════════════════════ */
  function goPreview() {
    saveDraft();
    setTimeout(function () {
      window.location.href = 'preview.html?id=' + encodeURIComponent(currentDocId) + '&type=draft';
    }, 300);
  }

  /* ══════════════════════════════════════════════
     표 삽입
  ══════════════════════════════════════════════ */
  function insertTable(rows, cols, hasHeader) {
    var editor = activeBodyEditor;
    if (!editor) {
      editor = document.querySelector('.body-editor');
    }
    if (!editor) return;

    editor.focus();

    var html = '<table>';
    for (var r = 0; r < rows; r++) {
      html += '<tr>';
      for (var c = 0; c < cols; c++) {
        if (hasHeader && r === 0) {
          html += '<th contenteditable="true"><br></th>';
        } else {
          html += '<td contenteditable="true"><br></td>';
        }
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';

    document.execCommand('insertHTML', false, html);
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     셀 선택 관련
  ══════════════════════════════════════════════ */
  function getParentCell(el) {
    while (el) {
      if (el.tagName === 'TD' || el.tagName === 'TH') return el;
      el = el.parentElement;
    }
    return null;
  }

  function handleCellClick(cell, e) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      /* 다중 선택 */
      if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
        selectedCells = selectedCells.filter(function(c){ return c !== cell; });
      } else {
        cell.classList.add('selected');
        selectedCells.push(cell);
      }
    } else {
      clearCellSelection();
      cell.classList.add('selected');
      selectedCells = [cell];
    }
  }

  function clearCellSelection() {
    selectedCells.forEach(function(c){ c.classList.remove('selected'); });
    selectedCells = [];
  }

  /* ══════════════════════════════════════════════
     행 추가
  ══════════════════════════════════════════════ */
  function addRow() {
    var cell = selectedCells[0] || getActiveCellFromSelection();
    if (!cell) { showToast('표 안의 셀을 먼저 클릭하세요.', 'warning'); return; }
    var row  = cell.closest('tr');
    if (!row)  return;
    var table = row.closest('table');
    var cols  = row.querySelectorAll('td, th').length;
    var newRow = document.createElement('tr');
    for (var i = 0; i < cols; i++) {
      var td = document.createElement('td');
      td.contentEditable = 'true';
      td.innerHTML = '<br>';
      newRow.appendChild(td);
    }
    row.parentNode.insertBefore(newRow, row.nextSibling);
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     열 추가
  ══════════════════════════════════════════════ */
  function addCol() {
    var cell = selectedCells[0] || getActiveCellFromSelection();
    if (!cell) { showToast('표 안의 셀을 먼저 클릭하세요.', 'warning'); return; }
    var table = cell.closest('table');
    if (!table) return;
    var cellIndex = cell.cellIndex;
    table.querySelectorAll('tr').forEach(function (row, ri) {
      var newCell = document.createElement(ri === 0 ? 'th' : 'td');
      newCell.contentEditable = 'true';
      newCell.innerHTML = '<br>';
      var ref = row.cells[cellIndex + 1] || null;
      row.insertBefore(newCell, ref);
    });
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     행 삭제
  ══════════════════════════════════════════════ */
  function deleteRow() {
    var cell = selectedCells[0] || getActiveCellFromSelection();
    if (!cell) { showToast('표 안의 셀을 먼저 클릭하세요.', 'warning'); return; }
    var row   = cell.closest('tr');
    var table = row ? row.closest('table') : null;
    if (!row || !table) return;
    if (table.querySelectorAll('tr').length <= 1) {
      /* 마지막 행이면 표 전체 삭제 */
      table.parentNode.removeChild(table);
    } else {
      row.parentNode.removeChild(row);
    }
    clearCellSelection();
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     열 삭제
  ══════════════════════════════════════════════ */
  function deleteCol() {
    var cell = selectedCells[0] || getActiveCellFromSelection();
    if (!cell) { showToast('표 안의 셀을 먼저 클릭하세요.', 'warning'); return; }
    var table = cell.closest('table');
    if (!table) return;
    var colIdx = cell.cellIndex;
    var allRows = table.querySelectorAll('tr');
    if (allRows[0] && allRows[0].cells.length <= 1) {
      table.parentNode.removeChild(table);
    } else {
      allRows.forEach(function (row) {
        if (row.cells[colIdx]) row.deleteCell(colIdx);
      });
    }
    clearCellSelection();
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     셀 병합 (Ctrl+클릭으로 여러 셀 선택 후 병합)
  ══════════════════════════════════════════════ */
  function mergeCells() {
    if (selectedCells.length < 2) {
      showToast('Ctrl+클릭으로 병합할 셀을 2개 이상 선택하세요.', 'warning');
      return;
    }

    /* 같은 행에 있는 셀만 colspan 병합 지원 */
    var rows = {};
    selectedCells.forEach(function (c) {
      var row = c.closest('tr');
      if (!rows[row]) rows[row] = [];
      rows[row].push(c);
    });

    Object.keys(rows).forEach(function (rowKey) {
      var cells = rows[rowKey];
      if (cells.length < 2) return;
      /* 첫 셀에 나머지 내용 합치기 */
      var first = cells[0];
      var combinedText = cells.map(function(c){
        return (c.innerText || c.textContent || '').trim();
      }).filter(Boolean).join(' / ');
      first.innerHTML = combinedText || '<br>';
      first.colSpan  = (first.colSpan || 1) + cells.slice(1).reduce(function(acc, c){
        return acc + (parseInt(c.colSpan) || 1);
      }, 0);
      cells.slice(1).forEach(function (c) { c.parentNode.removeChild(c); });
    });

    clearCellSelection();
    updatePreview();
    showToast('셀이 병합되었습니다.', 'success');
  }

  /* ══════════════════════════════════════════════
     셀 분리 (colspan 제거)
  ══════════════════════════════════════════════ */
  function unmergeCells() {
    var cell = selectedCells[0] || getActiveCellFromSelection();
    if (!cell) { showToast('분리할 셀을 클릭하세요.', 'warning'); return; }
    var span = parseInt(cell.colSpan) || 1;
    if (span <= 1) { showToast('병합된 셀이 없습니다.', 'info'); return; }
    var row = cell.closest('tr');
    cell.colSpan = 1;
    for (var i = 1; i < span; i++) {
      var newTd = document.createElement('td');
      newTd.contentEditable = 'true';
      newTd.innerHTML = '<br>';
      row.insertBefore(newTd, cell.nextSibling);
    }
    clearCellSelection();
    updatePreview();
    showToast('셀이 분리되었습니다.', 'success');
  }

  /* ══════════════════════════════════════════════
     Tab 키 셀 이동
  ══════════════════════════════════════════════ */
  function moveToNextCell(currentCell, reverse) {
    var table = currentCell.closest('table');
    if (!table) return;
    var cells = Array.from(table.querySelectorAll('td, th'));
    var idx   = cells.indexOf(currentCell);
    var next  = reverse ? cells[idx - 1] : cells[idx + 1];
    if (next) {
      next.focus();
      /* 커서를 끝으로 이동 */
      var range = document.createRange();
      var sel   = window.getSelection();
      range.selectNodeContents(next);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (!reverse) {
      /* 마지막 셀에서 Tab → 새 행 추가 */
      addRow();
    }
  }

  /* ══════════════════════════════════════════════
     현재 커서 위치의 셀 가져오기
  ══════════════════════════════════════════════ */
  function getActiveCellFromSelection() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return getParentCell(sel.anchorNode);
  }

  /* ══════════════════════════════════════════════
     서식 툴바 이벤트 바인딩
  ══════════════════════════════════════════════ */
  function bindToolbarEvents() {
    /* 굵게 */
    var btnBold = document.getElementById('fmt-bold');
    if (btnBold) btnBold.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand('bold');
    });

    /* 기울기 */
    var btnItalic = document.getElementById('fmt-italic');
    if (btnItalic) btnItalic.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand('italic');
    });

    /* 밑줄 */
    var btnUnderline = document.getElementById('fmt-underline');
    if (btnUnderline) btnUnderline.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand('underline');
    });

    /* 표 삽입 팝업 열기 */
    var btnTable = document.getElementById('fmt-table');
    if (btnTable) btnTable.addEventListener('mousedown', function (e) {
      e.preventDefault();
      openTablePopup();
    });

    /* 행 추가 */
    var btnAddRow = document.getElementById('fmt-add-row');
    if (btnAddRow) btnAddRow.addEventListener('mousedown', function (e) {
      e.preventDefault();
      addRow();
    });

    /* 열 추가 */
    var btnAddCol = document.getElementById('fmt-add-col');
    if (btnAddCol) btnAddCol.addEventListener('mousedown', function (e) {
      e.preventDefault();
      addCol();
    });

    /* 행 삭제 */
    var btnDelRow = document.getElementById('fmt-del-row');
    if (btnDelRow) btnDelRow.addEventListener('mousedown', function (e) {
      e.preventDefault();
      deleteRow();
    });

    /* 열 삭제 */
    var btnDelCol = document.getElementById('fmt-del-col');
    if (btnDelCol) btnDelCol.addEventListener('mousedown', function (e) {
      e.preventDefault();
      deleteCol();
    });

    /* 셀 병합 */
    var btnMerge = document.getElementById('fmt-merge');
    if (btnMerge) btnMerge.addEventListener('mousedown', function (e) {
      e.preventDefault();
      mergeCells();
    });

    /* 셀 분리 */
    var btnUnmerge = document.getElementById('fmt-unmerge');
    if (btnUnmerge) btnUnmerge.addEventListener('mousedown', function (e) {
      e.preventDefault();
      unmergeCells();
    });
  }

  /* ══════════════════════════════════════════════
     표 삽입 팝업
  ══════════════════════════════════════════════ */
  function openTablePopup() {
    var popup   = document.getElementById('table-popup');
    var overlay = document.getElementById('table-popup-overlay');
    if (popup)   popup.classList.add('visible');
    if (overlay) overlay.classList.add('visible');
  }

  function closeTablePopup() {
    var popup   = document.getElementById('table-popup');
    var overlay = document.getElementById('table-popup-overlay');
    if (popup)   popup.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
  }

  function bindTablePopupEvents() {
    var okBtn     = document.getElementById('table-popup-ok');
    var cancelBtn = document.getElementById('table-popup-cancel');
    var overlay   = document.getElementById('table-popup-overlay');

    if (okBtn) okBtn.addEventListener('click', function () {
      var rows   = parseInt(document.getElementById('table-rows').value)  || 3;
      var cols   = parseInt(document.getElementById('table-cols').value)  || 3;
      var header = document.getElementById('table-header').checked;
      closeTablePopup();
      insertTable(rows, cols, header);
    });

    if (cancelBtn) cancelBtn.addEventListener('click', closeTablePopup);
    if (overlay)   overlay.addEventListener('click',   closeTablePopup);

    /* Enter 키로 확인 */
    var popup = document.getElementById('table-popup');
    if (popup) popup.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); okBtn && okBtn.click(); }
      if (e.key === 'Escape') closeTablePopup();
    });
  }

  /* ══════════════════════════════════════════════
     전체 이벤트 바인딩
  ══════════════════════════════════════════════ */
  function bindEvents() {
    /* 템플릿 버튼 */
    document.querySelectorAll('.tpl-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectTemplate(btn.dataset.template);
      });
    });

    /* 예시 */
    var fillBtn = document.getElementById('fill-example-btn');
    if (fillBtn) fillBtn.addEventListener('click', fillExample);

    /* 임시저장 */
    var saveBtn = document.getElementById('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);

    /* Ctrl+S */
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveDraft(); }
    });

    /* 미리보기 */
    var previewBtn = document.getElementById('preview-btn');
    if (previewBtn) previewBtn.addEventListener('click', goPreview);

    /* Ctrl+Enter */
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); goPreview(); }
    });

    /* 규칙 검사 */
    var ruleBtn = document.getElementById('rule-check-btn');
    if (ruleBtn) ruleBtn.addEventListener('click', function () {
      if (typeof Modal !== 'undefined') Modal.open('check-modal');
    });

    /* 순화어 */
    var purifyBtn = document.getElementById('purify-btn');
    if (purifyBtn) purifyBtn.addEventListener('click', function () {
      if (typeof Modal !== 'undefined') Modal.open('purify-modal');
    });

    /* 모달 닫기 */
    document.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target === el) {
          var modal = el.closest('.modal-overlay') || document.getElementById(el.dataset.modal);
          if (modal && typeof Modal !== 'undefined') Modal.close(modal.id);
        }
      });
    });

    /* 자동저장 30초 */
    editorAutoSave = setInterval(function () {
      if (isModified) saveDraft();
    }, 30000);

    bindToolbarEvents();
    bindTablePopupEvents();
  }

  /* ══════════════════════════════════════════════
     DOMContentLoaded
  ══════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initEditor();
    bindEvents();

    var settings = Storage.getSettings();
    var notice   = document.getElementById('org-name-notice');
    if (notice && !settings.orgName) notice.style.display = 'flex';
  });

})();
