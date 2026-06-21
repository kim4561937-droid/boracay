/**
 * Signal Pulse MVP - UI Rendering Module
 * Manages rendering of Today's Signal, Macro indicators, filters, feeds, modals, and toasts.
 */

// Asset Key translations
const ASSET_NAMES = {
  'stock': '미국주식',
  'kor_stock': '한국주식',
  'etf': 'ETF',
  'crypto': '비트코인',
  'eth': '이더리움',
  'gold': '금',
  'silver': '은',
  'copper': '동',
  'rare_earth': '희토류',
  'bond': '채권'
};

// UI Elements caching
const elements = {
  todayContainer: document.getElementById('today-signal-container'),
  macroGrid: document.getElementById('macro-grid'),
  filterButtons: document.getElementById('filter-buttons'),
  feedGrid: document.getElementById('feed-grid'),
  filterCount: document.getElementById('filter-count'),
  
  // Modal Elements
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  modalClose: document.getElementById('modal-close'),
  resetDataBtn: document.getElementById('reset-data-btn'),
  saveCsvBtn: document.getElementById('save-csv-btn'),
  
  // Uploader tabs & dropzone
  tabSignals: document.getElementById('tab-signals'),
  tabMacro: document.getElementById('tab-macro'),
  tabPortfolio: document.getElementById('tab-portfolio'),
  dropzone: document.getElementById('csv-dropzone'),
  fileInput: document.getElementById('csv-file-input'),
  csvTextarea: document.getElementById('csv-textarea'),
  storageStatus: document.getElementById('storage-status'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  
  // Holdings Elements
  holdingsInput: document.getElementById('holdings-input'),
  holdingsSaveBtn: document.getElementById('holdings-save-btn'),
  holdingsTags: document.getElementById('holdings-tags'),
  holdingsAlertsBox: document.getElementById('holdings-alerts-box'),
  
  // Action Explanation Modal Elements
  actionExplanationModal: document.getElementById('action-explanation-modal'),
  actionExplanationTitle: document.getElementById('action-explanation-title'),
  actionExplanationContent: document.getElementById('action-explanation-content'),
  actionModalClose: document.getElementById('action-modal-close'),
  actionModalBtnClose: document.getElementById('action-modal-btn-close'),
  
  // Error Report Modal Elements
  errorReportModal: document.getElementById('error-report-modal'),
  errorSignalTitle: document.getElementById('error-signal-title'),
  errorSignalId: document.getElementById('error-signal-id'),
  errorModalClose: document.getElementById('error-modal-close'),
  errorModalBtnCancel: document.getElementById('error-modal-btn-cancel'),
  errorModalBtnSubmit: document.getElementById('error-modal-btn-submit'),
  
  // Optimization UI Elements
  optWeightImpact: document.getElementById('opt-weight-impact'),
  optWeightConfidence: document.getElementById('opt-weight-confidence'),
  optEpoch: document.getElementById('opt-epoch'),
  optimizationLogs: document.getElementById('optimization-logs')
};

// State trackers for modal uploader
let activeTab = 'signals'; // 'signals' | 'macro' | 'portfolio'

/**
 * Show a toast notification
 */
function showToast(message, isError = false) {
  elements.toastMessage.textContent = message;
  if (isError) {
    elements.toast.classList.add('error');
  } else {
    elements.toast.classList.remove('error');
  }
  elements.toast.classList.add('active');
  
  setTimeout(() => {
    elements.toast.classList.remove('active');
  }, 3500);
}

/**
 * Render Macro Dashboard Cards
 */
function renderMacro(macroList) {
  elements.macroGrid.innerHTML = '';
  
  if (!macroList || macroList.length === 0) {
    elements.macroGrid.innerHTML = '<div class="card">No Macro Data</div>';
    return;
  }

  macroList.forEach(item => {
    const name = item.name || 'UNKNOWN';
    const value = item.value || '-';
    const trend = (item.trend || 'FLAT').toUpperCase();
    
    let trendClass = 'flat';
    let trendSymbol = '─';
    
    if (trend === 'UP') {
      trendClass = 'up';
      trendSymbol = '▲';
    } else if (trend === 'DOWN') {
      trendClass = 'down';
      trendSymbol = '▼';
    }

    const card = document.createElement('div');
    card.className = 'card macro-card';
    card.innerHTML = `
      <span class="macro-name">${name}</span>
      <div class="macro-value-row">
        <span class="macro-value">${value}</span>
        <span class="macro-trend ${trendClass}">${trendSymbol} ${trend}</span>
      </div>
    `;
    elements.macroGrid.appendChild(card);
  });
}

/**
 * Render Noise Filter Toggle Buttons
 */
function renderFilters(portfolioMap, onToggleCallback) {
  elements.filterButtons.innerHTML = '';
  let enabledCount = 0;
  
  Object.keys(ASSET_NAMES).forEach(assetKey => {
    const isEnabled = portfolioMap[assetKey] === true;
    if (isEnabled) enabledCount++;
    
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isEnabled ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="dot"></span>
      <span>${ASSET_NAMES[assetKey]}</span>
    `;
    
    btn.addEventListener('click', () => {
      onToggleCallback(assetKey, !isEnabled);
    });
    
    elements.filterButtons.appendChild(btn);
  });
  
  elements.filterCount.textContent = `활성화 필터: ${enabledCount}/${Object.keys(ASSET_NAMES).length}`;
}

/**
 * Render Today's Core Signal Card (Large size at top)
 */
function renderTodaySignal(highestSignal) {
  elements.todayContainer.innerHTML = '';
  
  if (!highestSignal) {
    elements.todayContainer.innerHTML = `
      <div class="empty-today">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <span>활성화된 관심 자산 관련 중요 시그널이 존재하지 않습니다.</span>
        <p style="font-size: 0.8rem; color: var(--text-dark);">노이즈 필터를 설정하여 시그널을 확인하세요.</p>
      </div>
    `;
    return;
  }
  
  const score = calculateFinalScore(highestSignal.impact_score, highestSignal.confidence);
  const priority = getPriorityLevel(score);
  const actionText = translateActionCode(highestSignal.action);
  
  // Render multi-asset badges if comma-separated
  const assetBadges = (highestSignal.asset || '').split(',').map(a => {
    const key = a.trim().toLowerCase();
    const label = ASSET_NAMES[key] || key;
    return `<span class="badge badge-asset">${label}</span>`;
  }).join(' ');
  
  // Render tickers if they exist
  let todayTickersHtml = '';
  if (highestSignal.tickers && highestSignal.tickers.trim() !== '') {
    const tickerPills = highestSignal.tickers.split(',').map(t => `<span class="ticker-pill">${t.trim()}</span>`).join('');
    todayTickersHtml = `
      <div class="ticker-container">
        <span class="ticker-label">관련 종목:</span>
        ${tickerPills}
      </div>
    `;
  }
  
  const card = document.createElement('div');
  card.className = `card today-card ${priority.class}`;
  card.innerHTML = `
    <div class="today-header">
      <div class="today-badge-row">
        <span class="badge badge-priority ${priority.class}">Today Signal : ${priority.name}</span>
        <span class="badge" style="background-color: rgba(255, 255, 255, 0.05); color: var(--text-main); border: 1px solid rgba(255, 255, 255, 0.08);">${priority.desc}</span>
        ${assetBadges}
        <span class="badge badge-category">${highestSignal.category || 'Macro'}</span>
      </div>
      <h2 class="today-title">${highestSignal.title || 'Untitled Signal'}</h2>
      <p class="today-summary">${highestSignal.summary || 'Summary details not available for this record.'}</p>
      ${todayTickersHtml}
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between;">
      <div class="today-stats">
        <div class="stat-item">
          <span class="stat-label">영향도 (Impact)</span>
          <span class="stat-value">${highestSignal.impact_score}<span>/100</span></span>
        </div>
        <div class="stat-item">
          <span class="stat-label">신뢰도 (Confidence)</span>
          <span class="stat-value">${highestSignal.confidence}<span>%</span></span>
        </div>
      </div>
      
      <div style="display: flex; gap: 10px; width: 100%;">
        <div class="today-action-card interactive-action" style="cursor: pointer; position: relative; flex-grow: 1;" title="💡 지침 해설을 보려면 클릭하세요">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span class="action-card-label">추천 제안 액션 (Recommended Action)</span>
            <span style="font-size: 0.7rem; color: var(--success); opacity: 0.85; display: flex; align-items: center; gap: 3px;">💡 지침 해설 보기</span>
          </div>
          <span class="action-card-value">[${priority.desc}] ${actionText}</span>
        </div>
        
        <button class="btn report-error-btn" style="border-color: rgba(239, 68, 68, 0.4); color: var(--danger); font-size: 0.75rem; padding: 10px 14px; background: rgba(239,68,68,0.04);" title="예측 방향 오차 피드백 보고">
          ⚠️ 오차 보고
        </button>
      </div>
    </div>
  `;
  
  // Attach event listener to the action card
  const actionCard = card.querySelector('.today-action-card');
  if (actionCard) {
    actionCard.addEventListener('click', (e) => {
      e.stopPropagation();
      openActionExplanation(highestSignal.action, highestSignal);
    });
  }
  
  // Attach event listener to the report error button
  const errorBtn = card.querySelector('.report-error-btn');
  if (errorBtn) {
    errorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openErrorReportModal(highestSignal.id, highestSignal.title);
    });
  }
  
  elements.todayContainer.appendChild(card);
}

/**
 * Render Signal Feed list (Supports up to 50 cards, formatted in CSS grid)
 */
function renderFeed(signalsList, onCardClick) {
  elements.feedGrid.innerHTML = '';
  
  if (!signalsList || signalsList.length === 0) {
    elements.feedGrid.innerHTML = `
      <div class="empty-feed">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span style="font-weight: 700;">피드에 노출할 시그널이 없습니다.</span>
        <p style="font-size: 0.8rem; color: var(--text-dark);">노이즈 필터를 변경하거나 새로운 CSV 데이터를 등록해 보세요.</p>
      </div>
    `;
    return;
  }
  
  // Limiting list size to max 50 items (Spec feature E)
  const itemsToRender = signalsList.slice(0, 50);
  
  itemsToRender.forEach(signal => {
    const score = calculateFinalScore(signal.impact_score, signal.confidence);
    const priority = getPriorityLevel(score);
    const actionText = translateActionCode(signal.action);
    
    // Render multi-asset badges if comma-separated
    const assetBadges = (signal.asset || '').split(',').map(a => {
      const key = a.trim().toLowerCase();
      const label = ASSET_NAMES[key] || key;
      return `<span class="badge badge-asset">${label}</span>`;
    }).join(' ');
    
    // Render tickers if they exist
    let tickersHtml = '';
    if (signal.tickers && signal.tickers.trim() !== '') {
      const tickerPills = signal.tickers.split(',').map(t => `<span class="ticker-pill">${t.trim()}</span>`).join('');
      tickersHtml = `
        <div class="ticker-container">
          <span class="ticker-label">추천 종목:</span>
          ${tickerPills}
        </div>
      `;
    }
    
    const card = document.createElement('div');
    card.className = `card signal-card ${priority.class}`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-header-info">
          ${assetBadges}
          <span class="signal-date">${signal.date || ''}</span>
        </div>
        <h3 class="signal-title">${signal.title || 'Untitled Signal'}</h3>
        <p class="signal-summary-text">${signal.summary || ''}</p>
        ${tickersHtml}
      </div>
      
      <div class="card-bottom">
        <div class="score-details-row">
          <div class="score-pills">
            <div class="score-pill">
              <span class="score-pill-lbl">영향도</span>
              <span class="score-pill-val">${signal.impact_score}</span>
            </div>
            <div style="width: 1px; background-color: rgba(255,255,255,0.06); height: 20px;"></div>
            <div class="score-pill">
              <span class="score-pill-lbl">신뢰도</span>
              <span class="score-pill-val">${signal.confidence}%</span>
            </div>
          </div>
          
          <div class="calculated-score-badge">
            <span class="calc-score-lbl">${priority.name}</span>
            <span class="calc-score-val">${score}</span>
            <span class="calc-score-desc" style="font-size: 0.6rem; color: var(--text-muted); margin-top: 2px;">${priority.desc}</span>
          </div>
        </div>
        
        <div class="signal-action-chip interactive-action" style="cursor: pointer;" title="💡 지침 해설을 보려면 클릭하세요">
          <span>[${priority.desc}] ${actionText}</span>
        </div>
        
        <button class="report-error-btn" style="background: none; border: 1px solid rgba(239,68,68,0.2); color: var(--danger); font-size: 0.65rem; font-weight: 700; padding: 5px 8px; border-radius: 6px; cursor: pointer; text-align: center; margin-top: 4px; transition: var(--transition-fast);" title="예측 방향 오차 피드백 보고">
          ⚠️ 예측 오차 보고
        </button>
      </div>
    `;
    
    // Attach event listener to the action chip
    const actionChip = card.querySelector('.signal-action-chip');
    if (actionChip) {
      actionChip.addEventListener('click', (e) => {
        e.stopPropagation();
        openActionExplanation(signal.action, signal);
      });
    }
    
    // Attach event listener to the error report button
    const errorBtn = card.querySelector('.report-error-btn');
    if (errorBtn) {
      errorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openErrorReportModal(signal.id, signal.title);
      });
    }
    
    if (onCardClick) {
      card.addEventListener('click', () => onCardClick(signal));
    }
    
    elements.feedGrid.appendChild(card);
  });
}

