import {useState} from "react";
import {ChevronsUpDown, CreditCard, Crown, Mail, Pencil, Trash2, User, Utensils, X} from "lucide-react";
import {TenantOutput} from "@/app/shared/types/Tenant";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from "@headlessui/react";

interface Props {
    tenant: TenantOutput;
    onSave: (updatedStaff: TenantOutput) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export default function EditStaffPopUp({tenant, onSave, onDelete, onClose}: Props) {
    const [form, setForm] = useState({
        name: tenant.name || "",
        email: tenant.email || "",
        role: tenant.role || "cashier",
    });

    const [touched, setTouched] = useState({
        name: false,
        email: false,
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isNameInvalid = touched.name && form.name.trim() === "";
    const isEmailInvalid = touched.email && form.email.trim() === "";
    const isSaveDisabled = form.name.trim() === "" || form.email.trim() === "";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({name: true, email: true});
        if (!isSaveDisabled) {
            tenant.name = form.name;
            tenant.email = form.email;
            tenant.role = form.role;
            onSave(tenant);
        }
    };

    const handleDelete = () => {
        onDelete(tenant._id);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto relative">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between gap-2.5">
                        <Pencil size={20} className={"text-blue-500"}/>
                        <h2 className="text-xl font-semibold text-gray-900">Edit Staff</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                    >
                        <X size={20} className="text-gray-500"/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <div className="flex items-center  gap-2.5">
                            <User size={16} className="text-blue-500"/>
                            <label className="block text-sm font-bold text-gray-700">Name</label>
                        </div>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({...form, name: e.target.value})}
                            onBlur={() => setTouched((prev) => ({...prev, name: true}))}
                            placeholder="Enter name"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-100 text-gray-900 border-gray-200"
                        />
                        {isNameInvalid && <p className="text-red-500 text-xs">Name cannot be empty.</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <div className="flex items-center  gap-2.5">
                            <Mail size={16} className="text-blue-500"/>
                            <label className="block text-sm font-bold text-gray-700">Email</label>
                        </div>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            onBlur={() => setTouched((prev) => ({...prev, email: true}))}
                            placeholder="Enter email"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-100 text-gray-900 border-gray-200"
                        />
                        {isEmailInvalid && <p className="text-red-500 text-xs">Email cannot be empty.</p>}
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <div className="flex items-center  gap-2.5">
                            <Crown size={16} className="text-yellow-500"/>
                            <label className="block text-sm font-bold text-gray-700">Role</label>
                        </div>
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
                                <ListboxButton
                                    className="w-full px-3 sm:px-4 py-2 text-left border border-gray-200 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center">
                  <span className="flex items-center">
                    {form.role === "chef" && (
                        <div className={"flex gap-1 items-center"}>
                            <Utensils className="w-4 h-4 mr-2 text-green-500"/>
                            Chef
                        </div>
                    )}
                      {form.role === "cashier" && (
                          <div className={"flex gap-1 items-center"}>
                              <CreditCard className="w-4 h-4 mr-2 text-blue-500"/>
                              Cashier
                          </div>
                      )}
                  </span>
                                    <ChevronsUpDown className="w-4 h-4 text-blue-500"/>
                                </ListboxButton>

                                <ListboxOptions
                                    className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none text-sm sm:text-base">
                                    <ListboxOption
                                        value="chef"
                                        className={({active}) =>
                                            `cursor-pointer select-none px-4 py-2 flex items-center ${active ? "bg-blue-100" : ""}`
                                        }
                                    >
                                        <Utensils className="w-4 h-4 mr-2 text-green-500"/>
                                        Chef
                                    </ListboxOption>
                                    <ListboxOption
                                        value="cashier"
                                        className={({active}) =>
                                            `cursor-pointer select-none px-4 py-2 flex items-center ${active ? "bg-blue-100" : ""}`
                                        }
                                    >
                                        <CreditCard className="w-4 h-4 mr-2 text-blue-500"/>
                                        Cashier
                                    </ListboxOption>
                                </ListboxOptions>
                            </div>
                        </Listbox>
                    </div>

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <Trash2 size={20} className="text-red-600"/>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800">Delete Staff</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        Are you sure you want to delete "{form.name}"? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-3 py-1.5 text-sm bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                        >
                            <Trash2 size={16}/>
                            Delete
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-zinc-800 hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaveDisabled}
                                className={`px-4 py-2 rounded-lg text-sm text-white transition ${
                                    isSaveDisabled ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
