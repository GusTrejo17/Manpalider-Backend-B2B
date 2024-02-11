import PointsHistoryModel from "../models/PointsHistoryModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function ProductsProcedure(action: any, itemCode : any, cardCode: any): Promise<IRecordSet<any>> {
    const db = new DatabaseService();
    let data: any,status = 500;
    try {      
      const result = await db
        .connect()
        .then(async (pool: any) => {
          return await pool
            .request()
            .input("action", action)
            .input("itemCode", itemCode)
            .input("cardCode", cardCode)
            .execute("SP_Raiting");
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
  
    return data.recordset || [];
}