/**
 * Signal Pulse MVP - CSV Loader & Storage Sync
 * Handles RFC-compliant CSV parsing, server-side fetch, and client-side uploader/LocalStorage fallback.
 */

const STORAGE_KEYS = {
  SIGNALS: 'sp_signals_data',
  MACRO: 'sp_macro_data',
  PORTFOLIO: 'sp_portfolio_data',
  IS_FALLBACK: 'sp_is_fallback'
};

// Fallback CSV Data (Used when running offline or via file:// protocol where fetch() encounters CORS)
const FALLBACK_DATA = {
  signals: `id,date,title,category,asset,impact_score,confidence,action,summary,tickers
1,2026-06-21,미국 CPI 예상치 상회 (US CPI HOT),inflation,stock,92,87,reduce_tech,CPI 3.8% 발표로 예상치 상회 및 인플레이션 우려 재점화,"QQQ, SPY, Apple, Microsoft, TIGER 미국나스닥100, 133690, TIGER 미국나스닥100(H), 314250, KODEX 미국S&P500(H), 409820, TIGER 미국S&P500, 379800"
2,2026-06-21,비트코인 규제 우려 증가 (BTC Regulatory Risk),regulation,crypto,78,65,watch_btc,각국 규제 당국 자금세탁 방지 가이드라인 강화 발표,"BTC, COIN, MSTR"
3,2026-06-20,글로벌 금 현물 가격 사상 최고치 돌파,macro,gold,85,90,buy_gold,실질금리 하락 및 중앙은행 매수세 지속으로 최고가 돌파,"GLD, IAU, NEM, ACE KRX금현물, 411060, KODEX 골드선물(H), 132030"
4,2026-06-20,미국 10년 국채 금리 급등 (Yields Spike),yields,bond,72,80,watch_yields,매파적 연준 발언에 채권 매도세 강화 및 금리 4.5% 도달,"TLT, TBT, SHY, ACE 미국30년국채액티브(H), 462900, TIGER 미국채30년커버드콜(합성), 479010"
5,2026-06-19,주요 AI 칩 수요 폭발 및 HBM 공급 부족,earnings,"stock,kor_stock",88,85,buy_tech,미국 주요 AI 칩 수요 폭발로 한미 반도체 공급망(HBM 등) 동반 수혜,"NVDA, AMD, 삼성전자, SK하이닉스, KODEX 반도체, 091160, TIGER Fn반도체탑10, 396500, SOL 미국반도체MV, 446070"
6,2026-06-19,비트코인 거래소 보유량 다년 최저치 기록,onchain,crypto,95,75,buy_btc,유통 공급량 축소로 단기 가격 상승 압력 증가 가능성,"BTC, MSTR, IBIT"
7,2026-06-18,중동 지정학적 긴장 가중 및 항로 봉쇄,geopolitics,etf,68,55,reduce_equity,해상 물류 지연으로 인한 공급망 충격 및 인플레이션 압력,"SPY, EEM, ACWI, KODEX 200, 069500, TIGER 200, 102110"
8,2026-06-18,글로벌 중앙은행 금 매입 사상 최대치,reserve,gold,74,88,buy_gold,탈달러화 기조로 아시아 및 신흥국 중앙은행 금 비중 확대,"GLD, NEM, GDX, ACE KRX금현물, 411060, KODEX 골드선물(H), 132030"
9,2026-06-17,고금리 장기화에 따른 한계기업 부도율 상승,credit,bond,60,70,reduce_credit,하이일드 스프레드 확대 및 디폴트율 4.2%로 상승,"HYG, LQD, KODEX ESG회사채액티브, 394400"
10,2026-06-17,달러 인덱스(DXY) 강세 지속 및 원화 약세,currency,etf,81,82,hedging_dxy,연준 금리 인하 지연 전망에 강달러 압력 지속,"UUP, KOY, KODEX 미국S&P500(H), 409820, TIGER 미국나스닥100(H), 314250, KODEX 미국달러선물인버스2X, 261270"
11,2026-06-16,연준 고위 인사 금리 인하 신중론 제기,policy,bond,75,78,watch_yields,기대 인플레이션 통제 전까지 조기 인하 부적절 발언,"TLT, IEF, ACE 미국30년국채액티브(H), 462900, KBSTAR 미국채30년커버드콜(합성), 479010"
12,2026-06-16,비트코인 해시레이트 역대 최고치 경신,onchain,crypto,70,90,buy_btc,네트워크 보안성 극대화 및 채굴 업계 장기 신뢰 회복,"MARA, RIOT, HUT"
13,2026-06-15,글로벌 원자재 가격 전방위적 반등세,macro,etf,65,70,reduce_tech,구리 및 원유 가격 상승으로 에너지를 제외한 제조원가 가중,"USO, DBC, QQQ, KODEX 구리선물(H), 138910, TIGER 금속선물(H), 139310"
14,2026-06-15,미국 기술주 밸류에이션 부담 경고,valuation,stock,82,75,reduce_tech,이익 대비 주가 비율 역사적 고점 도달로 단기 조정 가능성,"QQQ, AAPL, MSFT, TIGER 미국나스닥100, 133690, TIGER 미국나스닥100(H), 314250, ACE 미국나스닥100, 379810"
15,2026-06-14,이더리움 대규모 네트워크 업그레이드 완료,tech,"crypto,eth",79,88,buy_eth,레이어2 가스비 90% 급감 및 메인넷 처리 용량 확대,"ETH, ETHE, OP, ARB"
16,2026-06-21,한국 반도체 수출 호조 (Semi Export Growth),trade,kor_stock,88,92,buy_kor_stock,5월 반도체 수출액 사상 최대치 기록 및 KOSPI 대형주 중심 외인 순매수 지속,"삼성전자, SK하이닉스, 한미반도체, KODEX 반도체, 091160, TIGER Fn반도체탑10, 396500"
17,2026-06-20,한국은행 기준금리 동결 결정 (BOK Hold),policy,kor_stock,74,95,watch_kor_stock,금통위 연 3.50% 기준금리 동결 결정 및 가계부채 모니터링 강화 발언,"KODEX 200, 069500, TIGER 200, 102110, KB금융, 신한지주, KODEX 은행, 091170"
18,2026-06-19,산업용 은 수요 급증 (Silver Surge),industry,silver,82,85,buy_silver,태양광 패널 및 전장 부품용 은 공급 부족 심화로 온스당 가격 급등,"SLV, SIL, 고려아연, KODEX 은선물(H), 144600"
19,2026-06-18,구리 가격 역사적 고점 도달 (Copper Peak),demand,copper,89,88,buy_copper,글로벌 송전망 현대화 및 데이터센터 전력선 구리 튜브 공급 부족 경고,"CPER, FCX, 풍산, LS, KODEX 구리선물(H), 138910"
20,2026-06-17,희토류 공급망 안보 강화 (Rare Earth Tension),supply,rare_earth,91,82,buy_rare_earth,글로벌 공급 다변화 압력 속에 주요 희토류 정제 수수료 인상 및 가격 급등,"REMX, MP, 유니온, 동국알앤에스, KODEX 희토류선물(H), 433220"
21,2026-06-21,이더리움 현물 ETF 자금 유입 가속화,flows,eth,84,88,buy_eth,현물 ETF 승인 이후 기관 매수 자금 대거 유입 및 스테이킹 비율 역사적 최고치 경신,"ETH, ETHE, ETHA, ETHW"`,

  macro: `id,name,value,trend
1,미국 기준금리,5.25%,HOLD
2,연준 정책방향,HAWKISH,UP
3,미국 10년물 금리,4.45%,UP
4,미국 실질금리,2.15%,UP
5,달러 인덱스,105.3,UP
6,글로벌 M2 증가율,4.2%,DOWN
7,글로벌 유동성 방향,TIGHTENING,DOWN
8,원/달러 환율,1382.5,UP
9,달러 강세 여부,STRONG,UP
10,원화 강세 여부,WEAK,DOWN
11,VIX (변동성 지수),21.2,UP
12,공포지수 (F&G),38 (Fear),DOWN
13,주식 수급,OUTFLOW,DOWN
14,크립토 수급,NET_INFLOW,UP
15,스테이블코인 공급량,$162B,UP
16,거래소 BTC 보유량,1.82M,DOWN`,

  portfolio: `asset,enabled
stock,true
kor_stock,true
etf,true
crypto,true
eth,true
gold,false
silver,false
copper,false
rare_earth,false
bond,false`
};

