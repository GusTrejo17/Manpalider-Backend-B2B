import ProcedureModel from "./ProcedureModel";

export default class ProductsModel extends ProcedureModel {
    cardCode:string = '';
    key: string = '';
    wareHouse:string = '';
    itemCode: string = '';
    nextNumber: number = 0;
    quantity : number = 0;
    actionFilter : string = '';
    valueFilter : string = '';
    value2Filter : string = '';
    view: string ='';
    topItems: string = '';
    sortFilter: string = '';
    subCat1: string = '';
    subCat2: string = '';
    subCat3: string = '';
}