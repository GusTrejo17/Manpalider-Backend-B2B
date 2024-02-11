import CategoriesModel from "../models/CategoriesModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

/**
 * References
 *  getCategories()
 *    @param action
 *    @param business
 */
export default async function CategoriesProcedure (model: CategoriesModel) : Promise<any> {
 
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
          .execute("Categories");
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
    // const response: IResult<any> = await request.query("EXEC [dbo].[Categories] '" + model.action + "', '" + model.business + "'");
    // return (response.recordset || []);
}