/**
 * Parses raw CSV text into an array of objects.
 * Support comma delimiters, double quotes, and CRLF line breaks.
 */
function parseCSV(text) {
  if (!text || text.trim() === '') return [];
  
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row.map(cell => cell.trim()));
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  
  if (row.length > 1 || row[0] !== "") {
    lines.push(row.map(cell => cell.trim()));
  }
  
  if (lines.length === 0) return [];
  
  // Clean headers (trim spaces, convert to lowercase for uniform access)
  const headers = lines[0].map(h => h.trim().toLowerCase());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Skip empty lines
    if (line.length === 0 || (line.length === 1 && line[0] === '')) continue;
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = line[j] !== undefined ? line[j].trim() : "";
      // Strip outer quotes if still present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  
  return result;
}

/**
 * Attempts to load a CSV resource.
 * Order of priority: 
 *   1. LocalStorage cached data (user uploader override)
 *   2. Server-side fetch (runs when hosted on web servers)
 *   3. Embedded fallback string (runs when file:// protocol blocks fetch)
 */
async function loadCSVResource(path, storageKey, fallbackText) {
  // Check LocalStorage cache first (custom uploads)
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    return { data: parseCSV(cached), source: 'LocalStorage', raw: cached };
  }

  // Attempt server fetch (only works via http:// or https://)
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    // Cache the loaded data in LocalStorage for consistent state
    localStorage.setItem(storageKey, text);
    localStorage.setItem(STORAGE_KEYS.IS_FALLBACK, 'false');
    return { data: parseCSV(text), source: 'Server (File)', raw: text };
  } catch (error) {
    console.warn(`Fetch failed for ${path} (${error.message}). Falling back to local default data.`);
    // Fallback to embedded string constants
    localStorage.setItem(storageKey, fallbackText);
    localStorage.setItem(STORAGE_KEYS.IS_FALLBACK, 'true');
    return { data: parseCSV(fallbackText), source: 'Fallback String (Local File Protocol)', raw: fallbackText };
  }
}

