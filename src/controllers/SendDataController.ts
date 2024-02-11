import { Response} from "express";
import moment from 'moment';
import { Request, IResult, IRecordSet } from "mssql";
import ResponseModel from "../models/ResponseModel";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export async function sendData(req: any, response: Response): Promise<void> {
    const db = new DatabaseService();
    let responseModel = new ResponseModel();
    let {CardCode, CardName, Date, Time, TypeUser, Email, Business, Session} = req.body;
    try {
        const result = await db.Query(`INSERT INTO [Access] (CardCode,CardName,Date,Time,TypeUser,Email,IP,Business,Session) 
        VALUES ('${CardCode}','${CardName}','${Date}','${Time}','${TypeUser}','${Email}','${req._remoteAddress}','${Business}',${Session})`);
        
        responseModel.status = 1;
        responseModel.data =  {hola: result.rowsAffected[0]};
        response.json(responseModel);
    } catch (e) {
        logger.error('Error al insertar Session',e);
        responseModel.message = "Error al insertar Session";
        response.json(responseModel);
    }
}
