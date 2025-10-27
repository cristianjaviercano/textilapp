
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
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown } from 'lucide-react';
import { ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import initialOrders from "@/data/orders.json";
import type { ProductionOrder } from "@/lib/types";

const operativeColors: { [key: string]: string } = {
  'Op 1': 'hsl(var(--chart-1))',
  'Op 2': 'hsl(var(--chart-2))',
  'Op 3': 'hsl(var(--chart-3))',
  'Op 4': 'hsl(var(--chart-4))',
  'Op 5': 'hsl(var(--chart-5))',
  'Op 6': 'hsl(var(--chart-1))',
  'Op 7': 'hsl(var(--chart-2))',
  'Op 8': 'hsl(var(--chart-3))',
};

export default function ReportsPage() {
    const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});
    const orders = initialOrders as ProductionOrder[];
    
    const numSelectedOrders = Object.values(selectedOrders).filter(Boolean).length;

    const { kpis, operativeLoadData, chartConfig, operativeSummary } = useMemo(() => {
        const activeOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
        if (activeOrderIds.length === 0) {
            return { kpis: { makespan: 0, utilization: 0, efficiency: 0, unitsPerHour: 0 }, operativeLoadData: [], chartConfig: {}, operativeSummary: [] };
        }

        const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));
        
        const operativeLoads: Record<string, number> = {};
        let totalAssignedSam = 0;
        let totalRequiredSam = 0;
        let totalUnits = 0;
        let totalLevelingTime = 0;

        // Assuming leveling unit is consistent, taking it from the first available stat.
        // This is a simplification; a more robust solution would handle this better.
        const levelingUnit = relevantOrders[0]?.stats?.[0] ? 60 : 0; // Defaulting to 60 if available

        relevantOrders.forEach(order => {
            if (order.assignments) {
                Object.values(order.assignments).forEach(taskAssignments => {
                    Object.entries(taskAssignments).forEach(([opId, assignedTime]) => {
                        operativeLoads[opId] = (operativeLoads[opId] || 0) + assignedTime;
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

        const numOperatives = Object.keys(operativeLoads).length;
        if(numOperatives > 0 && levelingUnit > 0) {
           totalLevelingTime = numOperatives * levelingUnit;
        }

        const makespan = Math.max(0, ...Object.values(operativeLoads));
        const utilization = totalLevelingTime > 0 ? (totalAssignedSam / totalLevelingTime) * 100 : 0;
        const efficiency = totalRequiredSam > 0 ? (totalRequiredSam / totalAssignedSam) * 100 : 0;
        
        const totalHours = makespan > 0 ? makespan / 60 : 1;
        const unitsPerHour = totalUnits / totalHours;

        const chartData = Object.entries(operativeLoads).map(([opId, load]) => ({
          operative: opId,
          load,
        }));
        
        const newChartConfig: ChartConfig = {};
        const newOperativeSummary: {operative: string; totalMinutes: number, utilization: number, efficiency: number}[] = [];

        Object.keys(operativeLoads).sort().forEach(opId => {
            const opKey = opId.replace(' ', '').toLowerCase();
            newChartConfig[opKey] = { label: opId, color: operativeColors[opId] || 'hsl(var(--chart-1))' };

            const totalMinutes = operativeLoads[opId] || 0;
            const opUtilization = levelingUnit > 0 ? (totalMinutes / levelingUnit) * 100 : 0;
            
            newOperativeSummary.push({
                operative: opId,
                totalMinutes: totalMinutes,
                utilization: opUtilization,
                efficiency: 100 // Placeholder, as efficiency per operative is more complex
            })
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
            operativeSummary: newOperativeSummary
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
                            domain={[0, 'dataMax + 20']}
                        />
                        <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                        <Legend content={() => null} />
                        <Bar 
                            dataKey="load" 
                            name="Carga (min)"
                            radius={[4, 4, 4, 4]}
                        >
                             {operativeLoadData.map((entry, index) => (
                                <YAxis key={`cell-${index}`} fill={operativeColors[entry.operative] || '#8884d8'} />
                            ))}
                        </Bar>
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

