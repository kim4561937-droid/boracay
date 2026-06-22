/**
 * RetireMap Charts Module
 * Configures and updates Chart.js instances with custom premium dark-theme styling.
 */
(function() {
  let chartAssetGrowth = null;
  let chartSimpleVsCompound = null;
  let chartAssetDepletion = null;

  // Premium colors
  const COLOR_EMERALD = '#10b981';
  const COLOR_AMBER = '#f59e0b';
  const COLOR_INDIGO = '#6366f1';
  const COLOR_BLUE = '#3b82f6';
  const COLOR_GRID = 'rgba(255, 255, 255, 0.06)';
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
     * Destroy charts if they exist to prevent memory leaks or overlay issues
     */
    destroyAll() {
      if (chartAssetGrowth) { chartAssetGrowth.destroy(); chartAssetGrowth = null; }
      if (chartSimpleVsCompound) { chartSimpleVsCompound.destroy(); chartSimpleVsCompound = null; }
      if (chartAssetDepletion) { chartAssetDepletion.destroy(); chartAssetDepletion = null; }
    },

    /**
     * Initialize/Update Pre-Retirement Asset Growth Chart
     */
    renderAssetGrowth(canvasId, preRetProjections, requiredAsset) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const ages = preRetProjections.map(p => `${p.age}세`);
      const compoundData = preRetProjections.map(p => Math.round(p.endBalanceCompound / 10000)); // 만원 단위
      const simpleData = preRetProjections.map(p => Math.round(p.endBalanceSimple / 10000));
      const targetData = preRetProjections.map(() => Math.round(requiredAsset / 10000));

      const gradientCompound = this.createGradient(ctx, 'rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.00)');

      const data = {
        labels: ages,
        datasets: [
          {
            label: '복리 적립 (실제 계획)',
            data: compoundData,
            borderColor: COLOR_EMERALD,
            backgroundColor: gradientCompound || 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.2,
            pointRadius: ages.length > 20 ? 1 : 3,
            pointBackgroundColor: COLOR_EMERALD
          },
          {
            label: '단리 적립 (교육용)',
            data: simpleData,
            borderColor: COLOR_AMBER,
            borderWidth: 2,
            borderDash: [4, 4],
            fill: false,
            tension: 0.1,
            pointRadius: 0
          },
          {
            label: '목표 경제적 자유 자산',
            data: targetData,
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
          options: this.getCommonOptions('경제적 자유 달성 전 자산 누적 시뮬레이션 (만원)')
        });
      }
    },

    /**
     * Initialize/Update Simple vs Compound Comparison Chart
     */
    renderSimpleVsCompound(canvasId, preRetProjections) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const years = preRetProjections.map(p => `${p.yearIndex}년차`);
      const compoundData = preRetProjections.map(p => Math.round(p.endBalanceCompound / 10000));
      const simpleData = preRetProjections.map(p => Math.round(p.endBalanceSimple / 10000));

      // Bar Chart for simple comparison or a side-by-side area chart
      const data = {
        labels: years,
        datasets: [
          {
            label: '복리 누적자산',
            data: compoundData,
            borderColor: COLOR_EMERALD,
            backgroundColor: 'rgba(16, 185, 129, 0.4)',
            borderWidth: 1.5,
            borderRadius: 4,
            fill: true
          },
          {
            label: '단리 누적자산',
            data: simpleData,
            borderColor: COLOR_AMBER,
            backgroundColor: 'rgba(245, 158, 11, 0.4)',
            borderWidth: 1.5,
            borderRadius: 4,
            fill: true
          }
        ]
      };

      if (chartSimpleVsCompound) {
        chartSimpleVsCompound.data = data;
        chartSimpleVsCompound.update();
      } else {
        chartSimpleVsCompound = new Chart(ctx, {
          type: 'bar',
          data: data,
          options: this.getCommonOptions('연도별 단리 vs 복리 자산 규모 비교 (만원)')
        });
      }
    },

    /**
     * Initialize/Update Post-Financial Freedom Asset Trajectory Chart
     */
    renderAssetDepletion(canvasId, postRetProjections) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const ages = postRetProjections.map(p => `${p.age}세`);
      const endingBalanceCompoundData = postRetProjections.map(p => Math.round(p.endingBalanceCompound / 10000));
      const endingBalanceSimpleData = postRetProjections.map(p => Math.round(p.endingBalanceSimple / 10000));

      const gradientCompound = this.createGradient(ctx, 'rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0.00)');
      const gradientSimple = this.createGradient(ctx, 'rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.00)');

      const data = {
        labels: ages,
        datasets: [
          {
            label: '복리 자산 추이 (성장/소진)',
            data: endingBalanceCompoundData,
            borderColor: COLOR_BLUE,
            backgroundColor: gradientCompound || 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.1,
            pointRadius: ages.length > 20 ? 1 : 3,
            pointBackgroundColor: COLOR_BLUE
          },
          {
            label: '단리 자산 추이 (성장/소진)',
            data: endingBalanceSimpleData,
            borderColor: COLOR_AMBER,
            backgroundColor: gradientSimple || 'rgba(245, 158, 11, 0.05)',
            borderWidth: 2,
            borderDash: [4, 4],
            fill: true,
            tension: 0.1,
            pointRadius: 0
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
          options: this.getCommonOptions('경제적 자유 달성 후 연도별 자산 추이 (만원)')
        });
      }
    },

    /**
     * Helper to update all charts at once
     */
    updateAll(preRetProjections, postRetProjections, requiredAsset) {
      this.renderAssetGrowth('chart-growth', preRetProjections, requiredAsset);
      this.renderSimpleVsCompound('chart-compare', preRetProjections);
      this.renderAssetDepletion('chart-depletion', postRetProjections);
    },

    /**
     * Get baseline chart configuration options for premium dark/light mode look
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
            text: titleText,
            color: labelColor,
            font: {
              size: 14,
              family: "'Inter', sans-serif",
              weight: 'bold'
            }
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
                  // Format back to eok/man representation inside tooltip
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
                // If value >= 10000 (1억), represent as 1억, else as X만
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
