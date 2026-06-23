/**
 * Financial Freedom Simulator Formatter Module
 * Handles currency formatting, Eok-Man representation, percent representation,
 * input sanitization, and summary text generation.
 */
(function() {
  const Formatter = {
    /**
     * Remove non-numeric characters and parse as float
     */
    normalizeCurrencyInput(value) {
      if (typeof value === 'number') return value;
      if (!value) return 0;
      const clean = value.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    },

    /**
     * Parse percent input (e.g., "2.5" -> 0.025)
     */
    normalizePercentInput(value) {
      if (typeof value === 'number') return value / 100;
      if (!value) return 0;
      const clean = value.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed / 100;
    },

    /**
     * Standard comma formatting
     */
    formatComma(value) {
      return Math.round(value).toLocaleString('ko-KR');
    },

    /**
     * Format currency as KRW (e.g., 3,500,000원)
     */
    formatCurrencyKRW(value) {
      return this.formatComma(value) + '원';
    },

    /**
     * Converts a raw Won value to a readable Eok/Man string
     * e.g., 1530000000 -> "약 15.3억원" or "15억 3,000만원"
     * We will use "15억 3,000만원" for precision, but "약 X억 Y천만원" or "X.Y억원" for results card summaries where appropriate.
     */
    formatToEokMan(value) {
      if (value === 0) return '0원';
      const isNegative = value < 0;
      const absValue = Math.abs(value);
      
      const eok = Math.floor(absValue / 100000000);
      const remainder = absValue % 100000000;
      const man = Math.round(remainder / 10000);
      
      let result = '';
      if (eok > 0) {
        result += `${eok}억`;
        if (man > 0) {
          result += ` ${this.formatComma(man)}만`;
        }
        result += '원';
      } else {
        result += `${this.formatComma(man)}만원`;
      }
      
      return (isNegative ? '-' : '') + result;
    },

    /**
     * Format decimal to percent string (e.g., 0.025 -> "2.5%")
     */
    formatPercent(value) {
      const percentage = value * 100;
      return parseFloat(percentage.toFixed(2)) + '%';
    },

    /**
     * Generate dynamic summary paragraph based on inputs, results and final status
     */
    generateSummarySentence(inputs, results, statusText) {
      const currentAge = inputs.currentAge;
      const targetFreedomAge = inputs.targetFreedomAge;
      const lifeExpectancy = inputs.lifeExpectancy;
      const inflationPercent = this.formatPercent(inputs.inflationRate);
      const annualReturnPercent = this.formatPercent(inputs.annualReturnRate);
      const postReturnPercent = this.formatPercent(inputs.postFreedomReturnRate);
      
      const monthlyExpenseNowStr = this.formatToEokMan(inputs.monthlyExpenseNow);
      const currentAssetsStr = this.formatToEokMan(inputs.currentAssets);
      const monthlySavingsStr = this.formatToEokMan(inputs.monthlySavings);
      const requiredAssetStr = this.formatToEokMan(results.requiredFreedomAsset);
      
      let summary = `현재 <strong>${currentAge}세</strong>, 현재 월 생활비 <strong>${monthlyExpenseNowStr}</strong>, `;
      summary += `경제적 자유 목표 나이 <strong>${targetFreedomAge}세</strong>, 기대수명 <strong>${lifeExpectancy}세</strong>, `;
      summary += `연 인플레이션 <strong>${inflationPercent}</strong> 기준으로 계산하면 경제적 자유에 필요한 목표자산은 약 <strong>${requiredAssetStr}</strong>입니다. `;
      summary += `현재 자산 <strong>${currentAssetsStr}</strong>, 월 저축액 <strong>${monthlySavingsStr}</strong>, `;
      summary += `연 <strong>${annualReturnPercent}</strong> 수익률을 가정할 경우 `;

      if (results.achieved) {
        summary += `약 <strong>${results.achievedAge.toFixed(1)}세</strong> 전후 목표자산에 도달할 것으로 예상됩니다. `;
      } else {
        summary += `기대수명(${lifeExpectancy}세) 이전에는 목표자산 달성이 어려울 것으로 예상됩니다. `;
      }

      summary += `경제적 자유 달성 후 연 <strong>${postReturnPercent}</strong> 수익률 기준으로는 생활비를 지출하면서 <strong>${statusText}</strong> 상태가 됩니다.`;

      return summary;
    }
  };

  window.Formatter = Formatter;
})();
