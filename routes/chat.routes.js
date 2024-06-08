import express from "express"
import { isAuth } from "../middleware/auth.js";
import { addMembers, deleteChat, getChatDetails, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachments, getMessages, sendMessage, groupDp } from "../controllers/chat.controller.js";
import { attachmentsMulter, singleAvatar } from "../middleware/multer.js";
import { addMemberValidator, chatIdValidator, newGroupValidator, removeMemberValidator, renameValidator, sendAttachmentsValidator, validateErrors } from "../lib/validator.js";

const app = express.Router();

//authorised routes
app.use(isAuth);

app.post("/new",newGroupValidator(),validateErrors, newGroupChat);
app.get("/my", getMyChats);
app.get("/my/groups", getMyGroups);
app.put("/addMembers",addMemberValidator(),validateErrors, addMembers);
app.put("/removeMembers",removeMemberValidator(),validateErrors, removeMember);
app.delete("/leave/:id", chatIdValidator(), validateErrors, leaveGroup);
app.put("/groupDp", singleAvatar, groupDp);

app.post("/message", attachmentsMulter,sendAttachmentsValidator(), validateErrors, sendAttachments);
app.post("/sendMessage", sendMessage);

app.get("/message/:id",chatIdValidator(), validateErrors,getMessages);

app.route("/:id")
    .get(chatIdValidator(), validateErrors,getChatDetails)
    .put(renameValidator(),validateErrors,renameGroup)
    .delete(chatIdValidator(),validateErrors,deleteChat);

export default app;