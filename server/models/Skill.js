import mongoose from 'mongoose'

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameLower: { type: String, required: true, unique: true },
}, { timestamps: true })

skillSchema.pre('validate', function(next) {
  if (this.name) this.nameLower = this.name.toLowerCase()
  next()
})

const Skill = mongoose.models.Skill || mongoose.model('Skill', skillSchema)

export default Skill
