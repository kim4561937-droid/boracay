/**
 * Financial Freedom Simulator CSV Loader Module
 * Loads and parses CSV files. Since the app may run on file:// protocol
 * (double-clicking index.html), it incorporates a fallback to embedded
 * CSV data strings to prevent CORS policy blocks.
 */
(function() {
  // Embedded fallback CSV strings
  const EMBEDDED_CSV_DATA = {
    'scenario_presets': `scenario_id,scenario_name,annual_return,post_return,inflation,description
conservative,보수적,0.04,0.03,0.02,보수적 시나리오
base,기준,0.06,0.03,0.025,기준 시나리오
optimistic,낙관적,0.08,0.04,0.03,낙관적 시나리오`,

    'help_texts': `key,title,body
inflation,인플레이션,현재 생활비를 미래 시점 생활비로 환산할 때 사용하는 연 물가상승률입니다.
annual_return,기대수익률,경제적 자율 달성 전 자산이 기대할 수 있는 연평균 수익률입니다.
post_return,달성 후 수익률,경제적 자율 달성 후 자산을 운용할 때 기대하는 연평균 수익률입니다.
freedom_asset,경제적 자율 목표자산,경제적 자율 달성 후 기대수명까지 생활비를 감당하기 위해 필요한 자산입니다.`,

    'example_inputs': `example_id,current_age,target_age,life_expectancy,monthly_expense,current_assets,monthly_savings,inflation,annual_return,post_return
default,40,55,90,3500000,100000000,2000000,0.025,0.06,0.03`
  };

  const CSVLoader = {
    /**
     * Parses CSV text into an array of objects
     * @param {string} text - CSV content
     * @returns {Array<Object>} parsed rows
     */
    parse(text) {
      if (!text) return [];
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return [];

      const headers = lines[0].split(',').map(h => h.trim());
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(',');
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : '';
        }
        result.push(obj);
      }
      return result;
    },

    /**
     * Loads CSV file from path, falls back to embedded strings if fetch fails
     * @param {string} fileKey - Key identifier (e.g. 'scenario_presets')
     * @param {string} filePath - Absolute or relative path to CSV file
     * @returns {Promise<Array<Object>>} Parsed data
     */
    async loadCSV(fileKey, filePath) {
      try {
        const response = await fetch(filePath);
        if (response.ok || response.status === 0) {
          const text = await response.text();
          if (text && text.trim().length > 0) {
            console.log(`Successfully fetched CSV file: ${filePath}`);
            return this.parse(text);
          }
        }
        throw new Error(`Fetch response not OK for ${filePath}`);
      } catch (err) {
        console.warn(`Fetch failed for ${filePath} (${err.message}). Using local embedded fallback for key: ${fileKey}`);
        return this.parse(EMBEDDED_CSV_DATA[fileKey]);
      }
    }
  };

  window.CSVLoader = CSVLoader;
})();
