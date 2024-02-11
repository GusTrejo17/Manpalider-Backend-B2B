import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";
import SearchModel from "../models/SearchModel";

export default async function SearchProcedure (model:SearchModel) : Promise<any> {
    const db = new DatabaseService();
    let data: any,status = 500;
    try {
        const result = await db
        .connect()
        .then(async (pool: any) => {
            return await pool
                .request()
                .input("action", model.action)
                .input("marca", model.marca)
                .input("aparato", model.aparato)
                .input("refaccion", model.refaccion)
                .input("fabricante", model.fabricante)
                .input("nombre", model.nombre)
                .input("material", model.material)

                .execute("advanceSearch");
        })
        .then((result: any) => {
            return result;
        })
        .catch((err: any) => {
            logger.error("Algo salio mal en la consulta avanzada",err);
            return  err ;
        });
        status = 200;
        data = result;
    } catch (e) {
        logger.error("Algo va mal con los busqueda avanzada",e);
    } finally {
        await db.disconnect();
    }

  return data.recordsets || [];
}