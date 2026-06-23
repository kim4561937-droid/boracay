/**
 * Financial Freedom Simulator Charts Module
 * Configures and updates Chart.js instances with premium styling.
 */
(function() {
  let chartAssetGrowth = null;
  let chartScenarioCompare = null;
  let chartAssetDepletion = null;

  // Premium colors
  const COLOR_EMERALD = '#10b981';
  const COLOR_AMBER = '#f59e0b';
  const COLOR_INDIGO = '#8b5cf6';
  const COLOR_BLUE = '#3b82f6';
  const COLOR_ROSE = '#f43f5e';
  const COLOR_TEXT = '#94a3b8';

  const Charts = {
    /**
     * Create gradient for chart lines
     */
    createGradient(ctx, color1, color2) {
      if (!ctx) return null;
      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      return gradient;
    },

    /**
     * Destroy charts to prevent memory leaks or overlay bugs
     */
    destroyAll() {
      if (chartAssetGrowth) { chartAssetGrowth.destroy(); chartAssetGrowth = null; }
      if (chartScenarioCompare) { chartScenarioCompare.destroy(); chartScenarioCompare = null; }
      if (chartAssetDepletion) { chartAssetDepletion.destroy(); chartAssetDepletion = null; }
    },

    /**
     * Render Pre-Freedom Asset Growth Chart (Chart 1)
     */
    renderAssetGrowth(canvasId, preFreedomProjections, requiredAsset) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const ages = preFreedomProjections.map(p => `${p.age}세`);
      const assetData = preFreedomProjections.map(p => Math.round(p.endingAsset / 10000)); // 만원 단위
      const targetLineData = preFreedomProjections.map(() => Math.round(requiredAsset / 10000));

      const gradientGrowth = this.createGradient(ctx, 'rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.00)');

      const data = {
        labels: ages,
        datasets: [
          {
            label: '자산 성장 곡선',
            data: assetData,
            borderColor: COLOR_EMERALD,
            backgroundColor: gradientGrowth || 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.2,
            pointRadius: ages.length > 20 ? 1 : 3,
            pointBackgroundColor: COLOR_EMERALD
          },
          {
            label: '목표자산 기준선',
            data: targetLineData,
            borderColor: COLOR_INDIGO,
            borderWidth: 2,
            borderDash: [6, 6],
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 0
          }
        ]
      };

      if (chartAssetGrowth) {
        chartAssetGrowth.data = data;
        chartAssetGrowth.update();
      } else {
        chartAssetGrowth = new Chart(ctx, {
          type: 'line',
          data: data,
          options: this.getCommonOptions('목표자산 달성 시뮬레이션 (만원)')
        });
      }
    },

    /**
     * Render Scenario Compare Chart (Chart 2)
     */
    renderScenarioCompare(canvasId, scenarios, lifeExpectancy) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      
      const ip = window.State.inputs;
      const currentAge = ip.currentAge;

      const currentSavingsStr = window.Formatter.formatToEokMan(ip.monthlySavings);
      const currentReturnStr = window.Formatter.formatPercent(ip.annualReturnRate);
      
      const savingsAdd50Str = window.Formatter.formatToEokMan(ip.monthlySavings + 500000);
      const savingsAdd100Str = window.Formatter.formatToEokMan(ip.monthlySavings + 1000000);
      const returnAdd1Str = window.Formatter.formatPercent(ip.annualReturnRate + 0.01);
      const returnAdd2Str = window.Formatter.formatPercent(ip.annualReturnRate + 0.02);

      const labels = [
        `현재 조건 (저축 ${currentSavingsStr} / ${currentReturnStr})`,
        `저축액 +50만 (저축 ${savingsAdd50Str} / ${currentReturnStr})`,
        `저축액 +100만 (저축 ${savingsAdd100Str} / ${currentReturnStr})`,
        `수익률 +1%p (저축 ${currentSavingsStr} / ${returnAdd1Str})`,
        `수익률 +2%p (저축 ${currentSavingsStr} / ${returnAdd2Str})`
      ];

      // Draw achievement age as floating bar ranges [startAge, endAge]
      const rawDataValues = [
        [currentAge, scenarios.current.achieved ? scenarios.current.age : lifeExpectancy],
        [currentAge, scenarios.savingsAdd50.achieved ? scenarios.savingsAdd50.age : lifeExpectancy],
        [currentAge, scenarios.savingsAdd100.achieved ? scenarios.savingsAdd100.age : lifeExpectancy],
        [currentAge, scenarios.returnAdd1.achieved ? scenarios.returnAdd1.age : lifeExpectancy],
        [currentAge, scenarios.returnAdd2.achieved ? scenarios.returnAdd2.age : lifeExpectancy]
      ];

      const roundToOneDecimal = v => Math.round(v * 10) / 10;
      const dataValues = rawDataValues.map(range => [range[0], roundToOneDecimal(range[1])]);

      const colors = dataValues.map((val, idx) => {
        const achieved = [
          scenarios.current.achieved,
          scenarios.savingsAdd50.achieved,
          scenarios.savingsAdd100.achieved,
          scenarios.returnAdd1.achieved,
          scenarios.returnAdd2.achieved
        ][idx];
        return achieved ? 'rgba(139, 92, 246, 0.7)' : 'rgba(244, 63, 94, 0.5)'; // purple if achieved, red warning if not
      });

      const data = {
        labels: labels,
        datasets: [
          {
            label: '자산 적립 기간 (세)',
            data: dataValues,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.7', '1').replace('0.5', '1')),
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      };

      const options = this.getCommonOptions('시나리오별 달성 시점 비교 (세)');
      options.indexAxis = 'y';
      
      // Override scales for horizontal layout
      if (options.scales) {
        if (options.scales.x) {
          options.scales.x.min = currentAge;
          options.scales.x.max = lifeExpectancy;
          options.scales.x.ticks = options.scales.x.ticks || {};
          options.scales.x.ticks.callback = function(value) {
            return value + '세';
          };
        }
        if (options.scales.y) {
          options.scales.y.ticks = options.scales.y.ticks || {};
          delete options.scales.y.ticks.callback; // Clear currency/Eok formatting on scenario labels
        }
      }

      // Custom tooltip formatting for scenario compare to display ranges and durations
      options.plugins.tooltip.callbacks.label = function(context) {
        const idx = context.dataIndex;
        const key = ['current', 'savingsAdd50', 'savingsAdd100', 'returnAdd1', 'returnAdd2'][idx];
        const scenario = scenarios[key];
        if (scenario.achieved) {
          return `달성 나이: ${scenario.age.toFixed(1)}세 (적립 기간: ${currentAge}세 ~ ${scenario.age.toFixed(1)}세, ${(scenario.months / 12).toFixed(1)}년)`;
        } else {
          return `기대수명 내 달성 불가 (적립 시뮬레이션 범위: ${currentAge}세 ~ ${lifeExpectancy}세)`;
        }
      };

      if (chartScenarioCompare) {
        chartScenarioCompare.data = data;
        chartScenarioCompare.options = options;
        chartScenarioCompare.update();
      } else {
        chartScenarioCompare = new Chart(ctx, {
          type: 'bar',
          data: data,
          options: options
        });
      }
    },

    /**
     * Render Post-Freedom Asset Trajectory Chart (Chart 3)
     */
    renderAssetDepletion(canvasId, postFreedomProjections) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const ages = postFreedomProjections.map(p => `${p.age}세`);
      const endingAssets = postFreedomProjections.map(p => Math.round(p.endingAsset / 10000));

      const isDepleting = endingAssets[endingAssets.length - 1] < endingAssets[0] * 0.9;
      const themeColor = isDepleting ? COLOR_ROSE : COLOR_BLUE;
      const themeBg = isDepleting ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)';
      const gradient = this.createGradient(ctx, themeBg, 'rgba(0, 0, 0, 0)');

      const data = {
        labels: ages,
        datasets: [
          {
            label: '자산 잔액 추이',
            data: endingAssets,
            borderColor: themeColor,
            backgroundColor: gradient || themeBg,
            borderWidth: 3,
            fill: true,
            tension: 0.1,
            pointRadius: ages.length > 20 ? 1 : 3,
            pointBackgroundColor: themeColor
          }
        ]
      };

      if (chartAssetDepletion) {
        chartAssetDepletion.data = data;
        chartAssetDepletion.update();
      } else {
        chartAssetDepletion = new Chart(ctx, {
          type: 'line',
          data: data,
          options: this.getCommonOptions('경제적 자유 달성 후 자산 추이 (만원)')
        });
      }
    },

    /**
     * Update all charts
     */
    updateAll(preFreedomProjections, postFreedomProjections, requiredAsset, scenarios, lifeExpectancy) {
      this.renderAssetGrowth('chart-growth', preFreedomProjections, requiredAsset);
      if (scenarios && Object.keys(scenarios).length > 0) {
        this.renderScenarioCompare('chart-compare', scenarios, lifeExpectancy);
      }
      this.renderAssetDepletion('chart-depletion', postFreedomProjections);
    },

    /**
     * Force Chart.js instances to resize and adjust to visible container boundaries
     */
    resizeAll() {
      if (chartAssetGrowth) { chartAssetGrowth.resize(); }
      if (chartScenarioCompare) { chartScenarioCompare.resize(); }
      if (chartAssetDepletion) { chartAssetDepletion.resize(); }
    },

    /**
     * Chart configuration options based on dark/light mode
     */
    getCommonOptions(titleText) {
      const isLight = document.body.classList.contains('light-theme');
      const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)';
      const textColor = isLight ? '#475569' : '#94a3b8';
      const labelColor = isLight ? '#0f172a' : '#f8fafc';
      const tooltipBg = isLight ? '#ffffff' : '#151e33';
      const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      const tooltipText = isLight ? '#0f172a' : '#f8fafc';

      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
            text: titleText
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: labelColor,
              boxWidth: 12,
              font: {
                size: 11,
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            borderWidth: 1,
            titleColor: tooltipText,
            bodyColor: isLight ? '#334155' : '#e2e8f0',
            titleFont: {
              family: "'Inter', sans-serif",
              weight: 'bold'
            },
            bodyFont: {
              family: "'Outfit', 'Inter', sans-serif"
            },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  const valueInWon = context.parsed.y * 10000;
                  label += window.Formatter.formatToEokMan(valueInWon);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: {
                size: 10,
                family: "'Inter', sans-serif"
              }
            }
          },
          y: {
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: {
                size: 10,
                family: "'Outfit', 'Inter', sans-serif"
              },
              callback: function(value) {
                const valueInWon = value * 10000;
                if (valueInWon >= 100000000) {
                  return (valueInWon / 100000000).toFixed(0) + '억';
                } else if (valueInWon >= 10000) {
                  return (valueInWon / 10000).toLocaleString() + '만';
                }
                return value.toLocaleString();
              }
            }
          }
        }
      };
    }
  };

  window.Charts = Charts;
})();
