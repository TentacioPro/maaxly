import mongoose from 'mongoose'

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['job', 'internship', 'competition'], required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Legacy comma-separated list used by UI; keep for compatibility
  skillset: { type: String },
  // New fields aligned with details UI
  skills: { type: String }, // duplicate of skillset; comma-separated
  skillIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  requirements: { type: String },
  applicationDeadline: { type: Date },
  location: { type: String },
  categories: { type: [String], default: [] },
  timezones: { type: [String], default: [] },
  salary: { type: String },
  attachments: [{
    _id: false,
    fileId: { type: mongoose.Schema.Types.ObjectId },
    filename: { type: String },
    length: { type: Number },
    contentType: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  contactEmail: { type: String },
  contactPhone: { type: String },
  applicationsCount: { type: Number, default: 0 },
  detailViews: { type: Number, default: 0 },
  companySiteViews: { type: Number, default: 0 }
}, { timestamps: true })

opportunitySchema.index({ owner: 1, createdAt: -1 })
opportunitySchema.index({ type: 1, createdAt: -1 })

const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', opportunitySchema)

export default Opportunity
