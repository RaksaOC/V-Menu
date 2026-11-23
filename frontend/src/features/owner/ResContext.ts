import {createContext} from "react";

export const ResContext = createContext<string>('');

/** The selected restaurant's display name, for the QR cards (VM-01). Staff pages don't know it yet (VM-21). */
export const ResNameContext = createContext<string | undefined>(undefined);
