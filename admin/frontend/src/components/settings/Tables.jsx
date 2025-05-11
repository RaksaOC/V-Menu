import {useEffect, useState} from "react";
import TableCard from "./TableCard.jsx";
import SkeletonTableCard from "../common/skeleton/SkeletonTableCard.jsx"; // Import skeleton
import axios from "axios";

async function getTables() {
    const response = await axios.get("http://localhost:3002/api/tables", {
        headers: {
            Authorization: localStorage.getItem("token")
        }
    });
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
            <div
                className="tables-wrapper max-w-[1024px] w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-center">
                {isLoading ? (
                    <>
                        <SkeletonTableCard/>
                        <SkeletonTableCard/>
                        <SkeletonTableCard/>
                    </>
                ) : (
                    tables.length > 0 ?
                        tables.map((table) => (
                            <TableCard
                                key={table.id}
                                table={table}
                            />
                        )) : (<div className={"w-full h-96 flex justify-center items-center"}>
                            <h1 className={"text-3xl text-center"}>No Menu to Display</h1>
                        </div>)
                )}
            </div>
        </div>
    );
}
