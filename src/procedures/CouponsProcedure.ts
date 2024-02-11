import { DatabaseService } from "../util/database";
import { logger } from "../util/logger";
import CouponsModel from "../models/CouponsModel";

export default async function CouponsProcedure (model: CouponsModel) : Promise<any> {
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
                .input("coupon", model.coupon)
                .execute("Coupons");
        })
        .then((result: any) => {
            return result;
        })
        .catch((err: any) => {
            logger.error("Algo salio mal en los cupones",err);
            return  err ;
        });
        status = 200;
        data = result;
    } catch (e) {
        logger.error("Algo va mal con los cupones",e);
    } finally {
        await db.disconnect();
    }

  return data.recordset || [];
}