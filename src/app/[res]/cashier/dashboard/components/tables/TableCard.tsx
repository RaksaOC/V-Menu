import { QrCode } from "lucide-react";
import {Table} from "@/app/shared/types/Table";

interface TableCardProps {
    table: Table;
    onToggleStatus: (id: string) => void;
}

function TableCard({ table, onToggleStatus } : TableCardProps) {
    return (
        <div className="p-2 flex justify-center w-full min-w-[300px] max-w-[400px]">
            <div
                className={`min-h-[250px] w-full p-4 rounded-lg border text-center flex flex-col justify-between ${
                    table.isEnabled
                        ? "border-zinc-300 bg-green-400"
                        : "border-zinc-300 bg-zinc-100 dark:bg-zinc-800"
                }`}
            >
                <div>
                    <div className="text-xl font-bold">Table {table.name}</div>
                    <div
                        className={`text-xs mt-1 ${
                            table.isEnabled ? "text-green-800" : "text-red-700"
                        }`}
                    >
                        {table.isEnabled ? "Open" : "Closed"}
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <button
                        onClick={() => onToggleStatus(table._id)}
                        className={`w-full text-sm px-3 py-2 rounded-lg font-medium ${
                            table.isEnabled
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                    >
                        {table.isEnabled ? "Close Table" : "Open Table"}
                    </button>

                    <button
                        className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg"
                    >
                        <QrCode size={16} />
                        View QR
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TableCard;
