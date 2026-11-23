import api, { seg } from "@/lib/api";
import type { RestaurantSettings, UpdateSettingsBody } from "@vmenu/contracts";

/** VM-24: how the restaurant shows prices, its name, and its payment QR. No sign-in needed. */
export async function getRestaurantSettings(slug: string): Promise<RestaurantSettings> {
    const { data } = await api.get<RestaurantSettings>(`/api/restaurants/${seg(slug)}/settings`);
    return data;
}

/** The owner changes them; the answer is the settings as saved. */
export async function saveRestaurantSettings(slug: string, body: UpdateSettingsBody): Promise<RestaurantSettings> {
    const { data } = await api.put<RestaurantSettings>(`/api/restaurants/${seg(slug)}/settings`, body);
    return data;
}
