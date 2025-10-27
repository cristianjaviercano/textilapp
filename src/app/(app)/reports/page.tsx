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
  ScatterChart,
  Scatter,
  Rectangle,
  Legend
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
import { Download, ChevronDown, CheckCircle, AlertTriangle, Clock, Users, CalendarCheck, Package, Clock4 } from 'lucide-react';
import { ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import initialOrders from "@/data/orders.json";
import { mockProducts } from '@/data/mock-data';
import type { ProductionOrder, ProductStats, Product } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
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
    const activeOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
    const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));

    const { 
        kpis, 
        ganttChartData,
        ganttChartConfig,
        activityLoadData,
        operativeSummary,
        orderSummary
    } = useMemo(() => {
        if (activeOrderIds.length === 0) {
            return {
              kpis: { makespan: 0, personnelUtilization: 0, unitsPerDay: 0, deliveryStatus: { status: 'N/A', diffDays: 0, estimatedDate: '', targetDate: '' }},
              ganttChartData: [], ganttChartConfig: {}, activityLoadData: [], operativeSummary: [],
              orderSummary: { clients: [], orderIds: [], products: [], totalLoteSize: 0, timeByActivity: [], timeByMachine: [] }
            };
        }
        
        let totalMakespan = 0;
        let totalUnits = 0;
        let totalUnitsPerDay = 0;
        let operativesWithAssignments = new Set<string>();

        // For Gantt
        const operativeTasks: Record<string, any[]> = {};
        const allOperations = new Set<string>();

        // For Order Summary
        const clients = new Set<string>();
        const orderIds = new Set<string>();
        const products = new Map<string, number>();
        let totalLoteSize = 0;
        const timeByActivity: Record<string, number> = {};
        const timeByMachine: Record<string, number> = {};


        relevantOrders.forEach(order => {
            clients.add(order.nombreCliente);
            orderIds.add(order.id);

            order.stats?.forEach(stat => {
                totalMakespan += stat.totalSam * stat.loteSize;
                totalUnits += stat.loteSize;
                totalLoteSize += stat.loteSize;
                totalUnitsPerDay += stat.unitsPerDay;

                const productOps = mockProducts.filter(p => p.descripcion === stat.descripcion);
                productOps.forEach(op => {
                    const time = op.sam * stat.loteSize;
                    timeByActivity[op.operacion] = (timeByActivity[op.operacion] || 0) + time;
                    timeByMachine[op.maquina] = (timeByMachine[op.maquina] || 0) + time;
                });
            });

            order.items.forEach(item => {
                const desc = mockProducts.find(p => p.referencia === item.referencia)?.descripcion || 'N/A';
                products.set(desc, (products.get(desc) || 0) + item.cantidad);
            });

            if (order.assignments) {
                 Object.entries(order.assignments).forEach(([taskId, taskAssignments]) => {
                    const productOp = mockProducts.find(p => taskId.includes(p.id));
                    if (!productOp) return;

                    Object.entries(taskAssignments).forEach(([opId, assignedTime]) => {
                        operativesWithAssignments.add(opId);
                        if (!operativeTasks[opId]) operativeTasks[opId] = [];
                        
                        operativeTasks[opId].push({
                          taskId,
                          operative: opId,
                          orderId: order.id,
                          client: order.nombreCliente,
                          deliveryDate: order.fechaEntrega,
                          product: productOp.descripcion,
                          loteSize: order.stats?.find(s => s.descripcion === productOp.descripcion)?.loteSize || 0,
                          assignedTime,
                          operationName: productOp.operacion,
                          consecutivo: productOp.consecutivo,
                          unitSam: productOp.sam,
                          maquina: productOp.maquina
                        });
                        allOperations.add(productOp.operacion);
                    });
                });
            }
        });
        
        const allOperativesWithTasks = Array.from(operativesWithAssignments).sort();
        const numOperatives = 8; // Assuming 8 operatives as per scheduling page
        const personnelUtilization = numOperatives > 0 ? (allOperativesWithTasks.length / numOperatives) * 100 : 0;
        
        // Gantt Chart Data
        const ganttData: any[] = [];
        const newGanttConfig: ChartConfig = {};
        allOperations.forEach(op => {
          newGanttConfig[op] = { label: op, color: generateColorFromString(op) };
        });

        allOperativesWithTasks.forEach((opId, index) => {
            let currentTime = 0;
            const tasks = (operativeTasks[opId] || []).sort((a, b) => a.consecutivo - b.consecutivo);
            tasks.forEach(task => {
                const startTime = currentTime;
                const endTime = startTime + task.unitSam;
                if(endTime <= 60) { // Only show tasks within the first 60 minutes
                    ganttData.push({
                        x: [startTime, endTime],
                        y: index,
                        operative: opId,
                        operationName: task.operationName,
                        fill: newGanttConfig[task.operationName].color
                    });
                }
                currentTime = endTime;
            });
        });

        // Delivery Status
        const deliveryDates = relevantOrders.map(o => parseISO(o.fechaEntrega)).sort((a,b) => b.getTime() - a.getTime());
        const latestDeliveryDate = deliveryDates[0];
        const productionDays = totalMakespan > 0 ? (totalMakespan / 60) / 8 : 0; // 8-hour workday
        const estimatedEndDate = addDays(new Date(), Math.ceil(productionDays));
        let deliveryStatus = { status: 'N/A', diffDays: 0, estimatedDate: '', targetDate: '' };

        if(latestDeliveryDate) {
            const diffDays = differenceInDays(estimatedEndDate, latestDeliveryDate);
            let status = '';
            if (diffDays <= 0) status = 'A tiempo';
            else status = 'Retrasado';

            deliveryStatus = {
                status,
                diffDays: Math.abs(diffDays),
                estimatedDate: format(estimatedEndDate, 'PPP', {locale: es}),
                targetDate: format(latestDeliveryDate, 'PPP', {locale: es}),
            };
        }

        const activityLoadData = allOperativesWithTasks.map(opId => ({
            name: opId,
            actividades: (operativeTasks[opId] || []).length
        }));

        const newOperativeSummary = allOperativesWithTasks.flatMap(opId => operativeTasks[opId] || []);

        const finalOrderSummary = {
             clients: Array.from(clients),
             orderIds: Array.from(orderIds),
             products: Array.from(products.entries()).map(([name, qty]) => ({name, qty})),
             totalLoteSize,
             timeByActivity: Object.entries(timeByActivity).map(([name, time]) => ({name, time})).sort((a,b)=> b.time - a.time),
             timeByMachine: Object.entries(timeByMachine).map(([name, time]) => ({name, time})).sort((a,b)=> b.time - a.time)
        }
        
        return {
            kpis: { makespan: totalMakespan, personnelUtilization, unitsPerDay: totalUnitsPerDay, deliveryStatus },
            ganttChartData: ganttData,
            ganttChartConfig: newGanttConfig,
            activityLoadData,
            operativeSummary: newOperativeSummary,
            orderSummary: finalOrderSummary,
        };

    }, [selectedOrders, orders, activeOrderIds, relevantOrders]);

  return (
    <div className="space-y-8">
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

            <Button variant="outline" disabled>
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
                        <Clock4 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.makespan.toFixed(2)} min</div>
                        <p className="text-xs text-muted-foreground">Tiempo total de trabajo para la orden</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilización de Personal</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.personnelUtilization.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Del total de operarios disponibles</p>
                    </CardContent>
                </Card>
                 <Card className={
                    kpis.deliveryStatus.status === 'A tiempo' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                    kpis.deliveryStatus.status === 'Retrasado' ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' : ''
                }>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cumplimiento de Entrega</CardTitle>
                         {kpis.deliveryStatus.status === 'A tiempo' && <CheckCircle className="h-4 w-4 text-green-600" />}
                         {kpis.deliveryStatus.status === 'Retrasado' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            kpis.deliveryStatus.status === 'A tiempo' ? 'text-green-700 dark:text-green-400' :
                            kpis.deliveryStatus.status === 'Retrasado' ? 'text-red-700 dark:text-red-400' : ''
                        }`}>{kpis.deliveryStatus.status}</div>
                         <p className="text-xs text-muted-foreground">
                            Fin est.: {kpis.deliveryStatus.estimatedDate} vs Entrega: {kpis.deliveryStatus.targetDate}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unidades / Día</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.unitsPerDay.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Producción estimada por día</p>
                    </CardContent>
                </Card>
            </div>
            
            <h2 className="text-2xl font-bold font-headline pt-4">Diagramas</h2>
            <Separator />
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                    <CardTitle>Diagrama de Gantt (SAM Unitario)</CardTitle>
                    <CardDescription>
                        Secuencia de operaciones por operario para una unidad (primeros 60 min).
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={ganttChartConfig} className="min-h-[400px] w-full">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid />
                          <XAxis type="number" dataKey="x[0]" name="start" label={{ value: "Tiempo (min)", position: 'insideBottom', offset: -10 }} domain={[0, 60]} />
                          <YAxis type="category" dataKey="operative" name="operative" label={{ value: 'Operarios', angle: -90, position: 'insideLeft' }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={
                              <ChartTooltipContent
                                  className="w-[200px]"
                                  labelFormatter={(value, payload) => payload[0]?.payload.operative}
                                  formatter={(value, name, props) => {
                                      const { payload } = props;
                                      return (
                                          <div className="flex flex-col gap-1">
                                              <span className='font-bold'>{payload.operationName}</span>
                                              <span>Inicio: {payload.x[0].toFixed(2)} min</span>
                                              <span>Fin: {payload.x[1].toFixed(2)} min</span>
                                          </div>
                                      );
                                  }}
                              />
                            }
                          />
                          <Scatter data={ganttChartData} shape={({x, y, ...props}) => {
                              const {payload} = props;
                              if (Array.isArray(payload.x) && typeof y === 'number') {
                                const [x_start, x_end] = payload.x;
                                const width = x_end - x_start;
                                return <Rectangle {...props} x={x_start} y={y - 5} width={width} height={10} />;
                              }
                              return null;
                          }} />
                        </ScatterChart>
                      </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                    <CardTitle>Carga de Actividades por Operario</CardTitle>
                    <CardDescription>
                        Número de operaciones distintas asignadas a cada operario.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={{}} className="min-h-[400px] w-full">
                        <BarChart data={activityLoadData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: 'Nº Actividades', angle: -90, position: 'insideLeft' }} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="actividades" fill="hsl(var(--primary))" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-2xl font-bold font-headline pt-4">Resumen de Orden</h2>
            <Separator />
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Información General</h3>
                            <p><strong>Cliente(s):</strong> {orderSummary.clients.join(', ')}</p>
                            <p><strong>Orden(es):</strong> {orderSummary.orderIds.join(', ')}</p>
                            <p><strong>Tamaño Total Lote:</strong> {orderSummary.totalLoteSize} unidades</p>
                        </div>
                        <div className="md:col-span-2">
                             <h3 className="font-semibold mb-2">Productos a Producir</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {orderSummary.products.map(p => (
                                        <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Tiempo Total por Actividad (min)</h3>
                             <Table>
                                <TableHeader><TableRow><TableHead>Actividad</TableHead><TableHead className="text-right">Tiempo Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {orderSummary.timeByActivity.map(a => (
                                        <TableRow key={a.name}><TableCell>{a.name}</TableCell><TableCell className="text-right">{a.time.toFixed(2)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <div>
                            <h3 className="font-semibold mb-2">Tiempo Total por Máquina (min)</h3>
                             <Table>
                                <TableHeader><TableRow><TableHead>Máquina</TableHead><TableHead className="text-right">Tiempo Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {orderSummary.timeByMachine.map(m => (
                                        <TableRow key={m.name}><TableCell>{m.name}</TableCell><TableCell className="text-right">{m.time.toFixed(2)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>


            <h2 className="text-2xl font-bold font-headline pt-4">Resumen de Carga por Operario</h2>
            <Separator />
            <Card>
                <CardContent className="pt-6">
                    <Accordion type="single" collapsible className="w-full">
                        {Array.from(operativesWithAssignments).sort().map(opId => (
                            <AccordionItem value={opId} key={opId}>
                                <AccordionTrigger className="text-base font-medium">
                                    <div className="flex justify-between w-full pr-4">
                                        <span>{opId}</span>
                                        <span className="text-muted-foreground font-normal">
                                            {operativeSummary.filter(t => t.operative === opId).length} actividades asignadas
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="px-1 pb-4">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sec</TableHead>
                                                    <TableHead>Operación</TableHead>
                                                    <TableHead>Producto</TableHead>
                                                     <TableHead>Cliente</TableHead>
                                                    <TableHead>Máquina</TableHead>
                                                    <TableHead className="text-right">Tiempo Asignado (min)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {operativeSummary.filter(t => t.operative === opId).sort((a,b) => a.consecutivo - b.consecutivo).map((task, index) => (
                                                    <TableRow key={`${task.taskId}-${index}`}>
                                                        <TableCell>{task.consecutivo}</TableCell>
                                                        <TableCell>{task.operationName}</TableCell>
                                                        <TableCell>{task.product}</TableCell>
                                                        <TableCell>{task.client}</TableCell>
                                                        <TableCell>{task.maquina}</TableCell>
                                                        <TableCell className="text-right">{task.assignedTime.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-right font-bold">Tiempo Total Asignado:</TableCell>
                                                    <TableCell className="text-right font-bold">{operativeSummary.filter(t => t.operative === opId).reduce((sum, task) => sum + task.assignedTime, 0).toFixed(2)} min</TableCell>
                                                </TableRow>
                                            </TableFooter>
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
