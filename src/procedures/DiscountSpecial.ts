import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";
import moment from "moment";

export default async function DiscountSpecial (CardCode:any, ItemCode:any, Quantity:any) : Promise<any> {
    const db = new DatabaseService();
    let data: any,status = 500;
    let today = moment(new Date()).format('YYYYMMDD');
    try {
      const result = await db
        .connect()
        .then(async (pool: any) => {
          return await pool
            .request()
            .input("BaseDatos", '')
            .input("Cliente", CardCode || null)
            .input("Item", ItemCode || null)
            .input("Cantidad", Quantity || null)
            .input("Fecha", today)
            .input("PrintQuery", 0)
            .execute("DiscountSpecial");
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
        logger.error("DESCUENTOS ESPECIALES: ", e);
    } finally {
      await db.disconnect();
    }
  
    return data.recordset || [];
}