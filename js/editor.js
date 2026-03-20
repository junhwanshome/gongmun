/**
 * js/editor.js
 * 공문서 에디터 - 전체 재작성
 */
(function () {
  'use strict';

  var currentDocId      = null;
  var currentTemplateId = 'internal';
  var isModified        = false;
  var editorAutoSave    = null;
  var realtimeTimer     = null;

  var TEMPLATE_FIELDS = {
    internal: {
      label: '내부결재',
      fields: [
        { id:'title',       label:'제목',     type:'text',     placeholder:'문서 제목을 입력하세요', required:true },
        { id:'date',        label:'날짜',     type:'text',     placeholder:'예) 2024. 3. 20.' },
        { id:'receiver',    label:'수신',     type:'text',     placeholder:'예) 관장' },
        { id:'purpose',     label:'목적',     type:'textarea', placeholder:'문서 작성 목적을 입력하세요' },
        { id:'body',        label:'내용',     type:'textarea', placeholder:'주요 내용을 입력하세요' },
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
        { id:'body',        label:'내용',     type:'textarea', placeholder:'보고 내용을 입력하세요' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
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
        { id:'purpose',     label:'협조 요청 목적', type:'textarea', placeholder:'협조 요청 목적을 입력하세요' },
        { id:'body',        label:'협조 내용',      type:'textarea', placeholder:'협조 요청 내용을 입력하세요' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
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
        { id:'body',        label:'감사 내용',  type:'textarea', placeholder:'감사 내용을 입력하세요' },
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
        { id:'body',        label:'행사내용', type:'textarea', placeholder:'행사 내용을 입력하세요' },
        { id:'purpose',     label:'기타사항', type:'textarea', placeholder:'기타 안내 사항' },
        { id:'attachments', label:'붙임',     type:'textarea', placeholder:'붙임 파일명 (줄바꿈으로 구분)' },
        { id:'senderName',  label:'발신명의', type:'text',     placeholder:'예) 임마누엘집' }
      ]
    }
  };

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
      body:'귀하의 따뜻한 마음과 정성 어린 후원에 깊이 감사드립니다. 보내주신 후원금은 이용자들의 생활 향상과 복지서비스 제공에 소중히 사용하겠습니다.',
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

  function prefillOrgDefaults() {
    var settings = Storage.getSettings();
    setFieldValue('senderName', settings.orgName || '');
    setFieldValue('date', getTodayString());
  }

  function selectTemplate(tmplId) {
    if (!TEMPLATE_FIELDS[tmplId]) tmplId = 'internal';
    currentTemplateId = tmplId;

    document.querySelectorAll('.template-btn').forEach(function (btn) {
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
      if (f.type === 'textarea') {
        html += '<textarea id="field-' + f.id + '" name="' + f.id + '" '
              + 'class="form-control form-textarea" rows="3" '
              + 'placeholder="' + (f.placeholder || '') + '"></textarea>';
      } else {
        html += '<input id="field-' + f.id + '" name="' + f.id + '" type="text" '
              + 'class="form-control" '
              + 'placeholder="' + (f.placeholder || '') + '">';
      }
      html += '</div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        isModified = true;
        setSaveStatus('미저장');
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(updatePreview, 400);
      });
    });
  }

  function setFieldValue(id, value) {
    var el = document.getElementById('field-' + id);
    if (el) el.value = value || '';
  }

  function getFieldValue(id) {
    var el = document.getElementById('field-' + id);
    return el ? el.value.trim() : '';
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
    if (!title) title = getFieldValue('sponsorName') ? '후원자 감사 서한' : '';
    if (!title) title = TEMPLATE_FIELDS[currentTemplateId].label + ' 문서';
    return title;
  }

  function setSaveStatus(msg) {
    var el = document.getElementById('save-status');
    if (el) el.textContent = msg;
  }

  /* ── 에디터 textarea 미리보기 ── */
  function updatePreview() {
    var ta = document.getElementById('editor-content');
    if (!ta) return;

    var settings = Storage.getSettings();
    var orgName  = settings.orgName || '○○기관';
    var f        = collectFields();
    var lines    = [];

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
      if (f.body)        lines.push('   내  용: ' + f.body);
      if (f.purpose)     lines.push('3. ' + f.purpose);
    } else if (currentTemplateId === 'sponsor') {
      lines.push('1. 귀하의 따뜻한 후원에 진심으로 감사드립니다.');
      if (f.sponsorName) lines.push('2. 후원자: '   + f.sponsorName);
      if (f.grantDate)   lines.push('3. 후원일자: ' + f.grantDate);
      if (f.grantAmount) lines.push('4. 후원금액: ' + f.grantAmount);
      if (f.body) {
        f.body.split('\n').forEach(function (line) { lines.push(line); });
      }
    } else {
      /* internal / government / cooperation
         purpose: 번호 없이 단독 출력
         body: 사용자가 직접 번호 입력 → 그대로 출력 */
      if (f.purpose) {
        lines.push(f.purpose);
        lines.push('');
      }
      if (f.body) {
        f.body.split('\n').forEach(function (line) { lines.push(line); });
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

  function fillExample() {
    var ex = EXAMPLES[currentTemplateId];
    if (!ex) return;
    fillFields(ex);
    isModified = true;
    setSaveStatus('미저장');
    if (typeof showToast === 'function') showToast('예시 데이터를 채웠습니다.', 'info');
  }

  function saveDraft() {
    var fields = collectFields();
    var title  = getDocTitle();

    if (!currentDocId) currentDocId = generateId('draft');

    var draft = {
      id:         currentDocId,
      templateId: currentTemplateId,
      title:      title,
      fields:     fields,
      content:    document.getElementById('editor-content') ? document.getElementById('editor-content').value : '',
      savedAt:    new Date().toISOString(),
      status:     'draft'
    };

    var ok = Storage.saveDraft(draft);
    if (ok) {
      isModified = false;
      setSaveStatus('저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      if (typeof showToast === 'function') showToast('💾 임시저장되었습니다.', 'success');
    } else {
      if (typeof showToast === 'function') showToast('저장 중 오류가 발생했습니다.', 'error');
    }
    return ok;
  }

  function goPreview() {
    saveDraft();
    setTimeout(function () {
      window.location.href = 'preview.html?id=' + encodeURIComponent(currentDocId) + '&type=draft';
    }, 300);
  }

  function bindEvents() {
    document.querySelectorAll('.template-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectTemplate(btn.dataset.template);
      });
    });

    var fillBtn = document.getElementById('fill-example-btn');
    if (fillBtn) fillBtn.addEventListener('click', fillExample);

    var saveBtn = document.getElementById('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveDraft(); }
    });

    var previewBtn = document.getElementById('preview-btn');
    if (previewBtn) previewBtn.addEventListener('click', goPreview);

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); goPreview(); }
    });

    var ruleBtn = document.getElementById('rule-check-btn');
    if (ruleBtn) ruleBtn.addEventListener('click', function () {
      if (typeof Modal !== 'undefined') Modal.open('check-modal');
    });

    var purifyBtn = document.getElementById('purify-btn');
    if (purifyBtn) purifyBtn.addEventListener('click', function () {
      if (typeof Modal !== 'undefined') Modal.open('purify-modal');
    });

    document.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target === el) {
          var modal = el.closest('.modal-overlay') || document.getElementById(el.dataset.modal);
          if (modal && typeof Modal !== 'undefined') Modal.close(modal.id);
        }
      });
    });

    editorAutoSave = setInterval(function () {
      if (isModified) saveDraft();
    }, 30000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initEditor();
    bindEvents();

    var settings = Storage.getSettings();
    var notice   = document.getElementById('org-name-notice');
    if (notice && !settings.orgName) notice.style.display = 'flex';
  });

})();
