import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";

export default async function CfdiProcedure (action: String ) : Promise<any> {
    const db = new DatabaseService();
    let data: any,status = 500;
    try {
        const result = await db
        .connect()
        .then(async (pool: any) => {
            return await pool
                .request()
                .input("action", action)
                .execute("usoCfdi");
        })
        .then((result: any) => {
        
            return  result;
        })
        .catch((err: any) => {
            logger.error("Algo salio mal en la consulta de cfdi",err);
            return  err ;
        });
        status = 200;
        data = result;
    } catch (e) {
        logger.error("Algo vamal con el cfdi",e);
    } finally {
        await db.disconnect();
    }

  return data.recordset || [];
}