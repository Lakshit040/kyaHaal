import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    bio: {type: String, required: true},
    avatar: {type: String, required: true},
    createdAt: {type: String, default: () => new Date().toISOString()},
    postCount: {type: Number, default: 0},
    posts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
    friends: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    receivedFriendRequests: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    sentFriendRequests: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    chats: [{type: mongoose.Schema.Types.ObjectId, ref: 'Chat'}]
});

export default mongoose.model('User', userSchema);