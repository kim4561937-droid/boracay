/**
 * Financial Freedom Simulator UI Controller Module
 * Connects DOM elements with State, formats inputs on-the-fly,
 * manages validation, help tooltip modal, sharing URLs, toggling tables,
 * and rendering card metrics, summaries, tables, and charts.
 */
(function() {
  const UI = {
    // Track which table to show: 'accumulation' or 'sustainability'
    activeTable: 'accumulation',

    /**
     * Bind all DOM event listeners
     */
    bindEvents() {
      // 1. Core numeric/range/currency inputs
      const inputsMap = [
        'current-age', 'target-freedom-age', 'life-expectancy',
        'monthly-expense-now', 'current-assets', 'monthly-savings',
        'inflation-rate', 'annual-return-rate', 'post-freedom-return-rate'
      ];

      inputsMap.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Auto-calculate on input
        el.addEventListener('input', (e) => {
          this.handleInputChange(id, e.target.value);
        });

        // Format currency fields with commas on focus blur
        if (['monthly-expense-now', 'current-assets', 'monthly-savings'].includes(id)) {
          el.addEventListener('blur', (e) => {
            this.formatInputWithCommas(e.target);
          });
          el.addEventListener('focus', (e) => {
            const num = window.Formatter.normalizeCurrencyInput(e.target.value);
            e.target.value = num === 0 ? '' : num;
          });
        }
      });

      // 2. Quick action buttons (+10만, +1억 등)
      this.bindQuickActionButtons();

      // 3. Scenario tab clicks
      const scenarioButtons = document.querySelectorAll('.scenario-tab');
      scenarioButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const scenarioId = btn.getAttribute('data-preset');
          window.State.applyScenarioPreset(scenarioId);
          this.syncInputsFromState();
          this.render();
        });
      });

      // 4. Reinvest surplus toggle
      const reinvestToggle = document.getElementById('reinvest-surplus');
      if (reinvestToggle) {
        reinvestToggle.addEventListener('change', (e) => {
          window.State.updateInput('reinvestSurplus', e.target.checked);
          this.render();
        });
      }

      // 5. Header buttons (Example, Reset)
      const btnLoadExample = document.getElementById('btn-load-example');
      if (btnLoadExample) {
        btnLoadExample.addEventListener('click', () => {
          window.State.resetToDefault();
          this.syncInputsFromState();
          this.render();
          this.showToast('예시 데이터를 정상적으로 불러왔습니다.');
        });
      }

      const btnReset = document.getElementById('btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          // Zero out inputs
          window.State.inputs = {
            currentAge: 20,
            targetFreedomAge: 55,
            lifeExpectancy: 90,
            monthlyExpenseNow: 0,
            currentAssets: 0,
            monthlySavings: 0,
            inflationRate: 0.025,
            annualReturnRate: 0.06,
            postFreedomReturnRate: 0.03,
            reinvestSurplus: true
          };
          window.State.scenarioId = 'base';
          window.State.recalculate();
          this.syncInputsFromState();
          this.render();
          this.showToast('모든 입력값이 초기화되었습니다.');
        });
      }

      // 6. Table toggle click
      const btnTableToggle = document.getElementById('btn-table-toggle');
      if (btnTableToggle) {
        btnTableToggle.addEventListener('click', () => {
          if (this.activeTable === 'accumulation') {
            this.activeTable = 'sustainability';
            btnTableToggle.textContent = '달성 전 적립 테이블 보기';
          } else {
            this.activeTable = 'accumulation';
            btnTableToggle.textContent = '은퇴 후 자산 테이블 보기';
          }
          this.renderTableOnly();
        });
      }

      // 7. Help modal trigger and close
      this.bindHelpTriggers();

      // 8. Clipboard copy buttons
      const btnCopySummary = document.getElementById('btn-copy-summary');
      if (btnCopySummary) {
        btnCopySummary.addEventListener('click', () => {
          this.copySummaryToClipboard();
        });
      }

      const btnCopyShareLink = document.getElementById('btn-copy-link');
      if (btnCopyShareLink) {
        btnCopyShareLink.addEventListener('click', () => {
          this.copyShareLinkToClipboard();
        });
      }

      // 9. Visualization Tab Switch
      const vizTabs = document.querySelectorAll('.viz-tab');
      vizTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          vizTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          const targetPanelId = tab.getAttribute('data-target');
          const panels = document.querySelectorAll('.viz-panel');
          panels.forEach(p => p.classList.remove('active'));
          
          const targetPanel = document.getElementById(targetPanelId);
          if (targetPanel) {
            targetPanel.classList.add('active');
          }
          
          // Force Chart.js to resize/update the active chart
          if (window.Charts) {
            window.Charts.resizeAll();
          }
        });
      });

      // 10. Theme Toggle (Light/Dark Mode)
      const btnThemeToggle = document.getElementById('btn-theme-toggle');
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        this.updateThemeUI(true);
      }

      if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
          const isLight = document.body.classList.toggle('light-theme');
          localStorage.setItem('theme', isLight ? 'light' : 'dark');
          this.updateThemeUI(isLight);
          
          // Redraw charts with new colors
          window.Charts.destroyAll();
          window.Charts.updateAll(
            window.State.projections.preFreedom,
            window.State.projections.postFreedom,
            window.State.results.requiredFreedomAsset,
            window.State.scenarios,
            window.State.inputs.lifeExpectancy
          );
        });
      }
    },

    /**
     * Update Theme toggle button state and icons
     */
    updateThemeUI(isLight) {
      const sunIcon = document.getElementById('theme-icon-sun');
      const moonIcon = document.getElementById('theme-icon-moon');
      const themeText = document.getElementById('theme-text');
      
      if (!themeText) return;

      if (isLight) {
        if (sunIcon) sunIcon.classList.remove('hide');
        if (moonIcon) moonIcon.classList.add('hide');
        themeText.textContent = '다크 모드';
      } else {
        if (sunIcon) sunIcon.classList.add('hide');
        if (moonIcon) moonIcon.classList.remove('hide');
        themeText.textContent = '라이트 모드';
      }
    },

    /**
     * Map HTML inputs to State update variables
     */
    handleInputChange(id, rawValue) {
      let value;
      switch (id) {
        case 'current-age':
        case 'target-freedom-age':
        case 'life-expectancy':
          value = parseInt(rawValue, 10);
          window.State.updateInput(this.camelCase(id), isNaN(value) ? 0 : value);
          break;
        case 'monthly-expense-now':
        case 'current-assets':
        case 'monthly-savings':
          value = window.Formatter.normalizeCurrencyInput(rawValue);
          window.State.updateInput(this.camelCase(id), value);
          break;
        case 'inflation-rate':
        case 'annual-return-rate':
        case 'post-freedom-return-rate':
          value = window.Formatter.normalizePercentInput(rawValue);
          window.State.updateInput(this.camelCase(id), value);
          break;
      }
      this.render();
    },

    /**
     * Convert dash-case to camelCase
     */
    camelCase(str) {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    },

    /**
     * Convert camelCase to dash-case
     */
    dashCase(str) {
      return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
    },

    /**
     * On-the-fly currency format helper
     */
    formatInputWithCommas(inputEl) {
      const num = window.Formatter.normalizeCurrencyInput(inputEl.value);
      inputEl.value = num > 0 ? window.Formatter.formatComma(num) : '';
    },

    /**
     * Sync state values back to HTML inputs
     */
    syncInputsFromState() {
      document.getElementById('current-age').value = window.State.inputs.currentAge;
      document.getElementById('target-freedom-age').value = window.State.inputs.targetFreedomAge;
      document.getElementById('life-expectancy').value = window.State.inputs.lifeExpectancy;

      document.getElementById('monthly-expense-now').value = window.State.inputs.monthlyExpenseNow > 0 ? 
        window.Formatter.formatComma(window.State.inputs.monthlyExpenseNow) : '';
      document.getElementById('current-assets').value = window.State.inputs.currentAssets > 0 ? 
        window.Formatter.formatComma(window.State.inputs.currentAssets) : '0';
      document.getElementById('monthly-savings').value = window.State.inputs.monthlySavings > 0 ? 
        window.Formatter.formatComma(window.State.inputs.monthlySavings) : '0';

      document.getElementById('inflation-rate').value = (window.State.inputs.inflationRate * 100).toFixed(1);
      document.getElementById('annual-return-rate').value = (window.State.inputs.annualReturnRate * 100).toFixed(1);
      document.getElementById('post-freedom-return-rate').value = (window.State.inputs.postFreedomReturnRate * 100).toFixed(1);

      document.getElementById('reinvest-surplus').checked = window.State.inputs.reinvestSurplus;
    },

    /**
     * Binds click events to quick addition buttons (+10만, +1억 등)
     */
    bindQuickActionButtons() {
      const quickButtons = document.querySelectorAll('.btn-quick');
      quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const addValue = parseInt(btn.getAttribute('data-value'), 10);
          const inputEl = document.getElementById(targetId);
          if (!inputEl) return;

          let currentVal = window.Formatter.normalizeCurrencyInput(inputEl.value);
          currentVal += addValue;

          inputEl.value = window.Formatter.formatComma(currentVal);
          this.handleInputChange(targetId, inputEl.value);
        });
      });
    },

    /**
     * Binds help modal triggers
     */
    bindHelpTriggers() {
      const triggers = document.querySelectorAll('.help-trigger');
      const modal = document.getElementById('help-modal');
      const overlay = document.getElementById('help-overlay');
      const closeBtn = document.getElementById('help-close');
      const titleEl = document.getElementById('help-title');
      const bodyEl = document.getElementById('help-body');

      triggers.forEach(trig => {
        trig.addEventListener('click', () => {
          const key = trig.getAttribute('data-help');
          const helpData = window.State.meta.helpTexts[key];

          if (helpData && modal && titleEl && bodyEl && overlay) {
            titleEl.textContent = helpData.title;
            bodyEl.textContent = helpData.body;
            
            modal.classList.add('show');
            overlay.classList.add('show');
          }
        });
      });

      const closeModal = () => {
        if (modal && overlay) {
          modal.classList.remove('show');
          overlay.classList.remove('show');
        }
      };

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (overlay) overlay.addEventListener('click', closeModal);
    },

    /**
     * Copy summarized text paragraph to clipboard
     */
    copySummaryToClipboard() {
      const textContainer = document.getElementById('summary-text');
      if (!textContainer) return;

      const text = textContainer.textContent;
      
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('요약 문장이 클립보드에 복사되었습니다.');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        this.showToast('복사에 실패했습니다. 수동으로 복사해주세요.', true);
      });
    },

    /**
     * Copy sharing URL to clipboard
     */
    copyShareLinkToClipboard() {
      const params = new URLSearchParams();
      const ip = window.State.inputs;
      
      params.set('age', ip.currentAge);
      params.set('target', ip.targetFreedomAge);
      params.set('life', ip.lifeExpectancy);
      params.set('expense', ip.monthlyExpenseNow);
      params.set('assets', ip.currentAssets);
      params.set('savings', ip.monthlySavings);
      params.set('infl', (ip.inflationRate * 100).toFixed(2));
      params.set('rate', (ip.annualReturnRate * 100).toFixed(2));
      params.set('postrate', (ip.postFreedomReturnRate * 100).toFixed(2));
      params.set('reinvest', ip.reinvestSurplus);
      
      let shareUrl = '';
      if (window.location.protocol === 'file:') {
        shareUrl = `https://financial-freedom-simulator.vercel.app/?${params.toString()}`;
      } else {
        shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      }
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showToast('공유 링크가 클립보드에 복사되었습니다.');
      }).catch(err => {
        console.error('Failed to copy link: ', err);
        this.showToast('링크 복사에 실패했습니다.', true);
      });
    },

    /**
     * Toast notification display
     */
    showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      if (!toast) return;

      toast.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
        <span>${message}</span>
      `;
      if (isError) {
        toast.classList.add('error');
      } else {
        toast.classList.remove('error');
      }

      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    },

    /**
     * Lock results when input values are invalid
     */
    lockCalculationUI(shouldLock) {
      const resultsSection = document.getElementById('results-section');
      if (!resultsSection) return;

      if (shouldLock) {
        resultsSection.style.opacity = '0.3';
        resultsSection.style.pointerEvents = 'none';
      } else {
        resultsSection.style.opacity = '1';
        resultsSection.style.pointerEvents = 'auto';
      }
    },

    /**
     * Render validation messaging labels (red error, yellow warning)
     */
    renderValidationMessages(validation) {
      const fields = [
        'current-age', 'target-freedom-age', 'life-expectancy',
        'monthly-expense-now', 'current-assets', 'monthly-savings',
        'inflation-rate', 'annual-return-rate', 'post-freedom-return-rate'
      ];

      fields.forEach(field => {
        const inputContainer = document.getElementById(`${field}-container`);
        const msgEl = document.getElementById(`${field}-msg`);
        
        if (inputContainer) {
          inputContainer.classList.remove('error');
        }
        if (msgEl) {
          msgEl.className = 'validation-message';
          msgEl.style.display = 'none';
          msgEl.textContent = '';
        }
      });

      // Render Errors
      Object.keys(validation.errors).forEach(key => {
        const id = this.dashCase(key);
        const inputContainer = document.getElementById(`${id}-container`);
        const msgEl = document.getElementById(`${id}-msg`);

        if (inputContainer) inputContainer.classList.add('error');
        if (msgEl) {
          msgEl.classList.add('error');
          msgEl.style.display = 'flex';
          msgEl.textContent = validation.errors[key];
        }
      });

      // Render Warnings
      Object.keys(validation.warnings).forEach(key => {
        const id = this.dashCase(key);
        const msgEl = document.getElementById(`${id}-msg`);

        if (msgEl && !validation.errors[key]) {
          msgEl.classList.add('warning');
          msgEl.style.display = 'flex';
          msgEl.textContent = validation.warnings[key];
        }
      });
    },

    /**
     * Update browser URL query parameters in real-time
     */
    updateURLParams() {
      const params = new URLSearchParams();
      const ip = window.State.inputs;
      
      params.set('age', ip.currentAge);
      params.set('target', ip.targetFreedomAge);
      params.set('life', ip.lifeExpectancy);
      params.set('expense', ip.monthlyExpenseNow);
      params.set('assets', ip.currentAssets);
      params.set('savings', ip.monthlySavings);
      params.set('infl', (ip.inflationRate * 100).toFixed(2));
      params.set('rate', (ip.annualReturnRate * 100).toFixed(2));
      params.set('postrate', (ip.postFreedomReturnRate * 100).toFixed(2));
      params.set('reinvest', ip.reinvestSurplus);
      
      try {
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      } catch (e) {
        console.warn('Real-time URL parameter updates are blocked in this environment.', e);
      }
    },

    /**
     * Perform UI updates
     */
    render() {
      // 1. Validation check
      const validation = window.Validators.validateInputs(window.State.inputs);
      this.renderValidationMessages(validation);

      // Select active preset scenario tab styling
      const scenarioTabs = document.querySelectorAll('.scenario-tab');
      scenarioTabs.forEach(tab => {
        const id = tab.getAttribute('data-preset');
        if (id === window.State.scenarioId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Update preset descriptions
      const descEl = document.getElementById('scenario-desc');
      if (descEl) {
        const currentPreset = window.State.meta.scenarioPresets.find(p => p.scenario_id === window.State.scenarioId);
        descEl.textContent = currentPreset ? currentPreset.description : '사용자 정의 시나리오 활성화됨';
      }

      if (!validation.isValid) {
        this.lockCalculationUI(true);
        return;
      }

      this.lockCalculationUI(false);

      // 2. Update Result Cards
      const r = window.State.results;
      const ip = window.State.inputs;
      const sc = window.State.scenarios;

      // Card 1: 목표 자산
      document.getElementById('val-required-assets').textContent = window.Formatter.formatToEokMan(r.requiredFreedomAsset);

      // Card 2: 예상 달성 나이
      const ageEl = document.getElementById('val-estimated-age');
      const ageDescEl = document.getElementById('val-estimated-age-desc');
      if (r.achieved) {
        ageEl.textContent = `${r.achievedAge.toFixed(1)}세`;
        ageEl.style.color = '';
        ageDescEl.textContent = `현재 조건 기준 목표 달성 예상 나이`;
      } else {
        ageEl.textContent = '달성 불가';
        ageEl.style.color = '#f43f5e';
        ageDescEl.textContent = `기대수명(${ip.lifeExpectancy}세) 내에 달성이 불가능합니다.`;
      }

      // Card 3: 남은 준비 기간
      const periodEl = document.getElementById('val-remaining-years');
      if (r.achieved) {
        periodEl.textContent = `${r.yearsRemaining.toFixed(1)}년`;
        document.getElementById('val-remaining-years-desc').textContent = `준비 기한: 약 ${r.achievedMonths}개월`;
      } else {
        periodEl.textContent = '-';
        document.getElementById('val-remaining-years-desc').textContent = '저축/수익 조건 변경이 필요합니다.';
      }

      // Card 4: 최소 월 저축액
      document.getElementById('val-min-savings').textContent = window.Formatter.formatToEokMan(r.minMonthlySavings);

      // Card 5: 월 저축액 +50만원 시 효과
      const savings50El = document.getElementById('val-savings-50-diff');
      if (r.achieved && sc.savingsAdd50.achieved) {
        const yearsSaved = r.achievedAge - sc.savingsAdd50.age;
        if (yearsSaved > 0) {
          savings50El.textContent = `${yearsSaved.toFixed(1)}년 단축`;
          savings50El.style.color = '#10b981';
        } else {
          savings50El.textContent = '단축 효과 없음';
          savings50El.style.color = '';
        }
      } else if (!r.achieved && sc.savingsAdd50.achieved) {
        savings50El.textContent = `달성 가능 (${sc.savingsAdd50.age.toFixed(1)}세)`;
        savings50El.style.color = '#10b981';
      } else {
        savings50El.textContent = '-';
        savings50El.style.color = '';
      }

      // Card 6: 수익률 +1%p 시 효과
      const return1El = document.getElementById('val-return-1-diff');
      if (r.achieved && sc.returnAdd1.achieved) {
        const yearsSaved = r.achievedAge - sc.returnAdd1.age;
        if (yearsSaved > 0) {
          return1El.textContent = `${yearsSaved.toFixed(1)}년 단축`;
          return1El.style.color = '#10b981';
        } else {
          return1El.textContent = '단축 효과 없음';
          return1El.style.color = '';
        }
      } else if (!r.achieved && sc.returnAdd1.achieved) {
        return1El.textContent = `달성 가능 (${sc.returnAdd1.age.toFixed(1)}세)`;
        return1El.style.color = '#10b981';
      } else {
        return1El.textContent = '-';
        return1El.style.color = '';
      }

      // Asset Status Card
      const statusValueEl = document.getElementById('val-asset-status');
      const statusDescEl = document.getElementById('val-asset-status-desc');
      const statusPanel = document.getElementById('sustainability-card-panel');

      statusValueEl.textContent = r.status.name;
      statusDescEl.textContent = r.status.description;

      if (statusPanel) {
        statusPanel.classList.remove('warning', 'highlight');
        statusPanel.style.borderColor = '';
        
        if (r.status.status === 'depletion') {
          statusPanel.style.borderColor = '#f43f5e';
          statusValueEl.style.color = '#f43f5e';
        } else if (r.status.status === 'maintenance') {
          statusPanel.style.borderColor = '#f59e0b';
          statusValueEl.style.color = '#f59e0b';
        } else {
          statusPanel.style.borderColor = '#10b981';
          statusValueEl.style.color = '#10b981';
        }
      }

      // Detail indicators
      document.getElementById('detail-future-expense').textContent = window.Formatter.formatToEokMan(r.futureMonthlyExpense);
      document.getElementById('detail-gross-expense').textContent = window.Formatter.formatToEokMan(r.grossFreedomExpense);
      
      const lastPreRow = window.State.projections.preFreedom[window.State.projections.preFreedom.length - 1];
      const finalBalance = lastPreRow ? lastPreRow.endingAsset : ip.currentAssets;
      document.getElementById('detail-final-balance').textContent = window.Formatter.formatToEokMan(finalBalance);

      const lastPostRow = window.State.projections.postFreedom[window.State.projections.postFreedom.length - 1];
      const endingAsset = lastPostRow ? lastPostRow.endingAsset : 0;
      document.getElementById('detail-ending-asset').textContent = window.Formatter.formatToEokMan(endingAsset);

      // 3. Render Summary Text
      const summaryTextEl = document.getElementById('summary-text');
      if (summaryTextEl) {
        summaryTextEl.innerHTML = window.Formatter.generateSummarySentence(ip, r, r.status.name);
      }

      // 4. Render Table
      this.renderTableOnly();

      // 5. Update Charts
      window.Charts.updateAll(
        window.State.projections.preFreedom,
        window.State.projections.postFreedom,
        r.requiredFreedomAsset,
        r.scenarios,
        ip.lifeExpectancy
      );

      // 6. Update Motivation Card
      this.updateMotivationCard(r.minMonthlySavings, r.achieved);

      // 7. Sync URL query
      this.updateURLParams();
    },

    /**
     * Render the active table only (handles table switching between accumulation & sustainability)
     */
    renderTableOnly() {
      const thead = document.getElementById('projection-table-head');
      const tbody = document.getElementById('projection-table-body');
      const tableTitle = document.getElementById('table-title-text');
      
      if (!thead || !tbody || !tableTitle) return;

      thead.innerHTML = '';
      tbody.innerHTML = '';

      if (this.activeTable === 'accumulation') {
        tableTitle.textContent = '경제적 자율 달성 전 자산 적립 시뮬레이션';
        
        thead.innerHTML = `
          <tr>
            <th style="text-align: left;">나이</th>
            <th class="hide-on-mobile">경과년수</th>
            <th class="hide-on-mobile">누적 저축액</th>
            <th>누적 자산 (복리)</th>
            <th>목표 달성률</th>
          </tr>
        `;

        const preProjections = window.State.projections.preFreedom;
        const requiredAsset = window.State.results.requiredFreedomAsset;

        preProjections.forEach(row => {
          const tr = document.createElement('tr');
          const isAchievementYear = row.yearIndex === preProjections.length - 1 && window.State.results.achieved;
          
          if (isAchievementYear) {
            tr.className = 'retire-row';
          }

          let progressPercent = 0;
          if (requiredAsset > 0) {
            progressPercent = Math.min(100, (row.endingAsset / requiredAsset) * 100);
          } else {
            progressPercent = 100;
          }

          tr.innerHTML = `
            <td style="text-align: left;"><strong>${row.age}세</strong></td>
            <td class="hide-on-mobile">${row.yearIndex === 0 ? '시작' : `${row.yearIndex}년차`}</td>
            <td class="num-col hide-on-mobile">${window.Formatter.formatToEokMan(row.cumulativeSavings)}</td>
            <td class="num-col font-bold" style="color: ${isAchievementYear ? '#10b981' : ''}">${window.Formatter.formatToEokMan(row.endingAsset)}</td>
            <td class="num-col font-bold">${progressPercent.toFixed(1)}%</td>
          `;
          tbody.appendChild(tr);
        });

      } else {
        tableTitle.textContent = '경제적 자율 달성 후 자산 유지/소진 시뮬레이션';

        thead.innerHTML = `
          <tr>
            <th style="text-align: left;">나이</th>
            <th class="hide-on-mobile">경과년수</th>
            <th>연초 자산</th>
            <th class="hide-on-mobile">연간 수익</th>
            <th>연간 생활비</th>
            <th>연말 자산</th>
          </tr>
        `;

        const postProjections = window.State.projections.postFreedom;

        postProjections.forEach(row => {
          const tr = document.createElement('tr');
          
          // If asset is depleted, give it a warning row color
          if (row.endingAsset <= 0) {
            tr.style.color = '#f43f5e';
          }

          tr.innerHTML = `
            <td style="text-align: left;"><strong>${row.age}세</strong></td>
            <td class="hide-on-mobile">${row.yearIndex === 0 ? '달성시점' : `${row.yearIndex}년차`}</td>
            <td class="num-col">${window.Formatter.formatToEokMan(row.startingAsset)}</td>
            <td class="num-col hide-on-mobile">${row.yearIndex === 0 ? '-' : window.Formatter.formatToEokMan(row.annualReturn)}</td>
            <td class="num-col" style="color: #f43f5e;">${row.yearIndex === 0 ? '-' : window.Formatter.formatToEokMan(row.annualExpense)}</td>
            <td class="num-col font-bold">${window.Formatter.formatToEokMan(row.endingAsset)}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    },

    /**
     * Update the motivation card dynamically with supportive quotes
     */
    updateMotivationCard(minMonthlySavings, achieved) {
      const iconEl = document.getElementById('motivation-icon');
      const titleEl = document.getElementById('motivation-title');
      const textEl = document.getElementById('motivation-text');
      
      if (!titleEl || !textEl) return;

      let icon = '💡';
      let title = '자율 주행 응원 메시지';
      let text = '';

      if (!achieved) {
        icon = '🔥';
        title = '현실적인 가이드라인: 페이스 조정 필요';
        text = `현재 저축액 및 수익률 가정으로는 기대수명 전에 목표자산 달성이 불가능합니다. <strong>목표 달성을 위해서는 최소 월 ${window.Formatter.formatToEokMan(minMonthlySavings)}을 복리로 저축</strong>하시거나, 은퇴 나이를 늦추고, 생활비를 절약하는 구조적 변화를 고려해야 합니다.`;
      } else {
        const ip = window.State.inputs;
        if (ip.monthlySavings >= minMonthlySavings) {
          icon = '🎉';
          title = '우수한 저축 페이스: 안정 궤도 진입!';
          text = `현재 월 저축액(<strong>${window.Formatter.formatToEokMan(ip.monthlySavings)}</strong>)이 목표 연령 달성에 필요한 최소 저축액(<strong>${window.Formatter.formatToEokMan(minMonthlySavings)}</strong>)을 초과하고 있습니다! 지금 상태를 유지하면 목표보다 이른 시점에 경제적 독립을 달성할 수 있습니다.`;
        } else {
          icon = '🚀';
          title = '저축 가속 제안: 2% 부족한 스노우볼';
          text = `현재 페이스로는 달성 나이가 다소 지연됩니다. 매월 저축액을 약 <strong>${window.Formatter.formatToEokMan(minMonthlySavings - ip.monthlySavings)}</strong>만큼만 더 증액하시면 목표 나이(${ip.targetFreedomAge}세)에 완벽하게 도달할 수 있습니다. 복리의 힘을 빌려보세요!`;
        }
      }

      if (iconEl) iconEl.textContent = icon;
      titleEl.innerHTML = title;
      textEl.innerHTML = text;
    }
  };

  window.UI = UI;
})();
