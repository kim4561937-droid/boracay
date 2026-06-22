/**
 * RetireMap State Management Module
 * Holds current inputs, results, presets, and triggers calculations.
 */
(function() {
  const State = {
    // Current input parameters
    inputs: {
      currentAge: 40,
      retireAge: 60,
      lifeExpectancy: 90,
      monthlyExpenseNow: 3500000,
      currentAssets: 100000000,
      monthlyPension: 1200000,
      inflationRate: 0.025,
      preRetReturn: 0.06,
      postRetReturn: 0.03,
      useYearlyReturn: false
    },

    // Current active scenario id
    scenarioId: 'base',

    // Calculated outcomes
    results: {
      yearsToRetire: 20,
      retirementYears: 30,
      futureMonthlyExpense: 0,
      grossRetirementExpense: 0,
      requiredRetirementAsset: 0,
      monthlySavingsCompound: 0,
      monthlySavingsSimple: 0
    },

    // Projections arrays
    projections: {
      preRetirement: [],
      postRetirement: []
    },

    // Loaded configuration data from CSV
    meta: {
      scenarioPresets: [],
      helpTexts: {},
      yearlyReturnSamples: []
    },

    /**
     * Initialize state with metadata loaded from CSV files
     */
    init(presets, helpTextsArray, yearlyReturnsArray) {
      this.meta.scenarioPresets = presets;
      
      // Convert helpTextsArray to a map for easy lookup
      this.meta.helpTexts = {};
      helpTextsArray.forEach(item => {
        this.meta.helpTexts[item.key] = item;
      });

      this.meta.yearlyReturnSamples = yearlyReturnsArray;

      // Load base scenario values by default
      this.applyScenarioPreset('base');
    },

    /**
     * Apply values from a scenario preset
     */
    applyScenarioPreset(presetId) {
      this.scenarioId = presetId;
      const preset = this.meta.scenarioPresets.find(p => p.scenario_id === presetId);
      
      if (preset) {
        this.inputs.preRetReturn = parseFloat(preset.pre_ret_return);
        this.inputs.postRetReturn = parseFloat(preset.post_ret_return);
        this.inputs.inflationRate = parseFloat(preset.inflation_default);
      }
      
      this.recalculate();
    },

    /**
     * Set input values manually (flags as custom scenario if preRet/postRet/inflation values differ from preset)
     */
    updateInput(key, value) {
      this.inputs[key] = value;
      
      // If we modify preRetReturn, postRetReturn, or inflationRate, check if it matches a preset
      if (['preRetReturn', 'postRetReturn', 'inflationRate'].includes(key)) {
        let matchedId = 'custom';
        for (const preset of this.meta.scenarioPresets) {
          const preRet = parseFloat(preset.pre_ret_return);
          const postRet = parseFloat(preset.post_ret_return);
          const infl = parseFloat(preset.inflation_default);
          
          if (
            Math.abs(this.inputs.preRetReturn - preRet) < 0.0001 &&
            Math.abs(this.inputs.postRetReturn - postRet) < 0.0001 &&
            Math.abs(this.inputs.inflationRate - infl) < 0.0001
          ) {
            matchedId = preset.scenario_id;
            break;
          }
        }
        this.scenarioId = matchedId;
      }

      this.recalculate();
    },

    /**
     * Reset inputs to default example values
     */
    resetToDefault() {
      this.inputs = {
        currentAge: 40,
        retireAge: 60,
        lifeExpectancy: 90,
        monthlyExpenseNow: 3500000,
        currentAssets: 100000000,
        monthlyPension: 1200000,
        inflationRate: 0.025,
        preRetReturn: 0.06,
        postRetReturn: 0.03,
        useYearlyReturn: false
      };
      this.scenarioId = 'base';
      this.recalculate();
    },

    /**
     * Run financial calculations and update state results
     */
    recalculate() {
      // 1. Timeframes
      const yearsToRetire = window.Calculator.calculateYearsToRetire(this.inputs.currentAge, this.inputs.retireAge);
      const retirementYears = window.Calculator.calculateRetirementYears(this.inputs.retireAge, this.inputs.lifeExpectancy);

      // 2. Future expenses
      const futureMonthlyExpense = window.Calculator.calculateFutureMonthlyExpense(
        this.inputs.monthlyExpenseNow,
        this.inputs.inflationRate,
        yearsToRetire
      );

      const grossRetirementExpense = window.Calculator.calculateGrossRetirementExpense(
        futureMonthlyExpense,
        this.inputs.inflationRate,
        retirementYears
      );

      // 3. Required assets (discounted net expenses)
      const requiredRetirementAsset = window.Calculator.calculateRequiredRetirementAsset({
        futureMonthlyExpense,
        inflationRate: this.inputs.inflationRate,
        postRetReturn: this.inputs.postRetReturn,
        monthlyPension: this.inputs.monthlyPension,
        retirementYears
      });

      // 4. Savings rates (preRetReturn changes if useYearlyReturn is active)
      // Note: CSV yearly return mode is calculated as an average or simulated sequentially.
      // For MVP, if useYearlyReturn is ON, we'll calculate the geometric mean return of yearlyReturnSamples.
      let effectivePreReturn = this.inputs.preRetReturn;
      if (this.inputs.useYearlyReturn && this.meta.yearlyReturnSamples.length > 0) {
        // Geometric mean: (pi (1+r_i))^(1/n) - 1
        let product = 1;
        this.meta.yearlyReturnSamples.forEach(sample => {
          product *= (1 + parseFloat(sample.annual_return));
        });
        effectivePreReturn = Math.pow(product, 1 / this.meta.yearlyReturnSamples.length) - 1;
      }

      const monthlySavingsCompound = window.Calculator.calculateMonthlySavingsCompound({
        requiredRetirementAsset,
        currentAssets: this.inputs.currentAssets,
        preRetReturn: effectivePreReturn,
        yearsToRetire
      });

      const monthlySavingsSimple = window.Calculator.calculateMonthlySavingsSimple({
        requiredRetirementAsset,
        currentAssets: this.inputs.currentAssets,
        preRetReturn: effectivePreReturn,
        yearsToRetire
      });

      // Update state results
      this.results = {
        yearsToRetire,
        retirementYears,
        futureMonthlyExpense,
        grossRetirementExpense,
        requiredRetirementAsset,
        monthlySavingsCompound,
        monthlySavingsSimple
      };

      // 5. Generate Projections
      this.projections.preRetirement = window.Calculator.generatePreRetirementProjection({
        currentAge: this.inputs.currentAge,
        yearsToRetire,
        currentAssets: this.inputs.currentAssets,
        preRetReturn: effectivePreReturn,
        monthlySavingsCompound,
        monthlySavingsSimple
      });

      const preRetLen = this.projections.preRetirement.length;
      const lastPreRet = this.projections.preRetirement[preRetLen - 1];
      const startingAssetCompound = lastPreRet ? lastPreRet.endBalanceCompound : requiredRetirementAsset;
      const startingAssetSimple = lastPreRet ? lastPreRet.endBalanceSimple : requiredRetirementAsset;

      this.projections.postRetirement = window.Calculator.generatePostRetirementProjection({
        retireAge: this.inputs.retireAge,
        retirementYears,
        startingAssetCompound,
        startingAssetSimple,
        postRetReturn: this.inputs.postRetReturn,
        inflationRate: this.inputs.inflationRate,
        futureMonthlyExpense,
        monthlyPension: this.inputs.monthlyPension
      });
    }
  };

  window.State = State;
})();
