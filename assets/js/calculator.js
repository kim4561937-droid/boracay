/**
 * Financial Freedom Simulator Calculator Module
 * Lays out all calculations for the Financial Freedom Simulator MVP:
 * - Future Monthly Expense (inflation-adjusted)
 * - Required Financial Freedom Asset (discounted net expense summation)
 * - Estimated Freedom Age (via monthly asset accumulation simulation)
 * - Savings and Return rate short-term scenarios
 * - Post-freedom yearly sustainability simulation
 * - Final asset status determination
 */
(function() {
  const Calculator = {
    /**
     * Calculate future monthly expense at target freedom age
     * futureMonthlyExpense = targetMonthlyExpense * (1 + inflationRate) ^ yearsToTarget
     */
    calculateFutureMonthlyExpense(monthlyExpenseNow, inflationRate, yearsToTarget) {
      return monthlyExpenseNow * Math.pow(1 + inflationRate, Math.max(0, yearsToTarget));
    },

    /**
     * Calculate required freedom asset at the point of achievement
     * requiredFreedomAsset = Sum of [ annualExpense_t / (1 + postFreedomReturnRate)^t ]
     * for t = 1 to postFreedomYears
     */
    calculateRequiredFreedomAsset(futureMonthlyExpense, inflationRate, postFreedomReturnRate, postFreedomYears) {
      let totalRequired = 0;
      for (let t = 1; t <= postFreedomYears; t++) {
        const annualExpense_t = futureMonthlyExpense * 12 * Math.pow(1 + inflationRate, t - 1);
        const discountFactor = Math.pow(1 + postFreedomReturnRate, t);
        totalRequired += annualExpense_t / discountFactor;
      }
      return totalRequired;
    },

    /**
     * Calculate the undiscounted sum of all living expenses post-freedom
     */
    calculateGrossFreedomExpense(futureMonthlyExpense, inflationRate, postFreedomYears) {
      let grossTotal = 0;
      for (let t = 1; t <= postFreedomYears; t++) {
        grossTotal += futureMonthlyExpense * 12 * Math.pow(1 + inflationRate, t - 1);
      }
      return grossTotal;
    },

    /**
     * Calculate minimum monthly savings required to reach the target asset by targetFreedomAge
     */
    calculateMinMonthlySavings(requiredAsset, currentAssets, annualReturnRate, yearsToTarget) {
      if (yearsToTarget <= 0) return 0;
      const n = yearsToTarget * 12;
      const r = annualReturnRate / 12;

      const FV_currentAssets = currentAssets * Math.pow(1 + r, n);
      const gap = requiredAsset - FV_currentAssets;

      if (gap <= 0) return 0;
      if (r === 0) return gap / n;

      return gap * r / (Math.pow(1 + r, n) - 1);
    },

    /**
     * Simulates month-by-month asset growth to estimate target achievement age
     * Returns: { achieved: boolean, age: number, months: number, finalBalance: number }
     */
    simulateAssetGrowth(params) {
      const {
        currentAge,
        currentAssets,
        monthlySavings,
        annualReturnRate,
        requiredAsset,
        maxAge = 110
      } = params;

      let balance = currentAssets;
      const monthlyReturn = annualReturnRate / 12;
      const maxMonths = (maxAge - currentAge) * 12;

      // If already achieved at start
      if (balance >= requiredAsset) {
        return { achieved: true, age: currentAge, months: 0, finalBalance: balance };
      }

      // If return is <= 0 and savings is 0, it can never grow to reach the asset (unless already achieved)
      if (monthlyReturn <= 0 && monthlySavings <= 0) {
        return { achieved: false, age: maxAge, months: maxMonths, finalBalance: balance };
      }

      for (let m = 1; m <= maxMonths; m++) {
        balance = balance * (1 + monthlyReturn) + monthlySavings;
        if (balance >= requiredAsset) {
          const ageFraction = m / 12;
          return {
            achieved: true,
            age: currentAge + ageFraction,
            months: m,
            finalBalance: balance
          };
        }
      }

      return {
        achieved: false,
        age: maxAge,
        months: maxMonths,
        finalBalance: balance
      };
    },

    /**
     * Calculate achievement age and remaining period for comparison scenarios
     */
    calculateScenarios(inputs, requiredAssetAtTarget) {
      const baseParams = {
        currentAge: inputs.currentAge,
        currentAssets: inputs.currentAssets,
        requiredAsset: requiredAssetAtTarget,
        maxAge: inputs.lifeExpectancy
      };

      // Scenario 1: Current condition
      const current = this.simulateAssetGrowth({
        ...baseParams,
        monthlySavings: inputs.monthlySavings,
        annualReturnRate: inputs.annualReturnRate
      });

      // Scenario 2: Monthly savings + 500,000 KRW
      const savingsAdd50 = this.simulateAssetGrowth({
        ...baseParams,
        monthlySavings: inputs.monthlySavings + 500000,
        annualReturnRate: inputs.annualReturnRate
      });

      // Scenario 3: Monthly savings + 1,000,000 KRW
      const savingsAdd100 = this.simulateAssetGrowth({
        ...baseParams,
        monthlySavings: inputs.monthlySavings + 1000000,
        annualReturnRate: inputs.annualReturnRate
      });

      // Scenario 4: Return rate + 1%p
      const returnAdd1 = this.simulateAssetGrowth({
        ...baseParams,
        monthlySavings: inputs.monthlySavings,
        annualReturnRate: inputs.annualReturnRate + 0.01
      });

      // Scenario 5: Return rate + 2%p
      const returnAdd2 = this.simulateAssetGrowth({
        ...baseParams,
        monthlySavings: inputs.monthlySavings,
        annualReturnRate: inputs.annualReturnRate + 0.02
      });

      return {
        current,
        savingsAdd50,
        savingsAdd100,
        returnAdd1,
        returnAdd2
      };
    },

    /**
     * Simulates year-by-year post-freedom asset depletion or growth
     */
    generatePostFreedomProjection(params) {
      const {
        startAge,
        lifeExpectancy,
        startingAsset,
        postFreedomReturnRate,
        inflationRate,
        currentMonthlyExpense,
        currentAge,
        reinvestSurplus
      } = params;

      const projection = [];
      const postFreedomYears = lifeExpectancy - Math.floor(startAge);
      
      // Calculate future monthly expense at the actual startAge
      const yearsToStart = Math.max(0, startAge - currentAge);
      const startMonthlyExpense = currentMonthlyExpense * Math.pow(1 + inflationRate, yearsToStart);

      let balance = startingAsset;

      // Year 0 (achievement point)
      projection.push({
        yearIndex: 0,
        age: Math.floor(startAge),
        startingAsset: startingAsset,
        annualReturn: 0,
        annualExpense: 0,
        endingAsset: startingAsset
      });

      for (let t = 1; t <= postFreedomYears; t++) {
        const currentYearAge = Math.floor(startAge) + t;
        const startingAssetYear = balance;
        const annualReturn = startingAssetYear * postFreedomReturnRate;
        const annualExpense = startMonthlyExpense * 12 * Math.pow(1 + inflationRate, t - 1);
        
        let endingAsset = 0;
        if (reinvestSurplus) {
          endingAsset = startingAssetYear + annualReturn - annualExpense;
        } else {
          // If reinvestSurplus is OFF, surplus return is not reinvested
          const surplus = annualReturn - annualExpense;
          if (surplus > 0) {
            endingAsset = startingAssetYear; // Keeps initial principal, doesn't grow
          } else {
            endingAsset = startingAssetYear + surplus; // Decreases because return < expense
          }
        }

        // We allow balance to go negative in projection to show depletion curve clearly in charts/tables
        balance = endingAsset;

        projection.push({
          yearIndex: t,
          age: currentYearAge,
          startingAsset: startingAssetYear,
          annualReturn: annualReturn,
          annualExpense: annualExpense,
          endingAsset: endingAsset
        });
      }

      return projection;
    },

    /**
     * Determine final asset status based on starting and ending balances
     */
    determineAssetStatus(startingAsset, finalAsset, projection) {
      // 1) 소진형: 기대수명 이전에 자산이 0 이하가 되면 소진형
      const hasDepleted = projection.some((row, idx) => idx > 0 && row.endingAsset <= 0);
      if (hasDepleted || finalAsset <= 0 || finalAsset < startingAsset * 0.9) {
        return {
          status: 'depletion',
          name: '자산 소진형',
          description: '현재 가정에서는 경제적 자율 달성 후 원금을 점진적으로 소진하게 됩니다. 기대수명 전에 자산이 고갈될 위험이 있으므로 월 저축액을 늘리거나, 은퇴 후 수익률을 높이거나, 목표 생활비를 줄이는 조정을 권장합니다.'
        };
      }

      // 2) 유지형: 기대수명까지 자산이 유지되며, 마지막 자산이 시작 자산의 ±10% 범위 내면 유지형
      if (finalAsset >= startingAsset * 0.9 && finalAsset <= startingAsset * 1.1) {
        return {
          status: 'maintenance',
          name: '자산 유지형',
          description: '현재 가정에서는 경제적 자율 달성 후 원금을 크게 훼손하지 않고 은퇴 생활을 안정적으로 유지할 수 있습니다. 자산에서 발생하는 연간 수익이 연 생활비 지출과 조화를 이루는 견고한 은퇴 설계입니다.'
        };
      }

      // 3) 성장형: 기대수명 시점 자산이 시작 자산보다 유의미하게 크면 성장형
      return {
        status: 'growth',
        name: '자산 성장형',
        description: '현재 가정에서는 생활비를 지출하고도 투자 수익이 더 커서 남는 수익이 재투자되어 자산이 오히려 성장합니다. 대대손손 상속이 가능하거나 한층 더 풍요로운 노후 생활을 누릴 수 있는 최상의 시나리오입니다.'
      };
    },

    /**
     * Simulates year-by-year pre-freedom accumulation table
     */
    generatePreFreedomProjection(inputs, achievedMonths) {
      const projection = [];
      const years = Math.ceil(achievedMonths / 12);
      let balance = inputs.currentAssets;
      let cumulativeSavings = 0;
      const monthlyReturn = inputs.annualReturnRate / 12;

      // Year 0
      projection.push({
        yearIndex: 0,
        age: inputs.currentAge,
        cumulativeSavings: 0,
        endingAsset: inputs.currentAssets
      });

      for (let y = 1; y <= years; y++) {
        // Month-by-month simulation for 12 months (or up to the exact achieved months)
        for (let m = 1; m <= 12; m++) {
          const currentTotalMonth = (y - 1) * 12 + m;
          if (currentTotalMonth <= achievedMonths) {
            balance = balance * (1 + monthlyReturn) + inputs.monthlySavings;
            cumulativeSavings += inputs.monthlySavings;
          } else {
            // After achievement month, if we just want to fill out the final year,
            // we stop adding savings and returns or just let it flat line/stop.
            // But since the projection goes up to achievement year, this works.
          }
        }

        projection.push({
          yearIndex: y,
          age: inputs.currentAge + y,
          cumulativeSavings: cumulativeSavings,
          endingAsset: balance
        });
      }

      return projection;
    }
  };

  window.Calculator = Calculator;
})();
