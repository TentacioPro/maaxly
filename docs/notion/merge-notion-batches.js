const fs = require('fs')
const path = require('path')

const dir = path.resolve(__dirname)
const files = fs.readdirSync(dir)
  .filter(f => f.startsWith('notion-batch-') && f.endsWith('.json'))
  .sort()

if (files.length === 0) {
  console.error('No notion-batch-*.json files found in', dir)
  process.exit(1)
}

let pages = []
let sourceFiles = []
let parentDataSourceUrl = null

for (const filename of files) {
  const p = path.join(dir, filename)
  const txt = fs.readFileSync(p, 'utf8')
  try {
    const obj = JSON.parse(txt)
    if (!parentDataSourceUrl && obj.parentDataSourceUrl) parentDataSourceUrl = obj.parentDataSourceUrl
    if (Array.isArray(obj.pages)) pages = pages.concat(obj.pages)
    sourceFiles.push(filename)
  } catch (err) {
    console.error('Failed to parse', filename, err.message)
    process.exit(2)
  }
}

const master = {
  generatedAt: new Date().toISOString(),
  sourceFiles,
  parentDataSourceUrl,
  pages,
}

const outPath = path.join(dir, 'notion-master.json')
fs.writeFileSync(outPath, JSON.stringify(master, null, 2) + '\n', 'utf8')

// quick validate
try {
  const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'))
  console.log(`WROTE ${outPath} — pages=${(parsed.pages || []).length}`)
} catch (e) {
  console.error('WROTE invalid JSON:', e.message)
  process.exit(3)
}
