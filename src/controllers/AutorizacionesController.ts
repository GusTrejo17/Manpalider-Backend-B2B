import {Request, Response} from "express";
import ProductsModel from "../models/ProductsModel";
import OrdersModel from "../models/OrdersModel";
import CategoriesModel from "../models/CategoriesModel";
import ResponseModel from "../models/ResponseModel";
import {getProfile} from "./ProfileController";
import {getTaxes} from "./CatalogsController";
import { exists } from "fs";
import { logger } from "../util/logger";
import ProductsProcedure from "../procedures/ProductsProcedure";
import OrdersProcedure from "../procedures/OrdersProcedure";
import AutorizacionesProcedure from "../procedures/AutorizacionesProcedure";
import { helpers } from "../middleware/helper";
import EmailProcedure from "../procedures/EmailProcedure";
import { DatabaseService } from "../util/dataBase";
import VentasClientes from "../interfaces/VentasClientes";
import CatalogsModel from "../models/CatalogsModel";
import CatalogsProcedure from "../procedures/CatalogsProcedures";
import { insertPoints } from "../controllers/PointsHistoryController";
import {getTypeDocument,xmlRequest} from '../interfaces/xml';
import SAPAuthorization from '../interfaces/SAPAuthorization';

let fs = require('fs');
let path = require('path');

export async function getAutorizaciones(request: Request, response: Response): Promise<void> {
    let {db_name} = response.locals.business;
    const { user, type , fechaInicio , fechaFinal} = request.body;
    let responseModel = new ResponseModel();
    try {

        let data = {
            actions : 'Autorization',
            param1 : type, 
            param2 : user,
            param3: fechaInicio,
            param4: fechaFinal
        }
        
        let result = await AutorizacionesProcedure(data);
        
        responseModel.status = 1;
        responseModel.data = { list: result};
        response.json(responseModel);
    } catch (e) {
        logger.error('getAutorizaciones =>',e);
        responseModel.message = "Ocurrió un problema inesperado";
        response.json(responseModel);
    }
}

export async function detailsAutorization(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const {profile_id} = response.locals.user;
    const { docEntry } = request.params;
    const {CardCode} = response.locals.user;

    const responseModel = new ResponseModel();

    if(!profile_id || !docEntry){
        responseModel.message = "no tienes permiso de realizar esta acción";
        responseModel.data = [];
    }
    let list = JSON.parse(docEntry);
    try {
        let data = {
            actions : 'DetailsAutorization',
            param1 : list,
        }

        let responseBody = await AutorizacionesProcedure(data);

        let data1 = {
          actions : 'getGroupNum',
        }
        let responseBody1 = await AutorizacionesProcedure(data1);

        responseModel.message = "información del pedido";
        responseModel.status = 1;
        responseModel.data = {body: responseBody, group: responseBody1};
        response.json(responseModel);
    }catch (e) {
      logger.error('detailsAutorization =>',e);
        responseModel.message = "ocurrio un problema al traer la información del pedido";
        responseModel.data =  [];
        response.json(responseModel);
    }
}

