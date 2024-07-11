import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  AuthenticationError,
  ForbiddenError,
  UserInputError,
} from "apollo-server-express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";
import { PubSub, withFilter } from "graphql-subscriptions";

const POST_LIKED = "POST_LIKED";
const POST_COMMENTED = "POST_COMMENTED";
const MESSAGE_RECEIVED = "MESSAGE_RECEIVED";
const FRIEND_REQUEST_RECEIVED = "FRIEND_REQUEST_RECEIVED";
const FRIEND_REQUEST_ACCEPTED = "FRIEND_REQUEST_ACCEPTED";

const pubsub = new PubSub();

const resolvers = {
  Query: {
    users: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await User.find().exec();
    },
    user: async (_, { userId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await User.findById(userId).exec();
    },
    feed: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Post.find().sort({ createdAt: -1 }).exec();
    },
    posts: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Post.find({ author: authUser.id }).exec();
    },
    friends: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated");
      return await User.find({ _id: { $in: authUser.friends } }).exec();
    },
    post: async (_, { postId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated");
      return await Post.findById(postId).exec();
    },
    likes: async (_, { postId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated");
      const post = await Post.findById(postId).exec();
      if (!post) throw new Error("post not found");
      return await User.find({ _id: { $in: post.likes } });
    },
    comments: async (_, { postId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Comment.find({ post: postId }).exec();
    },
    comment: async (_, { commentId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Comment.findById(commentId).exec();
    },
    receivedFriendRequests: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await User.find({
        _id: { $in: authUser.receivedFriendRequests },
      }).exec();
    },
    sentFriendRequests: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await User.find({
        _id: { $in: authUser.sentFriendRequests },
      }).exec();
    },
    chat: async (_, { chatId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Chat.findById(chatId).exec();
    },
    chats: async (_, __, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Chat.find({ participants: authUser.id }).exec();
    },
    message: async (_, { messageId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Message.findById(messageId).exec();
    },
    messages: async (_, { chatId }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated!!");
      return await Message.find({ chat: chatId }).exec();
    },
  },
  Mutation: {
    register: async (
      _,
      { username, password, firstName, lastName, bio, avatar }
    ) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      if (await User.countDocuments({ username }).exec()) {
        throw new UserInputError("Username already exists!!");
      }
      const newUser = await User.create({
        username,
        password: hashedPassword,
        bio,
        avatar,
        firstName,
        lastName,
        createdAt: new Date().toISOString(),
        postCount: 0,
        posts: [],
        friends: [],
        receivedFriendRequests: [],
        sentFriendRequests: [],
      });
      console.log("New user created!!");
      return newUser;
    },
    login: async (_, { username, password }) => {
      const matchedUser = await User.findOne({ username }).exec();
      if (!matchedUser) {
        throw new UserInputError("Invalid Credentials");
      }
      const valid = await bcrypt.compare(password, matchedUser.password);
      if (!valid) {
        throw new UserInputError("Invalid Credentials");
      }
      console.log("Logged in successfully!!");
      const token = jwt.sign(
        {
          id: matchedUser.id,
          username: matchedUser.username,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1d" }
      );
      return { token, user: matchedUser };
    },
    logout: (_, __, { authUser }) => {
      console.log(`User logged out!!`);
      return true;
    },
    updateUser: async (_, { bio, avatar }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const updateData = {};
      if (bio) updateData.bio = bio;
      if (avatar) updateData.avatar = avatar;
      const updatedUser = await User.findByIdAndUpdate(
        authUser.id,
        updateData,
        { new: true }
      );
      if (!updatedUser) throw new Error("User Not Found!");
      console.log(`Updated the user details of ${authUser.username}`);
      return updatedUser;
    },
    createNewPost: async (_, { image, caption }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const newPost = await Post.create({
        author: authUser.id,
        createdAt: new Date().toISOString(),
        image,
        caption,
        likeCount: 0,
        likes: [],
        commentCount: [],
        comments: [],
      });
      console.log(`User ${authUser.username} created a new post!`);
      await User.findByIdAndUpdate(authUser.id, {
        $push: { posts: newPost.id },
        $inc: { postCount: 1 },
      }).exec();

      return newPost;
    },
    deletePost: async (_, { postId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const authorIdOfPost = await Post.findById(postId)
        .select("author")
        .exec();
      console.log(authorIdOfPost);
      if (!authorIdOfPost) {
        throw new Error("Post Not Found");
      }
      if (authorIdOfPost.author.toString() !== authUser.id.toString()) {
        throw new Error("Not Authorized");
      }
      console.log(`${authUser.username} deleted the post with ID: ${postId}`);
      await User.findByIdAndUpdate(authUser.id, {
        $pull: { posts: postId, $dec: { postCount: 1 } },
      }).exec();
      await Post.findByIdAndDelete(postId).exec();
      return true;
    },
    createNewComment: async (_, { postId, info }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const postCommented = await Post.countDocuments(postId).exec();
      if (!postCommented) {
        throw new UserInputError("Post Not Found");
      }
      const newComment = await Comment.create({
        author: authUser.id,
        post: postId,
        info,
        createdAt: new Date().toISOString(),
      });
      console.log(`Commented on post with ID: ${postId}`);
      await Post.findByIdAndUpdate(postId, {
        $push: { comments: newComment.id },
        $inc: { commentCount: 1 },
      }).exec();
      pubsub.publish(POST_COMMENTED, { postCommented: { postId } });
      return newComment;
    },
    deleteComment: async (_, { postId, commentId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const authorIdOfComment = await Comment.findById(commentId)
        .select("author")
        .exec();
      console.log(authorIdOfComment);
      if (!authorIdOfComment) {
        throw new Error("Comment Not Found");
      }
      if (authorIdOfComment.author.toString() !== authUser.id.toString()) {
        throw new ForbiddenError("Unauthorized to delete this comment");
      }
      console.log("Comment deleted");
      await Comment.findByIdAndDelete(commentId).exec();
      await Post.findByIdAndUpdate(postId, {
        $pull: { comments: commentId },
        $dec: { commentCount: 1 },
      }).exec();
      return true;
    },
    likePost: async (_, { userId, postId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const postToLike = await Post.countDocuments(postId).exec();
      if (!postToLike) throw new Error("Post not found");
      console.log(`Post liked by ${authUser.username}`);
      await Post.findByIdAndUpdate(postId, {
        $addToSet: { likes: userId },
        $inc: { likeCount: 1 },
      }).exec();
      pubsub.publish(POST_LIKED, { postLiked: { userId, postId } });
      return true;
    },
    unlikePost: async (_, { postId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const postToUnlike = await Post.countDocuments(postId).exec();
      if (!postToUnlike) throw new Error("Post not found");
      console.log("Post unliked");
      await Post.findByIdAndUpdate(postId, {
        $pull: { likes: authUser.id },
        $dec: { likeCount: 1 },
      }).exec();
      return true;
    },
    sendFriendRequest: async (_, { toUserId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const toUser = await User.findByIdAndUpdate(
        toUserId,
        { $addToSet: { receivedFriendRequests: authUser.id } },
        { new: true }
      )
        .select("username")
        .exec();
      console.log(toUser);
      if (!toUser) {
        throw new UserInputError("User Not Found");
      }
      await User.findByIdAndUpdate(authUser.id, {
        $addToSet: { sentFriendRequests: toUserId },
      }).exec();
      pubsub.publish(FRIEND_REQUEST_RECEIVED, {
        friendRequestReceived: { fromUserId: authUser.id },
      });
      console.log(`Friend request send to ${toUser.username}!!`);
      return true;
    },
    cancelFriendRequest: async (_, { toUserId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const toUser = await User.findByIdAndUpdate(
        toUserId,
        { $pull: { receivedFriendRequests: authUser.id } },
        { new: true }
      )
        .select("id")
        .exec();
      console.log(toUser);
      if (!toUser) {
        throw new Error("User not found");
      }
      await User.findByIdAndUpdate(authUser.id, {
        $pull: { sentFriendRequests: toUserId },
      }).exec();
      return true;
    },
    respondToFriendRequest: async (_, { toUserId, response }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const toUser = await User.countDocuments(toUserId).exec();
      if (!toUser) throw new UserInputError("User Not Found");
      await User.findByIdAndUpdate(authUser.id, {
        $pull: { receivedFriendRequests: toUserId },
      }).exec();
      if (response) {
        await User.findByIdAndUpdate(authUser.id, {
          $addToSet: { friends: toUserId },
        }).exec();
        await User.findByIdAndUpdate(toUserId, {
          $addToSet: { friends: authUser.id },
        }).exec();
        pubsub.publish(FRIEND_REQUEST_ACCEPTED, {
          friendRequestAccepted: { acceptorId: toUserId },
        });
      }
      return true;
    },
    removeFriend: async (_, { friendId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const friendUser = await User.findByIdAndUpdate(
        friendId,
        { $pull: { friends: authUser.id } },
        { new: true }
      )
        .select("id")
        .exec();
      console.log(friendUser);
      if (!friendUser) throw new UserInputError("User Not Found");
      await User.findByIdAndUpdate(authUser.id, {
        $pull: { friends: friendId },
      }).exec();
      return true;
    },
    createNewChat: async (_, { withUserId }, { authUser }) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const isChat = await Chat.countDocuments({
        participants: { $all: [authUser.id, withUserId] },
      }).exec();
      if (isChat) throw new Error("chat already exists");
      const newChat = await Chat.create({
        participants: [authUser.id, withUserId],
        messages: [],
        lastMessage: null,
        seenBy: null,
      });
      await User.findByIdAndUpdate(authUser.id, {
        $push: { chats: newChat.id },
      }).exec();
      await User.findByIdAndUpdate(withUserId, {
        $push: { chats: newChat.id },
      }).exec();
      return newChat;
    },
    sendMessage: async (_, { chatId, receiverId, text }, { authUser }) => {
      if (!authUser) throw new AuthenticationError("Not Authenticated");
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const newMessage = new Message({
          sender: authUser.id,
          receiver: receiverId,
          text,
        });
        const savedMessage = await newMessage.save({ session });
        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          {
            $push: { messages: savedMessage._id },
            lastMessage: text,
            updatedAt: new Date().toISOString(),
          },
          { new: true, session }
        );

        if (!updatedChat) {
          throw new Error("Chat not found");
        }
        pubsub.publish(MESSAGE_RECEIVED, {
          messageReceived: { chatId, message: newMessage },
        });
        await session.commitTransaction();
        await session.endSession();
        return true;
      } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        throw new Error("Error in sending message");
      }
    },
    deleteMessage: async (
      _,
      { messageId, chatId, receiverId },
      { authUser }
    ) => {
      if (!authUser) {
        throw new AuthenticationError("Not Authenticated");
      }
      const messageToDelete = await Message.countDocuments({
        _id: messageId,
      }).exec();
      if (!messageToDelete) throw new Error("message not found");
      await Message.findByIdAndDelete(messageId).exec();
      await Chat.findByIdAndUpdate(chatId, {
        $pull: { messages: messageId },
      }).exec();
      return true;
    },
  },
  Subscription: {
    postLiked: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("POST_LIKED"),
        (payload, variables) => payload.postLiked.postId === variables.postId
      ),
      resolve: async (payload) => {
        return await Post.findById(payload.postLiked.postId).exec();
      },
    },
    friendRequestAccepted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("FRIEND_REQUEST_ACCEPTED"),
        (payload, variables) =>
          payload.friendRequestAccepted.acceptorId === variables.acceptorId
      ),
      resolve: async (payload) => {
        return await User.findById(
          payload.friendRequestAccepted.acceptorId.exec()
        );
      },
    },
    friendRequestReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("FRIEND_REQUEST_RECEIVED"),
        (payload, variables) =>
          payload.friendRequestReceived.fromUserId === variables.fromUserId
      ),
      resolve: async (payload) => {
        return await User.findById(
          payload.friendRequestReceived.fromUserId
        ).exec();
      },
    },
    postCommented: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("POST_COMMENTED"),
        (payload, variables) =>
          payload.postCommented.postId === variables.postId
      ),
      resolve: async (payload) => {
        return await Post.findById(payload.postCommented.postId).exec();
      },
    },
    messageReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("MESSAGE_RECEIVED"),
        (payload, variables) =>
          payload.messageReceived.chatId === variables.chatId
      ),
      resolve: async (payload) => {
        return await Chat.findById(payload.messageReceived.chatId).exec();
      },
    },
  },
  User: {
    friends: async (parent) => {
      return await User.find({ _id: { $in: parent.friends } }).exec();
    },
    posts: async (parent) => {
      return await Post.find({ author: parent.id }).exec();
    },
    receivedFriendRequests: async (parent) => {
      return await User.find({
        _id: { $in: parent.receivedFriendRequests },
      }).exec();
    },
    sentFriendRequests: async (parent) => {
      return await User.find({
        _id: { $in: parent.sentFriendRequests },
      }).exec();
    },
    chats: async (parent) => {
      return await Chat.find({ participants: parent.id }).exec();
    },
  },
  Post: {
    author: async (parent) => {
      return await User.findById(parent.author).exec();
    },
    likes: async (parent) => {
      return await User.find({ _id: { $in: parent.likes } }).exec();
    },
    comments: async (parent) => {
      return await Comment.find({ post: parent.id }).exec();
    },
  },
  Comment: {
    author: async (parent) => {
      return await User.findById(parent.author).exec();
    },
    post: async (parent) => {
      return await Post.findById(parent.post).exec();
    },
  },
};

export default resolvers;