/**
 * Sync status label showing whether uploader matches disk or local settings
 */
function updateStorageStatus(isFallbackSource) {
  if (isFallbackSource) {
    elements.storageStatus.className = 'status-value-pill fallback';
    elements.storageStatus.textContent = 'Fallback Default (CORS Mode)';
  } else {
    elements.storageStatus.className = 'status-value-pill';
    elements.storageStatus.textContent = 'Local Caching / custom (Active)';
  }
}

/**
 * Opens the Action Explanation Modal with simple Korean instructions and objective metrics.
 */
function openActionExplanation(actionCode, signal) {
  if (!actionCode) return;
  const title = translateActionCode(actionCode);
  const actionGuide = getActionExplanation(actionCode);
  
  let evalHtml = '';
  if (signal) {
    const evaluation = getSignalEvaluation(signal);
    
    // Build fundamentals block
    let fundamentalsHtml = '';
    const fund = evaluation.fundamentals;
    if (fund.custom) {
      fundamentalsHtml = `<div style="margin-top: 6px; padding: 10px; background-color: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid var(--border); font-size: 0.8rem;">
        ${fund.custom}
      </div>`;
    } else if (fund.revenueGrowth !== 'N/A' || fund.onchain !== 'N/A') {
      if (fund.onchain !== 'N/A') {
        fundamentalsHtml = `<div style="margin-top: 6px; padding: 10px; background-color: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid var(--border); font-size: 0.8rem;">
          <strong>온체인 활성도:</strong> ${fund.onchain}
        </div>`;
      } else {
        fundamentalsHtml = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); color: var(--text-dark);">
                <th style="padding: 4px 8px;">펀더멘탈 항목</th>
                <th style="padding: 4px 8px; text-align: right;">지표 값</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px dashed rgba(255,255,255,0.04);">
                <td style="padding: 6px 8px; color: var(--text-muted);">매출 성장률 (YoY)</td>
                <td style="padding: 6px 8px; text-align: right; color: var(--success); font-weight: 700;">${fund.revenueGrowth}</td>
              </tr>
              <tr style="border-bottom: 1px dashed rgba(255,255,255,0.04);">
                <td style="padding: 6px 8px; color: var(--text-muted);">영업이익 성장률 (YoY)</td>
                <td style="padding: 6px 8px; text-align: right; color: var(--success); font-weight: 700;">${fund.profitGrowth}</td>
              </tr>
              <tr style="border-bottom: 1px dashed rgba(255,255,255,0.04);">
                <td style="padding: 6px 8px; color: var(--text-muted);">PER 변화</td>
                <td style="padding: 6px 8px; text-align: right; color: #FFF;">${fund.perChange}</td>
              </tr>
              <tr style="border-bottom: 1px dashed rgba(255,255,255,0.04);">
                <td style="padding: 6px 8px; color: var(--text-muted);">ROE</td>
                <td style="padding: 6px 8px; text-align: right; color: var(--primary); font-weight: 700;">${fund.roe}</td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; color: var(--text-muted);">PBR 변화</td>
                <td style="padding: 6px 8px; text-align: right; color: #FFF;">${fund.pbrChange}</td>
              </tr>
            </tbody>
          </table>
        `;
      }
    }

    evalHtml = `
      <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
        <h4 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>📈</span> AI 투자 유효성 평가 (Objective Evaluation)
        </h4>
        
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem; line-height: 1.5;">
          <div>
            <strong style="color: #FFF;">📰 최신 뉴스 및 이벤트:</strong>
            <p style="color: var(--text-muted); margin-top: 2px;">${evaluation.news}</p>
          </div>
          <div>
            <strong style="color: #FFF;">📊 펀더멘탈 요약:</strong>
            ${fundamentalsHtml}
          </div>
          <div>
            <strong style="color: #FFF;">🔍 기술적 분석:</strong>
            <p style="color: var(--text-muted); margin-top: 2px;">${evaluation.technical}</p>
          </div>
          <div>
            <strong style="color: #FFF;">👥 시장 심리 및 수급:</strong>
            <p style="color: var(--text-muted); margin-top: 2px;">${evaluation.sentiment}</p>
          </div>
          <div style="background-color: rgba(0, 212, 255, 0.04); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(0,212,255,0.1); margin-top: 4px;">
            <strong style="color: var(--primary); font-size: 0.75rem; text-transform: uppercase;">ℹ️ 참조 정보 출처 (References):</strong>
            <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px; line-height: 1.4;">${evaluation.reference}</p>
          </div>
        </div>
      </div>
    `;
  }

  const finalMarkup = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div>
        ${actionGuide}
      </div>
      ${evalHtml}
    </div>
  `;

  elements.actionExplanationTitle.textContent = `${title} 지침 가이드`;
  elements.actionExplanationContent.innerHTML = finalMarkup;
  elements.actionExplanationModal.classList.add('active');
}

/**
 * Opens the Error Report Modal for feedback collection.
 */
function openErrorReportModal(signalId, signalTitle) {
  elements.errorSignalId.value = signalId;
  elements.errorSignalTitle.textContent = `"${signalTitle}"`;
  elements.errorReportModal.classList.add('active');
}

/**
 * Renders the self-correction log history and metrics at the bottom.
 */
function renderOptimizationSection(logs, impactWeight, confidenceWeight, epoch) {
  if (elements.optWeightImpact) elements.optWeightImpact.textContent = parseFloat(impactWeight).toFixed(2);
  if (elements.optWeightConfidence) elements.optWeightConfidence.textContent = parseFloat(confidenceWeight).toFixed(2);
  if (elements.optEpoch) elements.optEpoch.textContent = `Epoch ${epoch}`;
  
  if (elements.optimizationLogs) {
    elements.optimizationLogs.innerHTML = '';
    if (!logs || logs.length === 0) {
      elements.optimizationLogs.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-dark); text-align: center; padding: 10px;">최적화 로그 데이터가 없습니다.</span>';
      return;
    }
    
    logs.forEach(log => {
      const logItem = document.createElement('div');
      logItem.style.padding = '8px 12px';
      logItem.style.borderRadius = '8px';
      logItem.style.backgroundColor = 'rgba(255,255,255,0.01)';
      logItem.style.border = '1px solid var(--border)';
      logItem.style.fontSize = '0.78rem';
      logItem.style.display = 'flex';
      logItem.style.flexDirection = 'column';
      logItem.style.gap = '4px';
      logItem.style.lineHeight = '1.4';
      
      logItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #FFF;">
          <span style="color: var(--primary);">${log.title}</span>
          <span style="font-size: 0.7rem; color: var(--text-dark);">${log.date} | ${log.epoch}</span>
        </div>
        <div style="font-size: 0.7rem; font-weight: 600; color: var(--warning);">오차 분석 사유: ${log.reason}</div>
        <div style="color: var(--text-muted); font-size: 0.75rem;">${log.desc}</div>
      `;
      elements.optimizationLogs.appendChild(logItem);
    });
  }
}

/**
 * Sets up Settings Panel Modal UI listeners
 */
function initModalHandlers(onSaveCsvCallback, onResetCallback, getCurrentCsvTextCallback) {
  // Close Action Explanation Modal
  const closeActionModal = () => {
    elements.actionExplanationModal.classList.remove('active');
  };
  elements.actionModalClose.addEventListener('click', closeActionModal);
  elements.actionModalBtnClose.addEventListener('click', closeActionModal);
  elements.actionExplanationModal.addEventListener('click', (e) => {
    if (e.target === elements.actionExplanationModal) {
      closeActionModal();
    }
  });

  // Close and Submit handlers for Error Report Modal
  const closeErrorModal = () => {
    elements.errorReportModal.classList.remove('active');
  };
  elements.errorModalClose.addEventListener('click', closeErrorModal);
  elements.errorModalBtnCancel.addEventListener('click', closeErrorModal);
  elements.errorReportModal.addEventListener('click', (e) => {
    if (e.target === elements.errorReportModal) {
      closeErrorModal();
    }
  });

  elements.errorModalBtnSubmit.addEventListener('click', () => {
    const signalId = elements.errorSignalId.value;
    const signalTitle = elements.errorSignalTitle.textContent.replace(/"/g, '');
    const reasonEl = document.querySelector('input[name="error-reason"]:checked');
    const reasonValue = reasonEl ? reasonEl.value : 'flow';
    const reasonText = reasonEl ? reasonEl.closest('label').querySelector('strong').textContent : '시장 수급 불일치';
    
    if (window.onSubmitErrorFeedback) {
      window.onSubmitErrorFeedback(signalId, signalTitle, reasonValue, reasonText);
    }
    closeErrorModal();
  });

  // Open Settings Modal
  elements.settingsBtn.addEventListener('click', () => {
    // Refresh textarea with active text
    elements.csvTextarea.value = getCurrentCsvTextCallback(activeTab);
    elements.settingsModal.classList.add('active');
  });
  
  // Close Settings Modal
  elements.modalClose.addEventListener('click', () => {
    elements.settingsModal.classList.remove('active');
  });
  
  // Close on backdrop click
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.classList.remove('active');
    }
  });
  
  // Tab triggers
  const switchTab = (tabName, btnActive, btn1, btn2) => {
    activeTab = tabName;
    btnActive.classList.add('active');
    btn1.classList.remove('active');
    btn2.classList.remove('active');
    elements.csvTextarea.value = getCurrentCsvTextCallback(tabName);
  };
  
  elements.tabSignals.addEventListener('click', () => switchTab('signals', elements.tabSignals, elements.tabMacro, elements.tabPortfolio));
  elements.tabMacro.addEventListener('click', () => switchTab('macro', elements.tabMacro, elements.tabSignals, elements.tabPortfolio));
  elements.tabPortfolio.addEventListener('click', () => switchTab('portfolio', elements.tabPortfolio, elements.tabSignals, elements.tabMacro));
  
  // Handle File Inputs (drag-over and drop)
  elements.dropzone.addEventListener('click', () => elements.fileInput.click());
  
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });
  
  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });
  
  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });
  
  elements.fileInput.addEventListener('change', () => {
    if (elements.fileInput.files.length > 0) {
      handleFileSelected(elements.fileInput.files[0]);
    }
  });
  
  function handleFileSelected(file) {
    if (!file.name.endsWith('.csv')) {
      showToast('CSV 파일 포맷만 업로드 가능합니다.', true);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      elements.csvTextarea.value = event.target.result;
      showToast(`성공적으로 파일 읽음: ${file.name}`);
    };
    reader.onerror = () => {
      showToast('파일 읽기 중 에러가 발생했습니다.', true);
    };
    reader.readAsText(file);
  }
  
  // Save Data Button trigger
  elements.saveCsvBtn.addEventListener('click', () => {
    const rawText = elements.csvTextarea.value;
    try {
      onSaveCsvCallback(activeTab, rawText);
      showToast(`성공적으로 데이터를 저장 및 동기화했습니다!`);
      elements.settingsModal.classList.remove('active');
    } catch (e) {
      showToast(`저장 실패: ${e.message}`, true);
    }
  });
  
  // Reset Data trigger with double-check visual confirmation (avoids blocking browser confirm popup)
  elements.resetDataBtn.addEventListener('click', () => {
    if (!elements.resetDataBtn.classList.contains('confirming')) {
      elements.resetDataBtn.classList.add('confirming');
      elements.resetDataBtn.textContent = '정말 초기화할까요?';
      elements.resetDataBtn.dataset.originalBg = elements.resetDataBtn.style.backgroundColor;
      elements.resetDataBtn.style.backgroundColor = 'var(--danger)';
      elements.resetDataBtn.style.color = '#FFF';
      
      // Auto-cancel confirmation after 3 seconds
      elements.resetDataBtn.timeoutId = setTimeout(() => {
        elements.resetDataBtn.classList.remove('confirming');
        elements.resetDataBtn.textContent = '기본값 복구';
        elements.resetDataBtn.style.backgroundColor = elements.resetDataBtn.dataset.originalBg || '';
        elements.resetDataBtn.style.color = 'var(--danger)';
      }, 3000);
    } else {
      // Clear auto-cancel timer
      clearTimeout(elements.resetDataBtn.timeoutId);
      
      // Execute reset callback
      onResetCallback();
      
      // Restore styles
      elements.resetDataBtn.classList.remove('confirming');
      elements.resetDataBtn.textContent = '기본값 복구';
      elements.resetDataBtn.style.backgroundColor = elements.resetDataBtn.dataset.originalBg || '';
      elements.resetDataBtn.style.color = 'var(--danger)';
      
      showToast('초기화 완료. 기본값으로 복구되었습니다.');
      elements.settingsModal.classList.remove('active');
    }
  });
}

/**
 * Renders user's custom holdings list, alerts, and hooks event listeners.
 */
function renderHoldings(holdingsList, signalsList, onSaveCallback) {
  // 1. Render tags
  elements.holdingsTags.innerHTML = '';
  if (holdingsList.length === 0) {
    elements.holdingsTags.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-dark);">등록된 보유 종목이 없습니다.</span>';
  } else {
    holdingsList.forEach(ticker => {
      const tag = document.createElement('span');
      tag.className = 'ticker-pill interactive';
      tag.textContent = ticker;
      tag.addEventListener('click', () => {
        const updated = holdingsList.filter(t => t !== ticker);
        onSaveCallback(updated);
        showToast(`[${ticker}] 종목이 보유 자산에서 해제되었습니다.`);
      });
      elements.holdingsTags.appendChild(tag);
    });
  }

  // 2. Render Matching Alerts (filtering for signals matching these tickers, score >= 50)
  elements.holdingsAlertsBox.innerHTML = '';
  
  const matchingSignals = [];
  
  signalsList.forEach(signal => {
    if (!signal.tickers || signal.tickers.trim() === '') return;
    
    // Check if any of user's holdings is present in the signal's tickers
    const signalTickers = signal.tickers.split(',').map(t => t.trim().toUpperCase());
    const matches = holdingsList.filter(holding => signalTickers.includes(holding.toUpperCase()));
    
    if (matches.length > 0) {
      const score = calculateFinalScore(signal.impact_score, signal.confidence);
      // Filter for high/medium/critical impact signals (score >= 50)
      if (score >= 50) {
        matchingSignals.push({
          signal,
          matches,
          score
        });
      }
    }
  });

  if (matchingSignals.length === 0) {
    elements.holdingsAlertsBox.innerHTML = `
      <div class="holding-alert-item" style="text-align: center; color: var(--text-dark); border-style: dashed; background-color: transparent;">
        <span>보유 종목 관련 특이 거시 시그널이 없습니다. (현재 시장 안심 국면)</span>
      </div>
    `;
  } else {
    // Sort matching alerts by score descending
    matchingSignals.sort((a, b) => b.score - a.score);
    
    matchingSignals.forEach(({ signal, matches, score }) => {
      const priority = getPriorityLevel(score);
      const actionText = translateActionCode(signal.action);
      
      const alertItem = document.createElement('div');
      alertItem.className = `holding-alert-item ${priority.class}`;
      
      // Select icon based on priority or type
      let icon = '🔔';
      if (priority.class === 'critical') icon = '🚨';
      else if (priority.class === 'high') icon = '⚠️';
      else if (signal.action && (signal.action.startsWith('buy') || signal.action.includes('buy'))) icon = '📈';
      else if (signal.action && (signal.action.startsWith('reduce') || signal.action.includes('reduce'))) icon = '📉';

      alertItem.innerHTML = `
        <div class="holding-alert-title-row">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span>${icon}</span>
            <span>보유 매칭: <strong style="color: var(--primary); font-size: 0.95rem;">[${matches.join(', ')}]</strong></span>
          </span>
          <span class="badge badge-priority ${priority.class}" style="font-size: 0.65rem; padding: 2px 6px;">${priority.name} (${score}점)</span>
        </div>
        <div style="font-weight: 700; color: #FFF; font-size: 0.85rem; margin-top: 2px;">
          ${signal.title}
        </div>
        <div class="holding-alert-body">
          ${signal.summary}
        </div>
        <div class="interactive-action" style="font-size: 0.75rem; font-weight: 700; color: var(--success); margin-top: 2px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 6px; display: flex; justify-content: space-between; cursor: pointer;" title="💡 지침 해설을 보려면 클릭하세요">
          <span>지침: ${priority.desc}</span>
          <span style="display: flex; align-items: center; gap: 3px;">추천 액션: [${priority.desc}] ${actionText} 💡</span>
        </div>
        <button class="report-error-btn" style="background: none; border: 1px solid rgba(239,68,68,0.15); color: var(--danger); font-size: 0.65rem; font-weight: 700; padding: 4px 6px; border-radius: 4px; cursor: pointer; text-align: center; margin-top: 6px; align-self: flex-end; transition: var(--transition-fast);" title="예측 방향 오차 피드백 보고">
          ⚠️ 예측 오차 보고
        </button>
      `;
      
      const alertActionBtn = alertItem.querySelector('.interactive-action');
      if (alertActionBtn) {
        alertActionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openActionExplanation(signal.action, signal);
        });
      }

      const errorBtn = alertItem.querySelector('.report-error-btn');
      if (errorBtn) {
        errorBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openErrorReportModal(signal.id, signal.title);
        });
      }
      
      elements.holdingsAlertsBox.appendChild(alertItem);
    });
  }

  // 3. Set up event listeners once if not done
  if (!elements.holdingsSaveBtn.hasListener) {
    elements.holdingsSaveBtn.addEventListener('click', () => {
      const val = elements.holdingsInput.value.trim();
      if (!val) return;
      
      // Parse values
      const parsed = val.split(',').map(t => t.trim()).filter(t => t !== '');
      if (parsed.length === 0) return;
      
      // Add non-duplicate elements to existing holdings
      const combined = [...holdingsList];
      parsed.forEach(ticker => {
        if (!combined.some(t => t.toUpperCase() === ticker.toUpperCase())) {
          combined.push(ticker);
        }
      });

      onSaveCallback(combined);
      elements.holdingsInput.value = '';
      showToast(`보유 종목 [${parsed.join(', ')}]이 등록되었습니다.`);
    });
    
    // Handle Enter key in input
    elements.holdingsInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        elements.holdingsSaveBtn.click();
      }
    });

    elements.holdingsSaveBtn.hasListener = true;
  }
}
