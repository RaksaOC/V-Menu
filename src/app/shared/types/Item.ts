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
}