export async function createAutorization(request: Request, response: Response) {
    const {db_name, wareHouse, sapConfig, taxCode, currency, paymentMethod} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const {U_FMB_Handel_Email} = response.locals.user;
    const {CardName} = response.locals.user;
    const {DocEntry, Usuario, WstCode, tipo, Comentario} = request.body;
    // const sh = new SchemaService ();
    const db = new DatabaseService();
    const responseModel = new ResponseModel();
    let responseDiServer:any = '';
    try {
        let ordersResponse:any = '';
        let reason:any ='';
        let createorden:any = '';
        let hoy = new Date();
        var Hora = hoy.getHours();
        var Min = hoy.getMinutes();
        try {
          let creado = await db.Query(`SELECT * FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry = ${DocEntry} AND U_CurrStep=${WstCode} AND U_Remarks ='${tipo}'`);

          if(!creado.recordset[0].U_DocEntryDoc && creado.recordset[0].U_Status !== 'N'){
            await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'Y', U_UpdateDate = GETDATE(), U_UpdateTime = ${Hora+''+Min} WHERE U_WddCode = ${DocEntry} AND U_UserID = ${Usuario} AND U_StepCode=${WstCode} AND U_Remarks ='${tipo}'`);

            let resultado = await db.Query(`SELECT * FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry = ${DocEntry} AND U_CurrStep=${WstCode} AND U_Remarks ='${tipo}'`);   
            resultado = resultado.recordset;
            for (let index = 0; index < resultado.length; index++) {
                const resul = resultado[index];
                let MaxReqr  = resul.U_MaxReqr;
                let StepCode  = resul.U_CurrStep;

                let datos = await db.Query(`SELECT * FROM [Handel_B2B].[dbo].[FMB_WDD1] WHERE U_WddCode =${DocEntry} AND U_StepCode = ${StepCode} AND U_Remarks ='${tipo}'`);
                let acept = 0;
                datos = datos.recordset;
                for (let index = 0; index < datos.length; index++) { 
                    const dat = datos[index];
                    if (dat.U_Status === 'Y'){
                        acept++;
                    }
                } 
                if(acept === MaxReqr){
                    let flag = false;
                    let resul = await db.Query(`SELECT * FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry = ${DocEntry}`);
                    resul = resul.recordset;
                    
                    for (let index = 0; index < resul.length; index++) {
                        const resu = resul[index];
                        if(resu.Name === (Usuario).toString() || resu.Name === null){
                            flag = true;
                        }
                    }

                    if(flag){
                        await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'Y', Name = ${Usuario} WHERE U_DocEntry = ${DocEntry}`);
                        let Total = await db.Query(`SELECT SUM(U_MaxReqr) AS U_MaxReqr  FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry =  ${DocEntry}`);
                        Total = Total.recordset;
                        let cuantos = await db.Query(`SELECT COUNT(*) AS CUANTOS  FROM [Handel_B2B].[dbo].[FMB_WDD1] WHERE U_Status = 'Y' AND U_WddCode = ${DocEntry}`);
                        cuantos = cuantos.recordset;
                        reason = "Documento en proceso de autorización.";
                        if(Total[0].U_MaxReqr === cuantos[0].CUANTOS){
                          reason = "Documento creado con exito.";
                          try {
                              // Crear documento 
                              let getCabecera = {
                                  actions : 'ODRF',
                                  param1 : DocEntry,
                              }
                              let shoppingCart : any = [];
                              let Cabecera = await AutorizacionesProcedure(getCabecera);
                              Cabecera.map((items: any) =>{
                                  if(items.ItemCode != 'ENVIO'){
                                      let lines ={
                                          ItemCode: items.ItemCode,
                                          quantity: items.Quantity,
                                          PriceBeforeDiscount: items.Price,
                                          discount : items.DiscountPercent,
                                          Price: items.Price,
                                          PriceECommerce: items.PriceBefDi,
                                          taxRate: 16,
                                          taxSum: 12.96,
                                          priceTax: 93.96,
                                          currency: 'MXN',
                                          localLanguage: 'es-MX',
                                          U_CFDI33_UM : items.U_CFDI33_UM
                                      }
                                      shoppingCart.push(lines);
                                  }
                              })
                              let getAddress = {
                                  actions : 'Address',
                                  param1 : Cabecera[0].CardCode,
                                  param2 : Cabecera[0].ShipToCode,
                              }
                              let resultAddress = await AutorizacionesProcedure(getAddress);
                              let address :any= '';
                              if(resultAddress.length>0){
                                  address = {
                                      address : resultAddress[0].Address || '',
                                      street : resultAddress[0].Street || '',
                                      block : resultAddress[0].Block || '',
                                      city : resultAddress[0].City || '',
                                      cp : resultAddress[0].ZipCode || '',
                                      state : resultAddress[0].StateName || '',
                                      country : resultAddress[0].CountryName || '',
                                  };
                              }
                              
                              let getBill = {
                                  actions : 'Bill',
                                  param1 : Cabecera[0].CardCode,
                                  param2 : Cabecera[0].PayToCode,
                              }
                              let resultBill = await AutorizacionesProcedure(getBill);
                              let bill : any = '';
                              if(resultBill.length>0){
                                  bill = {
                                      address : resultBill[0].Address || '',
                                      street : resultBill[0].Street || '',
                                      block : resultBill[0].Block || '',
                                      city : resultBill[0].City || '',
                                      cp : resultBill[0].ZipCode || '',
                                      state : resultBill[0].StateName || '',
                                      country : resultBill[0].CountryName || '',
                                  };
                              }
                  
                              let insurance = '';
                              Cabecera.map((items: any) =>{
                                  if(items.ItemCode === 'MANIOBRAS II'){
                                      insurance = items.Price;
                                  }
                              })
                  
                              let insuranceObject = {
                                  ItemCode: 'MANIOBRAS II',
                                  quantity: '1',
                                  Price: insurance
                              }
                  
                              let objType = 17;
                              let service = 'OrdersService'
                              let cardCode = Cabecera[0].CardCode;
                              let addressKey = Cabecera[0].ShipToCode;
                              let billKey = Cabecera[0].PayToCode;
                              let comments = '';
                              let comment = Cabecera[0].U_Comentarios;
                              let docCurrency =  Cabecera[0].Currency;
                              let serie =  Cabecera[0].Series;
                              let empID =  Cabecera[0].SlpCode;
                              let creator = Cabecera[0].U_FMB_Handel_Creador || '';
                              let discPrcnt =  0;
                              let IdPackge = '4';
                              let PorCobrar = false;
                              let tipoEntrega = 'toAddress';
                              let convenio = '';
                              let dataInsertMinus = 0;
                              let itemsGift : any = [];
                              let datos = {
                                file: Cabecera[0].U_OC,
                                numOrden: Cabecera[0].U_NumOC,
                                resurtido: Cabecera[0].U_Resurtido
                              }
                              const model = new CatalogsModel();
                              model.action = "getFlete";
                              model.business = db_name;
                              
                              let result = await CatalogsProcedure(model);
                              let responseFlete = result[0];
                              
                              // Buscando puntos 
                              let modelProducts: ProductsModel = new ProductsModel();
                              modelProducts.action = 'getPoints';
                              modelProducts.cardCode = cardCode;
                              modelProducts.business = db_name;
                              let itemPoints = shoppingCart;
                              let totalPoints = 0;
                              // Puntos por total de documento
                              for (let i = 0; i < itemPoints.length; i++) {
                                  modelProducts.key = itemPoints[i].ItemCode;
                                  modelProducts.quantity = itemPoints[i].quantity;
                                  let points = await ProductsProcedure(modelProducts);
                                  if(points && points.length > 0){
                                      let queryPoints = Number(points[0].queryPoints).toFixed(0);
                                      itemPoints[i].itemPoint = Number(queryPoints);
                                      totalPoints += Number(queryPoints);
                                  }else{
                                      itemPoints[i].itemPoint = 0;
                                      totalPoints += 0;
                                  }  
                              }
                  
                              let data = {
                                  header: { dataInsertMinus, objType, service,cardCode, currency, docCurrency, addressKey, billKey, comments, 
                                      comment, wareHouse, taxCode, serie, paymentMethod,empID,creator, totalPoints,
                                      discPrcnt,IdPackge,PorCobrar,tipoEntrega,convenio, insurance: 50,datos,fileName : Cabecera[0].U_OC,numOrden :  Cabecera[0].U_NumOC, GroupNum : Cabecera[0].GroupNum,ordenCompraFile:Cabecera[0].U_FMB_ComprobantePago}, //estado
                                  items: itemPoints || [],
                                  itemsGift : itemsGift || [],
                                  responseFlete: responseFlete || [],
                                  address: address,
                                  bill: bill,
                                  insurance: insuranceObject,
                                  usRoute: false,
                              };
                              const ventasClienteInterface = new VentasClientes(sapConfig);
                              ventasClienteInterface.createXML(data);
                              ventasClienteInterface.setOptions();
                              responseDiServer = await ventasClienteInterface.createCall();

                              let doc = getTypeDocument(objType);
                              let ordersModel: OrdersModel = new OrdersModel();
                              ordersModel.action = 'findDocNum';
                              ordersModel.business = db_name;
                              ordersModel.docEntry = responseDiServer.docEntry || 0;
                              ordersModel.table = 'ORDR'; 

                              let docNumResponse = await OrdersProcedure(ordersModel);

                              if(!docNumResponse || !docNumResponse[0]){
                                  let err = 'Documento:'+ DocEntry + ' Error:'+ responseDiServer.message;
                                  logger.info("Error SAP-Autorizaciones: %o",err)
                                  responseModel.message = responseDiServer.message;// 'Ocurrio un error al generar tu pedido. intentalo nuevamente.';
                                  response.json(responseModel);
                                  await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'W' WHERE U_WddCode = ${DocEntry} AND U_UserID = ${Usuario} AND U_Remarks ='${tipo}'`); //AND "U_UserID" = ${Usuario}
                                  await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'W', Name = null WHERE U_DocEntry = ${DocEntry} AND U_Remarks ='${tipo}'`);
                                  return;
                              }

                              // let dataInsert = {
                              //     DocEntry: responseDiServer.docEntry,
                              //     DocNum: docNumResponse[0].DocNum,
                              //     CardCode: cardCode,
                              //     Total: totalPoints,
                              //     Type: "suma",
                              // }
                              
                              // let resultInsert = await insertPoints(dataInsert);
                              
                              if(!responseDiServer.status){
                                  responseModel.message = responseDiServer.message;// 'Ocurrio un error al generar tu pedido. intentalo nuevamente (estado de la orden)';
                                  response.json(responseModel);
                                  await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'W' WHERE U_WddCode = ${DocEntry} AND U_UserID = ${Usuario} AND U_Remarks ='${tipo}'`); 
                                  await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'W', Name = null WHERE U_DocEntry = ${DocEntry} AND U_Remarks ='${tipo}'`);
                                  return;
                              } 
                              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_DocEntryDoc = ${responseDiServer.docEntry},U_Status = 'Y' WHERE U_DocEntry = ${DocEntry}`);
                              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'Y' WHERE U_WddCode = ${DocEntry}`);

                              //-----------------------------------------MANDAR CORREO-----------------------------------------
                              //-----------------------------------------------------------------------------------------------
                              let Rechazado = {
                                  actions : 'Rechazado',
                                  param1 : DocEntry
                              }
                              let rechazado = await AutorizacionesProcedure(Rechazado);
                              let codigoCli = rechazado[0].CardCode;
                              let cliente = rechazado[0].CardName;
                              let documento = docNumResponse[0].DocNum;// rechazado[0].DocNum+'-'+DocEntry;
                              let ShipToCode = rechazado[0].ShipToCode;
                              let totalpesoNeto = 0;
                              let Subtotal = rechazado[0].DocTotal;

                              let body: any;
                                  body = '';
                              rechazado.map((item:any) =>{
                                  totalpesoNeto += Number(item.Peso);
                                  body += `
                                  <tr>
                                      <td>${item.ItemCode}</td>
                                      <td>${item.ItemName}</td>
                                      <td style="text-align: center;" >${parseInt(item.Quantity)}</td>
                                      <td>$ ${parseFloat(item.Price).toFixed(2)}</td>              
                                      <td>$ ${Number(item.PrecioLin).toFixed(2)}</td>`;
                                  return body;
                              })
                              body += '</tr>'

                              let RechazadoDir = {
                                  actions : 'RechazadoDir',
                                  param1 : codigoCli, 
                                  param2 : ShipToCode
                              }

                              let rechazadodir = await AutorizacionesProcedure(RechazadoDir);

                              let DATOS = {
                                  actions : 'DATOS',
                                  param1 : codigoCli, 
                              }
                              let CorreoCliente = await AutorizacionesProcedure(DATOS)
                              let mensajeCond = CorreoCliente[0].PymntGroup;
                              let mailToCliente = CorreoCliente[0].U_FMB_Handel_Email; //'hola@gmail.com'; //
                              let nMails = CorreoCliente[0].U_FMB_Handel_nMails || CorreoCliente[0].U_FMB_Handel_nMails != null ? CorreoCliente[0].U_FMB_Handel_nMails : '';
                              let Vendedor = CorreoCliente[0].Email;
                              let men = '';
                              
                              if(mensajeCond.substr(0,7) === 'CONTADO'){
                                  men = 'Recuerda que si no cancelas dentro de las 24 horas siguientes tu pedido se anulara.'
                              }
                              else{
                                  men = '';
                              }
                                  
                              let msghtml =  `
                              <html>
                              <head>
                                <meta charset="UTF-8">
                              </head>
                              <body style="margin: 0px; padding: 0px; width: 100%!important; background-color: #e0e0e0;">
                                <meta content="text/html; charset=iso-8859-1" http-equiv="Content-Type">
                                <link href="https://cms.chewy.com/fonts/roboto/email-font.css" rel="stylesheet" type="text/css">
                                <style type="text/css">
                                  a[x-apple-data-detectors] {
                                    color: inherit!important;
                                    text-decoration: none!important;
                                    font-size: inherit!important;
                                    font-family: inherit!important;
                                    font-weight: inherit!important;
                                    line-height: inherit!important;
                                  }
                                  a {
                                    text-decoration: none;
                                  }
                                  b { 
                                    color: #045bab; 
                                  }
                                  * {
                                    -webkit-text-size-adjust: none;
                                  }
                                  body {
                                    margin: 0 auto !important;
                                    padding: 0px!important;
                                    width: 100%;
                                    margin-right: auto;
                                    margin-left: auto;
                                  }
                                  html, body {
                                    margin: 0px;
                                    padding: 0px!important;
                                  }
                                  table, td, th {
                                    border-collapse: collapse;
                                    border-spacing: 0px;
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                  }
                                  div, p, a, li, td {
                                    -webkit-text-size-adjust: none;
                                  }
                                  * {
                                    -webkit-text-size-adjust: none;
                                  }
                                  img {
                                    display: block!important;
                                  }
                                  .ReadMsgBody {
                                    width: 100%;
                                  }
                                  .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
                                    line-height: 100%;
                                    margin: 0px;
                                    padding: 0px;
                                  }
                                  .ExternalClass {
                                    width: 100%;
                                  }
                                  span.MsoHyperlink {
                                    mso-style-priority:99;
                                    color:inherit;
                                  }
                                  span.MsoHyperlinkFollowed {
                                    mso-style-priority:99;
                                    color:inherit;
                                  }
                                  .nav .yshortcuts {
                                    color: #666666
                                  }
                                  .blacklink .yshortcuts {
                                    color: #000000
                                  }
                                  .graylink .yshortcuts {
                                    color: #999999
                                  }
                                  .footerLink a {
                                    color: #999999!important;
                                    text-decoration: none!important;
                                  }
                            
                                  .timeline{
                                    position: relative;
                                    margin-left: 10%;
                                    margin-top: 40px;
                                    margin-bottom: 40px;
                                  }       
                            
                                  .timeline li{
                                    list-style: none;
                                    float: left;
                                    width: 20%;
                                    position: relative;
                                    text-align: center;
                                    text-transform: uppercase;
                                    font-family: 'Dosis', sans-serif;
                                    color: #F1F1F1;
                                  }
                                
                                  .timeline li img{
                                    list-style: none;
                                    float: left;
                                    width: 20%;
                                    position: absolute;
                                    text-align: center;
                                    margin-top: -60;
                                    margin-left: 23;
                                  }
                                  
                                  ul:nth-child(1){
                                    color: #09488F;
                                  }
                            
                                  .timeline li:before{
                                    counter-increment: year;
                                    content: counter(year);
                                    width: 50px;
                                    height: 50px;
                                    border: 3px solid #F1F1F1;
                                    border-radius: 50%;
                                    display: block;
                                    text-align: center;
                                    line-height: 50px;
                                    margin: 0 auto 10px auto;
                                    background: #F1F1F1;
                                    color: #F1F1F1;
                                    transition: all ease-in-out .3s;
                                  }
                            
                                  .timeline li:after{
                                    content: "";
                                    position: absolute;
                                    width: 100%;
                                    height: 5px;
                                    background-color: #F1F1F1;
                                    top: 25px;
                                    left: -50%;
                                    z-index: -999;
                                    transition: all ease-in-out .3s;
                                  }
                            
                                  .timeline li:first-child:after{
                                    content: none;
                                  }
                                  
                                  /*texto que va debajo de la lista activa*/
                                  .timeline li.active{
                                    color: #09488F;
                                  }
                                  
                                  /*texto que va dentro del circulo activo*/
                                  .timeline li.active:before{
                                    background: #09488F;
                                    color: #09488F;
                                  }
                            
                                  .timeline li.active + li:after{
                                    background: #09488F;
                                  }
                            
                                  div, button {
                                    margin: 0!important;
                                    padding: 0;
                                    display: block!important;
                                  }
                                  @media screen and (max-width: 600px) and (min-width: 480px) {
                                    .scale {
                                      width: 100%!important;
                                      min-width: 1px!important;
                                      max-width: 600px!important;
                                      height: auto!important;
                                      max-height: none!important;
                                    }
                                  }
                                  @media (max-width: 480px) {
                                    .scale {
                                      width: 100%!important;
                                      min-width: 1px!important;
                                      max-width: 480px!important;
                                      height: auto!important;
                                      max-height: none!important;
                                    }
                                    .scale-480 {
                                      width: 100%!important;
                                      min-width: 1px!important;
                                      max-width: 480px!important;
                                      height: auto!important;
                                      max-height: none!important;
                                    }
                                    .stack {
                                      display: block!important;
                                      width: 100%!important;
                                    }
                                    .hide {
                                      display: none!important;
                                      width: 0px!important;
                                      height: 0px!important;
                                      max-height: 0px!important;
                                      padding: 0px 0px 0px 0px!important;
                                      overflow: hidden!important;
                                      font-size: 0px!important;
                                      line-height: 0px!important;
                                    }
                                    .ship-text {
                                      padding: 12px 0px 12px 0px!important;
                                      font-size: 12px!important;
                                      line-height: 120%!important;
                                      letter-spacing: 0px!important;
                                    }
                                    .logo-box { 
                                      padding: 10px 0px 10px 0px!important;
                                    }
                                    .headline {
                                      padding: 25px 25px 10px 25px!important;
                                      font-size: 30px!important;
                                      line-height: 110%!important;
                                      letter-spacing: 0px!important;
                                    }
                                    .reviews {
                                      padding: 20px 10px 10px 10px!important;
                                    }
                                    .copy {
                                      font-size: 12px!important;
                                      line-height: 16px!important;
                                      padding: 5px 10px 0px 10px!important;
                                    }
                                    .product {
                                      font-size: 12px!important;
                                    }
                                    .cta {
                                      width: 130px!important;
                                      height: auto!important;
                                    }
                                    .contact-pad {
                                      padding: 20px 0px 20px 0px!important;
                                    }
                                    .contact-text {
                                      font-size: 14px!important;
                                      line-height: 120%!important;
                                    }
                                    .trust-pad {
                                      padding: 10px!important;
                                    }
                                    /* Custom CSS */
                                    .mob-br {
                                      display: block!important;
                                    }
                                    .pr {
                                      padding: 0px 0px 0px 0px!important;   
                                    }
                                  }
                                  @media (max-width: 400px) {
                                    .trust-pad {
                                      padding: 10px 0px!important;
                                    }
                                    .mob-br-400 {
                                      display: block!important;
                                    }
                                    .ship-text {
                                      font-size: 11px!important;
                                    }
                                  }
                                </style>
                            
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #e0e0e0;">
                                  <tbody>
                                    <tr>
                                      <td width="100%" align="center" valign="top">
                                        <table style="border: border-collapse;" cellpadding="0" cellspacing="0" border="0">
                                          <tbody>
                                            <tr>
                                              <td align="center">           
                                                <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                                                  <tbody>
                                                    <tr>
                                                      <td bgcolor="#FFFFFF" align="center" valign="top">            
                                                        <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                                                          <tbody>
                                                            <tr>
                                                              <td class="logo-box" width="100%" align="center" style="background-color: #000; padding: 25px 0px 25px 0px;" bgcolor="#008af0">
                                                                <a style="text-decoration: none;" href="http://diasa.net/" target="_blank">
                                                                  <img style="width: 100%; max-width: 150px; height: auto; max-height: none; margin: 0px auto;" src="https://1.bp.blogspot.com/-RNYvlquHGT8/YQ7e5pr8ciI/AAAAAAAAAac/wkxgem7uHoIpakfjF9p98IymTYQO5GxrACLcBGAsYHQ/w945-h600-p-k-no-nu/DIASA.png" width="480" height="46" border="0">
                                                                </a>
                                                              </td>
                                                            </tr>
                                                            <tr>
                                                              <td bgcolor="#ffffff" style="height: 15px; line-height: 15px; background-color: #ffffff;" height="15">
                                                              </td>
                                                            </tr>
                                                            <tr>
                                                            <td style="font-family: 'RobotoBold', Tahoma, Arial; color: #444444; font-size: 30px; font-weight: 700; line-height: 45px; mso-line-height-rule: exactly; text-align: center; padding: 35px 10px 10px 10px;" align="center" class="headline">
                                                              <a style="text-decoration: none; color: #444444;">Te informamos que tu pedido ha sido APROBADO no. ${documento}</a>
                                                              </td>
                                                            </tr>
                                                            <tr>
                                                              <td style="font-family: Arial; color: #000000; font-size: 20px; line-height: 25px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 30px 20px;" align="center" class="copy">
                                                                <a style="color: #000000; text-decoration: none;">Estimado ${cliente},</a>
                                                              </td>
                                                            </tr>
                                                            <tr>
                                                              <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: justify; padding: 0px 20px 0px 20px;" align="center" class="copy">
                                                                <a style="color: #000000; text-decoration: none;" >
                                                                <p><h4 style="font-weight: bold;">Te informamos que tu pedido ha sido APROBADO por la siguiente razón "${Comentario}" </h4> </p>
                                                                  <p>Si tienes alguna duda puedes contactarnos al teléfono <a style="color: #045bab;"><u> (81) 1253 3080</u></a> o escríbenos al correo <a style="color: #045bab;"><u>ventas@diasa.net</u></a>, donde con gusto te atenderemos.</p>
                                                                </a>
                                                              </td>
                                                            </tr>
                                                            <tr>
                                                              <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 0px 20px;" align="center" class="copy">
                                                                <a style="color: #000000; text-decoration: none;"> Detalle del pedido.</a>
                                                              </td>
                                                            </tr> 
                                                          </tbody>
                                                        </table>
                                                        <br>
                                                        <div style="padding: 0px 20px 0px 20px;">
                                                          <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                                                            <tr style="background-color: #008af0;">
                                                              <th>ARTÍCULO</th>
                                                              <th>DESCRIPCIÓN</th>
                                                              <th>CANTIDAD</th>
                                                              <th>PRECIO</th>
                                                              <th>TOTAL</th>
                                                            </tr>        
                                                            ${body}
                                                            <tr>
                                                              <td colspan="6" style="text-align: right;"></td>
                                                            </tr>               
                                                            <tr>
                                                              <td colspan="4" style="text-align: right;">Total:</td>
                                                              <th style="text-align: left; background-color: #008af0;" >$ ${Number(Subtotal).toFixed(2)}</th>
                                                            </tr>                            
                                                          </table>
                                                        </div>
                            
                                                        <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; min-width: 600px; width: 600px;" width="600" class="scale">
                                                          <tbody>
                                                            <tr>
                                                              <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 0px 20px;" align="center" class="copy">
                                                                <a style="color: #000000; text-decoration: none;"> El pedido será entregado en:</a>
                                                              </td>
                                                            </tr> 
                                                            <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: justify; padding: 0px 20px 0px 20px;" align="center" class="copy">
                                                                <a style="color: #000000; text-decoration: none;" >
                                                                  <p><b>Dirección: </b> ${ rechazadodir[0].Address } ,<b>Calle/Número: </b> ${ rechazadodir[0].Street } ,<b>CP: </b> ${ rechazadodir[0].ZipCode } ,<b>Ciudad: </b> ${ rechazadodir[0].City } ,<b>País: </b> ${ rechazadodir[0].Country } </p>
                                                                </a>
                                                              </td>
                                                          </tbody>
                                                        </table>
                            
                                                        <div align="center" class="container">
                                                          <h3>Estátus del Pedido</h3>
                                                          <ul class="timeline ">
                                                            <li class="active"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABmJLR0QA/wD/AP+gvaeTAAAAU0lEQVRIie3PsQmAQBBE0b/WoQVpHcKVvSBYxxgJcskZuInMyybZz4KZmdkbkjZJqe+lpPXZii58AEvRX2dEzPeYiiJDfbgBWdBJYC+4a2Zmf3QBdKVlhPjFs54AAAAASUVORK5CYII=">En proceso</li>
                                                            <li>Empacado</li>
                                                            <li>Facturado</li>
                                                          </ul>
                                                        </div>
                            
                                                        <table border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px; background-color: #008af0;" width="600" class="scale">
                                                          <tbody>
                                                            <tr>
                                                              <td width="100%" align="center" valign="middle" style="vertical-align: middle;">
                                                                <table cellpadding="0" cellspacing="0" border="0">
                                                                  <tbody>
                                                                    <tr>
                                                                      <td style="padding: 40px 0px 40px 0px;" class="contact-pad" align="center">
                                                                        <table cellpadding="0" cellspacing="0" border="0">
                                                                          <tbody>
                                                                            <tr>
                                                                              <td style="padding: 0px 7px 0px 0px;" align="center" width="27"><a style="text-decoration: none; color: #ffffff;" href="http://diasa.net/contacto/" target="_blank" rilt="ContactUs_Icon"><img style="display: inline;" src="https://1.bp.blogspot.com/-VoID1BgvhrY/YRGMjLGW24I/AAAAAAAAAbE/mWax9GkDfJsDgCObf6geHCCP5FbyftsZACLcBGAsYHQ/s20/telefono_Mesa%2Bde%2Btrabajo%2B1.png" width="20" height="20" alt="" border="0"></a>
                                                                              </td>
                                                                              <td style="font-family: 'RobotoBold', Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center;" class="contact-text" align="center"><a style="text-decoration: none; color: #ffffff;" href="http://diasa.net/contacto/" target="_blank" rilt="ContactUs_Text"> Llámanos al (81) 1253 3080 </a>
                                                                              </td>
                                                                            </tr>
                                                                          </tbody>
                                                                        </table>
                                                                      </td>
                                                                    </tr>
                                                                  </tbody>
                                                                </table>
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                        <br>
                                                        <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; min-width: 600px; width: 600px;" width="600" class="scale">
                                                          <tbody>
                                                            <tr>
                                                              <td style="padding:0 0 21px;">
                                                                <table align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                                                  <tbody>
                                                                    <tr>
                                                                      <td class="active-i">
                                                                        <a style="text-decoration:none;" href="https://www.facebook.com/DiasaAbrasivosyHerramientas" target="_blank">
                                                                          <img src="https://image.flaticon.com/icons/png/512/174/174848.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="fb">
                                                                        </a>
                                                                      </td>
                                                                      <td width="20"></td>
                                                                      <td class="active-i">
                                                                        <a style="text-decoration:none;" href="https://wa.me/message/Z5RDIDIEZBJ2I1" target="_blank">
                                                                          <img src="https://image.flaticon.com/icons/png/512/174/174879.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="ig">
                                                                        </a>
                                                                      </td>
                                                                      <td width="20"></td>
                                                                      <td class="active-i">
                                                                        <a style="text-decoration:none;" href="https://www.linkedin.com/company/diasaabrasivosyherramientas" target="_blank">
                                                                          <img src="https://image.flaticon.com/icons/png/512/174/174857.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="tw">
                                                                        </a>
                                                                      </td>
                                                                      <td width="20"></td>
                                                                      <td class="active-i">
                                                                        <a style="text-decoration:none;" href="http://diasa.net/" target="_blank">
                                                                          <img src="https://image.flaticon.com/icons/png/512/841/841364.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="tw">
                                                                        </a>
                                                                      </td>
                                                                    </tr>
                                                                  </tbody>
                                                                </table>
                                                              </td>
                                                            </tr>
                                                            <tr>
                                                              <td valign="top">
                                                                <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                                                  <tbody>
                                                                    <tr>
                                                                      <td style="padding: 0px 20px 7px 20px; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #999999; text-align: center; line-height: 100%; mso-line-height-rule: exactly;">
                            
                                                                        <span class="footerLink">
                            
                                                                        © 2021. Todos los derechos reservados.</span>
                            
                                                                        <br>
                                                                        <br>
                                                                        <a href="http://diasa.net/" style="color:#999999; text-decoration: underline;" target="_blank">diasa.net</a>
                                                                      </td>
                                                                    </tr>
                                                                  </tbody>
                                                                </table>
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </body>
                            </html>`;
                              
                              let dataMail = await EmailProcedure("getOrder");
                              let bcc;
                              if (dataMail[0].validateOrderBCC === 1){
                                  bcc = dataMail[0].orderBCC;
                              }else{
                                  bcc="";
                              }
                              let subject = dataMail[0].orderSubject;

                              let getmailAutorizadores = {
                                actions : 'getMailReject',
                                param1 : DocEntry
                              }
                              let CorreoAutorizadores:any = '';
                              let mailAutorizadores = await AutorizacionesProcedure(getmailAutorizadores);
                              if(mailAutorizadores.length > 0){
                                for (let index = 0; index < mailAutorizadores.length; index++) {
                                  const element = mailAutorizadores[index];
                                  CorreoAutorizadores += element.E_Mail+",";
                                }
                              }

                              if(nMails !== ''){
                                let sendMail = await helpers.sendEmail(mailToCliente+';'+nMails,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );
                              }else{

                                let sendMail = await helpers.sendEmail(mailToCliente,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );
                              }
                            
                              
                              
                              // response.json(responseModel);
                          } catch (e) {
                              logger.error("(00002-1) AuthorizationController-> authorizedDocument-> ", e);
                              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'W' WHERE U_WddCode = ${DocEntry}  AND U_UserID = ${Usuario} AND U_Remarks ='${tipo}'`); 
                              responseModel.message = 'Error al crear el documento '+ e;
                              responseModel.status = 0;
                              responseModel.data = {}  
                              response.json(responseModel);
                              return;
                          }
                        }
                    }else{
                        reason = "Documento creado con exito";
                    }
                }
                else{
                    reason = "Documento en proceso de autorización";
                }
                // await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'Y' WHERE U_WddCode = ${DocEntry} AND U_StepCode = ${WstCode}`);
                // await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'Y' WHERE U_DocEntry =${DocEntry} AND U_CurrStep = ${StepCode}`);

                // await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'N' WHERE U_WddCode = ${DocEntry} AND U_StepCode = ${WstCode}`);
                // await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'N' WHERE U_DocEntry =${DocEntry} AND U_CurrStep = ${StepCode}`);
                responseModel.message = reason;
                responseModel.status = 1;
                responseModel.data = {}  
                response.json(responseModel);
            }
          }else{
            if(creado.recordset[0].U_DocEntryDoc){
              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'Y' WHERE U_DocEntry = ${DocEntry}`);
              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'Y' WHERE U_WddCode = ${DocEntry}`);
            }
            if(creado.recordset[0].U_Status === 'N'){
              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'N' WHERE U_DocEntry = ${DocEntry}`);
              await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'N' WHERE U_WddCode = ${DocEntry}`);
            }
            responseModel.message = "Este documento ya ha sido actualizado, se enviará a su sección correspondiente.";
            responseModel.status = 1;
            responseModel.data = {}  
            response.json(responseModel)
          }
        } catch (error) {
            logger.error("AuthorizationController-> ", error);
        }

    } catch (error) {
        logger.error('Crear autorizacion: ', error)
    }    
}

