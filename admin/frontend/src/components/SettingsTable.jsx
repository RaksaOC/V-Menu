import { useEffect, useState } from "react";
import SettingsTableCard from "./SettingsTableCard.jsx";
import axios from "axios";
import Tables from "./Tables.jsx";
import EditTablePopup from "./EditTablePopup";

async function getTables() {
    const response = await axios.get("http://localhost:3002/tables");
    return response.data;
}

export default function SettingsTables() {
    const [tables, setTables] = useState([]);

    useEffect(() => {
        async function fetchTables() {
            setTables(await getTables());
        }

        fetchTables();
    }, []);

    return (
        <div className="tables flex gap-2.5 justify-center items-center">
            <div className="tables-wrapper max-w-[1024px] w-full flex justify-center items-center flex-wrap">
                {tables.map((table) => (
                    <SettingsTableCard
                        key={table.id}
                        table={table}
                    />
                ))}
            </div>
        </div>
    );
}
