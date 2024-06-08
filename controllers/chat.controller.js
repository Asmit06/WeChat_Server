import { ErrorHandler } from "../middleware/errorHandler.js";
import {Chat} from "../models/chat.js"
import {emitEvent} from "../utils/features.js"
import {ALERT , NEW_MESSAGE, REFETCH_CHATS, NEW_MESSAGE_ALERT} from "../constants/events.js"
import {getOtherMember} from "../utils/helper.js"
import { User } from "../models/user.js";
import { Message } from "../models/message.js";
import { uploadFilesToCloudinary, uploadbuffercloudinary } from "../utils/cloudinary.js";
import fs from "fs"

const newGroupChat = async(req,res,next) => {
    try{
        const {name, members, base} = req.body;
        if(members.length < 2) return next(new ErrorHandler("Group chat must have atleast 3 members", 400));
        const allMmbers = [...members, req.userId];
        if(base){
            // const buffer = Buffer.from(base, 'base64');
            // const avatarFile = new File([buffer], `${name}`, {
            //     type: 'image/png',
            //     lastModified: Date.now(), 
            //   });
              
            //console.log(avatarFile);
            const result = await uploadbuffercloudinary([base]);
            console.log("result", result);
            await Chat.create({
                name,
                groupChat: true,
                createdBy: req.userId,
                members: allMmbers, 
                groupUrl: result[0].url,
            });
        }else{
            await Chat.create({
                name,
                groupChat: true,
                createdBy: req.userId,
                members: allMmbers, 
            });
        }
        
        emitEvent(req, ALERT, allMmbers, `Welcome to ${name} group`);
        emitEvent(req, REFETCH_CHATS, members);

        return res.status(201).json({
            success: true,
            message: "Group Created"
        });
    }catch(err){
        next(err);
    }
};

const getMyChats = async(req,res,next) => {
    try{
        const chats = await Chat.find({ members: req.userId }).populate(
            "members",
            "name avatar"
        );
        const transformChatsDTO = chats.map(({ _id, name, members, groupChat, groupUrl })=>{
            const otherMember = getOtherMember(members, req.userId);
            return {
                _id,
                groupChat,
                avatar: groupChat
                  //? members.slice(0, 3).map(({ avatar }) => avatar.url)
                  ? [groupUrl]
                  : [otherMember.avatar.url],
                name: groupChat ? name : otherMember.name,
                members: members.reduce((prev, curr) => {
                  if (curr._id.toString() !== req.userId.toString()) {
                    prev.push(curr._id);
                  }
                  return prev;
                }, []),
            };
        })

        return res.status(200).json({
            success: true,
            chats: transformChatsDTO
        });
    }catch(err){
        next(err);
    }
};

const getMyGroups = async(req,res,next) => {
    try{
        const chats = await Chat.find({
            members: req.userId,
            groupChat: true,
            //createdBy: req.userId,
          }).populate("members", "name avatar");

        const groups = chats.map(({ members, _id, groupChat, name }) => ({
            _id,
            groupChat,
            name,
            avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
        }));

        return res.status(200).json({
            success: true,
            groups
        });
    }catch(err){
        next(err);
    }
};

const addMembers = async(req, res, next) => {
    try{
        const {chatId, members} = req.body;
    //console.log(members);
    const chat = await Chat.findById(chatId);
    if(!chat) return next(new ErrorHandler("Chat not found", 404));
    if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 404));
    if(chat.createdBy.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not allowed to add members", 403));

    const allNewMembersPromise = members.map((memberId)=>(User.findById(memberId, "name")));

    const allNewMembers = await Promise.all(allNewMembersPromise);
    //console.log(allNewMembers);

    const mappedNewUsers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i)=>i._id);
    //console.log(mappedNewUsers);
    chat.members.push(...mappedNewUsers);
    if(chat.members.length > 50) return next(new ErrorHandler("Group member limit reached", 400));
    await chat.save();
    const allUsersName = allNewMembers.map((i) => i.name).join(", ");
    emitEvent(
        req,
        ALERT,
        chat.members,
        `${allUsersName} has been added in the group`
      );
    
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
        success: true,
        message: "Members added successfully",
      });
    }
    catch(err){
        next(err);
    }
    
};

