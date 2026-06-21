/**
 * Signal Pulse MVP - Main Application Coordinator
 * Handles system boot, data binding, state calculations, filtering, and event triggers.
 */

// Application State
const state = {
  signals: [],
  macro: [],
  portfolio: {}, // Map of { stock: true, etf: true, ... }
  myHoldings: [],
  rawTexts: {
    signals: '',
    macro: '',
    portfolio: ''
  },
  isFallback: false
};

/**
 * Initializes the application. Loads data, hooks modal events, and triggers initial paint.
 */
async function initApp() {
  try {
    await refreshData();
    setupEventHandlers();
  } catch (error) {
    console.error("Initialization failed:", error);
  }
}

/**
 * Loads CSV data from resources/cache, updates local state, and computes scores
 */
async function refreshData() {
  // Load signals
  const signalsRes = await loadSignalsData();
  state.signals = signalsRes.data;
  state.rawTexts.signals = signalsRes.raw;

  // Load macro status
  const macroRes = await loadMacroData();
  state.macro = macroRes.data;
  state.rawTexts.macro = macroRes.raw;

  // Load portfolio settings
  const portfolioRes = await loadPortfolioData();
  state.rawTexts.portfolio = portfolioRes.raw;
  
  // Transform portfolio array of {asset, enabled} to map for fast lookups
  state.portfolio = {};
  portfolioRes.data.forEach(item => {
    state.portfolio[item.asset.toLowerCase()] = (item.enabled === 'true');
  });

  // Check fallback status
  state.isFallback = localStorage.getItem('sp_is_fallback') === 'true';

  // Load weights, epoch and logs for self-optimization
  if (localStorage.getItem('sp_weight_impact') === null) localStorage.setItem('sp_weight_impact', '0.7');
  if (localStorage.getItem('sp_weight_confidence') === null) localStorage.setItem('sp_weight_confidence', '0.3');
  if (localStorage.getItem('sp_epoch') === null) localStorage.setItem('sp_epoch', '12');
  if (localStorage.getItem('sp_optimization_logs') === null) {
    localStorage.setItem('sp_optimization_logs', JSON.stringify(DEFAULT_OPTIMIZATION_LOGS));
  }

  state.weightImpact = parseFloat(localStorage.getItem('sp_weight_impact')) || 0.7;
  state.weightConfidence = parseFloat(localStorage.getItem('sp_weight_confidence')) || 0.3;
  state.epoch = parseInt(localStorage.getItem('sp_epoch')) || 12;
  state.optLogs = JSON.parse(localStorage.getItem('sp_optimization_logs')) || [];

  // Load myHoldings from LocalStorage
  const savedHoldings = localStorage.getItem('sp_my_holdings');
  if (savedHoldings) {
    state.myHoldings = JSON.parse(savedHoldings);
  } else {
    // Default initial holdings
    state.myHoldings = ['삼성전자', 'NVDA', 'BTC'];
    localStorage.setItem('sp_my_holdings', JSON.stringify(state.myHoldings));
  }

  // Perform render pass
  updateUI();
}

/**
 * Synchronizes UI components with current state
 */
function updateUI() {
  // 1. Render Macro Dashboard
  renderMacro(state.macro);

  // 2. Render Filters Buttons
  renderFilters(state.portfolio, handleFilterToggle);

  // 3. Filter Signals Feed based on active portfolio filters (supports multi-asset comma separation)
  const filteredSignals = state.signals.filter(signal => {
    const assets = (signal.asset || '').toLowerCase().split(',').map(a => a.trim());
    return assets.some(assetKey => state.portfolio[assetKey] === true);
  });

  // Sort filtered signals by calculated score descending (highest priority first)
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    const scoreA = calculateFinalScore(a.impact_score, a.confidence);
    const scoreB = calculateFinalScore(b.impact_score, b.confidence);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Secondary sort: Date descending (freshest first)
    return new Date(b.date || '') - new Date(a.date || '');
  });

  // 4. Select Today's Core Signal (Highest scoring visible signal)
  const highestSignal = sortedSignals.length > 0 ? sortedSignals[0] : null;
  renderTodaySignal(highestSignal);

  // 5. Render Feed Grid (Max 50 items)
  renderFeed(sortedSignals, handleCardClick);

  // 6. Update storage status label in settings modal
  updateStorageStatus(state.isFallback);

  // 7. Render personalized holdings
  renderHoldings(state.myHoldings, state.signals, handleSaveHoldings);

  // 8. Render AI Self-Optimization logs at the bottom
  renderOptimizationSection(state.optLogs, state.weightImpact, state.weightConfidence, state.epoch);
}

/**
 * Click handler to register/delete holdings.
 */
function handleSaveHoldings(newHoldings) {
  state.myHoldings = newHoldings;
  localStorage.setItem('sp_my_holdings', JSON.stringify(newHoldings));
  updateUI();
}

