import { createContext } from "react";

/** The restaurant the owner is looking at (its slug). Staff pages read the slug from the URL instead. */
export const ResContext = createContext<string>("");
