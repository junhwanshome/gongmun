/**
 * js/checker.js
 * 공문서 규칙 검사 엔진
 */

const Checker = {

  // ── 전체 검사 실행 ──────────────────────────────────────────────
  checkAll(text, templateId = 'internal') {
    if (!text || text.trim() === '') return [];

    const results = [];

    results.push(...this.checkDate(text));
    results.push(...this.checkTime(text));
    results.push(...this.checkMoney(text));
    results.push(...this.checkFormat(text));
    results.push(...this.checkAuthority(text));
    results.push(...this.checkPurifyWords(text));

    return results;
  },

  // ── 날짜 형식 검사 ─────────────────────────────────────────────
  checkDate(text) {
    const results = [];

    // 점(.) 구분 날짜인데 공백 없는 경우: 2024.1.1 → 2024. 1. 1.
    const datePattern1 = /\d{4}\.\d{1,2}\.\d{1,2}(?!\.)/g;
    let match;
    while ((match = datePattern1.exec(text)) !== null) {
      const original = match[0];
      // 이미 올바른 형식인지 확인 (공백 포함 여부)
      const correctPattern = /\d{4}\. \d{1,2}\. \d{1,2}\./;
      if (!correctPattern.test(original)) {
        const parts = original.split('.');
        const fixed = `${parts[0]}. ${parseInt(parts[1])}. ${parseInt(parts[2])}.`;
        results.push({
          type: 'date',
          level: 'error',
          original: original,
          suggestion: fixed,
          message: `날짜 형식 오류: "${original}" → "${fixed}"`,
          description: '날짜는 "연. 월. 일." 형식으로 작성하고 숫자 뒤에 마침표와 공백을 넣어야 합니다.',
          index: match.index
        });
      }
    }

    // 슬래시(/) 구분 날짜: 2024/01/01 → 2024. 1. 1.
    const datePattern2 = /\d{4}\/\d{1,2}\/\d{1,2}/g;
    while ((match = datePattern2.exec(text)) !== null) {
      const original = match[0];
      const parts = original.split('/');
      const fixed = `${parts[0]}. ${parseInt(parts[1])}. ${parseInt(parts[2])}.`;
      results.push({
        type: 'date',
        level: 'error',
        original: original,
        suggestion: fixed,
        message: `날짜 형식 오류: "${original}" → "${fixed}"`,
        description: '날짜 구분자는 슬래시(/) 대신 마침표(.)를 사용해야 합니다.',
        index: match.index
      });
    }

    // 하이픈(-) 구분 날짜: 2024-01-01 → 2024. 1. 1.
    const datePattern3 = /\d{4}-\d{1,2}-\d{1,2}/g;
    while ((match = datePattern3.exec(text)) !== null) {
      const original = match[0];
      const parts = original.split('-');
      const fixed = `${parts[0]}. ${parseInt(parts[1])}. ${parseInt(parts[2])}.`;
      results.push({
        type: 'date',
        level: 'error',
        original: original,
        suggestion: fixed,
        message: `날짜 형식 오류: "${original}" → "${fixed}"`,
        description: '날짜 구분자는 하이픈(-) 대신 마침표(.)를 사용해야 합니다.',
        index: match.index
      });
    }

    return results;
  },

  // ── 시간 형식 검사 ─────────────────────────────────────────────
  checkTime(text) {
    const results = [];
    let match;

    // 오전/오후 + 시 + 분 형식
    const timePattern = /([오전오후]{2})\s*(\d{1,2})시\s*(?:(\d{1,2})분)?/g;
    while ((match = timePattern.exec(text)) !== null) {
      const original = match[0];
      const ampm = match[1];
      let hour = parseInt(match[2]);
      const minute = match[3] ? parseInt(match[3]) : 0;

      if (ampm === '오후' && hour !== 12) hour += 12;
      if (ampm === '오전' && hour === 12) hour = 0;

      const fixed = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      results.push({
        type: 'time',
        level: 'warning',
        original: original,
        suggestion: fixed,
        message: `시간 형식 권장: "${original}" → "${fixed}"`,
        description: '공문서에서 시간은 24시간제(00:00)로 표기하는 것을 권장합니다.',
        index: match.index
      });
    }

    return results;
  },

  // ── 금액 형식 검사 ─────────────────────────────────────────────
  checkMoney(text) {
    const results = [];
    let match;

    // "금 숫자원" → "금숫자원" (공백 제거)
    const moneyPattern1 = /금\s+(\d[\d,]*원)/g;
    while ((match = moneyPattern1.exec(text)) !== null) {
      const original = match[0];
      const amount = match[1];
      const fixed = `금${amount}`;
      results.push({
        type: 'money',
        level: 'error',
        original: original,
        suggestion: fixed,
        message: `금액 형식 오류: "${original}" → "${fixed}"`,
        description: '"금"과 금액 사이에 공백을 넣지 않습니다.',
        index: match.index
      });
    }

    // 금액에 한글 병기 없는 경우 안내
    const moneyPattern2 = /금(\d[\d,]+원)(?!\s*\(금)/g;
    while ((match = moneyPattern2.exec(text)) !== null) {
      const original = match[0];
      const numStr = match[1].replace(/,/g, '').replace('원', '');
      const num = parseInt(numStr);
      if (!isNaN(num) && num >= 10000) {
        const korean = this.numberToKorean(num);
        const fixed = `${original}(금${korean}원정)`;
        results.push({
          type: 'money',
          level: 'info',
          original: original,
          suggestion: fixed,
          message: `금액 한글 병기 권장: "${original}" → "${fixed}"`,
          description: '공문서에서 금액은 아라비아 숫자 뒤에 한글로 병기하는 것을 권장합니다.',
          index: match.index
        });
      }
    }

    return results;
  },

  // ── 문서 형식 검사 ─────────────────────────────────────────────
  checkFormat(text) {
    const results = [];

    // "끝" 마침표 누락
    if (text.includes('끝') && !text.includes('끝.')) {
      const match = text.match(/끝(?!\.)/);
      if (match) {
        results.push({
          type: 'format',
          level: 'error',
          original: '끝',
          suggestion: '끝.',
          message: '"끝" 뒤에 마침표가 없습니다: "끝" → "끝."',
          description: '공문서 본문 마지막에는 반드시 "끝."으로 마무리해야 합니다.',
          index: match.index
        });
      }
    }

    // "붙임:" → "붙임" (콜론 제거)
    const attachMatch = text.match(/붙임:/);
    if (attachMatch) {
      results.push({
        type: 'format',
        level: 'error',
        original: '붙임:',
        suggestion: '붙임',
        message: '"붙임:" → "붙임" (콜론 제거)',
        description: '붙임 표기 시 콜론(:)을 사용하지 않습니다.',
        index: attachMatch.index
      });
    }

    // "별첨" → "붙임" 권장
    const byeolchumMatch = text.match(/별첨/);
    if (byeolchumMatch) {
      results.push({
        type: 'format',
        level: 'warning',
        original: '별첨',
        suggestion: '붙임',
        message: '"별첨" → "붙임" 권장',
        description: '공문서에서는 "별첨" 대신 "붙임"을 사용합니다.',
        index: byeolchumMatch.index
      });
    }

    return results;
  },

  // ── 권위적 표현 검사 ───────────────────────────────────────────
  checkAuthority(text) {
    const results = [];

    const authorityMap = [
      { pattern: /제출할\s*것/g,     fix: '제출하여 주시기 바랍니다' },
      { pattern: /참석\s*바람/g,     fix: '참석하여 주시기 바랍니다' },
      { pattern: /협조\s*요망/g,     fix: '협조하여 주시기 바랍니다' },
      { pattern: /통보함/g,          fix: '알려드립니다' },
      { pattern: /시행할\s*것/g,     fix: '시행하여 주시기 바랍니다' },
      { pattern: /제출\s*요망/g,     fix: '제출하여 주시기 바랍니다' },
      { pattern: /참고\s*바람/g,     fix: '참고하시기 바랍니다' },
      { pattern: /검토\s*요망/g,     fix: '검토하여 주시기 바랍니다' },
      { pattern: /보고\s*바람/g,     fix: '보고하여 주시기 바랍니다' },
      { pattern: /제출하기\s*바람/g, fix: '제출하여 주시기 바랍니다' },
      { pattern: /통보할\s*것/g,     fix: '알려 주시기 바랍니다' },
      { pattern: /처리할\s*것/g,     fix: '처리하여 주시기 바랍니다' },
      { pattern: /조치할\s*것/g,     fix: '조치하여 주시기 바랍니다' },
      { pattern: /할\s*것임/g,       fix: '하겠습니다' },
      { pattern: /붙임\s*참조/g,     fix: '붙임을 참고하시기 바랍니다' }
    ];

    let match;
    for (const item of authorityMap) {
      item.pattern.lastIndex = 0;
      while ((match = item.pattern.exec(text)) !== null) {
        results.push({
          type: 'authority',
          level: 'warning',
          original: match[0],
          suggestion: item.fix,
          message: `권위적 표현: "${match[0]}" → "${item.fix}"`,
          description: '공문서는 민주적이고 협력적인 어조를 사용해야 합니다.',
          index: match.index
        });
      }
    }

    return results;
  },

  // ── 순화어 검사 ────────────────────────────────────────────────
  checkPurifyWords(text) {
    const results = [];

    if (typeof PURIFY_WORDS === 'undefined') return results;

    let match;
    for (const item of PURIFY_WORDS) {
      const pattern = new RegExp(item.word, 'g');
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          type: 'purify',
          level: 'info',
          original: item.word,
          suggestion: item.replace,
          message: `순화 권장: "${item.word}" → "${item.replace}"`,
          description: item.desc || '어렵고 낯선 표현을 쉬운 우리말로 바꾸어 사용합니다.',
          index: match.index,
          category: item.category || '기타'
        });
      }
    }

    return results;
  },

  // ── 필수 항목 검사 ─────────────────────────────────────────────
  checkRequired(fields, templateId) {
    const results = [];

    if (typeof REQUIRED_ITEMS === 'undefined') return results;
    const required = REQUIRED_ITEMS[templateId];
    if (!required) return results;

    for (const fieldKey of (required.required || [])) {
      if (!fields[fieldKey] || fields[fieldKey].trim() === '') {
        results.push({
          type: 'required',
          level: 'error',
          field: fieldKey,
          message: `필수 항목 누락: "${fieldKey}"`,
          description: `이 문서 양식에서 "${fieldKey}" 항목은 반드시 입력해야 합니다.`
        });
      }
    }

    return results;
  },

  // ── 숫자 → 한글 변환 ───────────────────────────────────────────
  numberToKorean(num) {
    if (num === 0) return '영';
    const units  = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const groups = ['', '십', '백', '천'];
    const bigs   = ['', '만', '억', '조'];

    let result = '';
    let bigIdx = 0;
    while (num > 0) {
      const chunk = num % 10000;
      if (chunk !== 0) {
        let chunkStr = '';
        let n = chunk;
        for (let i = 0; i < 4; i++) {
          const d = n % 10;
          if (d !== 0) {
            chunkStr = (d === 1 && i > 0 ? '' : units[d]) + groups[i] + chunkStr;
          }
          n = Math.floor(n / 10);
        }
        result = chunkStr + bigs[bigIdx] + result;
      }
      bigIdx++;
      num = Math.floor(num / 10000);
    }
    return result;
  },

  // ── 자동 수정 적용 (단일) ─────────────────────────────────────
  applyFix(text, result) {
    if (!result.original || !result.suggestion) return text;
    return text.replace(result.original, result.suggestion);
  },

  // ── 자동 수정 전체 적용 ───────────────────────────────────────
  applyAllFixes(text, results) {
    let fixed = text;
    // error 레벨만 자동 수정
    const errorResults = results.filter(r => r.level === 'error');
    for (const result of errorResults) {
      if (result.original && result.suggestion) {
        fixed = fixed.split(result.original).join(result.suggestion);
      }
    }
    return fixed;
  }
};