/**
 * Public functions to load modules
 */
async function loadSignalsData() {
  return loadCSVResource('data/signals.csv', STORAGE_KEYS.SIGNALS, FALLBACK_DATA.signals);
}

async function loadMacroData() {
  return loadCSVResource('data/macro.csv', STORAGE_KEYS.MACRO, FALLBACK_DATA.macro);
}

async function loadPortfolioData() {
  return loadCSVResource('data/portfolio.csv', STORAGE_KEYS.PORTFOLIO, FALLBACK_DATA.portfolio);
}

/**
 * Update and persist custom CSV datasets
 */
function saveCSVData(storageKey, rawText) {
  try {
    // Validate CSV formatting by parsing it first
    const parsed = parseCSV(rawText);
    if (parsed.length === 0) {
      throw new Error("Invalid or empty CSV content.");
    }
    localStorage.setItem(storageKey, rawText);
    return parsed;
  } catch (error) {
    throw new Error(`CSV Parsing Failure: ${error.message}`);
  }
}

/**
 * Resets local storage cache to trigger re-fetches or defaults
 */
function resetAllCSVData() {
  localStorage.removeItem(STORAGE_KEYS.SIGNALS);
  localStorage.removeItem(STORAGE_KEYS.MACRO);
  localStorage.removeItem(STORAGE_KEYS.PORTFOLIO);
  localStorage.removeItem(STORAGE_KEYS.IS_FALLBACK);
}
