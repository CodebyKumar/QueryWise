/**
 * Database Visualization Page
 * 
 * Displays database visualizations for any connected SQL database.
 * 
 * Design decisions:
 * - Separate page (not modal) for better screen real estate and navigation
 * - Tab-based interface: Overview (auto-generated) vs Custom (user-defined)
 * - Config-driven charts using ChartConfig from backend
 * - No hardcoded table/column assumptions
 * - Works with any SQL database (PostgreSQL, MySQL, SQLite, etc.)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/common/Button';
import { ChartSkeletonGrid } from '../components/common/ChartSkeleton';
import { Chart } from '../components/database/Chart';
import { CustomVisualizationBuilder } from '../components/database/CustomVisualizationBuilder';
import visualizationService from '../services/visualizationService';
import { useToast } from '../hooks/useToast';
import { useDatabase } from '../hooks/useDatabase';
import { ArrowLeft, BarChart3, Table, TrendingUp, RefreshCw, Database } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export function DatabaseVisualizationPage() {
    const [searchParams] = useSearchParams();
    const connectionIdFromUrl = searchParams.get('connectionId');
    const databaseType = searchParams.get('databaseType') || 'database';
    
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { activeConnection, activeConnectionId } = useDatabase();
    
    // Use connection from context if available, fallback to URL param
    const connectionId = activeConnectionId || connectionIdFromUrl;

    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState(null);
    const [customCharts, setCustomCharts] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'custom'
    const [generatingCustom, setGeneratingCustom] = useState(false);

    useEffect(() => {
        if (!connectionId) {
            showToast('No database connection provided', 'error');
            navigate('/database-chat');
            return;
        }

        loadVisualizationMetadata();
    }, [connectionId]);

    const loadVisualizationMetadata = async () => {
        try {
            setLoading(true);
            const result = await visualizationService.getVisualizationMetadata(
                connectionId,
                true,  // include statistics
                null   // no table limit
            );

            if (result.success) {
                setMetadata(result);
                showToast('Visualization data loaded successfully', 'success');
            } else {
                showToast(result.error || 'Failed to load visualization data', 'error');
            }
        } catch (error) {
            showToast(
                error.response?.data?.detail || 'Failed to load visualization data',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCustomVisualization = async (params) => {
        try {
            setGeneratingCustom(true);
            const result = await visualizationService.generateCustomVisualization({
                connectionId,
                ...params
            });

            if (result.success && result.chart_config) {
                setCustomCharts(prev => [result.chart_config, ...prev]);
                showToast('Custom visualization generated', 'success');
            } else {
                showToast(result.error || 'Failed to generate visualization', 'error');
            }
        } catch (error) {
            showToast(
                error.response?.data?.detail || 'Failed to generate custom visualization',
                'error'
            );
        } finally {
            setGeneratingCustom(false);
        }
    };

    const handleBack = () => {
        navigate('/database-chat');
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col bg-gray-50">
                <Header />
                
                {/* Loading state with skeleton */}
                <div className="flex-1 overflow-auto">
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                            <div>
                                <div className="h-8 w-64 bg-gray-200 rounded mb-2 animate-pulse"></div>
                                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <ChartSkeletonGrid count={4} />
                    </div>
                </div>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="h-screen flex flex-col bg-gray-50">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 text-gray-300">
                            <Database size={80} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                            Unable to Load Data
                        </h2>
                        <p className="text-gray-600 mb-6">
                            We couldn't fetch the visualization data for this database connection.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={loadVisualizationMetadata} variant="secondary">
                                <RefreshCw size={18} className="mr-2" />
                                Try Again
                            </Button>
                            <Button onClick={handleBack}>
                                <ArrowLeft size={18} className="mr-2" />
                                Back to Database Chat
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Header />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Page Header - Responsive */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 md:px-6 py-3 md:py-5">
                    {/* Top row - Back button and title */}
                    <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
                        <div className="flex items-start gap-2 md:gap-4 min-w-0 flex-1">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                className="flex items-center gap-1 md:gap-2 hover:bg-white/50 shrink-0 p-2 md:px-3 md:py-2"
                                aria-label="Back to database chat"
                            >
                                <ArrowLeft size={18} className="md:w-5 md:h-5" />
                                <span className="hidden md:inline">Back</span>
                            </Button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 truncate">
                                    Database Insights
                                </h1>
                            </div>
                        </div>
                        
                        <Button
                            onClick={loadVisualizationMetadata}
                            variant="secondary"
                            className="flex items-center gap-2 shrink-0 text-sm"
                            aria-label="Refresh visualization data"
                        >
                            <RefreshCw size={16} className="md:w-[18px] md:h-[18px]" />
                            <span className="hidden md:inline">Refresh</span>
                        </Button>
                    </div>

                    {/* Stats pills - Responsive layout */}
                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                        <span className="flex items-center gap-1.5 bg-white px-2.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-sm" title="Database type">
                            <Database size={12} className="md:w-[14px] md:h-[14px]" />
                            <span className="font-medium">{databaseType}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white px-2.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-sm" title="Total number of tables in database">
                            <Table size={12} className="md:w-[14px] md:h-[14px]" />
                            <span><span className="font-semibold">{metadata.total_tables}</span> tables</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white px-2.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-sm" title="Total number of records across all tables">
                            <BarChart3 size={12} className="md:w-[14px] md:h-[14px]" />
                            <span><span className="font-semibold">{formatNumber(metadata.total_rows)}</span> records</span>
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 md:px-6 py-2 md:py-2.5 font-medium rounded-lg transition-all whitespace-nowrap text-sm md:text-base ${
                                activeTab === 'overview'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                            }`}
                            aria-label="Overview tab - auto-generated insights"
                        >
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="md:w-[18px] md:h-[18px]" />
                                <span>Overview</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('custom')}
                            className={`px-4 md:px-6 py-2 md:py-2.5 font-medium rounded-lg transition-all whitespace-nowrap text-sm md:text-base ${
                                activeTab === 'custom'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                            }`}
                            aria-label="Custom tab - create your own visualizations"
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 size={16} className="md:w-[18px] md:h-[18px]" />
                                <span>Custom</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('tables')}
                            className={`px-4 md:px-6 py-2 md:py-2.5 font-medium rounded-lg transition-all whitespace-nowrap text-sm md:text-base ${
                                activeTab === 'tables'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                            }`}
                            aria-label="Schema tab - view database structure"
                        >
                            <div className="flex items-center gap-2">
                                <Table size={16} className="md:w-[18px] md:h-[18px]" />
                                <span>Schema</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50">
                    {/* Overview Tab - Auto-generated charts */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 max-w-7xl mx-auto">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 md:p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <TrendingUp size={18} className="md:w-5 md:h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                                            Auto-Generated Insights
                                        </h3>
                                        <p className="text-xs md:text-sm text-gray-700">
                                            These visualizations are automatically created using rule-based logic and safe SQL aggregations. 
                                            They provide an instant overview of your database structure and content.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {metadata.suggested_charts.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <div className="text-center py-12 md:py-16 px-4 md:px-6">
                                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 text-gray-300">
                                            <BarChart3 size={64} className="md:w-20 md:h-20" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                                            No Visualizations Available
                                        </h3>
                                        <p className="text-sm md:text-base text-gray-600 max-w-md mx-auto">
                                            This database doesn't have suitable data for auto-generated charts. 
                                            Try creating custom visualizations in the Custom tab.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {metadata.suggested_charts.map((chartConfig) => (
                                        <Chart
                                            key={chartConfig.chart_id}
                                            chartConfig={chartConfig}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Tab - User-defined visualizations */}
                    {activeTab === 'custom' && (
                        <div className="max-w-7xl mx-auto">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Builder Panel - Disable sticky on mobile */}
                                <div className="xl:col-span-1">
                                    <div className="xl:sticky xl:top-6">
                                        <CustomVisualizationBuilder
                                            tables={metadata.tables}
                                            onGenerate={handleGenerateCustomVisualization}
                                            isLoading={generatingCustom}
                                        />
                                    </div>
                                </div>

                                {/* Generated Charts */}
                                <div className="xl:col-span-2 space-y-6">
                                    {customCharts.length === 0 ? (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                                            <div className="text-center py-12 md:py-16 px-4 md:px-6">
                                                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 text-gray-300">
                                                    <BarChart3 size={64} className="md:w-20 md:h-20" strokeWidth={1.5} />
                                                </div>
                                                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                                                    Create Your First Visualization
                                                </h3>
                                                <p className="text-sm md:text-base text-gray-600 max-w-md mx-auto mb-4 md:mb-6">
                                                    Use the builder on the left to create custom charts. 
                                                    Select a table, choose columns, and pick a chart type to get started.
                                                </p>
                                                <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 justify-center text-xs md:text-sm">
                                                    <div className="flex items-center gap-2 bg-gray-50 px-3 md:px-4 py-2 rounded-lg">
                                                        <span className="w-5 h-5 md:w-6 md:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                                        <span className="text-gray-700">Select table</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-gray-50 px-3 md:px-4 py-2 rounded-lg">
                                                        <span className="w-5 h-5 md:w-6 md:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                                        <span className="text-gray-700">Choose columns</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-gray-50 px-3 md:px-4 py-2 rounded-lg">
                                                        <span className="w-5 h-5 md:w-6 md:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                                        <span className="text-gray-700">Pick chart type</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                                                    Generated Visualizations ({customCharts.length})
                                                </h3>
                                                <button
                                                    onClick={() => setCustomCharts([])}
                                                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                                    aria-label="Clear all custom visualizations"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                            {customCharts.map((chartConfig) => (
                                                <Chart
                                                    key={chartConfig.chart_id}
                                                    chartConfig={chartConfig}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schema Tab - Table metadata */}
                    {activeTab === 'tables' && (
                        <div className="space-y-6 max-w-7xl mx-auto">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 md:p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <Table size={18} className="md:w-5 md:h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                                            Database Schema
                                        </h3>
                                        <p className="text-xs md:text-sm text-gray-700">
                                            Complete overview of all tables, columns, data types, and relationships in your database.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {metadata.tables.map((table) => (
                                <div
                                    key={table.table_name}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                                                    {table.table_name}
                                                </h3>
                                                <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                                                    {table.columns.length} columns
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl md:text-2xl font-bold text-gray-900">
                                                    {formatNumber(table.row_count)}
                                                </div>
                                                <div className="text-xs text-gray-600">records</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Column
                                                    </th>
                                                    <th className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Type
                                                    </th>
                                                    <th className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                                                        Category
                                                    </th>
                                                    <th className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                                                        Nullable
                                                    </th>
                                                    <th className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Keys
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {table.columns.map((col) => (
                                                    <tr key={col.name} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-medium text-gray-900">
                                                            {col.name}
                                                        </td>
                                                        <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600 font-mono">
                                                            {col.data_type}
                                                        </td>
                                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm hidden sm:table-cell">
                                                            <span className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-semibold ${
                                                                col.category === 'numeric' ? 'bg-blue-100 text-blue-700' :
                                                                col.category === 'text' ? 'bg-gray-100 text-gray-700' :
                                                                col.category === 'timestamp' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {col.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-600 hidden md:table-cell">
                                                            {col.nullable ? (
                                                                <span className="text-gray-500">Yes</span>
                                                            ) : (
                                                                <span className="text-gray-700 font-medium">No</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm">
                                                            <div className="flex flex-wrap gap-1">
                                                                {col.is_primary_key && (
                                                                    <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 bg-green-100 text-green-700 rounded-full text-[10px] md:text-xs font-semibold">
                                                                        PK
                                                                    </span>
                                                                )}
                                                                {col.is_foreign_key && (
                                                                    <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] md:text-xs font-semibold">
                                                                        FK
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DatabaseVisualizationPage;
