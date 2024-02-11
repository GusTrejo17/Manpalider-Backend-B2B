import {Request, Response} from "express";
import IncomingPayments from '../interfaces/IncomingPayments';
import ResponseModel from "../models/ResponseModel";
import {getTypeDocument} from '../interfaces/xml';
import SeriesProcedure from "../procedures/SeriesProcedure";

export async function createPayment(request: Request, response: Response) {
  const {sapConfig} = response.locals.business;
  const {CardCode, DocEntry, DocTotal,objType,seleccion } = request.body;

  //Se define el nuemro de seríe 
  let serie;
  // Se define la cuenta de mayor
  let cuentaMayor;
  await SeriesProcedure('getInfoPayment').then(result => {
    serie = result[0].seriePayment;
    cuentaMayor = result[0].majorAccount;
  });

  // Numero de documento
  let doc = getTypeDocument(objType);
  let service = doc.service

  // Tipo de pago
  let typePayment = 'transfer'


  // Lienas del pago
  let itemsRow = {
    DocEntry : DocEntry,
    DocTotal : DocTotal,
  }

  // Datos para el pago
  let data = {
    header: { 
      objType, 
      serie, 
      CardCode, 
      DocTotal,
      service, 
      typePayment,
      cuentaMayor ,
      seleccion
    },
    items: {
      DocEntry : DocEntry,
      DocTotal : DocTotal,
    },
  };

  
  
  const incomingPaymentsInterface = new IncomingPayments(sapConfig);

  incomingPaymentsInterface.createXML(data);
  incomingPaymentsInterface.setOptions();
  let responseDiServer:any = await incomingPaymentsInterface.createCall();

  // modelo de respuesta
  const responseModel = new ResponseModel();

  if(responseDiServer.status === 1){
    responseModel.message = `Pago creado correctamente ${responseDiServer.docEntry}`;
    responseModel.status = 1;
    responseModel.data = { docNum: responseDiServer.docEntry };
  }else{
    responseModel.message = 'El pago no se ceo de forma correcta';
    responseModel.status = 0;
  }
  response.json(responseModel);
}