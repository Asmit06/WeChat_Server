import { listOfUserSocketId } from "../app.js";

export const getOtherMember = (members, userId) =>
    members.find((member) => member._id.toString() !== userId.toString());

export const getSockets = (users=[])=>{
    //const sockets = users.map((user) => listOfUserSocketId.get(user._id.toString()));
    const sockets = users.map((user) => listOfUserSocketId.get(user.toString()));

    return sockets;
};