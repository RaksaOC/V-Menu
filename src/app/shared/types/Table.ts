export interface Table {
    name: string;
}

export interface TableInput extends Table {
    isEnabled: boolean;
    type: string;
    tenantId?: string;
}

export interface TableOutput extends Table {
    _id: string;
    isEnabled: boolean;
}