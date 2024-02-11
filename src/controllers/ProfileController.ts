import { Request, Response } from "express";
import ProfileModel from "../models/ProfileModel";
import ProfileProcedure from "../procedures/ProfileProcedure";
import AddressProcedure from "../procedures/AddressProcedure";
import ResponseModel from "../models/ResponseModel";
import ProductsModel from "../models/ProductsModel";
import ProductsProcedure from "../procedures/ProductsProcedure";
import AutorizacionesProcedure from "../procedures/AutorizacionesProcedure";
import { UpdateAutorization } from "../controllers/AutorizacionesController";
import { getTaxes, getSpecialPrices, getValidationSpecialPrices } from "./CatalogsController";
import { logger } from "../util/logger";
import moment from 'moment';
import DiscountSpecial from "../procedures/DiscountSpecial";

export async function getProfile(request: Request, response: Response, internal = false) {
    const { db_name } = response.locals.business;
    const { profile_id, CardCode } = response.locals.user;
    let localstorageAll = request.body.localShoppingCart;

    let responseModel = new ResponseModel();
    try {
        let model: ProfileModel = new ProfileModel();
        //localstorageAll = localstorageAll; 
        model.action = 'find';
        model.business = db_name;
        model.cardCode = CardCode;
        model.id = profile_id;
        if (!localstorageAll) { localstorageAll = '[]'; }
        model.localStorageFront = localstorageAll;
        let result: any = await ProfileProcedure(model);
        if (!result) {
            responseModel.message = "Ocurrio un error al consultar el perfil----------";
            if (!internal) {
                response.json(responseModel);
                return;
            } else {
                return responseModel;
            }
        }

        model.action = 'getAddresses';
        model.business = db_name;
        model.cardCode = CardCode;
        model.id = 0;
        let addresses: any = await ProfileProcedure(model);

        result.shoppingCart = JSON.parse(result.shoppingCart) || [];
        result.favorites = JSON.parse(result.favorites) || [];
        result.backOrder = JSON.parse(result.backOrder) || [];
        responseModel.status = 1;
        result.addresses = addresses || [];
        responseModel.data = result;
        responseModel.message = "Perfil";
        if (!internal) {
            response.json(responseModel);
            return;
        } else {
            return responseModel;
        }

    } catch (e) {
        logger.error(e);
        response.json(responseModel);
        return responseModel;
    }
}

export async function createProfile(request: Request, response: Response, internal = false) {
    const { db_name } = response.locals.business;
    const { profile_id, CardCode } = response.locals.user;
    let localstorageAll = request.body.localShoppingCart;

    let responseModel = new ResponseModel();
    try {
        let model: ProfileModel = new ProfileModel();
        //localstorageAll = localstorageAll; 
        model.action = 'create';
        model.business = db_name;
        model.cardCode = CardCode;
        model.id = profile_id;
        model.shoppingCart = "[]";
        if (!localstorageAll) {
            localstorageAll = '[]';
        }
        let result: any = await ProfileProcedure(model);

        if (!result) {
            responseModel.message = "Ocurrio un error al crear el perfil";
            if (!internal) {
                response.json(responseModel);
                return;
            } else {
                return responseModel;
            }
        }

        model.action = 'getAddresses';
        model.business = db_name;
        model.cardCode = CardCode;
        model.id = 0;
        let addresses: any = await AddressProcedure(model);

        result.shoppingCart = [];
        result.favorites = [];
        result.backOrder = [];
        result.addresses = addresses || [];
        responseModel.status = 1;


        responseModel.data = result;
        responseModel.message = "Perfil";

        if (!internal) {
            response.json(responseModel);
            return;
        } else {
            return responseModel;
        }

    } catch (e) {
        logger.error("ProfileController.js => createProfile: ", e);
        responseModel.message = "Ocurrio un error al consultar el perfil despues de creacio";
        if (!internal) {
            response.json(responseModel);
            return;
        } else {
            return responseModel;
        }
    }
}

