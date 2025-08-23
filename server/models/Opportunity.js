import mongoose from 'mongoose'

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['job', 'internship', 'competition'], required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', opportunitySchema)

export default Opportunity
