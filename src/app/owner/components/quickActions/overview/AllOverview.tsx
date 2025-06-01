import React, {useEffect, useState} from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts";
import {
    DollarSign,
    ShoppingCart,
    Users,
    TrendingUp,
    Package,
    CreditCard,
    AlertTriangle,
    Trophy,
    Target,
    Activity
} from "lucide-react";
import api from "@/app/shared/lib/axios";

interface TopItems {
    name: string;
    quantity: number;
}

interface Data {
    numOfUnpaidOrders: number;
    numOfItems: number;
    numOfOrders: number;
    numOfPayments: number;
    numOfMoneyEarned: number;
    totalItemsSold: number;
    avgItemsPerOrder: number;
    topSellingItems: TopItems[];
}

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

const StatCard = ({
                      title,
                      value,
                      icon: Icon,
                      color,
                      bgColor,
                      textColor,
                      subtitle,
                      isUrgent = false,
                      delay = 0
                  }: StatCardProps) => {
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
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        hover:shadow-xl hover:-translate-y-2
        ${isUrgent ? 'ring-2 ring-amber-300 ring-opacity-50' : ''}
      `}
        >
            {isUrgent && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-pulse"></div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className={`${bgColor} p-3 rounded-2xl`}>
                    <div className={`bg-gradient-to-br ${color} p-3 rounded-xl shadow-lg`}>
                        <Icon size={24} className="text-white"/>
                    </div>
                </div>
                {isUrgent && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            Urgent
          </span>
                )}
            </div>

            <div>
                <h3 className={`text-sm font-semibold ${textColor} uppercase tracking-wide mb-2`}>
                    {title}
                </h3>
                <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-800">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
                    {subtitle && (
                        <span className="text-sm text-gray-500">{subtitle}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TopSellingChartProps {
    data: TopItems[];
    isVisible: boolean;
}

const TopSellingChart: React.FC<TopSellingChartProps> = ({data, isVisible}) => {
    const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

    return (
        <div className={`
      bg-white rounded-3xl p-6 shadow-md border border-slate-200
      transition-all duration-1000 ease-out transform
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
    `}>
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl">
                    <Trophy size={24} className="text-white"/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Top Selling Items</h3>
                    <p className="text-gray-500 text-sm">Most popular menu items</p>
                </div>
            </div>

            <div className="flex flex-col justify-between">
                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div
                            key={item.name}
                            className={`
                flex items-center justify-between p-4
                transition-all duration-500 ease-out transform border-b border-b-gray-500 mb-2.5
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
              `}
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{backgroundColor: COLORS[index]}}
                                ></div>
                                <span className="font-semibold text-gray-700">{item.name}</span>
                            </div>
                            <div className="text-right">
                <span className="text-lg font-bold" style={{color: COLORS[index]}}>
                  {item.quantity}
                </span>
                                <p className="text-xs text-gray-500">sold</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={90}
                                paddingAngle={1}
                                dataKey="quantity"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

interface MetricsChartProps {
    data: Data;
    isVisible: boolean;
}

const MetricsChart: React.FC<MetricsChartProps> = ({data, isVisible}) => {
    const chartData = [
        {name: 'Orders', value: data.numOfOrders, color: '#3B82F6'},
        {name: 'Payments', value: data.numOfPayments, color: '#10B981'},
        {name: 'Items Sold', value: data.totalItemsSold, color: '#8B5CF6'},
        {name: 'Menu Items', value: data.numOfItems, color: '#F59E0B'}
    ];

    return (
        <div className={`
      bg-white rounded-3xl p-6 shadow-md border border-slate-200
      transition-all duration-1000 ease-out transform flex flex-col justify-between
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
    `}>
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                    <Activity size={24} className="text-white"/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Performance Metrics</h3>
                    <p className="text-gray-500 text-sm">Key business indicators</p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{top: 0, right: -10, left: -40, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis
                        dataKey="name"
                        tick={{fontSize: 11}}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{fontSize: 11}}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                    />
                    <Bar
                        dataKey="value"
                        fill="#3B82F6"
                        radius={[8, 8, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function AllOverview() {
    const [data, setData] = useState<Data | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cardsVisible, setCardsVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const response = await api.get("/api/owner/overview");
                setData(response.data);

                // Trigger card animations after data loads
                setTimeout(() => setCardsVisible(true), 100);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="w-full mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {Array.from({length: 8}).map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl p-6 shadow-lg animate-pulse">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-2xl"></div>
                                    <div className="w-16 h-4 bg-gray-200 rounded"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-3xl p-6 shadow-lg animate-pulse">
                            <div className="w-full h-64 bg-gray-200 rounded-2xl"></div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-lg animate-pulse">
                            <div className="w-full h-64 bg-gray-200 rounded-2xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const paymentRate = data.numOfOrders > 0 ? (data.numOfPayments / data.numOfOrders) * 100 : 0;

    return (
        <div className="min-h-screen">
            <div className="w-full mx-auto">
                {/* Header */}
                <div className={`
          mb-8 transition-all duration-1000 ease-out transform
          ${cardsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        `}>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">
                        Dashboard Overview
                    </h1>
                    <p className="text-gray-600 text-sm">Real-time business insights and analytics</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Revenue"
                        value={`$${data.numOfMoneyEarned.toLocaleString()}`}
                        icon={DollarSign}
                        color="from-green-500 to-emerald-600"
                        bgColor="bg-green-50"
                        textColor="text-green-700"
                        delay={0}
                    />

                    <StatCard
                        title="Total Orders"
                        value={data.numOfOrders}
                        icon={ShoppingCart}
                        color="from-blue-500 to-indigo-600"
                        bgColor="bg-blue-50"
                        textColor="text-blue-700"
                        delay={100}
                    />

                    <StatCard
                        title="Unpaid Orders"
                        value={data.numOfUnpaidOrders}
                        icon={AlertTriangle}
                        color="from-amber-500 to-orange-600"
                        bgColor="bg-amber-50"
                        textColor="text-amber-700"
                        isUrgent={data.numOfUnpaidOrders > 0}
                        delay={200}
                    />

                    <StatCard
                        title="Payments"
                        value={data.numOfPayments}
                        icon={CreditCard}
                        color="from-cyan-500 to-blue-600"
                        bgColor="bg-cyan-50"
                        textColor="text-cyan-700"
                        delay={300}
                    />

                    <StatCard
                        title="Menu Items"
                        value={data.numOfItems}
                        icon={Package}
                        color="from-purple-500 to-violet-600"
                        bgColor="bg-purple-50"
                        textColor="text-purple-700"
                        delay={400}
                    />

                    <StatCard
                        title="Items Sold"
                        value={data.totalItemsSold}
                        icon={Target}
                        color="from-pink-500 to-rose-600"
                        bgColor="bg-pink-50"
                        textColor="text-pink-700"
                        delay={500}
                    />

                    <StatCard
                        title="Avg Items/Order"
                        value={data.avgItemsPerOrder.toFixed(1)}
                        icon={TrendingUp}
                        color="from-indigo-500 to-purple-600"
                        bgColor="bg-indigo-50"
                        textColor="text-indigo-700"
                        delay={600}
                    />

                    <StatCard
                        title="Payment Rate"
                        value={`${paymentRate.toFixed(1)}%`}
                        icon={Users}
                        color="from-teal-500 to-cyan-600"
                        bgColor="bg-teal-50"
                        textColor="text-teal-700"
                        delay={700}
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TopSellingChart data={data.topSellingItems} isVisible={cardsVisible}/>
                    <MetricsChart data={data} isVisible={cardsVisible}/>
                </div>
            </div>
        </div>
    );
}