import OrdersModel from "../models/OrdersModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";


/**
 * References
 *  createDocuments()
 *   @param action
 *   @param business
 *   @param table
 *   @param entry
 *  orders()
 *   @param action
 *   @param business
 *   @param table
 *   @param cardCode
 *   @param initialDate
 *   @param finalDate
 *   @param docNum
 *  order()//getOrderHeader
 *   @param action
 *   @param business
 *   @param table
 *   @param cardCode
 *   @param entry
 *  order()//get OrderBody
 *   @param action
 *   @param business
 *   @param table
 *   @param entry 
 */
export default async function OrdersProcedure (model: OrdersModel) : Promise<any> {
    const db = new DatabaseService();
    let data: any,status = 500;
    try {
      const result = await db
        .connect()
        .then(async (pool: any) => {
          return await pool
            .request()
            .input("action", model.action)
            .input("business", model.business)
            .input("entry", model.docEntry)
            .input("table", model.table)
            .input("cardCode", model.cardCode)
            .input("initialDate", model.initialDate)
            .input("finalDate", model.finalDate)
            // .input("docNum", model.docNum)
            .execute("Orders");
        })
        .then((result: any) => {
          
          return  result;
        })
        .catch((err: any) => {
          logger.error(err);
          return  err ;
        });
      status = 200;
      data = result;
    } catch (e) {
      logger.error(e);
    } finally {
      await db.disconnect();
    }
  
    return data.recordset;

    // const request: Request = new Request();
    // const response: IResult<any> = await request.query("EXEC [dbo].[Orders] '" + model.action + "', '" + model.business + "', '" + model.docEntry + "', '" + model.table + "', '" + model.cardCode + "', '" + model.initialDate + "', '" + model.finalDate + "'");
    // return (response.recordset);
}