// data/rules.js
// 공문서 규칙 데이터

const RULES = {

  date: {
    name: '날짜 표기',
    patterns: [
      {
        regex: /(\d{4})\.(\d{1,2})\.(\d{1,2})(?!\.)/g,
        fix: (match, y, m, d) => `${y}. ${m}. ${d}.`,
        desc: '날짜 사이에 띄어쓰기와 마침표가 필요해요',
        example: '2024.1.1 → 2024. 1. 1.'
      },
      {
        regex: /(\d{4})\.0(\d)\.0(\d)/g,
        fix: (match, y, m, d) => `${y}. ${m}. ${d}.`,
        desc: '월/일 앞의 0은 표기하지 않아요',
        example: '2024.01.01 → 2024. 1. 1.'
      },
      {
        regex: /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g,
        fix: (match, y, m, d) => `${y}. ${m}. ${d}.`,
        desc: '공문서 날짜는 숫자와 마침표로 표기해요',
        example: '2024년 1월 1일 → 2024. 1. 1.'
      }
    ]
  },

  time: {
    name: '시간 표기',
    patterns: [
      {
        regex: /오후\s*(\d{1,2})시\s*(\d{1,2})분/g,
        fix: (match, h, m) =>
          `${parseInt(h)+12}:${m.padStart(2,'0')}`,
        desc: '시간은 24시각제로 표기해요',
        example: '오후 3시 30분 → 15:30'
      },
      {
        regex: /오전\s*(\d{1,2})시\s*(\d{1,2})분/g,
        fix: (match, h, m) =>
          `${parseInt(h).toString().padStart(2,'0')}:${m.padStart(2,'0')}`,
        desc: '시간은 24시각제로 표기해요',
        example: '오전 9시 30분 → 09:30'
      },
      {
        regex: /오후\s*(\d{1,2})시(?!\s*\d)/g,
        fix: (match, h) => `${parseInt(h)+12}:00`,
        desc: '시간은 24시각제로 표기해요',
        example: '오후 3시 → 15:00'
      },
      {
        regex: /오전\s*(\d{1,2})시(?!\s*\d)/g,
        fix: (match, h) =>
          `${parseInt(h).toString().padStart(2,'0')}:00`,
        desc: '시간은 24시각제로 표기해요',
        example: '오전 9시 → 09:00'
      }
    ]
  },

  money: {
    name: '금액 표기',
    patterns: [
      {
        regex: /금\s+(\d[\d,]+)원/g,
        fix: (match, amount) => `금${amount}원`,
        desc: '"금"과 숫자 사이는 붙여써요',
        example: '금 500,000원 → 금500,000원'
      }
    ]
  },

  format: {
    name: '문서 형식',
    patterns: [
      {
        regex: /끝(?!\.)/g,
        fix: () => '끝.',
        desc: '"끝" 다음에는 마침표가 필요해요',
        example: '끝 → 끝.'
      },
      {
        regex: /붙임\s*:/g,
        fix: () => '붙임',
        desc: '"붙임" 다음에는 쌍점을 쓰지 않아요',
        example: '붙임: → 붙임'
      }
    ]
  },

  authority: {
    name: '권위적 표현',
    patterns: [
      {
        regex: /제출할\s*것/g,
        fix: () => '제출하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '제출할 것 → 제출하여 주시기 바랍니다'
      },
      {
        regex: /참석\s*바람/g,
        fix: () => '참석하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '참석 바람 → 참석하여 주시기 바랍니다'
      },
      {
        regex: /협조\s*요망/g,
        fix: () => '협조하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '협조 요망 → 협조하여 주시기 바랍니다'
      },
      {
        regex: /통보함/g,
        fix: () => '알려드립니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '통보함 → 알려드립니다'
      },
      {
        regex: /시행할\s*것/g,
        fix: () => '시행하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '시행할 것 → 시행하여 주시기 바랍니다'
      },
      {
        regex: /제출\s*바람/g,
        fix: () => '제출하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '제출 바람 → 제출하여 주시기 바랍니다'
      },
      {
        regex: /보고\s*바람/g,
        fix: () => '보고하여 주시기 바랍니다',
        desc: '권위적 표현은 부드럽게 바꿔요',
        example: '보고 바람 → 보고하여 주시기 바랍니다'
      }
    ]
  },

  itemOrder: {
    name: '항목 부호',
    correct: ['1.','가.','1)','가)','(1)','(가)','①','㉮'],
    desc: '항목 부호 순서: 1. → 가. → 1) → 가) → (1) → (가) → ① → ㉮'
  }
};

const PURIFY_WORDS = [
  { original: '금번', purified: '이번', type: '한자어' },
  { original: '상기', purified: '위', type: '한자어' },
  { original: '당해', purified: '해당', type: '한자어' },
  { original: '향후', purified: '앞으로', type: '한자어' },
  { original: '익일', purified: '다음날', type: '한자어' },
  { original: '차기', purified: '다음', type: '한자어' },
  { original: '상이한', purified: '서로 다른', type: '한자어' },
  { original: '제고', purified: '높이다', type: '한자어' },
  { original: '만전', purified: '최선', type: '한자어' },
  { original: '조속히', purified: '빨리', type: '한자어' },
  { original: '불식', purified: '없애다', type: '한자어' },
  { original: '천명', purified: '밝히다', type: '한자어' },
  { original: '도합', purified: '합계', type: '한자어' },
  { original: '잔고', purified: '잔액', type: '한자어' },
  { original: '견습', purified: '수습', type: '일본어투' },
  { original: '구좌', purified: '계좌', type: '일본어투' },
  { original: '납기', purified: '납부 기한', type: '일본어투' },
  { original: '고참', purified: '선임', type: '일본어투' },
  { original: '홈페이지', purified: '누리집', type: '외래어' },
  { original: '이메일', purified: '전자우편', type: '외래어' },
  { original: '매뉴얼', purified: '지침/안내서', type: '외래어' },
  { original: '컨설팅', purified: '상담/자문', type: '외래어' },
  { original: '워크숍', purified: '공동연수회', type: '외래어' },
  { original: '인프라', purified: '기반시설', type: '외래어' },
  { original: '모니터링', purified: '점검/감시', type: '외래어' },
  { original: '로드맵', purified: '단계별 이행안', type: '외래어' },
  { original: '네트워크', purified: '연결망', type: '외래어' },
  { original: '플랫폼', purified: '기반 환경', type: '외래어' }
];

const REQUIRED_ITEMS = {
  internal: {
    name: '내부결재',
    required: ['수신', '제목'],
    optional: ['붙임']
  },
  government: {
    name: '지자체 보고용',
    required: ['수신', '제목', '끝.'],
    optional: ['붙임', '경유']
  },
  cooperation: {
    name: '타기관 협조',
    required: ['수신', '제목', '끝.'],
    optional: ['붙임', '경유']
  },
  sponsor: {
    name: '후원자 감사',
    required: ['수신', '제목', '끝.'],
    optional: ['붙임']
  },
  event: {
    name: '행사 안내',
    required: ['수신', '제목', '일시', '장소', '끝.'],
    optional: ['붙임', '대상', '내용']
  }
};
