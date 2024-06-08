import express from "express"
import { acceptRequest, getMyFriends, getMyNotifs, getMyProfile, login , logout, register, searchUser, sendRequest } from "../controllers/user.controller.js";
import {singleAvatar} from "../middleware/multer.js"
import { isAuth } from "../middleware/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateErrors } from "../lib/validator.js";

const app = express.Router();

app.post("/login",loginValidator(),validateErrors ,login);
app.post("/register", singleAvatar, registerValidator(), validateErrors, register);
//authorised routes
app.use(isAuth);
app.get("/myprofile", getMyProfile);
app.post("/logout", logout);
app.get("/search", searchUser);
app.put("/sendrequest",sendRequestValidator(),validateErrors,sendRequest);
app.put("/acceptrequest",acceptRequestValidator(),validateErrors,acceptRequest);
app.get("/notifications", getMyNotifs);
app.get("/friends", getMyFriends);
export default app;