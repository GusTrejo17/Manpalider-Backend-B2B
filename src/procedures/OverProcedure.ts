import OverModel from "../models/OrdersModel";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function Over (model: OverModel) : Promise<any> {
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
            .input("cardCode", model.cardCode)
            .input("docNum", model.docNum)
            .execute("OverdueBill");
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