// Merge Notion batch JSON files into a single master import file
// Usage: node scripts/merge-notion-batches.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const notionDir = path.join(root, 'docs', 'notion');
const masterPath = path.join(notionDir, 'notion-master.json');

function isBatchFile(name) {
  return name.startsWith('notion-batch-') && name.endsWith('.json');
}

function sortBatches(a, b) {
  // Ensure numeric order when prefixed with batch numbers
  const getNum = (f) => {
    const m = f.match(/notion-batch-(\d+)/);
    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  };
  return getNum(a) - getNum(b);
}

function main() {
  const entries = fs.readdirSync(notionDir, 'utf8');
  const batchFiles = entries.filter(isBatchFile).sort(sortBatches);

  if (batchFiles.length === 0) {
    console.error('No batch files found in', notionDir);
    process.exit(1);
  }

  const pages = [];
  let parentDataSourceUrl = null;

  for (const file of batchFiles) {
    const abs = path.join(notionDir, file);
    const raw = fs.readFileSync(abs, 'utf8');
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse', file, e.message);
      process.exit(1);
    }

    if (!parentDataSourceUrl && json.parentDataSourceUrl) {
      parentDataSourceUrl = json.parentDataSourceUrl;
    }
    if (Array.isArray(json.pages)) {
      for (const p of json.pages) pages.push(p);
    } else {
      console.warn('No pages array in', file);
    }
  }

  const out = {
    parentDataSourceUrl: parentDataSourceUrl || '',
    batches: batchFiles,
    pages,
  };

  fs.writeFileSync(masterPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote master file with ${pages.length} pages to: ${masterPath}`);
}

main();
