import {QrCode, Users, CheckCircle, XCircle, Table2Icon, TableIcon} from "lucide-react";
import {TableOutput} from "@/app/shared/types/Table";

interface TableCardProps {
    table: TableOutput;
    onToggleStatus: (id: string) => void;
}

function TableCard({table, onToggleStatus}: TableCardProps) {
    return (
        <div
            className={`relative bg-white dark:bg-slate-800 rounded-2xl border  border-slate-500 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-1 ${
                table.isEnabled ? "ring-2 ring-green-200 dark:ring-green-800" : ""
            }`}>
            {/* Status Indicator */}
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                table.isEnabled ? "bg-green-400 animate-pulse" : "bg-red-400"
            }`}></div>

            {/* Table Icon and Name */}
            <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${
                    table.isEnabled
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "bg-red-50 dark:bg-red-900/20"
                }`}>
                    <div className={`p-3 rounded-xl ${
                        table.isEnabled
                            ? "bg-gradient-to-br from-green-500 to-emerald-600"
                            : "bg-gradient-to-br from-red-500 to-rose-600"
                    }`}>
                        <TableIcon size={24} className="text-white"/>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                    Table {table.name}
                </h3>

                <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                    table.isEnabled
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}>
                    {table.isEnabled ? (
                        <>
                            <CheckCircle size={12}/>
                            <span>Available</span>
                        </>
                    ) : (
                        <>
                            <XCircle size={12}/>
                            <span>Closed</span>
                        </>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                <button
                    onClick={() => onToggleStatus(table._id)}
                    className={`w-full py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                        table.isEnabled
                            ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30"
                    }`}
                >
                    {table.isEnabled ? (
                        <>
                            <XCircle size={16}/>
                            <span>Close Table</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle size={16}/>
                            <span>Open Table</span>
                        </>
                    )}
                </button>

                <button
                    className="w-full py-3 px-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                    <QrCode size={16}/>
                    <span>View QR Code</span>
                </button>
            </div>
        </div>
    );
}

export default TableCard;