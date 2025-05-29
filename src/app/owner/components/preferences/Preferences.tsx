import { Settings, Bell, Shield, Palette, Globe, Database, Mail, Smartphone, Clock, Users } from "lucide-react";

export default function Preferences() {
    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 relative">
            {/* Background Content - Slightly Blurred */}
            <div className=" pointer-events-none select-none opacity-70">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Preferences</h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">Customize your restaurant settings and manage your business preferences</p>
                    </div>
                    <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg w-full sm:w-auto">
                        <Settings size={20} />
                        <span>Save Changes</span>
                    </button>
                </div>

                {/* Settings Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* General Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Settings size={20} className="text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                                <input type="text" placeholder="Bella Vista Restaurant" className="w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-600" disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
                                <select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-600" disabled>
                                    <option>9:00 AM - 10:00 PM</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Enable Online Orders</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Table Reservations</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Bell size={20} className="text-green-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">SMS Alerts</span>
                                <div className="w-12 h-6 bg-gray-300 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Order Updates</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Low Stock Alerts</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Shield size={20} className="text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Change Password</label>
                                <input type="password" placeholder="••••••••" className="w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-600" disabled />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <button className="w-full h-10 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium" disabled>
                                View Login History
                            </button>
                        </div>
                    </div>

                    {/* Appearance Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Palette size={20} className="text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                                <select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-600" disabled>
                                    <option>Light Mode</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                                <select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-600" disabled>
                                    <option>English (US)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                                <select className="w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-600" disabled>
                                    <option>MM/DD/YYYY</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Payment Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Database size={20} className="text-yellow-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Payment & Billing</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Methods</label>
                                <div className="p-3 border border-gray-300 rounded-lg text-gray-600 text-sm">
                                    Visa ending in 4242 • Default
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Auto-renewal</span>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <button className="w-full h-10 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-medium" disabled>
                                View Billing History
                            </button>
                        </div>
                    </div>

                    {/* Integration Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Globe size={20} className="text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Google Analytics</span>
                                    <p className="text-xs text-gray-500">Track website visitors</p>
                                </div>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">POS System</span>
                                    <p className="text-xs text-gray-500">Square integration</p>
                                </div>
                                <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <Globe size={24} className="text-blue-600 mb-2" />
                            <span className="text-sm text-gray-700 font-medium">Website Settings</span>
                            <span className="text-xs text-gray-500">Domain & SEO</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <Database size={24} className="text-green-600 mb-2" />
                            <span className="text-sm text-gray-700 font-medium">Data Backup</span>
                            <span className="text-xs text-gray-500">Export & Restore</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <Mail size={24} className="text-purple-600 mb-2" />
                            <span className="text-sm text-gray-700 font-medium">Email Setup</span>
                            <span className="text-xs text-gray-500">SMTP Configuration</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <Users size={24} className="text-orange-600 mb-2" />
                            <span className="text-sm text-gray-700 font-medium">User Management</span>
                            <span className="text-xs text-gray-500">Roles & Permissions</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 bg-white/80  flex items-center justify-center">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 sm:p-12 text-center max-w-md mx-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Settings size={32} className="text-blue-600" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Coming Soon</h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        We're working hard to bring you advanced preference settings.
                        This feature will allow you to customize every aspect of your restaurant management experience.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Clock size={16} />
                        <span>Expected: Next Update</span>
                    </div>
                </div>
            </div>
        </div>
    );
}