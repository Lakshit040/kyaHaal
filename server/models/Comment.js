import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true},
    info: {type: String, required: true},
    createdAt: {type: String, default: () => new Date().toISOString()}
});

export default mongoose.model('Comment', commentSchema);