export async function UpdateAutorization(request: Request, response: Response) {
  const {data,docEntry,GroupNum,Total,Comments} = request.body;
  const {db_name, wareHouse, sapConfig, taxCode, currency, paymentMethod} = response.locals.business;
  let responseModel = new ResponseModel();
  const sapAuthorization = new SAPAuthorization(sapConfig);
 
  try {
    class itemformat {
      LineStatus = '';
      Currency = '';
      ItemCode = '';
      ItemName = "";
      BaseEntry = '';
      BaseType = '';
      Quantity = '';
      OcrCode = '';
      OcrCode2 = '';
      OcrCode3 = '';
      OcrCode4 = '';
      OcrCode5 = '';
      WhsCode = '';
      TaxCode = '';
      TaxeRate = '';
      TaxeTotal = '';
      LineNum = '';
      DiscPrcnt = '';
      Price = '';
      LineTotal = '';
      Filler = "";
      FillerName = "";
      ToWhsCode = "";
      ToWhsCodeName = "";
      AcctCode = "";
      CogsAcct = "";
      ItemNew = true;
      UserBaseUn = "";
      U_Partida = "";
      U_DescPago = "";
      U_Promocional = "";
      NumPerMsr = '';
      UMA = '';
    }

    let itemsDocument: any = [];
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      let newitem = new itemformat();
      newitem.ItemCode = item.itemCode || '';
      newitem.Quantity = item.quantity || null;
      newitem.Price = item.price || null;
      newitem.DiscPrcnt = item.DiscPrcnt || null;
      itemsDocument.push(newitem);
    }
    sapAuthorization.searchXML({destino: '112', docEntry});
    sapAuthorization.replaceSapVersion();
    sapAuthorization.setOptions();
    let searchResponse:any = await sapAuthorization.createCallSearch();
    let {Document} = searchResponse;
    if(GroupNum !== ''){
      Document.PaymentGroupCode._text = GroupNum;
    }

    if(Total !== ''){
      Document.DocTotal._text = Total;
    }

    Document.U_Comentarios._text? Document.U_Comentarios._text = Comments
    : Document.U_Comentarios = { _text: Comments };

    let DocumentLine: any = [];
    let baseEntry: any = null;
    let baseLine: any = null;

    let oldItems: any = [];
    if (Array.isArray(Document.DocumentLines.DocumentLine)) {
        baseEntry = Document.DocumentLines.DocumentLine[0].BaseEntry;
        baseLine = Document.DocumentLines.DocumentLine[0].BaseLine;
        oldItems = Document.DocumentLines.DocumentLine;
    }else {
        baseEntry = Document.DocumentLines.DocumentLine.BaseEntry;
        baseLine = Document.DocumentLines.DocumentLine.BaseLine;
        oldItems.push(Document.DocumentLines.DocumentLine);
    }
    
   
    for (let index = 0; index < itemsDocument.length; index++) {
      const itemDocument = itemsDocument[index];     
      for (let index = 0; index < oldItems.length; index++) {
        const old = oldItems[index];
        if (old.ItemCode._text == itemDocument.ItemCode) {
            old.Quantity._text = itemDocument.Quantity || "";
            old.UnitPrice._text = itemDocument.Price;
            old.DiscountPercent._text = itemDocument.DiscPrcnt || '';
            DocumentLine.push(old);
        }
      }
    }
    if(DocumentLine.length > 0){
      Document.DocumentLines.DocumentLine =  DocumentLine;
    }
    
    const sapAuthorizationCreate = new SAPAuthorization(sapConfig);
    sapAuthorizationCreate.updateXML(Document,'112')
    sapAuthorizationCreate.replaceSapVersion();
    sapAuthorizationCreate.setOptions();
    let responseUpdate:any = await sapAuthorizationCreate.createCall();

    responseModel.status = 1;
    responseModel.message = 'Información actualizada de forma correcta'
    response.json(responseModel);
  } catch (error) {
    responseModel.status = 0;
    responseModel.message = 'Error al actualizar la información'
    response.json(responseModel);
  }
 
}

