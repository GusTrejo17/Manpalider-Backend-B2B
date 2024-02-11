import {Request, Response} from "express";
import moment from 'moment';
import ResponseModel from "../models/ResponseModel";
import PreliminaryModel from '../models/PreliminaryModel';
import PreliminaryProcedure from '../procedures/PreliminaryProcedure';
import {getTypeDocument} from '../interfaces/xml';
import {helpers} from '../middleware/helper';
import {logger} from "../util/logger";
import EmailProcedure from "../procedures/EmailProcedure";
import SeriesProcedure from "../procedures/SeriesProcedure";
import PreliminaryClientes from "../interfaces/PreliminaryClientes";
import {getShoppingCart} from "./ProfileController";
import { DatabaseService } from "../util/database";

let fs = require('fs');
let path = require('path');
export async function Preliminary(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    let {fechaInicio,fechaFinal} = request.params;
    const responseModel = new ResponseModel();
    const db = new DatabaseService();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: PreliminaryModel = new PreliminaryModel();
        let doc = getTypeDocument('13');
        //Fecha condicional desde donde aparecen los pedidos
        let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
        let finalDate = moment(new Date()).format('YYYYMMDD');

        ordersModel.action = 'getPreliminary';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = fechaInicio;
        ordersModel.finalDate = fechaFinal;
        let responseList = await PreliminaryProcedure(ordersModel);
        
        for (let index = 0; index < responseList.length; index++) {            
            const element = responseList[index];
            let contador = 0;
            let resul = await db.Query(`SELECT U_Status FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry = ${element.DocEntry}`);
            let totalRow = await db.Query(`SELECT COUNT(*) AS COUNT FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry = ${element.DocEntry}`);
            
            for (let i = 0; i < resul.recordset.length; i++) {
                const resu = resul.recordset[i];
                if(resu.U_Status == 'W'){
                    element.U_Status = 'W';
                } else if(resu.U_Status == 'Y'){
                    contador++;
                } else if(resu.U_Status == 'N'){
                    element.U_Status = 'N';
                }
                if(contador === totalRow.recordset[0].COUNT && resu.U_Status === 'Y'){
                    element.U_Status = 'Y';
                }
            }            
        }
        
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

        responseModel.message = "Lista de preliminares";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error("PreliminaryController > Preliminary",e);
        responseModel.message = "Ocurrio un error al traer la lista de preliminares";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function dataPreliminary(request: Request, response: Response) {
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
        let ordersModel: PreliminaryModel = new PreliminaryModel();
        let doc = getTypeDocument('13');

        ordersModel.action = 'getPreliminaryHeader';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = docEntry;
        let responseHeader = await PreliminaryProcedure(ordersModel);


        ordersModel.action = 'getPreliminaryBody';
        ordersModel.business = db_name;
        ordersModel.table = doc.subTable;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = docEntry;
        let responseBody = await PreliminaryProcedure(ordersModel);
 
        responseModel.message = "información del pedido";
        responseModel.status = 1;
        responseModel.data = {header: responseHeader, body: responseBody};
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "ocurrio un error al traer la información del pedido";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function createPreliminary(request: Request, response: Response) {
    const {db_name, wareHouse, sapConfig, taxCode, currency, paymentMethod} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const {U_FMB_Handel_Email} = response.locals.user;
    const {CardName} = response.locals.user;
    const {objType, address, bill, responseFlete, empID, creator} = request.body;

    let serie;
    let numSerie = await SeriesProcedure("getSerieOrder");
    serie = numSerie[0].Series;

    const responseModel = new ResponseModel();

        let shoppingCart: any = await getShoppingCart(request, response, true);
        //obtiene lo que trae el arreglo del carrito

        if(!shoppingCart.status){
            responseModel.message = 'Ocurrió un error al obtener el carrito de compras para generar el pedido';
            response.json(responseModel);
            return;
        }

        let cardCode = CardCode;
        let addressKey = '';
        let billKey = '';
        let comments = '';
        let docCurrency = currency;
        //Email del cliente
        let mailToCliente = U_FMB_Handel_Email;
        let nameMail = CardName;
        let totalMail = '0';

        if(profile_id){
          if(address.address===bill.address){
            addressKey = address.address;
            billKey = "";
          }else{
            addressKey = address.address;
            billKey = bill.address;
          }
        }else{
            comments = `
            nombre: ${address.name}, email: ${address.email}, telefono: ${address.phone},
            calle: ${address.street}, colonia: ${address.block}, municipio: ${address.city},código postal: ${address.cp},
            estado: ${address.state}, pais: ${address.country},
            `;
        }

        let data = {
          header: { objType, cardCode, currency, docCurrency, addressKey, billKey, comments, wareHouse, taxCode, serie, paymentMethod ,empID,creator},
          items: shoppingCart.data.shoppingCart || [],
          responseFlete: responseFlete || [],
          address: address,
          bill: bill
        };

        const PreliminarClienteInterface = new PreliminaryClientes(sapConfig);
    
        PreliminarClienteInterface.createXML(data);
        PreliminarClienteInterface.setOptions();
        let responseDiServer:any = await PreliminarClienteInterface.createCall();

        if(!responseDiServer.status){
            responseModel.message = 'Ocurrio un error al generar tu pedido. intentalo nuevamente (estado de la orden)';
            response.json(responseModel);
            return;
        }

        let doc = getTypeDocument(objType);

        let ordersModel: PreliminaryModel = new PreliminaryModel();

        ordersModel.action = 'findDocNum';
        ordersModel.business = db_name;
        ordersModel.docEntry = responseDiServer.docEntry || 0;
        ordersModel.table = doc.table;

        let docNumResponse = await PreliminaryProcedure(ordersModel);

        if(!docNumResponse || !docNumResponse[0]){
            responseModel.message = 'Ocurrio un error al generar tu pedido. intentalo nuevamente (valida un numero)';
            response.json(responseModel);
            return;
        }

        responseModel.message = 'orden creada';
        responseModel.status = 1;
        responseModel.data = {docNum: docNumResponse[0].DocEntry};
        response.json(responseModel);
}