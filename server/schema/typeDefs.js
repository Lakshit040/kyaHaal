import {gql} from "apollo-server-express";

const typeDefs = gql`
    schema{
        query: Query
        mutation: Mutation
        subscription: Subscription
    }

    type User{
        id: ID!
        username: String!
        password: String!
        firstName: String!
        lastName: String!
        bio: String!
        avatar: String!
        createdAt: String!
        postCount: Int!
        posts: [Post!]!
        friends: [User!]!
        receivedFriendRequests: [User!]!
        sentFriendRequests: [User!]!
        chats: [Chat!]!
    }
    
    type Post{
        id: ID!
        caption: String!
        author: User!
        image: String!
        createdAt: String!
        likeCount: Int!
        likes: [User!]!
        commentCount: Int!
        comments: [Comment!]!
    }
       
    type Comment{
        id: ID!
        author: User!
        chat: Chat!
        post: Post!
        info: String!
        createdAt: String!
    }
    
    type Chat {
        id: ID!
        participants: [User!]!
        messages: [Message!]!
        lastMessage: String
        seenBy: Boolean
        createdAt: String!
        updatedAt: String!
    }
    
    type Message {
        id: ID!
        sender: User!
        receiver: User!
        text: String!
        createdAt: String!
    }
    
    # Queries
    
    type Query {
        users: [User!]!
        user(userId: ID!): User!
        feed: [Post!]!
        posts: [Post!]!
        post (postId: ID!): Post!
        friends : [User!]!
        likes (postID: ID!) : [User!]!
        comments (postId: ID!): [Comment!]!
        comment (commentId: ID!): Comment!
        receivedFriendRequests : [User!]!
        sentFriendRequests : [User!]!
        chat (chatId: ID!): Chat!
        chats (userId: ID!): [Chat!]!
        message (messageId: ID!): Message!
        messages (chatId: ID!): [Message!]!
    }
    
    # Mutations
    
    type Mutation {
        register(username: String!, password: String!, firstName: String!, lastName: String!, bio: String!, avatar: String!): User!
        login(username: String!, password: String!): AuthPayload!
        logout: Boolean!
        updateUser(bio: String, avatar: String): User!
        createNewPost(image: String!, caption: String!): Post!
        deletePost(postId: ID!): Boolean!
        likePost(userId: ID!, postId: ID!): Boolean!
        unlikePost(postId: ID!): Boolean!
        createNewComment(postId: ID!, info: String!): Comment!
        deleteComment(postId: ID!, commentId: ID!): Boolean! 
        sendFriendRequest(toUserId: ID!): Boolean!
        cancelFriendRequest(toUserId: ID!): Boolean!
        respondToFriendRequest(toUserId: ID!, response: Boolean!): Boolean!
        removeFriend(friendId: ID!): Boolean
        createNewChat(withUserId: ID!): Chat!
        sendMessage(chatId: ID!, receiverId: ID!, text: String!): Message!
        deleteMessage(messageId: ID!, chatId: ID!): Boolean!
    }
    
    # Subscriptions
    
    type Subscription {
        friendRequestReceived(fromUserId: ID!): User!
        friendRequestAccepted(acceptorId: ID!): User!
        postLiked(postId: ID!): Post!
        postCommented(postId: ID!): Post!
        messageReceived(chatId: ID!): Chat!
    }
    
    type AuthPayload{
        token: String!
        user: User!
    }
`;

export default typeDefs;