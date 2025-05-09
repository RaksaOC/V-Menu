import { useEffect, useState } from "react";
import SettingsTableCard from "./SettingsTableCard.jsx";
import SkeletonSettingsTableCard from "./SkeletonSettingsTableCard.jsx"; // Import skeleton
import axios from "axios";

async function getTables() {
    const response = await axios.get("http://localhost:3002/tables", {
        headers: {
            Authorization: localStorage.getItem("token")
        }});
    return response.data;
}

export default function SettingsTables() {
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTables() {
            const data = await getTables();
            setTables(data);
            setIsLoading(false);
        }

        fetchTables();
    }, []);

    return (
        <div className="tables flex gap-2.5 justify-center items-center w-full">
            <div className="tables-wrapper max-w-[1024px] w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-center">
                {isLoading ? (
                    <>
                        <SkeletonSettingsTableCard />
                        <SkeletonSettingsTableCard />
                        <SkeletonSettingsTableCard />
                    </>
                ) : (
                    tables.map((table) => (
                        <SettingsTableCard
                            key={table.id}
                            table={table}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
