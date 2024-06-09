import {User} from "../models/user.js"
import {Chat} from "../models/chat.js"
import { sendToken , cookieOptions } from "../utils/token.js";
import { compare } from "bcrypt";
import { ErrorHandler } from "../middleware/errorHandler.js"; 
import { Request } from "../models/request.js";
import {emitEvent} from "../utils/features.js"
import {NEW_REQUEST , REFETCH_CHATS} from "../constants/events.js"
import { uploadFilesToCloudinary } from "../utils/cloudinary.js";

// const cookieOptions = {
//     maxAge: 30 * 24 * 60 * 60 * 1000,
//     sameSite: "none",
//     httpOnly: true,
//     secure: true,
// }; 

//create new user, save to database, create and save cookie
const register = async (req,res,next) => { 
    try{
        const {name, username, password, bio} = req.body;
        const file = req.file;
        console.log("file",file);
        if (!file) return next(new ErrorHandler("Please Upload Avatar"));

        const result = await uploadFilesToCloudinary([file]);
        const avatar = {
            public_id: result[0].public_id,
            url: result[0].url,
        }
        const user = await User.create({
            name,
            username,
            password,
            bio,
            avatar
        });

        // const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        // console.log(token);
        // return res.status(201).cookie("wechat_token", token, cookieOptions).json({
        //     success: true,
        //     user,
        //     message: "User created successfully",
        // });

        sendToken(res, user, 201, "User created successfully");
    }catch(err){
        next(err);
    }
    
    
    //res.status(201).json({message: "User created successfully"}); 
};

const login = async (req,res,next) => { 
    try{
        const {username , password} = req.body;
        const user = await User.findOne({username}).select("+password");
        //if(!user) return res.status(400).json({message: "Invalid userId or password"});
        if(!user) return next(new ErrorHandler("Invalid Username or Password",404));
        const checkPass = await compare(password, user.password);
        //if(!checkPass) {return res.status(400).json({message: "Invalid userId or password"});}
        if(!checkPass) return next(new ErrorHandler("Invalid Username or Password",404));
        console.log("It is reaching till here");
        
        // const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        // console.log(token);
        // console,log(process.env.JWT_SECRET);
        // return res.status(201).cookie("wechat_token", token, cookieOptions).json({
        //     success: true,
        //     user,
        //     message: `Welcome Back, ${user.name}`
        // });
        sendToken(res, user, 200, `Welcome Back, ${user.name}`);  
    }catch(err){
        next(err);
    }
    
};

const getMyProfile = async(req,res,next)=>{
    try{
        const user = await User.findById(req.userId);
        if(!user) return next(new ErrorHandler("User not found", 404));
        res.status(200).json({
            success: true,
            user,
            //message: "u son of a bitch im in"
        }); 
    }catch(err){
        next(err);
    }  
};

const getFriendProfile = async(req,res,next)=>{
    try{
        const user = await User.findById(req.params.id);
        if(!user) return next(new ErrorHandler("User not found", 404));
        res.status(200).json({
            success: true,
            user,
            //message: "u son of a bitch im in"
        }); 
    }catch(err){
        next(err);
    }  
};

const logout = async(req,res,next)=>{
    try{
        return res.status(200)
        .cookie("wechat_token", "", { ...cookieOptions, maxAge: 0 })
        .json({
        success: true,
        message: "Logged out successfully",
        });
    }catch(err){
        next(err);
    }
};

const searchUser = async(req,res,next) => {
    try{
        //console.log(req);
        const {name = ""} = req.query;
        const user = await User.findById(req.userId).populate('friends');

        const allUsers = await User.find({
             _id: { $ne: req.userId },
             name: { $regex: name, $options: "i" },
        });
        //console.log(allUsers);
        const friendsIds = user.friends.map(friend => friend._id.toString());
        const usersNotInFriends = allUsers.filter(user => !friendsIds.includes(user._id.toString()));
        const onlyReqDetails = usersNotInFriends.map(({ _id, name, avatar })=>({
            _id,
            name,
            avatar: avatar.url,
        }));

        return res.status(200).json({
            success: true,
            onlyReqDetails,
            message: name,
        })
    }catch(err){
        next(err);
    }
};

const sendRequest = async(req,res,next) => {
    try{
        const currUser=req.userId;
        const {userId}=req.body;

        if(userId === currUser) return next(new ErrorHandler("You cannot be friends with yourself. -WeChat 2024", 400));

        const request = await Request.findOne({
            $or:[
                { sender: currUser, receiver: userId },
                { sender: userId, receiver: currUser },
            ]
        });

        if (request) return next(new ErrorHandler("Request already sent. Check inbox.", 400));

        await Request.create({
            sender: currUser,
            receiver: userId,
          });
        
          emitEvent(req, NEW_REQUEST, [userId]);
        
          return res.status(200).json({
            success: true,
            message: "Friend Request Sent",
          });
    }catch(err){
        next(err);
    }
};

const acceptRequest = async(req,res,next) => {
    try{
        //const currUser=req.userId;
        const {requestId, accept}=req.body;

        const request = await Request.findById(requestId)
            .populate("sender")
            .populate("receiver");

        if (!request) return next(new ErrorHandler("Send a request first!", 400));
        if (request.receiver._id.toString() !== req.userId.toString()) return next(new ErrorHandler("You cannot accept this request", 401));

        if(!accept){
            await request.deleteOne();
            return res.status(200).json({
                success: true,
                message: "Friend Request Rejected",
            });
        };
        //console.log(request);
        const senderId = request.sender._id;
        const receiverId = request.receiver._id;
        const members = [senderId, receiverId];

        await Promise.all([
            User.updateOne(
                {_id: senderId},
                {$push: {friends: receiverId}}
            ),
            User.updateOne(
                {_id: receiverId},
                {$push: {friends: senderId}}
            ),
            Chat.create({
                members,
                name: `${request.sender.name}-${request.receiver.name}`,
            }),
            request.deleteOne(),
        ]);
        
        //update friends of both users 
        
        
        emitEvent(req, REFETCH_CHATS, members);
        
        return res.status(200).json({
            success: true,
            message: "Friend Request Accepted",
            senderId
        });
    }catch(err){
        next(err);
    }
};

const getMyNotifs = async(req,res,next)=>{
    try{
        const requests = await Request
                .find({receiver: req.userId })
                .populate("sender", "name avatar");
        //console.log(requests);
        const allRequests = requests.map(({_id, sender})=>({
            _id,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url
            },
        }));
        return res.status(200).json({
            success: true,
            allRequests,
        });
    }catch(err){
        next(err);
    }
};

const getMyFriends = async(req,res,next)=>{
    try{
        const userId = req.userId;
        const chatId = req.query.chatId;

        const {friends} = await User.findById(userId).populate("friends");
        //console.log(friends);
        const friendsDto = friends.map(({_id,name,avatar})=>({
            _id,
            name,
            avatar: avatar.url
        }));

        if(chatId){
            const chat = await Chat.findById(chatId);
            const friendsNotYetAdded = friendsDto.filter(
                (friend)=>!chat.members.includes(friend._id)
            );
            return res.status(200).json({
                success: true,
                friends: friendsNotYetAdded,
            });
        }else{
            return res.status(200).json({
                success: true,
                friends: friendsDto,
            });
        }
    }catch(err){
        next(err);
    }
};

export {login, register, getMyProfile, logout , searchUser, sendRequest, acceptRequest, getMyNotifs, getMyFriends, getFriendProfile};