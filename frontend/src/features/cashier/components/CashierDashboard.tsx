"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, UtensilsCrossed, Users, ShoppingBag, ChevronRight } from "lucide-react";
import Menu from "@/features/restaurant/components/Menu";
import Tables from "@/features/restaurant/components/Tables";
import Overview from "@/features/restaurant/components/Overview";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { ToastHost } from "@/components/ui";
import { useMe } from "@/lib/use-me";
import Orders from "./orders/Orders";

const Dashboard = () => {
    const slug = String(useParams()?.res ?? "");
    const me = useMe(); // VM-20
    // The saved section is only known in the browser. Until it's read nothing loads, so the server
    // and the first browser render match, and the wrong section's data is never fetched.
    const [section, setSection] = useState<string | null>(null);

    useEffect(() => {
        setSection(localStorage.getItem("dashboardSection") || "overview");
    }, []);

    const navigationItems = [
        {
            id: "overview",
            label: "Overview",
            icon: BarChart3,
            description: "Dashboard analytics",
        },
        {
            id: "tables",
            label: "Tables",
            icon: Users,
            description: "Manage seating",
        },
        {
            id: "orders",
            label: "Orders",
            icon: ShoppingBag,
            description: "Order management",
        },
        {
            id: "menu",
            label: "Menu",
            icon: UtensilsCrossed,
            description: "Menu items",
        },
    ];

    const handleSectionChange = (sectionId: string) => {
        setSection(sectionId);
        localStorage.setItem("dashboardSection", sectionId);
    };

    const renderContent = () => {
        switch (section) {
            case "overview":
                return <Overview />;
            case "orders":
                return <Orders />;
            case "menu":
                return <Menu role="cashier" />;
            case "tables":
                return <Tables role="cashier" />;
            default:
                return null;
        }
    };

    const currentSection = navigationItems.find((item) => item.id === section);

    return (
        <div className="relative min-h-screen bg-[var(--card)] text-[var(--ink)]">
            <ToastHost />
            <DashboardHeader
                title="V-Menu Cashier"
                subtitle={slug}
                roleLabel="Cashier"
                name={me?.name}
                email={me?.email}
                loginHref={`/${slug}/cashier/login`}
                clock
            />

            <div className="flex relative">
                {/* Sidebar Navigation */}
                <div className="w-72 hidden md:block bg-[var(--bg)] fixed left-0 min-h-[calc(100vh-88px)] border-r border-[var(--line)] p-6">
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-[var(--ink)] mb-2">Dashboard</h2>
                        <p className="text-sm text-[var(--muted)]">Manage your restaurant operations</p>
                    </div>

                    <nav className="space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = section === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSectionChange(item.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group ${
                                        isActive
                                            ? "bg-[var(--bg)]     text-[var(--accent-text)]  border border-[var(--accent)] "
                                            : "text-[var(--body)]  hover:bg-[var(--card)]  hover:text-[var(--ink)]"
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`p-2 rounded-lg ${
                                                isActive ? "bg-[var(--accent-soft)] " : "bg-[var(--card)]  group-hover:bg-[var(--card)] "
                                            }`}
                                        >
                                            <Icon size={20} className={isActive ? "text-[var(--accent-text)]" : ""} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">{item.label}</div>
                                            <div className={`text-xs ${isActive ? "text-[var(--accent-text)] " : "text-[var(--muted)] "}`}>
                                                {item.description}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={`transition-transform ${isActive ? "rotate-90" : ""}`} />
                                </button>
                            );
                        })}
                    </nav>
                </div>
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--line)] flex justify-around items-center py-2 md:hidden">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = section === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleSectionChange(item.id)}
                                className={`flex flex-col items-center text-xs ${isActive ? "text-[var(--accent-text)] " : "text-[var(--muted)] "}`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 md:pl-80 md:pr-8 md:py-4 p-4 pb-24 md:pb-0">
                    {/* Content Header */}
                    <div className="mb-6">
                        <div className="flex items-center space-x-3 mb-2">
                            {currentSection && (
                                <>
                                    <div className="p-2 bg-[var(--btn-bg)] rounded-lg">
                                        <currentSection.icon size={20} aria-hidden className="text-[var(--btn-ink)]" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-[var(--ink)]">{currentSection.label}</h1>
                                        <p className="text-[var(--muted)]">{currentSection.description}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-[var(--bg)] rounded-2xl shadow-sm border border-[var(--line)] min-h-[600px]">
                        <div className="p-6">{renderContent()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
