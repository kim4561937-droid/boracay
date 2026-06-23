/**
 * Financial Freedom Simulator State Management Module
 * Holds inputs, results, presets, and triggers calculation logic.
 */
(function() {
  const State = {
    // Current input parameters (Default values as specified in Section 15)
    inputs: {
      currentAge: 40,
      targetFreedomAge: 55,
      lifeExpectancy: 90,
      monthlyExpenseNow: 3500000,
      currentAssets: 100000000,
      monthlySavings: 2000000,
      inflationRate: 0.025,
      annualReturnRate: 0.06,
      postFreedomReturnRate: 0.03,
      reinvestSurplus: true
    },

    // Current active scenario id
    scenarioId: 'base',

    // Calculated outcomes
    results: {
      yearsToTarget: 15,
      postFreedomYears: 35,
      futureMonthlyExpense: 0,
      grossFreedomExpense: 0,
      requiredFreedomAsset: 0,
      minMonthlySavings: 0,
      achieved: true,
      achievedAge: 0,
      achievedMonths: 0,
      yearsRemaining: 0,
      status: { status: 'maintenance', name: '자산 유지형', description: '' }
    },

    // Projections arrays
    projections: {
      preFreedom: [],
      postFreedom: []
    },

    // Comparison scenarios (for charts & card values)
    scenarios: {},

    // Loaded configuration data from CSV
    meta: {
      scenarioPresets: [],
      helpTexts: {},
      exampleInputs: []
    },

    /**
     * Initialize state with metadata loaded from CSV files
     */
    init(presets, helpTextsArray, exampleInputsArray) {
      this.meta.scenarioPresets = presets;
      
      this.meta.helpTexts = {};
      helpTextsArray.forEach(item => {
        this.meta.helpTexts[item.key] = item;
      });

      this.meta.exampleInputs = exampleInputsArray;

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
        this.inputs.annualReturnRate = parseFloat(preset.annual_return);
        this.inputs.postFreedomReturnRate = parseFloat(preset.post_return);
        this.inputs.inflationRate = parseFloat(preset.inflation);
      }
      
      this.recalculate();
    },

    /**
     * Set input values manually (flags as custom scenario if values differ from preset)
     */
    updateInput(key, value) {
      this.inputs[key] = value;
      
      if (['annualReturnRate', 'postFreedomReturnRate', 'inflationRate'].includes(key)) {
        let matchedId = 'custom';
        for (const preset of this.meta.scenarioPresets) {
          const annualRet = parseFloat(preset.annual_return);
          const postRet = parseFloat(preset.post_return);
          const infl = parseFloat(preset.inflation);
          
          if (
            Math.abs(this.inputs.annualReturnRate - annualRet) < 0.0001 &&
            Math.abs(this.inputs.postFreedomReturnRate - postRet) < 0.0001 &&
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
      // Find default inputs in parsed CSV or fallback to standard default values
      const def = this.meta.exampleInputs.find(e => e.example_id === 'default');
      if (def) {
        this.inputs = {
          currentAge: parseInt(def.current_age, 10),
          targetFreedomAge: parseInt(def.target_age, 10),
          lifeExpectancy: parseInt(def.life_expectancy, 10),
          monthlyExpenseNow: parseFloat(def.monthly_expense),
          currentAssets: parseFloat(def.current_assets),
          monthlySavings: parseFloat(def.monthly_savings),
          inflationRate: parseFloat(def.inflation),
          annualReturnRate: parseFloat(def.annual_return),
          postFreedomReturnRate: parseFloat(def.post_return),
          reinvestSurplus: true
        };
      } else {
        this.inputs = {
          currentAge: 40,
          targetFreedomAge: 55,
          lifeExpectancy: 90,
          monthlyExpenseNow: 3500000,
          currentAssets: 100000000,
          monthlySavings: 2000000,
          inflationRate: 0.025,
          annualReturnRate: 0.06,
          postFreedomReturnRate: 0.03,
          reinvestSurplus: true
        };
      }
      this.scenarioId = 'base';
      this.recalculate();
    },

    /**
     * Run calculations and update state results and projections
     */
    recalculate() {
      const ip = this.inputs;

      // 1. Calculate timeframes
      const yearsToTarget = Math.max(0, ip.targetFreedomAge - ip.currentAge);
      const postFreedomYears = Math.max(0, ip.lifeExpectancy - ip.targetFreedomAge);

      // 2. Calculate expenses at target age
      const futureMonthlyExpense = window.Calculator.calculateFutureMonthlyExpense(
        ip.monthlyExpenseNow,
        ip.inflationRate,
        yearsToTarget
      );

      const grossFreedomExpense = window.Calculator.calculateGrossFreedomExpense(
        futureMonthlyExpense,
        ip.inflationRate,
        postFreedomYears
      );

      // 3. Calculate required freedom asset
      const requiredFreedomAsset = window.Calculator.calculateRequiredFreedomAsset(
        futureMonthlyExpense,
        ip.inflationRate,
        ip.postFreedomReturnRate,
        postFreedomYears
      );

      // 4. Calculate min monthly savings to hit target asset at targetFreedomAge
      const minMonthlySavings = window.Calculator.calculateMinMonthlySavings(
        requiredFreedomAsset,
        ip.currentAssets,
        ip.annualReturnRate,
        yearsToTarget
      );

      // 5. Simulate achievement age under current conditions
      const baseSimulation = window.Calculator.simulateAssetGrowth({
        currentAge: ip.currentAge,
        currentAssets: ip.currentAssets,
        monthlySavings: ip.monthlySavings,
        annualReturnRate: ip.annualReturnRate,
        requiredAsset: requiredFreedomAsset,
        maxAge: ip.lifeExpectancy
      });

      // 6. Simulate other comparison scenarios
      const scenarios = window.Calculator.calculateScenarios(ip, requiredFreedomAsset);

      // 7. Generate pre-freedom projections
      const preFreedomProjections = window.Calculator.generatePreFreedomProjection(
        ip,
        baseSimulation.achieved ? baseSimulation.months : (ip.lifeExpectancy - ip.currentAge) * 12
      );

      // 8. Generate post-freedom projections starting from actual achievement or target freedom age
      const startAge = baseSimulation.achieved ? baseSimulation.age : ip.targetFreedomAge;
      const startingAsset = baseSimulation.achieved ? baseSimulation.finalBalance : requiredFreedomAsset;

      const postFreedomProjections = window.Calculator.generatePostFreedomProjection({
        startAge,
        lifeExpectancy: ip.lifeExpectancy,
        startingAsset,
        postFreedomReturnRate: ip.postFreedomReturnRate,
        inflationRate: ip.inflationRate,
        currentMonthlyExpense: ip.monthlyExpenseNow,
        currentAge: ip.currentAge,
        reinvestSurplus: ip.reinvestSurplus
      });

      // 9. Determine sustainability status
      const lastRow = postFreedomProjections[postFreedomProjections.length - 1];
      const finalAsset = lastRow ? lastRow.endingAsset : 0;
      const status = window.Calculator.determineAssetStatus(startingAsset, finalAsset, postFreedomProjections);

      // Write results to state
      this.results = {
        yearsToTarget,
        postFreedomYears,
        futureMonthlyExpense,
        grossFreedomExpense,
        requiredFreedomAsset,
        minMonthlySavings,
        achieved: baseSimulation.achieved,
        achievedAge: baseSimulation.age,
        achievedMonths: baseSimulation.months,
        yearsRemaining: baseSimulation.months / 12,
        status
      };

      this.scenarios = scenarios;

      this.projections = {
        preFreedom: preFreedomProjections,
        postFreedom: postFreedomProjections
      };
    }
  };

  window.State = State;
})();
