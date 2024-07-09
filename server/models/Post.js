import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    caption: {type: String, required: true},
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    image: {type: String, required: true},
    createdAt: {type: String, default: () => new Date().toISOString()},
    likeCount: {type: Number, default: 0},
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    commentCount: {type: Number, default: 0},
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
});

export default mongoose.model('Post', postSchema);