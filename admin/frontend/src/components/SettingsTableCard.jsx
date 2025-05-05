import { QrCode, Pencil } from "lucide-react";

function SettingsTableCard({ table, onEdit }) {
    return (
        <div className="p-4 flex justify-center w-full md:max-w-[300px]">
            <div className="min-h-[250px] w-full p-4 rounded-lg border text-center flex flex-col justify-between border-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                <div>
                    <div className="text-xl font-bold">Table {table.id}</div>
                </div>

                <div className="mt-4 space-y-2">
                    <button
                        onClick={() => onEdit(table.id)}
                        className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 bg-white text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-100 dark:hover:bg-zinc-200 rounded-lg"
                    >
                        <Pencil size={16} />
                        Edit
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

export default SettingsTableCard;
