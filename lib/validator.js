import {body, param, validationResult} from "express-validator"
import {ErrorHandler} from "../middleware/errorHandler.js"

const validateErrors = (req, res, next) => {
    const errors = validationResult(req);
  
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join(", ");
  
    if (errors.isEmpty()) return next();
    else next(new ErrorHandler(errorMessages, 400));
};

const loginValidator = () => [
    body("username", "Please Enter Username").notEmpty(),
    body("password", "Please Enter Password").notEmpty(),
];

const registerValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter Username").notEmpty(),
  body("bio", "Please Enter Bio").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
];

const newGroupValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("members")
      .notEmpty().withMessage("Please Enter Members")
      .isArray({ min: 2, max: 100 }).withMessage("Members must be 2-100"),
];

const addMemberValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
    body("members")
      .notEmpty().withMessage("Please Enter Members")
      .isArray({ min: 1, max: 97 }).withMessage("Members must be 1-97"),
];

const removeMemberValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
    body("userId", "Please Enter User ID").notEmpty(),
];

const sendAttachmentsValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
];

const chatIdValidator = () => [param("id", "Please Enter Chat ID").notEmpty()];

const renameValidator = () => [
  param("id", "Please Enter Chat ID").notEmpty(),
  body("name", "Please Enter New Name").notEmpty(),
];

const sendRequestValidator = () => [
  body("userId", "Please Enter User ID").notEmpty(),
];

const acceptRequestValidator = () => [
  body("requestId", "Please Enter Request ID").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please Add accept")
    .isBoolean()
    .withMessage("accept must be a boolean"),
];


export {acceptRequestValidator,
    addMemberValidator,
    chatIdValidator,
    loginValidator,
    newGroupValidator,
    registerValidator,
    removeMemberValidator,
    renameValidator,
    sendAttachmentsValidator,
    sendRequestValidator,
    validateErrors,
}