import {Request, Response} from "express";
import moment from 'moment';
import VentasClientes from '../interfaces/VentasClientes';
import {getShoppingCart} from "./ProfileController";
import ResponseModel from "../models/ResponseModel";
import OrdersModel from '../models/OrdersModel';
import OrdersProcedure from '../procedures/OrdersProcedure';
import ProductsModel from "../models/ProductsModel";
import ProductsProcedure from "../procedures/ProductsProcedure";
import {getTypeDocument} from '../interfaces/xml';
import {helpers} from '../middleware/helper';
import {logger} from "../util/logger";
import SeriesProcedure from "../procedures/SeriesProcedure";
import EmailProcedure from "../procedures/EmailProcedure";
import { ConsoleTransportOptions } from "winston/lib/winston/transports";
import AutorizacionesProcedure from "../procedures/AutorizacionesProcedure";
import { insertPoints } from "../controllers/PointsHistoryController";
import PointsHistoryModel from "../models/PointsHistoryModel";
import PointsHistoryProcedure from "../procedures/PointsHistoryProcedure";
import { DatabaseService } from "../util/database";
import {orderValidate} from '../middleware/Order';
import formidable from 'formidable';
const path = require('path');
// import { promises as fs } from 'fs-extra';
const fs = require('fs-extra')
import attachmentController from "./AttachmentController";

export async function createDocuments(request: Request, response: Response) {
    const {db_name, wareHouse, sapConfig, taxCode, currency, paymentMethod} = response.locals.business;
    const {profile_id} = response.locals.user;
    const {CardCode} = response.locals.user;
    const {U_FMB_Handel_Email} = response.locals.user;
    const {CardName} = response.locals.user;
    const {objType, address, bill, responseFlete, empID,creator, comment,insurance, itemsGift, fecha, discPrcnt,discPnt, Handel,IdPackge,PorCobrar,tipoEntrega,convenio, datos,fileName,numOrden,GroupNum, totalHandel,sellerMail,ordenCompraFile, orderDate, orderTime} = request.body;
    let serie;
    let maniobrasdos = insurance ? insurance : 0;
    // return;
    //Se define el nuemro de seríe
    await SeriesProcedure('getSerie').then(result => {
      serie = result[0].serieDefault;
    });
    // let numSerie = await SeriesProcedure("getSerieOrder");
    // serie = numSerie[0].Series;

    const db = new DatabaseService();

    // Definicion del valor del punto
    // let pointsModel: PointsHistoryModel = new PointsHistoryModel();
    // pointsModel.action = "pointsMoney";
    // let infoPointsMoneyResponse = await PointsHistoryProcedure(pointsModel);
    // let valueEquals = parseFloat(infoPointsMoneyResponse[0].Name) || 0;
    let valueEquals = 0; 

    // modelo de respuesta
    const responseModel = new ResponseModel();

    if(!address){
      logger.info("ADDRESS- !address: %o",address);
      responseModel.message = 'Ocurrió un error al seleccionar tu dirección de envío';
      response.json(responseModel);
      return;
    }
    if(!bill){
      logger.info("ADDRESS- !bill: %o",bill);
      responseModel.message = 'Ocurrió un error al seleccionar tu dirección de facturación';
      response.json(responseModel);
      return;
    }

    if(address.address === null || address.address === 'null' || address.address === undefined || address.address === 'undefined' || address.street === null || address.street === 'null' || address.street === undefined || address.street === 'undefined'){
      logger.info("ADDRESS- address: %o",address);
      logger.info("ADDRESS- req.body: %o",request.body)
      logger.info("ADDRESS- bill: %o",bill);
      responseModel.message = 'Ocurrió un error al seleccionar tu dirección de envío';
      response.json(responseModel);
      return;
    }

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
          addressKey = address.address;
          billKey = bill.address;
          
        }else{
            comments = `
            nombre: ${address.name}, email: ${address.email}, telefono: ${address.phone},
            calle: ${address.street}, colonia: ${address.block}, municipio: ${address.city},código postal: ${address.cp},
            estado: ${address.state}, pais: ${address.country},
            `;
        }

        let subTotal = 0;
        let taxTotal = 0;
        let total = 0;
        let tax = 0;
        //Variables para validacion del Flete
        let transport = 0;
        let taxTransport = 0;
        let limit = 0;
        let articulos: any = [];
        shoppingCart.data.shoppingCart.map((item:any) => {
            let totalPrice = Number(item.Price * item.quantity);
            subTotal += totalPrice;
            tax = item.taxRate;
            taxTotal += Number(item.taxSum * item.quantity);
            articulos.push({'ItemCode': item.ItemCode, 'quantity': parseInt(item.quantity)});
        });
        articulos = JSON.stringify(articulos);
        
        limit = parseInt(responseFlete.PurchaseLimit);
        transport = parseFloat(responseFlete.Price);
        taxTransport = Number(transport*(tax*0.01));
        //Validacion del flete
        if(subTotal < limit){
            taxTotal = taxTotal + taxTransport;
            total = subTotal + transport + taxTotal;
        }else{
            transport = 0;
            total = subTotal + transport + taxTotal;
        }

