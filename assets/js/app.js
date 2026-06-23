/**
 * Financial Freedom Simulator App Entry Point
 * Loads configuration data, initializes application state, checks URL queries,
 * binds DOM events, and runs the first calculation render.
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('경제적 자유 시뮬레이터 초기화 중...');

  // 1. Load data from CSV files (with built-in offline fallbacks inside csv-loader.js)
  const presetsData = await window.CSVLoader.loadCSV('scenario_presets', 'assets/data/scenario_presets.csv');
  const helpTextsData = await window.CSVLoader.loadCSV('help_texts', 'assets/data/help_texts.csv');
  const exampleInputsData = await window.CSVLoader.loadCSV('example_inputs', 'assets/data/example_inputs.csv');

  // 2. Initialize State with data
  window.State.init(presetsData, helpTextsData, exampleInputsData);

  // 3. Process URL Query Parameters (State Hydration for shared links)
  hydrateStateFromURL();

  // 4. Sync State back to Form Inputs
  window.UI.syncInputsFromState();

  // 5. Bind User Interaction Events
  window.UI.bindEvents();

  // 6. Perform First Render & Calculation
  window.UI.render();

  console.log('경제적 자유 시뮬레이터 성공적으로 초기화 완료.');
});

/**
 * Hydrates state inputs from URL query string if parameters are present.
 * Labeled according to new parameters:
 * ?age=40&target=55&life=90&expense=3500000&assets=100000000&savings=2000000&infl=2.5&rate=6.0&postrate=3.0&reinvest=true
 */
function hydrateStateFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('age')) {
    const age = parseInt(urlParams.get('age'), 10);
    if (!isNaN(age)) window.State.inputs.currentAge = age;
  }
  
  if (urlParams.has('target')) {
    const target = parseInt(urlParams.get('target'), 10);
    if (!isNaN(target)) window.State.inputs.targetFreedomAge = target;
  } else if (urlParams.has('retire')) {
    // Fallback support for older URL keys
    const retire = parseInt(urlParams.get('retire'), 10);
    if (!isNaN(retire)) window.State.inputs.targetFreedomAge = retire;
  }
  
  if (urlParams.has('life')) {
    const life = parseInt(urlParams.get('life'), 10);
    if (!isNaN(life)) window.State.inputs.lifeExpectancy = life;
  }
  
  if (urlParams.has('expense')) {
    const expense = parseFloat(urlParams.get('expense'));
    if (!isNaN(expense)) window.State.inputs.monthlyExpenseNow = expense;
  }
  
  if (urlParams.has('assets')) {
    const assets = parseFloat(urlParams.get('assets'));
    if (!isNaN(assets)) window.State.inputs.currentAssets = assets;
  }

  if (urlParams.has('savings')) {
    const savings = parseFloat(urlParams.get('savings'));
    if (!isNaN(savings)) window.State.inputs.monthlySavings = savings;
  }
  
  if (urlParams.has('infl')) {
    const infl = parseFloat(urlParams.get('infl'));
    if (!isNaN(infl)) window.State.inputs.inflationRate = infl / 100;
  }
  
  if (urlParams.has('rate')) {
    const rate = parseFloat(urlParams.get('rate'));
    if (!isNaN(rate)) window.State.inputs.annualReturnRate = rate / 100;
  } else if (urlParams.has('preret')) {
    const preret = parseFloat(urlParams.get('preret'));
    if (!isNaN(preret)) window.State.inputs.annualReturnRate = preret / 100;
  }
  
  if (urlParams.has('postrate')) {
    const postrate = parseFloat(urlParams.get('postrate'));
    if (!isNaN(postrate)) window.State.inputs.postFreedomReturnRate = postrate / 100;
  } else if (urlParams.has('postret')) {
    const postret = parseFloat(urlParams.get('postret'));
    if (!isNaN(postret)) window.State.inputs.postFreedomReturnRate = postret / 100;
  }

  if (urlParams.has('reinvest')) {
    window.State.inputs.reinvestSurplus = urlParams.get('reinvest') === 'true';
  }

  // Recalculate to reflect the URL changes
  window.State.recalculate();
}
