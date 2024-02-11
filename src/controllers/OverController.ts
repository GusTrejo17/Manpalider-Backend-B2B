import {Request, Response} from "express";
import moment from 'moment';
import ResponseModel from "../models/ResponseModel";
import OverModel from '../models/OverModel';
import OverProcedure from '../procedures/OverProcedure';
import {helpers} from '../middleware/helper';
import {logger} from "../util/logger";
import EmailProcedure from "../procedures/EmailProcedure";

let fs = require('fs');
let path = require('path');
export async function Overdues(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: OverModel = new OverModel();

        ordersModel.action = 'getOverdue';
        ordersModel.business = db_name;
        ordersModel.cardCode = CardCode;
        let responseList = await OverProcedure(ordersModel);


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

        responseModel.message = "Lista de Facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la Lista de Facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function OverduesTwo(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: OverModel = new OverModel();

        ordersModel.action = 'getOverdue30';
        ordersModel.business = db_name;
        ordersModel.cardCode = CardCode;
        let responseList = await OverProcedure(ordersModel);


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

        responseModel.message = "Lista de Facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la Lista de Facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}


export async function OverduesThree(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: OverModel = new OverModel();

        ordersModel.action = 'getOverdue60';
        ordersModel.business = db_name;
        ordersModel.cardCode = CardCode;
        let responseList = await OverProcedure(ordersModel);


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

        responseModel.message = "Lista de Facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la Lista de Facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function OverduesFour(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: OverModel = new OverModel();

        ordersModel.action = 'getOverdue90';
        ordersModel.business = db_name;
        ordersModel.cardCode = CardCode;
        let responseList = await OverProcedure(ordersModel);


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

        responseModel.message = "Lista de Facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la Lista de Facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function OverduesFive(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: OverModel = new OverModel();

        ordersModel.action = 'getOverdue90plus';
        ordersModel.business = db_name;
        ordersModel.cardCode = CardCode;
        let responseList = await OverProcedure(ordersModel);


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

        responseModel.message = "Lista de Facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la Lista de Facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

//117
export async function getOneOverdue(request: Request, response: Response) {
    const {db_name, localLanguage} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const { docNum } = request.params;

    const responseModel = new ResponseModel();
    if(!profile_id){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }

    try {
        let ordersModel: OverModel = new OverModel();

        ordersModel.action = 'getOneOverdue';
        ordersModel.business = db_name;
        ordersModel.cardCode = CardCode;
        ordersModel.docNum = docNum;
        let responseList = await OverProcedure(ordersModel);


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

        responseModel.message = "Lista de Facturas vencidas";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "Ocurrio un error al traer la Lista de Facturas vencidas";
        responseModel.data =  [];
        response.json(responseModel);
    }
}