import NewsLetterModel from "../models/NewsLetterModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function ProductsProcedure(model: NewsLetterModel): Promise<IRecordSet<any>> {
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
            .input("userEmail", model.userEmail)         
            .execute("NewsLetter");
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