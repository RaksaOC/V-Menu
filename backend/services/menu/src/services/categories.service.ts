import { assertId, badRequest, HttpError, notFound } from "@vmenu/common";
import { OTHER_CATEGORY, type CategoryBody, type ReorderCategoriesBody } from "@vmenu/contracts";
import type { CategoriesRepo } from "../repositories/categories.repo.js";
import type { ItemsRepo } from "../repositories/items.repo.js";

const nameError = (message: string) => new HttpError(400, message, "INVALID_INPUT", { name: message });

/** VM-25: the sections of a restaurant's menu, in the owner's order. The body's shape is the route's job. */
export function categoriesService({ categories, items }: { categories: CategoriesRepo; items: ItemsRepo }) {
    async function existing(resId: string, id: string) {
        assertId(id, "category id");
        const category = await categories.get(resId, id);
        if (!category) throw notFound("Category not found");
        return category;
    }

    async function checkName(resId: string, name: string, self?: string) {
        if (name.toLowerCase() === OTHER_CATEGORY.toLowerCase()) throw nameError(`"${OTHER_CATEGORY}" is for dishes with no category`);
        const same = await categories.findByName(resId, name);
        if (same && String(same._id) !== self) throw nameError("Name is taken");
    }

    return {
        list: (resId: string) => categories.list(resId),

        /** A new category goes last. */
        async create(resId: string, { name }: CategoryBody) {
            await checkName(resId, name);
            const all = await categories.list(resId);
            if (all.length >= 100) throw badRequest("A menu can have at most 100 categories");
            const sortOrder = all.length ? Math.max(...all.map((c) => c.sortOrder)) + 1 : 0;
            return categories.create(resId, { name, sortOrder });
        },

        async rename(resId: string, id: string, { name }: CategoryBody) {
            await existing(resId, id);
            await checkName(resId, name, id);
            const updated = await categories.update(resId, id, { name });
            if (!updated) throw notFound("Category not found");
            return updated;
        },

        /** The new order must name every category of this restaurant exactly once. */
        async reorder(resId: string, { ids }: ReorderCategoriesBody) {
            const all = (await categories.list(resId)).map((c) => String(c._id));
            const same = ids.length === all.length && new Set(ids).size === ids.length && ids.every((id) => all.includes(id));
            if (!same)
                throw new HttpError(400, "Send every category once, in the new order", "INVALID_INPUT", { ids: "Every category once" });
            await categories.setOrder(resId, ids);
            return categories.list(resId);
        },

        /** Its dishes stay on the menu, under "Other". */
        async remove(resId: string, id: string) {
            await existing(resId, id);
            await items.clearCategory(resId, id);
            const removed = await categories.remove(resId, id);
            if (!removed) throw notFound("Category not found");
            return removed;
        },
    };
}
