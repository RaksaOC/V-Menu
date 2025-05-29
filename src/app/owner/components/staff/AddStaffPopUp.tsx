import { useState } from "react";
import {
    ChevronsUpDown,
    CreditCard,
    Crown,
    Users,
    Utensils,
    X,
    Mail,
    Lock,
} from "lucide-react";
import { TenantInput } from "@/app/shared/types/Tenant";
import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from "@headlessui/react";

interface Props {
    onClose: () => void;
    onSave: (staff: TenantInput) => void;
}

export default function AddStaffPopup({ onClose, onSave }: Props) {
    const [form, setForm] = useState<{
        name: string;
        email: string;
        password: string;
        role: "cashier" | "chef" | "";
    }>({
        name: "",
        email: "",
        password: "",
        role: "",
    });

    const isSaveDisabled =
        !form.name || !form.email || !form.password || !form.role;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSaveDisabled) {
            onSave({
                ...form,
                tenantId: "",
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Crown className="w-6 h-6 text-yellow-500" />
                        Add a New Staff Member
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                        aria-label="Close popup"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="name"
                            className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                        >
                            <Users className="w-4 h-4 text-gray-500" />
                            Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Full name"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-200 hover:border-gray-300"
                        />
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="email"
                            className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                        >
                            <Mail className="w-4 h-4 text-gray-500" />
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="e.g. staff@example.com"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-200 hover:border-gray-300"
                        />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="password"
                            className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                        >
                            <Lock className="w-4 h-4 text-gray-500" />
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Minimum 6 characters"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-200 hover:border-gray-300"
                        />
                    </div>

                    {/* Role Dropdown */}
                    <div className="space-y-2">
                        <label
                            htmlFor="role"
                            className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                        >
                            <Crown className="w-4 h-4 text-gray-500" />
                            Role
                        </label>
                        <Listbox
                            value={form.role}
                            onChange={(value) =>
                                setForm((prev) => ({
                                    ...prev,
                                    role: value,
                                }))
                            }
                        >
                            <div className="relative w-full">
                                <ListboxButton className="w-full px-3 sm:px-4 py-2 text-left border border-gray-200 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center">
                  <span className="flex items-center">
                    {form.role === "chef" && (
                        <Utensils className="w-4 h-4 mr-2 text-green-500" />
                    )}
                      {form.role === "cashier" && (
                          <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                      )}
                      {{
                          chef: "Chef",
                          cashier: "Cashier",
                          "": "",
                      }[form.role]}
                      {form.role === "" && (
                          <p className={"text-gray-500 text-sm"}>Select a role</p>
                      )}
                  </span>
                                    <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                                </ListboxButton>

                                <ListboxOptions className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none text-sm sm:text-base">
                                    <ListboxOption
                                        value="chef"
                                        className={({ active }) =>
                                            `cursor-pointer select-none px-4 py-2 flex items-center ${
                                                active ? "bg-blue-100" : ""
                                            }`
                                        }
                                    >
                                        <Utensils className="w-4 h-4 mr-2 text-green-500" />
                                        Chef
                                    </ListboxOption>

                                    <ListboxOption
                                        value="cashier"
                                        className={({ active }) =>
                                            `cursor-pointer select-none px-4 py-2 flex items-center ${
                                                active ? "bg-blue-100" : ""
                                            }`
                                        }
                                    >
                                        <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                                        Cashier
                                    </ListboxOption>
                                </ListboxOptions>
                            </div>
                        </Listbox>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaveDisabled}
                            className={`px-4 py-2 rounded-lg text-sm text-white transition ${
                                isSaveDisabled
                                    ? "bg-blue-300 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            Save Staff
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
