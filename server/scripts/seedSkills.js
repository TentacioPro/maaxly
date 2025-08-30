import mongoose from 'mongoose'
import Skill from '../models/Skill.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

const skills = [
  // Common languages
  'JavaScript','TypeScript','Python','Java','C','C++','C#','Go','Rust','Ruby','PHP','Kotlin','Swift','Scala','R','Dart',
  // Web
  'HTML','CSS','Sass','Less','Tailwind CSS','Bootstrap','React','Next.js','Vue.js','Nuxt.js','Angular','Svelte','Vite','Webpack','Babel',
  // Backend frameworks
  'Node.js','Express','NestJS','Fastify','Django','Flask','FastAPI','Spring','Spring Boot','ASP.NET','Laravel','Symfony','Rails',
  // Databases
  'MongoDB','Mongoose','PostgreSQL','MySQL','SQLite','Redis','Elasticsearch','DynamoDB','Neo4j','Cassandra',
  // Cloud / DevOps
  'Docker','Kubernetes','AWS','Azure','GCP','Terraform','Ansible','CI/CD','GitHub Actions','GitLab CI','Jenkins','NGINX','Linux',
  // Testing
  'Jest','Mocha','Chai','Vitest','React Testing Library','Cypress','Playwright','Selenium',
  // Mobile / cross-platform
  'React Native','Expo','Flutter','Ionic','Xamarin',
  // Data / ML
  'NumPy','Pandas','scikit-learn','TensorFlow','PyTorch','Keras','Matplotlib','Seaborn',
  // Messaging / APIs
  'GraphQL','Apollo','REST','gRPC','WebSockets',
  // Other
  'Prisma','Sequelize','TypeORM','Drizzle ORM','tRPC','Storybook','Electron','Three.js','D3.js'
]

async function run() {
  await mongoose.connect(mongoUri, { dbName })
  console.log('Connected to MongoDB for seeding skills')
  const docs = skills.map(name => ({ name, nameLower: name.toLowerCase() }))
  for (const doc of docs) {
    try {
      await Skill.updateOne({ nameLower: doc.nameLower }, { $setOnInsert: doc }, { upsert: true })
    } catch (e) {
      if (e.code !== 11000) console.warn('Insert failed for', doc.name, e.message)
    }
  }
  console.log(`Seeded ${docs.length} skills (upsert).`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
