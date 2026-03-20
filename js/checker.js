// js/checker.js
// 공문서 규칙 체크 기능

// =====================
// 메인 체크 함수
// =====================
const Checker = {

  // 전체 검사 실행
  checkAll(text) {
    if (!text || text.trim() === '') {
      return {
        errors: [],
        warnings: [],
        suggestions: [],
        passed: [],
        totalIssues: 0
      };
    }

    const results = {
      errors: [],      // 반드시 수정
      warnings: [],    // 수정 권장
      suggestions: [], // 참고사항
      passed: [],      // 통과 항목
      totalIssues: 0
    };

    // 각 규칙 체크 실행
    this.checkDate(text, results);
    this.checkTime(text, results);
    this.checkMoney(text, results);
    this.checkFormat(text, results);
    this.checkAuthority(text, results);
    this.checkItemOrder(text, results);
    this.checkPurifyWords(text, results);
    this.checkRequired(text, results);

    results.totalIssues = results.errors.length + results.warnings.length;

    return results;
  },

  // =====================
  // 날짜 표기 체크
  // =====================
  checkDate(text, results) {
    const issues = [];

    // 2024.1.1 형태 (마침표 사이 띄어쓰기 없음)
    const pattern1 = /(\d{4})\.(\d{1,2})\.(\d{1,2})(?!\.)/g;
    let match;
    while ((match = pattern1.exec(text)) !== null) {
      issues.push({
        original: match[0],
        fixed: `${match[1]}. ${match[2]}. ${match[3]}.`,
        desc: '날짜 사이에 띄어쓰기와 마침표가 필요해요',
        position: match.index
      });
    }

    // 2024.01.01 형태 (앞자리 0)
    const pattern2 = /(\d{4})\.0(\d)\.0(\d)/g;
    while ((match = pattern2.exec(text)) !== null) {
      issues.push({
        original: match[0],
        fixed: `${match[1]}. ${match[2]}. ${match[3]}.`,
        desc: '월/일 앞의 0은 표기하지 않아요',
        position: match.index
      });
    }

    // 2024년 1월 1일 형태
    const pattern3 = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
    while ((match = pattern3.exec(text)) !== null) {
      issues.push({
        original: match[0],
        fixed: `${match[1]}. ${match[2]}. ${match[3]}.`,
        desc: '공문서 날짜는 숫자와 마침표로 표기해요',
        position: match.index
      });
    }

    if (issues.length > 0) {
      results.errors.push({
        category: '날짜 표기',
        icon: '📅',
        issues: issues
      });
    } else {
      results.passed.push({
        category: '날짜 표기',
        icon: '📅',
        desc: '날짜 표기가 올바르게 되어 있어요'
      });
    }
  },

  // =====================
  // 시간 표기 체크
  // =====================
  checkTime(text, results) {
    const issues = [];

    // 오전/오후 형태
    const patterns = [
      {
        regex: /오후\s*(\d{1,2})시\s*(\d{1,2})분/g,
        convert: (h, m) => `${parseInt(h) + 12}:${m.padStart(2, '0')}`,
        desc: '시간은 24시각제로 표기해요'
      },
      {
        regex: /오전\s*(\d{1,2})시\s*(\d{1,2})분/g,
        convert: (h, m) =>
          `${parseInt(h).toString().padStart(2, '0')}:${m.padStart(2, '0')}`,
        desc: '시간은 24시각제로 표기해요'
      },
      {
        regex: /오후\s*(\d{1,2})시(?!\s*\d)/g,
        convert: (h) => `${parseInt(h) + 12}:00`,
        desc: '시간은 24시각제로 표기해요'
      },
      {
        regex: /오전\s*(\d{1,2})시(?!\s*\d)/g,
        convert: (h) =>
          `${parseInt(h).toString().padStart(2, '0')}:00`,
        desc: '시간은 24시각제로 표기해요'
      }
    ];

    patterns.forEach(p => {
      let match;
      while ((match = p.regex.exec(text)) !== null) {
        const args = match.slice(1);
        issues.push({
          original: match[0],
          fixed: p.convert(...args),
          desc: p.desc,
          position: match.index
        });
      }
    });

    if (issues.length > 0) {
      results.errors.push({
        category: '시간 표기',
        icon: '⏰',
        issues: issues
      });
    } else {
      results.passed.push({
        category: '시간 표기',
        icon: '⏰',
        desc: '시간 표기가 올바르게 되어 있어요'
      });
    }
  },

  // =====================
  // 금액 표기 체크
  // =====================
  checkMoney(text, results) {
    const issues = [];

    // 금 500,000원 (띄어쓰기)
    const pattern1 = /금\s+(\d[\d,]+)원/g;
    let match;
    while ((match = pattern1.exec(text)) !== null) {
      const amount = match[1];
      const korean = this.numberToKorean(
        parseInt(amount.replace(/,/g, ''))
      );
      issues.push({
        original: match[0],
        fixed: `금${amount}원(금${korean}원)`,
        desc: '"금"과 숫자 사이는 붙여쓰고 한글 금액을 병기해요',
        position: match.index
      });
    }

    // 금500,000원 (한글 병기 없음)
    const pattern2 = /금(\d[\d,]+)원(?!\()/g;
    while ((match = pattern2.exec(text)) !== null) {
      const amount = match[1];
      const korean = this.numberToKorean(
        parseInt(amount.replace(/,/g, ''))
      );
      issues.push({
        original: match[0],
        fixed: `금${amount}원(금${korean}원)`,
        desc: '금액 다음에 한글 금액을 괄호 안에 병기해요',
        position: match.index
      });
    }

    if (issues.length > 0) {
      results.warnings.push({
        category: '금액 표기',
        icon: '💰',
        issues: issues
      });
    } else {
      results.passed.push({
        category: '금액 표기',
        icon: '💰',
        desc: '금액 표기가 올바르게 되어 있어요'
      });
    }
  },

  // =====================
  // 문서 형식 체크
  // =====================
  checkFormat(text, results) {
    const issues = [];

    // "끝" 표시 체크
    if (text.includes('끝') && !text.includes('끝.')) {
      issues.push({
        original: '끝',
        fixed: '끝.',
        desc: '"끝" 다음에는 마침표가 필요해요',
        type: 'error'
      });
    }

    // 붙임 다음 쌍점
    if (/붙임\s*:/.test(text)) {
      issues.push({
        original: '붙임:',
        fixed: '붙임',
        desc: '"붙임" 다음에는 쌍점(:)을 쓰지 않아요',
        type: 'error'
      });
    }

    // 끝 표시 앞 띄어쓰기
    if (/바랍니다\.끝\./.test(text) ||
        /바랍니다\. 끝\./.test(text)) {
      issues.push({
        original: '바랍니다.끝.',
        fixed: '바랍니다.  끝.',
        desc: '"끝" 표시 전에 두 칸 띄어쓰기가 필요해요',
        type: 'warning'
      });
    }

    // 수신 표시 체크
    if (!text.includes('수신')) {
      issues.push({
        original: '',
        fixed: '수신란을 추가해주세요',
        desc: '공문서에는 수신란이 반드시 있어야 해요',
        type: 'error'
      });
    }

    // 제목 표시 체크
    if (!text.includes('제목')) {
      issues.push({
        original: '',
        fixed: '제목란을 추가해주세요',
        desc: '공문서에는 제목란이 반드시 있어야 해요',
        type: 'error'
      });
    }

    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(
      i => i.type === 'warning' || !i.type
    );

    if (errors.length > 0) {
      results.errors.push({
        category: '문서 형식',
        icon: '📋',
        issues: errors
      });
    }

    if (warnings.length > 0) {
      results.warnings.push({
        category: '문서 형식',
        icon: '📋',
        issues: warnings
      });
    }

    if (issues.length === 0) {
      results.passed.push({
        category: '문서 형식',
        icon: '📋',
        desc: '문서 형식이 올바르게 되어 있어요'
      });
    }
  },

  // =====================
  // 권위적 표현 체크
  // =====================
  checkAuthority(text, results) {
    const authorityList = [
      {
        regex: /제출할\s*것/g,
        fixed: '제출하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /참석\s*바람/g,
        fixed: '참석하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /협조\s*요망/g,
        fixed: '협조하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /통보함/g,
        fixed: '알려드립니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /시행할\s*것/g,
        fixed: '시행하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /제출\s*바람/g,
        fixed: '제출하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /보고\s*바람/g,
        fixed: '보고하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /제출하기\s*바람/g,
        fixed: '제출하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /처리할\s*것/g,
        fixed: '처리하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      },
      {
        regex: /준수할\s*것/g,
        fixed: '준수하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요'
      }
    ];

    const issues = [];
    authorityList.forEach(item => {
      let match;
      while ((match = item.regex.exec(text)) !== null) {
        issues.push({
          original: match[0],
          fixed: item.fixed,
          desc: item.desc,
          position: match.index
        });
      }
    });

    if (issues.length > 0) {
      results.warnings.push({
        category: '권위적 표현',
        icon: '🗣️',
        issues: issues
      });
    } else {
      results.passed.push({
        category: '권위적 표현',
        icon: '🗣️',
        desc: '권위적 표현이 없어요'
      });
    }
  },

  // =====================
  // 항목 부호 체크
  // =====================
  checkItemOrder(text, results) {
    const issues = [];
    const lines = text.split('\n');

    // 항목 부호 순서 패턴
    const orderMap = {
      '1.': 1, '2.': 1, '3.': 1, '4.': 1, '5.': 1,
      '가.': 2, '나.': 2, '다.': 2, '라.': 2, '마.': 2,
      '1)': 3, '2)': 3, '3)': 3, '4)': 3, '5)': 3,
      '가)': 4, '나)': 4, '다)': 4, '라)': 4,
      '(1)': 5, '(2)': 5, '(3)': 5, '(4)': 5,
      '(가)': 6, '(나)': 6, '(다)': 6, '(라)': 6
    };

    let prevLevel = 0;
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      for (const [symbol, level] of Object.entries(orderMap)) {
        if (trimmed.startsWith(symbol)) {
          if (level > prevLevel + 1) {
            issues.push({
              original: `${idx + 1}번째 줄: ${trimmed.substring(0, 20)}`,
              fixed: '항목 순서: 1. → 가. → 1) → 가) → (1) → (가)',
              desc: '항목 부호 순서가 올바르지 않아요',
              position: idx
            });
          }
          prevLevel = level;
          break;
        }
      }
    });

    if (issues.length > 0) {
      results.warnings.push({
        category: '항목 부호',
        icon: '🔢',
        issues: issues
      });
    } else {
      results.passed.push({
        category: '항목 부호',
        icon: '🔢',
        desc: '항목 부호가 올바르게 사용되었어요'
      });
    }
  },

  // =====================
  // 순화어 체크
  // =====================
  checkPurifyWords(text, results) {
    const issues = [];

    PURIFY_WORDS.forEach(word => {
      if (text.includes(word.original)) {
        issues.push({
          original: word.original,
          fixed: word.purified,
          desc: `${word.type} 표현이에요. 순화어로 바꿔요`,
          type: word.type
        });
      }
    });

    if (issues.length > 0) {
      results.suggestions.push({
        category: '순화어 제안',
        icon: '📖',
        issues: issues
      });
    } else {
      results.passed.push({
        category: '순화어',
        icon: '📖',
        desc: '어려운 한자어나 외래어가 없어요'
      });
    }
  },

  // =====================
  // 필수 항목 체크
  // =====================
  checkRequired(text, results) {
    const issues = [];
    const requiredItems = [
      { key: '수신', desc: '수신란이 없어요' },
      { key: '제목', desc: '제목란이 없어요' }
    ];

    requiredItems.forEach(item => {
      if (!text.includes(item.key)) {
        issues.push({
          original: '',
          fixed: `${item.key}란을 추가해주세요`,
          desc: item.desc
        });
      }
    });

    if (issues.length > 0) {
      results.errors.push({
        category: '필수 항목',
        icon: '❗',
        issues: issues
      });
    }
  },

  // =====================
  // 숫자를 한글로 변환
  // =====================
  numberToKorean(num) {
    if (num === 0) return '영';

    const units = ['', '일', '이', '삼', '사', '오',
                   '육', '칠', '팔', '구'];
    const bigUnits = ['', '만', '억', '조'];
    const smallUnits = ['', '십', '백', '천'];

    let result = '';
    let bigUnitIdx = 0;

    while (num > 0) {
      const chunk = num % 10000;
      if (chunk > 0) {
        let chunkStr = '';
        let tempChunk = chunk;
        let smallIdx = 0;

        while (tempChunk > 0) {
          const digit = tempChunk % 10;
          if (digit > 0) {
            chunkStr = units[digit] + smallUnits[smallIdx] + chunkStr;
          }
          tempChunk = Math.floor(tempChunk / 10);
          smallIdx++;
        }
        result = chunkStr + bigUnits[bigUnitIdx] + result;
      }
      num = Math.floor(num / 10000);
      bigUnitIdx++;
    }

    return result;
  },

  // =====================
  // 자동 수정 적용
  // =====================
  applyFix(text, issue) {
    if (!issue.original || issue.original === '') return text;
    return text.split(issue.original).join(issue.fixed);
  },

  // 전체 자동 수정
  applyAllFixes(text, results) {
    let fixed = text;

    [...results.errors, ...results.warnings].forEach(category => {
      if (category.issues) {
        category.issues.forEach(issue => {
          if (issue.original && issue.original !== '') {
            fixed = this.applyFix(fixed, issue);
          }
        });
      }
    });

    return fixed;
  }
};

