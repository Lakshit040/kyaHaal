import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
    }],
    messages: {type: mongoose.Schema.Types.ObjectId, ref: 'Message'},
    lastMessage: {type: String},
    seenBy: {type: Boolean},
    createdAt: {type: String},
    updatedAt: {type: String}
});

export default mongoose.model("Chat", chatSchema);