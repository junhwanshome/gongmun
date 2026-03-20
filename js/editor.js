/**
 * js/editor.js
 * 공문서 에디터 - 표 스타일 개선 (편집기 + 텍스트 미리보기)
 */
(function () {
  'use strict';

  var currentDocId      = null;
  var currentTemplateId = 'internal';
  var isModified        = false;
  var editorAutoSave    = null;
  var realtimeTimer     = null;
  var _savedRange       = null;

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
        { id:'purpose',     label:'목적',     type:'textarea', placeholder:'문서 작성 목적을 입력하세요' },
        { id:'body',        label:'내용',     type:'rich',     placeholder:'주요 내용을 입력하세요 (표·서식 지원)' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
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
        { id:'purpose',     label:'목적',     type:'textarea', placeholder:'보고 목적을 입력하세요' },
        { id:'body',        label:'내용',     type:'rich',     placeholder:'보고 내용을 입력하세요 (표·서식 지원)' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
        { id:'senderName',  label:'발신명의', type:'text',     placeholder:'예) 임마누엘집' }
      ]
    },
    cooperation: {
      label: '타기관협조',
      fields: [
        { id:'title',       label:'제목',       type:'text',     placeholder:'문서 제목을 입력하세요', required:true },
        { id:'date',        label:'날짜',       type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'receiver',    label:'수신',       type:'text',     placeholder:'예) ○○기관장' },
        { id:'reference',   label:'참조',       type:'text',     placeholder:'예) ○○담당자' },
        { id:'docNo',       label:'문서번호',   type:'text',     placeholder:'예) 복지-1234' },
        { id:'purpose',     label:'협조 목적',  type:'textarea', placeholder:'협조 요청 목적을 입력하세요' },
        { id:'body',        label:'협조 내용',  type:'rich',     placeholder:'협조 요청 내용을 입력하세요 (표·서식 지원)' },
        { id:'attachments', label:'붙임',       type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
        { id:'senderName',  label:'발신명의',   type:'text',     placeholder:'예) 임마누엘집' }
      ]
    },
    sponsor: {
      label: '후원자감사',
      fields: [
        { id:'title',       label:'제목',       type:'text',     placeholder:'예) 후원금 감사 인사', required:true },
        { id:'date',        label:'날짜',       type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'sponsorName', label:'후원자',     type:'text',     placeholder:'후원자 이름' },
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
        { id:'body',        label:'행사내용', type:'rich',     placeholder:'행사 내용을 입력하세요 (표·서식 지원)' },
        { id:'purpose',     label:'기타사항', type:'textarea', placeholder:'기타 안내 사항' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
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
      var existing = (docType === 'doc')
        ? Storage.getDoc(docId)
        : Storage.getDraft(docId);
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
      btn.classList.toggle('active', btn.dataset.template === tmplId);
    });

    var guide = document.getElementById('guide-panel');
    if (guide) {
      guide.innerHTML = '<strong>' + TEMPLATE_FIELDS[tmplId].label + '</strong>'
        + ' 작성 가이드: 제목은 간결하게, 본문은 육하원칙에 따라 작성하세요.';
    }

    renderFormFields(tmplId);
    prefillOrgDefaults();
    updatePreview();
  }

  /* ══════════════════════════════════════════════
     폼 필드 렌더링
  ══════════════════════════════════════════════ */
  function renderFormFields(tmplId) {
    var container = document.getElementById('form-fields');
    if (!container) return;

    var tpl = TEMPLATE_FIELDS[tmplId];
    if (!tpl) return;

    var html = '';
    tpl.fields.forEach(function (f) {
      html += '<div class="form-group">';
      html += '<label class="form-label'
            + (f.required ? ' required' : '')
            + '" for="field-' + f.id + '">'
            + f.label + '</label>';

      if (f.type === 'rich') {
        html += '<div class="body-editor-wrap">'
              + '<div id="field-' + f.id + '" '
              + 'class="body-editor form-control" '
              + 'contenteditable="true" '
              + 'data-placeholder="' + (f.placeholder || '') + '" '
              + 'spellcheck="false">'
              + '</div>'
              + '</div>';
      } else {
        var rows = 3;
        if (f.id === 'purpose')     rows = 4;
        if (f.id === 'attachments') rows = 4;

        if (f.type === 'textarea') {
          html += '<textarea id="field-' + f.id + '" '
                + 'class="form-control form-textarea" '
                + 'rows="' + rows + '" '
                + 'placeholder="' + (f.placeholder || '') + '">'
                + '</textarea>';
        } else {
          html += '<input id="field-' + f.id + '" type="text" '
                + 'class="form-control" '
                + 'placeholder="' + (f.placeholder || '') + '">';
        }
      }
      html += '</div>';
    });

    container.innerHTML = html;

    /* 일반 입력 이벤트 */
    container.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        isModified = true;
        setSaveStatus('미저장');
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(updatePreview, 400);
      });
    });

    /* rich 편집기 이벤트 */
    var richEl = container.querySelector('.body-editor');
    if (richEl) {
      richEl.addEventListener('input', function () {
        isModified = true;
        setSaveStatus('미저장');
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(updatePreview, 400);
      });
      richEl.addEventListener('focus', function () {
        var toolbar = document.getElementById('format-toolbar');
        if (toolbar) toolbar.classList.add('visible');
      });
      richEl.addEventListener('blur', function () {
        setTimeout(function () {
          if (!document.activeElement.closest('#format-toolbar')) {
            var toolbar = document.getElementById('format-toolbar');
            if (toolbar) toolbar.classList.remove('visible');
          }
        }, 200);
      });
      richEl.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          var cell = getActiveCell();
          if (cell) moveToNextCell(cell, e.shiftKey);
          else document.execCommand('insertText', false, '\u00A0\u00A0');
        }
      });
    }
  }

  /* ══════════════════════════════════════════════
     필드 값 읽기 / 쓰기
  ══════════════════════════════════════════════ */
  function setFieldValue(id, value) {
    var el = document.getElementById('field-' + id);
    if (!el) return;
    if (el.contentEditable === 'true') {
      el.innerHTML = value
        ? value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
               .replace(/\n/g, '<br>')
        : '';
    } else {
      el.value = value || '';
    }
  }

  function getFieldValue(id) {
    var el = document.getElementById('field-' + id);
    if (!el) return '';
    if (el.contentEditable === 'true') return el.innerHTML.trim();
    return el.value.trim();
  }

  function fillFields(fields) {
    Object.keys(fields).forEach(function (key) {
      setFieldValue(key, fields[key]);
    });
    updatePreview();
  }

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

  function getDocTitle() {
    var title = getFieldValue('title');
    if (!title && getFieldValue('sponsorName')) title = '후원자 감사 서한';
    if (!title) title = TEMPLATE_FIELDS[currentTemplateId].label + ' 문서';
    return title;
  }

  function setSaveStatus(msg) {
    var el = document.getElementById('save-status');
    if (el) el.textContent = msg;
  }

  /* ══════════════════════════════════════════════
     ★ HTML → 정렬된 텍스트 변환 (개선판)
        표 → 공문서 스타일 텍스트 표
        나머지 → 줄글
  ══════════════════════════════════════════════ */
  function richToText(html) {
    if (!html) return '';
    var div = document.createElement('div');
    div.innerHTML = html;

    /* ── 표 → 텍스트 표 변환 ── */
    div.querySelectorAll('table').forEach(function (table) {
      var rows  = Array.from(table.querySelectorAll('tr'));
      var grid  = rows.map(function (tr) {
        return Array.from(tr.querySelectorAll('td, th')).map(function (cell) {
          return (cell.innerText || cell.textContent || '').trim();
        });
      });

      /* 열 수 */
      var cols = grid.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
      if (cols === 0) { table.remove(); return; }

      /* ★ 바이트 기반 열 너비 계산 (한글 2바이트) */
      var widths = [];
      for (var c = 0; c < cols; c++) {
        var max = 4;
        grid.forEach(function (row) {
          var cell  = (row[c] || '');
          var bytes = 0;
          for (var i = 0; i < cell.length; i++) {
            bytes += cell.charCodeAt(i) > 127 ? 2 : 1;
          }
          if (bytes > max) max = bytes;
        });
        widths.push(max);
      }

      /* ★ 구분선 */
      function makeSep() {
        return widths.map(function (w) {
          return '-'.repeat(w + 2);
        }).join('+');
      }

      /* ★ 셀 패딩 (우측 공백으로 정렬) */
      function padCell(text, width) {
        var bytes = 0;
        for (var i = 0; i < text.length; i++) {
          bytes += text.charCodeAt(i) > 127 ? 2 : 1;
        }
        return ' ' + text + ' '.repeat(Math.max(1, width - bytes + 1));
      }

      var textLines = [];
      var sep = makeSep();

      grid.forEach(function (row, ri) {
        /* 헤더 위 구분선 */
        if (ri === 0) textLines.push(sep);

        /* 셀 행 */
        var line = widths.map(function (w, ci) {
          return padCell(row[ci] || '', w);
        }).join('|');
        textLines.push(line);

        /* 헤더 아래 또는 마지막 행 아래 구분선 */
        if (ri === 0 || ri === grid.length - 1) textLines.push(sep);
      });

      var pre = document.createElement('pre');
      pre.style.cssText = 'font-family:inherit;margin:4px 0;line-height:1.6;';
      pre.textContent   = textLines.join('\n');
      table.replaceWith(pre);
    });

    /* br → 줄바꿈 */
    div.querySelectorAll('br').forEach(function (br) {
      br.replaceWith('\n');
    });

    /* 블록 요소 → 줄바꿈 */
    div.querySelectorAll('p, div, li').forEach(function (el) {
      el.prepend('\n');
    });

    return (div.textContent || div.innerText || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* ══════════════════════════════════════════════
     ★ 금액 천단위 콤마 변환
  ══════════════════════════════════════════════ */
  function convertAmount(text) {
    if (!text) return text;
    return text.replace(/\b(\d{4,})\b/g, function (match) {
      if (match.indexOf(',') !== -1) return match;
      return parseInt(match, 10).toLocaleString('ko-KR');
    });
  }

  /* ══════════════════════════════════════════════
     실시간 미리보기 (우측 textarea)
  ══════════════════════════════════════════════ */
  function updatePreview() {
    var ta = document.getElementById('editor-content');
    if (!ta) return;

    var settings = Storage.getSettings();
    var orgName  = settings.orgName || '○○기관';
    var f        = collectFields();
    var lines    = [];

    lines.push(orgName, '');
    if (f.via)       lines.push('경  유: ' + f.via);
    if (f.receiver)  lines.push('수  신: ' + f.receiver);
    if (f.reference) lines.push('참  조: ' + f.reference);
    lines.push('');
    lines.push('제  목: ' + (f.title || ''), '');

    var bodyText = richToText(f.body || '');

    if (currentTemplateId === 'event') {
      lines.push('1. 귀 기관의 무궁한 발전을 기원합니다.');
      lines.push('2. 아래와 같이 행사를 안내드립니다.', '');
      if (f.eventDate)   lines.push('   일  시: ' + f.eventDate);
      if (f.eventPlace)  lines.push('   장  소: ' + f.eventPlace);
      if (f.eventTarget) lines.push('   대  상: ' + f.eventTarget);
      if (bodyText)      bodyText.split('\n').forEach(function (l) { lines.push('   ' + l); });
      if (f.purpose)     lines.push('3. ' + f.purpose);

    } else if (currentTemplateId === 'sponsor') {
      lines.push('1. 귀하의 따뜻한 후원에 진심으로 감사드립니다.');
      if (f.sponsorName) lines.push('2. 후원자: '   + f.sponsorName);
      if (f.grantDate)   lines.push('3. 후원일자: ' + f.grantDate);
      if (f.grantAmount) lines.push('4. 후원금액: ' + convertAmount(f.grantAmount));
      if (bodyText)      bodyText.split('\n').forEach(function (l) { lines.push(l); });

    } else {
      if (f.purpose) {
        f.purpose.split('\n').forEach(function (l) { lines.push(l); });
        lines.push('');
      }
      if (bodyText) {
        bodyText.split('\n').forEach(function (l) { lines.push(l); });
      }
    }

    lines.push('');
    if (f.attachments) {
      lines.push('붙  임');
      f.attachments.split('\n').forEach(function (a, i) {
        var t = a.replace(/^[\s\u00A0]+/, '').replace(/[\s\u00A0]+$/, '');
        if (t) {
          var item = t.endsWith('.') ? t : t + '.';
          lines.push('  ' + (i + 1) + '. ' + item);
        }
      });
    }
    lines.push('끝.', '', f.senderName || orgName);
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
      setSaveStatus('저장됨 ' + new Date().toLocaleTimeString('ko-KR',
        { hour: '2-digit', minute: '2-digit' }));
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
      window.location.href = 'preview.html?id='
        + encodeURIComponent(currentDocId) + '&type=draft';
    }, 300);
  }

  /* ══════════════════════════════════════════════
     표 조작 유틸리티
  ══════════════════════════════════════════════ */
  function getActiveCell() {
    var sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    var node = sel.anchorNode;
    while (node && node !== document.body) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') return node;
      node = node.parentNode;
    }
    return null;
  }

  function getSelectedCells() {
    return document.querySelectorAll('.body-editor .selected');
  }

  /* ★ 표 삽입 - 개선된 스타일 적용 */
  function insertTable(rows, cols, hasHeader) {
    var editor = document.querySelector('.body-editor');
    if (!editor) return;
    editor.focus();

    var tableStyle = [
      'border-collapse:collapse',
      'width:100%',
      'margin:8px 0',
      'font-size:0.88rem'
    ].join(';');

    var thStyle = [
      'border:1.5px solid #2c3e50',
      'padding:7px 12px',
      'min-width:60px',
      'background:#eaf2fb',
      'font-weight:600',
      'text-align:center',
      'vertical-align:middle',
      'word-break:keep-all'
    ].join(';');

    var tdStyle = [
      'border:1px solid #7f8c8d',
      'padding:7px 12px',
      'min-width:60px',
      'background:#fff',
      'vertical-align:middle',
      'word-break:keep-all'
    ].join(';');

    var html = '<table style="' + tableStyle + '">';
    for (var r = 0; r < rows; r++) {
      html += '<tr>';
      for (var c = 0; c < cols; c++) {
        var isHeader = hasHeader && r === 0;
        var tag   = isHeader ? 'th' : 'td';
        var style = isHeader ? thStyle : tdStyle;
        html += '<' + tag
              + ' style="' + style + '"'
              + ' contenteditable="true">'
              + '</' + tag + '>';
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';

    var sel = window.getSelection();
    if (sel && sel.rangeCount) {
      var range = sel.getRangeAt(0);
      range.deleteContents();
      var frag = document.createRange().createContextualFragment(html);
      range.insertNode(frag);
    } else {
      editor.insertAdjacentHTML('beforeend', html);
    }

    isModified = true;
    setSaveStatus('미저장');
    updatePreview();
  }

  function addRow() {
    var cell = getActiveCell();
    if (!cell) { if (typeof showToast === 'function') showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var tr   = cell.closest('tr');
    var cols = tr.querySelectorAll('td, th').length;
    var newTr = document.createElement('tr');
    for (var i = 0; i < cols; i++) {
      var td = document.createElement('td');
      td.style.cssText = 'border:1px solid #7f8c8d;padding:7px 12px;min-width:60px;background:#fff;vertical-align:middle;word-break:keep-all;';
      td.contentEditable = 'true';
      newTr.appendChild(td);
    }
    tr.insertAdjacentElement('afterend', newTr);
    isModified = true;
    updatePreview();
  }

  function addCol() {
    var cell = getActiveCell();
    if (!cell) { if (typeof showToast === 'function') showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var table    = cell.closest('table');
    var cellIdx  = Array.from(cell.parentNode.children).indexOf(cell);
    table.querySelectorAll('tr').forEach(function (tr, ri) {
      var ref     = tr.children[cellIdx];
      var isFirst = ri === 0;
      var newCell = document.createElement(isFirst ? 'th' : 'td');
      newCell.style.cssText = isFirst
        ? 'border:1.5px solid #2c3e50;padding:7px 12px;min-width:60px;background:#eaf2fb;font-weight:600;text-align:center;vertical-align:middle;word-break:keep-all;'
        : 'border:1px solid #7f8c8d;padding:7px 12px;min-width:60px;background:#fff;vertical-align:middle;word-break:keep-all;';
      newCell.contentEditable = 'true';
      if (ref) ref.insertAdjacentElement('afterend', newCell);
      else tr.appendChild(newCell);
    });
    isModified = true;
    updatePreview();
  }

  function deleteRow() {
    var cell = getActiveCell();
    if (!cell) { if (typeof showToast === 'function') showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var tr    = cell.closest('tr');
    var table = tr.closest('table');
    tr.remove();
    if (!table.querySelector('tr')) table.remove();
    isModified = true;
    updatePreview();
  }

  function deleteCol() {
    var cell = getActiveCell();
    if (!cell) { if (typeof showToast === 'function') showToast('표 안의 셀을 클릭하세요.', 'warning'); return; }
    var table   = cell.closest('table');
    var cellIdx = Array.from(cell.parentNode.children).indexOf(cell);
    table.querySelectorAll('tr').forEach(function (tr) {
      var c = tr.children[cellIdx];
      if (c) c.remove();
    });
    if (!table.querySelector('td, th')) table.remove();
    isModified = true;
    updatePreview();
  }

  function mergeCells() {
    var cells = Array.from(getSelectedCells());
    if (cells.length < 2) {
      if (typeof showToast === 'function') showToast('병합할 셀을 2개 이상 선택하세요. (Shift+클릭)', 'warning');
      return;
    }
    var combined = cells.map(function (c) { return c.textContent.trim(); }).filter(Boolean).join(' / ');
    var first    = cells[0];
    var rows     = [...new Set(cells.map(function (c) { return c.parentNode; }))];
    var minCol   = Infinity, maxCol = -Infinity;
    cells.forEach(function (c) {
      var idx = Array.from(c.parentNode.children).indexOf(c);
      if (idx < minCol) minCol = idx;
      if (idx > maxCol) maxCol = idx;
    });
    first.rowSpan = rows.length;
    first.colSpan = maxCol - minCol + 1;
    first.textContent = combined;
    first.classList.remove('selected');
    cells.slice(1).forEach(function (c) { c.remove(); });
    isModified = true;
    updatePreview();
  }

  function unmergeCells() {
    var cell = getActiveCell();
    if (!cell) { if (typeof showToast === 'function') showToast('분리할 셀을 클릭하세요.', 'warning'); return; }
    var rs = cell.rowSpan || 1;
    var cs = cell.colSpan || 1;
    if (rs <= 1 && cs <= 1) { if (typeof showToast === 'function') showToast('병합된 셀이 아닙니다.', 'warning'); return; }
    var tr    = cell.closest('tr');
    var table = cell.closest('table');
    var rows  = Array.from(table.querySelectorAll('tr'));
    var rIdx  = rows.indexOf(tr);
    var cIdx  = Array.from(tr.children).indexOf(cell);
    cell.rowSpan = 1;
    cell.colSpan = 1;
    for (var r = 0; r < rs; r++) {
      for (var c = 0; c < cs; c++) {
        if (r === 0 && c === 0) continue;
        var newCell = document.createElement('td');
        newCell.style.cssText = 'border:1px solid #7f8c8d;padding:7px 12px;min-width:60px;background:#fff;vertical-align:middle;word-break:keep-all;';
        newCell.contentEditable = 'true';
        var targetRow = rows[rIdx + r];
        if (!targetRow) continue;
        var ref = targetRow.children[cIdx + c];
        if (ref) ref.insertAdjacentElement('beforebegin', newCell);
        else targetRow.appendChild(newCell);
      }
    }
    isModified = true;
    updatePreview();
  }

  function moveToNextCell(cell, reverse) {
    var table = cell.closest('table');
    var cells = Array.from(table.querySelectorAll('td, th'));
    var idx   = cells.indexOf(cell);
    var next  = reverse ? cells[idx - 1] : cells[idx + 1];
    if (next) {
      next.focus();
      var range = document.createRange();
      var sel   = window.getSelection();
      range.selectNodeContents(next);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function initCellSelection() {
    document.addEventListener('click', function (e) {
      var cell = e.target.closest('.body-editor td, .body-editor th');
      if (!cell) {
        if (!e.target.closest('#format-toolbar')) {
          document.querySelectorAll('.body-editor .selected')
            .forEach(function (c) { c.classList.remove('selected'); });
        }
        return;
      }
      if (e.shiftKey) {
        cell.classList.toggle('selected');
      } else {
        document.querySelectorAll('.body-editor .selected')
          .forEach(function (c) { c.classList.remove('selected'); });
        cell.classList.add('selected');
      }
    });
  }

  /* ══════════════════════════════════════════════
     정렬 (좌·중앙·우)
  ══════════════════════════════════════════════ */
  function applyAlign(align) {
    var selected   = Array.from(getSelectedCells());
    var activeCell = getActiveCell();
    if (!selected.length && activeCell) selected = [activeCell];

    if (selected.length) {
      selected.forEach(function (cell) { cell.style.textAlign = align; });
      isModified = true;
      updatePreview();
      return;
    }

    var justifyMap = { left:'justifyLeft', center:'justifyCenter', right:'justifyRight' };
    if (justifyMap[align]) {
      var editor = document.querySelector('.body-editor');
      if (editor) { editor.focus(); document.execCommand(justifyMap[align], false, null); }
      isModified = true;
      updatePreview();
    }
  }

  /* ══════════════════════════════════════════════
     이벤트 바인딩
  ══════════════════════════════════════════════ */
  function bindEvents() {
    document.querySelectorAll('.tpl-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { selectTemplate(btn.dataset.template); });
    });

    var fillBtn = document.getElementById('fill-example-btn');
    if (fillBtn) fillBtn.addEventListener('click', fillExample);

    var saveBtn = document.getElementById('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 's')     { e.preventDefault(); saveDraft(); }
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); goPreview(); }
    });

    var previewBtn = document.getElementById('preview-btn');
    if (previewBtn) previewBtn.addEventListener('click', goPreview);

    /* 서식 툴바 */
    function fmtOn(id, fn) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('mousedown', function (e) { e.preventDefault(); fn(); });
    }

    fmtOn('fmt-bold',         function () { document.execCommand('bold',      false, null); updatePreview(); });
    fmtOn('fmt-italic',       function () { document.execCommand('italic',    false, null); updatePreview(); });
    fmtOn('fmt-underline',    function () { document.execCommand('underline', false, null); updatePreview(); });
    fmtOn('fmt-align-left',   function () { applyAlign('left'); });
    fmtOn('fmt-align-center', function () { applyAlign('center'); });
    fmtOn('fmt-align-right',  function () { applyAlign('right'); });
    fmtOn('fmt-add-row',      addRow);
    fmtOn('fmt-add-col',      addCol);
    fmtOn('fmt-del-row',      deleteRow);
    fmtOn('fmt-del-col',      deleteCol);
    fmtOn('fmt-merge',        mergeCells);
    fmtOn('fmt-unmerge',      unmergeCells);

    fmtOn('fmt-table', function () {
      var overlay = document.getElementById('table-popup-overlay');
      var popup   = document.getElementById('table-popup');
      if (overlay) overlay.classList.add('visible');
      if (popup)   popup.classList.add('visible');
      var sel = window.getSelection();
      if (sel && sel.rangeCount) _savedRange = sel.getRangeAt(0).cloneRange();
    });

    var popupOk = document.getElementById('table-popup-ok');
    if (popupOk) popupOk.addEventListener('click', function () {
      var rows      = parseInt(document.getElementById('table-rows').value, 10) || 3;
      var cols      = parseInt(document.getElementById('table-cols').value, 10) || 3;
      var hasHeader = document.getElementById('table-header').checked;

      var editor = document.querySelector('.body-editor');
      if (editor && _savedRange) {
        editor.focus();
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(_savedRange);
        _savedRange = null;
      }

      insertTable(rows, cols, hasHeader);
      closeTablePopup();
    });

    var popupCancel = document.getElementById('table-popup-cancel');
    if (popupCancel) popupCancel.addEventListener('click', closeTablePopup);

    var overlay = document.getElementById('table-popup-overlay');
    if (overlay) overlay.addEventListener('click', closeTablePopup);

    var ruleBtn = document.getElementById('rule-check-btn');
    if (ruleBtn) ruleBtn.addEventListener('click', function () {
      if (typeof openCheckModal === 'function') openCheckModal();
    });

    var purifyBtn = document.getElementById('purify-btn');
    if (purifyBtn) purifyBtn.addEventListener('click', function () {
      if (typeof openPurifyModal === 'function') openPurifyModal();
    });

    document.querySelectorAll('.modal-close-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var modal = btn.closest('.modal-overlay');
        if (modal && typeof Modal !== 'undefined') Modal.close(modal.id);
      });
    });

    initCellSelection();

    editorAutoSave = setInterval(function () {
      if (isModified) saveDraft();
    }, 30000);
  }

  function closeTablePopup() {
    var overlay = document.getElementById('table-popup-overlay');
    var popup   = document.getElementById('table-popup');
    if (overlay) overlay.classList.remove('visible');
    if (popup)   popup.classList.remove('visible');
  }

  /* ══════════════════════════════════════════════
     진입점
  ══════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initEditor();
    bindEvents();
    var settings = Storage.getSettings();
    var notice   = document.getElementById('org-name-notice');
    if (notice && !settings.orgName) notice.style.display = 'flex';
  });

})();
