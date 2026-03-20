/**
 * data/rules.js
 * 공문서 규칙 데이터
 */

/* ════════════════════════════════════════════════════════
   RULES - 규칙 패턴 정의
════════════════════════════════════════════════════════ */
var RULES = {

  // ── 날짜 형식 ──────────────────────────────────────────
  date: {
    label: '날짜 형식',
    patterns: [
      {
        // 2024.1.1 → 2024. 1. 1.
        regex: /(\d{4})\.(\d{1,2})\.(\d{1,2})(?!\.)/g,
        fix: function(m, y, mo, d) {
          return y + '. ' + parseInt(mo) + '. ' + parseInt(d) + '.';
        },
        desc: '날짜는 "연. 월. 일." 형식으로 숫자 뒤에 마침표와 공백을 사용합니다.'
      },
      {
        // 2024/01/01 → 2024. 1. 1.
        regex: /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
        fix: function(m, y, mo, d) {
          return y + '. ' + parseInt(mo) + '. ' + parseInt(d) + '.';
        },
        desc: '날짜 구분자는 슬래시(/) 대신 마침표(.)를 사용합니다.'
      },
      {
        // 2024-01-01 → 2024. 1. 1.
        regex: /(\d{4})-(\d{1,2})-(\d{1,2})/g,
        fix: function(m, y, mo, d) {
          return y + '. ' + parseInt(mo) + '. ' + parseInt(d) + '.';
        },
        desc: '날짜 구분자는 하이픈(-) 대신 마침표(.)를 사용합니다.'
      }
    ]
  },

  // ── 시간 형식 ──────────────────────────────────────────
  time: {
    label: '시간 형식',
    patterns: [
      {
        regex: /오전\s*(\d{1,2})시\s*(?:(\d{1,2})분)?/g,
        fix: function(m, h, min) {
          var hour = parseInt(h);
          if (hour === 12) hour = 0;
          var minute = min ? parseInt(min) : 0;
          return String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0');
        },
        desc: '시간은 24시간제로 표기합니다.'
      },
      {
        regex: /오후\s*(\d{1,2})시\s*(?:(\d{1,2})분)?/g,
        fix: function(m, h, min) {
          var hour = parseInt(h);
          if (hour !== 12) hour += 12;
          var minute = min ? parseInt(min) : 0;
          return String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0');
        },
        desc: '시간은 24시간제로 표기합니다.'
      }
    ]
  },

  // ── 금액 형식 ──────────────────────────────────────────
  money: {
    label: '금액 형식',
    patterns: [
      {
        regex: /금\s+(\d[\d,]*원)/g,
        fix: function(m, amount) { return '금' + amount; },
        desc: '"금"과 금액 사이에 공백을 넣지 않습니다.'
      }
    ]
  },

  // ── 문서 형식 ──────────────────────────────────────────
  format: {
    label: '문서 형식',
    patterns: [
      {
        regex: /붙임:/g,
        fix: function() { return '붙임'; },
        desc: '붙임 표기 시 콜론(:)을 사용하지 않습니다.'
      },
      {
        regex: /별첨/g,
        fix: function() { return '붙임'; },
        desc: '"별첨" 대신 "붙임"을 사용합니다.'
      }
    ]
  },

  // ── 권위적 표현 ────────────────────────────────────────
  authority: {
    label: '권위적 표현',
    patterns: [
      { regex: /제출할\s*것/g,     fix: function(){ return '제출하여 주시기 바랍니다'; } },
      { regex: /참석\s*바람/g,     fix: function(){ return '참석하여 주시기 바랍니다'; } },
      { regex: /협조\s*요망/g,     fix: function(){ return '협조하여 주시기 바랍니다'; } },
      { regex: /통보함/g,          fix: function(){ return '알려드립니다'; } },
      { regex: /시행할\s*것/g,     fix: function(){ return '시행하여 주시기 바랍니다'; } },
      { regex: /제출\s*요망/g,     fix: function(){ return '제출하여 주시기 바랍니다'; } },
      { regex: /참고\s*바람/g,     fix: function(){ return '참고하시기 바랍니다'; } },
      { regex: /검토\s*요망/g,     fix: function(){ return '검토하여 주시기 바랍니다'; } },
      { regex: /보고\s*바람/g,     fix: function(){ return '보고하여 주시기 바랍니다'; } },
      { regex: /통보할\s*것/g,     fix: function(){ return '알려 주시기 바랍니다'; } },
      { regex: /처리할\s*것/g,     fix: function(){ return '처리하여 주시기 바랍니다'; } },
      { regex: /조치할\s*것/g,     fix: function(){ return '조치하여 주시기 바랍니다'; } },
      { regex: /할\s*것임/g,       fix: function(){ return '하겠습니다'; } }
    ]
  },

  // ── 항목 기호 순서 ─────────────────────────────────────
  itemOrder: {
    label: '항목 기호',
    order: ['1.','가.','1)','가)','(1)','(가)']
  }
};

