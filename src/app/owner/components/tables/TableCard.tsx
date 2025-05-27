import {QrCode, CheckCircle, XCircle, TableIcon, Pencil} from "lucide-react";
import {TableOutput} from "@/app/shared/types/Table";
import {useState} from "react";
import EditTablePopup from "@/app/owner/components/tables/EditTablePopup";

interface TableCardProps {
    table: TableOutput;
}

function TableCard({table}: TableCardProps) {
    const [showEdit, setShowEdit] = useState(false);
    function handleSave(id: string,  newName: string ) {

    }
    function handleDelete(){

    }
    return (
        <>
            <div
                className={`relative bg-white rounded-2xl border border-slate-300 p-6 hover:shadow-lg hover:shadow-slate-200 transition-all duration-300 hover:-translate-y-1 w-full ${
                    table.isEnabled ? "ring-2 ring-green-200" : ""
                }`}
            >
                {/* Status Dot */}
                <div
                    className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                        table.isEnabled ? "bg-green-400 animate-pulse" : "bg-red-400"
                    }`}
                ></div>

                {/* Table Icon and Title */}
                <div className="text-center mb-6">
                    <div
                        className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${
                            table.isEnabled ? "bg-green-50" : "bg-red-50"
                        }`}
                    >
                        <div
                            className={`p-3 rounded-xl ${
                                table.isEnabled
                                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                                    : "bg-gradient-to-br from-red-500 to-rose-600"
                            }`}
                        >
                            <TableIcon size={24} className="text-white"/>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                        Table {table.name}
                    </h3>

                    <div
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                            table.isEnabled
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
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

                {/* Buttons */}
                <div className="space-y-3">
                    {/* Light Edit Button */}
                    <button
                        onClick={() => setShowEdit(true)}
                        className="w-full py-3 px-4 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
                    >
                        <Pencil size={16} className="text-slate-700"/>
                        <span className="text-slate-700">Edit Table</span>
                    </button>

                    {/* Bold QR Button */}
                    <button
                        className="w-full py-3 px-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-blue-200"
                    >
                        <QrCode size={16}/>
                        <span>View QR Code</span>
                    </button>
                </div>
            </div>
            {
                showEdit && (<EditTablePopup id={table._id} name={table.name} onClose={() => setShowEdit(false)} onSave={handleSave} onDelete={handleDelete}/>)
            }
        </>
    );
}

export default TableCard;
