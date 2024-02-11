import {Request, Response} from "express";
import moment from 'moment';
import ResponseModel from "../models/ResponseModel";
import SavedModel from '../models/SavedModel';
import SavedProcedure from '../procedures/SavedProcedure';
import {getTypeDocument} from '../interfaces/xml';
import {helpers} from '../middleware/helper';
import {logger} from "../util/logger";
import EmailProcedure from "../procedures/EmailProcedure";

let fs = require('fs');
let path = require('path');
export async function Saved(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const { fechaInicio, fechaFinal } = request.params;
    

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: SavedModel = new SavedModel();
        let doc = getTypeDocument('13');
        //Fecha condicional desde donde aparecen los pedidos
        // let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
        // let finalDate = moment(new Date()).format('YYYYMMDD');

        ordersModel.action = 'getSaved';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = fechaInicio;
        ordersModel.finalDate = fechaFinal;
        let responseList = await SavedProcedure(ordersModel);


        responseList.map( (order:any) => {
            order.localLanguage = localLanguage;
           if(order.DocCur === 'MXP'){
               order.DocCur = 'MXN';
           }
           //Ajuste de fecha con minutos y zona horaria
           let date = new Date(order.TaxDate);
           date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
           order.TaxDate = moment(new Date(date)).format('YYYYMMDD'); 
        });

        responseModel.message = "Lista de Salvados";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al traer la lista de Salvados";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function dataSaved(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const {profile_id} = response.locals.user;
    const { docEntry } = request.params;
    const {CardCode} = response.locals.user;
    const responseModel = new ResponseModel();

    if(!profile_id || !docEntry){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    let ordersModel: SavedModel = new SavedModel();

    ordersModel.action = 'getCarrito';
    ordersModel.business = db_name;
    ordersModel.cardCode = CardCode;
    ordersModel.docEntry = docEntry;
    let listado = await SavedProcedure(ordersModel);
    let list = JSON.parse(listado[0].Cart);
    try {
        let ordersModel: SavedModel = new SavedModel();
        let doc = getTypeDocument('13');
        
        ordersModel.action = 'getDataProduct';
        ordersModel.business = db_name;
        ordersModel.table = doc.subTable;
        ordersModel.cardCode = CardCode;
        let responseBody = [];
        let productTem = [];
        for (let i of list){
            ordersModel.docEntry = i.ItemCode;
            let responseProdcut = await SavedProcedure(ordersModel);
            let Precio = i.Price ? i.Price : responseProdcut[0].Price;
            responseBody.push({
                ItemCode: responseProdcut[0].ItemCode, 
                ItemName: responseProdcut[0].ItemName, 
                PicturName: responseProdcut[0].PicturName, 
                U_Handel_ImagesArray: responseProdcut[0].U_Handel_ImagesArray, 
                Quantity: parseInt(i.quantity), 
                Price : Number(i.Price ? i.Price : responseProdcut[0].Price).toFixed(2),
                Discount : i.Disc ? i.Disc : 0,
                PriceDiscount : Number(i.Price - (i.Price * (i.Disc || 0 / 100) / 100) ),
                id : docEntry,
                updateCart : responseProdcut[0].updateCart,
                SuppCatNum : responseProdcut[0].SuppCatNum,
                beforeTotal : ((Precio - (Precio * (i.Disc || 0 / 100) / 100)) * (parseInt(i.quantity))),
                newTotal : Number((Precio - (Precio * (i.Disc || 0 / 100) / 100)) * (parseInt(i.quantity))).toFixed(4),
            });
        }
        responseModel.message = "información del pedido";
        responseModel.status = 1;
        responseModel.data = {body: responseBody};
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "ocurrio un error al traer la información del pedido";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function dataDocument(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const {profile_id} = response.locals.user;
    const { data } = request.body;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();

    try {
        let ordersModel: SavedModel = new SavedModel();
        let doc = getTypeDocument('13');
        
        ordersModel.action = 'getDataProducto';
        ordersModel.business = db_name;
        ordersModel.table = doc.subTable;
        ordersModel.cardCode = CardCode;
        ordersModel.viewFrom = 'document';
        let responseBody = [];
        let mess = '';
        for (let i in data){
            if(data[i].__EMPTY_4 !== "ITEMCODE"){
                if(data[1].__EMPTY_5 === CardCode){
                    ordersModel.docEntry = data[i].__EMPTY_4 || data[i].__EMPTY_3;
                    let responseProdcut = await SavedProcedure(ordersModel);
                    if(responseProdcut.length > 0){
                        responseBody.push({
                            ItemCode: responseProdcut[0].ItemCode, 
                            ItemName: responseProdcut[0].ItemName,
                            U_Handel_ImagesArray: responseProdcut[0].U_Handel_ImagesArray, 
                            PicturName: responseProdcut[0].PicturName, 
                            SuppCatNum: responseProdcut[0].SuppCatNum,
                            Quantity: data[i].__EMPTY_1,
							SalesMultiplier: responseProdcut[0].U_MultiploVenta
                        });                            
                    }
                }
                else{
                    mess = 'El usuario ingresado en el Excel no coincide con el usuario logueado.';
                    responseBody = [];
                    break;
                }
            }
        };
 
        if(responseBody.length > 0){

            let nuevos :any = [];

            for (let i = 0; i < responseBody.length; i++) {
                const element = responseBody[i];
                let bandera = true;
                nuevos.map((arr:any) => {
                    if(arr.ItemCode === element.ItemCode){
                        bandera = false;
                    }
                })
                if(bandera){
                    nuevos.push(responseBody[i])
                }
            }

            responseModel.message = "información del pedido";
            responseModel.status = 1;
            responseModel.data = {body: nuevos};
            response.json(responseModel);
        }
        else{
            responseModel.message = mess ? mess : "ocurrio un problema al traer la información del pedido.";
            responseModel.data = [];
            response.json(responseModel);
        }
        
    }catch (e) {
        logger.error(e);
        responseModel.message = "ocurrio un error al traer la información del pedido";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function dataExcel(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { profile_id } = response.locals.user;
    const { data } = request.body;
    const { CardCode } = response.locals.user;
    const responseModel = new ResponseModel();

    try {
        let ordersModel: SavedModel = new SavedModel();
        let doc = getTypeDocument('13');

        ordersModel.action = 'getDataExcel';
        ordersModel.business = db_name;
        ordersModel.table = doc.subTable;
        ordersModel.cardCode = CardCode;
        ordersModel.viewFrom = 'document';
        let responseBody = [];
        let mess = '';
        // let processedItemCodes = new Set();
        for (let i in data) {
            if (data[i].__EMPTY_4 !== "ITEMCODE") {
                if (data[1].__EMPTY_5 === CardCode) {
                    ordersModel.docEntry = data[i].__EMPTY_4 || data[i].__EMPTY_3;
                    // ordersModel.arg1 = data[i].__EMPTY_2;
                    let responseProdcut = await SavedProcedure(ordersModel);
                    if (responseProdcut.length > 0) {
                        for (let index = 0; index < responseProdcut.length; index++) {
                            const product = responseProdcut[index];
                            responseBody.push({
                                ItemCode: product.ItemCode,
                                ItemName: product.ItemName,
                                U_Handel_ImagesArray: product.U_Handel_ImagesArray,
                                PicturName: product.PicturName,
                                SuppCatNum: product.SuppCatNum,
                                Quantity: data[i].__EMPTY_1,
                                SalesMultiplier: product.U_MultiploVenta,
                                // U_Linea: product.U_Linea
                            });
                        }
                    }
                }
                else {
                    mess = 'El usuario ingresado en el Excel no coincide con el usuario logueado.';
                    responseBody = [];
                    break;
                }
            }
        };

        if (responseBody.length > 0) {

            let nuevos: any = [];

            for (let i = 0; i < responseBody.length; i++) {
                const element = responseBody[i];
                let bandera = true;
                nuevos.map((arr: any) => {
                    if (arr.ItemCode === element.ItemCode) {
                        bandera = false;
                    }
                })
                if (bandera) {
                    nuevos.push(responseBody[i])
                }
            }

            responseModel.message = "Información de la carga masiva";
            responseModel.status = 1;
            responseModel.data = { body: nuevos };
            response.json(responseModel);
        }
        else {
            responseModel.message = mess ? mess : "Ocurrió un problema al traer la información de los artículos";
            responseModel.data = [];
            response.json(responseModel);
        }

    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrió un error al traer la información de los artículos";
        responseModel.data = [];
        response.json(responseModel);
    }
}

export async function createSavedCart(request: Request, response: Response){
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const {shoppingCart,createCard} = request.body;    
    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: SavedModel = new SavedModel();
        let doc = getTypeDocument('13');
        //Fecha condicional desde donde aparecen los pedidos
        let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
        let finalDate = moment(new Date()).format('YYYYMMDD');
        let Carrito:any = [];

        ordersModel.action = 'getCart';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = initialDate;
        ordersModel.finalDate = finalDate;
        let responseList = await SavedProcedure(ordersModel);

        let list = JSON.parse(responseList[0].shoppingCart);
        
        if(shoppingCart.length > 0){
            for (let index = 0; index < shoppingCart.length; index++) {
                const element = shoppingCart[index];
                for (let index = 0; index < list.length; index++) {
                    const item = list[index];
                    if(item.ItemCode === element.ItemCode){
                        Carrito.push({ItemCode: item.ItemCode, quantity : item.quantity, Price : element.PriceBeforeDiscount, Disc: element.DiscountPercentSpecial})
                    }
                }
            }
        }
        
        ordersModel.action = 'setCart';
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = finalDate;
        ordersModel.arg1 = Carrito.length > 0 ? JSON.stringify(Carrito) : responseList[0].shoppingCart;
        ordersModel.finalDate = createCard;
        
        let insertData = await SavedProcedure(ordersModel);

        responseModel.message = "Carrito guardado";
        responseModel.status = 1;
        responseModel.data = {docNum: 'undefined'};//insertData[0] || [];
        response.json(responseModel);
    }catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al traer la lista de Salvados";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function updateSavedCart(request: Request, response: Response){
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id, CardCode} = response.locals.user;
    const { body } = request;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: SavedModel = new SavedModel();

        ordersModel.action = 'updateCartSaved';
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = body.docEntry;
        ordersModel.arg1 = JSON.stringify(body.items);
        
        let insertData = await SavedProcedure(ordersModel);
        
        if(!insertData){
            responseModel.message = "No fue posible actualizar tu carrito.";
            responseModel.data = [];
            response.json(responseModel);
            return;
        }
        
        responseModel.message = "Carrito actualizado correctamente";
        responseModel.status = 1;
        responseModel.data = {docNum: 'undefined'};
        response.json(responseModel);
    }catch (e) {
        logger.error('updateSavedCart =>',e);
        responseModel.message = "Ocurrio un error al actualizar el carrito";
        responseModel.data =  [];
        response.json(responseModel);
    }
}