/* ════════════════════════════════════════════════════════
   PURIFY_WORDS - 순화 권장 단어
════════════════════════════════════════════════════════ */
var PURIFY_WORDS = [
  // 한자어
  { word:'금번',   replace:'이번',     category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'상기',   replace:'위',       category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'당해',   replace:'해당',     category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'향후',   replace:'앞으로',   category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'익일',   replace:'다음날',   category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'차기',   replace:'다음',     category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'조속히', replace:'빨리',     category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'만전을', replace:'최선을',   category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'제고',   replace:'높이다',   category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'상이한', replace:'서로 다른',category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'하기',   replace:'아래',     category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'좌기',   replace:'아래',     category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'여하',   replace:'어떠한',   category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'위하',   replace:'위하여',   category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },
  { word:'불구하고', replace:'그러나', category:'한자어', desc:'한자어를 쉬운 우리말로 바꿉니다.' },

  // 일본식 표현
  { word:'견습',   replace:'수습',     category:'일본식 표현', desc:'일본식 표현을 우리말로 바꿉니다.' },
  { word:'잔고',   replace:'잔액',     category:'일본식 표현', desc:'일본식 표현을 우리말로 바꿉니다.' },
  { word:'수취인', replace:'받는 사람',category:'일본식 표현', desc:'일본식 표현을 우리말로 바꿉니다.' },
  { word:'납기일', replace:'납부 기한',category:'일본식 표현', desc:'일본식 표현을 우리말로 바꿉니다.' },
  { word:'절취선', replace:'자르는 선',category:'일본식 표현', desc:'일본식 표현을 우리말로 바꿉니다.' },

  // 어려운 행정 용어
  { word:'시달',   replace:'알림',     category:'행정 용어', desc:'어려운 행정 용어를 쉽게 바꿉니다.' },
  { word:'구비서류', replace:'필요 서류', category:'행정 용어', desc:'어려운 행정 용어를 쉽게 바꿉니다.' },
  { word:'첨부서류', replace:'붙임 서류', category:'행정 용어', desc:'어려운 행정 용어를 쉽게 바꿉니다.' },
  { word:'기히',   replace:'이미',     category:'행정 용어', desc:'어려운 행정 용어를 쉽게 바꿉니다.' },
  { word:'여사히', replace:'이와 같이', category:'행정 용어', desc:'어려운 행정 용어를 쉽게 바꿉니다.' }
];

/* ════════════════════════════════════════════════════════
   REQUIRED_ITEMS - 필수 항목 정의
════════════════════════════════════════════════════════ */
var REQUIRED_ITEMS = {
  internal:    { required: ['receiver','title','body'], optional: ['attachments'] },
  government:  { required: ['receiver','title','body'], optional: ['via','related','attachments'] },
  cooperation: { required: ['receiver','title','body'], optional: ['via','related','attachments'] },
  sponsor:     { required: ['receiver','title'],        optional: ['body','attachments'] },
  event:       { required: ['receiver','title','datetime','location'], optional: ['target','body','attachments'] }
};
