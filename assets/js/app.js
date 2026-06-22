/**
 * RetireMap App Entry Point
 * Loads configuration data, initializes application state, checks URL queries,
 * binds DOM events, and runs the first calculation render.
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('경제적 자유 설계 계산기 초기화 중...');

  // 1. Load data from CSV files (with built-in offline fallbacks inside csv-loader.js)
  const presetsData = await window.CSVLoader.loadCSV('scenario_presets', 'assets/data/scenario_presets.csv');
  const helpTextsData = await window.CSVLoader.loadCSV('help_texts', 'assets/data/help_texts.csv');
  const yearlyReturnsData = await window.CSVLoader.loadCSV('yearly_return_samples', 'assets/data/yearly_return_samples.csv');

  // 2. Initialize State with data
  window.State.init(presetsData, helpTextsData, yearlyReturnsData);

  // 3. Process URL Query Parameters (State Hydration for shared links)
  hydrateStateFromURL();

  // 4. Sync State back to Form Inputs
  window.UI.syncInputsFromState();

  // 5. Bind User Interaction Events
  window.UI.bindEvents();

  // 6. Perform First Render & Calculation
  window.UI.render();

  console.log('경제적 자유 설계 계산기 성공적으로 초기화 완료.');
});

/**
 * Hydrates state inputs from URL query string if parameters are present.
 * Example: ?age=35&retire=60&life=90&expense=3800000&assets=150000000&pension=1200000&infl=2.5&preret=6.0&postret=3.0
 */
function hydrateStateFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('age')) {
    const age = parseInt(urlParams.get('age'), 10);
    if (!isNaN(age)) window.State.inputs.currentAge = age;
  }
  
  if (urlParams.has('retire')) {
    const retire = parseInt(urlParams.get('retire'), 10);
    if (!isNaN(retire)) window.State.inputs.retireAge = retire;
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
  
  if (urlParams.has('pension')) {
    const pension = parseFloat(urlParams.get('pension'));
    if (!isNaN(pension)) window.State.inputs.monthlyPension = pension;
  }
  
  if (urlParams.has('infl')) {
    const infl = parseFloat(urlParams.get('infl'));
    if (!isNaN(infl)) window.State.inputs.inflationRate = infl / 100;
  }
  
  if (urlParams.has('preret')) {
    const preret = parseFloat(urlParams.get('preret'));
    if (!isNaN(preret)) window.State.inputs.preRetReturn = preret / 100;
  }
  
  if (urlParams.has('postret')) {
    const postret = parseFloat(urlParams.get('postret'));
    if (!isNaN(postret)) window.State.inputs.postRetReturn = postret / 100;
  }

  // Recalculate to reflect the URL changes
  window.State.recalculate();
}
