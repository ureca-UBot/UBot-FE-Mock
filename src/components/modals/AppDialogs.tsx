import { useEffect, useRef } from 'react';

export type AppDialog = 'faq' | 'reserve' | 'bundle' | 'demo' | null;

interface AppDialogsProps {
  activeDialog: AppDialog;
  selectedStore: string;
  onClose: () => void;
}

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);
  return ref;
}

export function AppDialogs({ activeDialog, selectedStore, onClose }: AppDialogsProps) {
  const faqRef = useDialog(activeDialog === 'faq', onClose);
  const reserveRef = useDialog(activeDialog === 'reserve', onClose);
  const bundleRef = useDialog(activeDialog === 'bundle', onClose);
  const demoRef = useDialog(activeDialog === 'demo', onClose);
  return (
    <>
<dialog className="modal faq-modal" id="faqDialog" ref={faqRef}>
  <form method="dialog">
    <div className="modal-head"><div><small>FAQ 등록</small><h3>미응답 질문을 새 FAQ로 등록</h3></div><button value="cancel">×</button></div>
    <label><span>질문</span><input id="faqQuestion" defaultValue="위성 인터넷 서비스도 되나요?" /></label>
    <label><span>답변</span><textarea id="faqAnswer">현재 U봇에서는 위성 인터넷 상품을 제공하지 않습니다. 제공 가능한 인터넷 상품은 지역별 설치 가능 여부를 확인해 주세요.</textarea></label>
    <label><span>카테고리</span><select><option>인터넷 &gt; 가입/상품</option><option>인터넷 &gt; 장애</option></select></label>
    <button id="faqSubmit" className="black-btn modal-full" value="default">FAQ 등록 + Vector DB 반영</button>
  </form>
</dialog>

{/*Reserve modal*/}
<dialog className="modal" id="reserveDialog" ref={reserveRef}>
  <form method="dialog">
    <div className="modal-head"><div><small>방문 예약</small><h3 id="reserveStoreName">{selectedStore}</h3></div><button value="cancel">×</button></div>
    <label><span>방문 날짜</span><input defaultValue="2026-09-12" /></label>
    <label><span>방문 시간</span><select><option>14:00</option><option>15:00</option><option>16:00</option></select></label>
    <label><span>상담 업무</span><select><option>휴대폰 구매 상담</option><option>요금제 변경</option><option>기기변경</option></select></label>
    <button id="reserveSubmit" className="black-btn modal-full" value="default">예약 완료</button>
  </form>
</dialog>

{/*Bundle modal*/}
<dialog className="modal" id="bundleDialog" ref={bundleRef}>
  <form method="dialog">
    <div className="modal-head"><div><small>결합 변경</small><h3>인터넷 결합으로 변경할까요?</h3></div><button value="cancel">×</button></div>
    <div className="bundle-preview"><span>현재</span><b>5G 스탠다드</b><i>＋</i><span>추가</span><b>기가 인터넷 500M</b><p>시연용 예상 할인: 월 11,000원</p></div>
    <button id="bundleSubmit" className="black-btn modal-full" value="default">변경 완료</button>
  </form>
</dialog>

{/*Admin store form*/}
<dialog className="modal admin-store-dialog" id="adminStoreDialog">
  <form id="adminStoreForm" autoComplete="off">
    <div className="modal-head"><div><small>STORE MANAGEMENT</small><h3 id="adminStoreFormTitle">매장 등록</h3></div><button id="adminStoreDialogClose" type="button" aria-label="닫기">×</button></div>
    <input id="adminStoreId" type="hidden" />
    <div className="admin-store-form-grid">
      <label className="admin-store-form-wide"><span>매장명</span><input id="adminStoreName" name="storeName" maxLength={150} required /></label>
      <label><span>시/도</span><input id="adminStoreSido" name="sido" maxLength={50} readOnly required /></label>
      <label><span>시/군/구</span><input id="adminStoreSigungu" name="sigungu" maxLength={50} readOnly required /></label>
      <label className="admin-store-form-wide"><span>주소</span><div className="admin-address-field"><input id="adminStoreAddress" name="address" maxLength={500} readOnly required /><button id="adminStoreAddressSearch" type="button">주소 검색</button></div></label>
      <label><span>위도</span><input id="adminStoreLatitude" name="latitude" type="number" min="33" max="39" step="any" readOnly required /></label>
      <label><span>경도</span><input id="adminStoreLongitude" name="longitude" type="number" min="124" max="132" step="any" readOnly required /></label>
      <label><span>전화번호</span><input id="adminStorePhone" name="storePhoneNumber" maxLength={30} autoComplete="off" placeholder="02-1234-5678" /></label>
      <label><span>영업시간</span><input id="adminStoreHours" name="businessHours" placeholder="10:00-19:00" /></label>
      <fieldset className="admin-service-options admin-store-form-wide"><legend>제공 서비스</legend>
        <label><input type="checkbox" name="adminServiceCode" defaultValue="IDENTITY_THEFT_REPORT" /><span>명의도용 접수</span></label>
        <label><input type="checkbox" name="adminServiceCode" defaultValue="APPLE_AS" /><span>애플 A/S</span></label>
        <label><input type="checkbox" name="adminServiceCode" defaultValue="FOREIGN_LANGUAGE_SUPPORT" /><span>외국어 지원</span></label>
      </fieldset>
    </div>
    <p className="admin-store-form-message" id="adminStoreFormMessage" role="alert"></p>
    <button className="black-btn modal-full" id="adminStoreSubmit" type="submit">등록하기</button>
  </form>
</dialog>

{/*Demo palette*/}
<dialog className="demo-dialog" id="demoDialog" ref={demoRef}>
  <div className="demo-head"><div><small>DEMO SCENARIOS</small><h3>시연 시나리오 바로 실행</h3></div><button id="demoClose">×</button></div>
  <div className="demo-grid">
    <button data-demo="1"><b>01</b><span>실검 → 최신폰</span></button>
    <button data-demo="2"><b>02</b><span>FAQ 미응답</span></button>
    <button data-demo="3"><b>03</b><span>응답 실패 → 재시도</span></button>
    <button data-demo="4"><b>04</b><span>로그인 유도</span></button>
    <button data-demo="5"><b>05</b><span>세션 승계</span></button>
    <button data-demo="6"><b>06</b><span>모호 질문 재질문</span></button>
    <button data-demo="7"><b>07</b><span>관리자 FAQ</span></button>
    <button data-demo="8"><b>08</b><span>캐시 효과</span></button>
    <button data-demo="9"><b>09</b><span>매장 예약</span></button>
    <button data-demo="10"><b>10</b><span>운영 대시보드</span></button>
  </div>
</dialog>
    </>
  );
}
