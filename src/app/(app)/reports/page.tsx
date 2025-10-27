
"use client";

import React, { useState, useMemo } from 'react';
import {
  Scatter,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
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

    const { kpis, ganttData, chartConfig, operativeSummary, allOperations, allOperatives } = useMemo(() => {
        const activeOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
        if (activeOrderIds.length === 0) {
            return { kpis: { makespan: 0, utilization: 0, efficiency: 0, unitsPerHour: 0 }, ganttData: [], chartConfig: {}, operativeSummary: [], allOperations: [], allOperatives: [] };
        }

        const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));
        
        const operativeTasks: Record<string, {taskId: string, assignedTime: number, consecutivo: number, operationName: string, unitSam: number}[]> = {};
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
                        if (!operativeTasks[opId]) {
                          operativeTasks[opId] = [];
                        }
                        operativeTasks[opId].push({
                          taskId,
                          assignedTime,
                          consecutivo: productOp.consecutivo,
                          operationName,
                          unitSam: productOp.sam
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
                 const levelingUnit = firstOrderWithStats.stats[0] ? 60 : 0; 
                 totalLevelingTime = numOperatives * levelingUnit;
            }
        }
        
        const operativeTotalTimes: Record<string, number> = {};
        const ganttData: any[] = [];
        const newChartConfig = Array.from(operationsSet).reduce((acc, opName) => {
            acc[opName] = {
                label: opName,
                color: generateColorFromString(opName),
            };
            return acc;
        }, {} as ChartConfig);

        allOperatives.forEach(opId => {
          if (!operativeTasks[opId]) return;
          operativeTasks[opId].sort((a,b) => a.consecutivo - b.consecutivo);

          let currentTime = 0;
          let operativeTotalTime = 0;

          operativeTasks[opId].forEach(task => {
            const taskDuration = task.unitSam;
            const startTime = currentTime;
            const endTime = startTime + taskDuration;
            
            ganttData.push({
              operative: opId,
              operation: task.operationName,
              time: [startTime, endTime],
              duration: taskDuration,
              fill: newChartConfig[task.operationName]?.color || '#8884d8'
            });
            
            currentTime = endTime;
            operativeTotalTime += taskDuration;
          });
          operativeTotalTimes[opId] = operativeTotalTime;
        });
        
        const makespan = Math.max(0, ...Object.values(operativeTotalTimes));
        const utilization = totalLevelingTime > 0 ? (totalAssignedSam / totalLevelingTime) * 100 : 0;
        const efficiency = totalRequiredSam > 0 ? (totalRequiredSam / totalAssignedSam) * 100 : 0;
        
        const totalHours = makespan > 0 ? makespan / 60 : 1;
        const unitsPerHour = totalUnits / totalHours;

        const allOperations = Array.from(operationsSet);
        
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
            ganttData,
            chartConfig: newChartConfig,
            operativeSummary: newOperativeSummary,
            allOperations,
            allOperatives
        };

    }, [selectedOrders, orders]);

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-background border p-2 rounded shadow-lg text-sm">
            <p className="font-bold">{`Operario: ${data.operative}`}</p>
            <p>{`Operación: ${data.operation}`}</p>
            <p>{`Inicio: ${data.time[0].toFixed(2)} min`}</p>
            <p>{`Fin: ${data.time[1].toFixed(2)} min`}</p>
            <p>{`Duración (SAM Unit.): ${data.duration.toFixed(2)} min`}</p>
          </div>
        );
      }
      return null;
    };

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
                        <CardTitle className="text-sm font-medium">Makespan (Tiempo de Ciclo Unitario)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.makespan.toFixed(2)} min</div>
                        <p className="text-xs text-muted-foreground">Tiempo máx. para completar una unidad</p>
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
                <CardTitle>Diagrama de Gantt de Carga por Operario (Unitario)</CardTitle>
                <CardDescription>
                    Este gráfico muestra la secuencia de operaciones (tareas) para una unidad, asignadas a cada operario a lo largo del tiempo.
                </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                    <ScatterChart
                        margin={{
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20,
                        }}
                    >
                        <CartesianGrid />
                        <XAxis type="number" dataKey="time[0]" name="Tiempo" unit=" min" domain={[0, 'dataMax']}>
                          <Label value="Tiempo (minutos)" offset={-10} position="insideBottom" />
                        </XAxis>
                        <YAxis type="category" dataKey="operative" name="Operario" domain={allOperatives} reversed={true} interval={0} />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Legend content={<ChartLegendContent />} />
                        {allOperations.map((op) => (
                           <Scatter 
                            key={op}
                            name={op}
                            data={ganttData.filter(d => d.operation === op)}
                            fill={chartConfig[op]?.color}
                            shape={({ cx, cy, ...props }) => {
                                const { payload } = props;
                                const [start, end] = payload.time;
                                const xAxis = props.xAxis as any;
                                const width = xAxis.scale(end) - xAxis.scale(start);
                                
                                if(width <= 0) return null;

                                const y = cy - 10;
                                const x = xAxis.scale(start)

                                return <rect x={x} y={y} width={width} height={20} fill={props.fill} />;
                            }}
                           />
                        ))}
                    </ScatterChart>
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
                                <TableHead className="text-right">Minutos Asignados (Unitario)</TableHead>
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
