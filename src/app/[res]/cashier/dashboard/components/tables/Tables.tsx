import {useEffect, useState} from "react";
import TableCard from "./TableCard";
import {toast} from "react-toastify";
import axios from "axios";
import SkeletonTableCard from "../../../common/SkeletonTableCard";
import {TableOutput} from "@/app/shared/types/Table";
import api from "@/app/shared/lib/axios";

async function getTables() {
    try {
        const response = await api.get("/api/cashier/dashboard/tables");
        return response.data;
    } catch (err) {
        console.log(err);
    }
}


export default function Tables() {
    const [tables, setTables] = useState<TableOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTables() {
            setTables(await getTables());
            setIsLoading(false);
        }

        fetchTables();
    }, []);

    async function toggleTableAvailability(id: string) {
        console.log("toggling table with id ", id);
        const updatedTables = tables.map((t) => {
            if (t._id === id) {
                const updatedTable = {...t, isEnabled: !t.isEnabled};
                // Send updated table to backend
                axios.patch(`/api/cashier/dashboard/tables/${id}`, {isEnabled: !updatedTable.isEnabled});
                return updatedTable;
            }
            return t;
        });

        setTables(updatedTables);

        toast.info("TableCard updated!", {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "light",
        });
    }

    return (
        <div className="tables flex w-full gap-2.5 justify-center items-center">
            <div
                className={"tables-wrapper max-w-[1024px] w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-center"}>
                {isLoading ? (
                    <>
                        <SkeletonTableCard/>
                        <SkeletonTableCard/>
                        <SkeletonTableCard/>
                    </>
                ) : tables.length > 0 ? (
                    tables.map((table) => (
                        <TableCard
                            key={table._id}
                            table={table}
                            onToggleStatus={() => toggleTableAvailability(table._id)}
                        />
                    ))
                ) : (
                    <div className={"w-full h-96 flex justify-center items-center"}>
                        <h1 className={"text-3xl text-center"}>No tables to display</h1>
                    </div>
                )}

            </div>
        </div>
    );
}