export async function updateFavorites(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { ItemCode } = request.body;
    const { profile_id } = response.locals.user;
    const { exist } = request.params;
    const responseModel = new ResponseModel();

    try {
        let profile: any = await getProfile(request, response, true);
        if (!profile.status) {
            responseModel.message = "Ocurrio un error al actualizar favoritos";
            response.json(responseModel);
            return;
        }
        profile = profile.data;

        if (exist == 'false') {

            profile.favorites.push({ ItemCode })
        } else {
            let newFavorites: any = [];
            profile.favorites.map((item: any) => {
                if (ItemCode != item.ItemCode) newFavorites.push(item)
            });
            profile.favorites = newFavorites;
        }

        let model: ProfileModel = new ProfileModel();

        model.action = 'updateFavorites';
        model.business = db_name;
        model.id = profile_id;
        model.favorites = JSON.stringify(profile.favorites);
        let result: any = await ProfileProcedure(model);

        if (!result.id) {
            responseModel.message = "Ocurrio un error al actualizar favoritos";
            response.json(responseModel);
        }

        responseModel.status = 1;
        responseModel.data = { value: exist == 'true' ? !true : !false };
        responseModel.message = "Favoritos actualizados";
        response.json(responseModel);

    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar favoritos";
        response.json(responseModel);
    }
}

export async function updateShoppingCart(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { profile_id } = response.locals.user;
    const { item, quantity } = request.body;
    const responseModel = new ResponseModel();

    try {
        let profile: any = await getProfile(request, response, true);
        if (!profile.status) {
            responseModel.message = "Ocurrió un error al actualizar el carrito de compras";
            response.json(responseModel);
            return;
        }
        profile = profile.data;

        let shoppingCart = profile.shoppingCart || [];

        let exist = shoppingCart.filter((itemFilter: any) => {
            return (itemFilter.ItemCode == item.ItemCode)
        });

        if (!exist.length) {
            shoppingCart.push({ ItemCode: item.ItemCode, quantity })//, Price : item.PriceBeforeDiscount, Disc: item.DiscountPercentSpecial
        } else {
            shoppingCart.map((itemMap: any) => {
                if (item.ItemCode == itemMap.ItemCode) {
                    itemMap.quantity = quantity;
                    // Nuevos F458
                    if (item.UpdateShopping) {
                        itemMap.Price = item.PriceBeforeDiscount;
                        itemMap.Disc = item.DiscountPercentSpecial;
                        itemMap.Upd = 'Y'
                    }
                }
            });
        }

        let model: ProfileModel = new ProfileModel();

        model.action = 'updateShoppingCart';
        model.business = db_name;
        model.id = profile_id;
        model.shoppingCart = JSON.stringify(shoppingCart);
        let result: any = await ProfileProcedure(model);

        if (!result.id) {
            responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
            response.json(responseModel);
        }

        responseModel.status = 1;
        responseModel.data = { value: !!exist.length };
        responseModel.message = "shoppingCart actualizados";
        response.json(responseModel);

    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
        response.json(responseModel);
    }
}

