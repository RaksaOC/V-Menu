import {useEffect, useState} from "react";
import TableCard from "./TableCard";
import {toast} from "react-toastify";
import axios from "axios";
import SkeletonTableCard from "@/app/[res]/common/SkeletonTableCard";
import {TableOutput} from "@/app/shared/types/Table";
import api from "@/app/shared/lib/axios";
import {Table, TrendingUp, Users, AlertCircle} from "lucide-react";
import {useParams} from "next/navigation";


export default function Tables() {
    const [tables, setTables] = useState<TableOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const params = useParams();

    useEffect(() => {
        async function fetchTables() {
            try {
                const response = await api.get(`/api/cashier/${params.res}/dashboard/tables`);
                setTables(response.data);
            } catch (err) {
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTables();
    }, []);

    async function toggleTableAvailability(id: string) {
        console.log("toggling table with id ", id);
        const updatedTables = tables.map((t) => {
            if (t._id === id) {
                const updatedTable = {...t, isEnabled: !t.isEnabled};
                // Send updated table to backend
                api.patch(`/api/cashier/${params.res}/dashboard/tables/${id}`, {isEnabled: !updatedTable.isEnabled});
                return updatedTable;
            }
            return t;
        });

        setTables(updatedTables);

        const toggledTable = tables.find(t => t._id === id);
        toast.info(`Table ${toggledTable?.name} ${toggledTable?.isEnabled ? 'Closed' : 'Opened'}!`, {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "light",
        });
    }

    const openTables = tables.filter(table => table.isEnabled).length;
    const closedTables = tables.filter(table => !table.isEnabled).length;

    if (isLoading) {
        return (<SkeletonTableCard/>);
    }

    return (
        <div className="w-full space-y-6">
            {/* Tables Grid or No Data State */}
            {tables.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map((table) => (
                        <TableCard
                            key={table._id}
                            table={table}
                            onToggleStatus={() => toggleTableAvailability(table._id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-6">
                        <Table size={48} className="text-slate-400"/>
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-600 dark:text-slate-300 mb-3">
                        No Tables Available
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                        Your restaurant doesn't have any tables configured yet. Set up your dining area to start
                        managing table availability.
                    </p>
                    <div
                        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            💡 Tip: Contact your administrator to add tables to your restaurant
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}