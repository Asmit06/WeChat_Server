import { getSockets } from "./helper.js";

const emitEvent = (req, event, users, data="") => {
    const io = req.app.get("io");
    const userSocketIDs = getSockets(users);
    io.to(userSocketIDs).emit(event, data);
}

export {emitEvent}