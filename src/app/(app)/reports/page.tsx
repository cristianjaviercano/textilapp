
"use client";

import React, { useState, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown } from 'lucide-react';
import { ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import initialOrders from "@/data/orders.json";
import { mockProducts } from '@/data/mock-data';
import type { ProductionOrder, Product } from "@/lib/types";

// Function to generate a color from a string (e.g., operation name)
const generateColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
};


export default function ReportsPage() {
    const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});
    const orders = initialOrders as ProductionOrder[];
    
    const numSelectedOrders = Object.values(selectedOrders).filter(Boolean).length;

    const { kpis, operativeLoadData, chartConfig, operativeSummary, allOperations } = useMemo(() => {
        const activeOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
        if (activeOrderIds.length === 0) {
            return { kpis: { makespan: 0, utilization: 0, efficiency: 0, unitsPerHour: 0 }, operativeLoadData: [], chartConfig: {}, operativeSummary: [], allOperations: [] };
        }

        const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));
        
        const operativeLoads: Record<string, Record<string, number>> = {};
        let totalAssignedSam = 0;
        let totalRequiredSam = 0;
        let totalUnits = 0;
        let totalLevelingTime = 0;
        const operationsSet = new Set<string>();

        relevantOrders.forEach(order => {
            if (order.assignments) {
                 Object.entries(order.assignments).forEach(([taskId, taskAssignments]) => {
                    const productOp = mockProducts.find(p => taskId.endsWith(p.id));
                    if (!productOp) return;
                    const operationName = productOp.operacion;
                    operationsSet.add(operationName);

                    Object.entries(taskAssignments).forEach(([opId, assignedTime]) => {
                        if (!operativeLoads[opId]) {
                            operativeLoads[opId] = {};
                        }
                        operativeLoads[opId][operationName] = (operativeLoads[opId][operationName] || 0) + assignedTime;
                        totalAssignedSam += assignedTime;
                    });
                });
            }
             if (order.stats) {
                order.stats.forEach(stat => {
                    totalRequiredSam += stat.totalSam * stat.loteSize;
                    totalUnits += stat.loteSize;
                });
            }
        });

        const allOperatives = Object.keys(operativeLoads).sort();
        const numOperatives = allOperatives.length;

        if(numOperatives > 0) {
            const firstOrderWithStats = relevantOrders.find(o => o.stats && o.stats.length > 0);
            if (firstOrderWithStats?.stats) {
                 const levelingUnit = firstOrderWithStats.stats[0] ? 60 : 0; // Defaulting to 60 if available
                 totalLevelingTime = numOperatives * levelingUnit;
            }
        }
        
        const operativeTotalTimes = Object.entries(operativeLoads).reduce((acc, [opId, opLoads]) => {
            acc[opId] = Object.values(opLoads).reduce((sum, time) => sum + time, 0);
            return acc;
        }, {} as Record<string, number>);

        const makespan = Math.max(0, ...Object.values(operativeTotalTimes));
        const utilization = totalLevelingTime > 0 ? (totalAssignedSam / totalLevelingTime) * 100 : 0;
        const efficiency = totalRequiredSam > 0 ? (totalRequiredSam / totalAssignedSam) * 100 : 0;
        
        const totalHours = makespan > 0 ? makespan / 60 : 1;
        const unitsPerHour = totalUnits / totalHours;

        const allOperations = Array.from(operationsSet);
        
        const chartData = allOperatives.map(opId => {
            const operativeData: { [key: string]: string | number } = { operative: opId };
            allOperations.forEach(opName => {
                operativeData[opName] = operativeLoads[opId]?.[opName] || 0;
            });
            return operativeData;
        });
        
        const newChartConfig = allOperations.reduce((acc, opName) => {
            acc[opName] = {
                label: opName,
                color: generateColorFromString(opName),
            };
            return acc;
        }, {} as ChartConfig);
        
        const newOperativeSummary = allOperatives.map(opId => {
            const totalMinutes = operativeTotalTimes[opId] || 0;
            const levelingUnit = totalLevelingTime > 0 ? totalLevelingTime / numOperatives : 0;
            const opUtilization = levelingUnit > 0 ? (totalMinutes / levelingUnit) * 100 : 0;
             return {
                operative: opId,
                totalMinutes: totalMinutes,
                utilization: opUtilization,
                efficiency: 100 // Placeholder
            }
        });

        return {
            kpis: {
                makespan,
                utilization,
                efficiency,
                unitsPerHour
            },
            operativeLoadData: chartData,
            chartConfig: newChartConfig,
            operativeSummary: newOperativeSummary,
            allOperations,
        };

    }, [selectedOrders, orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Reportes y Analíticas</h1>
          <p className="text-muted-foreground">Visualizar programaciones e indicadores clave de rendimiento.</p>
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Seleccionar Órdenes ({numSelectedOrders})
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Órdenes de Producción</DropdownMenuLabel>
                    <DropdownMenuSeparator/>
                    {orders.map(order => (
                        <DropdownMenuCheckboxItem
                            key={order.id}
                            checked={selectedOrders[order.id] || false}
                            onCheckedChange={(checked) => {
                                setSelectedOrders(prev => ({...prev, [order.id]: !!checked}))
                            }}
                        >
                            {order.id} - {order.nombreCliente}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => alert("La funcionalidad de exportar a PDF se implementaría aquí.")}>
            <Download className="mr-2 h-4 w-4" />
            Exportar a PDF
            </Button>
        </div>
      </div>

        {numSelectedOrders === 0 ? (
            <div className="flex h-96 items-center justify-center rounded-lg border border-dashed text-center">
                <div>
                    <h2 className="text-xl font-medium">No hay datos para mostrar</h2>
                    <p className="text-muted-foreground">Por favor, seleccione una o más órdenes para generar el reporte.</p>
                </div>
            </div>
        ) : (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Makespan (Tiempo de Ciclo)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.makespan.toFixed(2)} min</div>
                        <p className="text-xs text-muted-foreground">Tiempo máx. para completar tareas asignadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilización General</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.utilization.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Basado en el tiempo de nivelación</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eficiencia General</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.efficiency.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">SAM requerido vs. SAM asignado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unidades / Hora (Est.)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.unitsPerHour.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Producción estimada con la carga actual</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                <CardTitle>Diagrama de Gantt de Carga por Operario</CardTitle>
                <CardDescription>
                    Este gráfico muestra el tiempo total (en minutos) asignado a cada operario para las órdenes seleccionadas.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                    <BarChart
                        data={operativeLoadData}
                        layout="vertical"
                        margin={{ left: 10 }}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="operative"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'hsl(var(--foreground))' }}
                        />
                        <XAxis 
                            type="number" 
                            tick={{ fill: 'hsl(var(--foreground))' }}
                        />
                        <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {allOperations.map((opName) => (
                           <Bar
                                key={opName}
                                dataKey={opName}
                                stackId="a"
                                fill={chartConfig[opName]?.color}
                                radius={[4, 4, 4, 4]}
                           />
                        ))}
                    </BarChart>
                </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Resumen de Carga por Operario</CardTitle>
                    <CardDescription>
                        Detalle de la carga de trabajo, utilización y eficiencia por cada operario.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Operario</TableHead>
                                <TableHead className="text-right">Minutos Asignados</TableHead>
                                <TableHead className="text-right">Utilización (%)</TableHead>
                                <TableHead className="text-right">Eficiencia (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operativeSummary.map(op => (
                                <TableRow key={op.operative}>
                                    <TableCell className="font-medium">{op.operative}</TableCell>
                                    <TableCell className="text-right">{op.totalMinutes.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{op.utilization.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{op.efficiency.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
