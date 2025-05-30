import React, {useContext, useEffect, useState} from "react";
import TableCard from "./TableCard";
import SkeletonTableCard from "@/app/[res]/common/SkeletonTableCard";
import axios from "axios";
import {TableInput, TableOutput} from "@/app/shared/types/Table";
import api from "@/app/shared/lib/axios";
import {ResContext} from "@/app/owner/ResContext";
import {Plus, TrendingUp} from "lucide-react";
import AddTablePopup from "@/app/owner/components/tables/AddTablePopup";
import {ItemInput} from "@/app/shared/types/Item";

export default function SettingsTables() {
    const [tables, setTables] = useState<TableOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const resSlug = useContext(ResContext)
    const [showAddTable, setShowAddTable] = useState(false);
    const [refresh, setRefresh] = useState(false);

    useEffect(() => {
        async function fetchTables() {
            try {
                const response = await api.get(`/api/owner/${resSlug}/tables`);
                setTables(response.data);
            } catch (err: any) {
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTables();
    }, [refresh]);

    const handleSave = async (table: TableInput) => {
        try {
            const response = await api.post(`/api/owner/${resSlug}/tables`, table)
            if (response.status === 200) {
                console.log("response", response);
            }
            setShowAddTable(false);
            setRefresh(prev => !prev);
        } catch (err) {
            console.log(err);
        }
        setShowAddTable(false);
    }

    return (
        <>

            <div className="tables flex flex-col justify-center items-center w-full">
                <div className="flex items-center justify-between w-full">
                    {isLoading ? (
                        <div className="w-full flex justify-between items-center animate-pulse">
                            <div>
                                <div className="h-6 bg-slate-200 rounded w-20 mb-2"/>
                                <div className="h-4 bg-slate-200 rounded w-30"/>
                            </div>
                            <div className="h-10 w-28 bg-slate-200 rounded-lg"/>
                        </div>
                    ) : (
                        <>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                                    Manage Tables
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    Create, Edit tables
                                </p>
                            </div>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                onClick={() => setShowAddTable(!showAddTable)}
                            >
                                <Plus size={16}/> Add Table
                            </button>
                        </>
                    )}
                </div>
                {
                    isLoading ? (
                        <div className={"mt-8 w-full"}>
                            <SkeletonTableCard isLight={true}/>
                        </div>
                    ) : (
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full mt-8">
                            {
                                tables.length > 0 ?
                                    tables.map((table) => (
                                        <TableCard
                                            key={table._id}
                                            table={table}
                                            onModified={() => setRefresh(prevState => !prevState)}
                                        />
                                    )) : (
                                        <div
                                            className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                                            <div className="bg-gray-100  rounded-full p-4 mb-4">
                                                <TrendingUp size={32} className="text-gray-400"/>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-600  mb-2">
                                                No Data Available
                                            </h3>
                                            <p className="text-gray-500 ">
                                                Overview statistics will appear here once data is available.
                                            </p>
                                        </div>)
                            }
                        </div>
                    )
                }
            </div>
            {
                showAddTable && (
                    <AddTablePopup onClose={() => setShowAddTable(false)} onSave={handleSave}/>
                )
            }
        </>
    );
}
