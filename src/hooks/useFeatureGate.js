import { useMemo } from 'react'

// Simple stub for future subscription gating
// In future wire to user subscription/plan data
export default function useFeatureGate() {
  // For now always allow; placeholder logic can be extended
  function hasFeature(feature) {
    return true
  }
  return useMemo(() => ({ hasFeature }), [])
}
