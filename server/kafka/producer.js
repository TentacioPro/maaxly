import { Kafka } from 'kafkajs'

const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER || 'localhost:9093'] })
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
