import React, {useContext, useEffect, useState} from "react";
import TableCard from "./TableCard";
import SkeletonTableCard from "@/app/[res]/common/SkeletonTableCard";
import axios from "axios";
import {TableInput, TableOutput} from "@/app/shared/types/Table";
import api from "@/app/shared/lib/axios";
import {ResContext} from "@/app/owner/ResContext";
import {Plus} from "lucide-react";
import AddTablePopup from "@/app/owner/components/tables/AddTablePopup";
import {ItemInput} from "@/app/shared/types/Item";

export default function SettingsTables() {
    const [tables, setTables] = useState<TableOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const resSlug = useContext(ResContext)
    const [showAddTable, setShowAddTable] = useState(false);

    useEffect(() => {
        async function fetchTables() {
            const response = await api.get(`/api/owner/${resSlug}/tables`);
            setTables(response.data);
            setIsLoading(false);
        }

        fetchTables();
    }, []);

    const  handleSave = async (table: TableInput) => {
        try {
            const response = await api.post(`/api/owner/${resSlug}/tables`, table)
            if (response.status === 200) {
                console.log("response", response);
            }
            setShowAddTable(false);
            location.reload();
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
                                <div className="h-6 bg-slate-200 rounded w-40 mb-2"/>
                                <div className="h-4 bg-slate-200 rounded w-60"/>
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
                    isLoading && (
                        <div className={"mt-8 w-full"}>
                            <SkeletonTableCard isLight={true}/>
                        </div>
                    )

                }
                <div
                    className="tables-wrapper w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 place-items-start gap-6 mt-8">
                    {
                        tables.length > 0 ?
                            tables.map((table) => (
                                <TableCard
                                    key={table._id}
                                    table={table}
                                />
                            )) : (<div className={"w-full h-96 flex justify-center items-center"}>
                                <h1 className={"text-3xl text-center"}>No Tables to Display</h1>
                            </div>)
                    }
                </div>
            </div>
            {
                showAddTable && (
                    <AddTablePopup onClose={() => setShowAddTable(false)} onSave={handleSave}/>
                )
            }
        </>
    );
}
