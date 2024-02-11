import UsersModel from "../models/UsersModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function SellerProcedure(model: UsersModel): Promise<IRecordSet<any>> {
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
            .input("arg1", model.arg1) 
            .input("paginas", model.nextNumber || 0) 
            .execute("Seller");
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