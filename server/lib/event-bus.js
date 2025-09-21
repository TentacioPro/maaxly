import { EventEmitter } from 'events'

// Simple process-local event bus for future SSE/WebSocket adapters
const bus = new EventEmitter()

export default bus
