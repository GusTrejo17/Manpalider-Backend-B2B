import ProductsModel from "../models/ProductsModel";
import { Request, IResult, IRecordSet } from "mssql";
import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";


/**
 * References
 * 
 *  searchByKey()
 *   @param action
 *   @param business
 *   @param wareHouse
 *   @param CardCode
 *   @param key
 *   @param ItemCode
 *  searchByCategory()
 *   @param action
 *   @param business
 *   @param table
 *   @param cardCode
 *   @param initialDate
 *   @param finalDate
 *   getItemDetails()
 *   @param action
 *   @param business
 *   @param table
 *   @param cardCode
 *   @param entry
 *  getShoppingCart()
 *   @param action//findOne
 *   @param business
 *   @param table
 *   @param itemCode //shoppingCart
 *  getShoppingCart()
 *   @param action
 *   @param business
 *   @param table
 *   @param itemCode //backOrder
 */
export default async function ProductsProcedure (model: ProductsModel) : Promise<any> {
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
            .input("wareHouse", model.wareHouse)
            .input("cardCode", model.cardCode)
            .input("key", model.key || '')
            .input("itemCode", model.itemCode || '')
            .input("paginas", model.nextNumber || 0)
            .input("quantity", model.quantity || 1)
            .input("actionFilter", model.actionFilter || '')
            .input("valueFilter", model.valueFilter || '')
            .input("value2Filter", model.value2Filter || '')
            .input("navBar", model.view || '')
            .input("topItems", model.topItems || '')
            .input("sortFilter", model.sortFilter || '')
            .input("subCat1", model.subCat1 || '')
            .input("subCat2", model.subCat2 || '')
            .input("subCat3", model.subCat3 || '')
            .execute("Products");
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
    // const response: IResult<any> = await request.query("EXEC [dbo].[Products] '" + model.action + "', '" + model.business + "', '" + model.wareHouse + "', '" + model.cardCode + "', '" + model.key + "',  '" + model.itemCode + "'");
    // return (response.recordset || []);
}