import {Request, Response} from "express";
import ProductsModel from "../models/ProductsModel";
import CategoriesModel from "../models/CategoriesModel";
import ProductsProcedure from "../procedures/ProductsProcedure";
import CategoriesProcedure from "../procedures/CategoriesProcedure";
import ResponseModel from "../models/ResponseModel";
import {getProfile} from "./ProfileController";
import {getTaxes, getSpecialPrices, getValidationSpecialPrices} from "./CatalogsController";
import { exists } from "fs";
import { logger } from "../util/logger";
import moment from 'moment';
import DiscountSpecial from "../procedures/DiscountSpecial";
import AutorizacionesProcedure from "../procedures/AutorizacionesProcedure";

let fs = require('fs');
let path = require('path');


export async function searchByKey(request: Request, response: Response): Promise<void> {
    let {db_name, currency, localLanguage, priceList} = response.locals.business;
    const {wareHouse} = response.locals.business;
    let responseModel = new ResponseModel();

    let {key, whs, page, uniqueFilter,view,shoppingCartPublic,sortFilterValue} = request.body.key;
    
    let {CardCode, ListNum,CardName} = response.locals.user;
    if (currency === 'MXP') {
        currency = 'MXN';
    }
    let actionFilter = '';
    let valueFilter = '';
    let value2Filter = '';
    if(uniqueFilter){
        let property = uniqueFilter.property;
        let value = uniqueFilter.value;
        switch(property){
            case "categorias":
                actionFilter = 'categorias';
                valueFilter = value;
                value2Filter = '';
            break;
            case "marca":
                actionFilter = 'marca';
                valueFilter = value;
                value2Filter = '';
            break;
            case "fabrica":
                actionFilter = 'fabrica';
                valueFilter = value;
                value2Filter = '';
            break;
            case "searchLite":
                actionFilter = 'searchLite';
                valueFilter = value;
                value2Filter = '';
            break;
            // case "aparato":
            //     actionFilter = 'aparato';
            //     valueFilter = value;
            //     value2Filter = '';
            // break;
            // case "refaccion":
            //     actionFilter = 'refaccion';
            //     valueFilter = value;
            //     value2Filter = '';
            // break;
            /*case "stock":
                actionFilter = 'stock';
                valueFilter = value;
                value2Filter = '';
            break;*/
            case "precio":
                actionFilter = 'precio';
                valueFilter = value;
                value2Filter = uniqueFilter.value2;
            break;

            default: 
                actionFilter = '';
                valueFilter = '';
                value2Filter = '';
        }
    }
    let args = '';
    if (Array.isArray(valueFilter)) {
        for (let index = 0; index < valueFilter.length; index++) {
            let element = valueFilter[index];
            args += " '" + element + "',";
        }
        args = args.slice(0, -1);
        valueFilter = args;
    }
    let viewField: any = '';
    let topItems: any =  '';

    //Guardar valor de busqueda en navbar para doble filtro
    let flagViewNav = false; 
    let auxKey: any = key;

    //#region FILTROS
    if(view){
        if(view === 'navBar'){
            flagViewNav = true;
        }
        // let newView = JSON.parse(view);   
        let newView = view;
        if(newView === 'marcaOne'){
            viewField ='U_FMB_Handel_RED';
        }else if(newView === 'marcaTwo'){
            viewField ='U_FMB_Handel_BLC';
        }else if(newView == 'marcaThree'){
            viewField ='U_FMB_Handel_OUT';
        }else if(newView === 'marcaFour'){ //NUEVAMENTE DISPONIBLE
            viewField ='U_FMB_Handel_M4';
        }else if(newView === 'marcaFive'){ //NUEVAMENTE DISPONIBLE
            viewField ='U_FMB_Handel_M5';
        }else if(newView === 'promocion'){ //PROMO RED
            viewField ='U_FMB_Handel_Promo';
        }else if(newView === 'masvendidos'){ //NOVEDADES
            viewField ='U_FMB_Handel_Remate';
        }else if(newView === 'nuevosproductos'){// MAS BUSCADOS
            topItems ='remates';
        }else if(newView === 'vitrinaView'){
            viewField ='U_FMB_Handel_PNTA';
        }else if(newView === 'remates'){ //NUEVAMENTE DISPONIBLE
            viewField ='U_FMB_Handel_Nuevo';
        }else if(newView === 'lastProducts'){ //ULTIMAS PIEZAS
            viewField ='U_FMB_Descontinuar';
        }else if(newView === 'favorites'){ //FAVORITOS
            viewField = 'favorites';
        }if(newView != 'Lite'){ //FUNCION LIGERA DE DATOS
            key = 'FindAll';
        }
    }

    //Recuperamos el valor original de Key
    if(flagViewNav){
        key = auxKey;
        flagViewNav = false;
    }

    //#endregion FILTROS
    
    // ################# Posible solucion  ###################
    // let example = key;
    // let exapmleArg:any = []
    // exapmleArg = example.split(',');
    // if(example.includes('~')){
    //     key = exapmleArg[exapmleArg.length -1 ].trim();
    // }else{
    //     key = exapmleArg[0].trim();
    // }
  
    // ################# FIN REGION ###################


    try {
        // Create model
        let model: ProductsModel = new ProductsModel();

    //     // Items con paginación (30)
    //     model.action = 'searchByKey';
    //     model.business = db_name;
    //     model.cardCode = CardCode;
    //     model.wareHouse = wareHouse;
    //     model.key = key;
    //     model.nextNumber = page || 0; 
    //     model.actionFilter = actionFilter || '';
    //     model.valueFilter = valueFilter || '';
    //     model.value2Filter = value2Filter || '';
    //     model.view = viewField || '';
    //     model.topItems = topItems || '';
    //     const results = await ProductsProcedure(model);

    //    // Filtros de SideBar (Todos los Items)
    //     model.action = 'searchByKey1';
    //     model.business = db_name;
    //     model.cardCode = CardCode;
    //     model.wareHouse = wareHouse;
    //     model.key = key;
    //     model.nextNumber = 99999; 
    //     model.actionFilter = actionFilter || '';
    //     model.valueFilter = valueFilter || '';
    //     model.value2Filter = value2Filter || '';
    //     model.view = viewField || '';
    //     model.topItems = topItems || '';
    //     const results2 = await ProductsProcedure(model);
    //     let totalRows = results2[0] ? results2.length : 0;

        
        model.action = 'searchItemCode';
        model.business = db_name;
        model.cardCode = CardCode;
        model.wareHouse = wareHouse;
        model.key = key;
        model.nextNumber = 99999; 
        model.actionFilter = actionFilter || '';
        model.valueFilter = valueFilter || '';
        model.value2Filter = value2Filter || '';
        model.view = viewField || '';
        model.topItems = topItems || '';
        model.sortFilter = sortFilterValue || ''
        const results2 = await ProductsProcedure(model);
        let totalRows = results2[0] ? results2.length : 0;

        let resultPagination = results2.slice(page, page + 30); //se paginan los articulos 
        let argItemCode:any = ''
        for (let index = 0; index < resultPagination.length; index++) {
            const item = resultPagination[index];
            argItemCode+=  `'${item.ItemCode}',`;  
        }
        if(argItemCode){
            argItemCode = argItemCode.substring(0 , argItemCode.length -1); 
        }

        //Items con paginación (30)
        model.action = 'searchByKeyAdvance';
        model.business = db_name;
        model.cardCode = CardCode;
        model.wareHouse = wareHouse;
        model.key = argItemCode;
        model.nextNumber = page || 0; 
        model.actionFilter = actionFilter || '';
        model.valueFilter = valueFilter || '';
        model.value2Filter = value2Filter || '';
        model.view = viewField || '';
        model.topItems = topItems || '';
        model.sortFilter = sortFilterValue || ''
        const results = await ProductsProcedure(model);
        
        
        let favorites: any = [];
        let shoppingCart: any = [];
        let backOrder: any = [];

        if (!shoppingCartPublic) {
            const profile: any = await getProfile(request, response, true);
            favorites = profile.data.favorites ? profile.data.favorites : [];
            shoppingCart = profile.data.shoppingCart ? profile.data.shoppingCart : [];
            backOrder = profile.data.backOrder ? profile.data.backOrder : [];
        } else {
            favorites = [];
            shoppingCart = shoppingCartPublic ? JSON.parse(shoppingCartPublic) : [];
            backOrder = [];
        }
        
        if (results2.length <= 0 && view === 'Lite') { //FUNCION LIGERA DE DATOS
            responseModel.message = "La búsqueda es por el código de fabricante, favor de volver a intentar";
            response.json(responseModel);
            return;
        }

        const resultTaxes: any = await getTaxes(request, response, true);
        
        if (!resultTaxes.status) {
            
            responseModel.message = "ocurrio un error al traer los productos";
            response.json(responseModel);
            return;
        
        }

        let tax = resultTaxes.data.Rate;
        let min = 0;
        let max = 0;
        // let available = 0;
        // let missing = 0;
        let itemsCategoryArray : any = [];
        let itemsBrandArray : any = [];
        let itemsFacilityArray : any = [];
        // let itemsDevicesArray : any = [];
        // let itemsSparePartsArray : any = [];

        // Lista de precios
        let PriceList = ListNum && ListNum !== '' ? ListNum : priceList;
       
        let data = {
            actions : 'Discount',
            param1 : CardCode,
            param2 : CardName
        }
        let res = await AutorizacionesProcedure(data);    
       
         // Items con paginacion (10)
        // results.map(async (item: any, index: Number) => { 
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            
            let favorite = favorites.filter((favorite: any) => {
                return (favorite.ItemCode == item.ItemCode)
            });

            let cart = shoppingCart.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            let back = backOrder.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            
            // Special Prices Validation
            //########################################################################################################################
            let priceItem = -1;
            let discount = -1;
            let priceBeforeDisc: any = -1;

            item.QuantitySpecial = cart.length ? cart[0].quantity : 1;
            
            const DiscountSpecials = await DiscountSpecial(CardCode,item.ItemCode,1);
            item.DiscountPercentSpecial = parseFloat(DiscountSpecials[0].DescuentoFinal || 0)
            // DESCOMENTAR SI QUEREMOS QUE TODOS LOS ARTICULOS CON DESCUENTOS TENGAN LA ETIQUETA DE PROMOCIÓN 
            // item.U_FMB_Handel_Promo = DiscountSpecials[0].DescuentoFinal !== 0 ? 1 : 0;
            priceItem = parseFloat(DiscountSpecials[0].PrecioFinal);
            discount = parseFloat(DiscountSpecials[0].DescuentoFinal || 0);
            priceBeforeDisc = ((100 * priceItem) / (100 - discount)).toFixed(2);   
            
            let flagDiscount = false;
            if (item.U_VInicio && item.U_VFin) {//item.DiscountPercentSpecial === 0 &&
                let inicial = new Date(item.U_VInicio);
                let final = new Date(item.U_VFin);
                let today = new Date();
                
                inicial.setMinutes(inicial.getMinutes() + inicial.getTimezoneOffset());
                final.setMinutes(final.getMinutes() + final.getTimezoneOffset());

                inicial.setHours(0, 0, 0, 0);
                final.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                //SOLO ENTRA SI ESTA DENTRO DEL RANGO DE FECHAS
                if (inicial <= today && today <= final) {
                    item.U_Descuento = item.U_Descuento;
                    flagDiscount = true;
                }else {
                    for (let i = 0; i < res.length; i++) {
                        const element = res[i];
                        if(element.U_Linea === item.U_FMB_Handel_Marca){
                            item.U_Descuento = 0;
                            flagDiscount = true;
                        }
                    }
                }                        
            }else {
                for (let i = 0; i < res.length; i++) {
                    const element = res[i];
                    if(element.U_Linea === item.U_FMB_Handel_Marca){
                        item.U_Descuento = Number(element.U_Descuento);
                        flagDiscount = true;
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
            // console.log('con<item.ItemCode', item.ItemCode, '---U_DESC---', item.U_DESC, '---Price-0-', item.Price, '---U_Descuento---', item.U_Descuento);
            if (item.U_DESC && item.U_TDescuento === 'ACM') {
                item.Price = Number(item.Price - (item.Price * (item.U_DESC || 0 / 100) / 100));
                // item.U_Descuento = 0;
            }
            // console.log('con<item.Price-1-', item.Price);
            //#endregion

            //#######################################################################################################################

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
                    item.Price = Number(item.Price - (item.Price * (res1[0].U_Descuento || 0 / 100) / 100));
                }
            }
            /*#############################FECHA Descuento de temporada####################################*/

            item.currency = currency;
            item.localLanguage = localLanguage;
            item.favorite = !!favorite.length;
            item.backOrder = !!back.length;
            item.quantity = cart.length ? cart[0].quantity : '';
            item.taxRate = tax;
            // Precios por descuentos especiales
            if(priceBeforeDisc != -1 && !flagDiscount){
                item.Price = Number(priceItem);
                item.PriceBeforeDiscount = Number(priceBeforeDisc);
                item.PriceTaxBeforeDiscount = Number(((item.PriceBeforeDiscount * (item.taxRate / 100)) + item.PriceBeforeDiscount).toFixed(2));
            }
            item.priceTax = Number(((item.Price * (item.taxRate / 100)) + item.Price).toFixed(2));
            item.PriceECommerce = item.PriceECommerce;
            item.PriceTaxECommerce = Number(((item.PriceECommerce * (item.taxRate / 100)) + item.PriceECommerce).toFixed(2));
            
            if(flagDiscount){
                item.U_Descuento = item.U_Descuento_1 ? item.U_Descuento : 0;
                item.DiscountPercentSpecial = item.U_Descuento_1 ? item.U_Descuento : 0;
                // if(item.U_TDescuento === 'ESP'){
                //     item.DiscountPercentSpecial = 0;
                //     item.U_Descuento = 0;
                // }
                item.PriceBeforeDiscount = Number(item.Price);
                // console.log('con<item.Price-4-', item.Price);
                item.Price = Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );

                if(descuentoPorTemporada !== 0 && !item.DiscountPercentSpecial){
                    // console.log('con<descuentoPorTemporada',descuentoPorTemporada);
                    item.PriceBeforeDiscount = precioPorTemporada;
                    item.U_Descuento = descuentoPorTemporada;
                    item.DiscountPercentSpecial = descuentoPorTemporada;
                }

                // console.log('con<item.Price-5-', item.Price);
                if (item.U_TDescuento === 'ESP') {
                    item.DiscountPercentSpecial = 0;
                    item.U_Descuento = 0;
                    item.PriceBeforeDiscount = item.Price;
                }
            }else{
                if(descuentoPorTemporada){
                    item.U_Descuento = descuentoPorTemporada;
                    item.DiscountPercentSpecial = descuentoPorTemporada;
                    item.PriceBeforeDiscount = Number(item.Price);
                    item.Price = Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );
                }else{
                    item.U_Descuento = parseFloat(item.DescuentoFinal || 0);
                }
            }

            if(item.OnHandPrincipal <= 0){
                item.flag = 'green';
            } else {
                item.flag = 'green';
            }
        }    
            if (results.length > 0) {
                if (sortFilterValue === 'maxprice') {
                    results.sort(function (a:any, b:any) { return b.Price - a.Price; });
                }
                else if (sortFilterValue === 'minprice') {
                    results.sort(function (a:any, b:any) { return a.Price - b.Price; });
                }
                else {
                    results.sort(function (o1:any, o2:any) {
                        if (o1.ItemName < o2.ItemName) {
                            return -1;
                        }
                        else if (o1.ItemName > o2.ItemName) {
                            return 1;
                        }
                        else {
                            return 0;
                        }
                    });
                }
            }
        // Items and filters
        results2.map((item: any, index: Number) => {
            let favorite = favorites.filter((favorite: any) => {
                return (favorite.ItemCode == item.ItemCode)
            });

            let cart = shoppingCart.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            let back = backOrder.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            item.currency = currency;
            item.localLanguage = localLanguage;
            item.taxRate = tax;
            item.favorite = !!favorite.length;
            item.backOrder = !!back.length;
            item.quantity = cart.length ? cart[0].quantity : '';
            
            // item.priceTax = Number(((item.Price * (item.taxRate / 100)) + item.Price).toFixed(2));

            // SideBar Precios
            
            // min = index === 0 ? results[0].priceTax : (item.priceTax < min) ? item.priceTax : min;
            // max = index === 0 ? results[0].priceTax : (item.priceTax > max) ? item.priceTax : max;

            // SideBar Stock
            // if(item.OnHand === 0){
            //     missing++;
            // } else {
            //     available++;
            // }

            // SideBar Categorias
            // let parentArray = item.U_Handel_Tags || '';
            // parentArray = parentArray.split('|');
            itemsCategoryArray.push({'U_Categoria':item.U_Categoria});

            // SideBar Marcas
            itemsBrandArray.push({'U_Linea' : item.U_Linea});

            // SideBar Fabrica
            itemsFacilityArray.push(item.U_FMB_Handel_Fabrica);

            // SideBar Aparatos
            // itemsDevicesArray.push(item.U_FMB_Handel_Apara);

            // SideBar Refacciones
            // itemsSparePartsArray.push(item.U_FMB_Handel_Refa);
        });

        // ----------------------------- CATEGORIAS -------------------------------
        // Unir diferentes array dentro de uno solo
        // let joinedItemCatArray = itemsCategoryArray.sort((a:any, b:any) =>{
        //     return a.localeCompare(b);
        // });
        let finalJoinedItemCatArray : any = [];
        let current = null;
        let count = 0;
        for (let index = 0; index < itemsCategoryArray.length; index++) {
            const cat = itemsCategoryArray[index];
            if(cat.U_Categoria !== '' && cat.U_Categoria !== null){
                let find = finalJoinedItemCatArray.find((catFinal:any) => catFinal.category === cat.U_Categoria )
                if(!find){
                    finalJoinedItemCatArray.push({category:cat.U_Categoria,times: count})
                }
            }
            
        }
        // ----------------------------- MARCAS -------------------------------
        let finalItemsBrandArray : any = [];
        
        
        // model.action = 'getBrandsFilter';
        // itemsBrandArray = await ProductsProcedure(model);     
        current = null;
        count = 0;
        for (let index = 0; index < itemsBrandArray.length; index++) {
            const brand = itemsBrandArray[index];
            if(brand.U_Linea !== '' && brand.U_Linea !== null){
                let find = finalItemsBrandArray.find((brandFinal:any) => brandFinal.brand === brand.U_Linea )
                if(!find){
                    finalItemsBrandArray.push({brand:brand.U_Linea,times: count})
                }
            }
            
        }
        // for (let i = 0; i < itemsBrandArray.length; i++) {
        //     if(itemsBrandArray[i].brand !== '' && itemsBrandArray[i].brand !== null){
        //         if (itemsBrandArray[i].brand !== current) {
        //             if (count > 0 && current != null) {
        //                 finalItemsBrandArray.push({brand : current, times : count});
        //             }
        //             current = itemsBrandArray[i].brand;
        //             // code = itemsBrandArray[i].code;
        //             count = 1;
        //         } else {
        //             count++;
        //         }
        //     }
        // }
        // if (count > 0) {
        //     finalItemsBrandArray.push({ brand : current, times : count });
        // }

        // ----------------------------- FABRICA -------------------------------
        itemsFacilityArray = itemsFacilityArray.sort();
        let finalItemsFacilityArray : any = [];
        current = null;
        count = 0;
        for (let i = 0; i < itemsFacilityArray.length; i++) {
            if(itemsFacilityArray[i] !== '' && itemsFacilityArray[i] !== null){
                if (itemsFacilityArray[i] !== current) {
                    if (count > 0 && current != null) {
                        finalItemsFacilityArray.push({ facility : current, times : count });
                    }
                    current = itemsFacilityArray[i];
                    count = 1;
                } else {
                    count++;
                }
            }
        }
        if (count > 0) {
            finalItemsFacilityArray.push({ facility : current, times : count });
        }

        // ----------------------------- APARATOS -------------------------------
        // itemsDevicesArray = itemsDevicesArray.sort();
        // let finalItemsDevicesArray : any = [];
        // current = null;
        // count = 0;
        // for (let i = 0; i < itemsDevicesArray.length; i++) {
        //     if(itemsDevicesArray[i] !== '' && itemsDevicesArray[i] !== null){
        //         if (itemsDevicesArray[i] !== current) {
        //             if (count > 0 && current != null) {
        //                 finalItemsDevicesArray.push({ device : current, times : count });
        //             }
        //             current = itemsDevicesArray[i];
        //             count = 1;
        //         } else {
        //             count++;
        //         }
        //     }
        // }
        // if (count > 0) {
        //     finalItemsDevicesArray.push({ device : current, times : count });
        // }

        // ----------------------------- REFACCIONES -------------------------------
        // itemsSparePartsArray = itemsSparePartsArray.sort();
        // let finalItemsSparePartsArray : any = [];
        // current = null;
        // count = 0;
        // for (let i = 0; i < itemsSparePartsArray.length; i++) {
        //     if(itemsSparePartsArray[i] !== '' && itemsSparePartsArray[i] !== null){
        //         if (itemsSparePartsArray[i] !== current) {
        //             if (count > 0 && current != null) {
        //                 finalItemsSparePartsArray.push({ part : current, times : count });
        //             }
        //             current = itemsSparePartsArray[i];
        //             count = 1;
        //         } else {
        //             count++;
        //         }
        //     }
        // }
        // if (count > 0) {
        //     finalItemsSparePartsArray.push({ part : current, times : count });
        // }
        
        // Busqueda de todas las categorias
        let model2: CategoriesModel = new CategoriesModel();
        model2.action = 'findAll';
        model2.business = db_name;
        let resultCategories = await CategoriesProcedure(model2);
        resultCategories = resultCategories.sort();

        let categoryNameArray : any = [];
        let flagIncludesComma = false;

        // Asignar nombres de categorías        
        // finalJoinedItemCatArray.map((items: any) => {
        //     if(items.category){
        //         resultCategories.map((category: any) => {
        //             if(items.category.includes(',')){   
        //                 flagIncludesComma = false;
        //                 let categoryArray = items.category.split(',');
        //                 for (let i = 0; i < categoryArray.length; i++) {
        //                     let dinamicCategory = categoryArray[i];
        //                     if(dinamicCategory == category.Code){
        //                         categoryNameArray.push({i : i, value : category.Name});
        //                     }
        //                 }                      
        //             } else {
        //                 if(items.category == category.Code){
        //                     items.categoryName = category.Name;
        //                     flagIncludesComma = true;
        //                 }
        //             }
        //         });
        //         if(flagIncludesComma == false){
        //             categoryNameArray.sort(sortDynamicCategories("i", "asc"));   
        //             let objString = "";
        //             for (let j = 0; j < categoryNameArray.length; j++) {
        //                 objString = objString === '' ? objString + categoryNameArray[j].value : objString + ',' + categoryNameArray[j].value;
        //             }
        //             items.categoryName = objString;
        //             categoryNameArray = [];
        //         }
        //     }
        // });
        let allCategories = {
            pricesSideBar: { min: 0, max: 0 },
            // stock: { available: available, missing: missing },
            itemsCategories: finalJoinedItemCatArray,
            itemsBrands: finalItemsBrandArray,
            itemsFacilities: finalItemsFacilityArray,
            // itemsDevices: finalItemsDevicesArray,
            // itemsSpareParts: finalItemsSparePartsArray
        };

        // results -> Todos los articulos, totalRows -> Length de coincidencias, prices -> Precios max y min, itemCateg -> categorias
        // itemsBrands -> Marcas, itemsFacilities -> Fabrica, itemsDevices -> Aparatos, itemsSpareParts -> Refacciones
        responseModel.data = { results, totalRows, allCategories };
        responseModel.message = 'Productos';
        responseModel.status = 1
    } catch (e) {
        logger.error("ItemsController -> searchByKey ->",e);
        
        responseModel.message = "ocurrio un error al traer los productos";
    }
    response.json(responseModel);
}

