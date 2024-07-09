import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    chat: {type: mongoose.Schema.Types.ObjectId, ref: 'Chat'},
    text: {type: String, required: true},
    createdAt: {type: String, default: () => new Date().toISOString()}
});

export default mongoose.model('Message', messageSchema);