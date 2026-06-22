/**
 * RetireMap UI Controller Module
 * Connects DOM elements with State, processes inputs, formats inputs on-the-fly,
 * manages validation messaging, tooltip modal, link sharing, and renders outputs.
 */
(function() {
  const UI = {
    /**
     * Bind all DOM event listeners
     */
    bindEvents() {
      // 1. Core numeric/range inputs
      const inputIds = [
        'current-age', 'retire-age', 'life-expectancy',
        'monthly-expense-now', 'current-assets', 'monthly-pension',
        'inflation-rate', 'pre-ret-return', 'post-ret-return'
      ];

      inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Auto-calculate on input
        el.addEventListener('input', (e) => {
          this.handleInputChange(id, e.target.value);
        });

        // Format currency fields with commas on-the-fly, and handle cursor position
        if (['monthly-expense-now', 'current-assets', 'monthly-pension'].includes(id)) {
          el.addEventListener('blur', (e) => {
            this.formatInputWithCommas(e.target);
          });
          el.addEventListener('focus', (e) => {
            // Strip non-numeric when focusing to ease editing
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

      // 4. Yearly return mode toggle
      const yearlyReturnToggle = document.getElementById('use-yearly-return');
      if (yearlyReturnToggle) {
        yearlyReturnToggle.addEventListener('change', (e) => {
          window.State.updateInput('useYearlyReturn', e.target.checked);
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
            retireAge: 60,
            lifeExpectancy: 90,
            monthlyExpenseNow: 0,
            currentAssets: 0,
            monthlyPension: 0,
            inflationRate: 0.025,
            preRetReturn: 0.06,
            postRetReturn: 0.03,
            useYearlyReturn: false
          };
          window.State.scenarioId = 'base';
          window.State.recalculate();
          this.syncInputsFromState();
          this.render();
          this.showToast('모든 입력값이 초기화되었습니다.');
        });
      }

      // 6. Help modal trigger and close
      this.bindHelpTriggers();

      // 7. Clipboard and Share buttons
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

      // 8. Visualization Tab Switches
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
        });
      });

      // 9. Theme Toggle (Light/Dark Mode)
      const btnThemeToggle = document.getElementById('btn-theme-toggle');
      
      // Load initial theme from localStorage
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
          
          // Redraw charts with new theme colors
          window.Charts.destroyAll();
          window.Charts.updateAll(
            window.State.projections.preRetirement,
            window.State.projections.postRetirement,
            window.State.results.requiredRetirementAsset
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
        case 'retire-age':
        case 'life-expectancy':
          value = parseInt(rawValue, 10);
          window.State.updateInput(this.camelCase(id), isNaN(value) ? 0 : value);
          break;
        case 'monthly-expense-now':
        case 'current-assets':
        case 'monthly-pension':
          value = window.Formatter.normalizeCurrencyInput(rawValue);
          window.State.updateInput(this.camelCase(id), value);
          break;
        case 'inflation-rate':
        case 'pre-ret-return':
        case 'post-ret-return':
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
     * On-the-fly currency format helper
     */
    formatInputWithCommas(inputEl) {
      const num = window.Formatter.normalizeCurrencyInput(inputEl.value);
      inputEl.value = num > 0 ? window.Formatter.formatComma(num) : '';
    },

    /**
     * Sync state values back to HTML inputs (e.g. after presets or reset)
     */
    syncInputsFromState() {
      document.getElementById('current-age').value = window.State.inputs.currentAge;
      document.getElementById('retire-age').value = window.State.inputs.retireAge;
      document.getElementById('life-expectancy').value = window.State.inputs.lifeExpectancy;

      document.getElementById('monthly-expense-now').value = window.State.inputs.monthlyExpenseNow > 0 ? 
        window.Formatter.formatComma(window.State.inputs.monthlyExpenseNow) : '';
      document.getElementById('current-assets').value = window.State.inputs.currentAssets > 0 ? 
        window.Formatter.formatComma(window.State.inputs.currentAssets) : '0';
      document.getElementById('monthly-pension').value = window.State.inputs.monthlyPension > 0 ? 
        window.Formatter.formatComma(window.State.inputs.monthlyPension) : '0';

      document.getElementById('inflation-rate').value = (window.State.inputs.inflationRate * 100).toFixed(1);
      document.getElementById('pre-ret-return').value = (window.State.inputs.preRetReturn * 100).toFixed(1);
      document.getElementById('post-ret-return').value = (window.State.inputs.postRetReturn * 100).toFixed(1);

      document.getElementById('use-yearly-return').checked = window.State.inputs.useYearlyReturn;
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

      // Extract text content only (ignoring HTML tags)
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
      params.set('retire', ip.retireAge);
      params.set('life', ip.lifeExpectancy);
      params.set('expense', ip.monthlyExpenseNow);
      params.set('assets', ip.currentAssets);
      params.set('pension', ip.monthlyPension);
      params.set('infl', (ip.inflationRate * 100).toFixed(2));
      params.set('preret', (ip.preRetReturn * 100).toFixed(2));
      params.set('postret', (ip.postRetReturn * 100).toFixed(2));
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      
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

      toast.textContent = message;
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
        // Red flag state if input has fatal errors
        this.lockCalculationUI(true);
        return;
      }

      this.lockCalculationUI(false);

      // 2. Update Result Cards
      const r = window.State.results;
      const ip = window.State.inputs;

      document.getElementById('val-years-to-retire').textContent = `${r.yearsToRetire}년`;
      document.getElementById('val-retirement-years').textContent = `${r.retirementYears}년`;
      document.getElementById('val-future-expense').textContent = window.Formatter.formatToEokMan(r.futureMonthlyExpense);
      document.getElementById('val-gross-expense').textContent = window.Formatter.formatToEokMan(r.grossRetirementExpense);
      document.getElementById('val-required-assets').textContent = window.Formatter.formatToEokMan(r.requiredRetirementAsset);
      
      const compoundCardVal = document.getElementById('val-savings-compound');
      if (r.monthlySavingsCompound > 0) {
        compoundCardVal.textContent = window.Formatter.formatToEokMan(r.monthlySavingsCompound);
      } else {
        compoundCardVal.textContent = '0원';
      }

      // Comparison section (Simple vs Compound details)
      const pmtDiff = Math.max(0, r.monthlySavingsSimple - r.monthlySavingsCompound);
      document.getElementById('val-savings-simple').textContent = window.Formatter.formatToEokMan(r.monthlySavingsSimple);
      document.getElementById('val-savings-diff').textContent = window.Formatter.formatToEokMan(pmtDiff);

      // 3. Render Summary paragraph
      const summaryTextEl = document.getElementById('summary-text');
      if (summaryTextEl) {
        summaryTextEl.innerHTML = window.Formatter.generateSummarySentence(ip, r);
      }

      // 4. Render Projections Table
      this.renderProjectionsTable(window.State.projections.preRetirement, r.requiredRetirementAsset);

      // 5. Update Charts
      window.Charts.updateAll(
        window.State.projections.preRetirement,
        window.State.projections.postRetirement,
        r.requiredRetirementAsset
      );

      // 6. Update Motivation Card
      this.updateMotivationCard(r.monthlySavingsCompound);
    },

    /**
     * Update the motivation card dynamically with supportive quotes based on savings goal
     */
    updateMotivationCard(monthlySavings) {
      const iconEl = document.getElementById('motivation-icon');
      const titleEl = document.getElementById('motivation-title');
      const textEl = document.getElementById('motivation-text');
      
      if (!titleEl || !textEl) return;

      let icon = '💡';
      let title = '경제적 자유 응원 팁';
      let text = '천 리 길도 한 걸음부터 시작합니다. 지금 작은 시작이 복리의 마법을 만나 큰 자산으로 자라날 것입니다!';

      if (monthlySavings === 0) {
        icon = '🎉';
        title = '달성 완료: 완벽한 자산 궤도!';
        text = '축하합니다! 이미 설정하신 자산과 운용 구조만으로도 목표 연령에 경제적 자유를 충분히 달성할 수 있습니다. 추가 적립 없이 현재 페이스를 유지하며 자산을 여유롭게 굴려보세요!';
      } else if (monthlySavings <= 500000) {
        icon = '🌱';
        title = '성장 씨앗: 한 걸음의 위대한 기적';
        text = `매달 <strong>${window.Formatter.formatToEokMan(monthlySavings)}</strong>씩 꾸준히 모으는 것은 작은 씨앗처럼 보이지만, 시간이 흐르며 복리의 힘을 빌려 거대한 미래의 나무로 자라날 것입니다. 당신의 성실한 저축을 응원합니다!`;
      } else if (monthlySavings <= 1500000) {
        icon = '🚀';
        title = '자산 가속: 돈이 일하게 하는 비밀';
        text = `월 약 <strong>${window.Formatter.formatToEokMan(monthlySavings)}</strong>의 적립금은 미래의 당신에게 가장 큰 자유를 선물할 것입니다. "시장의 일시적인 흔들림을 두려워하지 말고, 매달 꾸준히 복리의 스노우볼을 굴리세요."`;
      } else if (monthlySavings <= 3000000) {
        icon = '💎';
        title = '뚜렷한 목표: 방향이 속도보다 중요합니다';
        text = `월 <strong>${window.Formatter.formatToEokMan(monthlySavings)}</strong>은 다소 큰 금액이지만, 명확한 경제적 독립이라는 가치가 여러분을 이끌어 줄 것입니다. 지출 구조조정이나 추가 파이프라인 구축을 통해 적립률을 조금씩 높여보세요!`;
      } else {
        icon = '🔥';
        title = '페이스 조절: 건강하고 지속 가능한 계획';
        text = `월 필요 적립액이 <strong>${window.Formatter.formatToEokMan(monthlySavings)}</strong>으로 계산되었습니다. 이 금액이 무겁게 느껴지신다면 경제적 자유 목표 나이를 2~3년 늦추거나 월 필요 생활비를 조정하여 나만의 편안한 계획을 완성해 보세요. 중요한 것은 꺾이지 않고 계속하는 것입니다!`;
      }

      if (iconEl) iconEl.textContent = icon;
      titleEl.innerHTML = title;
      textEl.innerHTML = text;
    },

    /**
     * Lock results when input values are erroneous
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
      // Clear previous states
      const fields = [
        'current-age', 'retire-age', 'life-expectancy',
        'monthly-expense-now', 'current-assets', 'monthly-pension',
        'inflation-rate', 'pre-ret-return', 'post-ret-return'
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

        if (msgEl && !validation.errors[key]) { // error takes priority
          msgEl.classList.add('warning');
          msgEl.style.display = 'flex';
          msgEl.textContent = validation.warnings[key];
        }
      });
    },

    /**
     * Convert camelCase to dash-case
     */
    dashCase(str) {
      return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
    },

    /**
     * Generates table of projections (Pre-retirement accumulation)
     */
    renderProjectionsTable(preRetProjections, requiredAsset) {
      const tbody = document.getElementById('projection-table-body');
      if (!tbody) return;

      tbody.innerHTML = '';

      preRetProjections.forEach((row) => {
        const tr = document.createElement('tr');
        
        // Mark retirement start row visually
        const isRetirementStart = row.yearIndex === preRetProjections.length - 1;
        if (isRetirementStart) {
          tr.className = 'retire-row';
        }

        // Calculate progress percentage relative to requiredAsset goal
        let progressPercent = 0;
        if (requiredAsset > 0) {
          progressPercent = Math.min(100, (row.endBalanceCompound / requiredAsset) * 100);
        } else {
          progressPercent = 100;
        }

        const ageCol = `<td><strong>${row.age}세</strong></td>`;
        const yearCol = `<td class="hide-on-mobile">${row.yearIndex === 0 ? '시작' : `${row.yearIndex}년차`}</td>`;
        const accumContributionCol = `<td class="num-col hide-on-mobile">${window.Formatter.formatToEokMan(row.annualContribution)}</td>`;
        const endBalanceCol = `<td class="num-col text-emerald-400 font-bold" style="color: ${isRetirementStart ? '#34d399' : ''}">${window.Formatter.formatToEokMan(row.endBalanceCompound)}</td>`;
        const endBalanceSimpleCol = `<td class="num-col text-amber-500 hide-on-mobile">${window.Formatter.formatToEokMan(row.endBalanceSimple)}</td>`;
        const progressCol = `<td class="num-col font-bold">${progressPercent.toFixed(1)}%</td>`;

        tr.innerHTML = `${ageCol}${yearCol}${accumContributionCol}${endBalanceCol}${endBalanceSimpleCol}${progressCol}`;
        tbody.appendChild(tr);
      });
    }
  };

  window.UI = UI;
})();
