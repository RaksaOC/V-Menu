import { Utensils } from "lucide-react";
import TableRequests from "@/features/customer/components/TableRequests";
import type { TableLink } from "@/features/customer/table-link";

/** The menu's header: the restaurant's name (VM-21), the table, and the table's requests (VM-30). */
export default function MenuHeader({
    heading,
    nameLoaded,
    table,
    link,
}: {
    heading: string;
    nameLoaded: boolean;
    table: string;
    link: TableLink;
}) {
    return (
        <header className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-black/5">
                <div
                    className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}
                ></div>
            </div>
            <div className="relative px-6 py-8">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                            <Utensils size={24} className="text-white" />
                        </div>
                        <h1 className={`text-3xl font-bold tracking-tight ${nameLoaded ? "" : "invisible"}`}>{heading}</h1>
                    </div>
                    <p className={`text-emerald-100 text-lg font-medium ${table ? "" : "invisible"}`}>Table {table}</p>
                    <p className="text-emerald-50/80 text-sm mt-1">Browse our delicious menu and order with ease</p>
                    {/* VM-30: once the table has ordered */}
                    <TableRequests link={link} />
                </div>
            </div>
        </header>
    );
}