export async function updateShoppingCartLocal(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { profile_id } = response.locals.user;
    const responseModel = new ResponseModel();
    // Recibimos el carrito
    let { data, authorization } = request.body;
    try {
        // almacenar el lista de los articulos en un arreglo
        let arrayProcutsList = data
        // Buscar todos los articulos que cumplan con la condición
        let productsModel: ProductsModel = new ProductsModel();
        // Colocamos el nombre dle if que queremos que se ejecute
        productsModel.action = 'validatePromotions';

        // ejecutamos el store procedure junto con las variblas que le asiganamos en productsModel
        let productsResul = await ProductsProcedure(productsModel);

        // Defnición de arreglo para alcenar los items que si cumple su condición
        let validateProducts: any = [];


        // Recorremos el arreglo que viene desde el front
        for (let index = 0; index < arrayProcutsList.length; index++) {
            // Almacenamso la información de la posición del arreglo en una variable
            const itemCart: any = arrayProcutsList[index];

            // Buscamos que el articulo que vienen del front exist dentro de los articulos que cuemplen con la condición
            let itemExist = await productsResul.find(async (item: any) => await item.ItemCode === itemCart.ItemCode);
            // si lo encuentra
            if (itemExist) {
                // Almacenar en arreglo de los items que si cumple su condición
                await validateProducts.push(itemCart);
            }
        }

        // Definimos el modelo de la inserción de articulos en el carrito
        let model: ProfileModel = new ProfileModel();

        model.action = 'updateShoppingCart';
        model.business = db_name;
        model.id = profile_id;
        model.shoppingCart = JSON.stringify(validateProducts);
        let result: any = await ProfileProcedure(model);

        if (!result.id) {
            responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
            response.json(responseModel);
        } else {
            responseModel.status = 1;
            responseModel.data = { value: data.length };
            responseModel.message = "shoppingCart actualizados";
            response.json(responseModel);
        }
    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
        response.json(responseModel);
    }
}

export async function deleteShoppingCart(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { profile_id } = response.locals.user;
    const { item, deleteAll } = request.body;
    const responseModel = new ResponseModel();

    try {
        let profile: any = await getProfile(request, response, true);
        if (!profile.status) {
            responseModel.message = "Ocurrio un error al eliminar el producto el carrito de compras";
            response.json(responseModel);
            return;
        }
        profile = profile.data;

        let shoppingCart = profile.shoppingCart || [];

        let newItems = shoppingCart.filter((itemFilter: any) => {
            return (itemFilter.ItemCode != item.ItemCode)
        });

        if (deleteAll) {
            newItems = [];
        }

        let model: ProfileModel = new ProfileModel();

        model.action = 'updateShoppingCart';
        model.business = db_name;
        model.id = profile_id;
        model.shoppingCart = JSON.stringify(newItems);
        let result: any = await ProfileProcedure(model);

        if (!result.id) {
            responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
            response.json(responseModel);
        }

        responseModel.status = 1;
        responseModel.data = {};
        responseModel.message = "shoppingCart actualizados";
        response.json(responseModel);

    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
        response.json(responseModel);
    }
}

