export const prettyDate = (date: string) => {
    const toDate = new Date(date);
    return toDate.toLocaleString();
}