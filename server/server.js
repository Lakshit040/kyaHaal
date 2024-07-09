import express from "express";
import {ApolloServer} from "apollo-server-express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./models/User.js";
import {createServer} from "http";
import {execute, subscribe} from "graphql";
import {makeExecutableSchema} from "@graphql-tools/schema";
import {SubscriptionServer} from "subscriptions-transport-ws";

dotenv.config();
import typeDefs from "./schema/typeDefs.js";
import resolvers from "./schema/resolvers.js";

const app = express();

mongoose.connect("mongodb://localhost:27017/social-media-app").then((res) => {
    console.log("Connected!!");
})

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const getUserFromToken = async (token) => {
    if (!token) return null;
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
        return await User.findById(decodedToken.id).exec();
    } catch (err) {
        return null;
    }
};

const schema = makeExecutableSchema({
    typeDefs, resolvers
});

const server = new ApolloServer({
    schema,
    context: async ({req}) => {
        const token = req.headers.authorization?.split(' ')[1] || '';
        const authUser = await getUserFromToken(token);
        return {authUser};
    },
});

server.start().then(res => {
    server.applyMiddleware({app});
});

const httpServer = createServer(app);

SubscriptionServer.create(
    {
        schema,
        execute,
        subscribe,
        onConnect: async (connectionParams, webSocket, context) => {
            const token = connectionParams.authorization?.split(' ')[1] || '';
            const authUser = await getUserFromToken(token);
            return {authUser};
        }
    },
    {
        server: httpServer,
        path: server.graphqlPath
    }
);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`);
});