///////////////////////////////////////////////////////////////////////////////////////////////////
        let ModelAutorization : any;
        let IdAutorization : any;
        let NameAutorization : any;
        let borrador : any;
        let dataResult = {};
        var autorizaciones = new Array();

        let storedprocedure = {
          actions : 'ALL'
        }

        let resul = await AutorizacionesProcedure(storedprocedure);
        for (let index = 0; index < resul.length; index++) {
          const autorization = resul[index];
          //  --Saldo Fac y Lim Cr22 
          if(autorization.QueryId === 174){// DIASA 174 NOSOTRS 342
            let query342 = {
              actions : '174',
              param2 : cardCode
            }
            let res = await AutorizacionesProcedure(query342);
            borrador = res.length > 0 ? res[0] : [{ "'FALSE'": 'FALSE' }];
            borrador = Object.values(borrador);
            borrador = borrador[0];
            if(borrador === 'TRUE'){
              ModelAutorization = autorization.Name;
              IdAutorization = autorization.UserID;
              NameAutorization = autorization.U_NAME;
              // creditLimit = true;
            }
          }
          //  --Condición de pago Autorizacion
          if(autorization.QueryId === 464){// DIASA 464 NOSOTRS 340
            let query340 = {
              actions : '464',
              param2 : cardCode
            }
            let res = await AutorizacionesProcedure(query340);
            borrador = res.length > 0 ? res[0] : [{ "'FALSE'": 'FALSE' }];
            borrador = Object.values(borrador);
            borrador = borrador[0];
            if(borrador === 'TRUE'){
              ModelAutorization = autorization.Name;
              IdAutorization = autorization.UserID;
              NameAutorization = autorization.U_NAME;
              // creditLimit = true;
            }
          }
          if(borrador === 'TRUE'){
              dataResult = {
                  cond:true,
                  nameCond : ModelAutorization,
                  autoId : IdAutorization,
                  autoName : NameAutorization,
                  wtm : autorization.WtmCode,
                  wst : autorization.WstCode,
                  MaxReqr :autorization.MaxReqr,
                  MaxRejReqr : autorization.MaxRejReqr,
                  Correo : autorization.E_Mail
              }
              autorizaciones.push(dataResult);
          }              
      } 
      
