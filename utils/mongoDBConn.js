import mongoose from "mongoose";
import { MongoClient,ServerApiVersion } from "mongodb";

const mongoDBConn = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_DB_URI);
        console.log("Connected to mongoDB");
    }catch(error){
        console.log("Error connecting to database", error.message);
    } 
}

export default mongoDBConn;