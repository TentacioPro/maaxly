import { Kafka, Partitioners } from 'kafkajs'

export const KAFKA_ENABLED = !['0', 'false'].includes((process.env.KAFKA_ENABLED || '1').toString().toLowerCase())

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092')
  .split(',')
  .map(b => b.trim())
  .filter(Boolean)

// Use Legacy partitioner by default to retain pre-2.0 behavior unless explicitly disabled
const useLegacyPartitioner = process.env.KAFKAJS_USE_LEGACY_PARTITIONER !== '0'
const kafka = KAFKA_ENABLED
  ? new Kafka({
    brokers,
    createPartitioner: useLegacyPartitioner ? Partitioners.LegacyPartitioner : undefined
  })
  : null
const producer = kafka ? kafka.producer() : null

let started = false
export async function startProducer() {
  if (!KAFKA_ENABLED) {
    console.log('Kafka disabled via KAFKA_ENABLED env; startProducer is a no-op')
    return null
  }
  if (started) return producer
  await producer.connect()
  started = true
  return producer
}

export async function publishMessage(topic, message) {
  if (!KAFKA_ENABLED) {
    // Kafka disabled; skip network call. Caller should perform local persistence if needed.
    console.log('KAFKA disabled, skipping publishMessage for topic', topic)
    return Promise.resolve()
  }
  await startProducer()
  return producer.send({ topic, messages: [{ value: JSON.stringify(message) }] })
}

export default producer