const removeMember = async(req, res, next) => {
    try{
        const {userId, chatId} = req.body;
        const chat = await Chat.findById(chatId);
        const removeMe = await User.findById(userId, "name");

        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        if (!chat?.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

        if (chat.createdBy.toString() !== req.userId.toString())
            return next(new ErrorHandler("You are not allowed to add members", 403));
        
        if (chat.members.length <= 3)
            return next(new ErrorHandler("Group must have at least 3 members", 400));

        const chatMembers = chat.members.map((i)=> i.toString());
        
        chat.members=chat.members.filter((member)=> member.toString()!==userId.toString());

        await chat.save();

        emitEvent(req, ALERT, chat.members, {
            message: `${removeMe.name} has been removed from the group`,
            chatId,
        });
        
        emitEvent(req, REFETCH_CHATS, chatMembers);
        
        return res.status(200).json({
            success: true,
            message: "Member removed successfully",
        });
    }catch(err){
        console.log(err);
        next(err);
    }
    
};

const leaveGroup = async(req,res,next) => {
    try{
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        if (!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

        const remainingMembers = chat.members.filter(
            (member) => member.toString() !== req.userId.toString()
        );
        if (remainingMembers.length < 3) return next(new ErrorHandler("Your group must have at least 3 members so you cant leave haha lol", 400));

        if(chat.createdBy.toString() == req.userId.toString()){
            const randomElement = Math.floor(Math.random()*remainingMembers.length);
            chat.createdBy = remainingMembers[randomElement];
        }

        chat.members = remainingMembers;

        const [user] = await Promise.all([
            User.findById(req.userId, "name"),
            chat.save(),
        ]);

        emitEvent(req, ALERT, chat.members, {
            chatId,
            message: `User ${user.name} has left the group`,
          });
        
        return res.status(200).json({
            success: true,
            message: "Leave Group Successfully",
        });
    }catch(err){
        next(err);
    }
};

const renameGroup = async(req, res, next) => {
    try{
        const chatId = req.params.id;
        const { name } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        if (!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));
        if (chat.createdBy.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not allowed to rename the group", 403));

        chat.name=name;
        await chat.save();

        emitEvent(req, REFETCH_CHATS, chat.members);
        return res.status(200).json({
            success: true,
            message: "Group renamed successfully",
        });
    }catch(err){
        next(err);
    }
};

const sendMessage = async(req, res, next) => {
    try{
        // const chatId = req.body.chatId;
        // const content = req.body.content;
        const {chatId, content=""} = req.body;
        console.log("chat id", chatId);
        const [chat, currUser] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.userId, "name"),
        ]);
        console.log(chat);
        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        if (!chat.members.find(member => member.toString() === req.userId.toString())) {
            return next(new ErrorHandler("You are not allowed to send messages in this group", 403));
        }

        const attachments = [];
        const messageToDb = {
            content: content,
            attachments,
            sender: currUser._id,
            chat: chatId
        };

        const messageForRTC = {
            ...messageToDb,
            sender: {
                _id: currUser._id,
                name: currUser.name
            }
        };

        const message = await Message.create(messageToDb);

        emitEvent(req, NEW_MESSAGE, chat.members, {
            messages: messageForRTC,
            chatId
        });
        emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

        res.status(200).json({
            success: true,
            message
        });

    }catch(err){
        next(err);
    }
};

const deleteChat = async(req, res, next) => {
    try{
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        const members = chat.members;
        if (chat.groupChat && chat.createdBy.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not allowed to delete the group", 400));
        if (!chat.groupChat && !chat.members.includes(req.userId.toString())) return next(new ErrorHandler("You are not allowed to delete the chat", 403));

        const messages = await Message.find({
            chat: chatId,
            attachments: { $exists: true, $ne: []},
        });
        const public_ids = [];

        messages.forEach(({ attachments }) =>
            attachments.forEach(({ public_id }) => public_ids.push(public_id))
        );

        await Promise.all([
            //deletFilesFromCloudinary(public_ids),
            chat.deleteOne(),
            Message.deleteMany({chat: chatId})
        ]);

        emitEvent(req, REFETCH_CHATS, members);

        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
        });
        
        //you have to delete ranom shit as well
    }catch(err){
        next(err);
    }
};

