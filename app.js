import express from "express"
import userRoute from "./routes/user.routes.js"
import chatRoute from "./routes/chat.routes.js"
import mongoose, { connect } from "mongoose";
import mongoDBConn from "./utils/mongoDBConn.js";
import dotenv from "dotenv";
import { errorHandlerMiddlerware } from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import {createServer} from 'http'
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS } from "./constants/events.js";
import {v4 as uuid} from "uuid";
import { getSockets } from "./utils/helper.js";
import { Message } from "./models/message.js";
import cors from 'cors';
import {v2 as cloudinary} from "cloudinary"
import { socketAuthenticator } from "./middleware/auth.js";



dotenv.config({
    path: "./.env",
});
const corsOptions = {
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      process.env.CLIENT_URL,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};

const PORT = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const listOfUserSocketId = new Map(); 
const onlineUsers = new Set();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUDNAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: corsOptions
});

app.set("io", io);

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/api/user', userRoute);
app.use('/api/chat', chatRoute);

app.get("/", (req,res)=>{
    res.send("Home");
});

io.use((socket,next)=>{
    cookieParser()(
        socket.request, 
        socket.request.res, 
        async (err) => { 
            await socketAuthenticator(err, socket, next); 
        }
    );
});

io.on("connection", (socket)=>{
    const user = socket.user;
    listOfUserSocketId.set(user._id.toString(), socket.id);
    console.log(listOfUserSocketId);

    socket.on(NEW_MESSAGE, async({chatId, members, message})=>{
        
        const messageForRTC = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name
            },
            chat: chatId,
            createdAt: new Date().toISOString(),
        };

        const messageForDb = {
            content: message,
            sender: user._id,
            chat: chatId
        };
        console.log("Emmiting real time", messageForRTC);
        const membersSocket = getSockets(members);
        console.log("memberssocket", membersSocket);
        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRTC,
        });
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {chatId});

        try{
            await Message.create(messageForDb);
        }catch(err){
            throw new Error(err);
        }

        //console.log("New Message: ", messageForRTC);
    });

    socket.on(CHAT_JOINED, ({userId, members})=>{
        onlineUsers.add(userId?.toString());
        //console.log(onlineUsers);
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on(CHAT_LEAVED, ({ userId, members }) => {
        onlineUsers.delete(userId.toString());
        //console.log(onlineUsers);
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on("lalalalala", async({userId})=>{

    })


    socket.on("disconnect", ()=>{
        listOfUserSocketId.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        console.log("user disconnected");
    });
});

app.use(errorHandlerMiddlerware);

server.listen(PORT, ()=> {
    mongoDBConn();
    console.log(`Server up and running on port ${PORT} in ${envMode} Mode`);
})

export { envMode , listOfUserSocketId }