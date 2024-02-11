import CatalogsModel from "../models/CatalogsModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

/**
 * References
 *  getFlete()
 *   @param action
 *   @param business
 *  getCountries()
 *   @param action
 *   @param business
 *  getStates()
 *   @param action
 *   @param business
 *  getTaxes()
 *   @param action
 *   @param business
 *   @param code
 *  getPackageStore()
 *   @param action
 *   @param business
 *   @param code
 */
 export default async function CatalogsProcedure(model: any): Promise<any> {
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
          .input("code", model.code)
          .input("itemCode", model.itemCode)
          .execute("Catalogs");
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

  return data.recordset|| [];
 // return data;

  // const request: Request = new Request();
  // const response: IResult<any> = await request.query(
  //   "EXEC [dbo].[Catalogs] '" +
  //     model.action +
  //     "', '" +
  //     model.business +
  //     "', '" +
  //     (model.code || 0) +
  //     "'"
  // );
 
}

