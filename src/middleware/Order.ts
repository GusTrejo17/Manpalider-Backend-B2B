
import {logger} from "../util/logger";
import { DatabaseService } from "../util/dataBase";
import {getTypeDocument} from '../interfaces/xml';
import moment from 'moment';
import SERVER_CONFIG from "../SERVER_CONFIG";
class Order {
     public async getStatus (doc: any, responseBody: any){
        const db = new DatabaseService();
        let baseEntry:any = null;
        let targetEntry:any = null;
        let baseType:any = null;
        let targetType:any = null;

        let responseData: any = [];

        let complete: any = true;
        try {
            // Recorrer líneas de documento al Ver Detalles
            for (let index = 0; index < responseBody.length; index++) {
                const item = responseBody[index];
                // Vverificar que exista un TrgetEntry en todas las lineas
                // if(!item.TrgetEntry && doc !== 'OINV'){
                //     complete = false;
                // }
                // Encontrar y asignar TrgetEntry
                if(!targetEntry && item.TrgetEntry){
                    targetEntry = item.TrgetEntry;
                    targetType = item.TargetType;
                }
                // Encontrar y asignar BaseEntry
                if(!baseEntry && item.BaseEntry){
                    baseEntry = item.BaseEntry;
                    baseType = item.BaseType;
                }
            }
            // Si todas las líneas tienen TrgetEntry
            if(complete){
                if(targetEntry){
                    responseData.push({
                        DocEntry: targetEntry,
                        ObjectType: targetType,
                       });
                }
                if(baseEntry){
                    responseData.push({
                        DocEntry: baseEntry,
                        ObjectType: baseType,
                    });
                }
              
                    
               while(baseEntry || targetEntry){
                    let doc = getTypeDocument(((targetType || baseType)).toString());
                    
                    let resultado:any = [];
                    const found = responseData.find((element:any) => element.targetType === targetType || element.baseType === baseType);
                    if(doc.subTable !== '' && (targetEntry || baseEntry)){
                        console.log(`SELECT TrgetEntry,TargetType,BaseEntry,BaseType FROM [${SERVER_CONFIG.SAPDB}].[dbo].[${doc.subTable}] WHERE DocEntry = ${(targetEntry || baseEntry)}`)
                        resultado= await db.Query(`SELECT TrgetEntry,TargetType,BaseEntry,BaseType FROM [${SERVER_CONFIG.SAPDB}].[dbo].[${doc.subTable}] WHERE DocEntry = ${(targetEntry || baseEntry)}`);
                        if(!resultado){
                            targetEntry = null;
                            targetType = null;
                            baseEntry = null;
                            baseType = null;
                        }else{
                            resultado = resultado.recordset[0];
                            baseEntry = resultado.BaseEntry;
                            baseType = resultado.BaseType;
                            targetEntry = resultado.TrgetEntry;
                            targetType = resultado.TargetType;
                            if(targetEntry){
                                const found = responseData.find((element:any) => element.DocEntry === targetEntry || element.ObjectType === targetType);
                        
                                if(!found){
                                    responseData.push({
                                        DocEntry: targetEntry,
                                        ObjectType: targetType,
                                    });
                                }
                            }
                            if(baseEntry){
                                const found = responseData.find((element:any) =>  element.baseEntry === baseEntry || element.ObjectType === baseType);
                        
                                if(!found){
                                    responseData.push({
                                        DocEntry: baseEntry,
                                        ObjectType: baseType,
                                    });
                                }
                            }                            
                        }
                    
                    }else{
                        targetEntry = null;
                        targetType = null;
                        baseEntry = null;
                        baseType = null;
                    }                  
                }
                
                if(doc === 'ODLN'){
                    if(responseData.length >= 3){
                        const order = responseData.find((element: any) => element.ObjectType === 17);
                        let resultado = await db.Query(`SELECT TOP 1 BaseEntry, BaseType FROM [${SERVER_CONFIG.SAPDB}].[dbo].[RDR1] WHERE DocEntry = ${(order.DocEntry)}`);
                        responseData.push({
                            DocEntry: resultado.recordset[0].BaseEntry,
                            ObjectType: resultado.recordset[0].BaseType,
                        });
                    }                    
                } else if(doc === 'OINV'){
                    if(responseData.length >= 2){
                        const delivery = responseData.find((element: any) => element.ObjectType === 15);
                        let resultado = await db.Query(`SELECT TOP 1 BaseEntry, BaseType FROM [${SERVER_CONFIG.SAPDB}].[dbo].[DLN1] WHERE DocEntry = ${(delivery.DocEntry)}`);
                        let resultado2 = await db.Query(`SELECT TOP 1 BaseEntry, BaseType FROM [${SERVER_CONFIG.SAPDB}].[dbo].[RDR1] WHERE DocEntry = ${(resultado.recordset[0].BaseEntry)}`);
                        responseData.push(
                            {
                                DocEntry: resultado.recordset[0].BaseEntry,
                                ObjectType: resultado.recordset[0].BaseType,
                            },
                            {
                                DocEntry: resultado2.recordset[0].BaseEntry,
                                ObjectType: resultado2.recordset[0].BaseType,
                            },
                        );
                    }
                }

                for (let i = 0; i < responseData.length; i++) {
                    const element = responseData[i];
                    let type = element.ObjectType;
                    element.Legend = type === 23 ? 'ACEPTADO' : type === 17 ? 'PREPARANDO' : type === 15 ? 'EMPAQUETANDO' : type === 13 ? 'FACTURADO' : type === 14 ? 'CANCELADO' : '';
                    element.Table = type === 23 ? 'OQUT' : type === 17 ? 'ORDR' : type === 15 ? 'ODLN' : type === 13 ? 'OINV' : type === 14 ? 'ORIN' : '';
                    if(element.Table !== ''){
                        let request = await db.Query(`SELECT DocDate, DocNum FROM [${SERVER_CONFIG.SAPDB}].[dbo].[${element.Table}] WHERE DocEntry = ${(element.DocEntry)}`);
                        element.DocDate = request.recordset[0].DocDate ? moment(request.recordset[0].DocDate).utc().format() : moment().utc().format('YYYY-MM-DD');
                        element.DocNum = request.recordset[0].DocNum || '';
                    }
                }
            }
        } catch (error) {
          logger.error(error);
        }
        return responseData;
    }
}

export const orderValidate = new Order();