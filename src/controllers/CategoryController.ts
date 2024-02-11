import { Request, Response } from "express";
import moment from "moment";
import { logger } from '../util/logger';
import { DatabaseService } from "../util/database";

const logDate = moment().format('Y-MM-DD H:m:s');

class SendController {

    public async GetSlideFront(req: Request, res: Response): Promise<void> {
        const db = new DatabaseService();
        let data: any, status = 500;
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
                        .execute("SPCategories");
                })
                .then((result: any) => {
                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> GetSlideFront -> %o", err);
                    return err;
                });
            status = 200;
            data = result.recordset;
        } catch (e) {
            logger.error("CategoryController-> GetSlideFront -> %o", e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners for front public.

    public async GetAllRecords(req: Request, res: Response): Promise<void> {
        const db = new DatabaseService();
        let data: any, status = 500;
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
                        .execute("SPCategories");
                })
                .then((result: any) => {
                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> GetAllRecords-> %o", err);
                    return err;
                });
            status = 200;
            data = result.recordset;
        } catch (e) {
            logger.error("CategoryController-> GetAllRecords-> %o", e);
        } finally {
            await db.disconnect();
        }
        res.json(data);
    }// end function get banners for front admin.

    public async GetRecord(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const db = new DatabaseService();
        let data: any, status = 500;
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
                        .execute("SPCategories");
                })
                .then((result: any) => {

                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> GetRecord-> %o", err);
                    return err;
                });
            status = 200;
            data = result.recordset;
        } catch (e) {
            logger.error("CategoryController-> GetRecord-> %o", e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners for front admin.

    public async Store(req: Request, res: Response): Promise<void> {
        const { user_id, slug, title, image, is_date, valid_from, valid_to, order_Banner, active, createdAt, updatedAt, category } = req.body;
        
        const db = new DatabaseService();
        let data: any, status = 500;
        try {
            const result = await db
                .connect()
                .then(async (pool: any) => {
                    return await pool
                        .request()
                        .input("p1", user_id)
                        .input("p2", slug)
                        .input("p3", title)
                        .input("p4", image)
                        .input("p5", is_date)
                        .input("p6", valid_from === '' ? logDate : valid_from)
                        .input("p7", valid_to === '' ? logDate : valid_to)
                        .input("p8", order_Banner)
                        .input("p9", active)
                        .input("p10", createdAt)
                        .input("p11", updatedAt)
                        .input("p12", category)
                        .query("INSERT INTO handel_categories (userId, slug, title, image, isDate, validFrom, validTo, orderBanner, active, createdAt, updatedAt, category) VALUES(@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12)");
                })
                .then((result: any) => {

                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> Store-> %o", err);
                    return err;
                });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("CategoryController-> Store-> %o", e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners add new element

    public async Update(req: Request, res: Response): Promise<void> {
        const { user_id, slug, title,image,is_date, valid_from, valid_to,order_Banner, active, createdAt,updatedAt,category, id } = req.body;
        
        const db = new DatabaseService();
        let data: any, status = 500;
        try {
            const result = await db
                .connect()
                .then(async (pool: any) => {
                    return await pool
                        .request()
                        .input("p1", user_id)
                        .input("p2", slug)
                        .input("p3", title)
                        .input("p4", image)
                        .input("p5", is_date)
                        .input("p6", valid_from === '' ? logDate : valid_from)
                        .input("p7", valid_to === '' ? logDate : valid_to)
                        .input("p8", order_Banner)
                        .input("p9", active)
                        .input("p10", createdAt)
                        .input("p11", updatedAt)
                        .input("p12", category)
                        .input("p13", id)
                        .query("UPDATE handel_categories SET userId=@p1, slug=@p2, title=@p3, image=@p4, isDate=@p5, validFrom=@p6, validTo=@p7, orderBanner=@p8, active=@p9, createdAt=@p10, updatedAt=@p11, category=@p12 WHERE id=@p13");
                })
                .then((result: any) => {

                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> Update-> %o", err);
                    return err;
                });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("CategoryController-> Update-> %o", e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners add new element

    public async Delete(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const db = new DatabaseService();
        let data: any, status = 500;
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
                        .execute("SPCategories");
                })
                .then((result: any) => {

                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> Delete-> %o", err);
                    return err;
                });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("CategoryController-> Delete-> %o", e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }// end function get banners for front admin.

    public async getAllCategories(req: Request, res: Response): Promise<void> {
        const db = new DatabaseService();
        let data: any, status = 500;
        try {
            const result = await db
                .connect()
                .then(async (pool: any) => {
                    return await pool
                        .request()
                        .input("action", "GETALLCATEGORIES")
                        .input("Param1", "")
                        .input("Param2", "")
                        .input("Param3", "")
                        .input("Param4", "")
                        .input("Param5", "")
                        .execute("SPCategories");
                })
                .then((result: any) => {

                    return result;
                })
                .catch((err: any) => {
                    logger.error("CategoryController-> getAllCategories-> %o", err);
                    return err;
                });
            status = 200;
            data = result;
        } catch (e) {
            logger.error("CategoryController-> getAllCategories-> %o", e);
        } finally {
            await db.disconnect();
        }

        res.json(data);
    }


}// end class Banner controllers

const sendController = new SendController();
export default sendController;