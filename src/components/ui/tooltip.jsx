import * as React from 'react'

export function Tooltip({ content, children }) {
  return (
    <span className="relative inline-flex">
      {children}
      <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white text-xs px-2 py-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
        {content}
      </span>
    </span>
  )
}

export default Tooltip
