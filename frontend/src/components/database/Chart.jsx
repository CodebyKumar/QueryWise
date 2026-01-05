/**
 * Chart Component
 * 
 * Generic, reusable chart component that renders based on ChartConfig.
 * Uses Recharts library for rendering.
 * 
 * Design: Config-driven rendering - the component doesn't know about
 * database schemas or specific data structures. It just renders whatever
 * ChartConfig tells it to render.
 */

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { formatNumber, formatCompact, limitWithOthers, toTitleCase } from '../../utils/formatters';

// Color palette for charts
const COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
];

/**
 * Chart Component
 * 
 * @param {Object} chartConfig - Configuration object from backend (ChartConfig schema)
 * @param {string} chartConfig.chart_id - Unique chart identifier
 * @param {string} chartConfig.chart_type - Type: 'bar', 'line', 'pie', 'table'
 * @param {string} chartConfig.title - Chart title
 * @param {string} chartConfig.description - Optional description
 * @param {Array} chartConfig.data - Array of data objects
 * @param {string} chartConfig.x_axis - Field name for x-axis
 * @param {string} chartConfig.y_axis - Field name for y-axis
 * @param {string} chartConfig.x_label - X-axis label
 * @param {string} chartConfig.y_label - Y-axis label
 */
export function Chart({ chartConfig }) {
    const {
        chart_type,
        title,
        description,
        data,
        x_axis,
        y_axis,
        x_label,
        y_label
    } = chartConfig;

    // Limit data for pie/bar charts to prevent overcrowding
    const processedData = chart_type === 'pie'
        ? limitWithOthers(data, y_axis, 8)
        : chart_type === 'bar' && data.length > 15
            ? limitWithOthers(data, y_axis, 15)
            : data;

    // Custom tooltip formatter with number formatting
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900">{toTitleCase(label)}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {toTitleCase(entry.name)}: <span className="font-semibold">{formatNumber(entry.value)}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Y-axis tick formatter
    const formatYAxis = (value) => {
        if (Math.abs(value) >= 1000) {
            return formatCompact(value, 1);
        }
        return formatNumber(value);
    };

    // No data case
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-base">No data available</p>
                </div>
            </div>
        );
    }

    // Helper to truncate long labels
    const truncateLabel = (value, limit = 15) => {
        if (typeof value !== 'string') return value;
        return value.length > limit ? `${value.substring(0, limit)}...` : value;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
            <div className="h-80 w-full">
                {chart_type === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={processedData}
                            margin={{ top: 20, right: 20, left: 10, bottom: 70 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                                vertical={false}
                            />

                            <XAxis
                                dataKey={x_axis}
                                label={{ value: x_label, position: 'insideBottom', offset: -45, style: { fill: '#6b7280', fontSize: 12 } }}
                                angle={-25}
                                textAnchor="end"
                                height={60}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickFormatter={(val) =>
                                    truncateLabel(toTitleCase(val), 14)
                                }
                            />

                            <YAxis
                                label={{ value: y_label, angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 }, offset: 10 }}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickFormatter={formatYAxis}
                                width={60}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: '#f9fafb' }}
                            />

                            <Legend
                                verticalAlign="top"
                                align="right"
                                formatter={(val) => (
                                    <span className="text-gray-600 text-sm">
                                        {toTitleCase(val)}
                                    </span>
                                )}
                            />

                            <Bar
                                dataKey={y_axis}
                                fill={COLORS[0]}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}



                {chart_type === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={processedData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis
                                dataKey={x_axis}
                                label={{ value: x_label, position: 'insideBottom', offset: -35, style: { fill: '#6b7280', fontSize: 12 } }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickFormatter={(val) => truncateLabel(toTitleCase(val), 18)}
                            />
                            <YAxis
                                label={{ value: y_label, angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 }, offset: 0 }}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickFormatter={formatYAxis}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                formatter={(val) => <span className="text-gray-600 text-sm">{toTitleCase(val)}</span>}
                                wrapperStyle={{ paddingTop: '10px' }}
                            />
                            <Line
                                type="monotone"
                                dataKey={y_axis}
                                stroke={COLORS[0]}
                                strokeWidth={2.5}
                                dot={{ fill: 'white', stroke: COLORS[0], strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {chart_type === 'pie' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Pie
                                data={processedData}
                                dataKey={y_axis}
                                nameKey={x_axis}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={(entry) => {
                                    return truncateLabel(toTitleCase(entry[x_axis]), 15);
                                }}
                                labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                            >
                                {processedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                formatter={(val) => <span className="text-gray-600 text-sm">{truncateLabel(toTitleCase(val), 20)}</span>}
                                wrapperStyle={{ paddingTop: '10px' }}
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}

                {chart_type === 'table' && (
                    <div className="overflow-auto max-h-80 rounded-lg border border-gray-200 scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    {Object.keys(data[0]).map((key) => (
                                        <th
                                            key={key}
                                            className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50"
                                        >
                                            {toTitleCase(key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                                        {Object.values(row).map((value, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                                            >
                                                {typeof value === 'number' ? formatNumber(value) : value}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chart;
