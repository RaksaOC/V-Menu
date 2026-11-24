import { Users } from "lucide-react";

const hint = (filtered: boolean) => (filtered ? "Try adjusting your search or filters" : "Add your first team member to get started");

/** "No staff members found": large in a table or a page, `small` in the phone list. */
export default function NoStaff({ filtered, small = false }: { filtered: boolean; small?: boolean }) {
    if (small)
        return (
            <div className="flex flex-col items-center gap-3">
                <Users size={48} className="text-gray-300" />
                <div>
                    <p className="text-gray-500 font-medium">No staff members found</p>
                    <p className="text-gray-400 text-sm">{hint(filtered)}</p>
                </div>
            </div>
        );
    return (
        <div className="flex flex-col items-center gap-3">
            <div className={"rounded-full bg-gray-100 p-6 mb-6"}>
                <Users size={48} className="text-gray-400" />
            </div>
            <div>
                <p className="text-gray-600 text-2xl font-bold">No staff members found</p>
                <p className="text-gray-500">{hint(filtered)}</p>
            </div>
        </div>
    );
}