///////////////////////////////////////////////////////////////////////////////////////////////////
        let doc = getTypeDocument(objType);

        // Buscando puntos 
        let model: ProductsModel = new ProductsModel();
        model.action = 'getPoints';
        model.cardCode = CardCode;
        model.business = db_name;

        let itemPoints = shoppingCart.data.shoppingCart;
        let totalPoints = 0;
        let activePointsNew = Number(discPnt);
        let activePointsNewCopy = activePointsNew;

        // Puntos por total de documento
        for (let i = 0; i < itemPoints.length; i++) {
          model.key = itemPoints[i].ItemCode;
          model.quantity = itemPoints[i].quantity;
          let points = await ProductsProcedure(model);
          if(points && points.length > 0){
            let queryPoints = Number(points[0].queryPoints).toFixed(0);
            itemPoints[i].itemPoint = Number(queryPoints);
            totalPoints += Number(queryPoints);
          }else{
            itemPoints[i].itemPoint = 0;
            totalPoints += 0;
          }
    
          let totalPrice = Number(itemPoints[i].Price) * Number(itemPoints[i].quantity);
          
          if(itemPoints[i].U_FMB_Handel_PNTA == 1){
            let valuePoints = Number(activePointsNew) * Number(valueEquals);
            if(valuePoints >= totalPrice){
                valuePoints = totalPrice;
            }
            totalPrice -= valuePoints;
            
            let discPrcntBack = totalPrice == 0 ? Number(99.99).toFixed(2) : Number(((valuePoints * 100)) / (Number(itemPoints[i].Price * Number(itemPoints[i].quantity)))).toFixed(2);
            itemPoints[i].discount = discPrcntBack === 'NaN' ? 0 : discPrcntBack;
            //Restar puntos
            activePointsNew -= valuePoints/valueEquals;
          }  
        }

        let transportWithoutTax = parseFloat(insurance); //Seguro con iva
        transportWithoutTax = Number(( transportWithoutTax - (transportWithoutTax * (itemPoints[0].taxRate/100)) ).toFixed(2));
        let insuranceObject = {
          ItemCode: 'MANIOBRAS II',
          quantity: '1',
          Price: transportWithoutTax
        }
        let esAutorizacion = autorizaciones.length > 0 ? true : false;
        let service = "DraftsService";//autorizaciones.length > 0 ? "DraftsService" : doc.service

        // let estado = autorizaciones.length > 0 ? "A" : 'C'
        // Eliminar puntos en caso de que se hayan usado
        let dataInsertMinus = 0; 
        if(Number(discPnt) != 0){
          dataInsertMinus = activePointsNewCopy - activePointsNew;
        }

        let data = {
          header: { dataInsertMinus, objType, service, cardCode, currency, docCurrency, addressKey, billKey
            , comments, comment, wareHouse, taxCode, serie, paymentMethod,empID,creator, totalPoints,discPrcnt,IdPackge
            , PorCobrar, tipoEntrega, convenio, insurance, datos,fileName ,numOrden, GroupNum,ordenCompraFile, orderDate, orderTime}, //estado
          items: itemPoints || [],
          itemsGift : itemsGift || [],
          responseFlete: responseFlete || [],
          address: address,
          bill: bill,
          insurance: insuranceObject,
          usRoute: true,
        };
        // return;

        const ventasClienteInterface = new VentasClientes(sapConfig);
        
        ventasClienteInterface.createXML(data);
        ventasClienteInterface.setOptions();
        let responseDiServer:any = await ventasClienteInterface.createCall();

        if(!responseDiServer.status){
            responseModel.message = responseDiServer.message;// 'Ocurrio un error al generar tu pedido. intentalo nuevamente (estado de la orden)';
            response.json(responseModel);
            return;
        }        

        let ordersModel: OrdersModel = new OrdersModel();

        ordersModel.action = 'findDocNum';
        ordersModel.business = db_name;
        ordersModel.docEntry = responseDiServer.docEntry || 0;
        ordersModel.table = "ODRF"; //autorizaciones.length > 0 ? "ODRF" : doc.table; // 

        let docNumResponse:any = []; 
        docNumResponse = await OrdersProcedure(ordersModel);

        if(!docNumResponse || !docNumResponse[0]){
            responseModel.message = 'Ocurrio un error al generar tu pedido. intentalo nuevamente (valida un numero)';
            response.json(responseModel);
            return;
        }

        // FALTA AGREGAR ESTO EN AUTORIZACIONES EN CASO DE QUE SE VAYA A BORRADORES
        if(ordersModel.table !== "ODRF"){
          // HAcer la incersion a la tabla de movimientos de punto
          // Resta de puntos utilizados
          if(Number(discPnt) != 0){
            let dataInsertDeleteUsedPoints = {
              DocEntry: responseDiServer.docEntry,
              DocType: 23,
              DocNum: docNumResponse[0].DocNum,
              CardCode: CardCode,
              Total: activePointsNewCopy - activePointsNew,
              Type: 'resta',
              UsedPoints: '1'
            }        
            let resultInsertDeleteUsedPoints = await insertPoints(dataInsertDeleteUsedPoints);
          }
          // if(Number(discPnt) != 0){
          //   let dataInsertMinus = {
          //     DocEntry: responseDiServer.docEntry,
          //     DocNum: docNumResponse[0].DocNum,
          //     CardCode: CardCode,
          //     Total: activePointsNewCopy - activePointsNew,
          //     Type: "resta",
          //   }
          //   let resultInsert = await insertPoints(dataInsertMinus); 
          // }

          // NO se debe agregar a tabla porque aun no es Factura
          // if(totalPoints != 0){
          //   let dataInsert = {
          //     DocEntry: responseDiServer.docEntry,
          //     DocNum: docNumResponse[0].DocNum,
          //     CardCode: CardCode,
          //     Total: totalPoints,
          //     Type: "suma",
          //   }
        
          //   let resultInsert = await insertPoints(dataInsert);  
          // }
        }

        if(!esAutorizacion){
          data.header.service = doc.service;
          
          // SAP MENOS HANDEL
          let Diferencia = docNumResponse[0].DocTotal - totalHandel;
          // Si sale negativo lo hacemos positivo * -1
          // Diferencia = Diferencia < 0 ? Diferencia * -1 : Diferencia;
          let porcentajeDescuento = (Diferencia * 100) / docNumResponse[0].DocTotal;
          let esDescuento = 'DocNum: '+docNumResponse[0].DocNum+' DocTotal: '+ docNumResponse[0].DocTotal+ ' totalHandel: '+totalHandel+ ' Descuento:' +porcentajeDescuento;
          logger.info("esAutorizacion: %o",esDescuento)
          porcentajeDescuento = porcentajeDescuento >= 20 ? 0 : porcentajeDescuento;
          data.header.discPrcnt = 0; // Number(porcentajeDescuento).toFixed(6);
          
          const ventasClienteInterface = new VentasClientes(sapConfig);
          // return;
          ventasClienteInterface.createXML(data);
          ventasClienteInterface.setOptions();
          let responseDiServer:any = await ventasClienteInterface.createCall();

          if(!responseDiServer.status){
              responseModel.message = responseDiServer.message;// 'Ocurrio un error al generar tu pedido. intentalo nuevamente (estado de la orden)';
              response.json(responseModel);
              return;
          }

          let ordersModel: OrdersModel = new OrdersModel();

          ordersModel.action = 'findDocNum';
          ordersModel.business = db_name;
          ordersModel.docEntry = responseDiServer.docEntry || 0;
          ordersModel.table = autorizaciones.length > 0 ? "ODRF" : doc.table;

          docNumResponse = await OrdersProcedure(ordersModel);
          
          if(!docNumResponse || !docNumResponse[0]){
              responseModel.message = 'Ocurrio un error al generar tu pedido. intentalo nuevamente (valida un numero)';
              response.json(responseModel);
              return;
          }
        }
        let isDraft = ordersModel.docEntry;
        let hoy = new Date();
        let today = moment(hoy).format('YYYYMMDD');
        var Hora = hoy.getHours();
        var Min = hoy.getMinutes();
        let CorreoAutorizadores = '';
        let file: any[] = [];
       
        for (let index = 0; index < autorizaciones.length; index++) {
          const datos = autorizaciones[index];
          CorreoAutorizadores += datos.Correo+",";
          try {
            let wtmCode = file.indexOf(datos.wtm);
            if(wtmCode == -1){
              file.push(datos.wtm);
              let respon = await db.Query(`INSERT INTO [Handel_B2B].[dbo].[FMB_OWDD] 
              (U_WtmCode,U_OwnerID,U_DocEntry,U_ObjType,CartShop,U_DocDate,U_CurrStep,U_Status,U_Remarks,U_UserSign,U_CreateDate,U_CreateTime,U_IsDraft,U_MaxReqr,U_MaxRejReqr) 
              VALUES (${datos.wtm},${datos.autoId},${isDraft},'17','${articulos}','${today}',${datos.wst},'W','${datos.nameCond}','1','${today}',${Hora+''+Min},'Y',${datos.MaxReqr},${datos.MaxRejReqr})`);   
            }
            await db.Query(`INSERT INTO [Handel_B2B].[dbo].[FMB_WDD1] 
                (U_WddCode,U_StepCode,U_UserID,U_Status,U_Remarks,U_UserSign,U_CreateDate,U_CreateTime,U_UpdateDate,U_UpdateTime)
                VALUES (${isDraft},${datos.wst},${datos.autoId},'W','${datos.nameCond}','1','${today}',${Hora+''+Min},NULL,NULL)`);  
          }                      
          catch (e) {
            logger.error("Autorizacion-> Insert FMB_OWDD: ", e); 
          }   
        }

        let Subtotal = 0;
        let Total = 0; 
        // let tax = 0;
        let totalpesoNeto = 0;
        let tipoVta= '';
        let des = '';
      
         let DocEntry = des === 'Drafts' ? docNumResponse[0].DocNum+'-'+ docNumResponse[0].DocEntry :  docNumResponse[0].DocNum;
      
         let titulo1 = tipoVta === '02' ? 'Pedido no. '+DocEntry+' (Transferencia gratuita).' : 'Pedido no. '+DocEntry;
         let titulo2 = tipoVta === '02' ? 'Pedido no. '+DocEntry+' (Transferencia gratuita en proceso de autorización).' : 'Pedido no. '+DocEntry+'(En proceso de autorización).';
         let titulo = des === 'Drafts' ? titulo2 : titulo1;

        let body: any;
        body = '';
        // data.items.map((item: any) =>{
        //   item.Discount = parseInt(item.Discount);
        //   if (isNaN(item.Discount)) {
        //     item.Discount = 0;
        //   }
        //   let Preciototal = Number(item.priceTax * item.quantity - (item.priceTax * item.quantity * (item.Discount / 100)));
        //   tax = item.taxRate;
        //   Subtotal += Preciototal;
        //   totalpesoNeto += Number(item.weight * item.quantity);
        //     body += `
        //     <tr>
        //       <td>${item.ItemCode}</td>
        //       <td>${item.ItemName}</td>
        //       <td style="text-align: center;" >${item.quantity}</td>
        //       <td>$ ${parseFloat(item.Price).toFixed(2)}</td>              
        //       <td>$ ${Number(Preciototal).toFixed(2)}</td>
        //       <td style="text-align: right;">${Number(item.weight * item.quantity).toFixed(2)} KG</td>`;
        //     //return body;
        //   });
        // body += '</tr>'
        data.items.map((item: any) =>{
          item.Discount = parseInt(item.Discount);
          if (isNaN(item.Discount)) {
            item.Discount = 0;
          }
          let Preciototal = Number(item.priceTax * item.quantity - (item.priceTax * item.quantity * (item.Discount / 100)));
          tax = item.taxRate;
          Subtotal += tipoVta === '02' ? 0 : Preciototal;
          totalpesoNeto += Number(item.weight * item.quantity);
            body += `
            <tr>
              <td>${item.ItemCode}</td>
              <td>${item.ItemName}</td>
              <td style="text-align: center;" >${item.quantity}</td>
              <td>$ ${parseFloat(item.Price).toFixed(2)}</td>              
              <td>$ ${Number(Preciototal).toFixed(2)}</td>`;
            return body;
          });
          // if(Object.keys(responseFlete).length > 0){
          //   body += `
          //   <tr>
          //     <td>${responseFlete.ItemCode}</td>
          //     <td>${responseFlete.ItemName}</td>
          //     <td style="text-align: center;" >1</td>
          //     <td>$ ${parseFloat(responseFlete.Price).toFixed(2)}</td>              
          //     <td>$ ${Number(responseFlete.Price).toFixed(2)}</td>`;
          // }
          // if(insuranceObject){
          //   body += `
          //   <tr>
          //     <td>${insuranceObject.ItemCode}</td>
          //     <td>${insuranceObject.ItemCode}</td>
          //     <td style="text-align: center;" >1</td>
          //     <td>$ ${parseFloat(maniobrasdos).toFixed(2)}</td>              
          //     <td>$ ${Number(maniobrasdos).toFixed(2)}</td>`;
          // }
        // let maniobras = Object.keys(responseFlete).length > 0 ? responseFlete.Price : 0;

        // Subtotal = Subtotal + maniobras;
        // Subtotal = Subtotal + maniobrasdos;
        body += '</tr>'
        let Igv = tipoVta === '02' ? 0 : tax * Subtotal / 100;
        Total = tipoVta === '02' ? 0 : Subtotal + Igv;
        let borr = 'Tu pedido de número ' +docNumResponse[0].DocNum+'-'+isDraft+ ' está en proceso de autorización debido a un saldo pendiente, favor de contactar al gestor de cobranza.';
        let order = 'El pedido '+docNumResponse[0].DocNum + ' fue realizado con éxito.';
        let respuesta = autorizaciones.length > 0 ? borr : order; //  

        let mensaje = "Te informamos que tu Pedido se encuentra en proceso.";
        responseModel.message = 'orden creada';
        responseModel.status = 1;
        responseModel.data = {docNum: respuesta};
        let orderMail = docNumResponse[0].DocNum;

        let infoEmail =  {
          orderMail: respuesta,
          nameMail: nameMail,
          mensaje:mensaje,
          body: body,
          Subtotal:Subtotal,
          totalpesoNeto: totalpesoNeto,
          address: address || ''
        }

        let msghtml = contextEmailDaysPlus(infoEmail);
        // Validacion de tipo de credito
        
      // HAcer la incersion a la tabla de movimientos de punto
          
        let dataMail = await EmailProcedure("getOrder");

        let DatosVendedor = {
          actions : 'CorreoVendedor',
          param1 : CardCode
      }
      let CorreoVendedor = await AutorizacionesProcedure(DatosVendedor);
        let Vendedor = CardCode === 'C2029' ? sellerMail : CorreoVendedor[0].Mail;
        let bcc;
        if (dataMail[0].validateOrderBCC === 1){
          bcc = dataMail[0].orderBCC;
        }else{
          bcc="";
        }
        let subject = dataMail[0].orderSubject;
        let DATOS = {
          actions : 'DATOS',
          param1 : CardCode,
        }
        let CorreoCliente = await AutorizacionesProcedure(DATOS)
        let nMails = CorreoCliente[0].U_FMB_Handel_nMails || CorreoCliente[0].U_FMB_Handel_nMails != null ? CorreoCliente[0].U_FMB_Handel_nMails : '';
        
        // let sendMail = await helpers.sendEmail( mailToCliente,CorreoAutorizadores+Vendedor,bcc,subject,msghtml,null );
        if(nMails !== ''){
          let sendMail = await helpers.sendEmail(mailToCliente+';'+nMails,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );
        }else{
          let sendMail = await helpers.sendEmail(mailToCliente,CorreoAutorizadores+Vendedor,"",subject,msghtml,null );
        }
      
        response.json(responseModel);
}


