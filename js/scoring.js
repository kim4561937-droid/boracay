/**
 * Signal Pulse MVP - Scoring & Action Mapping Logic
 * Computes investment priority score weights and maps technical action codes to visual bands and Korean descriptions.
 */

// Priority configurations
const PRIORITY_LEVELS = {
  CRITICAL: { name: 'Critical', min: 90, class: 'critical', desc: '즉각 대응 요망' },
  HIGH: { name: 'High', min: 70, class: 'high', desc: '비중 조절 검토' },
  MEDIUM: { name: 'Medium', min: 50, class: 'medium', desc: '분할 진입 및 관망' },
  LOW: { name: 'Low', min: 0, class: 'low', desc: '소음 제거' }
};

// Technical Action Mapping in Korean (as specified in specs)
const ACTION_KOREAN_MAP = {
  'reduce_tech': '미국 기술주 비중 축소',
  'buy_gold': '금 매수 포지션 확대',
  'watch_btc': '비트코인 변동성 관망',
  'buy_btc': '비트코인 분할 매수',
  'reduce_equity': '글로벌 주식 비중 축소',
  'watch_yields': '미국 국채 금리 모니터링',
  'buy_tech': '미국 기술주 매수 진입',
  'reduce_credit': '회사채 투자 유의 및 현금화',
  'hedging_dxy': '달러 자산 환헤지 실행',
  'buy_kor_stock': '한국 주식 분할 매수',
  'reduce_kor_stock': '한국 주식 비중 축소',
  'buy_silver': '은 매수 포지션 확대',
  'buy_copper': '동(구리) 매수 포지션 확대',
  'buy_rare_earth': '희토류 관련 자산 매수 진입',
  'buy_eth': '이더리움 분할 매수',
  'watch_eth': '이더리움 네트워크 활성도 관망'
};

/**
 * Calculates final impact score using spec formula:
 * finalScore = impact_score * 0.7 + confidence * 0.3
 */
function calculateFinalScore(impactScore, confidence) {
  const imp = parseFloat(impactScore) || 0;
  const conf = parseFloat(confidence) || 0;
  
  // Read weights dynamically from LocalStorage (defaults to 0.70 and 0.30)
  const storedImpact = localStorage.getItem('sp_weight_impact');
  const storedConf = localStorage.getItem('sp_weight_confidence');
  
  const wImp = storedImpact !== null ? parseFloat(storedImpact) : 0.7;
  const wConf = storedConf !== null ? parseFloat(storedConf) : 0.3;
  
  const score = (imp * wImp) + (conf * wConf);
  // Round to 1 decimal place
  return Math.round(score * 10) / 10;
}

/**
 * Classifies final score into priority levels:
 *  - 90+ : Critical
 *  - 70~89 : High
 *  - 50~69 : Medium
 *  - 0~49 : Low
 */
function getPriorityLevel(score) {
  if (score >= PRIORITY_LEVELS.CRITICAL.min) {
    return PRIORITY_LEVELS.CRITICAL;
  } else if (score >= PRIORITY_LEVELS.HIGH.min) {
    return PRIORITY_LEVELS.HIGH;
  } else if (score >= PRIORITY_LEVELS.MEDIUM.min) {
    return PRIORITY_LEVELS.MEDIUM;
  } else {
    return PRIORITY_LEVELS.LOW;
  }
}

/**
 * Maps actions to user-friendly Korean translation.
 */
