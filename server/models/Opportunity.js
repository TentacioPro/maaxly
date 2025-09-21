import mongoose from 'mongoose'

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['job', 'internship', 'competition'], required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  skillset: { type: String },
  requirements: { type: String },
  applicationDeadline: { type: String }, // store as ISO YYYY-MM-DD string
  location: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  applicationsCount: { type: Number, default: 0 },
  detailViews: { type: Number, default: 0 },
  companySiteViews: { type: Number, default: 0 }
}, { timestamps: true })

const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', opportunitySchema)

export default Opportunity
