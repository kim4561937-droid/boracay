/**
 * RetireMap Validators Module
 * Checks input ranges, relationships, and flags errors or warnings.
 * Terminology updated from "은퇴" to "경제적 자유 달성".
 */
(function() {
  const Validators = {
    /**
     * Validates retirement planner inputs
     * @param {Object} inputs - Planner input values
     * @returns {Object} { isValid: boolean, errors: Object, warnings: Object }
     */
    validateInputs(inputs) {
      const errors = {};
      const warnings = {};

      // 1. Current Age (현재 나이: 20 ~ 80)
      if (isNaN(inputs.currentAge)) {
        errors.currentAge = '현재 나이를 숫자로 입력해주세요.';
      } else if (inputs.currentAge < 20 || inputs.currentAge > 80) {
        errors.currentAge = '현재 나이는 20세에서 80세 사이여야 합니다.';
      }

      // 2. Retire Age (경제적 자유 달성 나이)
      if (isNaN(inputs.retireAge)) {
        errors.retireAge = '경제적 자유 달성 나이를 숫자로 입력해주세요.';
      } else if (inputs.retireAge <= inputs.currentAge) {
        errors.retireAge = '경제적 자유 달성 나이는 현재 나이보다 커야 합니다.';
      } else if (inputs.retireAge > 100) {
        errors.retireAge = '경제적 자유 달성 나이는 최대 100세까지 설정 가능합니다.';
      }

      // 3. Life Expectancy (기대수명)
      if (isNaN(inputs.lifeExpectancy)) {
        errors.lifeExpectancy = '기대수명을 숫자로 입력해주세요.';
      } else if (inputs.lifeExpectancy <= inputs.retireAge) {
        errors.lifeExpectancy = '기대수명은 경제적 자유 달성 나이보다 커야 합니다.';
      } else if (inputs.lifeExpectancy > 110) {
        errors.lifeExpectancy = '기대수명은 최대 110세까지 설정 가능합니다.';
      }

      // 4. Monthly Expense Now (현재 월 생활비 > 0)
      if (isNaN(inputs.monthlyExpenseNow)) {
        errors.monthlyExpenseNow = '현재 월 생활비를 숫자로 입력해주세요.';
      } else if (inputs.monthlyExpenseNow <= 0) {
        errors.monthlyExpenseNow = '현재 월 생활비는 0보다 커야 합니다.';
      }

      // 5. Current Assets (현재 보유 자산 >= 0)
      if (isNaN(inputs.currentAssets)) {
        errors.currentAssets = '현재 보유 자산을 숫자로 입력해주세요.';
      } else if (inputs.currentAssets < 0) {
        errors.currentAssets = '현재 보유 자산은 0 이상이어야 합니다.';
      }

      // 6. Monthly Pension (경제적 자유 달성 후 예상 월 연금 >= 0)
      if (isNaN(inputs.monthlyPension)) {
        errors.monthlyPension = '예상 월 연금액을 숫자로 입력해주세요.';
      } else if (inputs.monthlyPension < 0) {
        errors.monthlyPension = '예상 월 연금액은 0 이상이어야 합니다.';
      }

      // 7. Inflation Rate (연 인플레이션율: -5% ~ 15% 범위 밖이면 경고)
      if (isNaN(inputs.inflationRate)) {
        errors.inflationRate = '연 인플레이션율을 숫자로 입력해주세요.';
      } else if (inputs.inflationRate < -5 || inputs.inflationRate > 15) {
        warnings.inflationRate = '인플레이션율이 비현실적입니다 (-5% ~ 15% 권장).';
      }

      // 8. Pre-retirement Return (경제적 자유 달성 전 예상 연 수익률: -20% ~ 20% 범위 밖이면 경고)
      if (isNaN(inputs.preRetReturn)) {
        errors.preRetReturn = '경제적 자유 달성 전 예상 연 수익률을 숫자로 입력해주세요.';
      } else if (inputs.preRetReturn < -20 || inputs.preRetReturn > 20) {
        warnings.preRetReturn = '경제적 자유 달성 전 수익률이 비현실적입니다 (-20% ~ 20% 권장).';
      }

      // 9. Post-retirement Return (경제적 자유 달성 후 예상 연 수익률: -20% ~ 20% 범위 밖이면 경고)
      if (isNaN(inputs.postRetReturn)) {
        errors.postRetReturn = '경제적 자유 달성 후 예상 연 수익률을 숫자로 입력해주세요.';
      } else if (inputs.postRetReturn < -20 || inputs.postRetReturn > 20) {
        warnings.postRetReturn = '경제적 자유 달성 후 수익률이 비현실적입니다 (-20% ~ 20% 권장).';
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings
      };
    }
  };

  window.Validators = Validators;
})();
