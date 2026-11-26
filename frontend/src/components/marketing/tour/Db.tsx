import { Database } from "lucide-react";
import s from "./scenes.module.css";

/** A database name with its icon. */
export function Db({ name }: { name: string }) {
    return (
        <span className={s.db}>
            <Database size={14} aria-hidden="true" />
            <code>{name.replace("_", "_\u200b")}</code>
        </span>
    );
}
