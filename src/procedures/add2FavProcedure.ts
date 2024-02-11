import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";
import addToFavorites from "../models/add2FavModel";

export default async function add2FavProcedure(model: addToFavorites) : Promise<any> {
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
            .input("itemCode", model.itemCode)
            .input("params", model.params)
            .execute("SP_Favorites");
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
      logger.error("ADD TO FAVORITES-->",e);
    } finally {
      await db.disconnect();
    }
  
    return data.recordset || [];
}