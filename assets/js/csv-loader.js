/**
 * RetireMap CSV Loader Module
 * Loads and parses CSV files. Since the app may run on file:// protocol
 * (double-clicking index.html), it incorporates a fallback to embedded
 * CSV data strings to prevent CORS policy blocks.
 */
(function() {
  // Embedded fallback CSV strings
  const EMBEDDED_CSV_DATA = {
    'scenario_presets': `scenario_id,scenario_name,pre_ret_return,post_ret_return,inflation_default,description
conservative,보수적,0.04,0.03,0.02,낮은 기대수익률 기준
base,기준,0.06,0.03,0.025,일반적인 장기 기대수익률 기준
optimistic,낙관적,0.08,0.03,0.03,높은 기대수익률 기준`,

    'help_texts': `key,title,body
inflation,인플레이션,물가 상승률입니다. 현재 생활비를 미래 가치로 환산할 때 사용합니다.
pre_return,경제적 자유 달성 전 수익률,경제적 자유를 달성하기 전까지 투자 자산이 기대할 수 있는 연평균 수익률입니다.
post_return,경제적 자유 달성 후 수익률,경제적 자유를 달성한 후 자산을 운용할 때 기대하는 연평균 수익률입니다.
simple_vs_compound,단리와 복리,단리는 교육용 비교값이며 실제 목표 계산은 복리 기준이 우선입니다.`,

    'yearly_return_samples': `year_index,annual_return
1,0.05
2,0.07
3,0.03
4,0.06
5,0.08`
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
          // If value has commas inside quotes, simple split might split it,
          // but our CSV inputs are simple enough and don't contain commas within fields.
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
        // Try fetch
        const response = await fetch(filePath);
        // Under file://, fetch might succeed but with status 0, or it might fail.
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