// ── CheckerUI: 검사 결과 렌더링 ────────────────────────────────────
const CheckerUI = {

  // 사이드 패널 렌더링
  renderSidePanel(results, containerId = 'realtime-check-panel') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="check-panel-header">
          <span class="check-panel-title">✅ 실시간 검사</span>
        </div>
        <div class="check-empty">
          <div class="check-empty-icon">✅</div>
          <p>발견된 문제가 없습니다.</p>
        </div>`;
      return;
    }

    const errors   = results.filter(r => r.level === 'error');
    const warnings = results.filter(r => r.level === 'warning');
    const infos    = results.filter(r => r.level === 'info');

    let html = `
      <div class="check-panel-header">
        <span class="check-panel-title">⚠️ 실시간 검사</span>
        <div class="check-summary-badges">
          ${errors.length   ? `<span class="badge badge-error"  >오류 ${errors.length}</span>`   : ''}
          ${warnings.length ? `<span class="badge badge-warning">경고 ${warnings.length}</span>` : ''}
          ${infos.length    ? `<span class="badge badge-info"   >안내 ${infos.length}</span>`    : ''}
        </div>
      </div>
      <div class="check-list">`;

    for (const r of results) {
      const icon = r.level === 'error' ? '🔴' : r.level === 'warning' ? '🟡' : '🔵';
      html += `
        <div class="check-item check-item-${r.level}">
          <div class="check-item-header">
            <span class="check-icon">${icon}</span>
            <span class="check-msg">${escapeHtml(r.message)}</span>
          </div>
          ${r.description ? `<div class="check-desc">${escapeHtml(r.description)}</div>` : ''}
          ${(r.original && r.suggestion) ? `
            <div class="check-fix">
              <span class="check-original">${escapeHtml(r.original)}</span>
              <span class="check-arrow">→</span>
              <span class="check-suggestion">${escapeHtml(r.suggestion)}</span>
            </div>` : ''}
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  },

  // 전체 검사 모달 렌더링
  renderCheckModal(results, containerId = 'check-modal-body') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="check-empty">
          <div class="check-empty-icon">🎉</div>
          <h3>모든 검사를 통과했습니다!</h3>
          <p>발견된 규칙 위반이 없습니다.</p>
        </div>`;
      return;
    }

    const groups = {
      date:      { label: '📅 날짜 형식',  items: [] },
      time:      { label: '🕐 시간 형식',  items: [] },
      money:     { label: '💰 금액 형식',  items: [] },
      format:    { label: '📋 문서 형식',  items: [] },
      authority: { label: '🗣️ 표현 개선', items: [] },
      purify:    { label: '✨ 순화 권장',  items: [] },
      required:  { label: '❗ 필수 항목', items: [] }
    };

    for (const r of results) {
      if (groups[r.type]) groups[r.type].items.push(r);
    }

    let html = '';
    for (const [, grp] of Object.entries(groups)) {
      if (grp.items.length === 0) continue;
      html += `
        <div class="check-group">
          <h4 class="check-group-title">${grp.label} <span class="badge">${grp.items.length}</span></h4>
          <div class="check-group-list">`;
      for (const r of grp.items) {
        const icon = r.level === 'error' ? '🔴' : r.level === 'warning' ? '🟡' : '🔵';
        html += `
          <div class="check-item check-item-${r.level}">
            <div class="check-item-header">
              <span>${icon}</span>
              <span>${escapeHtml(r.message)}</span>
            </div>
            ${r.description ? `<p class="check-desc">${escapeHtml(r.description)}</p>` : ''}
            ${(r.original && r.suggestion) ? `
              <div class="check-fix">
                <span class="check-original">${escapeHtml(r.original)}</span>
                <span class="check-arrow">→</span>
                <span class="check-suggestion">${escapeHtml(r.suggestion)}</span>
              </div>` : ''}
          </div>`;
      }
      html += '</div></div>';
    }

    container.innerHTML = html;
  },

  // 순화어 모달 렌더링
  renderPurifyModal(text, containerId = 'purify-modal-body') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof PURIFY_WORDS === 'undefined') {
      container.innerHTML = '<p>순화어 데이터를 불러올 수 없습니다.</p>';
      return;
    }

    const found = [];
    for (const item of PURIFY_WORDS) {
      if (text.includes(item.word)) {
        found.push(item);
      }
    }

    if (found.length === 0) {
      container.innerHTML = `
        <div class="check-empty">
          <div class="check-empty-icon">✨</div>
          <h3>순화가 필요한 단어가 없습니다!</h3>
          <p>이미 쉽고 바른 우리말을 사용하고 있습니다.</p>
        </div>`;
      return;
    }

    // 카테고리별 그룹화
    const catMap = {};
    for (const item of found) {
      const cat = item.category || '기타';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(item);
    }

    let html = `<p class="purify-summary">총 <strong>${found.length}개</strong>의 순화 권장 단어가 발견되었습니다.</p>`;

    for (const [cat, items] of Object.entries(catMap)) {
      html += `
        <div class="purify-group">
          <h4 class="purify-group-title">${escapeHtml(cat)}</h4>
          <table class="purify-table">
            <thead>
              <tr>
                <th>현재 표현</th>
                <th>권장 표현</th>
                <th>설명</th>
                <th>적용</th>
              </tr>
            </thead>
            <tbody>`;
      for (const item of items) {
        html += `
              <tr>
                <td><span class="purify-original">${escapeHtml(item.word)}</span></td>
                <td><span class="purify-replace">${escapeHtml(item.replace)}</span></td>
                <td class="purify-desc">${escapeHtml(item.desc || '')}</td>
                <td>
                  <button class="btn btn-sm btn-primary"
                          onclick="applyPurifyWord('${escapeHtml(item.word)}','${escapeHtml(item.replace)}')">
                    적용
                  </button>
                </td>
              </tr>`;
      }
      html += '</tbody></table></div>';
    }

    container.innerHTML = html;
  }
};


// ── 순화어 적용 (editor.js에서 호출) ──────────────────────────────
function applyPurifyWord(original, replacement) {
  const editor = document.getElementById('editor-content');
  if (!editor) return;

  const text = editor.value;
  if (!text.includes(original)) {
    showToast(`"${original}"을(를) 찾을 수 없습니다.`, 'warning');
    return;
  }

  editor.value = text.split(original).join(replacement);
  showToast(`"${original}" → "${replacement}" 적용 완료`, 'success');

  // 변경 후 재검사
  if (typeof runRealtimeCheck === 'function') runRealtimeCheck();
}
