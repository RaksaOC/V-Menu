import {useEffect, useState} from "react";
import TableCard from "./TableCard";
import SkeletonTableCard from "../../../common/SkeletonTableCard";
import axios from "axios";
import {TableOutput} from "@/app/shared/types/Table";

async function getTables() {
    try {
        const response = await axios.get("/api/cashier/settings/tables");
        return response.data;
    } catch (err) {
        console.log(err);
    }
}

export default function SettingsTables() {
    const [tables, setTables] = useState<TableOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTables() {
            const data: TableOutput[] = await getTables();
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
                                key={table._id}
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
