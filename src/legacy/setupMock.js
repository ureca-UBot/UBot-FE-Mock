export function setupMock() {
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={
  loggedIn:false,
  faqSatellite:false,
  cachePrimed:false,
  cacheHit:false,
  failNext:false,
  selectedStore:"U봇 강남직영점",
  threadId:"GUEST-8F21",
  messages:[],
  pendingAfterLogin:null,
  lastUserIntent:null,
  unanswered:["위성 인터넷 서비스도 되나요?"],
  questionCount:1284
};

const titles={home:"U봇",store:"스토어",product:"상품 상세",my:"MY",benefits:"혜택",network:"통신 상태",stores:"매장 찾기",ai:"AI 검색",admin:"운영"};

const desktopHeader=$(".desktop-header");
const syncHeader=()=>desktopHeader?.classList.toggle("scrolled",window.scrollY>28);
syncHeader();
window.addEventListener("scroll",syncHeader,{passive:true});

const heroCarousel=$(".hero-carousel");
if(heroCarousel){
  const heroSlides=$$(".hero-slide",heroCarousel), heroDots=$$(".hero-dot",heroCarousel);
  const heroPrev=$(".hero-prev",heroCarousel), heroNext=$(".hero-next",heroCarousel);
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let heroIndex=0, heroTimer=null, heroPaused=false;

  const stopHero=()=>{if(heroTimer){clearInterval(heroTimer);heroTimer=null}};
  const goHero=(next,{restart=true}={})=>{
    if(!heroSlides.length)return;
    heroIndex=(next+heroSlides.length)%heroSlides.length;
    heroSlides.forEach((slide,i)=>{
      const active=i===heroIndex;
      slide.classList.toggle("active",active);
      slide.setAttribute("aria-hidden",active?"false":"true");
    });
    heroDots.forEach((dot,i)=>{
      const active=i===heroIndex;
      dot.classList.toggle("active",active);
      if(active)dot.setAttribute("aria-current","true");else dot.removeAttribute("aria-current");
    });
    heroCarousel.dataset.current=String(heroIndex);
    if(restart)startHero();
  };
  const startHero=()=>{
    stopHero();
    if(reduceMotion||heroPaused||heroSlides.length<2||document.hidden)return;
    heroTimer=setInterval(()=>goHero(heroIndex+1,{restart:false}),5800);
  };
  const pauseHero=()=>{heroPaused=true;heroCarousel.classList.add("paused");stopHero()};
  const resumeHero=()=>{heroPaused=false;heroCarousel.classList.remove("paused");startHero()};

  heroDots.forEach(dot=>dot.addEventListener("click",()=>goHero(Number(dot.dataset.heroGo))));
  heroPrev?.addEventListener("click",()=>goHero(heroIndex-1));
  heroNext?.addEventListener("click",()=>goHero(heroIndex+1));
  heroCarousel.addEventListener("mouseenter",pauseHero);
  heroCarousel.addEventListener("mouseleave",resumeHero);
  if(!reduceMotion){
    heroCarousel.addEventListener("pointermove",e=>{
      const rect=heroCarousel.getBoundingClientRect();
      const x=((e.clientX-rect.left)/rect.width-.5)*10;
      const y=((e.clientY-rect.top)/rect.height-.5)*7;
      heroCarousel.style.setProperty("--hero-x",x.toFixed(2));
      heroCarousel.style.setProperty("--hero-y",y.toFixed(2));
    });
    heroCarousel.addEventListener("pointerleave",()=>{
      heroCarousel.style.setProperty("--hero-x","0");
      heroCarousel.style.setProperty("--hero-y","0");
    });
  }
  heroCarousel.addEventListener("focusin",pauseHero);
  heroCarousel.addEventListener("focusout",()=>setTimeout(()=>{if(!heroCarousel.contains(document.activeElement))resumeHero()},0));
  document.addEventListener("visibilitychange",()=>document.hidden?stopHero():startHero());
  goHero(0,{restart:false});
  startHero();
}

if("IntersectionObserver" in window){
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:"0px 0px -40px"});
  $$(".home-quick-services,.intro-block,.story,.phone-product,.benefit-item,.network-detail,.stores-grid").forEach(el=>{
    el.classList.add("reveal-on-scroll");
    revealObserver.observe(el);
  });
}

