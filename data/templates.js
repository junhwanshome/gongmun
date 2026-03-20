// data/templates.js
// 공문서 템플릿 데이터

const TEMPLATES = {

  // =====================
  // 1. 내부결재
  // =====================
  internal: {
    id: 'internal',
    name: '내부결재',
    icon: '📋',
    desc: '기관 내부 결재용 문서',
    fields: {
      receiver: '내부결재',
      via: '',
      title: '',
      body: '',
      attachments: []
    },
    content: `수신  내부결재
(경유)
제목  {title}

{body}

{attachments}`,
    guide: [
      '수신란에는 반드시 "내부결재"로 표시해요',
      '발신명의는 표시하지 않아요',
      '제목은 내용을 간단명확하게 표현해요',
      '본문은 육하원칙에 따라 작성해요'
    ],
    example: {
      title: '2024년 상반기 프로그램 운영 계획',
      body: `2024년 상반기 프로그램을 아래와 같이 운영하고자 합니다.

1. 운영 개요
   가. 기간: 2024. 1. 1. ~ 2024. 6. 30.
   나. 장소: 본관 1층 프로그램실
   다. 대상: 지역 어르신 30명

2. 세부 내용
   가. 프로그램명: 건강체조교실
   나. 운영횟수: 주 2회(화, 목)
   다. 소요예산: 금500,000원(금오십만원)`
    }
  },

  // =====================
  // 2. 지자체 보고용
  // =====================
  government: {
    id: 'government',
    name: '지자체 보고용',
    icon: '🏛️',
    desc: '시청/구청 등 지자체 보고 문서',
    fields: {
      receiver: '',
      receiverDept: '',
      via: '',
      title: '',
      body: '',
      attachments: []
    },
    content: `수신  {receiver}({receiverDept})
(경유)
제목  {title}

{body}

{attachments}`,
    guide: [
      '수신란에 기관장 직위를 정확히 써요',
      '괄호 안에 담당부서 과장을 표시해요',
      '경어체를 반드시 사용해요',
      '붙임 서류 목록을 정확히 작성해요',
      '끝. 표시를 반드시 해요'
    ],
    example: {
      receiver: '○○시장',
      receiverDept: '사회복지과장',
      title: '2024년 사회복지시설 운영현황 보고',
      body: `「사회복지사업법」제34조에 따라 2024년 사회복지시설 운영현황을 
아래와 같이 보고드립니다.

1. 시설 현황
   가. 시설명: ○○사회복지관
   나. 위치: ○○시 ○○구 ○○로 123
   다. 정원: 100명

2. 운영 현황
   가. 이용자 현황: 총 85명(남 40명, 여 45명)
   나. 종사자 현황: 총 15명
   다. 주요 프로그램: 재가복지, 지역사회조직, 문화여가`
    }
  },

  // =====================
  // 3. 타기관 협조
  // =====================
  cooperation: {
    id: 'cooperation',
    name: '타기관 협조',
    icon: '🤝',
    desc: '타기관 협조 요청 문서',
    fields: {
      receiver: '',
      receiverDept: '',
      via: '',
      title: '',
      related: '',
      body: '',
      attachments: []
    },
    content: `수신  {receiver}({receiverDept})
(경유)
제목  {title}

{related}

{body}

{attachments}`,
    guide: [
      '수신란에 협조 요청 기관장 직위를 써요',
      '관련 근거가 있으면 먼저 표시해요',
      '협조 요청 내용을 구체적으로 써요',
      '기한을 명시해요',
      '"협조하여 주시기 바랍니다"로 마무리해요'
    ],
    example: {
      receiver: '○○사회복지협의회장',
      receiverDept: '사무국장',
      title: '2024년 지역사회 복지네트워크 구축 협조 요청',
      related: '1. 관련: ○○복지관-123(2024. 1. 15.)',
      body: `지역사회 복지서비스 향상을 위하여 아래와 같이 협조를 요청드리오니 
적극 협조하여 주시기 바랍니다.

1. 협조 내용
   가. 일시: 2024. 2. 1.(목) 14:00~16:00
   나. 장소: ○○사회복지관 대회의실
   다. 내용: 지역사회 복지네트워크 구축 협의

2. 협조 요청 사항
   가. 소속 기관 담당자 1명 참석
   나. 기관 현황 자료 사전 제출(2024. 1. 25.까지)`
    }
  },

  // =====================
  // 4. 후원자 감사
  // =====================
  sponsor: {
    id: 'sponsor',
    name: '후원자 감사',
    icon: '💝',
    desc: '후원자 감사 공문',
    fields: {
      receiver: '',
      receiverAddress: '',
      title: '',
      body: '',
      attachments: []
    },
    content: `수신  {receiver} 귀하({receiverAddress})
(경유)
제목  {title}

{body}

{attachments}`,
    guide: [
      '수신란에 후원자 성명과 주소를 써요',
      '성명 다음에 "귀하"를 붙여요',
      '감사의 마음을 성의있게 표현해요',
      '후원 내용을 구체적으로 언급해요',
      '너무 딱딱하지 않게 써요'
    ],
    example: {
      receiver: '홍길동',
      receiverAddress: '우12345 ○○시 ○○구 ○○로 123',
      title: '후원금 접수 감사 인사',
      body: `평소 저희 ○○사회복지관에 보내주시는 따뜻한 관심과 성원에 
깊은 감사를 드립니다.

이번에 보내주신 소중한 후원금은 지역 어르신들의 복지 향상을 위해 
소중하게 사용하겠습니다.

귀하의 따뜻한 나눔이 어려운 이웃들에게 큰 힘이 됩니다.
앞으로도 변함없는 관심과 사랑을 부탁드리며, 귀하 가정에 
항상 건강과 행복이 가득하시길 기원합니다.`
    }
  },

  // =====================
  // 5. 행사 안내
  // =====================
  event: {
    id: 'event',
    name: '행사 안내',
    icon: '📢',
    desc: '행사 및 모임 안내 문서',
    fields: {
      receiver: '',
      receiverDept: '',
      via: '',
      title: '',
      related: '',
      purpose: '',
      datetime: '',
      location: '',
      target: '',
      content: '',
      attachments: []
    },
    content: `수신  {receiver}({receiverDept})
(경유)
제목  {title}

{related}

{purpose}

1. 일시: {datetime}
2. 장소: {location}
3. 대상: {target}
4. 내용: {content}

{attachments}`,
    guide: [
      '제목에 행사명을 명확히 써요',
      '일시는 날짜와 시간을 모두 써요',
      '장소는 상세 주소까지 써요',
      '참석 대상을 명확히 써요',
      '문의처를 포함하면 좋아요',
      '"참석하여 주시기 바랍니다"로 마무리해요'
    ],
    example: {
      receiver: '수신자 참조',
      receiverDept: '담당자',
      title: '2024년 상반기 지역복지 네트워크 회의 개최 안내',
      related: '1. 관련: ○○복지관-456(2024. 1. 20.)',
      purpose: `지역사회 복지 향상을 위한 네트워크 회의를 아래와 같이 개최하오니 
많은 참석 바랍니다.`,
      datetime: '2024. 2. 15.(목) 14:00~16:00',
      location: '○○사회복지관 3층 대회의실',
      target: '지역 복지기관 담당자',
      content: '지역복지 현황 공유 및 협력 방안 논의'
    }
  }
};

// =====================
// 결재란 기본 설정
// =====================
const DEFAULT_APPROVAL = {
  levels: [
    { title: '담당', name: '' },
    { title: '과장', name: '' },
    { title: '관장', name: '' }
  ]
};

// =====================
// 자주 쓰는 수신처
// =====================
const DEFAULT_RECEIVERS = [
  { name: '○○시장', dept: '사회복지과장' },
  { name: '○○구청장', dept: '복지정책과장' },
  { name: '○○사회복지협의회장', dept: '사무국장' },
  { name: '○○교육지원청교육장', dept: '교육복지과장' },
  { name: '○○보건소장', dept: '건강증진과장' }
];
