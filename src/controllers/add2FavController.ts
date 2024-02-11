import {Request, Response} from "express";
import add2FavModel from "../models/add2FavModel";
import add2FavProcedure from "../procedures/add2FavProcedure";
import { logger } from "../util/logger";
import ResponseModel from "../models/ResponseModel";

export async function addToFavorites(request: Request, response: Response) {
    const {itmCode}= request.body
    const {CardCode} = response.locals.user;
    let responseModel = new ResponseModel();
    try {
        let model:add2FavModel =  new add2FavModel()
        model.action = 'getTbl';
        model.cardCode = CardCode;
        model.itemCode = itmCode;
        let result = await add2FavProcedure(model);
        if(result.length === 0){
            model.action = 'setTable';
            await add2FavProcedure(model);
        }else{
            model.action = 'delFav';
            model.params = result.PK_Favorite;
            await add2FavProcedure(model)
        }
        responseModel.status = 1;
        responseModel.data = {};
        response.json(responseModel);
    } catch (error) {
        logger.error('add2FavController =>add2Fav =>', error);
        responseModel.message = "Ocurrió un problema inesperado";
        response.json(responseModel);
    }
}