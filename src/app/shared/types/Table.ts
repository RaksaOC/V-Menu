export interface Table {
    name: string;
}

export interface TableInput extends Table {
    isEnabled: boolean;
}

export interface TableOutput extends Table {
    _id: string;
    isEnabled: boolean;
}