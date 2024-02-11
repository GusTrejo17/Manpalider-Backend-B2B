import { Request, Response } from "express";
import UsersModel from "../models/UsersModel";
import UsersProcedure from "../procedures/UsersProcedure";
import createToken from "../commands/JWT";
import ResponseModel from "../models/ResponseModel";
import { Addresses, BusinessPartner } from "../models/SapModel";
import { getProfile, createProfile } from "./ProfileController";
import BusinessPartners from "../interfaces/BusinessPartners";
import axios from "axios";
import convert from "xml-js";
import path from "path";
import { logger } from "../util/logger";
import moment from 'moment';
import ProfileModel from "../models/ProfileModel";
import ProfileProcedure from "../procedures/ProfileProcedure";
import OptionsController from "../procedures/PayMethoProcedure";
import EmailProcedure from "../procedures/EmailProcedure";
import { helpers } from '../middleware/helper';
import PointsHistoryModel from "../models/PointsHistoryModel";
import PointsHistoryProcedure from "../procedures/PointsHistoryProcedure";
import { infoPoints } from "../controllers/PointsHistoryController";
import { ConsoleTransportOptions } from "winston/lib/winston/transports";
import { promises as fs } from 'fs';
import formidable from 'formidable';
import fsE from 'fs-extra';

const generateCardCode = async (key: string = "") => {
  let cardcodes = "";
  try {
    let model: UsersModel = new UsersModel();
    model.action = "getIdCareCode";
    model.business = " ";
    model.arg1 = " ";
    let result = await UsersProcedure(model);
    cardcodes = result[0].nextId;
  } catch (error) {
    logger.error('generateCardCode =>', error);
  }
  return cardcodes.toUpperCase();
};
const taxCodeValue = async () => {
  let taxValue = "";
  try {
    let model: UsersModel = new UsersModel();
    model.action = "TaxCodeDefault";
    model.business = " ";
    model.arg1 = " ";
    let result = await UsersProcedure(model);
    taxValue = result[0].taxCodeDefault;
  } catch (error) {
    logger.error('taxCodeValue =>', error);
  }
  return taxValue.toUpperCase();
};
const territoryValue = async () => {
  let idTerritory = "";
  try {
    let model: UsersModel = new UsersModel();
    model.action = "terrirotyDefault";
    model.business = " ";
    model.arg1 = " ";
    let result = await UsersProcedure(model);
    idTerritory = result[0].territoryID;
  } catch (error) {
    logger.error('territoryValue =>', error);
  }
  return idTerritory;
};
export async function loginPartner(request: Request, response: Response) {
  const { email, password, salesPerson } = request.body.user;
  const { db_name } = response.locals.business;
  const responseModel = new ResponseModel();
  let localstorage = request.body.localShoppingCart;
  try {
    let model: UsersModel = new UsersModel();
    model.action = "login";
    model.business = db_name;
    model.arg1 = email;

    let result = await UsersProcedure(model);

    responseModel.from = 1;

    if (!result || !result[0]) {
      responseModel.message = "La cuenta no existe";
      responseModel.type = 1;
      response.json(responseModel);
      return;
    }

    if (result[0].U_FMB_Handel_ATV !== null && result[0].U_FMB_Handel_ATV !== 1 && result[0].U_FMB_Handel_ATV !== '1') {
      responseModel.message = "Error al accesar a tu cuenta, favor de contactar al asesor de ventas.";
      response.json(responseModel);
      return;
    }

    if (password != result[0].U_FMB_Handel_Pass) {
      // validate encriptor
      responseModel.message = "Contraseña incorrecta. Comuníquese con nosotros para solicitar su contraseña";
      responseModel.type = 2;
      response.json(responseModel);
      return;
    }
    response.locals.user = result[0];
    response.locals.lgs = localstorage;

    // find PROFILE
    let profile: any = await getProfile(request, response, true);

    if (!profile.status) {
      let profile: any = await createProfile(request, response, true);

      result[0].profile_id = profile.data.id;
      result[0].banners = profile.data.admin_banner;

      let token = createToken(result[0]);

      // Remove password
      result[0].U_FMB_Handel_Pass = undefined;
      responseModel.status = 1;
      responseModel.from = 1;
      responseModel.data = { user: result[0], token };
      response.json(responseModel);
      return;
    }

    result[0].profile_id = profile.data.id;
    result[0].banners = profile.data.admin_banner;

    // Seems like it works, generate a token
    let token = createToken(result[0]);

    model.action = "timeMails";
    model.business = db_name;
    model.arg1 = result[0].CardCode;
    model.arg2 = '';
    let resultLastTimeEmail = await UsersProcedure(model);

    let minutesDifference = false;
    let lastDateEmail = (!resultLastTimeEmail || !resultLastTimeEmail[0] || resultLastTimeEmail[0].twoStepsDateTime === null || resultLastTimeEmail[0].twoStepsDateTime === '') ? '' : resultLastTimeEmail[0].twoStepsDateTime;

    if (lastDateEmail !== '') {
      //MinutesDifferenceForgottenPassword
      if (resultLastTimeEmail[0].MinutesDifferenceTwoSteps !== null) {
        if (resultLastTimeEmail[0].MinutesDifferenceTwoSteps >= 10) {
          minutesDifference = true;
        }
      }
    } else {
      minutesDifference = true;
    }

    if (lastDateEmail === '' || minutesDifference === true) {
      let code = generateCode(6);
      model.action = "saveCode";
      model.business = db_name;
      model.arg1 = result[0].CardCode;
      model.arg2 = code;
      let resultCode = await UsersProcedure(model);

    }

    let sendEmailValidation = minutesDifference === true ? 'Y' : 'N';

    let clienteUniversal: any = "";
    if (salesPerson !== '' && (result[0].CardCode === 'C2029' || result[0].CardCode === 'C4192')) {
      model.action = "ClienteUniversal";
      model.arg2 = salesPerson;
      clienteUniversal = await UsersProcedure(model);
      clienteUniversal = Object.values(clienteUniversal);
      clienteUniversal = clienteUniversal[0];

      if (clienteUniversal.valor === 'FALSE') {
        clienteUniversal = '[]';
        model.action = "OcuparCliente";
        model.arg2 = salesPerson;

        await UsersProcedure(model);
      } else {
        clienteUniversal = clienteUniversal.firstName + ' ' + clienteUniversal.lastName;
      }
    }

    // Remove password
    result[0].U_FMB_Handel_Pass = undefined;
    responseModel.status = 1;
    responseModel.data = { user: result[0], token, sendEmail: sendEmailValidation, clienteUniversal };
    response.json(responseModel);
  } catch (e) {
    logger.error('loginPartner =>', e);
    responseModel.message = "Ocurrió un error inesperado";
    response.json(responseModel);
  }
}

