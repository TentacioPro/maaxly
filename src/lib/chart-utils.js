// helpers to convert backend analytics series into recharts-friendly arrays

function normalizeDateKey(k) {
  if (!k) return ''
  if (typeof k === 'object' && k !== null) {
    if (k.d) return String(k.d)
    // if it's a date-like object, try toString
    return String(k)
  }
  return String(k)
}

/**
 * seriesToLineData
 * - Converts an array of backend series items into [{name: date, value: number}, ...]
 * - Accepts items like { _id: { d: '2025-09-01' }, count: 12 } or { date: '2025-09-01', count: 12 }
 */
export function seriesToLineData(series = [], opts = {}) {
  const { dateKeyCandidates = ['_id.d', 'date', '_id'] } = opts
  const map = new Map()

  for (const item of series || []) {
    let d = null
    for (const k of dateKeyCandidates) {
      if (k.includes('.')) {
        const [a, b] = k.split('.')
        if (item?.[a] && item[a]?.[b]) d = item[a][b]
      } else if (item && item[k]) {
        d = item[k]
      }
      if (d) break
    }
    if (!d && typeof item?._id === 'string') d = item._id
    if (!d) continue
    const key = normalizeDateKey(d)
    map.set(key, (map.get(key) || 0) + (Number(item.count) || 0))
  }

  const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  return sorted.map(([k, v]) => ({ name: k, value: v }))
}

/**
 * seriesToRoleData
 * - Converts an array of backend series items into [{label: role, value: number}, ...]
 */
export function seriesToRoleData(series = []) {
  const map = new Map()
  for (const item of series || []) {
    const role = item?._id?.role || item?.role || 'guest'
    map.set(role, (map.get(role) || 0) + (Number(item.count) || 0))
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

export default { seriesToLineData, seriesToRoleData }