const sendAttachments = async (req,res,next) => {
    try{
        const {chatId, content=""} = req.body;
        const files = req.files || [];
        if(files.length<1) return next(new ErrorHandler("Pls upload attachments", 400));
        if(files.length>5) return next(new ErrorHandler("Exceeded attachment limit-5", 400));

        const [chat, currUser] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.userId, "name"),
        ]);
        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        if (files.length < 1) return next(new ErrorHandler("Please provide attachments", 400));

        //upload file here
        const attachments = await uploadFilesToCloudinary(files);

        const messageToDb = {
            content: content,
            attachments,
            sender: currUser._id,
            chat: chatId
        };

        const messageForRTC = {
            ...messageToDb,
            sender: {
                _id: currUser._id,
                name: currUser.name
            },
        };

        const message = await Message.create(messageToDb);

        emitEvent(req, NEW_MESSAGE, chat.members, {
            message: messageForRTC,
            chatId
        });
        emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

        res.status(200).json({
            success: true,
            message
        });

    }catch(err){
        next(err);
    }
};

const getChatDetails = async (req,res,next) => {
    try{
        if(req.query.populate==="true"){
            const chat = await Chat.findById(req.params.id).populate(
                "members", "name avatar").lean();
        if(!chat) return next(new ErrorHandler("Chat not found", 404));

        chat.members = chat.members.map(member=>({
            _id: member._id,
            name: member.name,
            avatar: member.avatar.url,
        }));

        return res.status(200).json({
            success: true,
            chat,
        });
    }else{
        const chat = await Chat.findById(req.params.id);
        if(!chat) return next(new ErrorHandler("Chat not found", 404));
        return res.status(200).json({
            success: true,
            chat,
          });
        }
    }catch(err){
        next(err);
    }
}

const getMessages = async (req,res,next) => {
    try{
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        const { page = 1 } = req.query;
        const resultPerPage = 20;
        const skip = (page - 1) * resultPerPage;

        if (!chat) return next(new ErrorHandler("Chat not found", 404));

        if (!chat.members.includes(req.userId.toString()))
            return next(new ErrorHandler("You are not allowed to access this chat", 403));

        const messages = await Message.find({chat: chatId})
            .sort({createdAt: -1})
            .skip(skip)
            .limit(resultPerPage)
            .populate("sender", "name")
            .lean();
        const [totalMessagesCount] = await Promise.all([
            Message.countDocuments({chat: chatId}),
        ]);
        const totalPages = Math.ceil(totalMessagesCount / resultPerPage) || 0;
        return res.status(200).json({
            success:true,
            messages: messages.reverse(),
            totalPages
        });
    }catch(err){
        next(err);
    }
}

const groupDp = async (req, res,next) => {
    try{
        const {chatId} = req.body;
        console.log(req);
        const file = req.file;
        console.log("file",file);
        if (!file) return next(new ErrorHandler("Please Upload Avatar"));
        const result = await uploadFilesToCloudinary([file]);

        const chat = await Chat.findById(chatId);
        if(!chat) return next(new ErrorHandler("Chat not found", 404));
        if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 404));
        if(chat.createdBy.toString() !== req.userId.toString()) return next(new ErrorHandler("You are not allowed to add members", 403));

        chat.groupUrl=result[0].url;
        await chat.save();

        return res.status(200).json({
            success: true,
            chat,
        });
    }catch(err){
        nexr(err);
    }        
}

export { newGroupChat, addMembers, getMyChats , getMyGroups, removeMember, leaveGroup, renameGroup, sendAttachments, getChatDetails, deleteChat, getMessages, sendMessage, groupDp}