export async function getShoppingCart(request: Request, response: Response, internal = false) {
    let { db_name, currency, localLanguage, priceList } = response.locals.business;
    const { wareHouse } = response.locals.business;
    const { profile_id } = response.locals.user;
    const { CardCode, ListNum, CardName } = response.locals.user;
    const publicShoppingCart = request.body.shoppingCart;
    const responseModel = new ResponseModel();
    if (currency === 'MXP') {
        currency = 'MXN';
    }
    try {
        let shoppingCart = [];
        let backOrder = [];

        if (profile_id) {

            let profile: any = await getProfile(request, response, true);
            if (!profile.status) {
                responseModel.message = "Ocurrio un error al consultar tu carrito de compras";
                response.json(responseModel);
                if (!internal) {
                    response.json(responseModel);
                    return;
                } else {
                    return responseModel;
                }
            }
            profile = profile.data;

            shoppingCart = profile.shoppingCart || [];
            backOrder = profile.backOrder || [];

        } else {
            shoppingCart = publicShoppingCart || [];
            backOrder = [];
        }
        const resultTaxes: any = await getTaxes(request, response, true);
        if (!resultTaxes.status) {
            responseModel.message = "ocurrio un error al traer los productos";
            response.json(responseModel);
            return;
        }
        let tax = resultTaxes.data.Rate;
        let newShoppingCart = [];

        // let ValidationSpecialPrices : any = false;
        // Lista de precios
        let PriceList = ListNum && ListNum !== '' ? ListNum : priceList;

        let argItemCode: any = '';
        for (let index = 0; index < shoppingCart.length; index++) {
            const item = shoppingCart[index];
            argItemCode += `'${item.ItemCode}',`;
        }
        if (argItemCode) {
            argItemCode = argItemCode.substring(0, argItemCode.length - 1);
        }

        let model: ProductsModel = new ProductsModel();
        model.action = 'findOne';
        model.business = db_name;
        model.cardCode = CardCode;
        model.wareHouse = wareHouse;
        model.key = argItemCode;
        // Call procedure
        const results = await ProductsProcedure(model);

        // for (let i = 0; i < shoppingCart.length; i++) {
        //     let model: ProductsModel = new ProductsModel();
        //     model.action = 'findOne';
        //     model.business = db_name;
        //     model.cardCode = CardCode;
        //     model.wareHouse = wareHouse;
        //     model.itemCode = shoppingCart[i].ItemCode;
        //     // Call procedure
        //     const result = await ProductsProcedure(model);
        let datas = {
            actions: 'Discount',
            param1: CardCode,
            param2: CardName
        }
        let res = await AutorizacionesProcedure(datas);

        for (let i = 0; i < results.length; i++) {
            let item: any = results[i];
            for (let index = 0; index < shoppingCart.length; index++) {
                const element = shoppingCart[index];
                if (item.ItemCode === element.ItemCode) {
                    item.quantity = element.quantity;
                    if (element.Price) {
                        item.PriceShop = element.Price;
                    }
                    if (element.Disc) {
                        item.Disc = element.Disc;
                    }
                }
            }
            if (item.OnHandPrincipal <= 0) {
                item.flag = 'green';
            } else {
                item.flag = 'green';
            }
            tax = item.VATLiable === 'N' ? 0 : resultTaxes.data.Rate;
            //#region   DESCUENTOS DE CARRITO
            let itemDiscuount = 0;
            let DiscountPercentSpecial: any = 0;

            let priceDicount: any = parseFloat(item.Price).toFixed(4);
            if (item.U_TDescuento === 'ACM' || item.U_TDescuento === 'ESP') {
                //#region Descuentos SAP
                DiscountPercentSpecial = parseFloat(item.DescuentoFinal || 0).toFixed(4)
                item.Price = parseFloat(item.PrecioFinal).toFixed(4);
                priceDicount = Number(priceDicount - (priceDicount * (DiscountPercentSpecial / 100))).toFixed(4);
                //#endRegion



                let isDateDiscount = false;
                if (item.U_VInicio && item.U_VFin) {
                    let inicial = new Date(item.U_VInicio);
                    let final = new Date(item.U_VFin);
                    let today = new Date();

                    inicial.setMinutes(inicial.getMinutes() + inicial.getTimezoneOffset());
                    final.setMinutes(final.getMinutes() + final.getTimezoneOffset());

                    inicial.setHours(0, 0, 0, 0);
                    final.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);


                    if (inicial <= today && today <= final) {
                        item.U_Descuento = item.U_Descuento;
                        isDateDiscount = true;
                    }else {
                        for (let i = 0; i < res.length; i++) {
                            const element = res[i];
                            if(element.U_Linea === item.U_FMB_Handel_Marca){
                                item.U_Descuento = 0;
                                isDateDiscount = true;
                            }
                        }
                    }    
                }else {
                    for (let i = 0; i < res.length; i++) {
                        const element = res[i];
                        if(element.U_Linea === item.U_FMB_Handel_Marca){
                            item.U_Descuento = Number(element.U_Descuento);
                            isDateDiscount = true;
                        }
                    }
                }
                if (item.U_TDescuento === 'ACM') {
                    for (let i = 0; i < res.length; i++) {
                        const element = res[i];
                        if (element.U_Linea === item.U_FMB_Handel_Marca) {
                            DiscountPercentSpecial = parseFloat(element.U_Descuento || 0).toFixed(4);
                            itemDiscuount = Number(parseFloat(element.U_Descuento || 0).toFixed(4));
                            priceDicount = Number(priceDicount - (priceDicount * (DiscountPercentSpecial / 100))).toFixed(4);
                            item.DiscountPercentSpecial = DiscountPercentSpecial;
                        }
                    }
                }
                //#region DESCUENTO DESC 
                for (let y = 0; y < res.length; y++) {
                    const des = res[y];
                    if (des.U_Linea === item.U_FMB_Handel_Marca) {
                        item.U_DESC = Number(des.U_Descuento);
                    }
                }
                if (item.U_DESC && item.U_TDescuento === 'ACM') {
                    item.Price = Number(item.Price - (item.Price * (item.U_DESC || 0 / 100) / 100));
                    // item.U_Descuento = 0;
                }
                //#endregion
                /*#############################FECHA Descuento de temporada####################################*/

                let data1 = {
                    actions: 'DiscountSeasonLine',
                    param1: item.U_FMB_Handel_Marca || '',
                    param2: item.U_Categoria || '',
                }

                let res1 = await AutorizacionesProcedure(data1);
                let precioPorTemporada = 0;
                let descuentoPorTemporada = 0;
                if (res1.length > 0) {
                    // console.log('con<item.Price-2-', item.Price);
                    // item.U_Descuento = res1[0].U_Descuento;
                    if (item.U_TDescuento === 'ACM') {
                        descuentoPorTemporada = res1[0].U_Descuento;
                        precioPorTemporada = item.Price;
                        // console.log('con<item.Price-3-', item.Price, 'res1[0].U_Descuento',res1[0].U_Descuento);
                        priceDicount = Number(item.Price - (item.Price * (res1[0].U_Descuento || 0 / 100) / 100));
                    }
                }
                /*#############################FECHA Descuento de temporada####################################*/

                if (isDateDiscount) {// && item.U_Descuento > 0

                    DiscountPercentSpecial = item.U_Descuento_1 ? item.U_Descuento : 0;
                    itemDiscuount = item.U_Descuento_1 ? item.U_Descuento : 0;
                    priceDicount = Number(priceDicount - (priceDicount * (DiscountPercentSpecial / 100))).toFixed(4);
                    let des: any = Number(100 - (priceDicount * 100) / item.Price).toFixed(2);
                    item.DiscountPercentSpecial = des;
                    if(descuentoPorTemporada !== 0 && !DiscountPercentSpecial){
                        item.Price = precioPorTemporada;
                        item.U_Descuento = descuentoPorTemporada;
                        DiscountPercentSpecial = descuentoPorTemporada;
                        item.DiscountPercentSpecial = descuentoPorTemporada;
                    }
                    if (item.U_TDescuento === 'ESP') {
                        DiscountPercentSpecial = 0;
                        item.U_Descuento = 0;
                        item.Price = priceDicount;
                        item.DiscountPercentSpecial = 0;
                    }
                } else if (!publicShoppingCart || item.PriceShop || item.Disc || descuentoPorTemporada) {
                    if (descuentoPorTemporada){
                        item.U_Descuento = descuentoPorTemporada;
                        DiscountPercentSpecial = descuentoPorTemporada;
                        item.DiscountPercentSpecial = descuentoPorTemporada;
                        priceDicount = Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );
                    } else {
                        DiscountPercentSpecial = parseFloat(item.Disc || 0).toFixed(4);
                        itemDiscuount = Number(parseFloat(item.Disc || 0).toFixed(4));
                        item.Price = parseFloat(item.PriceShop).toFixed(4);
                        priceDicount = Number(item.Price - (item.Price * (DiscountPercentSpecial / 100)));
                        item.DiscountPercentSpecial = DiscountPercentSpecial;
                    }
                }

            } else {
                item.DiscountPercentSpecial = 0;
                itemDiscuount = 0;
                if (!publicShoppingCart || item.PriceShop || item.Disc) {
                    DiscountPercentSpecial = parseFloat(item.Disc || 0).toFixed(4);
                    itemDiscuount = Number(parseFloat(item.Disc || 0).toFixed(4));
                    item.Price = parseFloat(item.PriceShop).toFixed(4);
                    priceDicount = Number(item.Price - (item.Price * (DiscountPercentSpecial / 100)));
                    item.DiscountPercentSpecial = DiscountPercentSpecial;
                }
            }
            //  NEW F458

            for (let i = 0; i < shoppingCart.length; i++) {
                if (!publicShoppingCart || item.PriceShop || item.Disc) {
                    // if(shoppingCart[i].ItemCode === item.ItemCode){
                    item.Price = parseFloat(item.PriceShop || 0).toFixed(4);
                    item.DiscountPercentSpecial = parseFloat(item.Disc || 0).toFixed(4);
                    item.U_Descuento = parseFloat(item.Disc || 0).toFixed(4);
                    itemDiscuount = item.U_Descuento;
                    priceDicount = Number(item.Price - (item.Price * (itemDiscuount / 100)));
                    // }
                }
            }

            let priceTax: any = parseFloat(priceDicount) + parseFloat(priceDicount) * (tax * 0.01)
            // results[i] = {
            //     ...results[i],
            //     ItemName: item.ItemName,
            //     OnHand: item.OnHand,
            //     U_Handel_ImagesArray: item.U_Handel_ImagesArray,
            //     weight: parseFloat(item.SWeight1 || 0).toFixed(2),
            //     weight1: parseFloat(item.IWeight1 || 0).toFixed(2),
            //     PicturName: item.PicturName,
            //     taxRate: tax,
            //     taxSum:  Number((item.Price * (tax / 100)).toFixed(2)),

            //     currency: currency,
            //     localLanguage: localLanguage,
            //     U_FMB_Handel_Promo:  item.U_FMB_Handel_Promo,
            //     U_FMB_Handel_PNTA:  item.U_FMB_Handel_PNTA,
            //     OnHandPrincipal: item.OnHandPrincipal,
            //     WhsCode : item.WhsCode,
            //     flag : item.flag,

            //     DiscountPercentSpecial: item.DiscountPercentSpecial == undefined  ? 0 : parseFloat(item.DiscountPercentSpecial).toFixed(2) ,
            //     discount : item.DiscountPercentSpecial,
            //     U_Descuento: itemDiscuount,                    

            //     Price: parseFloat(priceDicount).toFixed(2), //((item.Price) - (item.Price * (itemDiscuount/100))),
            //     PriceBeforeDiscount: parseFloat(item.Price).toFixed(2) ,
            //     PriceTaxBeforeDiscount: Number(( Number((item.PriceBeforeDiscount * (tax / 100)).toFixed(2)) + item.PriceBeforeDiscount).toFixed(2)),
            //     PriceECommerce: item.PriceECommerce,
            //     PriceTaxECommerce: Number(( Number((item.PriceECommerce * (tax / 100)).toFixed(2)) + item.PriceECommerce).toFixed(2)),
            //     priceTax:  parseFloat(priceTax).toFixed(4),    

            //     U_MultiploVenta: item.U_MultiploVenta,
            //     SuppCatNum : item.SuppCatNum,
            //     U_CFDI33_UM : item.U_CFDI33_UM,                   
            //     newTotal: (Number(priceDicount) * parseInt(item.quantity)).toFixed(2),  // Calcula el total del producto  
            //     beforeTotal: (Number(item.Price) * parseInt(item.quantity)).toFixed(2), 
            // };

            newShoppingCart.push({
                ItemCode: item.ItemCode,
                quantity: item.quantity,
                ItemName: item.ItemName,
                OnHand: item.OnHand,
                U_Handel_ImagesArray: item.U_Handel_ImagesArray,
                // weight: parseFloat(item.SWeight1 || 0).toFixed(2),
                // weight1: parseFloat(item.IWeight1 || 0).toFixed(2),
                PicturName: item.PicturName,
                taxRate: tax,
                // taxSum:  Number((item.Price * (tax / 100)).toFixed(2)),                   
                // currency: currency,
                // localLanguage: localLanguage,
                U_FMB_Handel_Promo: item.U_FMB_Handel_Promo,
                // U_FMB_Handel_PNTA:  item.U_FMB_Handel_PNTA,
                OnHandPrincipal: item.OnHandPrincipal,
                U_Linea: item.U_Linea !== null && item.U_Linea.length > 0 ? item.U_Linea : '',
                // WhsCode : item.WhsCode,
                flag: item.flag,

                DiscountPercentSpecial: item.DiscountPercentSpecial == undefined ? 0 : parseFloat(item.DiscountPercentSpecial).toFixed(2),
                discount: item.DiscountPercentSpecial,
                // U_Descuento: itemDiscuount,                    

                Price: parseFloat(priceDicount).toFixed(4), //((item.Price) - (item.Price * (itemDiscuount/100))),
                PriceBeforeDiscount: parseFloat(item.Price).toFixed(2),
                PriceTaxBeforeDiscount: Number((Number((item.PriceBeforeDiscount * (tax / 100)).toFixed(2)) + item.PriceBeforeDiscount).toFixed(2)),
                PriceECommerce: item.PriceECommerce,
                PriceTaxECommerce: Number((Number((item.PriceECommerce * (tax / 100)).toFixed(2)) + item.PriceECommerce).toFixed(2)),
                priceTax: parseFloat(priceTax).toFixed(4),

                U_MultiploVenta: item.U_MultiploVenta,
                SuppCatNum: item.SuppCatNum,
                // Se ocupa en Orders
                U_CFDI33_UM: item.U_CFDI33_UM || '',
                // Se ocupa para editar el precio de carrito
                newTotal: (Number(priceDicount) * parseInt(item.quantity)).toFixed(4),  // Calcula el total del producto  
                beforeTotal: (Number(item.Price) * parseInt(item.quantity)).toFixed(4),
                Available: item.Available
            })
            // }

        }

        for (let index = 0; index < shoppingCart.length; index++) {
            const element = shoppingCart[index];
            for (let i = 0; i < newShoppingCart.length; i++) {
                const newShop = newShoppingCart[i];
                if (element.ItemCode === newShop.ItemCode) {
                    shoppingCart[index] = {
                        ...newShoppingCart[i]
                    }
                }
            }
        }
        let newBackOrder = [];
        for (let i = 0; i < backOrder.length; i++) {
            let model: ProductsModel = new ProductsModel();

            model.action = 'findOne';
            model.business = db_name;
            model.cardCode = CardCode;
            model.wareHouse = wareHouse;
            model.itemCode = backOrder[i].ItemCode;

            // Call procedure
            const result = await ProductsProcedure(model);

            if (result.length) {
                backOrder[i] = {
                    ...backOrder[i],
                    ItemName: result[0].ItemName,
                    Price: result[0].Price,
                    OnHand: result[0].OnHand,
                    //OnHand: 0,
                    PicturName: result[0].PicturName,
                    taxRate: tax,
                    taxResult: Number((result[0].Price * (tax / 100)).toFixed(2)),
                    priceTax: Number((Number((result[0].Price * (tax / 100)).toFixed(2)) + result[0].Price).toFixed(2)),
                    currency: currency,
                    localLanguage: localLanguage,
                };

                newBackOrder.push(backOrder[i])
            }

        }
        let data = {
            shoppingCart,
            backOrder: newBackOrder
        };

        responseModel.status = 1;
        responseModel.data = data;
        responseModel.message = "Tu carrito de compras";
        if (!internal) {
            response.json(responseModel);
        } else {
            return responseModel;
        }
    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al consultar tu carrito de compras";
        if (!internal) {
            response.json(responseModel);
        } else {
            return responseModel;
        }
    }
}

