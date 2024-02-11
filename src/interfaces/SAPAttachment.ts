
import {xmlRequest, xmlVentaClientes, getTypeDocument} from './xml'

class SAPAttachment {

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

    public xmlUpdAttachments = `<?xml version="1.0"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <{SOAPBody} xmlns="http://mit4.mx/">
                  <xmlBufer><![CDATA[<?xml version="1.0"?>
        <env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
          <env:Header>
            <SessionID>jkz</SessionID>
          </env:Header>
          <env:Body>
            <dis:AddObject xmlns:dis="http://www.sap.com/SBO/DIS">
              <BOM>
                <BO>
                  <AdmInfo>
                    <Object>oAttachments2</Object>
                  </AdmInfo>
                  <Attachments2/>
                  <Attachments2_Lines> 
                   {attachments}
                  </Attachments2_Lines>
                </BO>
              </BOM>
            </dis:AddObject>
          </env:Body>
        </env:Envelope>]]></xmlBufer>
                </{SOAPBody}>
              </soap:Body>
            </soap:Envelope>`;

     public replaceSapVersion(xml: any) {
        return xml.replace(/{SOAPBody}/g, this.SOAPBody);
    }
    
    public call() {
        let request:any = require('request');
        let options:any =  this.options;
        // console.log('con>XML de archivos', this.body);
        return new Promise( (resolve, reject) => {
            request(options, (error: any, response: any, body: any) => {
                    let xml2js = require('xml-js');
                    let bodyString = body.toString().replace(/env:/g, "").replace(/soap:/g, "");
                    bodyString = xml2js.xml2json(bodyString, {compact: true, spaces: 4});
                    let jsonObject = JSON.parse(bodyString);

                        resolve({status:1, data: jsonObject});
            })
        })
    }
    public setOptions() {
        this.options = {
            url: this.diServer,
            method: 'POST',
            body: this.body,
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/xml;charset=utf-8',
                'SOAPAction': this.SOAPAction
            }
        };
    }
    public updateAttachments(files: any) {
        let atchString = '';
        atchString = '<row>' +
            '<SourcePath>C:\\documentosHandel</SourcePath>' +
            '<FileName>'+files.pdfName+'</FileName>' +
            '</row>';


         let replace = this.xmlUpdAttachments.replace("{attachments}", atchString);
         return replace;

    }
  
}
export default SAPAttachment;