function sortDynamicCategories(property:any,order:any) {
    let sort_order = 1;
    if(order === "desc"){
        sort_order = -1;
    }
    return function (a:any, b:any){
        if(a[property] < b[property]){
            return -1 * sort_order;
        } else if(a[property] > b[property]){
            return 1 * sort_order;
        }else{
            return 0 * sort_order;
        }
    }
}

export async function searchByCategory(request: Request, response: Response): Promise<void> {
    let {db_name, currency, localLanguage, priceList} = response.locals.business;
    const {wareHouse} = response.locals.business;
    let responseModel = new ResponseModel();
    const {category,uniqueFilter} = request.body;
    let {key} = request.params;
    let {shoppingCartPublic, whs, nextNum} = request.query;
    let {CardCode, ListNum,CardName} = response.locals.user;
    if (currency === 'MXP') {
        currency = 'MXN';
    }
    let actionFilter = '';
    let valueFilter = '';
    let value2Filter = '';
    if(uniqueFilter){
        let property = uniqueFilter.property;
        let value = uniqueFilter.value;
        switch(property){
            case "marca":
                actionFilter = 'marca';
                valueFilter = value;
                value2Filter = '';
            case "brand":
                actionFilter = 'brand';
                valueFilter = category.category;
                value2Filter = '';
            break;
            default: 
                actionFilter = '';
                valueFilter = '';
                value2Filter = '';
        }
    }
    if(category && category.brand){
        valueFilter = category.brand;
        actionFilter = 'brand';
        value2Filter = '';
    }
    let args = '';
    if (Array.isArray(valueFilter)) {
        for (let index = 0; index < valueFilter.length; index++) {
            let element = valueFilter[index];
            args += " '" + element + "',";
        }
        args = args.slice(0, -1);
        valueFilter = args;
    }
    try {
        // Create model
        let model: ProductsModel = new ProductsModel();

        // Items con paginacion (10)
        model.action = 'searchByCategory';
        model.business = db_name;
        model.cardCode = CardCode;
        model.wareHouse = whs ? whs : wareHouse;
        model.key = category.category || '';
        model.subCat1 = category.subC1 || '';
        model.subCat2 = category.subC2 || '';
        model.subCat3 = category.subC3 || '';
        model.actionFilter = actionFilter || '';
        model.valueFilter = valueFilter || '';
        model.value2Filter = value2Filter || '';
        model.nextNumber = nextNum || 0;
        // Call procedure
        let results = await ProductsProcedure(model);

       // // Filtros de SideBar (Todos los Items)
       model.action = 'searchByCategory';
       model.business = db_name;
       model.cardCode = CardCode;
       model.wareHouse = whs ? whs : wareHouse;
       model.key = category.category || '';
       model.subCat1 = category.subC1 || '';
       model.subCat2 = category.subC2 || '';
       model.subCat3 = category.subC3 || '';
       model.actionFilter = actionFilter || '';
       model.valueFilter = valueFilter || '';
       model.value2Filter = value2Filter || '';
       model.nextNumber = 99999; 
       // Call procedure
       let results2 = await ProductsProcedure(model);

       // Conteo de todos los items para paginación
       model.action = 'countSearchByCategory';
       model.business = db_name;
       model.cardCode = CardCode;
       model.wareHouse = whs ? whs : wareHouse;
       model.key = category.category || '';
       model.subCat1 = category.subC1 || '';
       model.subCat2 = category.subC2 || '';
       model.subCat3 = category.subC3 || '';
       model.actionFilter = actionFilter || '';
       model.valueFilter = valueFilter || '';
       model.value2Filter = value2Filter || '';
       let resultRows = await ProductsProcedure(model);
       let totalRows = resultRows[0].TotalRows || 0;

       let favorites: any = [];
       let shoppingCart: any = [];
       let backOrder: any = [];

       if (!shoppingCartPublic) {
            const profile: any = await getProfile(request, response, true);
            favorites = profile.data.favorites ? profile.data.favorites : [];
            shoppingCart = profile.data.shoppingCart ? profile.data.shoppingCart : [];
            backOrder = profile.data.backOrder ? profile.data.backOrder : [];
        } else {
            favorites = [];
            shoppingCart = shoppingCartPublic ? JSON.parse(shoppingCartPublic) : [];
            backOrder = [];
        }


        const resultTaxes: any = await getTaxes(request, response, true);
        if (!resultTaxes.status) {
            responseModel.message = "ocurrio un error al traer los productos";
            response.json(responseModel);
            return;
        }

        let tax = resultTaxes.data.Rate;

        let min = 0;
        let max = 0;
        // let available = 0;
        // let missing = 0;
        let itemsCategoryArray : any = [];
        let itemsBrandArray : any = [];
        let itemsFacilityArray : any = [];
        // let itemsDevicesArray : any = [];
        // let itemsSparePartsArray : any = [];

           // // Lista de precios
        let PriceList = ListNum && ListNum !== '' ? ListNum : priceList;
        let data = {
            actions : 'Discount',
            param1 : CardCode,
            param2 : CardName
        }
        let res = await AutorizacionesProcedure(data);
        // results.map((item: any, index : Number) => {
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
    

            let favorite = favorites.filter((favorite: any) => {
                return (favorite.ItemCode == item.ItemCode)
            });

            let cart = shoppingCart.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            let back = backOrder.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            // Special Prices Validation
            //########################################################################################################################
            let priceItem = -1;
            let discount = -1;
            let priceBeforeDisc: any = -1;

            item.QuantitySpecial = cart.length ? cart[0].quantity : 1;

            const DiscountSpecials = await DiscountSpecial(CardCode,item.ItemCode,1);
            item.DiscountPercentSpecial = parseFloat(DiscountSpecials[0].DescuentoFinal || 0)
            // DESCOMENTAR SI QUEREMOS QUE TODOS LOS ARTICULOS CON DESCUENTOS TENGAN LA ETIQUETA DE PROMOCIÓN 
            // item.U_FMB_Handel_Promo = DiscountSpecials[0].DescuentoFinal !== 0 ? 1 : 0;
            priceItem = parseFloat(DiscountSpecials[0].PrecioFinal);
            discount = parseFloat(DiscountSpecials[0].DescuentoFinal || 0);
            priceBeforeDisc = ((100 * priceItem) / (100 - discount)).toFixed(2);

            let flagDiscount = false;
            if (item.U_VInicio && item.U_VFin) {//item.DiscountPercentSpecial === 0 &&
                let inicial = new Date(item.U_VInicio);
                let final = new Date(item.U_VFin);
                let today = new Date();
                
                inicial.setMinutes(inicial.getMinutes() + inicial.getTimezoneOffset());
                final.setMinutes(final.getMinutes() + final.getTimezoneOffset());

                inicial.setHours(0, 0, 0, 0);
                final.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                //SOLO ENTRA SI ESTA DENTRO DEL RANGO DE FECHAS
                if (inicial <= today && today <= final) {
                    item.U_Descuento = item.U_Descuento;
                    flagDiscount = true;
                }else {
                    for (let i = 0; i < res.length; i++) {
                        const element = res[i];
                        if(element.U_Linea === item.U_FMB_Handel_Marca){
                            item.U_Descuento = 0;
                            flagDiscount = true;
                        }
                    }
                }                        
            }else {
                for (let i = 0; i < res.length; i++) {
                    const element = res[i];
                    if(element.U_Linea === item.U_FMB_Handel_Marca){
                        item.U_Descuento = Number(element.U_Descuento);
                        flagDiscount = true;
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

            //#######################################################################################################################

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
                // item.U_Descuento = res1[0].U_Descuento;
                if (item.U_TDescuento === 'ACM') {
                    descuentoPorTemporada = res1[0].U_Descuento;
                    precioPorTemporada = item.Price;
                    item.Price = Number(item.Price - (item.Price * (res1[0].U_Descuento || 0 / 100) / 100));
                }
            }
            /*#############################FECHA Descuento de temporada####################################*/

            item.currency = currency;
            item.localLanguage = localLanguage;
            item.favorite = !!favorite.length;
            item.backOrder = !!back.length;
            item.quantity = cart.length ? cart[0].quantity : '';
            item.taxRate = tax;
            // Precios por descuentos especiales
            if(priceBeforeDisc != -1  && !flagDiscount){
                item.Price = Number(priceItem);
                item.PriceBeforeDiscount = Number(priceBeforeDisc);
                item.PriceTaxBeforeDiscount = Number(((item.PriceBeforeDiscount * (item.taxRate / 100)) + item.PriceBeforeDiscount).toFixed(2));
            }
            item.priceTax = Number(((item.Price * (item.taxRate / 100)) + item.Price).toFixed(2));
            
            item.PriceECommerce = item.PriceECommerce;
            item.PriceTaxECommerce = Number(((item.PriceECommerce * (item.taxRate / 100)) + item.PriceECommerce).toFixed(2))

            if(flagDiscount){
                item.U_Descuento = item.U_Descuento_1 ? item.U_Descuento : 0;
                item.DiscountPercentSpecial = item.U_Descuento_1 ? item.U_Descuento : 0;
                // if(item.U_TDescuento === 'ESP'){
                //     item.DiscountPercentSpecial = 0;
                //     item.U_Descuento = 0;
                // }
                item.PriceBeforeDiscount = Number(item.Price);
                item.Price = Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );

                if(descuentoPorTemporada !== 0 && !item.DiscountPercentSpecial){
                    item.PriceBeforeDiscount = precioPorTemporada;
                    item.U_Descuento = descuentoPorTemporada;
                    item.DiscountPercentSpecial = descuentoPorTemporada;
                }

                if (item.U_TDescuento === 'ESP') {
                    item.DiscountPercentSpecial = 0;
                    item.U_Descuento = 0;
                    item.PriceBeforeDiscount = item.Price;
                }
            }else{
                if(descuentoPorTemporada){
                    item.U_Descuento = descuentoPorTemporada;
                    item.DiscountPercentSpecial = descuentoPorTemporada;
                    item.PriceBeforeDiscount = Number(item.Price);
                    item.Price = Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );
                }else{
                    item.U_Descuento = parseFloat(DiscountSpecials[0].DescuentoFinal || 0);
                }
            }

            if(item.OnHandPrincipal <= 0){
                item.flag = 'green';
            } else {
                item.flag = 'green';
            }
        }

        results2.map((item: any, index : Number) => {

            let favorite = favorites.filter((favorite: any) => {
                return (favorite.ItemCode == item.ItemCode)
            });

            let cart = shoppingCart.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            let back = backOrder.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            item.currency = currency;
            item.localLanguage = localLanguage;
            item.favorite = !!favorite.length;
            item.backOrder = !!back.length;
            item.quantity = cart.length ? cart[0].quantity : '';
            item.taxRate = tax;
            item.priceTax = Number(((item.Price * (item.taxRate / 100)) + item.Price).toFixed(2));

            // SideBar Precios
            min = index === 0 ? results[0].priceTax : (item.priceTax < min) ? item.priceTax : min;
            max = index === 0 ? results[0].priceTax : (item.priceTax > max) ? item.priceTax : max;

            // SideBar Stock
            // if(item.OnHand === 0){
            //     missing++;
            // } else {
            //     available++;
            // }

            // SideBar Categorias
            // let parentArray = item.U_Handel_Tags || '';
            // parentArray = parentArray.split('|');
            itemsCategoryArray.push({'U_Categoria':item.U_Categoria});

            // SideBar Marcas
            itemsBrandArray.push({'U_Linea':item.U_Linea});

            // SideBar Fabrica
            itemsFacilityArray.push(item.U_FMB_Handel_Fabrica);

            // SideBar Aparatos
            // itemsDevicesArray.push(item.U_FMB_Handel_Apara);

            // SideBar Refacciones
            // itemsSparePartsArray.push(item.U_FMB_Handel_Refa);
        });

        // ----------------------------- CATEGORIAS -------------------------------
        // Unir diferentes array dentro de uno solo
        // let joinedItemCatArray = [].concat(...itemsCategoryArray).sort();
        // let joinedItemCatArray = itemsCategoryArray.sort((a:any, b:any) =>{
        //     return a.localeCompare(b);
        // });
        let finalJoinedItemCatArray : any = [];
        let current = null;
        let count = 0;
        for (let index = 0; index < itemsCategoryArray.length; index++) {
            const cat = itemsCategoryArray[index];
            if(cat.U_Categoria !== '' && cat.U_Categoria !== null){
                let find = finalJoinedItemCatArray.find((catFinal:any) => catFinal.category === cat.U_Categoria )
                if(!find){
                    finalJoinedItemCatArray.push({category:cat.U_Categoria,times: count})
                }
            }
            
        }

        // ----------------------------- MARCAS -------------------------------        
        // itemsBrandArray = itemsBrandArray.sort((a:any, b:any) =>{
        //     return a.localeCompare(b);
        // });
        
        let finalItemsBrandArray : any = [];
        current = null;
        count = 0;
        for (let index = 0; index < itemsBrandArray.length; index++) {
            const brand = itemsBrandArray[index];
            if(brand.U_Linea !== '' && brand.U_Linea !== null){
                let find = finalItemsBrandArray.find((brandFinal:any) => brandFinal.brand === brand.U_Linea )
                if(!find){
                    finalItemsBrandArray.push({brand:brand.U_Linea,times: count})
                }
            }
            
        }

        // ----------------------------- FABRICA -------------------------------
        itemsFacilityArray = itemsFacilityArray.sort();
        let finalItemsFacilityArray : any = [];
        current = null;
        count = 0;
        for (let i = 0; i < itemsFacilityArray.length; i++) {
            if(itemsFacilityArray[i] !== '' && itemsFacilityArray[i] !== null){
                if (itemsFacilityArray[i] !== current) {
                    if (count > 0 && current != null) {
                        finalItemsFacilityArray.push({ facility : current, times : count });
                    }
                    current = itemsFacilityArray[i];
                    count = 1;
                } else {
                    count++;
                }
            }
        }
        if (count > 0) {
            finalItemsFacilityArray.push({ facility : current, times : count });
        }

        // ----------------------------- APARATOS -------------------------------
        // itemsDevicesArray = itemsDevicesArray.sort();
        // let finalItemsDevicesArray : any = [];
        // current = null;
        // count = 0;
        // for (let i = 0; i < itemsDevicesArray.length; i++) {
        //     if(itemsDevicesArray[i] !== '' && itemsDevicesArray[i] !== null){
        //         if (itemsDevicesArray[i] !== current) {
        //             if (count > 0 && current != null) {
        //                 finalItemsDevicesArray.push({ device : current, times : count });
        //             }
        //             current = itemsDevicesArray[i];
        //             count = 1;
        //         } else {
        //             count++;
        //         }
        //     }
        // }
        // if (count > 0) {
        //     finalItemsDevicesArray.push({ device : current, times : count });
        // }

        // ----------------------------- REFACCIONES -------------------------------
        // itemsSparePartsArray = itemsSparePartsArray.sort();
        // let finalItemsSparePartsArray : any = [];
        // current = null;
        // count = 0;
        // for (let i = 0; i < itemsSparePartsArray.length; i++) {
        //     if(itemsSparePartsArray[i] !== '' && itemsSparePartsArray[i] !== null){
        //         if (itemsSparePartsArray[i] !== current) {
        //             if (count > 0 && current != null) {
        //                 finalItemsSparePartsArray.push({ part : current, times : count });
        //             }
        //             current = itemsSparePartsArray[i];
        //             count = 1;
        //         } else {
        //             count++;
        //         }
        //     }
        // }
        // if (count > 0) {
        //     finalItemsSparePartsArray.push({ part : current, times : count });
        // }

        // Busqueda de todas las categorias
        let model2: CategoriesModel = new CategoriesModel();
        model2.action = 'findAll';
        model2.business = db_name;
        let resultCategories = await CategoriesProcedure(model2);
        resultCategories = resultCategories.sort();

        let categoryNameArray : any = [];
        let flagIncludesComma = false;

        // Asignar nombres de categorías        
        // finalJoinedItemCatArray.map((items: any) => {
        //     if(items.category){
        //         resultCategories.map((category: any) => {
        //             if(items.category.includes(',')){   
        //                 flagIncludesComma = false;
        //                 let categoryArray = items.category.split(',');
        //                 for (let i = 0; i < categoryArray.length; i++) {
        //                     let dinamicCategory = categoryArray[i];
        //                     if(dinamicCategory == category.Code){
        //                         categoryNameArray.push({i : i, value : category.Name});
        //                     }
        //                 }                 
        //             } else {
        //                 if(items.category == category.Code){
        //                     items.categoryName = category.Name;
        //                     flagIncludesComma = true;
        //                 }
        //             }
        //         });
        //         if(flagIncludesComma == false){
        //             categoryNameArray.sort(sortDynamicCategories("i", "asc"));   
        //             let objString = "";
        //             for (let j = 0; j < categoryNameArray.length; j++) {
        //                 objString = objString === '' ? objString + categoryNameArray[j].value : objString + ',' + categoryNameArray[j].value;
        //             }
        //             items.categoryName = objString;
        //             categoryNameArray = [];
        //         }
        //     }
        // });
        let allCategories = {
            pricesSideBar: { min: min, max: max },
            // stock: { available: available, missing: missing },
            itemsCategories: finalJoinedItemCatArray,
            itemsBrands: finalItemsBrandArray,
            itemsFacilities: finalItemsFacilityArray,
            // itemsDevices: finalItemsDevicesArray,
            // itemsSpareParts: finalItemsSparePartsArray
        };

        // results -> Todos los articulos, totalRows -> Length de coincidencias, prices -> Precios max y min, itemCateg -> categorias
        // itemsBrands -> Marcas, itemsFacilities -> Fabrica, itemsDevices -> Aparatos, itemsSpareParts -> Refacciones
        responseModel.data = { results, totalRows, allCategories };
        responseModel.message = 'Productos';
        responseModel.status = 1
    } catch (e) {
        logger.error("ItemsController -> searchByCategory ->", e);
        responseModel.message = "ocurrio un error al traer los productos";
    }

    response.json(responseModel);
}

