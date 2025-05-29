export const prettyDate = (date: string, hasTime: boolean = true) => {
    const toDate = new Date(date);
    if (hasTime) {
        return toDate.toLocaleString();
    }
    return toDate.toLocaleDateString();

}