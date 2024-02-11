import { Response} from "express";
import moment from 'moment';
import { Request, IResult, IRecordSet } from "mssql";
import ResponseModel from "../models/ResponseModel";
import SeriesProcedure from "../procedures/SeriesProcedure";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";
import RaitingProcedure from "../procedures/RaitingProcedure";

export async function Raiting(req: any, response: Response): Promise<void> {
    const db = new DatabaseService();
    let {db_name} = response.locals.business;
    let responseModel = new ResponseModel();
    let {itemcode, cardcode, titulo, comentario, rating} = req.body;
    try {
        const result = await db.Query(`INSERT INTO [Raiting] (itemCode,cardCode,calificacion,titulo,comentario) VALUES ('${itemcode}','${cardcode}',${rating},'${titulo}','${comentario}')`);
        
        responseModel.status = 1;
        responseModel.data =  {hola: result.rowsAffected[0]};
        response.json(responseModel);
    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrió un problema inesperado";
        response.json(responseModel);
    }
}

export async function getRaiting(req: any, response: Response): Promise<void> {
    const db = new DatabaseService();
    const { itemCode, cardCode } = req.params;
    const responseModel = new ResponseModel();
    // let localstorage = request.body.localShoppingCart;
    try {

        let result = await RaitingProcedure('selectRaiting', itemCode, '');
        let result1 = await RaitingProcedure('AVG', itemCode, '');
        let result2 = await RaitingProcedure('ALL', itemCode, '');
        let result3 = await RaitingProcedure('Comentario', itemCode, cardCode);
        let result4 = await RaitingProcedure('Top1', itemCode, cardCode);
        
        let comentar = true;
        if(result3.length === 1 && result4.length === 1 || result3.length === 0 && result4.length === 0){
            comentar = false;
        }
        if ( !result){
            responseModel.data = [];
            responseModel.message = "No se encontro algún cupón válido"
        }else{
            responseModel.data = {data : result, promedio: result1, All : result2, comentar}; // result1.recordsets[0]
            responseModel.message = "Cupón encontrado"
            responseModel.status = 1;
        }
        
        response.json(responseModel);
    } catch (e) {
        logger.error(e);
        responseModel.message = "No se encontro información del cupón";
        response.json(responseModel);
    }
}

export async function getAutoComplete(req: any, response: Response): Promise<void> {
    const db = new DatabaseService();
    const responseModel = new ResponseModel();
    try {        
        let result = await RaitingProcedure('AutoComplete', '', '');
        if ( !result){
            responseModel.data = [];
            responseModel.message = "No se encontro alguna coincidencia"
        }else{
            responseModel.data = {data : result}; // result1.recordsets[0]
            responseModel.message = "Autocomplete"
            responseModel.status = 1;
        }
        
        response.json(responseModel);
    } catch (e) {
        logger.error(e);
        responseModel.message = "No se encontro alguna coincidencia";
        response.json(responseModel);
    }
}