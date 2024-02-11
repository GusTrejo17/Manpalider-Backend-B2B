import { Request, Response } from "express";
import ImageProfileModel from "../models/ImageProfileModel";
import ImageProfileProcedure from "../procedures/ImageProfileProcedure";
import { logger } from "../util/logger";
import ResponseModel from "../models/ResponseModel";
import formidable from 'formidable';
const fs = require('fs-extra');
import attachmentController from "./AttachmentController";

export async function sendImageProfile(request: Request, response: Response) {
    const { CardCode } = response.locals.user;
    const { imageProfileFile } = request.body;
    const responseModel = new ResponseModel();

    try {
        let model: ImageProfileModel = new ImageProfileModel()
        model.action = 'setProfileImg';
        model.cardCode = CardCode;
        model.profileImage = imageProfileFile;
        let result = await ImageProfileProcedure(model);
        //if (result.length === 0) {
        //    model.cardCode = CardCode;
        //    model.profileImage = imageProfileFile;
        //    model.action = 'setProfileImg';
        //    await ImageProfileProcedure(model);
        //} else {
        //    model.action = 'delProfileImg';
        //    model.cardCode = CardCode;
        //    model.profileImage = imageProfileFile;
        //    await ImageProfileProcedure(model)
        //}
        responseModel.status = 1;
        responseModel.data = {};
        response.json(responseModel);

    } catch (error) {
        logger.error("ImageProfileController--->>" + error);
        responseModel.message = "Ocurrió un problema al realizar la operación. Error: " + error;
        responseModel.status = 0;
        response.json(responseModel);
    }
}
