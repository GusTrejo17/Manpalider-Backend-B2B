import { Request, Response } from "express";
import { helpers } from '../middleware/helper';
import ResponseModel from "../models/ResponseModel";
import { promises as fs } from 'fs';
import formidable from 'formidable';
import moment from 'moment';
import EmailProcedure from "../procedures/EmailProcedure";
import { logger } from "../util/logger";

export async function sendDistributorData(request: Request, response: Response) {
    const {representanteLegal,phone,email,domicilioFile,idFiscalFile,actaConstFile,ineFile} = request.body;
    const responseModel = new ResponseModel();
    let GlobalSap = JSON.parse(global.sap_config);

    const emailDev= 'soporte1fmb@gmail.com';
    const emailProd= 'vanessa.lopez@diasa.net'

    try {
                let route = GlobalSap[0].rutaATC;
                let files:any = []
                let domicilioObj = {
                    filename:domicilioFile,
                    path: route + domicilioFile
                }
                let fiscalObj = {
                    filename:idFiscalFile,
                    path: route + idFiscalFile
                }
                let ineObj = {
                    filename:ineFile,
                    path: route + ineFile
                }
                files.push(domicilioObj,fiscalObj,ineObj)
                if(actaConstFile !== ''){
                    let actaConstObj = {
                        filename:actaConstFile,
                        path: route + actaConstFile
                    }
                    files.push(actaConstObj)
                }
                let msghtml = ''
                const infoEmail = {
                    representanteLegal,
                    email,
                    phone,
                }
    
                msghtml = contextEmailDaysPlus(infoEmail);
                let dataMail = await EmailProcedure("getCreate");
                let bcc;
                if (dataMail[0].validateCreateBCC === 1) {
                    bcc = dataMail[0].createBCC;
                } else {
                    bcc = "";
                }
                let subject = dataMail[0].createSubject;
                subject = "Nueva solicitud de distribuidor";
                // let sendMail = await helpers.sendEmail('desarrollo5@fmsolutions.mx', "desarrollo5@fmsolutions.mx", bcc, subject, msghtml, { filename: fileNameMail, path: fullRouteName });
                let sendMail = await helpers.sendEmail(email, emailProd, emailDev, subject, msghtml,files);

                responseModel.message = 'Te contactaremos pronto';
                responseModel.status = 1;
                response.json(responseModel);
    } catch (error) {
        logger.error("sendDistributorData--->>"+error);
        responseModel.message = 'Catch error';
        responseModel.status = 0;
        response.json(responseModel)
    }
}

