/**
 * RetireMap Calculator Module
 * Handles all financial equations, compounding, simple interest,
 * and yearly projections (pre-retirement and post-retirement).
 */
(function() {
  const Calculator = {
    /**
     * Calculate years to retire
     */
    calculateYearsToRetire(currentAge, retireAge) {
      return Math.max(0, retireAge - currentAge);
    },

    /**
     * Calculate years of retirement
     */
    calculateRetirementYears(retireAge, lifeExpectancy) {
      return Math.max(0, lifeExpectancy - retireAge);
    },

    /**
     * Calculate future monthly expense adjusted for inflation
     */
    calculateFutureMonthlyExpense(monthlyExpenseNow, inflationRate, yearsToRetire) {
      return monthlyExpenseNow * Math.pow(1 + inflationRate, yearsToRetire);
    },

    /**
     * Calculate required retirement assets at the point of retirement
     * using the discounted net expense method.
     */
    calculateRequiredRetirementAsset(params) {
      const {
        futureMonthlyExpense,
        inflationRate,
        postRetReturn,
        monthlyPension,
        retirementYears
      } = params;

      let totalRequired = 0;
      const annualPension = monthlyPension * 12;

      for (let t = 1; t <= retirementYears; t++) {
        // Annual expense grows with inflation each year of retirement
        const annualExpense_t = futureMonthlyExpense * 12 * Math.pow(1 + inflationRate, t - 1);
        const netExpense_t = Math.max(annualExpense_t - annualPension, 0);
        
        // Discount back to retirement point (t=0) using post-retirement return
        const discountedNetExpense_t = netExpense_t / Math.pow(1 + postRetReturn, t);
        totalRequired += discountedNetExpense_t;
      }

      return totalRequired;
    },

    /**
     * Calculate gross (inflation-adjusted, non-discounted) retirement expenses
     */
    calculateGrossRetirementExpense(futureMonthlyExpense, inflationRate, retirementYears) {
      let grossTotal = 0;
      for (let t = 1; t <= retirementYears; t++) {
        grossTotal += futureMonthlyExpense * 12 * Math.pow(1 + inflationRate, t - 1);
      }
      return grossTotal;
    },

    /**
     * Calculate monthly savings required under monthly compounding
     */
    calculateMonthlySavingsCompound(params) {
      const {
        requiredRetirementAsset,
        currentAssets,
        preRetReturn,
        yearsToRetire
      } = params;

      if (yearsToRetire <= 0) return 0;

      const r = preRetReturn / 12;
      const n = yearsToRetire * 12;

      // Future value of current assets under monthly compounding
      const FV_currentAssets = currentAssets * Math.pow(1 + r, n);
      const targetGap = requiredRetirementAsset - FV_currentAssets;

      if (targetGap <= 0) {
        return 0; // Current assets are sufficient
      }

      if (r === 0) {
        return targetGap / n;
      }

      // PMT formula: Gap * r / ((1 + r)^n - 1)
      return targetGap * r / (Math.pow(1 + r, n) - 1);
    },

    /**
     * Calculate monthly savings required under simple interest (approximation)
     */
    calculateMonthlySavingsSimple(params) {
      const {
        requiredRetirementAsset,
        currentAssets,
        preRetReturn,
        yearsToRetire
      } = params;

      if (yearsToRetire <= 0) return 0;

      const n = yearsToRetire * 12;

      // Future value of current assets under simple interest
      const FV_currentAssets_simple = currentAssets * (1 + preRetReturn * yearsToRetire);
      const targetGap = requiredRetirementAsset - FV_currentAssets_simple;

      if (targetGap <= 0) {
        return 0;
      }

      // PMT_simple = targetGap / [ n * (1 + preRetReturn * yearsToRetire / 2) ]
      const denominator = n * (1 + (preRetReturn * yearsToRetire) / 2);
      if (denominator <= 0) return 0;

      const pmtSimple = targetGap / denominator;
      return Math.max(0, pmtSimple);
    },

    /**
     * Generate pre-retirement yearly projection table for UI & Charting
     */
    generatePreRetirementProjection(params) {
      const {
        currentAge,
        yearsToRetire,
        currentAssets,
        preRetReturn,
        monthlySavingsCompound,
        monthlySavingsSimple
      } = params;

      const projection = [];
      const r = preRetReturn / 12;
      
      let balanceCompound = currentAssets;
      let cumulativeContributionCompound = 0;
      
      // Starting point (Year 0)
      projection.push({
        yearIndex: 0,
        age: currentAge,
        annualContribution: 0,
        endBalanceCompound: currentAssets,
        endBalanceSimple: currentAssets,
        targetAsset: 0
      });

      for (let y = 1; y <= yearsToRetire; y++) {
        // Compound simulation (run month-by-month for 12 months)
        for (let m = 1; m <= 12; m++) {
          balanceCompound = balanceCompound * (1 + r) + monthlySavingsCompound;
          cumulativeContributionCompound += monthlySavingsCompound;
        }

        // Simple interest formula for year y
        const n_y = y * 12;
        const balanceSimple = currentAssets * (1 + preRetReturn * y) + 
                              monthlySavingsSimple * n_y * (1 + (preRetReturn * y) / 2);

        projection.push({
          yearIndex: y,
          age: currentAge + y,
          annualContribution: cumulativeContributionCompound,
          endBalanceCompound: balanceCompound,
          endBalanceSimple: balanceSimple
        });
      }

      return projection;
    },

    /**
     * Generate post-financial freedom yearly projection table (decumulation or growth)
     */
    generatePostRetirementProjection(params) {
      const {
        retireAge,
        retirementYears,
        startingAssetCompound,
        startingAssetSimple,
        postRetReturn,
        inflationRate,
        futureMonthlyExpense,
        monthlyPension
      } = params;

      const projection = [];
      let balanceCompound = startingAssetCompound;
      let balanceSimple = startingAssetSimple;
      const annualPension = monthlyPension * 12;

      // Starting point (Year 0 of financial freedom)
      projection.push({
        retirementYearIndex: 0,
        age: retireAge,
        annualExpense: 0,
        annualPension: 0,
        netExpense: 0,
        endingBalanceCompound: startingAssetCompound,
        endingBalanceSimple: startingAssetSimple
      });

      for (let t = 1; t <= retirementYears; t++) {
        const annualExpense = futureMonthlyExpense * 12 * Math.pow(1 + inflationRate, t - 1);
        const netExpense = Math.max(annualExpense - annualPension, 0);
        
        // Compound decumulation/growth
        const endingBalanceCompound = (balanceCompound * (1 + postRetReturn)) - netExpense;
        balanceCompound = endingBalanceCompound;

        // Simple decumulation/growth (Flat interest on initial simple capital)
        const interestSimple = startingAssetSimple * postRetReturn;
        const endingBalanceSimple = (balanceSimple + interestSimple) - netExpense;
        balanceSimple = endingBalanceSimple;

        projection.push({
          retirementYearIndex: t,
          age: retireAge + t,
          annualExpense: annualExpense,
          annualPension: annualPension,
          netExpense: netExpense,
          endingBalanceCompound: endingBalanceCompound,
          endingBalanceSimple: endingBalanceSimple
        });
      }

      return projection;
    }
  };

  window.Calculator = Calculator;
})();
