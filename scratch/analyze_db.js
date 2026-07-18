const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, '../data/db.json');

try {
  console.log('Reading db.json...');
  const start = Date.now();
  const rawData = fs.readFileSync(dbFilePath, 'utf8');
  console.log(`Read file in ${Date.now() - start}ms. Parsing JSON...`);
  
  const parseStart = Date.now();
  const data = JSON.parse(rawData);
  console.log(`Parsed JSON in ${Date.now() - parseStart}ms.`);

  console.log('\n--- DB Keys and sizes ---');
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value)) {
      console.log(`Key: "${key}" | Type: Array | Length: ${value.length} items`);
      if (value.length > 0) {
        // print a sample size
        const sampleStr = JSON.stringify(value[0]);
        console.log(`  Sample item size: ~${sampleStr.length} chars`);
      }
    } else {
      const str = JSON.stringify(value);
      console.log(`Key: "${key}" | Type: Object | Size: ~${str.length} chars`);
    }
  }

} catch (e) {
  console.error('Error analyzing database:', e);
}
