import {Order} from "@/app/shared/types/Order";

export interface TableOrderBase {
    orders: Order[],
    table: string,
}

export interface TableOrderOutput extends TableOrderBase {
    _id: string;
    isPayed: boolean;
}