export async function getBusinessPartnerInfo(request: Request, response: Response): Promise<void> {
  let { db_name } = response.locals.business;
  const { wareHouse } = response.locals.business;
  let responseModel = new ResponseModel();
  let { cardCode } = request.params;
  let cardCodeOk = decodeURIComponent(cardCode);

  try {
    let model: UsersModel = new UsersModel();
    model.action = "getBusinessPartnerInfo";
    model.business = db_name;
    model.arg1 = cardCodeOk;

    let result = await UsersProcedure(model);
    if (!result || !result[0]) {
      responseModel.message = "Su cuenta no se encontró en nuestros registros";
      response.json(responseModel);
      return;
    }

    // if (result[0].U_FMB_Handel_RedCard === null || result[0].U_FMB_Handel_RedCard === '') {
    //   // result[0].U_FMB_Handel_Pass = undefined;
    //   result[0].Card = "N";
    //   let response1 = {
    //     resultData: result[0] || [],
    //   }

    //   responseModel.data = response1 || {};
    //   responseModel.message = "Usted no posee ninguna tarjeta de Recompensas";
    //   response.json(responseModel);
    //   return;
    // }

    // if (result[0].U_FMB_Handel_CardAct === null || result[0].U_FMB_Handel_CardAct == 0) {
    //   // result[0].U_FMB_Handel_Pass = undefined;

    //   let response1 = {
    //     resultData: result[0] || [],
    //   }

    //   responseModel.data = response1 || {};
    //   responseModel.message = "Su tarjeta de Recompensas se encuentra inactiva";
    //   response.json(responseModel);
    //   return;
    // }

    // let model2: PointsHistoryModel = new PointsHistoryModel();
    // model2.action = "lastRegisterResetPoints";
    // let resultLastRegisterResetPoints = await PointsHistoryProcedure(model2);

    let dataPoints = await infoPoints({ CardCode: cardCodeOk, DocDate: result[0].CreateDate });
    // result[0].U_FMB_Handel_Pass = undefined;

    let response1 = {
      resultData: result[0] || [],
      resultInfoPoints: dataPoints || {},
    }

    responseModel.data = response1 || {};
    responseModel.message = 'Socio de Negocio';
    responseModel.status = 1;
  } catch (e) {
    logger.error('getBusinessPartnerInfo =>', e);
    responseModel.message = "Ocurrió un error al traer su info. de cliente";
  }
  response.json(responseModel);
}

export async function requestCard(request: Request, response: Response): Promise<void> {
  const { CardCode, CardName, email, phone, country, state, city } = request.body.data;
  const { db_name, sapConfig } = response.locals.business;
  const responseModel = new ResponseModel();

  let model: UsersModel = new UsersModel();
  model.action = "timeRequestCard";
  model.business = db_name;
  model.arg1 = CardCode;
  model.arg2 = '';
  let resultLastTimeRequestCard = await UsersProcedure(model);

  let minutesDifference = false;
  let lastDateRequestCardEmail = (!resultLastTimeRequestCard || !resultLastTimeRequestCard[0] || resultLastTimeRequestCard[0].requestCardDateTime === null || resultLastTimeRequestCard[0].requestCardDateTime === '') ? '' : resultLastTimeRequestCard[0].requestCardDateTime;

  if (lastDateRequestCardEmail !== '') {
    //MinutesDifferenceForgottenPassword
    if (resultLastTimeRequestCard[0].MinutesDifferenceRequestCard !== null) {
      if (resultLastTimeRequestCard[0].MinutesDifferenceRequestCard >= 10) {
        minutesDifference = true;
      }
    }
  } else {
    minutesDifference = true;
  }

  if (lastDateRequestCardEmail === '' || minutesDifference === true) {
    model.action = "saveRequestCardTime";
    model.business = db_name;
    model.arg1 = CardCode;
    let resultRequestCardInsertion = await UsersProcedure(model);
    if (CardName == '' || email == '' || phone == '' || country == '' || state == '' || city == '') {
      responseModel.message = 'Verifique que sus datos sean correctos en su perfil';
      response.json(responseModel);
      return;
    }

    let msghtml = `
    <html>
      <head>
        <title>${'SOLICITUD DE TARJETA'}</title>
        <style type="text/css">
          a { color: #336699; text-decoration:none; }
          .row { text-align: center;}	
          body { background: #fff; font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif  }
          b { color: #045bab; }
          #customers {
            font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
            border-collapse: collapse;
            width: 100%;
          }
          
          #customers td, #customers th {
            border: 1px solid #ddd;
            padding: 8px;
          }
          
          #customers tr:nth-child(even){background-color: #f2f2f2;}
          
          #customers tr:hover {background-color: #ddd;}
          
          #customers th {
            padding-top: 12px;
            padding-bottom: 12px;
            text-align: left;
            background-color: #045bab;
            color: white;
          }				
          
        </style>
            </head>
            <body>
        <div style=' border: 5px solid #045bab;margin:0 0 25px; overflow: hidden; padding: 20px; -webkit-border-radius: 10px; border-radius: 10px; '>
          <div class="container">
            <div class="row">
              <img align="center" style="width: 300px" src="http://diasa.net/wp-content/uploads/2018/07/logo-diasa.png"><br></br>
              <div class="col-lg-12">
                <h1 style="font-size: 2rem; color: #045bab; font-weight: bold;">DIASA</h1>
              </div>
              <div class="col-lg-8">
                <h2 style="font-size: 1.5rem;">SOLICITUD DE TARJETA DE RECOMPENSAS</h2>
              </div> 
            </div>
            <h2 style="font-weight: bold;">Estimado ${CardName}, </h2>      
              <h3>Los siguientes datos se utilizarán para la solicitud de una Tarjeta de Recompensas </h3>
              <p>Nombre: <b>${CardName}<b/></p>
              <p>Correo: <b>${email}<b/></p>
              <p>Teléfono: <b>${phone}<b/></p>
              <p>País: <b>${country}<b/></p>
              <p>Estado: <b>${state}<b/></p>
              <p>Municipio: <b>${city}<b/></p>
            <br>                    
            <br>
          </div>
        </div>
      </body>
    </html>`;
    //          <p><span><b>${subtitle}:</b> </span><strong><u>${password}</u></strong> ${text} puede ser utilizado para iniciar sesión en tu cuenta de E-Commerce</p>
    try {
      let dataMail = await EmailProcedure("getRequestedCard");
      let bcc;
      if (dataMail[0].validateRequestedCard === 1) {
        bcc = dataMail[0].requestedCardBCC;
      } else {
        bcc = "";
      }

      let subject = dataMail[0].requestedCardSubject;
      subject = "Nueva solicitud de tarjeta de Recompensas";
      let sendMail = await helpers.sendEmail(email, "", bcc, subject, msghtml, null);

      responseModel.message = 'Correo de solicitud de tarjeta enviado';

      responseModel.status = 1;
      responseModel.data = { response: 'OK' }
      response.json(responseModel);
    } catch (e) {
      logger.error('requestCard =>', e);
      responseModel.status = 0;
      responseModel.message = " Ocurrió un error al enviar el correo de confirmación";
      response.json(responseModel);
    }
  } else {
    responseModel.message = ' Debes esperar al menos 10 minutos para poder enviar otro correo';
    responseModel.status = 1;
    responseModel.data = { response: '10minutes' }
    response.json(responseModel);
  }
}

