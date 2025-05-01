import {useEffect, useState} from "react";
import Table from "./Table.jsx";
import {toast} from "react-toastify";

export default function Tables() {
    const [tables, setTables] = useState([]);

    useEffect(() => {
        if (tables.length === 0) {
            setTables([
                {id: 1, name: "Table 1", status: "open"},
                {id: 2, name: "Table 2", status: "closed"},
                {id: 3, name: "Table 3", status: "open"},
                {id: 4, name: "Table 4", status: "closed"}
            ]);
        }
    }, []);

    return (
        <div className="tables flex gap-2.5 flex-wrap">
            {tables.map((table) => (
                <Table
                    key={table.id}
                    table={table}
                    onToggleStatus={(id) => {
                        const updatedTables = tables.map((t) =>
                            t.id === id
                                ? {...t, status: t.status === "open" ? "closed" : "open"}
                                : t
                        );
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
                    }}
                />
            ))}
        </div>
    )
}