/** The short number staff and customers see for a bill or an order: the id's last 6 characters. */
export const orderNumber = (id: string) => id.slice(-6).toUpperCase();