export async function getRelatedCart(request: Request, response: Response) {
    const responseModel = new ResponseModel();
    let { db_name, wareHouse } = response.locals.business;

    let { CardCode } = response.locals.user;
    let { whs, nextNum } = request.query;
    const brands = request.body
    try {
        const items = []
        for (const brand of brands) {
            let model: ProductsModel = new ProductsModel();
            model.action = 'getRelatedProducts';
            model.business = db_name;
            model.cardCode = CardCode;
            model.wareHouse = whs ? whs : wareHouse;
            model.itemCode = brand;
            model.nextNumber = nextNum || 0;
            let results = await ProductsProcedure(model);
            items.push(results)
        }
        const allItems = [].concat(...items)
        responseModel.data = allItems;
        response.json(responseModel);
    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar el carrito de compras";
        response.json(responseModel);
    }
}

export async function updateBackOrder(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { profile_id } = response.locals.user;
    const { item, quantity } = request.body;
    const responseModel = new ResponseModel();

    try {
        let profile: any = await getProfile(request, response, true);
        if (!profile.status) {
            responseModel.message = "Ocurrio un error al actualizar tu lista de deseos";
            response.json(responseModel);
            return;
        }
        profile = profile.data;

        let backOrder = profile.backOrder || [];

        let exist = backOrder.filter((itemFilter: any) => {
            return (itemFilter.ItemCode == item.ItemCode)
        });

        if (!exist.length) {
            backOrder.push({ ItemCode: item.ItemCode, quantity })
        } else {
            backOrder.map((itemMap: any) => {
                if (item.ItemCode == itemMap.ItemCode) {
                    itemMap.quantity = quantity;
                }
            });
        }

        let model: ProfileModel = new ProfileModel();

        model.action = 'updateBackOrder';
        model.business = db_name;
        model.id = profile_id;
        model.backOrder = JSON.stringify(backOrder);
        let result: any = await ProfileProcedure(model);

        if (!result.id) {
            responseModel.message = "Ocurrio un error al actualizar tu lista de deseos";
            response.json(responseModel);
        }

        responseModel.status = 1;
        responseModel.data = { value: !!exist.length };
        responseModel.message = "Lista de deseos actualizados";
        response.json(responseModel);

    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar tu lista de deseos";
        response.json(responseModel);
    }
}

