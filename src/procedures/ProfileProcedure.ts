import ProfileModel from "../models/ProfileModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function ProfileProcedure(
  model: ProfileModel
): Promise<IRecordSet<any>> {

  const db = new DatabaseService();
  let data: any,
    status = 500;
  try {
    const result = await db
      .connect()
      .then(async (pool: any) => {
        
        return await pool
          .request()
          .input("action", model.action)
          .input("business", model.business)
          .input("user_id", model.cardCode)
          .input("id", model.id || 0)
          .input("favorites", model.favorites)
          .input("shoppingCart", model.shoppingCart)
          .input("backOrder", model.backOrder)
          .input("localstorage", model.localStorageFront)
          .execute("Profiles");
      })
      .then((result: any) => {
        return result;
      })
      .catch((err: any) => {
        logger.error(err);
        return err;
      });
    status = 200;
    data = result;
  } catch (e) {
    logger.error(e);
  } finally {
    await db.disconnect();
  }
  if (model.action === "getAddresses") {
    return data.recordset;
  }
  return data.recordset[0] || [];

  // const request: Request = new Request();
  //  const results: IResult<any> = await request.query("EXEC [dbo].[Profiles] '" + model.action + "', '" + model.business + "', '" + (model.id || 0) + "', '" + model.cardCode + "', '" + model.favorites + "', '" + model.shoppingCart + "', '" + model.backOrder + "'");
  // if(model.action === 'getAddresses') return results.recordset;
  // return results.recordset[0];
}