export async function sendEmail(request: Request, response: Response) {
  const {db_name, wareHouse, sapConfig, taxCode, currency, paymentMethod} = response.locals.business;
  const {profile_id} = response.locals.user;
  const {CardCode} = response.locals.user;
  const {U_FMB_Handel_Email} = response.locals.user;
  const {CardName} = response.locals.user;
  const {objType, address, bill, responseFlete, empID,creator, comment,insurance, itemsGift, fecha, discPrcnt,discPnt, Handel,IdPackge,PorCobrar,tipoEntrega,convenio, datos,fileName,numOrden,GroupNum, totalHandel,sellerMail,ordenCompraFile} = request.body;
  let serie;
  let maniobrasdos = insurance ? insurance : 0;
  // return;
  //Se define el nuemro de seríe
  await SeriesProcedure('getSerie').then(result => {
    serie = result[0].serieDefault;
  });
  // let numSerie = await SeriesProcedure("getSerieOrder");
  // serie = numSerie[0].Series;

  const db = new DatabaseService();

  // Definicion del valor del punto
  // let pointsModel: PointsHistoryModel = new PointsHistoryModel();
  // pointsModel.action = "pointsMoney";
  // let infoPointsMoneyResponse = await PointsHistoryProcedure(pointsModel);
  // let valueEquals = parseFloat(infoPointsMoneyResponse[0].Name) || 0;
  let valueEquals = 0; 

  // modelo de respuesta
  const responseModel = new ResponseModel();

  if(!address){
    logger.info("ADDRESS- !address: %o",address);
    responseModel.message = 'Ocurrió un error al seleccionar tu dirección de envío';
    response.json(responseModel);
    return;
  }
  if(!bill){
    logger.info("ADDRESS- !bill: %o",bill);
    responseModel.message = 'Ocurrió un error al seleccionar tu dirección de facturación';
    response.json(responseModel);
    return;
  }

  if(address.address === null || address.address === 'null' || address.address === undefined || address.address === 'undefined' || address.street === null || address.street === 'null' || address.street === undefined || address.street === 'undefined'){
    logger.info("ADDRESS- address: %o",address);
    logger.info("ADDRESS- req.body: %o",request.body)
    logger.info("ADDRESS- bill: %o",bill);
    responseModel.message = 'Ocurrió un error al seleccionar tu dirección de envío';
    response.json(responseModel);
    return;
  }

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

      let subTotal = 0;
      let taxTotal = 0;
      let total = 0;
      let tax = 0;
      //Variables para validacion del Flete
      let transport = 0;
      let taxTransport = 0;
      let limit = 0;
      let articulos: any = [];
      shoppingCart.data.shoppingCart.map((item:any) => {
          let totalPrice = Number(item.Price * item.quantity);
          subTotal += totalPrice;
          tax = item.taxRate;
          taxTotal += Number(item.taxSum * item.quantity);
          articulos.push({'ItemCode': item.ItemCode, 'quantity': parseInt(item.quantity)});
      });
      articulos = JSON.stringify(articulos);
      
      limit = parseInt(responseFlete.PurchaseLimit);
      transport = parseFloat(responseFlete.Price);
      taxTransport = Number(transport*(tax*0.01));
      //Validacion del flete
      if(subTotal < limit){
          taxTotal = taxTotal + taxTransport;
          total = subTotal + transport + taxTotal;
      }else{
          transport = 0;
          total = subTotal + transport + taxTotal;
      }

      let ModelAutorization : any;
      let IdAutorization : any;
      let NameAutorization : any;
      let borrador : any;
      let dataResult = {};
      var autorizaciones = new Array();

      let storedprocedure = {
        actions : 'ALL'
      }

      let resul = await AutorizacionesProcedure(storedprocedure);
      for (let index = 0; index < resul.length; index++) {
        const autorization = resul[index];
        //  --Saldo Fac y Lim Cr22 
        if(autorization.QueryId === 174){// DIASA 174 NOSOTRS 342
          let query342 = {
            actions : '174',
            param2 : cardCode
          }
          let res = await AutorizacionesProcedure(query342);
          borrador = res.length > 0 ? res[0] : [{ "'FALSE'": 'FALSE' }];
          borrador = Object.values(borrador);
          borrador = borrador[0];
          if(borrador === 'TRUE'){
            ModelAutorization = autorization.Name;
            IdAutorization = autorization.UserID;
            NameAutorization = autorization.U_NAME;
            // creditLimit = true;
          }
        }
        //  --Condición de pago Autorizacion
        if(autorization.QueryId === 464){// DIASA 464 NOSOTRS 340
          let query340 = {
            actions : '464',
            param2 : cardCode
          }
          let res = await AutorizacionesProcedure(query340);
          borrador = res.length > 0 ? res[0] : [{ "'FALSE'": 'FALSE' }];
          borrador = Object.values(borrador);
          borrador = borrador[0];
          if(borrador === 'TRUE'){
            ModelAutorization = autorization.Name;
            IdAutorization = autorization.UserID;
            NameAutorization = autorization.U_NAME;
            // creditLimit = true;
          }
        }
        if(borrador === 'TRUE'){
            dataResult = {
                cond:true,
                nameCond : ModelAutorization,
                autoId : IdAutorization,
                autoName : NameAutorization,
                wtm : autorization.WtmCode,
                wst : autorization.WstCode,
                MaxReqr :autorization.MaxReqr,
                MaxRejReqr : autorization.MaxRejReqr,
                Correo : autorization.E_Mail
            }
            autorizaciones.push(dataResult);
        }              
    } 
      let doc = getTypeDocument(objType);

      // Buscando puntos 
      let model: ProductsModel = new ProductsModel();
      model.action = 'getPoints';
      model.cardCode = CardCode;
      model.business = db_name;

      let itemPoints = shoppingCart.data.shoppingCart;
      let totalPoints = 0;
      let activePointsNew = Number(discPnt);
      let activePointsNewCopy = activePointsNew;

      // Puntos por total de documento
      for (let i = 0; i < itemPoints.length; i++) {
        model.key = itemPoints[i].ItemCode;
        model.quantity = itemPoints[i].quantity;
        let points = await ProductsProcedure(model);
        if(points && points.length > 0){
          let queryPoints = Number(points[0].queryPoints).toFixed(0);
          itemPoints[i].itemPoint = Number(queryPoints);
          totalPoints += Number(queryPoints);
        }else{
          itemPoints[i].itemPoint = 0;
          totalPoints += 0;
        }
  
        let totalPrice = Number(itemPoints[i].Price) * Number(itemPoints[i].quantity);
        
        if(itemPoints[i].U_FMB_Handel_PNTA == 1){
          let valuePoints = Number(activePointsNew) * Number(valueEquals);
          if(valuePoints >= totalPrice){
              valuePoints = totalPrice;
          }
          totalPrice -= valuePoints;
          
          let discPrcntBack = totalPrice == 0 ? Number(99.99).toFixed(2) : Number(((valuePoints * 100)) / (Number(itemPoints[i].Price * Number(itemPoints[i].quantity)))).toFixed(2);
          itemPoints[i].discount = discPrcntBack === 'NaN' ? 0 : discPrcntBack;
          //Restar puntos
          activePointsNew -= valuePoints/valueEquals;
        }  
      }

      let transportWithoutTax = parseFloat(insurance); //Seguro con iva
      transportWithoutTax = Number(( transportWithoutTax - (transportWithoutTax * (itemPoints[0].taxRate/100)) ).toFixed(2));
      let insuranceObject = {
        ItemCode: 'MANIOBRAS II',
        quantity: '1',
        Price: transportWithoutTax
      }
      let esAutorizacion =  false;
      let service = "DraftsService";//autorizaciones.length > 0 ? "DraftsService" : doc.service

      // let estado = autorizaciones.length > 0 ? "A" : 'C'
      // Eliminar puntos en caso de que se hayan usado
      let dataInsertMinus = 0; 
      if(Number(discPnt) != 0){
        dataInsertMinus = activePointsNewCopy - activePointsNew;
      }

      let data = {
        header: { dataInsertMinus, objType, service, cardCode, currency, docCurrency, addressKey, billKey
          , comments, comment, wareHouse, taxCode, serie, paymentMethod,empID,creator, totalPoints,discPrcnt,IdPackge
          , PorCobrar, tipoEntrega, convenio, insurance, datos,fileName ,numOrden, GroupNum,ordenCompraFile}, //estado
        items: itemPoints || [],
        itemsGift : itemsGift || [],
        responseFlete: responseFlete || [],
        address: address,
        bill: bill,
        insurance: insuranceObject,
        usRoute: true,
      };
      // return;

      const ventasClienteInterface = new VentasClientes(sapConfig);
      
      // ventasClienteInterface.createXML(data);
      // ventasClienteInterface.setOptions();
      // let responseDiServer:any = await ventasClienteInterface.createCall();
      let responseDiServer:any = {
        status: 1
      }
      if(!responseDiServer.status){
          responseModel.message = responseDiServer.message;// 'Ocurrio un error al generar tu pedido. intentalo nuevamente (estado de la orden)';
          response.json(responseModel);
          return;
      }        

     

      if(!esAutorizacion){
          data.header.service = doc.service;
          
          // SAP MENOS HANDEL
        
          
        
        
        let isDraft = '1515';
        let hoy = new Date();
        let today = moment(hoy).format('YYYYMMDD');
        var Hora = hoy.getHours();
        var Min = hoy.getMinutes();
        let CorreoAutorizadores = '';
        let file: any[] = [];
      
        

        let Subtotal = 0;
        let Total = 0; 
        // let tax = 0;
        let totalpesoNeto = 0;
        let tipoVta= '';
        let des = '';
      
        let DocEntry = des === 'Drafts' ? '1515':  '2020';
      
        let titulo1 = tipoVta === '02' ? 'Pedido no. '+DocEntry+' (Transferencia gratuita).' : 'Pedido no. '+DocEntry;
        let titulo2 = tipoVta === '02' ? 'Pedido no. '+DocEntry+' (Transferencia gratuita en proceso de autorización).' : 'Pedido no. '+DocEntry+'(En proceso de autorización).';
        let titulo = des === 'Drafts' ? titulo2 : titulo1;

        let body: any;
        body = '';
        data.items.map((item: any) =>{
          item.Discount = parseInt(item.Discount);
          if (isNaN(item.Discount)) {
            item.Discount = 0;
          }
          let Preciototal = Number(item.priceTax * item.quantity - (item.priceTax * item.quantity * (item.Discount / 100)));
          tax = item.taxRate;
          Subtotal += tipoVta === '02' ? 0 : Preciototal;
          totalpesoNeto += Number(item.weight * item.quantity);
            body += `
            <tr>
              <td>${item.ItemCode}</td>
              <td>${item.ItemName}</td>
              <td style="text-align: center;" >${item.quantity}</td>
              <td>$ ${parseFloat(item.Price).toFixed(2)}</td>              
              <td>$ ${Number(Preciototal).toFixed(2)}</td>`;
            return body;
          });
        body += '</tr>'
        let Igv = tipoVta === '02' ? 0 : tax * Subtotal / 100;
        Total = tipoVta === '02' ? 0 : Subtotal + Igv;
        let borr = 'Tu pedido de número 1515' + ' está en proceso de autorización debido a un saldo pendiente, favor de contactar al gestor de cobranza.';
        let order = 'El pedido 2020 fue realizado con éxito.';
        let respuesta =  order; //  

        let mensaje = "Te informamos que tu Pedido se encuentra en proceso.";
        responseModel.message = 'orden creada';
        responseModel.status = 1;
        responseModel.data = {docNum: respuesta};

        let infoEmail =  {
          orderMail: respuesta,
          nameMail: nameMail,
          mensaje:mensaje,
          body: body,
          Subtotal:Subtotal,
          totalpesoNeto: totalpesoNeto,
          address: address || ''
        }

        let msghtml = contextEmailDaysPlus(infoEmail);
      
        let sendMail = await helpers.sendEmail('desarrollo5@fmbsolutions.mx','desarrollo5@fmbsolutions.mx',"",'',msghtml,null );
      
        response.json(responseModel);
      }
}
export async function getOneOrder(request: Request, response: Response) {
  const {db_name, localLanguage} = response.locals.business;
  const {profile_id} = response.locals.user;
  const {CardCode} = response.locals.user;
  const {docNum} = request.params;

  const responseModel = new ResponseModel();
  if(!profile_id){
      responseModel.message = "no tienes permiso de realizar esta acción";
      responseModel.data = [];
  }

  try {
      let ordersModel: OrdersModel = new OrdersModel();
      let doc = getTypeDocument('17');

      ordersModel.action = 'getOneOrder';
      ordersModel.business = db_name;
      ordersModel.table = doc.table;
      ordersModel.docEntry = docNum;
      // ordersModel.docNum = docNum;
      let responseOne = await OrdersProcedure(ordersModel);
      
      responseOne.map( (order:any) => {
          order.localLanguage = localLanguage;
         if(order.DocCur === 'MXP'){
             order.DocCur = 'MXN';
         }
         //Ajuste de fecha con minutos y zona horaria
         let date = new Date(order.TaxDate);
         date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
         order.TaxDate = moment(new Date(date)).format('YYYYMMDD'); 
      });

      responseModel.message = "Pedido encontrado";
      responseModel.status = 1;
      responseModel.data = responseOne || [];
      response.json(responseModel);
  }catch (e) {
    logger.error(e);
      responseModel.message = "ocurrio un error al traer el pedido solicitado";
      responseModel.data =  [];
      response.json(responseModel);
  }
  
}