export async function deleteBackOrder(request: Request, response: Response) {
    const { db_name } = response.locals.business;
    const { profile_id } = response.locals.user;
    const { item, deleteAll } = request.body;
    const responseModel = new ResponseModel();

    try {
        let profile: any = await getProfile(request, response, true);
        if (!profile.status) {
            responseModel.message = "Ocurrio un error al eliminar el producto de tu lista de deseos";
            response.json(responseModel);
            return;
        }
        profile = profile.data;

        let backOrder = profile.backOrder || [];

        let newItems = backOrder.filter((itemFilter: any) => {
            return (itemFilter.ItemCode != item.ItemCode)
        });

        if (deleteAll) {
            newItems = [];
        }

        let model: ProfileModel = new ProfileModel();

        model.action = 'updateBackOrder';
        model.business = db_name;
        model.id = profile_id;
        model.backOrder = JSON.stringify(newItems);
        let result: any = await ProfileProcedure(model);

        if (!result.id) {
            responseModel.message = "Ocurrio un error al actualizartu lista de deseos";
            response.json(responseModel);
        }

        responseModel.status = 1;
        responseModel.data = {};
        responseModel.message = "lista de deseos actualizados";
        response.json(responseModel);

    } catch (e) {
        logger.error(e);
        responseModel.message = "Ocurrio un error al actualizar tu lista de deseos";
        response.json(responseModel);
    }
}