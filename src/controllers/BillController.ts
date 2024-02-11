import {Request, Response} from "express";
import moment from 'moment';
import ResponseModel from "../models/ResponseModel";
import BillModel from '../models/BillModel';
import BillPorcedure from '../procedures/BillProcedure';
import {getTypeDocument} from '../interfaces/xml';
import {helpers} from '../middleware/helper';
import {logger} from "../util/logger";
import EmailProcedure from "../procedures/EmailProcedure";
import {orderValidate} from '../middleware/Order';

let fs = require('fs');
let path = require('path');

export async function billings(request: Request, response: Response) {
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
        let ordersModel: BillModel = new BillModel();
        let doc = getTypeDocument('13');
        //Fecha condicional desde donde aparecen los pedidos
        // let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
        // let finalDate = moment(new Date()).format('YYYYMMDD');

        ordersModel.action = 'getBillings';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = fechaInicio;
        ordersModel.finalDate = fechaFinal;
        let responseList = await BillPorcedure(ordersModel);

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

        responseModel.message = "Lista de facturas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la lista de facturas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function billingsDue(request: Request, response: Response) {
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
        let ordersModel: BillModel = new BillModel();
        let doc = getTypeDocument('13');
        //Fecha condicional desde donde aparecen los pedidos
        // let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
        // let finalDate = moment(new Date()).format('YYYYMMDD');

        ordersModel.action = 'getBillingsDue';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = fechaInicio;
        ordersModel.finalDate = fechaFinal;
        let responseList = await BillPorcedure(ordersModel);

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

        responseModel.message = "Lista de facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la lista de facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function dataBill(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const {profile_id} = response.locals.user;
    const { docEntry } = request.params;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();

    if(!profile_id || !docEntry){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: BillModel = new BillModel();
        let doc = getTypeDocument('13');

        ordersModel.action = 'getBillHeader';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = docEntry;
        let responseHeader = await BillPorcedure(ordersModel);

        responseHeader = responseHeader[0] || {};
        if(responseHeader.DocCur === 'MXP'){
            responseHeader.DocCur = 'MXN';
        }

        ordersModel.action = 'getBillBody';
        ordersModel.business = db_name;
        ordersModel.table = doc.subTable;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = docEntry;
        let responseBody = await BillPorcedure(ordersModel);
        let statusGuia = await orderValidate.getStatus(doc.table, responseBody);
 

        responseModel.message = "información del pedido";
        responseModel.status = 1;
        responseModel.data = {header: responseHeader, body: responseBody, statusGuia};
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "ocurrio un error al traer la información del pedido";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function getPDF(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    try {
        let {file} = request.params;
        let exists = fs.existsSync('./cfdi/pdf/' + file);
        if (exists) {
            response.sendFile(path.resolve('./cfdi/pdf/' + file));
            return;
        }
        responseModel.message = "El archivo no existe";
        response.json(responseModel);
    } catch (e) {
      logger.error(e);
        responseModel.message = "ocurrio un error al traer el archivo";
        response.json(responseModel);
    }
}

export async function getXML(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    try {
        let {file} = request.params;
        let exists = fs.existsSync('./cfdi/xml/' + file);
        if (exists) {
            response.sendFile(path.resolve('./cfdi/xml/' + file));
            return;
        }
        responseModel.message = "El archivo no existe";
        response.json(responseModel);
    } catch (e) {
      logger.error(e);
        responseModel.message = "ocurrio un error al traer el archivo";
        response.json(responseModel);
    }
}

// Historial del cliente
export async function getHistory(request: Request, response: Response) {    
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const { fechaInicio, fechaFinal, itemCode} = request.params;
    const responseModel = new ResponseModel();
    
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }
    try {
        let ordersModel: BillModel = new BillModel();
        let doc = getTypeDocument('13');
        ordersModel.action = 'getHistory';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = (itemCode != 'null') ? itemCode : '';
        ordersModel.initialDate = fechaInicio;
        ordersModel.finalDate = fechaFinal;
        let datos = await BillPorcedure(ordersModel);

        
        responseModel.status = 1;
        responseModel.data = datos || [];
        response.json(responseModel);
    }catch (e) {
      logger.error("BillController > GetHistory",e);

        responseModel.message = "Ocurrio un error al traer el historial de compra";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