/**
 * Click handler for filter toggles. Updates settings, persists, and repaints.
 */
function handleFilterToggle(assetKey, newStatus) {
  state.portfolio[assetKey] = newStatus;

  // Re-generate raw portfolio CSV text from current map to persist state
  let csvContent = 'asset,enabled\n';
  Object.keys(state.portfolio).forEach(key => {
    csvContent += `${key},${state.portfolio[key]}\n`;
  });

  try {
    saveCSVData('sp_portfolio_data', csvContent.trim());
    state.rawTexts.portfolio = csvContent.trim();
  } catch (error) {
    console.error("Failed to save portfolio toggles:", error);
  }

  updateUI();
}

/**
 * Card click handler in feed
 */
function handleCardClick(signal) {
  // Highlight card and log click
  const score = calculateFinalScore(signal.impact_score, signal.confidence);
  const priority = getPriorityLevel(score);
  console.log(`User clicked signal "${signal.title}" - priority: ${priority.name}, score: ${score}`);
}

/**
 * Hooks handlers for CSV manager modals
 */
function setupEventHandlers() {
  initModalHandlers(
    // On CSV saved handler
    (tabType, rawText) => {
      let storageKey = '';
      if (tabType === 'signals') storageKey = 'sp_signals_data';
      else if (tabType === 'macro') storageKey = 'sp_macro_data';
      else if (tabType === 'portfolio') storageKey = 'sp_portfolio_data';
      
      // Save and validate
      saveCSVData(storageKey, rawText);
      localStorage.setItem('sp_is_fallback', 'false'); // Custom data overrides fallback
      
      // Trigger full async reload
      refreshData();
    },
    // On reset data handler
    () => {
      resetAllCSVData();
      refreshData();
    },
    // On get raw text helper
    (tabType) => {
      return state.rawTexts[tabType] || '';
    }
  );
}

// Boot the application
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Global callback for processing prediction error reporting and weight optimization.
 */
window.onSubmitErrorFeedback = function(signalId, signalTitle, reasonValue, reasonText) {
  // Read current weights and epoch
  const oldImpact = parseFloat(localStorage.getItem('sp_weight_impact')) || 0.70;
  const oldConf = parseFloat(localStorage.getItem('sp_weight_confidence')) || 0.30;
  const oldEpoch = parseInt(localStorage.getItem('sp_epoch')) || 12;
  
  let deltaImpact = 0;
  let deltaConf = 0;
  
  // Decide optimization delta based on reason
  switch (reasonValue) {
    case 'flow':
      deltaImpact = -0.02;
      deltaConf = 0.02;
      break;
    case 'fundamental':
      deltaImpact = 0.03;
      deltaConf = -0.03;
      break;
    case 'news':
      deltaImpact = -0.03;
      deltaConf = 0.03;
      break;
    case 'technical':
      deltaImpact = 0.02;
      deltaConf = -0.02;
      break;
    default:
      deltaImpact = -0.01;
      deltaConf = 0.01;
  }
  
  // Calculate new weights clamped between 0.10 and 0.90
  let newImpact = Math.min(Math.max(oldImpact + deltaImpact, 0.10), 0.90);
  let newConf = Math.min(Math.max(oldConf + deltaConf, 0.10), 0.90);
  
  // Ensure they sum up to 1.0 (approximately)
  const sum = newImpact + newConf;
  newImpact = Math.round((newImpact / sum) * 100) / 100;
  newConf = Math.round((1.0 - newImpact) * 100) / 100;
  
  const newEpoch = oldEpoch + 1;
  
  // Create optimization log
  const newLog = {
    date: new Date().toISOString().split('T')[0],
    title: `${signalTitle} 오차 정정`,
    reason: reasonText,
    desc: `피드백 분석: [${reasonText}] 변수 가중치 교정(영향도 가중치: ${oldImpact.toFixed(2)} → ${newImpact.toFixed(2)}, 신뢰도 가중치: ${oldConf.toFixed(2)} → ${newConf.toFixed(2)}). 모델 최적화 완료.`,
    epoch: `Epoch ${newEpoch}`
  };
  
  // Save weights, epoch, and log to LocalStorage
  localStorage.setItem('sp_weight_impact', newImpact.toString());
  localStorage.setItem('sp_weight_confidence', newConf.toString());
  localStorage.setItem('sp_epoch', newEpoch.toString());
  
  const currentLogs = JSON.parse(localStorage.getItem('sp_optimization_logs')) || [];
  currentLogs.unshift(newLog);
  // Keep max 20 logs
  localStorage.setItem('sp_optimization_logs', JSON.stringify(currentLogs.slice(0, 20)));
  
  // Show toast notification
  showToast(`[오차 보고 피드백 수신] AI 엔진이 오차를 정정하여 가중치를 최적화했습니다 (Epoch ${newEpoch}).`);
  
  // Refresh app data and trigger re-render
  refreshData();
};
