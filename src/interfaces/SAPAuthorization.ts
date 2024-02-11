import moment from "moment";
import axios from 'axios';
import {xmlRequest, xmlVentaClientes, getTypeDocument,xmlSearch,updateDocument} from './xml'
import {logger} from "../util/logger";

const responseFormat = (status = 0, message = "", data = null) => {
    return {
        status: status,
        message: message,
        data: data
    }
};

class SAPAuthorization {

    public xml: any;
    public config: any;
    public options: any;
    public document: any;
    public action: any;

    public diServer: any;
    public SOAPBody: any;
    public SOAPResponse: any;
    public SOAPResult: any;
    public SOAPAction: any;

    public body: any;
    public checks: any;
    public header: any;
    public service: any;

    public DocEntry: any;
    public query: any;

    constructor(config: any) {
        
        this.config = config;
        this.xml = xmlRequest;
        this.diServer = this.config.sap_url_server;
        this.SOAPBody = this.config.sap_soap_body;
        this.SOAPResponse = this.config.sap_soap_response;
        this.SOAPResult = this.config.sap_soap_result;
        this.SOAPAction = this.config.sap_soap_action;
    }
    public searchXML(data:any){
        let docTypeDestino = getTypeDocument(data.destino);
        this.service = docTypeDestino.service;
        this.DocEntry = data.docEntry;
        this.document = xmlSearch;
        this.header = "";
        this.action = "GetByParams";
        this.body = "<DocEntry>"+ data.docEntry + "</DocEntry>";
    }
    public updateXML(Document:any, destino:any){
        let docTypeDestino = getTypeDocument(destino);
        this.document = updateDocument;
        var xml2js = require('xml-js');
        var bodyString : any = xml2js.json2xml(Document, {compact: true, ignoreComment: true, spaces: 0});
        bodyString = bodyString.toString().replace(/\r/g,"");
        this.service = docTypeDestino.service;
        this.header = "";
        this.body = bodyString;
        this.action = "Update";
        this.query = "";
    }

    public createXML(data: any) {
        let document = getTypeDocument(data.header.objType);        
        
        this.action = "GetByParams";
        this.document = xmlVentaClientes;
        this.service = data.header.service 
        this.header = this.getHeader(data);
        this.body = this.getBody(data);
       

    }

    public getHeader(data: any) {
    
        let header = `
                
        `;
       
    
        return header;
    }

    public getBody(data: any) {
        let body = `
                    
        `;
      
        body = body.replace('{LineTotal}', true ? `<>${0}</>` : '' );

        // //console.log("body", body);
        return body;
    }

    

    public replaceSapVersion() {
        this.xml = this.xml.replace(/{{SOAPBody}}/g, this.SOAPBody);
        this.xml = this.xml.replace(/{{action}}/g, this.action);
        this.xml = this.xml.replace(/{{document}}/g, this.document);
        this.xml = this.xml.replace(/{{serviceOption}}/g, this.service);
        this.xml = this.xml.replace(/{{header}}/g, this.header);
        this.xml = this.xml.replace(/{{body}}/g, this.body);
    }