export async function twoStepsVerification(request: Request, response: Response) {
  const { email, key } = request.body.user;
  const { db_name } = response.locals.business;
  const responseModel = new ResponseModel();
  try {
    let model: UsersModel = new UsersModel();

    model.action = "login";
    model.business = db_name;
    model.arg1 = email;

    let result = await UsersProcedure(model);
    if (!result || !result[0]) {
      responseModel.message = "La cuenta no existe";
      response.json(responseModel);
      return;
    }

    model.action = "twoStepsKey";
    model.business = db_name;
    model.arg1 = result[0].CardCode;
    let resultCode = await UsersProcedure(model);

    if (!resultCode || !resultCode[0]) {
      responseModel.message = "La cuenta no existe";
      response.json(responseModel);
      return;
    }

    if (resultCode[0].twoStepsKey === key) {
      responseModel.status = 1;
      responseModel.data = { answer: 'Y' };
      response.json(responseModel);
    } else {
      responseModel.status = 1;
      responseModel.data = { answer: 'N' };
      response.json(responseModel);
    }
  } catch (e) {
    logger.error('twoStepsVerification =>', e);
    responseModel.message = "Ocurrió un error inesperado";
    response.json(responseModel);
  }
}

export async function twoStepsMail(request: Request, response: Response) {
  const { email, forgottenPassword } = request.body.user;
  const { db_name } = response.locals.business;
  const responseModel = new ResponseModel();
  try {
    let model: UsersModel = new UsersModel();

    model.action = "getCode";
    model.business = db_name;
    model.arg1 = email;

    let result = await UsersProcedure(model);
    const prueba = {
      action: model.action,
      business: model.business,
      arg1: model.arg1
    }
    if (!result || !result[0]) {
      responseModel.message = "La cuenta no existe";
      response.json(responseModel);
      return;
    }

    model.action = "twoStepsKey";
    model.business = db_name;
    model.arg1 = result[0].CardCode;
    let resultCode = await UsersProcedure(model);
    if (!resultCode || !resultCode[0]) {
      responseModel.message = "La cuenta no existe";
      response.json(responseModel);
      return;
    }

    let cardCode = result[0].CardCode;
    let cardName = result[0].CardName;
    let mail = email;
    let password = resultCode[0].twoStepsKey;
    let operation = 'twoSteps';

    let sendEmailValidation = 'Y';
    // Si es contraseña olvidada se manda el password por correo
    if (forgottenPassword !== undefined) {
      password = result[0].U_FMB_Handel_Pass;
      operation = 'forgottenPassword';
      model.action = "timeMails";
      model.business = db_name;
      model.arg1 = result[0].CardCode;
      model.arg2 = '';
      let resultLastTimeEmail = await UsersProcedure(model);

      let minutesDifference = false;
      let lastDateEmail = (!resultLastTimeEmail || !resultLastTimeEmail[0] || resultLastTimeEmail[0].forgottenPasswordDateTime === null || resultLastTimeEmail[0].forgottenPasswordDateTime === '') ? '' : resultLastTimeEmail[0].forgottenPasswordDateTime;

      if (lastDateEmail !== '') {
        if (resultLastTimeEmail[0].MinutesDifferenceForgottenPassword !== null) {
          if (resultLastTimeEmail[0].MinutesDifferenceForgottenPassword >= 10) {
            minutesDifference = true;
          }
        }
      } else {
        minutesDifference = true;
      }

      sendEmailValidation = 'Y' ;
      if (sendEmailValidation === 'Y') {
        model.action = "saveForgottenPasswordTime";
        model.business = db_name;
        model.arg1 = result[0].CardCode;
        model.arg2 = '';
        let resultCode = await UsersProcedure(model);
      }
    }

    if (sendEmailValidation === 'Y') {
      let responseMail = await successfullyVerification(cardCode, cardName, mail, password, operation);
      response.json(responseMail);
    } else {
      responseModel.status = 1;
      responseModel.data = { response: 'N' };
      response.json(responseModel);
    }


  } catch (e) {
    logger.error('twoStepsMail =>', e);
    responseModel.message = "Ocurrió un error inesperado";
    response.json(responseModel);
  }
}

function generateCode(length: Number) {
  let result = [];
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
  }
  return result.join('');
}

