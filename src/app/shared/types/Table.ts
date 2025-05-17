export interface Table {
    name: string;
}

export interface TableInput extends Table {
    isEnabled: boolean;
    type: string;
    resId?: string; // optional because at client we dont have the resId but will be added at server
}

export interface TableOutput extends Table {
    _id: string;
    isEnabled: boolean;
}