    public setOptions() {
        this.replaceSapVersion();
        this.options = {
            url: this.diServer,
            method: 'POST',
            data: this.xml,
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': this.SOAPAction
            }
        };
    }

    public async createCall() {
        let options: any = this.options;
        try {
            // console.log('con>',this.xml)
            let response: any = await axios.request(options);
            // console.log('con>response',response);
            logger.error("response DiServer :", response.status, ' ',  response.statusText);
            let xml2js = require('xml-js');
            let bodyString = xml2js.xml2json(response.data, {compact: true, spaces: 1});
            let jsonObject = JSON.parse(bodyString);
            jsonObject = jsonObject['soap:Envelope']['soap:Body'][this.SOAPResponse][this.SOAPResult];
            // console.log("Createcall from try",jsonObject);

            return this.getResponseDiServer(jsonObject);
        } catch (e) {
            logger.error("response catch DiServer :", e.status, ' ', e.data);
            let xml2js = require('xml-js');
            let bodyString = xml2js.xml2json(e.data, {compact: true, spaces: 1});
            let jsonObject = JSON.parse(bodyString);

            jsonObject = jsonObject['soap:Envelope']['soap:Body'][this.SOAPResponse][this.SOAPResult];
            ////console.log("Createcall from catch",jsonObject);
            return this.getResponseDiServer(jsonObject);
        }
    }
    public async createCallSearch() {
        let options: any = this.options;
        try {
            let response: any = await axios.request(options);
            logger.error("response DiServer :", response.status, ' ',  response.statusText);
            let xml2js = require('xml-js');
            let bodyString = xml2js.xml2json(response.data, {compact: true, spaces: 1});
            // console.log("con<<< bodystring from try",bodyString);
            let jsonObject = JSON.parse(bodyString);
            jsonObject = jsonObject['soap:Envelope']['soap:Body'][this.SOAPResponse][this.SOAPResult];
            // console.log("Createcall from try",jsonObject);

            return jsonObject;
        } catch (e) {
            logger.error("response catch DiServer :", e.status, ' ', e.data);
            let xml2js = require('xml-js');
            let bodyString = xml2js.xml2json(e.data, {compact: true, spaces: 1});
            let jsonObject = JSON.parse(bodyString);

            jsonObject = jsonObject['soap:Envelope']['soap:Body'][this.SOAPResponse][this.SOAPResult];
            ////console.log("Createcall from catch",jsonObject);
            return this.getResponseDiServer(jsonObject);
        }
    }
   

    public getResponseDiServer(body:any){
        
        const data = {docEntry: null, status: 0};
        ////console.log("getResponceDiServer",data);
        if(this.action === 'Add'){
            try {
                data.docEntry = body['DocumentParams']['DocEntry']._text;
                data.status = 1;
            }catch (e) {
                logger.error(e);
                data.docEntry  = null;
                data.status = 0;
            }
        }
        return data;
    }

    public xmlUpdate: any = `<?xml version="1.0"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <{SOAPBody} xmlns="http://mit4.mx/">
                  <xmlBufer><![CDATA[<?xml version="1.0"?>
    <env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
      <env:Header>
        <SessionID>jkz</SessionID>
      </env:Header>
      <env:Body>
        <dis:UpdateObject xmlns:dis="http://www.sap.com/SBO/DIS">
          <BOM>
            <BO>
              <AdmInfo>
                <Object>{serviceOptions}</Object>
              </AdmInfo>
              <QueryParams>
                <DocEntry>{DocEntry}</DocEntry>
              </QueryParams>
              <Documents>
                    <row>
                        {header}
                    </row>
                </Documents>
                <Document_Lines>
                        {body}
                </Document_Lines>
            </BO> 
          </BOM>
        </dis:UpdateObject>
      </env:Body>
    </env:Envelope>]]></xmlBufer>
                </{SOAPBody}>
              </soap:Body>
            </soap:Envelope>`;

    public updateOrdersStatus(data:any,status:any){
        this.action = "UpdateObject";
        this.query = "";
        this.DocEntry = data.header.DocEntry;
        this.service = 'oOrders';
        this.header = this.getHeaderStatusOrder(status);
        this.body = "";   
    }

    private getHeaderStatusOrder(data: any) {

        let header = `<U_FMB_Estado>C</U_FMB_Estado>`;    
        
        return header;
    }

    public replaceSapVersionUpdate() {
        this.xml =  this.xmlUpdate.replace(/{SOAPBody}/g, this.SOAPBody);
        this.xml =  this.xml.replace(/{header}/g, this.header);
        this.xml =  this.xml.replace(/{body}/g, this.body);
        this.xml =  this.xml.replace(/{DocEntry}/g, this.DocEntry);
        this.xml =  this.xml.replace(/{actionFirme}/g, this.action);
        this.xml =  this.xml.replace(/{serviceOptions}/g, this.service);
        this.xml =  this.xml.replace(/{query}/g, this.query);
    }

    public Createcall() {
        let request:any = require('request');
        let options:any =  this.options;
        let version  = "v91";
   
        //console.log('con> XML', this.xml);
        return new Promise( (resolve, reject) => {
            request(options, (error: any, response: any, body: any) => {
               
              
                if (!error && response.statusCode == 200) {
                    let xml2js = require('xml-js');
                    
                    let bodyString = body.toString().replace(/env:/g, "").replace(/soap:/g, "");
                    bodyString = xml2js.xml2json(bodyString, {compact: true, spaces: 4});
                    let jsonObject = JSON.parse(bodyString);
                    // //console.log(JSON.stringify(jsonObject));
                    try {
                        var response: any;
                     response = jsonObject.Envelope.Body;

                        switch (version) {
                            case "v91":
                                response = response.RegisterNewDocumentsResponse.RegisterNewDocumentsResult;
                                
                                break;
                            default:
                                response = null;
                                break;
                        }

                        resolve(responseFormat(1, "response",response));

                    }catch (e) {
                        logger.error("SAPFirme-> Createcall-> ",e);
                        reject(responseFormat(0, "Error En La Petición"));
                    }
                }else{
                    let xml2js = require('xml-js');
                    
                    let bodyString = body.toString().replace(/env:/g, "").replace(/soap:/g, "");
                    bodyString = xml2js.xml2json(bodyString, {compact: true, spaces: 4});
                    let jsonObject = JSON.parse(bodyString);
                    try {
                        var response: any;                        
                        response = jsonObject.Envelope.Body;
                      
                        resolve(responseFormat(1, "response",response));
                    }catch (e) {
                        logger.error("SAPFirme-> Createcall-> ",e);
                        resolve(responseFormat(0, "Error En La Petición"));
                    }
                }
            })
        })
    }

}

export default SAPAuthorization;