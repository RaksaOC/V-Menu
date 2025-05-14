import {CartItem} from "@/app/shared/types/CartItem";

export interface Order {
    orderedItems: CartItem[];
}

export interface OrderOutput extends Order {
    _id: string;
    isDone: boolean;
}

export interface OrderInput extends Order {
    isDone: boolean;
}