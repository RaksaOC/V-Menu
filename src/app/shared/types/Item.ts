export interface ItemBase {
    name: string;
    image: string;
    price: number;
}

export interface ItemOutput extends ItemBase {
    _id: string;
    isEnabled: boolean;
}

export interface ItemInput extends ItemBase {
    isEnabled: boolean;
    resId?: string; // optional because at client we dont have the resId but will be added at server
}