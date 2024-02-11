import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function SeriesProcedure (action: any ) : Promise<any> {
    const db = new DatabaseService();
    let data: any,status = 500;
    try {
        const result = await db
        .connect()
        .then(async (pool: any) => {
            return await pool
                .request()
                .input("action", action)
                .input("business", "")
                .execute("Settings");
        })
        .then((result: any) => {
        
            return  result;
        })
        .catch((err: any) => {
            logger.error("Algo salio mal en la consulta desde serie",err);
            return  err ;
        });
        status = 200;
        data = result;
    } catch (e) {
        logger.error("Algo vamal con el serie",e);
    } finally {
        await db.disconnect();
    }

  return data.recordset || [];
}