export async function SaveFileOV(request: Request, response: Response) {
  const {sapConfig} = response.locals.business;
  const responseModel = new ResponseModel();
  var form = new formidable.IncomingForm();
  let GlobalSap = JSON.parse(global.sap_config);
  try {
    form.parse(request, async function (err: any, fields: any, files: any) {
      if(!err) {
        
        // let cv = files.file.name;
        // let lastName;
        // let ext = cv.lastIndexOf(".");
        // let validateExt = cv.substring(ext, cv.length);
        
        // let fileName = moment().format("YYYY-MM-DD_HH-mm").toString() + "_OC_" + files.file.name;
        // fileNameMail = files.file.name;
        let route = GlobalSap[0].rutaATC;
        let fullRouteName = route + files.archivo.name;
        await fs.move(files.archivo.path, fullRouteName)
        .then(async () => {
          let newFiles = {
            pdfName: files.archivo.name ,
          };
          let updateAttachmentResponse: any = await attachmentController.update(newFiles,sapConfig);
          responseModel.message = 'orden creada';
          responseModel.status = 1;
          response.json(responseModel)
        })
        .catch((err:any) => {
          responseModel.message = 'Error al cargar el documento, el nombre de este documento ya fue registrado';
          responseModel.status = 0;
          response.json(responseModel)
        })
        
       
      }else{
        responseModel.message = 'Error al cargar el documento';
        responseModel.status = 0;
        response.json(responseModel)
      }

    });
    
  } catch (error) {
    logger.error("SaveFileOV->>"+error);
    responseModel.message = 'Error al cargar el documento';
    responseModel.status = 0;
    response.json(responseModel)
  }
}

