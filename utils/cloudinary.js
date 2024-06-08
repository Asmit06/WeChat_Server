import {v2 as cloudinary} from "cloudinary"
import { v4 as uuid } from "uuid";

// const cloudinaryConnect = () => {
//     cloudinary.config({
//         cloud_name: process.env.CLOUDINARY_CLOUDNAME,
//         api_key: process.env.CLOUDINARY_API_KEY,
//         api_secret: process.env.CLOUDINARY_API_SECRET,
//     })
// };

const getBase64 = (file) =>
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const uploadFilesToCloudinary = async (files=[]) => {
    const uploadPromises = files.map((file)=>{
        return new Promise((resolve, reject)=>{
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type: "auto",
                    public_id: uuid(),
                },
                (error, result) => {
                  if (error) return reject(error);
                  resolve(result);
                }
            )
        })
    });

    try{
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result)=>({
            public_id: result.public_id,
            url: result.secure_url,
        }));
        return formattedResults;
    }catch(err){
        console.log(err);
        throw new Error("Error uploading files to cloudinary", err);
    }
}

const uploadbuffercloudinary = async(files)=>{
    //cloudinary.uploader.upload(file)
    const uploadPromises = files.map((file)=>{
        return new Promise((resolve, reject)=>{
            cloudinary.uploader.upload(
                file,
                {
                    resource_type: "auto",
                    public_id: uuid(),
                },
                (error, result) => {
                  if (error) return reject(error);
                  resolve(result);
                }
            )
        }) 
    });
    try{
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result)=>({
            public_id: result.public_id,
            url: result.secure_url,
        }));
        return formattedResults;
    }catch(err){
        console.log(err);
        throw new Error("Error uploading files to cloudinary", err);
    }
    
}
export {uploadFilesToCloudinary, uploadbuffercloudinary}