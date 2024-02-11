import { Request, Response } from "express";
import moment from "moment";
import { logger } from '../util/logger';
import { DatabaseService } from "../util/database";

const logDate = moment().format('Y-MM-DD H:m:s');

class SendController {

    public async GetSlideFront(req: Request, res: Response): Promise<void> {
        const db = new DatabaseService();
        let data: any,status = 500;
        try {
            const result = await db
            .connect()
            .then(async (pool: any) => {
                return await pool
                    .request()
                    .input("action", "GETFRONT")
                    .input("Param1", "on")
                    .input("Param2", "off")
                    .input("Param3", "on")
                    .input("Param4", "")
                    .input("Param5", "")
                    .execute("SPBanners");
            })
            .then((result: any) => {
                return  result;
            })
            .catch((err: any) => {
                logger.error("Algo salio mal en la consulta",err);
                return  err ;
            });
            status = 200;
            data = result.recordset;
        } catch (e) {
            logger.error("Algo vamal con SildeFront",e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners for front public.

    public async GetAllRecords(req: Request, res: Response): Promise<void> {
        const db = new DatabaseService();
        let data: any,status = 500;
        try {
            const result = await db
            .connect()
            .then(async (pool: any) => {
                return await pool
                    .request()
                    .input("action", "GETALLADMIN")
                    .input("Param1", "")
                    .input("Param2", "")
                    .input("Param3", "")
                    .input("Param4", "")
                    .input("Param5", "")
                    .execute("SPBanners");
            })
            .then((result: any) => {
                return  result;
            })
            .catch((err: any) => {
                logger.error("Algo salio mal en la consulta",err);
                return  err ;
            });
            status = 200;
            data = result.recordset;
        } catch (e) {
            logger.error("Algo vamal con ALL Records",e);
        } finally {
            await db.disconnect();
        }
        res.json(data);
    }// end function get banners for front admin.

    public async GetRecord(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const db = new DatabaseService();
        let data: any,status = 500;
        try {
            const result = await db
            .connect()
            .then(async (pool: any) => {
                return await pool
                    .request()
                    .input("action", "GETBANNER")
                    .input("Param1", id)
                    .input("Param2", "")
                    .input("Param3", "")
                    .input("Param4", "")
                    .input("Param5", "")
                    .execute("SPBanners");
            })
            .then((result: any) => {
            
                return  result;
            })
            .catch((err: any) => {
                logger.error("Algo salio mal en la consulta",err);
                return  err ;
            });
            status = 200;
            data = result.recordset;
        } catch (e) {
            logger.error("Algo vamal con los banners",e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners for front admin.

    public async Store(req: Request, res: Response): Promise<void> {
        const { user_id, slug, title, url, image, content, items, valid_from, valid_to, active, is_date,  order_item,section } = req.body;
        const db = new DatabaseService();
        let data: any,status = 500;
        try {
            const result = await db
            .connect()
            .then(async (pool: any) => {
                return await pool
                    .request()
                    .input("p1", user_id)
                    .input("p2", slug)
                    .input("p3", title)
                    .input("p4", url)
                    .input("p5", image)
                    .input("p6", content)
                    .input("p7", items)
                    .input("p8", valid_from === '' ? logDate : valid_from)
                    .input("p9", valid_to === '' ? logDate : valid_to)
                    .input("p10", active)
                    .input("p11", is_date)
                    .input("p12", order_item)
                    .input("p13", logDate)
                    .input("p14", section)
                    .query("INSERT INTO handel_banners (userid, slug, title, url, image, contents, items, validFrom, validTo, active, isDate, orderBanner, createdAt,section) VALUES(@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14)");
            })
            .then((result: any) => {
            
                return  result;
            })
            .catch((err: any) => {
                logger.error("Algo salio mal en la inserción",err);
                return  err ;
            });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("Algo vamal con la inserción",e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners add new element

    public async Update(req: Request, res: Response): Promise<void> {
        const { user_id, slug, title, url, image, content, items, valid_from, valid_to, active, is_date, id, order_item,section } = req.body;
        const db = new DatabaseService();
        let data: any,status = 500;
        try {
            const result = await db
            .connect()
            .then(async (pool: any) => {
                return await pool
                    .request()
                    .input("p1", user_id)
                    .input("p2", slug)
                    .input("p3", title)
                    .input("p4", url)
                    .input("p5", image)
                    .input("p6", content)
                    .input("p7", items)
                    .input("p8", valid_from === '' ? logDate : valid_from)
                    .input("p9", valid_to === '' ? logDate : valid_to)
                    .input("p10", active)
                    .input("p11", is_date)
                    .input("p12", order_item)
                    .input("p13", id)
                    .input("p14", section)
                    .query("UPDATE handel_banners SET userid=@p1, slug=@p2, title=@p3, url=@p4, image=@p5, contents=@p6, items=@p7, validFrom=@p8, validTo=@p9, active=@p10, isDate=@p11, orderBanner=@p12, section=@p14 WHERE id=@p13");
            })
            .then((result: any) => {
            
                return  result;
            })
            .catch((err: any) => {
                logger.error("Algo salio mal en la actualización",err);
                return  err ;
            });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("Algo vamal con la actualización",e);
        } finally {
            await db.disconnect();
        }

     res.json(data);
    }// end function get banners add new element

    public async Delete(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const db = new DatabaseService();
        let data: any,status = 500;
        try {
            const result = await db
            .connect()
            .then(async (pool: any) => {
                return await pool
                    .request()
                    .input("action", "DELETE")
                    .input("Param1", id)
                    .input("Param2", "")
                    .input("Param3", "")
                    .input("Param4", "")
                    .input("Param5", "")
                    .execute("SPBanners");
            })
            .then((result: any) => {
            
                return  result;
            })
            .catch((err: any) => {
                logger.error("Algo salio mal al momento de eliminar",err);
                return  err ;
            });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("Algo vamal con para eliminar",e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners for front admin.

}// end class Banner controllers

const sendController = new SendController();
export default sendController;