"use client";

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
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
import type { ProductionOrder } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

    const { kpis, barChartData, chartConfig, operativeSummary, allOperations } = useMemo(() => {
        const activeOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
        if (activeOrderIds.length === 0) {
            return { kpis: { makespan: 0, utilization: 0, efficiency: 0, unitsPerHour: 0 }, barChartData: [], chartConfig: {}, operativeSummary: [], allOperations: [] };
        }

        const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));
        
        const operativeTasks: Record<string, {taskId: string, assignedTime: number, operationName: string, unitSam: number, maquina: string}[]> = {};
        const operationsSet = new Set<string>();
        let totalAssignedSam = 0;
        let totalRequiredSam = 0;
        let totalUnits = 0;
        let totalLevelingTime = 0;

        relevantOrders.forEach(order => {
            if (order.assignments) {
                 Object.entries(order.assignments).forEach(([taskId, taskAssignments]) => {
                    const productOp = mockProducts.find(p => taskId.endsWith(p.id));
                    if (!productOp) return;
                    const operationName = productOp.operacion;
                    operationsSet.add(operationName);

                    Object.entries(taskAssignments).forEach(([opId, assignedTime]) => {
                        if (!operativeTasks[opId]) {
                          operativeTasks[opId] = [];
                        }
                        operativeTasks[opId].push({
                          taskId,
                          assignedTime,
                          operationName,
                          unitSam: productOp.sam,
                          maquina: productOp.maquina
                        });
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
        
        const allOperatives = Object.keys(operativeTasks).sort();
        const numOperatives = allOperatives.length;

        if(numOperatives > 0) {
            const firstOrderWithStats = relevantOrders.find(o => o.stats && o.stats.length > 0);
            if (firstOrderWithStats?.stats && firstOrderWithStats.stats.length > 0) {
                 const levelingUnit = 60; 
                 totalLevelingTime = numOperatives * levelingUnit;
            }
        }
        
        const newChartConfig = Array.from(operationsSet).reduce((acc, opName) => {
            acc[opName] = {
                label: opName,
                color: generateColorFromString(opName),
            };
            return acc;
        }, {} as ChartConfig);

        const operativeLoadByName: Record<string, Record<string, number>> = {};
        allOperatives.forEach(opId => {
            operativeLoadByName[opId] = { name: opId };
            operationsSet.forEach(opName => {
                operativeLoadByName[opId][opName] = 0;
            });
            operativeTasks[opId].forEach(task => {
                operativeLoadByName[opId][task.operationName] += task.assignedTime;
            });
        });
        const barChartData = Object.values(operativeLoadByName);

        const operativeTotalTimes: Record<string, number> = {};
        allOperatives.forEach(opId => {
            operativeTotalTimes[opId] = (operativeTasks[opId] || []).reduce((sum, task) => sum + task.assignedTime, 0);
        });
        
        const makespan = Math.max(0, ...Object.values(operativeTotalTimes));
        const utilization = totalLevelingTime > 0 ? (totalAssignedSam / totalLevelingTime) * 100 : 0;
        const efficiency = totalRequiredSam > 0 && totalAssignedSam > 0 ? (totalRequiredSam / totalAssignedSam) * 100 : 0;
        
        const totalHours = makespan > 0 ? makespan / 60 : 1;
        const unitsPerHour = totalHours > 0 ? totalUnits / totalHours : 0;

        const allOperations = Array.from(operationsSet);
        
        const newOperativeSummary = allOperatives.map(opId => {
            const totalMinutes = operativeTotalTimes[opId] || 0;
            return {
                operative: opId,
                totalMinutes: totalMinutes,
                tasks: operativeTasks[opId] || [],
            }
        });

        return {
            kpis: {
                makespan,
                utilization,
                efficiency,
                unitsPerHour
            },
            barChartData,
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
                        <p className="text-xs text-muted-foreground">Tiempo máx. por operario</p>
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
                    Este gráfico muestra el tiempo total (en minutos) asignado a cada operario, desglosado por operación.
                </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                    <BarChart layout="vertical" data={barChartData} stackOffset="none" margin={{ right: 20 }}>
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                      />
                      <XAxis type="number" />
                      <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {allOperations.map((op) => (
                        <Bar
                          key={op}
                          dataKey={op}
                          stackId="a"
                          fill={chartConfig[op]?.color}
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
                    <Accordion type="single" collapsible className="w-full">
                        {operativeSummary.map(op => (
                            <AccordionItem value={op.operative} key={op.operative}>
                                <AccordionTrigger className="text-base font-medium">
                                    <div className="flex justify-between w-full pr-4">
                                        <span>{op.operative}</span>
                                        <span className="text-muted-foreground font-normal">
                                            {op.tasks.length} actividades asignadas
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="px-1 pb-4">
                                        <h4 className="font-semibold mb-2">Detalle de las operaciones asignadas:</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Operación</TableHead>
                                                    <TableHead>Máquina</TableHead>
                                                    <TableHead className="text-right">Tiempo Asignado (min)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {op.tasks.map(task => (
                                                    <TableRow key={task.taskId}>
                                                        <TableCell>{task.operationName}</TableCell>
                                                        <TableCell>{task.maquina}</TableCell>
                                                        <TableCell className="text-right">{task.assignedTime.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <tfoot className="bg-secondary font-medium">
                                                <tr>
                                                    <TableCell colSpan={2} className="text-right font-bold">Tiempo Total Asignado:</TableCell>
                                                    <TableCell className="text-right font-bold">{op.totalMinutes.toFixed(2)} min</TableCell>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
