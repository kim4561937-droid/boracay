/**
 * RetireMap Formatter Module
 * Handles currency formatting, Eok-Man conversion, percent representation,
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
     * e.g., 1510000000 -> "15억 1,000만원"
     * e.g., 3500000 -> "350만원"
     * e.g., 0 -> "0원"
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
      // Keep up to 2 decimal places, remove trailing zeros
      return parseFloat(percentage.toFixed(2)) + '%';
    },

    /**
     * Generate dynamic summary paragraph based on inputs and calculations
     */
    generateSummarySentence(inputs, results) {
      const currentAge = inputs.currentAge;
      const retireAge = inputs.retireAge;
      const lifeExpectancy = inputs.lifeExpectancy;
      const inflationPercent = this.formatPercent(inputs.inflationRate);
      const preRetReturnPercent = this.formatPercent(inputs.preRetReturn);
      const postRetReturnPercent = this.formatPercent(inputs.postRetReturn);
      
      const livingExpensesNowStr = this.formatToEokMan(inputs.monthlyExpenseNow);
      const futureExpenseStr = this.formatToEokMan(results.futureMonthlyExpense);
      const retirementYears = retireAge - currentAge;
      const lifeYears = lifeExpectancy - retireAge;
      const grossRequiredStr = this.formatToEokMan(results.grossRetirementExpense);
      const requiredAssetStr = this.formatToEokMan(results.requiredRetirementAsset);
      const monthlyPensionStr = this.formatToEokMan(inputs.monthlyPension);
      const savingsCompoundStr = this.formatToEokMan(results.monthlySavingsCompound);

      let summary = `현재 월 생활비 <strong>${livingExpensesNowStr}</strong>, `;
      summary += `<strong>${retireAge}세 경제적 자유 달성</strong>(준비 기간 ${retirementYears}년), `;
      summary += `기대수명 <strong>${lifeExpectancy}세</strong>(달성 후 생활 ${lifeYears}년), `;
      summary += `연 인플레이션 <strong>${inflationPercent}</strong> 기준으로 계산하면 `;
      summary += `경제적 자유 달성 시점의 월 필요 생활비는 약 <strong>${futureExpenseStr}</strong>입니다. `;
      summary += `경제적 자유 달성 후 ${lifeYears}년 동안 필요한 총 생활비(할인 전 총액)는 약 <strong>${grossRequiredStr}</strong>이며, `;
      
      if (inputs.monthlyPension > 0) {
        summary += `월 <strong>${monthlyPensionStr}</strong>의 연금 수입을 반영하여 달성 전 수익률 ${preRetReturnPercent} 및 달성 후 자산운용 수익률 ${postRetReturnPercent}로 역산한 실제 목표 경제적 자유 자산은 약 <strong>${requiredAssetStr}</strong>입니다. `;
      } else {
        summary += `달성 전 수익률 ${preRetReturnPercent} 및 달성 후 자산운용 수익률 ${postRetReturnPercent}로 역산한 실제 목표 경제적 자유 자산은 약 <strong>${requiredAssetStr}</strong>입니다. `;
      }

      if (results.monthlySavingsCompound > 0) {
        summary += `현재 보유 자산 <strong>${this.formatToEokMan(inputs.currentAssets)}</strong>을 바탕으로 목표를 달성하기 위해서는 `;
        summary += `앞으로 매월 약 <strong>${savingsCompoundStr}</strong>(복리 기준)을 적립해야 합니다.`;
      } else {
        summary += `현재 보유 자산 <strong>${this.formatToEokMan(inputs.currentAssets)}</strong>의 미래 성장치만으로도 추가 적립 없이 목표 자산을 달성할 수 있습니다!`;
      }

      return summary;
    }
  };

  window.Formatter = Formatter;
})();
