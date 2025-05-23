import {CartItem} from "@/app/shared/types/CartItem";

export interface Order {
    createdAt: any;
    orderedItems: CartItem[];
}

export interface OrderOutput extends Order {
    createdAt: string;
    _id: string;
    isDone: boolean;
    table: string;
}

export interface OrderInput extends Order {
    isDone: boolean;
    table: string;
    resId?: string; // optional because at client we dont have the resId but will be added at server
}