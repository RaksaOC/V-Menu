export default function CustomerPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <div className="text-center px-6 py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md max-w-md">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-white mb-4">
                    Invalid Link
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Please scan the QR code placed at your table to access the menu.
                </p>
                <div className="text-gray-400 text-sm">
                    If you believe this is a mistake, contact a staff member.
                </div>
            </div>
        </div>
    );
}
