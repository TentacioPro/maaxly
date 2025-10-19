import { Kafka, Partitioners } from 'kafkajs'

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092')
  .split(',')
  .map(b => b.trim())
  .filter(Boolean)

// Use Legacy partitioner by default to retain pre-2.0 behavior unless explicitly disabled
const useLegacyPartitioner = process.env.KAFKAJS_USE_LEGACY_PARTITIONER !== '0'
const kafka = new Kafka({
  brokers,
  createPartitioner: useLegacyPartitioner ? Partitioners.LegacyPartitioner : undefined
})
const producer = kafka.producer()

let started = false
export async function startProducer() {
  if (started) return producer
  await producer.connect()
  started = true
  return producer
}

export async function publishMessage(topic, message) {
  await startProducer()
  return producer.send({ topic, messages: [{ value: JSON.stringify(message) }] })
}

export default producer
