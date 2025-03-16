import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    textContent: { type: String },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    }
}, { timestamps: true });

const Document = mongoose.model('Document', documentSchema);
export default Document;
