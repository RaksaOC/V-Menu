import {useEffect, useState} from "react";
import TableCard from "./TableCard.js";
import {toast} from "react-toastify";
import axios from "axios";
import SkeletonTableCard from "../../../../../../../../v-menu-old-backup/admin/frontend/src/components/common/skeleton/SkeletonTableCard.jsx";

async function getTables() {
    const response = await axios.get("http://localhost:3002/api/tables",
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
        console.log("toggling table with id ", id);
        const updatedTables = tables.map((t) => {
            if (t._id === id) {
                const updatedTable = {...t, isEnabled: !t.isEnabled};
                // Send updated table to backend
                axios.patch(`http://localhost:3002/api/tables/${id}/availability`, {isEnabled: !updatedTable.isEnabled},
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
        <div className="tables flex gap-2.5 justify-center items-center">
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