export async function orders(request: Request, response: Response) {
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
        let ordersModel: OrdersModel = new OrdersModel();
        let doc = getTypeDocument('17');
        //Fecha condicional desde donde aparecen los pedidos
        // let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
        // let finalDate = moment(new Date()).format('YYYYMMDD');

        ordersModel.action = 'getOrders';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.initialDate = fechaInicio;
        ordersModel.finalDate = fechaFinal;
        let responseList = await OrdersProcedure(ordersModel);
        
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

        responseModel.message = "lista de pedidos";
        responseModel.status = 1;
        responseModel.data = responseList || [];
        response.json(responseModel);
    }catch (e) {
      logger.error(e);
        responseModel.message = "ocurrio un error al traer la lista de pedidos";
        responseModel.data =  [];
        response.json(responseModel);
    }
}
export async function getGeneralOrdersView(request: Request, response: Response) {
  const {db_name, localLanguage} = response.locals.business;
  const {profile_id} = response.locals.user;
  const { fechaInicio, fechaFinal, slpCode } = request.params;
  const responseModel = new ResponseModel();
  if(!profile_id){
      responseModel.message = "no tienes permiso de realizar esta acción";
      responseModel.data = [];
  }

  try {
      let ordersModel: OrdersModel = new OrdersModel();
      let doc = getTypeDocument('17');

      ordersModel.action = 'getGeneralOrders';
      ordersModel.business = db_name;
      ordersModel.table = doc.table;
      ordersModel.cardCode = slpCode;
      ordersModel.initialDate = fechaInicio;
      ordersModel.finalDate = fechaFinal;
      let responseList = await OrdersProcedure(ordersModel);
      
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
      

      responseModel.message = "lista general de pedidos";
      responseModel.status = 1;
      responseModel.data = responseList || [];
      response.json(responseModel);
  }catch (e) {
    logger.error(e);
      responseModel.message = "ocurrio un error al traer la lista general de pedidos";
      responseModel.data =  [];
      response.json(responseModel);
  }
}

