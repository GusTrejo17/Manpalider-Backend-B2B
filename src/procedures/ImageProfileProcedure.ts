import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";
import ImageProfileModel from "../models/ImageProfileModel";

export default async function ImageProfileProcedure(model: ImageProfileModel) : Promise<any> {
    const db = new DatabaseService();
    let data: any,status = 500;
    
    try {
      const result = await db
        .connect()
        .then(async (pool: any) => {
          return await pool
            .request()
            .input("action", model.action)
            .input("cardCode", model.cardCode)
            .input("profileImage", model.profileImage)
            .execute("ProfilesImgs");
        })
        .then((result: any) => {
          return  result;
        })
        .catch((err: any) => {
          logger.error("Algo salio mal en la consulta de la imagen del perfil: ",err);
          return  err ;
        });
      status = 200;
      data = result;
    } catch (e) {
      logger.error("ImageProfileProcedure-->",e);
    } finally {
      await db.disconnect();
    }
  
    return data.recordset || [];
}