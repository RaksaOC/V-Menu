import {useEffect, useState} from "react";
import Table from "./Table.jsx";
import {toast} from "react-toastify";
import axios from "axios";
import SkeletonTableCard from "./SkeletonTableCard.jsx";

async function getTables() {
    const response = await axios.get("http://localhost:3002/tables",
        {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
    return response.data;
}


export default function Tables() {
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTables() {
            setTables(await getTables());
            setIsLoading(false);
        }

        fetchTables();
    }, []);

    async function toggleTableAvailability(id) {
        const updatedTables = tables.map((t) => {
            if (t.id === id) {
                const updatedTable = {...t, isEnabled: !t.isEnabled};
                // Send updated table to backend
                axios.put("http://localhost:3002/tables", updatedTable,
                    {
                        headers: {
                            Authorization: localStorage.getItem("token")
                        }
                    });
                return updatedTable;
            }
            return t;
        });

        setTables(updatedTables);

        toast.info("Table updated!", {
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
        <div className="tables flex gap-2.5 justify-center items-center">
            <div
                className={"tables-wrapper max-w-[1024px] w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-center"}>
                {
                    isLoading && (
                        <>
                            <SkeletonTableCard/>
                            <SkeletonTableCard/>
                            <SkeletonTableCard/>
                        </>)
                }
                {tables.map((table) => (
                    <Table
                        key={table.id}
                        table={table}
                        onToggleStatus={() => toggleTableAvailability(table.id)}
                    />
                ))}
            </div>
        </div>
    );
}