export async function ordersSeller(request: Request, response: Response) {
  const {db_name, localLanguage} = response.locals.business;
  const {profile_id} = response.locals.user;
  const {CardCode} = response.locals.user;
  const {salesPrson} = request.body;

  const responseModel = new ResponseModel();
  if(!profile_id){
      responseModel.message = "no tienes permiso de realizar esta acción";
      responseModel.data = [];
  }

  try {
      let ordersModel: OrdersModel = new OrdersModel();
      let doc = getTypeDocument('17');
      //Fecha condicional desde donde aparecen los pedidos
      let initialDate = moment(new Date(2020,1,1)).format('YYYYMMDD');
      let finalDate = moment(new Date()).format('YYYYMMDD');

      ordersModel.action = 'getOrdersSeller';
      ordersModel.business = db_name;
      ordersModel.table = doc.table;
      ordersModel.cardCode = salesPrson;
      ordersModel.initialDate = initialDate;
      ordersModel.finalDate = finalDate;
      let responseList = await OrdersProcedure(ordersModel);


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

      responseModel.message = "lista de pedidos";
      responseModel.status = 1;
      responseModel.data = responseList || [];
      response.json(responseModel);
  }catch (e) {
    logger.error(e);
      responseModel.message = "ocurrio un error al traer la lista de pedidos";
      responseModel.data =  [];
      response.json(responseModel);
  }
}

