import {Settings} from "lucide-react";

export default function Header() {
    return (
        <div className="w-full flex border-b-1 bg-zinc-900 border-zinc-200 items-center justify-between mb-6 sticky top-0 right-0 left-0 p-2.5 z-50">
            <h1 className="text-2xl font-bold">V-Menu Admin</h1>
            <button className="flex items-center text-sm text-red-500 hover:underline gap-2.5 cursor-pointer">
                <Settings size={20} className="text-white"/>
            </button>
        </div>
    )
}