function go(route){
  if(!titles[route])return;
  $$(".route").forEach(p=>p.classList.toggle("active",p.dataset.page===route));
  $$(".gnb [data-route],.bottom-nav [data-route]").forEach(b=>{
    const current=b.dataset.route===route;
    b.classList.toggle("active",current);
    if(current)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  document.body.dataset.route=route;
  document.title=`${titles[route]} · U봇 통신 생활 서비스`;
  $("#mobileTitle").textContent=titles[route]||"U봇";
  window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  if(route==="ai"&&window.pendingAiPrompt){setTimeout(()=>sendAi(window.pendingAiPrompt),180);window.pendingAiPrompt="";}
  if(route==="admin")refreshAdmin();
}
$$("[data-route]").forEach(b=>b.addEventListener("click",e=>{
  e.preventDefault();
  if(b.dataset.aiPrompt)window.pendingAiPrompt=b.dataset.aiPrompt;
  go(b.dataset.route);
}));

function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1900)}
function esc(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

const loginDialog=$("#loginDialog"), faqDialog=$("#faqDialog"), reserveDialog=$("#reserveDialog"), bundleDialog=$("#bundleDialog"), demoDialog=$("#demoDialog");

$$(".open-login").forEach(b=>b.addEventListener("click",()=>loginDialog.showModal()));
$("#loginSubmit").addEventListener("click",()=>{
  state.loggedIn=true;
  state.threadId="MEMBER-21A7";
  updateLoginUI();
  setTimeout(()=>{
    toast("로그인 완료 · 비회원 대화가 이어졌어요.");
    go("ai");
    if(state.pendingAfterLogin){const q=state.pendingAfterLogin;state.pendingAfterLogin=null;setTimeout(()=>sendAi(q,{resume:true}),260)}
  },120);
});
function updateLoginUI(){
  $("#desktopLoginText").textContent=state.loggedIn?"김유저님":"로그인";
  $("#aiSessionLabel").textContent=state.loggedIn?"김유저님 · 로그인 세션":"비회원 세션";
  $(".ai-session-state").classList.toggle("member",state.loggedIn);
  $("#rightLoginState").textContent=state.loggedIn?"로그인 완료":"비회원";
  $("#rightLoginDesc").textContent=state.loggedIn?"개인 요금제와 혜택 조회가 가능해요.":"개인 정보 조회 질문은 로그인 후 이용할 수 있어요.";
  $("#threadState").textContent=state.threadId;
  $("#mobileGuestCard").classList.toggle("hidden",state.loggedIn);
  $("#mobileWelcomeSmall").textContent=state.loggedIn?"안녕하세요, 김유저님":"로그인하지 않아도 기본 서비스를 이용할 수 있어요.";
  $("#myGuest").classList.toggle("hidden",state.loggedIn);
  $("#myMember").classList.toggle("hidden",!state.loggedIn);
  $("#myHeroTitle").innerHTML=state.loggedIn?"내 통신 생활,<br>필요한 정보만 한눈에.":"로그인하면 내 통신 생활을<br>한눈에 확인할 수 있어요.";
}

$$(".product-detail").forEach(b=>b.addEventListener("click",()=>{
  const product=b.closest(".phone-product").dataset.product;
  $("#productTitle").textContent=product;
  go("product");
}));
$$(".stores-list>button[data-store]").forEach(b=>b.addEventListener("click",()=>{
  $$(".stores-list>button[data-store]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");state.selectedStore=b.dataset.store;
}));
$(".reserve-main").addEventListener("click",()=>{ $("#reserveStoreName").textContent=state.selectedStore; reserveDialog.showModal(); });
$("#reserveSubmit").addEventListener("click",()=>setTimeout(()=>toast("방문 예약 완료 · 예약 확인 알림이 발송됐어요. (Mock)"),100));
$("#reportOpen").addEventListener("click",()=>toast("통신 불편 제보가 접수되었습니다. (Mock)"));
$("#bundleSubmit").addEventListener("click",()=>setTimeout(()=>toast("결합 변경이 완료되었습니다. (Mock)"),100));

const aiHome=$("#aiHomeView"), aiChat=$("#aiChatView"), chat=$("#chatThread"), heroInput=$("#aiHeroInput"), chatInput=$("#aiChatInput"), contextStrip=$("#contextStrip");

function addMsg(role,html,{raw=false}={}){
  const row=document.createElement("div");row.className=`msg ${role}`;
  if(role==="ai") row.innerHTML=`<div class="msg-avatar">AI</div><div class="msg-body">${raw?html:esc(html)}</div>`;
  else row.innerHTML=`<div class="msg-body">${raw?html:esc(html)}</div>`;
  chat.appendChild(row); chat.scrollTop=chat.scrollHeight; return row;
}
function showChat(){aiHome.classList.add("hidden");aiChat.classList.remove("hidden")}
function addContext(text){const s=document.createElement("span");s.textContent=text;contextStrip.appendChild(s)}
function clearContext(){contextStrip.innerHTML=""}
async function thinking(text="답변 생성 중..."){
  const row=addMsg("ai",`<div class="status-line"><span class="typing-dots"><i></i><i></i><i></i></span>${esc(text)}</div>`,{raw:true});
  await sleep(720);row.remove();
}
function productHTML(){
  return `<div class="answer-text">최근 많이 찾는 스마트폰을 기준으로 3가지를 정리했어요. 상품을 누르면 상세 페이지로 이동할 수 있어요.</div>
  <div class="product-list-mini">
    <div class="mini-product"><div class="mini-phone"></div><div><b>Galaxy S26</b><small>월 58,900원부터</small><button data-product-link="Galaxy S26">상품 페이지 보기</button></div></div>
    <div class="mini-product"><div class="mini-phone"></div><div><b>iPhone 17 Pro</b><small>월 69,800원부터</small><button data-product-link="iPhone 17 Pro">상품 페이지 보기</button></div></div>
    <div class="mini-product"><div class="mini-phone"></div><div><b>Galaxy Z Flip7</b><small>월 62,500원부터</small><button data-product-link="Galaxy Z Flip7">상품 페이지 보기</button></div></div>
  </div>
  <div class="chat-card"><div class="chat-card-pad"><h4>현재 위치에서 가까운 대리점</h4><p>U봇 강남직영점 · 약 420m</p></div><div class="mini-map-card"><i>1</i><i>2</i><b>현재 위치</b></div><div class="chat-card-pad answer-actions"><button class="primary" data-chat-route="stores">지도에서 보기</button><button data-reserve>방문 예약</button></div></div>`;
}
function bindChatActions(root=chat){
  $$("[data-product-link]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>{$("#productTitle").textContent=b.dataset.productLink;go("product")})});
  $$("[data-chat-route]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>go(b.dataset.chatRoute))});
  $$("[data-reserve]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>reserveDialog.showModal())});
  $$("[data-retry]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>sendAi(b.dataset.retry,{retry:true}))});
  $$("[data-login-required]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>loginDialog.showModal())});
  $$("[data-choice]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>sendAi(b.dataset.choice,{choice:true}))});
  $$("[data-bundle]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>bundleDialog.showModal())});
  $$("[data-admin]",root).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound="1";b.addEventListener("click",()=>go("admin"))});
}
async function sendAi(text,opts={}){
  const q=(text||chatInput.value||heroInput.value).trim(); if(!q)return;
  showChat(); clearContext(); addMsg("user",q); state.messages.push({role:"user",text:q}); state.questionCount++;
  heroInput.value="";chatInput.value="";
  state.lastUserIntent=q;

  if(state.failNext && !opts.retry){
    state.failNext=false;
    await thinking("서버 응답을 기다리는 중...");
    const row=addMsg("ai",`<div class="chat-card error-card"><div class="chat-card-pad"><h4>답변 생성 실패</h4><p>서버 응답이 지연되어 답변을 완료하지 못했어요.</p><div class="answer-actions"><button class="retry-btn" data-retry="${esc(q)}">재시도</button></div></div></div>`,{raw:true});bindChatActions(row);return;
  }

  // scenario 1 latest phones
  if(/최신\s*폰|최신\s*핸드폰|새로운\s*폰/.test(q)){
    await thinking();
    addContext("상품 DB"); addContext("현재 위치"); addContext("실시간 인기검색");
    const row=addMsg("ai",productHTML(),{raw:true});bindChatActions(row);state.messages.push({role:"ai",text:"latest phones"});return;
  }

  // scenario 2 / 7 satellite FAQ
  if(/위성\s*인터넷/.test(q)){
    await thinking("관련 FAQ를 검색하고 있어요.");
    if(!state.faqSatellite){
      if(!state.unanswered.includes(q))state.unanswered.push(q);
      const row=addMsg("ai",`<div class="chat-card warning-card"><div class="chat-card-pad"><h4>정확한 답변을 찾지 못했습니다.</h4><p>검색된 FAQ의 유사도가 신뢰도 임계치보다 낮아요. 상담원 연결이 필요하신가요?</p><div class="score-line"><span>최고 유사도 0.41</span><span>임계치 0.78 미달</span></div><div class="answer-actions"><button class="primary">상담원 연결</button><button data-admin>관리자 미응답 로그 보기</button></div></div></div>`,{raw:true});bindChatActions(row);return;
    }else{
      addContext("FAQ: 인터넷 > 가입/상품");addContext("Vector DB 즉시 반영");
      addMsg("ai",`<div class="answer-text">현재 U봇에서는 위성 인터넷 상품을 제공하지 않습니다. 이용 가능한 인터넷 상품은 지역별 설치 가능 여부를 확인해 주세요.</div><div class="chat-card success-card"><div class="chat-card-pad"><h4>신규 FAQ 반영 완료</h4><p>관리자가 등록한 FAQ가 Vector DB 검색 결과에 즉시 포함된 시연입니다.</p></div></div>`,{raw:true});return;
    }
  }

  // scenario 4/5 benefits login
  if(/나의\s*혜택|내\s*혜택/.test(q)){
    if(!state.loggedIn){
      state.pendingAfterLogin=q;
      await thinking("개인 정보 조회 가능 여부를 확인하고 있어요.");
      const row=addMsg("ai",`<div class="chat-card notice-card"><div class="chat-card-pad"><h4>로그인이 필요한 질문입니다.</h4><p>내 요금제와 개인 혜택을 확인하려면 로그인해 주세요. 지금까지의 비회원 대화는 그대로 유지됩니다.</p><div class="answer-actions"><button class="primary" data-login-required>로그인하기</button></div></div></div>`,{raw:true});bindChatActions(row);return;
    }else{
      await thinking("가입 정보와 혜택을 조회하고 있어요.");
      addContext("고객 DB");addContext("5G 스탠다드");addContext("비회원 Thread 승계");
      addMsg("ai",`<div class="answer-text">김유저님은 현재 <b>5G 스탠다드</b>를 이용 중이에요. 이번 달에는 VIP 영화 할인과 데이터 선물 혜택을 사용할 수 있어요. 그리고 로그인 전에 보셨던 최신폰 상담 기록도 같은 대화에 남아 있습니다.</div><div class="chat-card"><div class="chat-card-pad"><h4>이번 달 주요 혜택</h4><p>VIP 영화 할인 · 데이터 선물 · 결합상품 추가 할인 대상</p><div class="answer-actions"><button class="primary" data-chat-route="benefits">혜택 전체 보기</button></div></div></div>`,{raw:true});return;
    }
  }

  // scenario 6 ambiguous bundle
  if(/결합상품\s*추천|결합\s*추천/.test(q) && !opts.choice){
    await thinking("추천에 필요한 조건을 확인하고 있어요.");
    const row=addMsg("ai",`<div class="answer-text">현재 요금제는 확인할 수 있지만 어떤 결합을 원하시는지 정보가 부족해요.</div><div class="chat-card"><div class="chat-card-pad"><h4>어떤 결합에 관심 있으세요?</h4><div class="quick-choices"><button class="primary" data-choice="인터넷 결합으로 추천해줘">인터넷</button><button data-choice="OTT 결합으로 추천해줘">OTT</button><button data-choice="가족 결합으로 추천해줘">가족결합</button></div></div></div>`,{raw:true});bindChatActions(row);return;
  }
  if(/인터넷\s*결합으로\s*추천|OTT\s*결합으로\s*추천|가족\s*결합으로\s*추천/.test(q)){
    if(!state.loggedIn){state.pendingAfterLogin=q;const row=addMsg("ai",`<div class="chat-card notice-card"><div class="chat-card-pad"><h4>현재 요금제를 확인하려면 로그인이 필요해요.</h4><div class="answer-actions"><button class="primary" data-login-required>로그인하기</button></div></div></div>`,{raw:true});bindChatActions(row);return}
    await thinking("현재 요금제와 결합상품을 비교하고 있어요.");
    addContext("현재 요금제 5G 스탠다드");addContext("결합상품 DB");
    const row=addMsg("ai",`<div class="answer-text">현재 5G 스탠다드 기준으로 인터넷 결합 3가지를 비교했어요.</div><div class="bundle-cards"><div class="bundle-card"><small>절약형</small><b>500M 인터넷 결합</b><p>월 11,000원 예상 할인</p></div><div class="bundle-card"><small>추천</small><b>1G 인터넷 결합</b><p>속도와 할인 균형</p></div><div class="bundle-card"><small>가족형</small><b>가족+인터넷 결합</b><p>회선 추가 시 할인 확대</p></div></div><div class="answer-actions"><button class="primary" data-bundle>결합 변경하기</button></div>`,{raw:true});bindChatActions(row);return;
  }

  // scenario 8 cache
  if(/5G\s*요금제\s*뭐|5G\s*요금제/.test(q)){
    await thinking();
    state.cachePrimed=true;
    addContext("Qdrant RAG");addContext("응답 1.84s");
    addMsg("ai",`<div class="answer-text">현재 시연용 5G 요금제는 라이트, 스탠다드, 프리미엄 3가지예요.</div><div class="chat-card"><div class="chat-card-pad"><h4>최초 생성 응답</h4><div class="metric-inline"><b>1.84s</b><span>RAG 검색 + 생성</span></div></div></div>`,{raw:true});return;
  }
  if(/5G플랜|플랜\s*종류/.test(q)){
    if(state.cachePrimed){
      state.cacheHit=true;
      addContext("Semantic Cache HIT");addContext("응답 0.12s");
      addMsg("ai",`<div class="answer-text">5G 플랜은 라이트, 스탠다드, 프리미엄이 있어요. 앞선 질문과 의미가 유사해 캐시된 답변을 즉시 재사용했어요.</div><div class="chat-card success-card"><div class="chat-card-pad"><h4>Semantic Cache HIT</h4><div class="metric-inline"><b>0.12s</b><span>최초 생성 1.84s → 캐시 0.12s</span></div></div></div>`,{raw:true});return;
    }
  }

  // scenario 9 stores
  if(/가까운\s*대리점|가까운\s*매장|대리점.*찾/.test(q)){
    await thinking("현재 위치 기준 가까운 매장을 찾고 있어요.");
    addContext("위치 37.50,127.03");addContext("PostGIS nearest-store");
    const row=addMsg("ai",`<div class="answer-text">현재 위치 기준으로 가장 가까운 대리점은 <b>U봇 강남직영점</b>이고 약 420m 떨어져 있어요.</div><div class="chat-card"><div class="mini-map-card"><i>1</i><i>2</i><b>현재 위치</b></div><div class="chat-card-pad"><h4>U봇 강남직영점</h4><p>420m · 상담 · 개통 · 기기변경</p><div class="answer-actions"><button class="primary" data-reserve>방문 예약</button><button data-chat-route="stores">매장 상세</button></div></div></div>`,{raw:true});bindChatActions(row);return;
  }

  if(/인터넷\s*이전|이전\s*설치|이사/.test(q)){
    await thinking();
    addContext("FAQ 3건");
    addMsg("ai",`<div class="answer-text">인터넷 이전 설치는 새 주소의 설치 가능 여부를 확인한 뒤 희망 일정을 선택하면 돼요. 기존 약정은 일반적으로 이전 설치 후 이어지는 흐름으로 안내할 수 있습니다.</div><div class="answer-actions"><button class="primary">이전 설치 신청</button><button>설치 가능 지역 확인</button></div>`,{raw:true});return;
  }

  await thinking();
  addMsg("ai","현재는 시연용 Mock이라 준비된 시나리오에 맞춰 동작해요. 실시간 인기 질문에서 질문을 선택해보세요.");
}

$$(".send-ai").forEach(b=>b.addEventListener("click",()=>sendAi()));
[heroInput,chatInput].forEach(i=>i?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAi()}}));
$$("[data-ai-q]").forEach(b=>b.addEventListener("click",()=>sendAi(b.dataset.aiQ)));
$("#newChat").addEventListener("click",()=>{chat.innerHTML="";contextStrip.innerHTML="";aiChat.classList.add("hidden");aiHome.classList.remove("hidden")});

$("#faqSubmit").addEventListener("click",()=>{
  state.faqSatellite=true;
  state.unanswered=state.unanswered.filter(q=>!q.includes("위성 인터넷"));
  setTimeout(()=>{toast("FAQ 등록 완료 · Vector DB 즉시 반영 (Mock)");refreshAdmin()},120)
});
function refreshAdmin(){
  $("#kpiQuestions").textContent=(state.questionCount).toLocaleString();
  $("#kpiCache").textContent=state.cacheHit?"44.1%":"41.8%";
  $("#cacheHitBadge").textContent=state.cacheHit?"44.1%":"41.8%";
  $("#kpiUnanswered").textContent=state.faqSatellite?"16":"17";
  const article=$('[data-question="위성 인터넷 서비스도 되나요?"]');
  if(article)article.style.display=state.faqSatellite?"none":"grid";
}

$$(".register-faq").forEach(b=>b.addEventListener("click",()=>faqDialog.showModal()));
$("#refreshUnanswered").addEventListener("click",()=>{refreshAdmin();toast("미응답 로그를 새로고침했어요.")});

$("#demoOpen").addEventListener("click",()=>demoDialog.showModal());
$("#mobileDemoOpen").addEventListener("click",()=>demoDialog.showModal());
$("#demoClose").addEventListener("click",()=>demoDialog.close());
$$("[data-demo]").forEach(b=>b.addEventListener("click",async()=>{
  const n=b.dataset.demo;demoDialog.close();
  if(n==="1"){go("ai");await sleep(150);sendAi("최신 폰 어떤게 있어?")}
  if(n==="2"){go("ai");await sleep(150);sendAi("위성 인터넷 서비스도 되나요?")}
  if(n==="3"){state.failNext=true;go("ai");await sleep(150);sendAi("인터넷 이전 설치 방법 알려줘")}
  if(n==="4"){go("ai");await sleep(150);sendAi("나의 혜택 알려줘")}
  if(n==="5"){
    state.messages=[];state.loggedIn=false;updateLoginUI();go("ai");await sleep(150);await sendAi("최신 폰 어떤게 있어?");state.pendingAfterLogin="나의 혜택 알려줘";loginDialog.showModal()
  }
  if(n==="6"){go("ai");await sleep(150);sendAi("내 요금제에 맞는 결합상품 추천해줘")}
  if(n==="7"){go("admin")}
  if(n==="8"){go("ai");await sleep(120);await sendAi("5G 요금제 뭐 있어요?");await sleep(250);sendAi("5G플랜 종류 알려줘")}
  if(n==="9"){go("ai");await sleep(120);sendAi("가까운 대리점을 찾고 싶어")}
  if(n==="10"){go("admin")}
}));

updateLoginUI();refreshAdmin();go("home");

}