export async function order(request: Request, response: Response) {
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
        let ordersModel: OrdersModel = new OrdersModel();
        let doc = getTypeDocument('17');

        ordersModel.action = 'getOrderHeader';
        ordersModel.business = db_name;
        ordersModel.table = doc.table;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = docEntry;
        let responseHeader = await OrdersProcedure(ordersModel);

        responseHeader = responseHeader[0] || {};
        if(responseHeader.DocCur === 'MXP'){
            responseHeader.DocCur = 'MXN';
        }

        ordersModel.action = 'getOrderBody';
        ordersModel.business = db_name;
        ordersModel.table = doc.subTable;
        ordersModel.cardCode = CardCode;
        ordersModel.docEntry = docEntry;
        let responseBody = await OrdersProcedure(ordersModel);
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

export async function dataProfile(request: Request, response: Response) {
  const { db_name } = response.locals.business;
  const { docEntry } = request.params;
  const {CardCode, profile_id} = response.locals.user;  

  const responseModel = new ResponseModel();

  if(!profile_id || !docEntry){
      responseModel.message = "no tienes permiso de realizar esta acción";
      responseModel.data = [];
  }

  try {
      let ordersModel: OrdersModel = new OrdersModel();
      let doc = getTypeDocument('17');
      let args = " '" + CardCode + "'";
      ordersModel.action = 'getDataProfile';
      ordersModel.business = db_name;
      ordersModel.table = doc.subTable;
      ordersModel.cardCode = args;
      ordersModel.docEntry = docEntry;
      let responseBody = await OrdersProcedure(ordersModel);    
      
      responseModel.message = "información del pedido";
      responseModel.status = 1;
      responseModel.data = { body: responseBody};
      response.json(responseModel);
  }catch (e) {
    logger.error(e);
    responseModel.message = "ocurrio un error al traer la información del pedido";
    responseModel.data =  [];
    response.json(responseModel);
  }
}

export async function dataProfileCode(request: Request, response: Response) {
  const { db_name } = response.locals.business;
  const { docEntry,CardCode } = request.params;
  const { profile_id} = response.locals.user;  

  const responseModel = new ResponseModel();

  if(!profile_id || !docEntry){
      responseModel.message = "no tienes permiso de realizar esta acción";
      responseModel.data = [];
  }

  try {
    // console.log('Code --------------------------------',CardCode)
      let ordersModel: OrdersModel = new OrdersModel();
      let doc = getTypeDocument('17');

      ordersModel.action = 'getDistData';
      ordersModel.business = db_name;
      ordersModel.table = doc.subTable;
      ordersModel.cardCode = CardCode;
      ordersModel.docEntry = docEntry;
      let responseBody = await OrdersProcedure(ordersModel);

      responseModel.message = "información del pedido";
      responseModel.status = 1;
      responseModel.data = { body: responseBody};
      response.json(responseModel);
  }catch (e) {
    logger.error(e);
    responseModel.message = "ocurrio un error al traer la información del pedido";
    responseModel.data =  [];
    response.json(responseModel);
  }
}

function contextEmailDaysPlus(data: any){  
  let msghtml =  `<html>
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
                                <td style="font-family: 'RobotoBold', Tahoma, Arial; color: #444444; font-size: 12px; font-weight: 700; line-height: 45px; mso-line-height-rule: exactly; text-align: center; padding: 35px 10px 10px 10px;" align="center" class="headline">
                                  <a style="text-decoration: none; color: #444444;">${data.orderMail}</a>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: Arial; color: #000000; font-size: 13px; line-height: 17px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 30px 20px;" align="center" class="copy">
                                    <a style="color: #000000; text-decoration: none;">Estimado ${data.nameMail},</a>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: Arial; color: #000000; font-size: 12px; line-height: 19px; mso-line-height-rule: exactly; text-align: justify; padding: 0px 20px 0px 20px;" align="center" class="copy">
                                    <a style="color: #000000; text-decoration: none;" ><p>${data.mensaje}</p>
                                      <p>Si tienes alguna duda puedes contactarnos al teléfono <a style="color: #045bab;"><u> (81) 1253 3080</u></a> o escríbenos al correo <a style="color: #045bab;"><u>ventas@diasa.net</u></a>, donde con gusto te atenderemos.</p>
                                    </a>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: Arial; color: #000000; font-size: 12px; line-height: 20px; font-weight:bold; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 0px 20px;" align="center" class="copy">
                                    <a style="color: #000000; text-decoration: none;"> Detalle del pedido.</a>
                                  </td>
                                </tr> 
                              </tbody>
                            </table>
                            <br>
                            <div style="padding: 0px 20px 0px 20px;">
                              <table align="center" border="0" cellpadding="0" cellspacing="0" style="min-width: 600px; width: 600px;" width="600" class="scale">
                                <tr style="background-color: black; color: white">
                                  <th>ARTÍCULO</th>
                                  <th>DESCRIPCIÓN</th>
                                  <th>CANTIDAD</th>
                                  <th>PRECIO</th>
                                  <th>TOTAL</th>
                                </tr>        
                                ${data.body}
                                <tr>
                                  <td colspan="6" style="text-align: right;"></td>
                                </tr>               
                                <tr>
                                  <td colspan="4" style="text-align: right; color: white;">Total:</td>
                                  <th style="text-align: left; background-color: black; color: white" >$ ${Number(data.Subtotal).toFixed(2)}</th>
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
                                      <p><b>Dirección: </b> ${ data.address.address } ,<b>Calle/Número: </b> ${ data.address.street } ,<b>CP: </b> ${ data.address.cp } ,<b>Ciudad: </b> ${ data.address.city } ,<b>País: </b> ${ data.address.country} </p>
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
  return msghtml;
}