export async function getItemDetails(request: Request, response: Response): Promise<void> {
    let {db_name, currency, localLanguage, priceList} = response.locals.business;
    const {wareHouse} = response.locals.business;
    let responseModel = new ResponseModel();
    let {itemCode} = request.params;
    let alias = decodeURIComponent(itemCode);
    let {CardCode, ListNum, CardName} = response.locals.user;
    let {shoppingCartPublic} = request.query;

    if (currency === 'MXP') {
        currency = 'MXN';
    }

    try {
        // Create model
        let model: ProductsModel = new ProductsModel();

        model.action = 'findOne';
        model.business = db_name;
        model.cardCode = CardCode;
        model.wareHouse = wareHouse;
        //model.itemCode = itemCode;
        model.key = `${alias}`;

        // Call procedure
        const result = await ProductsProcedure(model);
        
        let favorites: any = [];
        let shoppingCart: any = [];
        let backOrder: any = [];

        if (!shoppingCartPublic) {
            const profile: any = await getProfile(request, response, true);
            favorites = profile.data.favorites ? profile.data.favorites : [];
            shoppingCart = profile.data.shoppingCart ? profile.data.shoppingCart : [];
            backOrder = profile.data.backOrder ? profile.data.backOrder : [];
        } else {
            favorites = [];
            shoppingCart = shoppingCartPublic ? JSON.parse(shoppingCartPublic) : [];
            backOrder = [];
        }

        const resultTaxes: any = await getTaxes(request, response, true);
        if (!resultTaxes.status) {
            responseModel.message = "ocurrio un error al traer los productos";
            response.json(responseModel);
            return;
        }

        let tax = resultTaxes.data.Rate;

           // // Lista de precios
        let PriceList = ListNum && ListNum !== '' ? ListNum : priceList;

        // Todas las promos en caso de que caiga en cantidad (Para ItemDetails)
        let quantityPromoSN : any = [];
        let quantityPromoPriceList : any = [];
        let data = {
            actions : 'Discount',
            param1 : CardCode,
            param2 : CardName
        }
        let res = await AutorizacionesProcedure(data);
        // result.map((item: any) => {
        for (let index = 0; index < result.length; index++) {
            const item = result[index];
            
            let favorite = favorites.filter((favorite: any) => {
                return (favorite.ItemCode == item.ItemCode)
            });

            let cart = shoppingCart.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            let back = backOrder.filter((shopping: any) => {
                return (shopping.ItemCode == item.ItemCode)
            });

            // Special Prices Validation
            //########################################################################################################################
            let priceItem = -1;
            let discount = -1;
            let priceBeforeDisc: any = -1;

            item.QuantitySpecial = cart.length ? cart[0].quantity : 1;
            
            const DiscountSpecials = await DiscountSpecial(CardCode,item.ItemCode,1);
            item.DiscountPercentSpecial = parseFloat(DiscountSpecials[0].DescuentoFinal || 0)
            // DESCOMENTAR SI QUEREMOS QUE TODOS LOS ARTICULOS CON DESCUENTOS TENGAN LA ETIQUETA DE PROMOCIÓN 
            // item.U_FMB_Handel_Promo = DiscountSpecials[0].DescuentoFinal !== 0 ? 1 : 0;
            priceItem = parseFloat(DiscountSpecials[0].PrecioFinal);
            discount = parseFloat(DiscountSpecials[0].DescuentoFinal || 0);
            priceBeforeDisc = ((100 * priceItem) / (100 - discount)).toFixed(2);

            let flagDiscount = false;
            if (item.U_VInicio && item.U_VFin) {//item.DiscountPercentSpecial === 0 &&
                let inicial = new Date(item.U_VInicio);
                let final = new Date(item.U_VFin);
                let today = new Date();
                
                inicial.setMinutes(inicial.getMinutes() + inicial.getTimezoneOffset());
                final.setMinutes(final.getMinutes() + final.getTimezoneOffset());

                inicial.setHours(0, 0, 0, 0);
                final.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                //SOLO ENTRA SI ESTA DENTRO DEL RANGO DE FECHAS
                if (inicial <= today && today <= final) {
                    item.U_Descuento = item.U_Descuento;
                    flagDiscount = true;
                }else {
                    for (let i = 0; i < res.length; i++) {
                        const element = res[i];
                        if(element.U_Linea === item.U_FMB_Handel_Marca){
                            item.U_Descuento = 0;
                            flagDiscount = true;
                        }
                    }
                }                        
            }else {
                for (let i = 0; i < res.length; i++) {
                    const element = res[i];
                    if(element.U_Linea === item.U_FMB_Handel_Marca){
                        item.U_Descuento = Number(element.U_Descuento);
                        flagDiscount = true;
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

            //#######################################################################################################################

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
                // item.U_Descuento = res1[0].U_Descuento;
                if (item.U_TDescuento === 'ACM') {
                    descuentoPorTemporada = res1[0].U_Descuento;
                    precioPorTemporada = item.Price;
                    item.Price = Number(item.Price - (item.Price * (res1[0].U_Descuento || 0 / 100) / 100));
                }
            }
            /*#############################FECHA Descuento de temporada####################################*/
            item.currency = currency;
            item.localLanguage = localLanguage;
            item.favorite = !!favorite.length;
            item.backOrder = !!back.length;
            item.quantity = cart.length ? cart[0].quantity : '';
            item.taxRate = tax;
            // Precios por descuentos especiales
            if(priceBeforeDisc != -1  && !flagDiscount){
                item.Price = Number(priceItem);
                item.PriceBeforeDiscount = Number(priceBeforeDisc);
                item.PriceTaxBeforeDiscount = Number(((item.PriceBeforeDiscount * (tax / 100)) + item.PriceBeforeDiscount).toFixed(2));
                if(quantityPromoSN.length > 0){
                    item.quantityPromoSN = quantityPromoSN;
                }
                if(quantityPromoPriceList.length > 0){
                    item.quantityPromoPriceList = quantityPromoPriceList;
                }
            }
            item.priceTax = Number(((item.Price * (item.taxRate / 100)) + item.Price).toFixed(2));
            item.PriceECommerce = item.PriceECommerce;
            item.UserPriceDetailsView = item.UserPriceDetailsView;
            item.PriceTaxECommerce = Number(((item.PriceECommerce * (item.taxRate / 100)) + item.PriceECommerce).toFixed(2))

            if(flagDiscount){
                item.U_Descuento = item.U_Descuento_1 ? item.U_Descuento : 0;
                item.DiscountPercentSpecial = item.U_Descuento_1 ? item.U_Descuento : 0;
                // if(item.U_TDescuento === 'ESP'){
                //     item.DiscountPercentSpecial = 0;
                //     item.U_Descuento = 0;
                // }
                item.PriceBeforeDiscount = Number(item.Price);
                item.Price = Number((item.Price) - (item.Price * (item.U_Descuento/100)))//Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );

                if(descuentoPorTemporada !== 0 && !item.DiscountPercentSpecial){
                    item.PriceBeforeDiscount = precioPorTemporada;
                    item.U_Descuento = descuentoPorTemporada;
                    item.DiscountPercentSpecial = descuentoPorTemporada;
                }

                if (item.U_TDescuento === 'ESP') {
                    item.DiscountPercentSpecial = 0;
                    item.U_Descuento = 0;
                    item.PriceBeforeDiscount = item.Price;
                }
            }else{
                if(descuentoPorTemporada){
                    item.U_Descuento = descuentoPorTemporada;
                    item.DiscountPercentSpecial = descuentoPorTemporada;
                    item.PriceBeforeDiscount = Number(item.Price);
                    item.Price = Number(item.Price - (item.Price * (item.U_Descuento || 0 / 100) / 100) );
                }else{
                    item.U_Descuento = parseFloat(DiscountSpecials[0].DescuentoFinal || 0);
                }
            }
            
            if(item.OnHandPrincipal <= 0){
                item.flag = 'green';
            } else {
                item.flag = 'green';
            }
        }

        responseModel.data = result[0] || {};
        responseModel.message = 'Producto';
        responseModel.status = 1
    } catch (e) {
        logger.error("ItemsController -> getItemDetails ->", e);
        responseModel.message = "ocurrio un error al traer el detalle del producto";
    }

    response.json(responseModel);
}


export async function getStockDetails(request: Request, response: Response): Promise<void> {
    let {db_name} = response.locals.business;
    let responseModel = new ResponseModel();
    let {itemCode} = request.params;
    let alias = decodeURIComponent(itemCode);

    try {
        // Create model
        let model: ProductsModel = new ProductsModel();
        model.action = 'getStockDetails';
        model.business = db_name;
        model.itemCode = alias;

        // Call procedure
        const result = await ProductsProcedure(model);
        if (!result) {
            responseModel.message = "Ocurrió un error al traer los detalles de stock del producto";
            response.json(responseModel);
            return;
        }
        responseModel.data = result ?? {};
        responseModel.message = 'Producto';
        responseModel.status = 1
    } catch (e) {
        logger.error("ItemsController -> getStockDetails ->", e);
        responseModel.message = "Ocurrió un error al traer los detalles de stock del producto";
    }

    response.json(responseModel);
}

export async function getCategories(request: Request, response: Response): Promise<void> {
    let {db_name} = response.locals.business;
    let responseModel = new ResponseModel();

    try {
        let model: CategoriesModel = new CategoriesModel();

        model.action = 'findAll';
        model.business = db_name;
        let result = await CategoriesProcedure(model);

        result.map((category: any) => {
            let parentArray = category.U_Parent || '';
            parentArray = parentArray.split('|');
            category.parentArray = parentArray;
        });


        const getChildren: any = (categories: any, father: any, search: string) => {
            let newChildren: any = [];

            for (let i = 0; i < categories.length; i++) {
                if (categories[i].U_Parent) {
                    if (categories[i].parentArray.includes(father.Code)) {
                        let newSearch = search + ',' + categories[i].Code;
                        let children = getChildren(categories, categories[i], newSearch);
                        newChildren.push({
                            category: {
                                code: categories[i].Code,
                                name: categories[i].Name,
                                search: newSearch,
                                enabled: !(!!children.length)
                            },
                            children: children
                        });
                    }
                }
            }

            return newChildren;
        };

        // get first father array
        let newCategories: any = [];
        for (let i = 0; i < result.length; i++) {
            if (!result[i].U_Parent) {
                let children = getChildren(result, result[i], result[i].Code);
                newCategories.push({
                    category: {code: result[i].Code, name: result[i].Name, search: result[i].Code, enabled: !(!!children.length)},
                    children: children
                });
            }
        }

        responseModel.status = 1;
        responseModel.message = 'lista de categorias';
        responseModel.data = {categories: newCategories};

        response.json(responseModel);
        return;
    } catch (e) {
        logger.error("ItemsController -> getCategories ->", e);
    }
    response.json(responseModel)
}

export async function getImage(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    let {itemCode} = request.params;
    try {
        // Create model
        let exists = fs.existsSync('./images/' + itemCode);
        if (exists) {
            response.sendFile(path.resolve('./images/' + itemCode));
            return;
        }
        response.sendFile(path.resolve('./images/noImage.png'));
    } catch (e) {
        logger.error("ItemsController -> getImage ->", e);
        responseModel.message = "ocurrio un error al traer la imagen del producto";
        response.json(responseModel);
    }
}

export async function getImageCategories(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    let {itemCode} = request.params;
    try {
        // Create model
        let exists = fs.existsSync('./categories/' + itemCode);
        if (exists) {
            response.sendFile(path.resolve('./categories/' + itemCode));
            return;
        }
        response.sendFile(path.resolve('./images/noImage.png'));
    } catch (e) {
        logger.error("ItemsController -> getImageCategories ->", e);
        responseModel.message = "ocurrio un error al traer la imagen del producto";
        response.json(responseModel);
    }
}

export async function getPolitics(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    let {itemCode} = request.params;
    try {
        // Create model
        let exists = fs.existsSync('./politicas/' + itemCode);
        if (exists) {
            response.sendFile(path.resolve('./politicas/' + itemCode));
            return;
        }
        response.sendFile(path.resolve('./images/noImage.png'));
    } catch (e) {
        logger.error("ItemsController -> getPolitics ->", e);
        responseModel.message = "ocurrio un error al traer la imagen del producto";
        response.json(responseModel);
    }
}

export async function getFile(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    try {
        let {file} = request.params;
        let exists = fs.existsSync('./files/' + file);
        if (exists) {
            response.sendFile(path.resolve('./files/' + file));
            return;
        }
        responseModel.message = "El archivo no existe";
        response.json(responseModel);
    } catch (e) {
        logger.error("ItemsController -> getPolitics ->", e);
        responseModel.message = "ocurrio un error al traer el archivo";
        response.json(responseModel);
    }
}

export async function getBillspdf(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    let {docEntry} = request.params;
    try {
        let exists = fs.existsSync('./facturas/' + docEntry+'.pdf');
        if (exists) {
            response.sendFile(path.resolve('./facturas/' + docEntry+'.pdf'));
            return;
        }
        response.sendFile(path.resolve('./images/noImage.png'));
    } catch (e) {
        logger.error("ItemsController -> getBillspdf ->", e);
        responseModel.message = "ocurrio un error al traer la factura del cliente";
        response.json(responseModel);
    }
}

export async function getBillsxml(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    let {docEntry} = request.params;
    try {
        // Create model
        let exists = fs.existsSync('./facturas/' + docEntry+'.xml');
        if (exists) {
            response.sendFile(path.resolve('./facturas/' + docEntry+'.xml'));
            return;
        }
        response.sendFile(path.resolve('./images/noImage.png'));
    } catch (e) {
        logger.error("ItemsController -> getBillsxml ->", e);
        responseModel.message = "ocurrio un error al traer la factura del cliente";
        response.json(responseModel);
    }
}

export async function getOrderspdf(request: Request, response: Response): Promise<void> {
    let responseModel = new ResponseModel();
    let {docEntry} = request.params;
    try {
        // Create model
        let exists = fs.existsSync('./ordenCompra/' + docEntry);
        if (exists) {
            response.sendFile(path.resolve('./ordenCompra/' + docEntry));
            return;
        }
        response.sendFile(path.resolve('./images/noImage.png'));
    } catch (e) {
        logger.error("ItemsController -> getOrderspdf ->", e);
        responseModel.message = "ocurrio un error al traer la factura del cliente";
        response.json(responseModel);
    }
}

export async function getCartSaved(request: Request, response: Response): Promise<void> {
    let {db_name} = response.locals.business;
    let responseModel = new ResponseModel();
    let { action, usuario, fechaInicio, fechaFinal} = request.body.data;
    
    try {
        let model: CategoriesModel = new CategoriesModel();
        
        let detalle = {
            actions : action,   // 
            param1 : usuario,
            param2 : fechaInicio,
            param3 : fechaFinal,
        }
        let result = await AutorizacionesProcedure(detalle);
        responseModel.status = 1;
        responseModel.data = { list: result};
        response.json(responseModel);
    } catch (e) {
        logger.error("ItemsController -> getCartSaved ->", e);
        responseModel.message = "Ocurrió un problema inesperado";
        response.json(responseModel);
    }
}

export async function getDetailsSaved(request: Request, response: Response): Promise<void> {
    let {db_name} = response.locals.business;
    let responseModel = new ResponseModel();
    let { usuario,Items,docEntry} = request.body.data;
    try {

        let list = JSON.parse(Items);
        let responseBody = [];
        let datos:any = [];
        try {
            let DATOS = {
                actions : 'DATOS',
                param1 : usuario, 
            }
            datos = await AutorizacionesProcedure(DATOS)

            for (let i of list){
                
                let detalle = {
                    actions : 'getDataProduct',
                    param1 : usuario,
                    param2 :  i.ItemCode,
                }
                let responseProdcut = await AutorizacionesProcedure(detalle);
                let Precio = i.Price ? i.Price : responseProdcut[0].Price;
                if(responseProdcut.length > 0){
                    responseBody.push({
                        ItemCode: responseProdcut[0].ItemCode,
                        ItemName: responseProdcut[0].ItemName,
                        PicturName: responseProdcut[0].PicturName,
                        Quantity: parseInt(i.quantity),
                        Price: Number(i.Price ? i.Price : responseProdcut[0].Price).toFixed(2),                    
                        U_Handel_ImagesArray: responseProdcut[0].U_Handel_ImagesArray,                     
                        Discount : i.Disc ? i.Disc : 0,
                        PriceDiscount : Number(i.Price - (i.Price * (i.Disc || 0 / 100) / 100) ),
                        id: docEntry,                  
                        updateCart : responseProdcut[0].updateCart,
                        SuppCatNum : responseProdcut[0].SuppCatNum,
                        beforeTotal : ((Precio - (Precio * (i.Disc || 0 / 100) / 100)) * (parseInt(i.quantity))),
                        newTotal : Number(((Precio - (Precio * (i.Disc || 0 / 100) / 100)) * (parseInt(i.quantity)))).toFixed(4),
                    });
                }
            }
        } catch (error) {
            logger.error('CartSaveds', error)
        }
            
        responseModel.status = 1;
        responseModel.data = { list: responseBody, datos};
        response.json(responseModel);
    } catch (e) {
        logger.error('getDetailsSaved => ',e);
        responseModel.message = "Ocurrió un problema inesperado";
        response.json(responseModel);
    }
}

export async function deleteCartSaved(request: Request, response: Response) {
    const { id } = request.params;
    let responseModel = new ResponseModel();
    try {
  
        let detalle = {
            actions : 'deleteCartSaved',
            param1 : id
        }
        let result = await AutorizacionesProcedure(detalle);
        responseModel.status = 1;
        responseModel.message = "Detail Profile";
        responseModel.data =  result;
        response.json(responseModel);
    } catch (e) {
        logger.error('deleteCartSaved => ',e);
        responseModel.message = "Ocurrió un problema inesperado";
        response.json(responseModel);
    }
}

export async function getMenuCategories(request: Request, response: Response): Promise<void> {
    let model: ProductsModel = new ProductsModel();   
    model.action = 'getMenuCategories'
    let resultsX = await ProductsProcedure(model);
    // console.log('DARWIN>>resultsX',resultsX);
    let arrCategory:any = []
    let arrSubCategory1:any = []
    let arrSubCategory2:any = []
    let arrSubCategory3:any = []

    let finalCAT1:any = []
    let finalCAT2:any = []
    let finalCAT3:any = []
    for (let index = 0; index < resultsX.length; index++) {
        const resultadoCategory = resultsX[index];
        
        //FIND CATEGORIES
        const existCategory = arrCategory.find((CATE:any)=>{
            return resultadoCategory.CATEGORY === CATE.U_Categoria
        })
        if(!existCategory){
            arrCategory.push({U_Categoria:resultadoCategory.CATEGORY})
        }
        //-----------END FIND CATEGORIES

        //FIND SUBCATEGORY 1
        if(resultadoCategory.SUBCATEGORY1){
            const subCategory1 = resultadoCategory.SUBCATEGORY1.split('|')
            if(subCategory1){
                for (let index = 0; index < subCategory1.length; index++) {
                    const subcat1 = subCategory1[index];
                    const title = subcat1.split('~')
                    const subCat1TitleExist = arrCategory.find((cate:any)=> {return cate.U_Categoria === title[0]})
                    if(subCat1TitleExist){
                        const subcat1Exist = arrSubCategory1.find((sub1:any)=>{
                            return sub1.subC1 === title[1]
                        })
                        if(!subcat1Exist){
                            const data = {
                                category:subCat1TitleExist.U_Categoria,
                                subC1:title[1]
                            }
                            arrSubCategory1.push(data)
                        }
                        
                    }
                }
               
    
            }
            if(arrSubCategory1.length > 0){
                const groupedData: Record<string, string[]> = arrSubCategory1.reduce((acc:any, item:any) => {
                    const { category, subC1 } = item;
                
                    if (!acc[category]) {
                        acc[category] = [];
                    }
                
                    acc[category].push({U_Subcategoria1:subC1});
                
                    return acc;
                }, {});
                
                // Convertimos el objeto en un array de objetos
                const result: { category: string; subC1: string[] }[] = Object.entries(groupedData).map(([category, subC1]) => ({
                    category,
                    subC1,
                }));
                finalCAT1 = result
            }
        }
        //-------------END FIND SUBCATEGORY 1

        //FIND SUBCATEGORY 2
        if(resultadoCategory.SUBCATEGORY2){
            const subCategory2 =  resultadoCategory.SUBCATEGORY2.split('|')
            if(subCategory2){
                for (let index = 0; index < subCategory2.length; index++) {
                    const subcat2 = subCategory2[index];
                    const title = subcat2.split('~')
                    const subCat2TitleExist = arrSubCategory1.find((cate:any)=>{
                        return cate.subC1 === title[1] && cate.category === title[0]
                    })
                    if(subCat2TitleExist){
                        const subcat2Exist = arrSubCategory2.find((sub2:any)=>{
                            return sub2.subC2 === title[2] 
                        })
                        if(!subcat2Exist){
                            let data = {
                                category: subCat2TitleExist.category,
                                Subcategory1: subCat2TitleExist.subC1,
                                subC2:title[2]
                            }
                            arrSubCategory2.push(data)
                        }
                    }
                    
                }
            }
            
            arrSubCategory2.forEach((item:any) => {
                const { category, Subcategory1, subC2 } = item;
              
                // Buscar si ya existe la categoría y subcategoría en el resultado
                const existingCategory = finalCAT2.find((c:any) => c.category === category && c.subcategory === Subcategory1);

                if (existingCategory) {
                  // Verificar si el valor subC2 no está en el array antes de agregarlo
                  let exist = existingCategory.subC2.find((subc2:any)=>{return subc2.U_Subcategoria2 === subC2})
                  if (!exist) {
                    existingCategory.subC2.push({U_Subcategoria2:subC2});
                  }
                } else {
                    finalCAT2.push({ category, subcategory: Subcategory1, subC2: [{U_Subcategoria2:subC2}] });
                }
              });
           
        }
        //-------------END FIND SUBCATEGORY 2
        //FIND SUBCATEGORY 3
        if(resultadoCategory.SUBCATEGORY3){
            const subCategory3 =  resultadoCategory.SUBCATEGORY3.split('|')
            if(subCategory3){
                for (let index = 0; index < subCategory3.length; index++) {
                    const subcat3 = subCategory3[index];
                    const title = subcat3.split('~')
                    const subCat3TitleExist = arrSubCategory2.find((cate:any)=>{
                        return cate.subC2 === title[2] && cate.category === title[0] && cate.Subcategory1 === title[1]
                    })
                    if(subCat3TitleExist){
                        const subcat3Exist = arrSubCategory3.find((sub2:any)=>{
                            return sub2.subC3 === title[3]
                        }) 
                        if(!subcat3Exist){
                            let data = {
                                category: subCat3TitleExist.category,
                                Subcategory1: subCat3TitleExist.Subcategory1,
                                Subcategory2:subCat3TitleExist.subC2,
                                subC3:title[3] 
                            }
                            arrSubCategory3.push(data)
                        }
                    }
                    
                }
            }

            arrSubCategory3.forEach((item:any) => {
                const { category, Subcategory1,Subcategory2, subC3 } = item;
              
                // Buscar si ya existe la categoría y subcategoría en el resultado
                const existingCategory = finalCAT3.find((c:any) => c.category === category && c.subcategory === Subcategory1 && c.subcategory2 === Subcategory2);

                if (existingCategory) {
                  // Verificar si el valor subC2 no está en el array antes de agregarlo
                  let exist = existingCategory.subC3.find((subC:any)=>{return subC.U_Subcategoria3 === subC3})
                  if (!exist) {
                    existingCategory.subC3.push({U_Subcategoria3:subC3});
                  }
                } else {
                    finalCAT3.push({ category, subcategory: Subcategory1,subcategory2:Subcategory2, subC3: [{U_Subcategoria3:subC3}] });
                }
              });
          
        }
        //-------------END FIND SUBCATEGORY 3
    }
    let responseModel = new ResponseModel();
    responseModel.data = {arrCategory,arrSubCategory1:finalCAT1,arrSubCategory2:finalCAT2,arrSubCategory3:finalCAT3}
    // responseModel.data = {finalCAT2}
    response.json(responseModel)
}