function contextEmailDaysPlus(data: any) {
    let msghtml = `<html>


    <head>
    <meta charset="UTF-8">
    </head>
    
    
    <body style="margin: 0px; padding: 0px; width: 100%!important; background-color: #e0e0e0;">
    <meta content="text/html; charset=iso-8859-1" http-equiv="Content-Type">
    <link href="https://cms.chewy.com/fonts/roboto/email-font.css" rel="stylesheet" type="text/css">
    <style type="text/css">
    a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
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
    padding: 0px !important;
    width: 100%;
    margin-right: auto;
    margin-left: auto;
    }
    
    
    html,
    body {
    margin: 0px;
    padding: 0px !important;
    }
    
    
    table,
    td,
    th {
    border-collapse: collapse;
    border-spacing: 0px;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
    }
    
    
    div,
    p,
    a,
    li,
    td {
    -webkit-text-size-adjust: none;
    }
    
    
    * {
    -webkit-text-size-adjust: none;
    }
    
    
    img {
    display: block !important;
    }
    
    
    .ReadMsgBody {
    width: 100%;
    }
    
    
    .ExternalClass p,
    .ExternalClass span,
    .ExternalClass font,
    .ExternalClass td,
    .ExternalClass div {
    line-height: 100%;
    margin: 0px;
    padding: 0px;
    }
    
    
    .ExternalClass {
    width: 100%;
    }
    
    
    span.MsoHyperlink {
    mso-style-priority: 99;
    color: inherit;
    }
    
    
    span.MsoHyperlinkFollowed {
    mso-style-priority: 99;
    color: inherit;
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
    color: #999999 !important;
    text-decoration: none !important;
    }
    
    
    
    
    .timeline {
    position: relative;
    margin-left: 10%;
    margin-top: 40px;
    margin-bottom: 40px;
    }
    
    
    
    
    .timeline li {
    list-style: none;
    float: left;
    width: 20%;
    position: relative;
    text-align: center;
    text-transform: uppercase;
    font-family: 'Dosis', sans-serif;
    color: #F1F1F1;
    }
    
    
    .timeline li img {
    list-style: none;
    float: left;
    width: 20%;
    position: absolute;
    text-align: center;
    margin-top: -60;
    margin-left: 23;
    }
    
    
    ul:nth-child(1) {
    color: #09488F;
    }
    
    
    
    
    .timeline li:before {
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
    
    
    
    
    .timeline li:after {
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
    
    
    
    
    .timeline li:first-child:after {
    content: none;
    }
    
    
    /*texto que va debajo de la lista activa*/
    .timeline li.active {
    color: #09488F;
    }
    
    
    /*texto que va dentro del circulo activo*/
    .timeline li.active:before {
    background: #09488F;
    color: #09488F;
    }
    
    
    
    
    .timeline li.active+li:after {
    background: #09488F;
    }
    
    
    
    
    div,
    button {
    margin: 0 !important;
    padding: 0;
    display: block !important;
    }
    
    
    @media screen and (max-width: 600px) and (min-width: 480px) {
    .scale {
    width: 100% !important;
    min-width: 1px !important;
    max-width: 600px !important;
    height: auto !important;
    max-height: none !important;
    }
    }
    
    
    @media (max-width: 480px) {
    .scale {
    width: 100% !important;
    min-width: 1px !important;
    max-width: 480px !important;
    height: auto !important;
    max-height: none !important;
    }
    
    
    .scale-480 {
    width: 100% !important;
    min-width: 1px !important;
    max-width: 480px !important;
    height: auto !important;
    max-height: none !important;
    }
    
    
    .stack {
    display: block !important;
    width: 100% !important;
    }
    
    
    .hide {
    display: none !important;
    width: 0px !important;
    height: 0px !important;
    max-height: 0px !important;
    padding: 0px 0px 0px 0px !important;
    overflow: hidden !important;
    font-size: 0px !important;
    line-height: 0px !important;
    }
    
    
    .ship-text {
    padding: 12px 0px 12px 0px !important;
    font-size: 12px !important;
    line-height: 120% !important;
    letter-spacing: 0px !important;
    }
    
    
    .logo-box {
    padding: 10px 0px 10px 0px !important;
    }
    
    
    .headline {
    padding: 25px 25px 10px 25px !important;
    font-size: 30px !important;
    line-height: 110% !important;
    letter-spacing: 0px !important;
    }
    
    
    .reviews {
    padding: 20px 10px 10px 10px !important;
    }
    
    
    .copy {
    font-size: 12px !important;
    line-height: 16px !important;
    padding: 5px 10px 0px 10px !important;
    }
    
    
    .product {
    font-size: 12px !important;
    }
    
    
    .cta {
    width: 130px !important;
    height: auto !important;
    }
    
    
    .contact-pad {
    padding: 20px 0px 20px 0px !important;
    }
    
    
    .contact-text {
    font-size: 14px !important;
    line-height: 120% !important;
    }
    
    
    .trust-pad {
    padding: 10px !important;
    }
    
    
    /* Custom CSS */
    .mob-br {
    display: block !important;
    }
    
    
    .pr {
    padding: 0px 0px 0px 0px !important;
    }
    }
    
    
    @media (max-width: 400px) {
    .trust-pad {
    padding: 10px 0px !important;
    }
    
    
    .mob-br-400 {
    display: block !important;
    }
    
    
    .ship-text {
    font-size: 11px !important;
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
    <table align="center" border="0" cellpadding="0" cellspacing="0"
    style="min-width: 600px; width: 600px;" width="600" class="scale">
    <tbody>
    <tr>
    <td bgcolor="#FFFFFF" align="center" valign="top">
    <table align="center" border="0" cellpadding="0" cellspacing="0"
    style="min-width: 600px; width: 600px;" width="600"
    class="scale">
    <tbody>
    <tr>
    <td class="logo-box" width="100%" align="center"
    style="background-color: #000; padding: 25px 0px 25px 0px;"
    bgcolor="#008af0">
    <a style="text-decoration: none;"
    href="http://diasa.net/" target="_blank">
    <img style="width: 100%; max-width: 150px; height: auto; max-height: none; margin: 0px auto;"
    src="https://1.bp.blogspot.com/-RNYvlquHGT8/YQ7e5pr8ciI/AAAAAAAAAac/wkxgem7uHoIpakfjF9p98IymTYQO5GxrACLcBGAsYHQ/w945-h600-p-k-no-nu/DIASA.png"
    width="480" height="46" border="0">
    </a>
    </td>
    </tr>
    <tr>
        <td style=" color: #000000;line-height: 25px;font-weight: bold;mso-line-height-rule: exactly;text-align: justify;padding: 20px 20px 20px 20px; text-align: center;" class="copy">
            <p style="font-size: 28px; text-align:center; color: #000000; text-decoration:none;">Solicitud de distribuidor</p>
        </td>
    </tr>
    <tr>
    <td style=" color: #000000;font-size: 15px;line-height: 25px;font-weight: bold;mso-line-height-rule: exactly;text-align: justify;padding: 20px 20px 30px 20px;" align="center" class="copy">
    <p style="
    color: #000000;
    text-decoration: none;
    ">${data.representanteLegal ? 'Representante legal: ' + data.representanteLegal : 'Nombre: ' + data.name}</p>
    <p style="font-weight: bold; font-size: 15px">Email: <span style="font-weight: normal;">${data.email}</span></p>
    <p style="font-weight: bold; font-size: 15px">Teléfono: <span style="font-weight: normal;">${data.phone}</span></p>
    </td>
    </tr>
    <tr>
    <td>
    <table border="0" cellpadding="0" cellspacing="0"
    style="min-width: 600px; width: 600px; background-color: #008af0;"
    width="600" class="scale">
    <tbody>
    <tr>
    <td width="100%" align="center"
    valign="middle"
    style="vertical-align: middle;">
    <table cellpadding="0"
    cellspacing="0" border="0">
    <tbody>
    <tr>
    <td style="padding: 40px 0px 40px 0px;"
    class="contact-pad"
    align="center">
    <table
    cellpadding="0"
    cellspacing="0"
    border="0">
    <tbody>
    <tr>
    <td style="padding: 0px 7px 0px 0px;"
    align="center"
    width="27">
    <a style="text-decoration: none; color: #ffffff;"
    href="http://diasa.net/contacto/"
    target="_blank"
    rilt="ContactUs_Icon"><img
    style="display: inline;"
    src="https://1.bp.blogspot.com/-VoID1BgvhrY/YRGMjLGW24I/AAAAAAAAAbE/mWax9GkDfJsDgCObf6geHCCP5FbyftsZACLcBGAsYHQ/s20/telefono_Mesa%2Bde%2Btrabajo%2B1.png"
    width="20"
    height="20"
    alt=""
    border="0"></a>
    </td>
    <td style="font-family: 'RobotoBold', Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center;"
    class="contact-text"
    align="center">
    <a style="text-decoration: none; color: #ffffff;"
    href="http://diasa.net/contacto/"
    target="_blank"
    rilt="ContactUs_Text">
    Llámanos
    al
    (81)
    1253
    3080
    </a>
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
    <tr>
    <td>
    <table align="center" border="0" cellpadding="0"
    cellspacing="0"
    style="background-color: #ffffff; min-width: 600px; width: 600px;"
    width="600" class="scale">
    <tbody>
    <tr>
    <td style="padding:21px 0 21px;">
    <table align="center"
    style="margin:0 auto;"
    cellpadding="0" cellspacing="0">
    <tbody>
    <tr>
    <td class="active-i">
    <a style="text-decoration:none;"
    href="https://www.facebook.com/DiasaAbrasivosyHerramientas"
    target="_blank">
    <img src="https://blogger.googleusercontent.com/img/a/AVvXsEgde4jxkeChupZEDSxVmwtK3r2K5tCzWQziQqM2KNVIP3vardtmFJQSl5YReE7aDn368cdOgyucSJ0RBZp9Id7MS-rtno79fbYGtZK8Z9EtPKxB-N4s-b9Im7Hvm4RThFC4AJGxbPdkSuE9ujwp931J6NpYHWEtLz8pSHiLmCIEM87LL5EPYiftoVnqlw=s320"
    width="30"
    style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;"
    alt="fb">
    </a>
    </td>
    <td width="20"></td>
    <td class="active-i">
    <a style="text-decoration:none;"
    href="https://wa.me/message/Z5RDIDIEZBJ2I1"
    target="_blank">
    <img src="https://blogger.googleusercontent.com/img/a/AVvXsEjqaqX5ldiIPbcp5NTJMpyEGGv5-UKLAOqQ0gBfsxFM_EY9BfVRlpc4N-BH7O93dKuJHlUB7q0fjDMN4Tb953KRDYohHn4F3JMznQNheMMTdeZhataZ-1VWc8U0YicOuo-3ay0PBVAURVD-xtcm5C3Qay064Fmh9KPjj5oINGSjO8kLIdl3eTLJAxmkEg=s320"
    width="30"
    style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;"
    alt="ig">
    </a>
    </td>
    <td width="20"></td>
    <td class="active-i">
    <a style="text-decoration:none;"
    href="https://www.linkedin.com/company/diasaabrasivosyherramientas"
    target="_blank">
    <img src="https://blogger.googleusercontent.com/img/a/AVvXsEjjRyYybHb4R6-HFrss9Uqf0pVz16Vb5tGPkdjJ1PYynwfFaw7n7WgLi6GaqufMLYqkwUJrUVvGNcNcwQEhcK3Oc4ldlXfW-bWZztlLDp09QtfvSjr0ekF_oEExjoW8aVVMwr7Cfq7v4SJQ44dXybk77uoYZih3BSM9SVQnYXmEJYCNouXHJmoXDrZQkg=s512"
    width="30"
    style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;"
    alt="tw">
    </a>
    </td>
    <td width="20"></td>
    <td class="active-i">
    <a style="text-decoration:none;"
    href="https://www.youtube.com/@DIASAMTY"
    target="_blank">
    <img src="https://blogger.googleusercontent.com/img/a/AVvXsEh0Hl8ESN5td3FWq1e6FkjZck1H_RPmy7MuFEU5Y6HQuFnATwuwci2ot51JNOCWplh9M13s7R_AB7-Lw3dHMl6pkoS-GdW9QeTXqVBqxDDgM3GEPCY1jgjJGlI55uObZlWyFUidKSkGCuWNO0jxR27PK-Kwze41WjrbJb3F3w0Ywaqg2aT8mu60nnjueA=s512"
    width="30"
    style="font:13px/20px Roboto, Arial, Helvetica, sans-serif; color:#fff; vertical-align:top;"
    alt="tw">
    </a>
    </td>
    </tr>
    </tbody>
    </table>
    </td>
    </tr>
    <tr>
    <td valign="top">
    <table border="0" cellpadding="0"
    cellspacing="0"
    style="width: 100%;"
    width="100%">
    <tbody>
    <tr>
    <td
    style="padding: 0px 20px 7px 20px; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #999999; text-align: center; line-height: 100%; mso-line-height-rule: exactly;">
    
    
    
    
    <span
    class="footerLink">
    
    
    
    
    © 2023. Todos
    los
    derechos
    reservados.</span>
    
    
    
    
    <br>
    <br>
    <a href="http://diasa.net/"
    style="color:#999999; text-decoration: underline;"
    target="_blank">diasa.net</a>
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
    
    
    </html>
    
    `;
    return msghtml;
}
