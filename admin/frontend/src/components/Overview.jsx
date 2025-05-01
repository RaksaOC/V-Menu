export default function Overview() {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Overview</h2>
            <div className="grid gap-4">
                <div
                    className="bg-blue-100 dark:bg-blue-900 p-4 rounded-xl text-blue-800 dark:text-blue-200">
                    24 New Orders Today
                </div>
                <div
                    className="bg-green-100 dark:bg-green-900 p-4 rounded-xl text-green-800 dark:text-green-200">
                    18 Orders Delivered
                </div>
                <div
                    className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-xl text-yellow-800 dark:text-yellow-200">
                    4 Pending Payments
                </div>
            </div>
        </div>
    );
}