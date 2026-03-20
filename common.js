// js/common.js 하단에 추가

// =====================
// 로고 이미지 관리
// =====================
const LogoManager = {

  // 로고 저장
  save(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject('파일이 없어요');
        return;
      }

      // 파일 크기 체크 (2MB 이하)
      if (file.size > 2 * 1024 * 1024) {
        reject('파일 크기는 2MB 이하여야 해요');
        return;
      }

      // 이미지 파일 체크
      if (!file.type.startsWith('image/')) {
        reject('이미지 파일만 업로드 가능해요');
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          localStorage.setItem(
            'doc_logo',
            e.target.result
          );
          resolve(e.target.result);
        } catch (err) {
          reject('저장 실패! 용량을 확인해주세요');
        }
      };

      reader.onerror = () => {
        reject('파일 읽기 실패');
      };

      reader.readAsDataURL(file);
    });
  },

  // 로고 불러오기
  get() {
    return localStorage.getItem('doc_logo') || null;
  },

  // 로고 삭제
  remove() {
    localStorage.removeItem('doc_logo');
  },

  // 로고 있는지 확인
  exists() {
    return !!localStorage.getItem('doc_logo');
  }
};

// =====================
// 기관 설정 확장
// (하단 주소 정보 추가)
// =====================
const ExtendedStorage = {

  // 기관 상세 정보 저장
  getOrgDetail() {
    const data = localStorage.getItem('doc_org_detail');
    return data ? JSON.parse(data) : {
      zipCode: '',
      address: '',
      homepage: '',
      tel: '',
      fax: '',
      email: '',
      disclosure: '공개'
    };
  },

  saveOrgDetail(detail) {
    localStorage.setItem(
      'doc_org_detail',
      JSON.stringify(detail)
    );
  }
};
