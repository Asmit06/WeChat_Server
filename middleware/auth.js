import { User } from "../models/user.js";
import { ErrorHandler } from "./errorHandler.js";
import jwt from "jsonwebtoken"

const isAuth = (req, res, next) =>{
    try{
        const token = req.cookies["wechat_token"];
        if (!token) return next(new ErrorHandler("Please login to access this route", 401));
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decodedData._id;
        next();
    }catch(err){
        return next(err); 
    }
};

const socketAuthenticator = async (err, socket, next) => {
    try{
        if(err) return next(err);
        const authToken = socket.request.cookies["wechat_token"];
        if(!authToken)  return next(new ErrorHandler("Please login to access this route", 401));
        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findById(decodedData._id);
        if(!user) next(new ErrorHandler("Please login to access this route", 401));
        socket.user = user;
        return next(); 
    }catch(error){
        console.log(error);
        return next(new ErrorHandler("Please login to access this route", 401));
    }
}

export {isAuth, socketAuthenticator};