// =====================
// 체크 결과 렌더링
// =====================
const CheckerUI = {

  // 사이드 패널 렌더링 (실시간)
  renderSidePanel(results, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (results.totalIssues === 0 && results.errors.length === 0) {
      container.innerHTML = `
        <div class="check-item success">
          <div class="check-item-title">✅ 검사 완료</div>
          <div class="check-item-desc">발견된 문제가 없어요!</div>
        </div>
      `;
      return;
    }

    let html = '';

    // 오류 항목
    results.errors.forEach(category => {
      category.issues.forEach(issue => {
        html += `
          <div class="check-item error">
            <div class="check-item-title">
              ❌ ${category.category}
            </div>
            <div class="check-item-desc">${issue.desc}</div>
            ${issue.original ? `
              <div class="check-item-fix">
                "${issue.original}" → "${issue.fixed}"
              </div>
            ` : ''}
          </div>
        `;
      });
    });

    // 경고 항목
    results.warnings.forEach(category => {
      category.issues.forEach(issue => {
        html += `
          <div class="check-item warning">
            <div class="check-item-title">
              ⚠️ ${category.category}
            </div>
            <div class="check-item-desc">${issue.desc}</div>
            ${issue.original ? `
              <div class="check-item-fix">
                "${issue.original}" → "${issue.fixed}"
              </div>
            ` : ''}
          </div>
        `;
      });
    });

    // 제안 항목
    results.suggestions.forEach(category => {
      if (category.issues.length > 0) {
        html += `
          <div class="check-item" 
            style="background:#e8f4fd;border-left:3px solid #2c5f8a">
            <div class="check-item-title">
              💡 ${category.category} (${category.issues.length}건)
            </div>
            <div class="check-item-desc">
              순화어 팝업에서 확인하세요
            </div>
          </div>
        `;
      }
    });

    // 통과 항목
    results.passed.forEach(item => {
      html += `
        <div class="check-item success">
          <div class="check-item-title">
            ${item.icon} ${item.category}
          </div>
          <div class="check-item-desc">${item.desc}</div>
        </div>
      `;
    });

    container.innerHTML = html || `
      <div class="check-item success">
        <div class="check-item-title">✅ 문제 없음</div>
      </div>
    `;
  },

  // 규칙 체크 모달 렌더링
  renderCheckModal(results) {
    const container = document.getElementById('check-modal-body');
    if (!container) return;

    let html = '';

    // 요약
    const totalErrors = results.errors.reduce(
      (acc, c) => acc + c.issues.length, 0
    );
    const totalWarnings = results.warnings.reduce(
      (acc, c) => acc + c.issues.length, 0
    );
    const totalSuggestions = results.suggestions.reduce(
      (acc, c) => acc + c.issues.length, 0
    );

    html += `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <span class="badge badge-danger">
          ❌ 오류 ${totalErrors}건
        </span>
        <span class="badge badge-warning">
          ⚠️ 경고 ${totalWarnings}건
        </span>
        <span class="badge badge-primary">
          💡 제안 ${totalSuggestions}건
        </span>
        <span class="badge badge-success">
          ✅ 통과 ${results.passed.length}건
        </span>
      </div>
    `;

    // 오류 항목
    if (results.errors.length > 0) {
      html += `
        <div class="check-result-section">
          <div class="check-result-title" style="color:#dc3545">
            ❌ 반드시 수정해야 해요
          </div>
        `;
      results.errors.forEach(category => {
        category.issues.forEach(issue => {
          html += `
            <div class="check-result-item error">
              <div><strong>${category.icon} 
                ${category.category}</strong>
              </div>
              <div>${issue.desc}</div>
              ${issue.original ? `
                <div class="mt-sm">
                  <span class="check-result-original">
                    ${escapeHtml(issue.original)}
                  </span>
                  →
                  <span class="check-result-fixed">
                    ${escapeHtml(issue.fixed)}
                  </span>
                </div>
              ` : ''}
            </div>
          `;
        });
      });
      html += `</div>`;
    }

    // 경고 항목
    if (results.warnings.length > 0) {
      html += `
        <div class="check-result-section">
          <div class="check-result-title" style="color:#856404">
            ⚠️ 수정을 권장해요
          </div>
        `;
      results.warnings.forEach(category => {
        category.issues.forEach(issue => {
          html += `
            <div class="check-result-item warning">
              <div><strong>${category.icon} 
                ${category.category}</strong>
              </div>
              <div>${issue.desc}</div>
              ${issue.original ? `
                <div class="mt-sm">
                  <span class="check-result-original">
                    ${escapeHtml(issue.original)}
                  </span>
                  →
                  <span class="check-result-fixed">
                    ${escapeHtml(issue.fixed)}
                  </span>
                </div>
              ` : ''}
            </div>
          `;
        });
      });
      html += `</div>`;
    }

    // 통과 항목
    if (results.passed.length > 0) {
      html += `
        <div class="check-result-section">
          <div class="check-result-title" style="color:#28a745">
            ✅ 통과한 항목
          </div>
        `;
      results.passed.forEach(item => {
        html += `
          <div class="check-result-item success">
            <strong>${item.icon} ${item.category}</strong>
            <div>${item.desc}</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;

    // 자동수정 버튼 표시 여부
    const autoFixBtn = document.getElementById('auto-fix-btn');
    if (autoFixBtn) {
      autoFixBtn.style.display =
        results.totalIssues > 0 ? 'inline-flex' : 'none';
    }
  },

  // 순화어 모달 렌더링
  renderPurifyModal(results) {
    const container = document.getElementById('purify-modal-body');
    if (!container) return;

    const suggestions = results.suggestions.find(
      s => s.category === '순화어 제안'
    );

    if (!suggestions || suggestions.issues.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span>✅</span>
          <p>순화가 필요한 단어가 없어요!</p>
        </div>
      `;
      return;
    }

    // 타입별 분류
    const byType = {};
    suggestions.issues.forEach(issue => {
      const type = issue.type || '기타';
      if (!byType[type]) byType[type] = [];
      byType[type].push(issue);
    });

    let html = `
      <p style="font-size:13px;color:#6c757d;margin-bottom:16px">
        행을 클릭하면 해당 단어를 자동으로 바꿔줘요
      </p>
      <table class="purify-table">
        <thead>
          <tr>
            <th>원래 단어</th>
            <th>순화어</th>
            <th>유형</th>
          </tr>
        </thead>
        <tbody>
    `;

    suggestions.issues.forEach(issue => {
      html += `
        <tr onclick="applyPurifyWord(
          '${escapeHtml(issue.original)}',
          '${escapeHtml(issue.fixed)}'
        )">
          <td style="color:#dc3545;font-weight:600">
            ${escapeHtml(issue.original)}
          </td>
          <td style="color:#28a745;font-weight:600">
            ${escapeHtml(issue.fixed)}
          </td>
          <td>
            <span class="purify-badge ${issue.type}">
              ${issue.type}
            </span>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }
};

// =====================
// 순화어 적용 함수
// =====================
function applyPurifyWord(original, fixed) {
  const textarea = document.getElementById('editor-content');
  if (!textarea) return;

  const before = textarea.value;
  textarea.value = before.split(original).join(fixed);

  if (before !== textarea.value) {
    showToast(
      `"${original}" → "${fixed}" 로 바꿨어요`,
      'success'
    );
    // 실시간 체크 재실행
    if (typeof runRealtimeCheck === 'function') {
      runRealtimeCheck();
    }
  }
}
