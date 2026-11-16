import {Order} from "@/app/shared/types/Order";

export interface TableOrderBase {
    orders: Order[],
    table: string,
    resId?: string; // optional because at client we dont have the resId but will be added at server
}

export interface TableOrderOutput extends TableOrderBase {
    createdAt: string;
    _id: string;
    isPayed: boolean;
}