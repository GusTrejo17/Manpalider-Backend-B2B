import PointsHistoryModel from "../models/PointsHistoryModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function ProductsProcedure(model: PointsHistoryModel): Promise<IRecordSet<any>> {
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
            .input("DocEntry", model.DocEntry)
            .input("DocType", model.DocType)
            .input("DocNum", model.DocNum)
            .input("CardCode", model.CardCode)
            .input("Total", model.Total)
            .input("Type", model.Type)     
            .input("DocDate", model.DocDate)
            .input("UsedPoints", model.UsedPoints)
            .execute("PointsHistory");
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

    // const request: Request = new Request();    
    // const results: IResult<any> = await request.query("EXEC [dbo].[Users] '" + model.action + "', '" + model.business + "', '" + model.arg1 + "'");
    // return results.recordset;
}