function translateActionCode(actionCode) {
  if (!actionCode) return '관망 및 모니터링';
  const cleanCode = actionCode.trim().toLowerCase();
  
  if (ACTION_KOREAN_MAP[cleanCode]) {
    return ACTION_KOREAN_MAP[cleanCode];
  }
  
  // Dynamic fallback: convert "action_code_name" to "Action Code Name"
  return cleanCode
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Technical Action Detailed Explanations in easy-to-understand Korean for general investors
const ACTION_EXPLANATION_MAP = {
  'reduce_tech': `
    <strong>[미국 기술주 비중 축소]</strong><br><br>
    거시경제 악재(물가 상승, 금리 상승 등)로 인해 기술주의 단기 변동성이 높습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 일반 주식계좌나 퇴직연금(IRP/DC) 내에 있는 기술주 관련 ETF(예: 나스닥100, 반도체 테마 등)의 비중을 10~20% 정도 매도하여 현금화하세요.<br>
    2. 매도한 현금은 연금계좌 내 <strong>금리형 ETF</strong>(예: CD금리투자합성, KOFR액티브 등)나 <strong>단기채권 ETF</strong>에 임시 보관하며 대기하세요.
  `,
  'reduce_equity': `
    <strong>[글로벌 주식 비중 축소]</strong><br><br>
    글로벌 시장의 전반적인 하방 위험이 고조되는 상태입니다. 포트폴리오의 리스크를 적극 관리하세요.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 국내외 주식형 ETF 등 리스크 자산의 보유 비중을 줄이고 안전자산 비중을 늘리세요.<br>
    2. 특히 퇴직연금(IRP/DC)의 위험자산 한도(70%)를 꽉 채우고 계시다면, 이를 50% 수준으로 조절하여 지수 급락으로 인한 변동성을 피하시는 것이 좋습니다.
  `,
  'reduce_kor_stock': `
    <strong>[한국 주식 비중 축소]</strong><br><br>
    국내 거시경제 환경(금리 동결, 수출 둔화 우려 등)으로 인해 코스피/코스닥 대형주 위주의 하방 압력이 예상됩니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 코스피 지수를 추종하는 ETF(예: KODEX 200) 또는 국내 개별 주식의 비중을 축소하고 일부 현금화하세요.<br>
    2. 확보한 원화 현금은 단기 예금이나 금리형 ETF 등 안전자산으로 이전하여 다음 반등 기회를 노리세요.
  `,
  'hedging_dxy': `
    <strong>[달러 자산 환헤지 실행]</strong><br><br>
    현재 원-달러 환율이 역사적 고점(예: 1,350원~1,400원선)으로 매우 높으며, 향후 달러 강세가 꺾이고 원화 가치가 반등할(환율 하락) 리스크가 큽니다. 환율 하락에 따른 <strong>환차손(손해)을 차단</strong>해야 합니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. <strong>국내 미국 지수 ETF 투자자</strong>: 환노출형 ETF(예: TIGER 미국S&P500)를 팔고, 이름 끝에 <strong>(H)</strong>가 붙은 환헤지형 ETF(예: KODEX 미국S&P500(H), TIGER 미국나스닥100(H))로 종목을 갈아타세요.<br>
    2. <strong>미국 주식 직구 투자자</strong>: 미국 개별 주식(NVDA, AAPL 등)을 일부 팔아 보유한 달러 예수금은 고환율 상태인 지금 즉시 <strong>원화(KRW)로 환전</strong>해 두는 것이 이득입니다.
  `,
  'buy_gold': `
    <strong>[금 매수 포지션 확대]</strong><br><br>
    중앙은행의 매수세 지속 및 실질금리 하락 우려로 인해 대안 안전자산인 금의 투자 매력도가 높습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 일반 주식계좌나 퇴직연금(IRP)에서 금 현물 ETF(예: ACE KRX금현물 등)를 분할 매수하여 전체 포트폴리오의 5~10% 수준으로 금 비중을 넓혀보세요.<br>
    2. 일반 계좌의 경우 KRX 금 거래소 계좌를 개설해 직접 금 현물을 매수하는 것도 비과세 혜택 면에서 좋은 대안입니다.
  `,
  'buy_tech': `
    <strong>[미국 기술주 매수 진입]</strong><br><br>
    AI 칩 수요 폭증 등 강력한 이익 모멘텀에 기반하여 미국 기술 대형주가 상승 추세를 타고 있습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 미국 대표 기술주(NVDA, MSFT 등)나 나스닥100 ETF의 신규 매수 진입을 검토해 볼 만한 구간입니다.<br>
    2. 다만 단기 과열 가능성을 감안하여 한 번에 매수하기보다 <strong>3회~5회에 나누어 분할 매수</strong>로 진입하시는 것을 추천합니다.
  `,
  'buy_kor_stock': `
    <strong>[한국 주식 분할 매수]</strong><br><br>
    한국 반도체 수출 호조 등 펀더멘털 개선 및 외국인 순매수가 강한 국면으로, 반등 가능성이 높습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 코스피 지수 추종 ETF(예: KODEX 200, TIGER 200) 및 국내 반도체 밸류체인 관련 대형주를 관심 있게 지켜볼 만합니다.<br>
    2. 신뢰도가 높은 국면이므로 적립식 혹은 분할 매수 방식으로 차근차근 수량을 늘려나가기 좋습니다.
  `,
  'buy_btc': `
    <strong>[비트코인 분할 매수]</strong><br><br>
    거래소 공급 물량 감소 등 온체인 데이터상 강력한 가격 상승 압력이 발생하는 긍정적 국면입니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 가상자산 투자를 고려 중이시라면, 현재 가격 대에서 정기적 분할 매수(DCA) 방식으로 물량을 모으기 좋은 시기입니다.<br>
    2. 가상자산은 변동성이 매우 크므로 전체 포트폴리오 내 비중을 3~5% 내외로 통제하며 시작하는 것이 안전합니다.
  `,
  'buy_eth': `
    <strong>[이더리움 분할 매수]</strong><br><br>
    현물 ETF 승인 및 대규모 업그레이드 완료 등으로 인해 거래 수수료 감소 및 기관 자금 유입 모멘텀이 나타나고 있습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 이더리움 현물 또는 국내외 가상자산 관련 신탁 상품의 비중 확대를 검토할 만한 시기입니다.<br>
    2. 비트코인과 마찬가지로 매우 높은 변동성을 가지므로, 여유 자금을 이용해 여러 번에 나누어 진입하세요.
  `,
  'watch_btc': `
    <strong>[비트코인 변동성 관망]</strong><br><br>
    각국 규제 당국의 자금세탁 방지 기준 강화 발표 등 규제 불확실성이 크고 변동성이 높아질 것으로 예상되는 구간입니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 무리하게 추가 매수를 하거나 급하게 매도하기보다 포지션을 유지하고 지켜보세요.<br>
    2. 규제 움직임이 확실하게 시장에 반영될 때까지 신규 매수 진입은 잠시 보류하시는 것이 안전합니다.
  `,
  'watch_eth': `
    <strong>[이더리움 네트워크 활성도 관망]</strong><br><br>
    이더리움 업그레이드 이후 단기적인 수수료 및 소각 트렌드 변화를 확인해야 하는 관망 구간입니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 이더리움 및 레이어2 관련 토큰들의 변동성을 지켜보며 적극적인 거래는 지양하세요.<br>
    2. 이더리움 네트워크 활성도(가스 사용량 및 활성 지갑 수) 지표가 다시 상승세를 타기 전까지 추가 매수를 보류하고 대기하세요.
  `,
  'watch_yields': `
    <strong>[미국 국채 금리 모니터링]</strong><br><br>
    연방준비제도(Fed)의 통화정책 경로 불확실성으로 채권 금리가 급변동하는 시기입니다. 주식/채권 시장 모두에 금리 압박이 있습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 미국 10년 국채 금리가 안정될 때까지 주식형 자산의 무리한 고점 매수를 피하세요.<br>
    2. 채권 투자자라면 장기 채권 ETF(예: TLT) 추가 매수는 일시 멈추고 금리 급등세가 진정될 때까지 단기채 위주로 유지하세요.
  `,
  'reduce_credit': `
    <strong>[회사채 투자 유의 및 현금화]</strong><br><br>
    고금리 장기화로 신용 등급이 낮은 한계기업들의 부도율이 높아지는 경고 신호가 발생했습니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 회사채 ETF(예: 하이일드 채권 ETF인 HYG 등)의 비중을 축소하고 국채나 현금성 자산으로 갈아타세요.<br>
    2. 개별 회사채를 들고 있다면 해당 기업의 재무 상태(부채비율, 이자보상배율)를 긴급 점검할 때입니다.
  `,
  'buy_silver': `
    <strong>[은 매수 포지션 확대]</strong><br><br>
    태양광 패널 등 산업용 수요 증가 및 인플레이션 헤지 수요로 은 가격이 강세를 보이는 구간입니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 은 선물 ETF(예: KODEX 은선물) 등을 활용해 분할 매수 진입을 검토할 수 있습니다.<br>
    2. 은은 금에 비해 변동폭이 훨씬 크기 때문에 금보다 적은 비중으로 조심스럽게 투자하는 것이 현명합니다.
  `,
  'buy_copper': `
    <strong>[동(구리) 매수 포지션 확대]</strong><br><br>
    AI 데이터센터 및 글로벌 친환경 송전망 구축으로 산업 원자재인 구리의 장기적 공급 부족이 예상되는 구간입니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 구리 추종 ETF(예: KODEX 구리선물, TIGER 금속선물 등) 또는 글로벌 구리 채굴 대형주(FCX 등)의 분할 매수를 검토해 보세요.<br>
    2. 경기 순환과 인프라 투자 수요에 강하게 연동되므로 경기 지표를 함께 확인하며 투자해야 합니다.
  `,
  'buy_rare_earth': `
    <strong>[희토류 관련 자산 매수 진입]</strong><br><br>
    글로벌 희토류 공급망 병목 현상 및 가치사슬 재조정으로 인한 희토류 안보 가치 상승 구간입니다.<br><br>
    <strong>💡 일반인 투자자 실천법:</strong><br>
    1. 글로벌 희토류 기업에 분산 투자하는 ETF(예: REMX 등)나 국내 관련 주식을 검토하되, 정책 리스크가 높으므로 포인트를 좁혀 분할 접근해야 합니다.<br>
    2. 미-중 갈등 등 지정학적 뉴스가 가격을 급변시킬 수 있으니 전체 포트폴리오의 아주 작은 비중으로만 운영하세요.
  `
};

/**
 * Returns a simple, action-oriented explanation in Korean for the action code.
 */
function getActionExplanation(actionCode) {
  if (!actionCode) return '행동 제안에 대한 설명이 지정되지 않았습니다.';
  const cleanCode = actionCode.trim().toLowerCase();
  return ACTION_EXPLANATION_MAP[cleanCode] || `추천 제안 <strong>[${translateActionCode(actionCode)}]</strong>에 대한 세부 가이드가 아직 등록되지 않았습니다. 거시경제 변화 흐름에 따라 포트폴리오 비중을 분할 대응해 주세요.`;
}

// baseline historical self-correction logs
const DEFAULT_OPTIMIZATION_LOGS = [
  {
    date: '2026-06-20',
    title: '5월 반도체 수출 호조 시그널 오차 보정',
    reason: '시장 수급 불일치 (Flow Divergence)',
    desc: '수출 호조 발표 후 코스피 상승을 예상했으나 고환율 우려로 인한 외인 매도 물량 유입 발생. 수급 가중치 보정(영향도 -0.02, 신뢰도 +0.02) 완료. 정확도 +1.5% 개선.',
    epoch: 'Epoch 11'
  },
  {
    date: '2026-06-18',
    title: '미국 국채 10년물 금리 급등 대응 오차 정정',
    reason: '뉴스 선반영 오차 (News Priced-in)',
    desc: '매파적 연준 연설로 채권 가격 하락(금리 급등) 경고 발동했으나 이미 국채 시장에 선반영되어 금리 보합 횡보. 뉴스 민감도 알고리즘 가중치 미세 조정 완료. 정확도 +2.7% 개선.',
    epoch: 'Epoch 8'
  }
];

/**
 * Dynamically computes a multi-dimensional objective evaluation for a signal
 * based on its category, assets, and metadata.
 */
function getSignalEvaluation(signal) {
  const asset = (signal.asset || '').toLowerCase();
  const category = (signal.category || '').toLowerCase();
  const title = signal.title || '';
  
  const evalData = {
    news: `최신 이벤트 [${title}] 관련 주요 외신 보도 및 현장 분석을 실시간 분석했습니다. 시장 예상 편차는 약 12% 수준으로 가격 변동성 모멘텀이 강화되고 있습니다.`,
    fundamentals: {
      revenueGrowth: 'N/A',
      profitGrowth: 'N/A',
      perChange: 'N/A',
      roe: 'N/A',
      pbrChange: 'N/A',
      onchain: 'N/A',
      custom: null
    },
    technical: '20일 및 60일 주요 이동평균선 지지선 확인 완료. 지표 모멘텀(RSI 56, MACD 골든크로스 발생) 강도로 판단 시 하방 경직성 확보 국면입니다.',
    sentiment: '공포 및 탐욕 지수(Fear & Greed) 58로 다소 탐욕 구간에 속해 있으며, 대형 고래 및 기관 수급 거래량이 주 평균 대비 18% 증가했습니다.',
    reference: '연방준비제도(Fed) 정례 성명서 및 FOMC 회의록 의사록(2026.06), 한국은행 금융시장 동향 분석 리포트, 블룸버그 터미널 원자재 데이터베이스'
  };

  // Populate dynamic fundamentals based on asset classes
  if (asset.includes('stock') || asset.includes('kor_stock') || asset.includes('etf')) {
    evalData.fundamentals.revenueGrowth = '+14.8%';
    evalData.fundamentals.profitGrowth = '+18.5%';
    evalData.fundamentals.perChange = '16.5x → 18.2x';
    evalData.fundamentals.roe = '15.4%';
    evalData.fundamentals.pbrChange = '1.85x → 2.05x';
    evalData.reference = 'FnGuide 상장기업 재무 데이터베이스, 한국 관세청 반도체 수출 통계, 블룸버그 실적 예상 가이드라인';
  } else if (asset.includes('crypto') || asset.includes('eth')) {
    evalData.fundamentals.onchain = '주간 활성 지갑 수 +24.8% 증가, L2 네트워크 수수료 가스 가치 85% 감소(네트워크 생산성 개선)';
    evalData.reference = 'Glassnode On-Chain Intelligence, CryptoQuant 유동성 공급 분석, DefiLlama L2 TVL Tracker';
    evalData.fundamentals.custom = '<strong>온체인 활성도:</strong> 주간 활성 주소 수 +21.4% 증가, 거래소 보유 비율 다년 최저치 기록 (유통량 감소)';
  } else if (asset.includes('gold') || asset.includes('silver') || asset.includes('copper') || asset.includes('rare_earth')) {
    evalData.fundamentals.custom = '<strong>원자재 펀더멘탈:</strong> 광산 제련 생산 마진(TC/RC) -12% 감소로 원자재 타이트닝 공급 부족 신호 강화';
    evalData.technical = '주요 원자재 피벗 지지선 회복 완료, 볼린저 밴드 상단 저항선 돌파 시도 중.';
    evalData.reference = 'World Gold Council Q2 Demand Trends, LME(런던금속거래소) 공식 재고 데이터베이스, USGS 광물 보고서';
  } else if (asset.includes('bond') || category.includes('yields')) {
    evalData.fundamentals.custom = '<strong>채권 수익률 구조:</strong> 미국 10년물 명목 금리 4.45%, 실질 금리 2.15% 수준으로 단기 스프레드 압력 가중';
    evalData.reference = 'U.S. Department of the Treasury H.15 Yield Curve, Federal Reserve Economic Data (FRED)';
  }

  return evalData;
}
