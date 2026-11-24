import { Fragment } from "react";
import { Check, ChevronDown, Home } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import type { Restaurant } from "@vmenu/contracts";

/** The drop-down that picks which of the owner's restaurants to manage. */
export function RestaurantPicker({
    restaurants,
    selected,
    onChange,
}: {
    restaurants: Restaurant[];
    selected: Restaurant | null;
    onChange: (restaurant: Restaurant) => void;
}) {
    return (
        <div className="space-y-2 w-full">
            <Listbox value={selected} onChange={(r) => r && onChange(r)}>
                <div className="relative">
                    <ListboxButton className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base">
                        <span className="block truncate">{selected?.name || "Select a restaurants"}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        </span>
                    </ListboxButton>

                    <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                        {restaurants.map((restaurant) => (
                            <ListboxOption key={restaurant._id} value={restaurant} as={Fragment}>
                                {({ selected, active }) => (
                                    <li
                                        className={`cursor-pointer select-none relative py-4 pl-10 pr-4 list-none ${
                                            active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                                        }`}
                                    >
                                        <div className="flex gap-2.5 items-center">
                                            <Home size={16} />
                                            <span className={`block truncate ${selected ? "font-semibold" : ""}`}>{restaurant.name}</span>
                                        </div>
                                        {selected && (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                <Check className="w-4 h-4" />
                                            </span>
                                        )}
                                    </li>
                                )}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </div>
            </Listbox>
        </div>
    );
}
