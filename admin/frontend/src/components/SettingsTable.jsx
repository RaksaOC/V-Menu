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
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        async function fetchTables() {
            setTables(await getTables());
        }

        fetchTables();
    }, []);

    function handleEdit(id) {
        // Replace this with your actual edit popup or logic
        console.log("Edit table", id);
        setIsEditing(true);
    }

    function handleClose() {
        setIsEditing(false);
    }

    return (
        <div className="tables flex gap-2.5 justify-center items-center">
            <div className="tables-wrapper max-w-[1024px] w-full flex justify-center items-center flex-wrap">
                {tables.map((table) => (
                    <SettingsTableCard
                        key={table.id}
                        table={table}
                        onEdit={() => handleEdit()}
                    />
                ))}
            </div>
            {
                isEditing && <EditTablePopup onClose={handleClose} />
            }
        </div>
    );
}