export async function rejectedAutorization(request: Request, response: Response) {
    const {DocEntry, Usuario, Comentario, WstCode} = request.body;
    const db = new DatabaseService();
    // const sh = new SchemaService ();
    const responseModel = new ResponseModel();
  try {
        // let data = {
        //     "U_SYP_RICO_ESTADO": "R",
        //     "Comments" : Comentario
        // };
  
        // let order = `Drafts(${DocEntry})`;
        let ordersResponse:any = '';
        // let ordersResponse = await sh.UpdateAutorization(order,data);  
    
        // if(ordersResponse.message){
        //   let error = ordersResponse.message.error.message.value;
        //   responseModel.message = error;///'Ocurrio un error al generar tu pedido. intentalo nuevamente (estado de la orden)';
        //   response.json(responseModel);
        //   return;
        // }
      let creado = await db.Query(`SELECT * FROM [Handel_B2B].[dbo].[FMB_OWDD] WHERE U_DocEntry = ${DocEntry} AND U_CurrStep=${WstCode}`);         
      if(!creado.recordset[0].U_DocEntryDoc){
        let respon = await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'N' WHERE U_DocEntry =${DocEntry}`);
        let responses = await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'N' WHERE U_WddCode =${DocEntry}`); 
        logger.error("UPDATE FMB_OWDD", respon, responses)
  
        // try {
        //   let rechazado = true;
        //   let ordersResponse:any = '';
        //   let reason:any = '';
        //   await sh.statements(`UPDATE "FMB_WDD1" SET "U_Status" = 'N' WHERE "U_WddCode" =${DocEntry} AND "U_UserID" =${Usuario} AND "U_StepCode" = ${WstCode}`);
        //   let resultado = await sh.statements(`SELECT * FROM "FMB_OWDD" WHERE "U_DocEntry" =${DocEntry}`);
        
        //   for (let index = 0; index < resultado.length; index++) {
        //       const resul = resultado[index];
        //       let MaxReqr  = resul.U_MaxReqr;
        //       let MaxRejReqr  = resul.U_MaxRejReqr;
        //       let StepCode  = resul.U_CurrStep;
      
        //       for (let index = 0; index < MaxReqr; index++) {
        //           let datos = await sh.statements(`SELECT * FROM "FMB_WDD1" WHERE "U_WddCode" =${DocEntry} AND "U_StepCode" = ${StepCode}`);
        //           let acept = 0;
                  
        //           datos.map((dat:any) =>{
        //               if (dat.U_Status === 'Y'){
        //                   acept++;
        //               }
        //           });
        //           if(acept === MaxReqr){
        //               await sh.statements(`UPDATE "FMB_WDD1" SET "U_Status" = 'Y' WHERE "U_WddCode" = ${DocEntry} AND "U_StepCode" = ${WstCode}`);
        //               await sh.statements(`UPDATE "FMB_OWDD" SET "U_Status" = 'Y' WHERE "U_DocEntry" =${DocEntry} AND "U_CurrStep" = ${StepCode}`);
        //           }
        //       } 
        //       for (let index = 0; index < MaxRejReqr; index++) {
        //           let datos = await sh.statements(`SELECT * FROM "FMB_WDD1" WHERE "U_WddCode" =${DocEntry} AND "U_StepCode" = ${StepCode}`);
        //           let cancel = 0;
                  
        //           datos.map((dat:any) =>{
        //               if(dat.U_Status === 'N'){
        //                   cancel++;
        //               }
        //           });
        //           if(cancel === MaxRejReqr){
        //               await sh.statements(`UPDATE "FMB_WDD1" SET "U_Status" = 'N' WHERE "U_WddCode" = ${DocEntry} AND "U_StepCode" = ${WstCode}`);
        //               await sh.statements(`UPDATE "FMB_OWDD" SET "U_Status" = 'N' WHERE "U_DocEntry" =${DocEntry} AND "U_CurrStep" = ${StepCode}`);
        //           }
        //       } 
        //   }
          
        //   let resul = await sh.statements(`SELECT * FROM "FMB_OWDD" WHERE "U_DocEntry" = ${DocEntry}`);
          
        //   for (let index = 0; index < resul.length; index++) {
        //       const resu = resul[index];
        //       if(resu.U_Status === 'W' || resu.U_Status === 'Y'){
        //           rechazado = false;
        //       }
        //   }
        
        //   if(rechazado){
        //       try {
        //         // reason = "Documento Cancelado";
        //         let data = {
        //             "U_SYP_RICO_ESTADO": "R",
        //             "Comments" : Comentario
        //         };
      
        //         let order = `Drafts(${DocEntry})`;
        //         ordersResponse = await sh.UpdateAutorization(order,data);  
              
        //       } catch (e) {
        //       logger.error("AuthorizationController-> authorizedDocument-> ", e);
        //       }
        //     }
          
        // } catch (error) {
        //   logger.error("AuthorizationController-> authorizedDocument-> ", error);
        // }
  
        
        responseModel.message = 'Documento Rechazado';
        responseModel.status = 1;
        responseModel.data = {docNum: ordersResponse}
  
        //-----------------------------------------MANDAR CORREO-----------------------------------------
        //-----------------------------------------------------------------------------------------------
        let Rechazado = {
            actions : 'Rechazado',
            param1 : DocEntry
        }
        let rechazado = await AutorizacionesProcedure(Rechazado);
        
        let codigoCli = rechazado[0].CardCode;
        let cliente = rechazado[0].CardName;
        let documento = rechazado[0].DocNum+'-'+DocEntry;
        let ShipToCode = rechazado[0].ShipToCode;
        let totalpesoNeto = 0;
        let Subtotal = rechazado[0].DocTotal;
  
        let body: any;
          body = '';
        rechazado.map((item:any) =>{
          totalpesoNeto += Number(item.Peso);
            body += `
            <tr>
              <td>${item.ItemCode}</td>
              <td>${item.ItemName}</td>
              <td style="text-align: center;" >${parseInt(item.Quantity)}</td>
              <td>$ ${parseFloat(item.Price).toFixed(2)}</td>              
              <td>$ ${Number(item.PrecioLin).toFixed(2)}</td>`;
            return body;
        })
        body += '</tr>'

        let RechazadoDir = {
            actions : 'RechazadoDir',
            param1 : codigoCli, 
            param2 : ShipToCode
        }
        let rechazadodir = await AutorizacionesProcedure(RechazadoDir);
  
        let DATOS = {
            actions : 'DATOS',
            param1 : codigoCli, 
        }
        let CorreoCliente = await AutorizacionesProcedure(DATOS)
        let mensajeCond = CorreoCliente[0].PymntGroup;
        let mailToCliente = CorreoCliente[0].U_FMB_Handel_Email; //'hola@gmail.com'; //
        let Vendedor = CorreoCliente[0].Email;
        let nMails = CorreoCliente[0].U_FMB_Handel_nMails || CorreoCliente[0].U_FMB_Handel_nMails != null ? CorreoCliente[0].U_FMB_Handel_nMails : '';

        let men = '';

        let getmailAutorizadores = {
          actions : 'getMailReject',
          param1 : DocEntry
        }
        let CorreoAutorizadores:any = '';
        let mailAutorizadores = await AutorizacionesProcedure(getmailAutorizadores);
        if(mailAutorizadores.length > 0){
          for (let index = 0; index < mailAutorizadores.length; index++) {
            const element = mailAutorizadores[index];
            CorreoAutorizadores += element.E_Mail+",";
          }
        }
        
        if(mensajeCond.substr(0,7) === 'CONTADO'){
          men = 'Recuerda que si no cancelas dentro de las 24 horas siguientes tu pedido se anulara.'
        }
        else{
          men = '';
        }
          
        let msghtml =  `
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="margin: 0px; padding: 0px; width: 100%!important; background-color: #e0e0e0;">
          <meta content="text/html; charset=iso-8859-1" http-equiv="Content-Type">
          <link href="https://cms.chewy.com/fonts/roboto/email-font.css" rel="stylesheet" type="text/css">
          <style type="text/css">
            a[x-apple-data-detectors] {
              color: inherit!important;
              text-decoration: none!important;
              font-size: inherit!important;
              font-family: inherit!important;
              font-weight: inherit!important;
              line-height: inherit!important;
            }
            a {
              text-decoration: none;
            }
            b { 
              color: #045bab; 
            }
            * {
              -webkit-text-size-adjust: none;
            }
            body {
              margin: 0 auto !important;
              padding: 0px!important;
              width: 100%;
              margin-right: auto;
              margin-left: auto;
            }
            html, body {
              margin: 0px;
              padding: 0px!important;
            }
            table, td, th {
              border-collapse: collapse;
              border-spacing: 0px;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            div, p, a, li, td {
              -webkit-text-size-adjust: none;
            }
            * {
              -webkit-text-size-adjust: none;
            }
            img {
              display: block!important;
            }
            .ReadMsgBody {
              width: 100%;
            }
            .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
              line-height: 100%;
              margin: 0px;
              padding: 0px;
            }
            .ExternalClass {
              width: 100%;
            }
            span.MsoHyperlink {
              mso-style-priority:99;
              color:inherit;
            }
            span.MsoHyperlinkFollowed {
              mso-style-priority:99;
              color:inherit;
            }
            .nav .yshortcuts {
              color: #666666
            }
            .blacklink .yshortcuts {
              color: #000000
            }
            .graylink .yshortcuts {
              color: #999999
            }
            .footerLink a {
              color: #999999!important;
              text-decoration: none!important;
            }
      
            .timeline{
              position: relative;
              margin-left: 10%;
              margin-top: 40px;
              margin-bottom: 40px;
            }       
      
            .timeline li{
              list-style: none;
              float: left;
              width: 20%;
              position: relative;
              text-align: center;
              text-transform: uppercase;
              font-family: 'Dosis', sans-serif;
              color: #F1F1F1;
            }
          
            .timeline li img{
              list-style: none;
              float: left;
              width: 20%;
              position: absolute;
              text-align: center;
              margin-top: -60;
              margin-left: 23;
            }
            
            ul:nth-child(1){
              color: #09488F;
            }
      
            .timeline li:before{
              counter-increment: year;
              content: counter(year);
              width: 50px;
              height: 50px;
              border: 3px solid #F1F1F1;
              border-radius: 50%;
              display: block;
              text-align: center;
              line-height: 50px;
              margin: 0 auto 10px auto;
              background: #F1F1F1;
              color: #F1F1F1;
              transition: all ease-in-out .3s;
            }
      
            .timeline li:after{
              content: "";
              position: absolute;
              width: 100%;
              height: 5px;
              background-color: #F1F1F1;
              top: 25px;
              left: -50%;
              z-index: -999;
              transition: all ease-in-out .3s;
            }
      
            .timeline li:first-child:after{
              content: none;
            }
            
            /*texto que va debajo de la lista activa*/
            .timeline li.active{
              color: #09488F;
            }
            
            /*texto que va dentro del circulo activo*/
            .timeline li.active:before{
              background: #09488F;
              color: #09488F;
            }
      
            .timeline li.active + li:after{
              background: #09488F;
            }
      
            div, button {
              margin: 0!important;
              padding: 0;
              display: block!important;
            }
            @media screen and (max-width: 600px) and (min-width: 480px) {
              .scale {
                width: 100%!important;
                min-width: 1px!important;
                max-width: 600px!important;
                height: auto!important;
                max-height: none!important;
              }
            }
            @media (max-width: 480px) {
              .scale {
                width: 100%!important;
                min-width: 1px!important;
                max-width: 480px!important;
                height: auto!important;
                max-height: none!important;
              }
              .scale-480 {
                width: 100%!important;
                min-width: 1px!important;
                max-width: 480px!important;
                height: auto!important;
                max-height: none!important;
              }
              .stack {
                display: block!important;
                width: 100%!important;
              }
              .hide {
                display: none!important;
                width: 0px!important;
                height: 0px!important;
                max-height: 0px!important;
                padding: 0px 0px 0px 0px!important;
                overflow: hidden!important;
                font-size: 0px!important;
                line-height: 0px!important;
              }
              .ship-text {
                padding: 12px 0px 12px 0px!important;
                font-size: 12px!important;
                line-height: 120%!important;
                letter-spacing: 0px!important;
              }
              .logo-box { 
                padding: 10px 0px 10px 0px!important;
              }
              .headline {
                padding: 25px 25px 10px 25px!important;
                font-size: 30px!important;
                line-height: 110%!important;
                letter-spacing: 0px!important;
              }
              .reviews {
                padding: 20px 10px 10px 10px!important;
              }
              .copy {
                font-size: 12px!important;
                line-height: 16px!important;
                padding: 5px 10px 0px 10px!important;
              }
              .product {
                font-size: 12px!important;
              }
              .cta {
                width: 130px!important;
                height: auto!important;
              }
              .contact-pad {
                padding: 20px 0px 20px 0px!important;
              }
              .contact-text {
                font-size: 14px!important;
                line-height: 120%!important;
              }
              .trust-pad {
                padding: 10px!important;
              }
              /* Custom CSS */
              .mob-br {
                display: block!important;
              }
              .pr {
                padding: 0px 0px 0px 0px!important;   
              }
            }
            @media (max-width: 400px) {
              .trust-pad {
                padding: 10px 0px!important;
              }
              .mob-br-400 {
                display: block!important;
              }
              .ship-text {
                font-size: 11px!important;
              }
            }
          </style>
      
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #e0e0e0;">
            <tbody>
              <tr>
                <td width="100%" align="center" valign="top">
                  <table style="border: border-collapse;" cellpadding="0" cellspacing="0" border="0">
                    <tbody>
                      <tr>
                        <td align="center">           
                          <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                            <tbody>
                              <tr>
                                <td bgcolor="#FFFFFF" align="center" valign="top">            
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                                    <tbody>
                                      <tr>
                                        <td class="logo-box" width="100%" align="center" style="background-color: #000; padding: 25px 0px 25px 0px;" bgcolor="#008af0">
                                          <a style="text-decoration: none;" href="http://diasa.net/" target="_blank">
                                            <img style="width: 100%; max-width: 150px; height: auto; max-height: none; margin: 0px auto;" src="https://1.bp.blogspot.com/-RNYvlquHGT8/YQ7e5pr8ciI/AAAAAAAAAac/wkxgem7uHoIpakfjF9p98IymTYQO5GxrACLcBGAsYHQ/w945-h600-p-k-no-nu/DIASA.png" width="480" height="46" border="0">
                                          </a>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td bgcolor="#ffffff" style="height: 15px; line-height: 15px; background-color: #ffffff;" height="15">
                                        </td>
                                      </tr>
                                      <tr>
                                      <td style="font-family: 'RobotoBold', Tahoma, Arial; color: #444444; font-size: 30px; font-weight: 700; line-height: 45px; mso-line-height-rule: exactly; text-align: center; padding: 35px 10px 10px 10px;" align="center" class="headline">
                                        <a style="text-decoration: none; color: #444444;">Pedido RECHAZADO no. ${documento}</a>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="font-family: Arial; color: #000000; font-size: 20px; line-height: 25px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 30px 20px;" align="center" class="copy">
                                          <a style="color: #000000; text-decoration: none;">Estimado ${cliente},</a>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: justify; padding: 0px 20px 0px 20px;" align="center" class="copy">
                                          <a style="color: #000000; text-decoration: none;" >
                                            <p><h4 style="font-weight: bold;">Te informamos que tu pedido ha sido RECHAZADO por la siguiente razón "${Comentario}" </h4> </p>
                                            <p>Si tienes alguna duda puedes contactarnos al teléfono <a style="color: #045bab;"><u> (81) 1253 3080</u></a> o escríbenos al correo <a style="color: #045bab;"><u>ventas@diasa.net</u></a>, donde con gusto te atenderemos.</p>
                                          </a>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 0px 20px;" align="center" class="copy">
                                          <a style="color: #000000; text-decoration: none;"> Detalle del pedido.</a>
                                        </td>
                                      </tr> 
                                    </tbody>
                                  </table>
                                  <br>
                                  <div style="padding: 0px 20px 0px 20px;">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                                      <tr style="background-color: #008af0;">
                                        <th>ARTÍCULO</th>
                                        <th>DESCRIPCIÓN</th>
                                        <th>CANTIDAD</th>
                                        <th>PRECIO</th>
                                        <th>TOTAL</th>
                                      </tr>        
                                      ${body}
                                      <tr>
                                        <td colspan="6" style="text-align: right;"></td>
                                      </tr>               
                                      <tr>
                                        <td colspan="4" style="text-align: right;">Total:</td>
                                        <th style="text-align: left; background-color: #008af0;" >$ ${Number(Subtotal).toFixed(2)}</th>
                                      </tr>                            
                                    </table>
                                  </div>
      
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; min-width: 600px; width: 600px;" width="600" class="scale">
                                    <tbody>
                                      <tr>
                                        <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 0px 20px;" align="center" class="copy">
                                          <a style="color: #000000; text-decoration: none;"> El pedido será entregado en:</a>
                                        </td>
                                      </tr> 
                                      <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: justify; padding: 0px 20px 0px 20px;" align="center" class="copy">
                                          <a style="color: #000000; text-decoration: none;" >
                                            <p><b>Dirección: </b> ${ rechazadodir[0].Address } ,<b>Calle/Número: </b> ${ rechazadodir[0].Street } ,<b>CP: </b> ${ rechazadodir[0].ZipCode } ,<b>Ciudad: </b> ${ rechazadodir[0].City } ,<b>País: </b> ${ rechazadodir[0].Country } </p>
                                          </a>
                                        </td>
                                    </tbody>
                                  </table>
      
                                  <table border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px; background-color: #008af0;" width="600" class="scale">
                                    <tbody>
                                      <tr>
                                        <td width="100%" align="center" valign="middle" style="vertical-align: middle;">
                                          <table cellpadding="0" cellspacing="0" border="0">
                                            <tbody>
                                              <tr>
                                                <td style="padding: 40px 0px 40px 0px;" class="contact-pad" align="center">
                                                  <table cellpadding="0" cellspacing="0" border="0">
                                                    <tbody>
                                                      <tr>
                                                        <td style="padding: 0px 7px 0px 0px;" align="center" width="27"><a style="text-decoration: none; color: #ffffff;" href="http://diasa.net/contacto/" target="_blank" rilt="ContactUs_Icon"><img style="display: inline;" src="https://1.bp.blogspot.com/-VoID1BgvhrY/YRGMjLGW24I/AAAAAAAAAbE/mWax9GkDfJsDgCObf6geHCCP5FbyftsZACLcBGAsYHQ/s20/telefono_Mesa%2Bde%2Btrabajo%2B1.png" width="20" height="20" alt="" border="0"></a>
                                                        </td>
                                                        <td style="font-family: 'RobotoBold', Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center;" class="contact-text" align="center"><a style="text-decoration: none; color: #ffffff;" href="http://diasa.net/contacto/" target="_blank" rilt="ContactUs_Text"> Llámanos al (81) 1253 3080 </a>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <br>
                                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; min-width: 600px; width: 600px;" width="600" class="scale">
                                    <tbody>
                                      <tr>
                                        <td style="padding:0 0 21px;">
                                          <table align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                            <tbody>
                                              <tr>
                                                <td class="active-i">
                                                  <a style="text-decoration:none;" href="https://www.facebook.com/DiasaAbrasivosyHerramientas" target="_blank">
                                                    <img src="https://image.flaticon.com/icons/png/512/174/174848.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="fb">
                                                  </a>
                                                </td>
                                                <td width="20"></td>
                                                <td class="active-i">
                                                  <a style="text-decoration:none;" href="https://wa.me/message/Z5RDIDIEZBJ2I1" target="_blank">
                                                    <img src="https://image.flaticon.com/icons/png/512/174/174879.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="ig">
                                                  </a>
                                                </td>
                                                <td width="20"></td>
                                                <td class="active-i">
                                                  <a style="text-decoration:none;" href="https://www.linkedin.com/company/diasaabrasivosyherramientas" target="_blank">
                                                    <img src="https://image.flaticon.com/icons/png/512/174/174857.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="tw">
                                                  </a>
                                                </td>
                                                <td width="20"></td>
                                                <td class="active-i">
                                                  <a style="text-decoration:none;" href="http://diasa.net/" target="_blank">
                                                    <img src="https://image.flaticon.com/icons/png/512/841/841364.png" width="30" style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;" alt="tw">
                                                  </a>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td valign="top">
                                          <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;" width="100%">
                                            <tbody>
                                              <tr>
                                                <td style="padding: 0px 20px 7px 20px; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #999999; text-align: center; line-height: 100%; mso-line-height-rule: exactly;">
      
                                                  <span class="footerLink">
      
                                                  © 2021. Todos los derechos reservados.</span>
      
                                                  <br>
                                                  <br>
                                                  <a href="http://diasa.net/" style="color:#999999; text-decoration: underline;" target="_blank">diasa.net</a>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>`;
  
        let dataMail = await EmailProcedure("getOrder");
  
        let bcc;
        if (dataMail[0].validateOrderBCC === 1){
          bcc = dataMail[0].orderBCC;
        }else{
          bcc="";
        }
        let subject = dataMail[0].orderSubject;
       //117 aqui
       //let sendMail = await helpers.sendEmail( mailToCliente,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );//ANTERIROR

       if(nMails !== ''){

        let sendMail = await helpers.sendEmail(mailToCliente+';'+nMails,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );
      }else{

        let sendMail = await helpers.sendEmail(mailToCliente,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );
      }

       
        response.json(responseModel);
      }else{
        if(creado.recordset[0].U_DocEntryDoc){
          await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'Y' WHERE U_DocEntry = ${DocEntry}`);
          await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'Y' WHERE U_WddCode = ${DocEntry}`);
        }
        if(creado.recordset[0].U_Status === 'N'){
          await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'N' WHERE U_DocEntry = ${DocEntry}`);
          await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'N' WHERE U_WddCode = ${DocEntry}`);
        }
        responseModel.message = "Este documento ya ha sido actualizado, se enviará a su sección correspondiente.";
        responseModel.status = 1;
        responseModel.data = {}  
        response.json(responseModel)
      }
    } catch (error) {
      logger.error('RECHAZAR AUTORIZACION: ', error)
    } 
}


export async function regresarAutorization(request: Request, response: Response) {
  const {DocEntry} = request.body;
  
  const db = new DatabaseService();
  
  const responseModel = new ResponseModel();
  try {
    let ordersResponse:any = '';
    let update1 = await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_OWDD] SET U_Status = 'W', Name = null WHERE U_DocEntry =${DocEntry}`);
    let update2 = await db.Query(`UPDATE [Handel_B2B].[dbo].[FMB_WDD1] SET U_Status = 'W' WHERE U_WddCode =${DocEntry}`); 
    logger.error("REGRESAR RECHAZADO=>", update1, update2)
          
    responseModel.message = "Se regreso correctamente.";
    responseModel.status = 1;
    responseModel.data = {}  
    response.json(responseModel)
    
  } catch (error) {
    logger.error('ERROR REGRESAR RECHAZADO=>', error);
    responseModel.message = "No se puede recuperar este documento";
    response.json(responseModel)
  } 
}