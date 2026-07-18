const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, '../data/db.json');

try {
  const data = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  const firstProduct = data.products[0];
  
  console.log('--- First Product Keys and Value Lengths ---');
  for (const key of Object.keys(firstProduct)) {
    const value = firstProduct[key];
    const type = typeof value;
    const len = type === 'string' ? value.length : (Array.isArray(value) ? value.length : JSON.stringify(value).length);
    console.log(`Key: "${key}" | Type: ${type} | Length/Size: ${len}`);
    if (type === 'string' && value.startsWith('data:image')) {
      console.log(`  -> Warning: Key "${key}" contains Base64 image data (starts with "${value.substring(0, 30)}...")`);
    }
  }

} catch (e) {
  console.error(e);
}
