import React, { useEffect, useState } from "react";

// One figure on the owner's overview, sliding in after `delay` ms.
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bgColor: string;
    textColor: string;
    subtitle?: string;
    isUrgent?: boolean;
    delay?: number;
}

export const StatCard = ({ title, value, icon: Icon, color, bgColor, textColor, subtitle, isUrgent = false, delay = 0 }: StatCardProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`
        relative bg-white rounded-3xl p-6 shadow-md border border-slate-200
        transition-all duration-700 ease-out transform
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        hover:shadow-xl hover:-translate-y-2
        ${isUrgent ? "ring-2 ring-amber-300 ring-opacity-50" : ""}
      `}
        >
            {isUrgent && <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-pulse"></div>}

            <div className="flex items-center justify-between mb-4">
                <div className={`${bgColor} p-3 rounded-2xl`}>
                    <div className={`bg-gradient-to-br ${color} p-3 rounded-xl shadow-lg`}>
                        <Icon size={24} className="text-white" />
                    </div>
                </div>
                {isUrgent && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Urgent</span>}
            </div>

            <div>
                <h3 className={`text-sm font-semibold ${textColor} uppercase tracking-wide mb-2`}>{title}</h3>
                <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-gray-800">
                        {typeof value === "number" ? value.toLocaleString("en-US") : value}
                    </span>
                    {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
                </div>
            </div>
        </div>
    );
};
