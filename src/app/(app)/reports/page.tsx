"use client";

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
import { Download, ChevronDown, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import initialOrders from "@/data/orders.json";
import { mockProducts } from '@/data/mock-data';
import type { ProductionOrder } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
            const defaultKpis = {
              makespan: 0,
              personnelUtilization: 0,
              unitsPerHour: 0,
              deliveryStatus: { status: 'N/A', diffDays: 0, estimatedDate: '', targetDate: '' },
            };
            return { kpis: defaultKpis, barChartData: [], chartConfig: {}, operativeSummary: [], allOperations: [] };
        }

        const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));
        
        const operativeTasks: Record<string, {taskId: string, assignedTime: number, operationName: string, unitSam: number, maquina: string}[]> = {};
        const operationsSet = new Set<string>();
        let totalMakespan = 0; // Sum of all required SAM
        let totalUnits = 0;
        let operativesWithAssignments = new Set<string>();

        relevantOrders.forEach(order => {
            if (order.assignments) {
                 Object.entries(order.assignments).forEach(([taskId, taskAssignments]) => {
                    const productOp = mockProducts.find(p => taskId.includes(p.id)); // Loosened the check to be more robust
                    if (!productOp) return;
                    const operationName = productOp.operacion;
                    operationsSet.add(operationName);

                    Object.entries(taskAssignments).forEach(([opId, assignedTime]) => {
                        operativesWithAssignments.add(opId);
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
                    });
                });
            }
             if (order.stats) {
                order.stats.forEach(stat => {
                    totalMakespan += stat.totalSam * stat.loteSize;
                    totalUnits += stat.loteSize;
                });
            }
        });
        
        const allOperativesWithTasks = Array.from(operativesWithAssignments).sort();
        const numOperatives = 8; // Assuming 8 operatives as per scheduling page
        const personnelUtilization = numOperatives > 0 ? (allOperativesWithTasks.length / numOperatives) * 100 : 0;
        
        const totalHours = totalMakespan > 0 ? totalMakespan / 60 : 0;
        const unitsPerHour = totalHours > 0 ? totalUnits / totalHours : 0;
        
        const deliveryDates = relevantOrders.map(o => parseISO(o.fechaEntrega)).sort((a,b) => b.getTime() - a.getTime());
        const latestDeliveryDate = deliveryDates[0];
        
        const productionDays = totalHours / 8; // 8-hour workday
        const estimatedEndDate = addDays(new Date(), Math.ceil(productionDays));

        let deliveryStatus = { status: 'N/A', diffDays: 0, estimatedDate: '', targetDate: '' };
        if(latestDeliveryDate) {
            const diffTime = estimatedEndDate.getTime() - latestDeliveryDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let status = '';
            if (diffDays <= 0) status = 'A tiempo';
            else if (diffDays > 0) status = 'Retrasado';

            deliveryStatus = {
                status,
                diffDays: Math.abs(diffDays),
                estimatedDate: format(estimatedEndDate, 'PPP', {locale: es}),
                targetDate: format(latestDeliveryDate, 'PPP', {locale: es}),
            };
        }


        const newChartConfig = Array.from(operationsSet).reduce((acc, opName) => {
            acc[opName] = {
                label: opName,
                color: generateColorFromString(opName),
            };
            return acc;
        }, {} as ChartConfig);

        const operativeLoadByName: Record<string, Record<string, number>> = {};
        allOperativesWithTasks.forEach(opId => {
            operativeLoadByName[opId] = { name: opId };
            operationsSet.forEach(opName => {
                operativeLoadByName[opId][opName] = 0;
            });
            operativeTasks[opId]?.forEach(task => {
                operativeLoadByName[opId][task.operationName] = (operativeLoadByName[opId][task.operationName] || 0) + task.assignedTime;
            });
        });
        const barChartData = Object.values(operativeLoadByName);

        const operativeTotalTimes: Record<string, number> = {};
        allOperativesWithTasks.forEach(opId => {
            operativeTotalTimes[opId] = (operativeTasks[opId] || []).reduce((sum, task) => sum + task.assignedTime, 0);
        });
        
        const allOperations = Array.from(operationsSet);
        
        const newOperativeSummary = allOperativesWithTasks.map(opId => {
            const totalMinutes = operativeTotalTimes[opId] || 0;
            return {
                operative: opId,
                totalMinutes: totalMinutes,
                tasks: operativeTasks[opId] || [],
            }
        });

        return {
            kpis: {
                makespan: totalMakespan,
                personnelUtilization,
                unitsPerHour,
                deliveryStatus,
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
                        <CardTitle className="text-sm font-medium">Makespan (Tiempo Total)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.makespan.toFixed(2)} min</div>
                        <p className="text-xs text-muted-foreground">Tiempo total de trabajo para la orden</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilización de Personal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.personnelUtilization.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Del total de operarios disponibles</p>
                    </CardContent>
                </Card>
                 <Card className={
                    kpis.deliveryStatus.status === 'A tiempo' ? 'bg-green-50 border-green-200' :
                    kpis.deliveryStatus.status === 'Retrasado' ? 'bg-red-50 border-red-200' : ''
                }>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cumplimiento de Entrega</CardTitle>
                         {kpis.deliveryStatus.status === 'A tiempo' && <CheckCircle className="h-4 w-4 text-green-600" />}
                         {kpis.deliveryStatus.status === 'Retrasado' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                         {kpis.deliveryStatus.status === 'Adelantado' && <Clock className="h-4 w-4 text-blue-600" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            kpis.deliveryStatus.status === 'A tiempo' ? 'text-green-700' :
                            kpis.deliveryStatus.status === 'Retrasado' ? 'text-red-700' : ''
                        }`}>{kpis.deliveryStatus.status}</div>
                         <p className="text-xs text-muted-foreground">
                            Fin est.: {kpis.deliveryStatus.estimatedDate} vs Entrega: {kpis.deliveryStatus.targetDate}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unidades / Hora (UPH)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.unitsPerHour.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Producción estimada por hora</p>
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
                                                {op.tasks.map((task, index) => (
                                                    <TableRow key={`${task.taskId}-${index}`}>
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