export async function successfullyVerification(CardCode: String, CardName: string, email: string, password: string, operation: string) {
  const responseModel = new ResponseModel();
  let title = operation !== 'twoSteps' ? 'Recuperación de contraseña' : 'Confirmación de inicio de sesión';
  let subtitle = operation !== 'twoSteps' ? 'Contraseña' : 'Código de confirmación de inicio de sesión';
  let text = operation !== 'twoSteps' ? 'Esta contraseña' : 'Este código';
  let msghtml = `<html>
  <head>
  	<title>${title}</title>
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
      div, button {
        margin: 0!important;
        padding: 0!important;
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
                                  <td bgcolor="#fff" style="height: 15px; line-height: 15px; background-color: #ffffff;" height="15">
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: center; padding: 20px 20px 30px 20px;" align="center" class="copy">
                                    <h1>¡BIENVENIDO!</h1>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: center; padding: 20px 20px 0px 20px;" align="center" class="copy">
                                    <h2>Código de Verificación de Inicio de Sesión</h2>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: 'RobotoBold'; font-weight: bold; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: left; padding: 20px 20px 30px 20px;" align="center" class="copy">
                                    <h2>Estimado ${CardName}, </h2>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-family: Arial; color: #000000; font-size: 15px; line-height: 20px; mso-line-height-rule: exactly; text-align: justify; padding: 20px 20px 30px 20px;" align="center" class="copy">
                                    <a style="color: #008af0; text-decoration: none;" > ${subtitle}: <strong style="color: #000;"><u style="font-size: 20px;">${password}</u> ${text} puede ser utilizado para iniciar sesión en tu cuenta de E-Commerce</strong>
                                    </a>
                                  </td>
                                </tr>  
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
  try {
    let dataMail = await EmailProcedure("getTwoSteps");
    let bcc;
    if (dataMail[0].validateTwoSteps === 1) {
      bcc = dataMail[0].twoStepsBCC;
    } else {
      bcc = "";
    }

    let subject = dataMail[0].twoStepsSubject;
    let sendMail = await helpers.sendEmail(email, "", bcc, subject, msghtml, null);

    responseModel.status = 1;
    responseModel.message = " Correo enviado ";
    responseModel.data = { response: sendMail }
    return responseModel;
  } catch (e) {
    logger.error('successfullyVerification =>', e);
    responseModel.status = 0;
    responseModel.message = " Ocurrió un error al enviar el correo de confirmación";
    return responseModel;
  }
}


export async function showPartner(request: Request, response: Response) {
  const option = new OptionsController();
  let access = await option.Noite();
  response.json(access);
}

export async function createPartner(request: Request, response: Response) {
  const { db_name, priceList, currency, groupCode, paymentCondition, paymentMethod, rfcGeneric, sapConfig, } = response.locals.business;
  const { user, shipping, billing, shoppingCart } = request.body;

  const responseModel = new ResponseModel();

  let model: ProfileModel = new ProfileModel(); // create profile
  // Validacion de la nueva cuenta
  try {
    let modelLogin: UsersModel = new UsersModel();
    //Datos de la cuenta que se esta intentando ingresar
    modelLogin.action = "login";
    modelLogin.business = db_name;
    modelLogin.arg1 = user.email;

    let result = await UsersProcedure(modelLogin);
    //Validate if de email exist
    if (result[0]) {
      responseModel.message = "Comuníquese con nosotros para obtener sus datos de registro (Email)";
      response.json(responseModel);
      return;
    }
    //validacion del RFC
    if (!(user.rfc === "" || user.rfc === "XAXX010101000" || user.rfc === "XEXX010101000")) {
      modelLogin.action = "forRFC";
      modelLogin.arg1 = user.rfc;
      let result = await UsersProcedure(modelLogin);
      if (result[0]) {
        //valida si RFC ya a sido resgistrado
        responseModel.message = "Comuníquese con nosotros para obtener sus datos de registro (RFC)";
        response.json(responseModel);
        return;
      }
    }
    // Fin validacion de creacion de cuentas

    let exit = true;
    let cardCodeDefault: string = "";
    let taxCodeDefault: string = "";
    let territory: string = "";
    do {
      // generate CardCode
      cardCodeDefault = await generateCardCode(user.email);
      taxCodeDefault = await taxCodeValue();
      territory = await territoryValue();
      modelLogin = new UsersModel();
      modelLogin.action = "validateCardCode";
      modelLogin.business = db_name;
      modelLogin.arg1 = cardCodeDefault;

      result = await UsersProcedure(modelLogin);

      if (!result || !result[0]) {
        //Validate if cardCodeExist
        exit = false;
        logger.error("CardCode donst exist");
      }
    } while (exit);

    let model = new BusinessPartner();

    //Dirección de envío
    let newAddresses: any = [];
    shipping.map((address: any) => {
      let newAddress = new Addresses();
      newAddress.Address = "ENVÍO";
      newAddress.Street = address.street;
      newAddress.Block = address.suburb;
      newAddress.City = address.city;
      newAddress.ZipCode = address.cp;
      newAddress.County = "";
      newAddress.State = address.state;
      newAddress.Country = address.country;
      newAddress.TaxCode = taxCodeDefault;
      newAddress.StreetNo = "";
      newAddress.Building = "";
      newAddress.GlblLocNum = "";
      newAddress.TaxOffice = "";
      newAddress.TypeOfAddress = "S";
      newAddresses.push(newAddress);
    });
    let newAddressBill: any = [];
    billing.map((billing: any) => {
      let newAddress = new Addresses();
      newAddress.Address = "FACTURACIÓN";
      newAddress.Street = billing.street;
      newAddress.Block = billing.suburb;
      newAddress.City = billing.city;
      newAddress.ZipCode = billing.cp;
      newAddress.County = "";
      newAddress.State = billing.state;
      newAddress.Country = billing.country;
      newAddress.TaxCode = "";
      newAddress.StreetNo = "";
      newAddress.Building = "";
      newAddress.GlblLocNum = "";
      newAddress.TaxOffice = "";
      newAddress.TypeOfAddress = "bo_BillTo";
      newAddressBill.push(newAddress);
    });

    model.DeliveriesAddress = newAddresses;
    model.BillingAddress = newAddressBill;

    let payMethods: any = [{ PymCode: paymentMethod }];
    model.PayMethodCodes = payMethods;

    //info user default
    model.CardCode = cardCodeDefault;
    model.CardType = "C";
    model.ObjType = "2";
    model.ShipToDef = model.DeliveriesAddress.length
      ? model.DeliveriesAddress[0].Address
      : null;
    model.PymCode = model.PayMethodCodes.length
      ? model.PayMethodCodes[0].PymCode
      : null;
    model.LicTradNum = user.rfc || rfcGeneric; // if user dont have rfc use generic rfc
    model.MainUsage = user.cfdi;
    model.validFor = "Y";

    model.GroupCode = groupCode;
    model.Currency = currency;
    model.GroupNum = paymentCondition;
    model.PriceListNum = priceList;

    //Info User handel
    model.CardName = user.name;
    model.Phone1 = user.phone;
    model.Phone2 = user.phone2;
    model.E_mail = user.email;
    model.password = user.password;
    model.Territory = territory;

    let data = {
      model: model,
    };

    let businessPartnersInterface = new BusinessPartners(sapConfig);
    businessPartnersInterface.createXML(data);
    businessPartnersInterface.replaceSapVersion();
    businessPartnersInterface.setOptions();
    let partnerResponse: any = await businessPartnersInterface.createCall();

    if (!partnerResponse.status) {
      responseModel.message = partnerResponse.error;
      response.json(responseModel);
      return;
    }

    let modelLoginCreate = new UsersModel();

    modelLoginCreate.action = "validateCardCode";
    modelLoginCreate.business = db_name;
    modelLoginCreate.arg1 = cardCodeDefault;

    let resultCreate = await UsersProcedure(modelLogin);

    if (!resultCreate || !resultCreate[0]) {
      //Validate if cardCode Exist before call xml
      responseModel.message = "Ocurrió un error al crear tu cuenta";
      response.json(responseModel);
      return;
    } else {
      let model: ProfileModel = new ProfileModel(); // create profile

      model.action = "create";
      model.business = db_name;
      model.cardCode = cardCodeDefault;
      model.shoppingCart = JSON.stringify(shoppingCart);
      let result: any = await ProfileProcedure(model);

      if (!result.id) {
        responseModel.message = "Ocurrió un error al crear tu cuenta";
        response.json(responseModel);
        return;
      }
      responseModel.status = 1;
      responseModel.message = "Cuenta creada. Inicia sesión";
      successfullyCreate(data.model.CardCode, data.model.CardName, data.model.E_mail, data.model.password);
      response.json(responseModel);
      return;
    }
  } catch (e) {
    logger.error('createPartner =>', e);
    responseModel.message = "Ocurrió un error al crear tu cuenta";
    response.json(responseModel);
  }
}

export async function updatePartner(request: Request, response: Response) {
  const { db_name, sapConfig } = response.locals.business;
  const responseModel = new ResponseModel();

  let data = request.body;

  try {
    let model: UsersModel = new UsersModel();
    model.action = "getBusinessPartnerInfo";
    model.business = db_name;
    model.arg1 = data.user;

    let result = await UsersProcedure(model);
    if (!result || !result[0]) {
      responseModel.message = "Su cuenta no se encontró en nuestros registros";
      response.json(responseModel);
      return;
    }

    let changeJustPassword = false;
    if (data.oldPass && data.oldPass !== '' && data.oldPass !== '*****') {
      if (result[0].U_FMB_Handel_Pass != data.oldPass) {
        responseModel.message = "La contraseña actual es incorrecta";
        response.json(responseModel);
        return;
      } else {
        if (data.newPass1 !== '') {
          changeJustPassword = true;
        }
      }
    }

    let businessPartnersInterface = new BusinessPartners(sapConfig);
    if (changeJustPassword === true) {
      businessPartnersInterface.updateXMLPassword(data);
    } else {
      businessPartnersInterface.updateXMLPersonalData(data);
    }
    businessPartnersInterface.replaceSapVersion();
    businessPartnersInterface.setOptions();
    let partnerResponse: any = await businessPartnersInterface.createCall();

    if (!partnerResponse.status) {
      responseModel.message = partnerResponse.error;
      response.json(responseModel);
      return;
    }

    responseModel.message = 'Usuario actualizado';
    responseModel.status = 1;
    response.json(responseModel);
  } catch (error) {
    responseModel.message = "Ocurrió un problema inesperado";
    response.json(responseModel);
  }
}

export async function sendJobMail(request: Request, response: Response): Promise<void> {
  const responseModel = new ResponseModel();
  let name = '', jobType = '', education = '', address = '', postalCode = '', phone = '', mail = '', lastName = '', cv = '';

  let fileNameMail = "";
  let fullRouteName = "";
  var form = new formidable.IncomingForm();
  form.parse(request, async function (err: any, fields: any, files: any) {
    if (!err) {
      jobType = fields.jobType;
      education = fields.education;
      address = fields.address;
      postalCode = fields.postalCode;
      phone = fields.phone;
      mail = fields.mail;
      lastName = fields.lastName;
      cv = fields.cv;
      name = fields.name;

      let ext = cv.lastIndexOf(".");
      let validateExt = cv.substring(ext, cv.length);
      let route = __dirname + "/../../CV/";
      let fileName = moment().format("YYYY-MM-DD_HH-mm").toString() + "_CV_" + lastName.substring(0, 1) + name.substring(0, 1) + validateExt;
      fileNameMail = fileName;
      fullRouteName = route + fileName;
      await fs.rename(files.file.path, fullRouteName);

      let msghtml = `<html>
      <head>
      <title>OFERTA LABORAL</title>
          <style type="text/css">
              a { color: #336699; text-decoration:none; }
              .row { text-align: center;}	
              body { background: #fff; font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif  }
              b { color: #045bab; }
              #customers {
                  font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
                  border-collapse: collapse;
                  width: 100%;
              }
                  
              #customers td, #customers th {
                  border: 1px solid #ddd;
                  padding: 8px;
              }
                  
              #customers tr:nth-child(even){background-color: #f2f2f2;}
                  
              #customers tr:hover {background-color: #ddd;}
                  
              #customers th {
                  padding-top: 12px;
                  padding-bottom: 12px;
                  text-align: left;
                  background-color: #045bab;
                  color: white;
        }
          </style>
      </head>
      <body>
        <div style=' border: 5px solid #d40436;margin:0 0 25px; overflow: hidden; padding: 20px; -webkit-border-radius: 10px; border-radius: 10px; '>
          <div class="row">
            <div class="col-lg-4">
              <h1 style="color: #045bab; font-weight: bold;">DIASA</h1>
            </div>
            <div class="col-lg-8">
              <h2>Oferta laboral para el puesto de <b>${jobType}</b> a través del portal de DIASA E-Handel</h2>
            </div>      
          </div>
          <div class="row">
            <h2 style="font-weight: bold;">Hola, ¡que tal! Mi nombre es: ${name} ${lastName}, </h2>
            <p>Me siento interesado en el puesto de <b>"${jobType}"</b>, al cual puedo calificar debido a mi experiencia y aptitudes, además de tener
            como mi máximo nivel de estudios el certificado de <b>"${education}"</b>. A continuación le comparto mis datos personales generales y le adjunto mi CV:</p>
            <br>
            <p class="text-left">Dirección: <b>${address}</b></p>
            <p class="text-left">Código postal: <b>${postalCode}</b></p>
            <p class="text-left">Teléfono: <b>${phone}</b></p>
            <p class="text-left">Correo electrónico: <b>${mail}</b></p>
            <br>
            <br>
            <p>Espero su pronta respuesta, ¡muchas gracias de antemano!</p>        
          </div>
          <div class="row">
    
          </div>
        </div>
        </body>
      </html>`;
      let dataMail = await EmailProcedure("getCreate");
      let bcc;
      if (dataMail[0].validateCreateBCC === 1) {
        bcc = dataMail[0].createBCC;
      } else {
        bcc = "";
      }
      let subject = dataMail[0].createSubject;
      subject = "Nueva solicitud de empleo de bolsa de trabajo Diasa E-Handel";
      let sendMail = await helpers.sendEmail('vanessa.lopez@diasa.net', "alejandra.nava@diasa.net", bcc, subject, msghtml, { filename: fileNameMail, path: fullRouteName });

      responseModel.message = 'Solicitud de Distribuidor enviada con éxito';
      responseModel.status = 1;
      response.json(responseModel);
    } else {
      responseModel.message = "Ocurrió un problema inesperado";
      response.json(responseModel);
    }
  });
}

export async function successfullyCreate(CardCode: String, CardName: string, email: string, password: string) {
  let msghtml = `<html>
  <head>
    <title>Socio de Negocio</title>
    <style type="text/css">
      a { color: #336699; text-decoration:none; }
      .row { text-align: center;}	
      body { background: #fff; font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif  }
      b { color: #0060AA; }
    </style>
  </head>
    <body>
      <div class="container">
        <div class="row">
          <div class="col-lg-4">
            <h1 style="color: #0060AA; font-weight: bold;">DIASA</h1>
          </div>
          <div class="col-lg-8">
            <h2>Creación de cuenta como Socio de Negocio CIG E-HANDEL</h2>
          </div>      
        </div>
        <h2 style="font-weight: bold;">Hola ${CardName}, </h2>
        <p>Esta es una confirmación de que tu cuenta en CIG E-HANDEL se a creado satisfactoriamente. A partir de ahora, puedes comprar con sosotros online. Para poder acceder, solo será necesario utilizar las siguientes credenciales:</p>
        <br>
        <p>Correo electrónico registrado: <b>${email}</b></p>
        <p>Contraseña registrada: <b>${password}</b></p>
        <br>
	      <p>En el proceso de tu registro, hemos asignado el número de socio de negocio <b>(${CardCode})</b> el cuál, es necesario que lo tengas presente cuando te contactes con nosotros</p>
        <br>
        <p>Si tienes alguna duda puedes contactarnos al teléfono (55)5362-6529 o bien escríbenos al correo <b>ventas_web@tsgmexico.com.mx</b>, donde con gusto te atenderemos.</p>
        <p>Te recordamos nuestros horarios de atención: Lunes a Viernes de 9:00 hrs. a 18:00 hrs.</p>        
      </div>
      <div class="row">
        <a href="http://www.cigmexico.com.mx/" style="color: #0060AA; font-weight: bold;">CIG México</a><br>
        Copyright &copy; TSGMEXICO 2020<br>
      </div>
    </body>
  </html>`;
  let dataMail = await EmailProcedure("getCreate");
  let bcc;
  if (dataMail[0].validateCreateBCC === 1) {
    bcc = dataMail[0].createBCC;
  } else {
    bcc = "";
  }
  let subject = dataMail[0].createSubject;
  let sendMail = await helpers.sendEmail(email, "", bcc, subject, msghtml, null);
}

export async function updateAddressPartner(request: Request, response: Response) {
  const { db_name, sapConfig } = response.locals.business;
  const { CardCode } = response.locals.user;
  const { addresses } = request.body;
  const responseModel = new ResponseModel();

  let model: ProfileModel = new ProfileModel(); // create profile

  try {
    let model = new BusinessPartner();

    let newAddresses: any = [];

    addresses.map((address: any) => {
      let newAddress = new Addresses();
      newAddress.Address = address.Address;
      newAddress.Street = address.Street;
      newAddress.Block = address.Block;
      newAddress.City = address.City;
      newAddress.ZipCode = address.ZipCode;
      newAddress.County = "";
      newAddress.State = address.State;
      newAddress.Country = address.Country;
      newAddress.TaxCode = "";
      newAddress.StreetNo = "";
      newAddress.Building = "";
      newAddress.GlblLocNum = "";
      newAddress.TaxOffice = "";
      //newAddress.FederalTax = address.TaxID;
      newAddress.TypeOfAddress = address.AdresType;

      newAddresses.push(newAddress);
    });

    model.DeliveriesAddress = newAddresses;

    model.CardCode = CardCode;
    model.ObjType = "2";
    let data = {
      model: model,
      addressnew: addresses,
    };

    let businessPartnersInterface = new BusinessPartners(sapConfig);
    businessPartnersInterface.createXMLUpdateAddresses(data);
    businessPartnersInterface.replaceSapVersion();
    businessPartnersInterface.setOptions();
    let partnerResponse: any = await businessPartnersInterface.createCall();
    if (!partnerResponse.status) {
      responseModel.message = partnerResponse.error;
      response.json(responseModel);
      return;
    }

    responseModel.status = 1;
    responseModel.message = "direcciones Actualizadas";
    response.json(responseModel);
    return;
  } catch (e) {
    logger.error('updateAddressPartner =>', e);
    responseModel.message = "Ocurrio un error al actualizar sus direcciones";
    response.json(responseModel);
  }
}

export async function loginOUSR(request: Request, response: Response) {
  const { email, password } = request.body.user;
  const { db_name } = response.locals.business;
  const responseModel = new ResponseModel();
  let localstorage = request.body.localShoppingCart;
  try {
    let model: UsersModel = new UsersModel();

    model.action = "loginOUSR";
    model.business = db_name;
    model.arg1 = email;
    let result = await UsersProcedure(model);
    responseModel.from = 1;

    if (!result || !result[0]) {
      responseModel.message = "La cuenta no existe";
      responseModel.type = 1;
      response.json(responseModel);
      return;
    }
    if (password != result[0].U_FMB_Password) {
      responseModel.message = "Contraseña incorrecta. Comuníquese con nosotros para solicitar su contraseña";
      responseModel.type = 2;
      response.json(responseModel);
      return;
    }
    response.locals.user = result[0];
    response.locals.lgs = localstorage;

    // let profile: any = await getProfile(request, response, true);

    // if (!profile.status) {
    //   responseModel.message = "Ocurrió un problema al consultar perfil";
    //   response.json(responseModel);
    //   return;
    // }

    // result[0].profile_id = profile.data.id;
    // result[0].banners = profile.data.admin_banner;

    // Seems like it works, generate a token
    let token = createToken(result[0]);

    // Remove password
    result[0].U_FMB_Password = undefined;
    responseModel.type = 1;
    responseModel.status = 1;
    responseModel.from = 1;
    responseModel.data = { user: result[0], token };
    response.json(responseModel);
  } catch (e) {
    logger.error('loginOUSR =>', e);
    responseModel.message = "Ocurrió un problema inesperado";
    response.json(responseModel);
  }
}

export async function searchAccount(request: Request, response: Response) {
  //Recibimos los valores del front
  const { user } = request.body;
  const { db_name } = response.locals.business;
  //Definimos modelos de datos
  const responseModel = new ResponseModel();
  let modelLogin: UsersModel = new UsersModel();
  try {
    //Asiganamos valores al modelo de datos
    modelLogin.action = "login";
    modelLogin.business = db_name;
    modelLogin.arg1 = user.email;
    //Validamos si ya esta registrado el correo
    let result = await UsersProcedure(modelLogin);
    if (result[0]) {
      let user = {
        email: result[0].U_FMB_Handel_Email,
        password: result[0].U_FMB_Handel_Pass,
        cardName: result[0].CardName,
        cardCode: result[0].CardCode,
        rut: ""
      }
      sendData(user.cardCode, user.cardName, user.email, user.password, user.rut);
      responseModel.message = "Correo registrado, se ha enviado un correo para recuperación de su cuenta";
      //Se envia correo
      response.json(responseModel);
      return;
    };
    //Validamos el RFC
    if (!(user.rfc === "" || user.rfc === "99999999-9" || user.rfc === "11111111-1")) {
      modelLogin.action = "forRFC";
      modelLogin.arg1 = user.rfc;
      //Validamos si ya esta registrado el RFC
      let result = await UsersProcedure(modelLogin);
      if (result[0]) {
        let user = {
          email: result[0].U_FMB_Handel_Email,
          password: result[0].U_FMB_Handel_Pass,
          cardName: result[0].CardName,
          cardCode: result[0].CardCode,
          rut: result[0].LicTradNum
        }
        sendData(user.cardCode, user.cardName, user.email, user.password, user.rut);
        responseModel.message = "RFC registrado, se ha enviado un correo para recuperación de su cuenta";
        //Se envia correo
        response.json(responseModel);
        return;
      }
    }
    responseModel.status = 1;
    response.json(responseModel);
    return;
  } catch (error) {
    logger.error('searchAccount =>', error);
    responseModel.message = "Ocurrio un error al validar los datos ingresados (Registro)";
    response.json(responseModel);
  }

}

export async function sendData(CardCode: String, CardName: string, email: string, password: string, rut: string) {
  let direccion: string;
  if (rut === "") {
    direccion = "correo " + email;
  } else {
    direccion = "RFC " + rut;
  }
  let msghtml = `<html>
  <head>
    <title>Socio de Negocio</title>
      <style type="text/css">
          a { color: #336699; text-decoration:none; }
          .row { text-align: center;}	
          body { background: #fff; font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif  }
          b { color: #045bab; }
          #customers {
              font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
              border-collapse: collapse;
              width: 100%;
          }
              
          #customers td, #customers th {
              border: 1px solid #ddd;
              padding: 8px;
          }
              
          #customers tr:nth-child(even){background-color: #f2f2f2;}
              
          #customers tr:hover {background-color: #ddd;}
              
          #customers th {
              padding-top: 12px;
              padding-bottom: 12px;
              text-align: left;
              background-color: #045bab;
              color: white;
          }
      </style>
  </head>
  <body>
    <div style=' border: 5px solid #d40436;margin:0 0 25px; overflow: hidden; padding: 20px; -webkit-border-radius: 10px; border-radius: 10px; '>
      <div class="row">
        <div class="col-lg-4">
          <h1 style="color: #045bab; font-weight: bold;">DIASA</h1>
        </div>
        <div class="col-lg-8">
          <h2>Recuperación de cuenta en Diasa E-Handel</h2>
        </div>      
      </div>
      <div class="row">
        <h2 style="font-weight: bold;">Hola ${CardName}, </h2>
        <p > Se intento iniciar sesión con este ${direccion}. Para poder acceder a su cuenta, utilice de favor las siguientes credenciales: </p>
        <br>
        <p class="text-left">Correo electrónico registrado: <b>${email}</b></p>
        <p class="text-left">Contraseña registrada: <b>${password}</b></p>
        <br>
        <p>En caso de que usted no intentara acceder, es probable que alguien haya introducido su dirección de correo electrónico por error. </p>
        <br> 
        <p>De ser asi favor de ignorar este mensaje o puede reportalo al siguiente correo:<b>ventas@diasa.net</b></p>
        <p>Si tienes alguna duda puedes contactarnos al teléfono (81) 1253 3080 o bien escríbenos al correo<br>
        <b>ventas@diasa.net</b>, donde con gusto te atenderemos.</p>
        <p>Te recordamos nuestros horarios de atención: Lunes a Viernes de 9:00 a 17:30 horas.</p>        
      </div>
    </div>
  </body>
</html>`;
  let dataMail = await EmailProcedure("getCreate");
  let bcc;
  if (dataMail[0].validateCreateBCC === 1) {
    bcc = dataMail[0].createBCC;
  } else {
    bcc = "";
  }
  let subject = dataMail[0].createSubject;
  let sendMail = await helpers.sendEmail(email, "", bcc, subject, msghtml, null);
}

export async function jobTypes(request: Request, response: Response): Promise<void> {
  let { db_name } = response.locals.business;
  const { wareHouse } = response.locals.business;
  let responseModel = new ResponseModel();

  try {
    let model: UsersModel = new UsersModel();
    model.action = "jobTypes";
    model.business = db_name;

    let result = await UsersProcedure(model);
    if (!result || !result[0]) {
      responseModel.message = "No existen trabajos en la bolsa de trabajo";
      response.json(responseModel);
      return;
    }

    responseModel.data = result || [];
    responseModel.message = 'Bolsa de Trabajo';
    responseModel.status = 1;
  } catch (e) {
    logger.error('jobTypes =>', e);
    responseModel.message = "Ocurrió un error al traer los trabajos";
  }
  response.json(responseModel);
}

export async function deleteAddressPartner(request: Request, response: Response) {
  const { db_name, sapConfig } = response.locals.business;
  const { CardCode } = response.locals.user;
  const { addresses } = request.body;
  const responseModel = new ResponseModel();
  let model: ProfileModel = new ProfileModel();

  try {
    let model = new BusinessPartner();

    let newAddresses: any = [];

    addresses.map((address: any) => {
      let newAddress = new Addresses();
      newAddress.Address = address.Address;
      newAddress.Street = address.Street;
      newAddress.Block = address.Block;
      newAddress.City = address.City;
      newAddress.ZipCode = address.ZipCode;
      newAddress.County = "";
      newAddress.State = address.State;
      newAddress.Country = address.Country;
      newAddress.TaxCode = "";
      newAddress.StreetNo = "";
      newAddress.Building = "";
      newAddress.GlblLocNum = "";
      newAddress.TaxOffice = "";
      //newAddress.FederalTax = address.TaxID;
      newAddress.TypeOfAddress = address.AdresType;
      newAddresses.push(newAddress);
    });
    model.DeliveriesAddress = newAddresses;

    model.CardCode = CardCode;
    model.ObjType = "2";
    let data = {
      model: model,
      addressnew: addresses,
    };

    let businessPartnersInterface = new BusinessPartners(sapConfig);
    businessPartnersInterface.deleteXMLAddress(data);// createXMLUpdateAddresses
    businessPartnersInterface.replaceSapVersion();
    businessPartnersInterface.setOptions();
    let partnerResponse = await businessPartnersInterface.createCall();
    if (!partnerResponse.status) {
      responseModel.message = partnerResponse.error;
      response.json(responseModel);
      return;
    }

    responseModel.status = 1;
    responseModel.message = "Dirección Eliminada";
    response.json(responseModel);
    return;
  } catch (e) {
    logger.error('jobTypes =>', e);
    responseModel.message = "Ocurrio un error al eliminar la dirección";
    response.json(responseModel);
  }
}

export async function sendFilesByEmail(request: Request, response: Response): Promise<void> {

  const responseModel = new ResponseModel();

  let fileNameMail = "";
  let fullRouteName = "";

  var form = new formidable.IncomingForm();
  form.parse(request, async function (err: any, fields: any, files: any) {

    if (!err) {
      let clientMail = fields.mail;
      let attachmentFilePath = files.file.path
      let fileName = files.file.name
      let ext = fileName.lastIndexOf(".");
      let extFile = fileName.substring(ext, fileName.length);
      // const myArray = fileName.split(".");
      // let extFile = myArray[1];
      let route = __dirname + "\\..\\..\\CV\\";//"C:\\Users\\ADMINI~1\\AppData\\Local\\Temp/a/Local\\Temp"

      // let extFile = myArray.length - 1;
      // let cv = fields.cv; 
      let finalFileName = fileName + extFile;// + extFile;
      fullRouteName = route + finalFileName
      await fs.rename(files.file.path, fullRouteName)

      let msghtml = `<html>
      <head>
      <title></title>
          <style type="text/css">
              a { color: #336699; text-decoration:none; }
              .row { text-align: center;}	
              body { background: #fff; font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif  }
              b { color: #045bab; }
              #customers {
                  font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
                  border-collapse: collapse;
                  width: 100%;
              }
                  
              #customers td, #customers th {
                  border: 1px solid #ddd;
                  padding: 8px;
              }
                  
              #customers tr:nth-child(even){background-color: #f2f2f2;}
                  
              #customers tr:hover {background-color: #ddd;}
                  
              #customers th {
                  padding-top: 12px;
                  padding-bottom: 12px;
                  text-align: left;
                  background-color: #045bab;
                  color: white;
        }
          </style>
      </head>
      <body>
        <div style=' border: 5px solid #d40436;margin:0 0 25px; overflow: hidden; padding: 20px; -webkit-border-radius: 10px; border-radius: 10px; '>
          <div class="row">
            <div class="col-lg-4">
              <h1 style="color: #045bab; font-weight: bold;">DIASA</h1>
            </div>
            <div class="col-lg-8">
            </div>      
          </div>
          <div class="row">
            <br>
            <br>
            <p>Usted a recibido un archivo desde HANDEL DIASA</p>        
          </div>
          <div class="row">
    
          </div>
        </div>
        </body>
      </html>`;
      let dataMail = await EmailProcedure("getCreate");
      let bcc;
      if (dataMail[0].validateCreateBCC === 1) {
        bcc = dataMail[0].createBCC;
      } else {
        bcc = "";
      }
      let subject = dataMail[0].createSubject;
      subject = "Archivo enviado desde E-HANDEL";

      let sendMail = await helpers.sendEmail(clientMail, '', bcc, subject, msghtml, { filename: fileName, path: fullRouteName });
      responseModel.message = 'Su archivo fue enviado con exito';
      responseModel.status = 1;
      response.json(responseModel);
    } else {
      responseModel.message = "Ocurrió un problema inesperado";
      response.json(responseModel);
    }
  });
}

export async function liberarCliente(request: Request, response: Response) {
  const { CardCode } = request.params;
  let responseModel = new ResponseModel();
  try {
    let model: UsersModel = new UsersModel();
    model.action = "LiberarCliente";
    model.arg2 = CardCode || '';
    let result = await UsersProcedure(model);
    responseModel.status = 1;
    responseModel.message = "Cliente universal liberado correctamente.";
    responseModel.data = result;
    response.json(responseModel);
  } catch (e) {
    logger.error('liberarCliente => ', e);
    responseModel.message = "Ocurrió un problema inesperado.";
    response.json(responseModel);
  }
}