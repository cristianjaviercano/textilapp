
"use client";

import React, { useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  Rectangle,
  LabelList,
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
import { Download, ChevronDown, CheckCircle, AlertTriangle, Users, Package, Clock4, Loader2 } from 'lucide-react';
import { type ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import initialOrders from "@/data/orders.json";
import { mockProducts } from '@/data/mock-data';
import type { ProductionOrder } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const generateColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
};


// Componente para el encabezado del PDF por operario
const PdfOperativeHeader = ({ orderSummary, kpis }: { orderSummary: any, kpis: any }) => (
    <div className="p-8 pb-4 bg-white">
        <h1 className="text-2xl font-bold font-headline mb-4">Hoja de Trabajo de Operario</h1>
        <Card>
            <CardHeader><CardTitle className="text-lg">Información de la Orden</CardTitle></CardHeader>
            <CardContent className="text-sm">
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Cliente(s):</strong> {orderSummary.clients.join(', ')}</p>
                    <p><strong>Nº Orden(es):</strong> {orderSummary.orderIds.join(', ')}</p>
                    <p><strong>Tamaño Lote Total:</strong> {orderSummary.totalLoteSize} unidades</p>
                    <p><strong>Producto(s):</strong> {orderSummary.products.map((p: any) => `${p.name} (${p.qty})`).join(', ')}</p>
                    <p><strong>Fecha de Entrega:</strong> {kpis.deliveryStatus.targetDate}</p>
                 </div>
            </CardContent>
        </Card>
        <h2 className="text-xl font-bold font-headline mt-4 mb-2">Detalle de Actividades</h2>
    </div>
);


// Componente para el detalle del operario en el PDF
const PdfOperativeDetail = ({ opId, tasks }: { opId: string, tasks: any[] }) => (
    <div className="p-8 pt-0 bg-white">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Sec</TableHead>
                    <TableHead>Producto (Ref)</TableHead>
                    <TableHead>Cliente (Orden)</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>SAM Unit.</TableHead>
                    <TableHead className="text-right">Tiempo Asignado (min)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.sort((a,b) => a.consecutivo - b.consecutivo).map((task, index) => (
                    <TableRow key={`${task.taskId}-${index}`}>
                        <TableCell>{task.consecutivo}</TableCell>
                        <TableCell><div>{task.product}</div><div className="text-xs text-muted-foreground">{task.productRef}</div></TableCell>
                        <TableCell><div>{task.client}</div><div className="text-xs text-muted-foreground">{task.orderId}</div></TableCell>
                        <TableCell>{task.operationName}</TableCell>
                        <TableCell>{task.maquina}</TableCell>
                        <TableCell>{task.unitSam.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{task.assignedTime.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={6} className="text-right font-bold">Tiempo Total Asignado a {opId}:</TableCell>
                    <TableCell className="text-right font-bold">{tasks.reduce((sum, task) => sum + task.assignedTime, 0).toFixed(2)} min</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    </div>
);

// Componente para la primera página del PDF
const PdfMainReport = ({ kpis, orderSummary, ganttChartData, ganttChartConfig, ganttDomain, operativeYMap, yAxisTickFormatter, activityLoadData }: any) => (
    <div className="p-8 bg-white" style={{width: '800px'}}>
        <h1 className="text-3xl font-bold font-headline mb-4">Informe General de Producción</h1>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <p><strong>Cliente(s):</strong> {orderSummary.clients.join(', ')}</p>
            <p><strong>Fecha de Entrega:</strong> {kpis.deliveryStatus.targetDate}</p>
            <p><strong>Nº Orden(es):</strong> {orderSummary.orderIds.join(', ')}</p>
            <p><strong>Fecha de Creación:</strong> {format(new Date(), 'PPP', {locale: es})}</p>
        </div>

        <Card className="mb-4">
            <CardHeader><CardTitle>Productos a Fabricar</CardTitle></CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {orderSummary.products.map((p: any) => (
                            <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-4 mb-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Makespan</CardTitle><Clock4 className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-xl font-bold">{kpis.makespan.toFixed(2)} min</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Unidades Totales</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-xl font-bold">{orderSummary.totalLoteSize}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Unidades / Día</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-xl font-bold">{kpis.unitsPerDay.toFixed(2)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Utilización de Personal</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-xl font-bold">{kpis.personnelUtilization.toFixed(2)}%</div></CardContent>
            </Card>
        </div>
        <Separator className="my-6" />

         <Card className="mb-4">
            <CardHeader>
            <CardTitle>Diagrama de Gantt (Carga Total por Operario)</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={ganttChartConfig} className="h-[300px] w-full">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x[0]" name="start" label={{ value: "Tiempo (min)", position: 'insideBottom', offset: -10 }} domain={ganttDomain} />
                        <YAxis type="number" dataKey="y" name="operative" interval={0} ticks={Array.from(operativeYMap.values())} tickFormatter={yAxisTickFormatter} domain={[-1, operativeYMap.size]} label={{ value: 'Operarios', angle: -90, position: 'insideLeft' }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload.operative} formatter={(value, name, props) => { if (props.payload.x) { return ( <div className="flex flex-col gap-1 text-xs"> <span className='font-bold'>{props.payload.operationName}</span> <span>Dur: {(props.payload.x[1] - props.payload.x[0]).toFixed(2)} min</span> </div> ); } return null; }} />} />
                        <Scatter data={ganttChartData} shape={({y, ...props}) => { const {payload, xAxis, yAxis} = props; if (Array.isArray(payload.x) && typeof payload.y === 'number' && payload.x.length === 2 && payload.fill && xAxis && yAxis) { const startX = xAxis.scale(payload.x[0]); const endX = xAxis.scale(payload.x[1]); const width = endX - startX; const yPos = yAxis.scale(payload.y); if (typeof yPos === 'number') { return <Rectangle {...props} x={startX} y={yPos - 5} width={width} height={10} />; } } return null; }} />
                    </ScatterChart>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle>Carga de Actividades por Operario</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                <BarChart data={activityLoadData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} label={{ value: 'Nº Actividades', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="actividades" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    </div>
);


export default function ReportsPage() {
    const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);
    const orders = initialOrders as ProductionOrder[];
    
    const numSelectedOrders = Object.values(selectedOrders).filter(Boolean).length;
    const activeOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
    const relevantOrders = orders.filter(o => activeOrderIds.includes(o.id));

    const { 
        kpis, 
        ganttChartData,
        ganttChartConfig,
        ganttDomain,
        activityLoadData,
        operativeSummary,
        orderSummary,
        allOperativesWithTasks,
        operativeYMap,
    } = useMemo(() => {
        if (activeOrderIds.length === 0) {
            return {
              kpis: { makespan: 0, personnelUtilization: 0, unitsPerDay: 0, deliveryStatus: { status: 'N/A', diffDays: 0, estimatedDate: '', targetDate: '' }},
              ganttChartData: [], ganttChartConfig: {}, ganttDomain: [0, 60], activityLoadData: [], operativeSummary: [],
              orderSummary: { clients: [], orderIds: [], products: [], totalLoteSize: 0, timeByActivity: [], timeByMachine: [] },
              allOperativesWithTasks: [],
              operativeYMap: new Map()
            };
        }
        
        const operativesWithAssignments = new Set<string>();

        const operativeTasks: Record<string, any[]> = {};
        const allOperations = new Set<string>();

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
                totalLoteSize += stat.loteSize;

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
                          productRef: productOp.referencia,
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
        
        const sortedOperatives = Array.from(operativesWithAssignments).sort();
        const numOperatives = 8; // Assuming 8 operatives as per scheduling page
        const personnelUtilization = numOperatives > 0 ? (sortedOperatives.length / numOperatives) * 100 : 0;
        
        const ganttData: any[] = [];
        const newGanttConfig: ChartConfig = {};
        allOperations.forEach(op => {
          newGanttConfig[op] = { label: op, color: generateColorFromString(op) };
        });

        let maxTime = 0;
        const newOperativeYMap = new Map(sortedOperatives.map((opId, index) => [opId, index]));

        sortedOperatives.forEach((opId) => {
            let currentTime = 0;
            const tasks = (operativeTasks[opId] || []).sort((a, b) => a.consecutivo - b.consecutivo);
            const yValue = newOperativeYMap.get(opId);

            tasks.forEach(task => {
                const startTime = currentTime;
                const endTime = startTime + task.assignedTime;
                
                if (yValue !== undefined) {
                    ganttData.push({
                        x: [startTime, endTime],
                        y: yValue,
                        operative: opId,
                        operationName: task.operationName,
                        fill: newGanttConfig[task.operationName]?.color
                    });
                }
                
                currentTime = endTime;
            });
            if (currentTime > maxTime) {
                maxTime = currentTime;
            }
        });
        
        const calculatedMakespan = Object.values(operativeTasks).flat().reduce((sum, task) => sum + task.assignedTime, 0);
        const ganttDomain = [0, maxTime > 0 ? maxTime * 1.05 : 60];
        
        const deliveryDates = relevantOrders.map(o => parseISO(o.fechaEntrega)).sort((a,b) => b.getTime() - a.getTime());
        const latestDeliveryDate = deliveryDates[0];
        const productionDays = calculatedMakespan > 0 ? (calculatedMakespan / 60) / 8 : 0; // 8-hour workday
        let deliveryStatus = { status: 'N/A', diffDays: 0, estimatedDate: '', targetDate: '' };

        if(latestDeliveryDate) {
            const estimatedEndDate = addDays(new Date(), Math.ceil(productionDays));
            const diffDays = differenceInDays(latestDeliveryDate, estimatedEndDate);
            let status = '';
            if (diffDays >= 0) status = 'A tiempo';
            else status = 'Retrasado';

            deliveryStatus = {
                status,
                diffDays: Math.abs(diffDays),
                estimatedDate: format(estimatedEndDate, 'PPP', {locale: es}),
                targetDate: format(latestDeliveryDate, 'PPP', {locale: es}),
            };
        }
        
        const unitsPerDay = productionDays > 0 ? totalLoteSize / productionDays : 0;

        const activityLoadData = sortedOperatives.map(opId => ({
            name: opId,
            actividades: (operativeTasks[opId] || []).length
        }));

        const newOperativeSummary = sortedOperatives.flatMap(opId => operativeTasks[opId] || []);

        const finalOrderSummary = {
             clients: Array.from(clients),
             orderIds: Array.from(orderIds),
             products: Array.from(products.entries()).map(([name, qty]) => ({name, qty})),
             totalLoteSize,
             timeByActivity: Object.entries(timeByActivity).map(([name, time]) => ({name, time})).sort((a,b)=> b.time - a.time),
             timeByMachine: Object.entries(timeByMachine).map(([name, time]) => ({name, time})).sort((a,b)=> b.time - a.time)
        }
        
        return {
            kpis: { makespan: calculatedMakespan, personnelUtilization, unitsPerDay, deliveryStatus },
            ganttChartData: ganttData,
            ganttChartConfig: newGanttConfig,
            ganttDomain,
            activityLoadData,
            operativeSummary: newOperativeSummary,
            orderSummary: finalOrderSummary,
            allOperativesWithTasks: sortedOperatives,
            operativeYMap: newOperativeYMap,
        };

    }, [activeOrderIds, relevantOrders]);
    
    const yAxisTickFormatter = (value: number) => {
        const entry = Array.from(operativeYMap.entries()).find(([_, index]) => index === value);
        return entry ? entry[0] : '';
    };

    const handleExportPdf = async () => {
        setIsGeneratingPdf(true);
        const pdf = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 40;
        const availableWidth = pdfWidth - margin * 2;
        
        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.width = '800px';
        document.body.appendChild(printContainer);

        // 1. Render and add the main report page
        const renderMainReportPromise = new Promise<void>((resolve) => {
            const root = ReactDOM.createRoot(printContainer);
            root.render(
                 <React.StrictMode>
                     <div className="bg-white text-black">
                        <PdfMainReport 
                            kpis={kpis} 
                            orderSummary={orderSummary}
                            ganttChartData={ganttChartData}
                            ganttChartConfig={ganttChartConfig}
                            ganttDomain={ganttDomain}
                            operativeYMap={operativeYMap}
                            yAxisTickFormatter={yAxisTickFormatter}
                            activityLoadData={activityLoadData}
                        />
                     </div>
                 </React.StrictMode>,
                 async () => {
                     await new Promise(r => setTimeout(r, 500)); // Ensure render
                     try {
                        const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true, windowWidth: 800 });
                        const imgData = canvas.toDataURL('image/png');
                        const imgHeight = (canvas.height * availableWidth) / canvas.width;
                        pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, imgHeight);
                    } finally {
                        root.unmount();
                        resolve();
                    }
                 }
            )
        });
        await renderMainReportPromise;


        // 2. Render each operative's detail page
        for (const opId of allOperativesWithTasks) {
            const operativeTasks = operativeSummary.filter(t => t.operative === opId);
            if (operativeTasks.length === 0) continue;

            pdf.addPage();
            
            const renderOperativePromise = new Promise<void>((resolve) => {
                const root = ReactDOM.createRoot(printContainer);
                root.render(
                    <React.StrictMode>
                        <div className="bg-white text-black">
                           <PdfOperativeHeader kpis={kpis} orderSummary={orderSummary} />
                           <PdfOperativeDetail opId={opId} tasks={operativeTasks} />
                        </div>
                    </React.StrictMode>
                , async () => {
                     await new Promise(r => setTimeout(r, 200)); // Ensure render
                     try {
                        const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true, windowWidth: 800 });
                        const imgData = canvas.toDataURL('image/png');
                        const imgHeight = (canvas.height * availableWidth) / canvas.width;
                        pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, imgHeight);
                    } finally {
                        root.unmount();
                        resolve();
                    }
                });
            });
            await renderOperativePromise;
        }

        document.body.removeChild(printContainer);

        pdf.save('reporte-produccion-detallado.pdf');
        setIsGeneratingPdf(false);
    };


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

            <Button onClick={handleExportPdf} disabled={numSelectedOrders === 0 || isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar a PDF
            </Button>
        </div>
      </div>
      <div ref={reportRef}>
        {numSelectedOrders === 0 ? (
            <div className="flex h-96 items-center justify-center rounded-lg border border-dashed text-center">
                <div>
                    <h2 className="text-xl font-medium">No hay datos para mostrar</h2>
                    <p className="text-muted-foreground">Por favor, seleccione una o más órdenes para generar el reporte.</p>
                </div>
            </div>
        ) : (
        <>
            <div id="pdf-general-report">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Makespan</CardTitle>
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
                            <p className="text-xs text-muted-foreground">Producción estimada por día de 8h</p>
                        </CardContent>
                    </Card>
                </div>
                
                <h2 className="text-2xl font-bold font-headline pt-4">Diagramas</h2>
                <Separator />
                
                <div className="grid gap-6 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                        <CardTitle>Diagrama de Gantt (Carga Total por Operario)</CardTitle>
                        <CardDescription>
                            Secuencia y duración de las operaciones totales asignadas a cada operario.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ChartContainer config={ganttChartConfig} className="h-[400px] w-full">
                            <ScatterChart margin={{ top: 20, right: 40, bottom: 20, left: 20 }}>
                              <CartesianGrid />
                              <XAxis type="number" dataKey="x[0]" name="start" label={{ value: "Tiempo (min)", position: 'insideBottom', offset: -10 }} domain={ganttDomain} />
                              <YAxis type="number" dataKey="y" name="operative" interval={0} ticks={Array.from(operativeYMap.values())} tickFormatter={yAxisTickFormatter} domain={[-1, operativeYMap.size]} label={{ value: 'Operarios', angle: -90, position: 'insideLeft' }} />
                               <Tooltip cursor={{ strokeDasharray: '3 3' }} content={
                                  <ChartTooltipContent
                                      className="w-[200px]"
                                      labelFormatter={(value, payload) => payload[0]?.payload.operative}
                                      formatter={(value, name, props) => {
                                          const { payload } = props;
                                          if (payload.x) {
                                              return (
                                                  <div className="flex flex-col gap-1 text-xs">
                                                      <span className='font-bold'>{payload.operationName}</span>
                                                      <span>Inicio: {payload.x[0].toFixed(2)} min</span>
                                                      <span>Fin: {payload.x[1].toFixed(2)} min</span>
                                                      <span>Dur: {(payload.x[1] - payload.x[0]).toFixed(2)} min</span>
                                                  </div>
                                              );
                                          }
                                          return null;
                                      }}
                                  />
                                }
                              />
                               <Scatter data={ganttChartData} shape={({y, ...props}) => {
                                  const {payload, xAxis, yAxis} = props;
                                  if (Array.isArray(payload.x) && typeof payload.y === 'number' && payload.x.length === 2 && payload.fill && xAxis && yAxis) {
                                      const startX = xAxis.scale(payload.x[0]);
                                      const endX = xAxis.scale(payload.x[1]);
                                      const width = endX - startX;
                                      
                                      const yPos = yAxis.scale(payload.y);
                                      
                                      if (typeof yPos === 'number') {
                                        return <Rectangle {...props} x={startX} y={yPos - 5} width={width} height={10} />;
                                      }
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
                          <ChartContainer config={{}} className="h-[400px] w-full">
                            <BarChart data={activityLoadData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis allowDecimals={false} label={{ value: 'Nº Actividades', angle: -90, position: 'insideLeft' }} />
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
                    <CardContent className="pt-6 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base mb-2">Información General</h3>
                                <p><strong>Cliente(s):</strong> {orderSummary.clients.join(', ')}</p>
                                <p><strong>Orden(es):</strong> {orderSummary.orderIds.join(', ')}</p>
                                <p><strong>Tamaño de paquete:</strong> {orderSummary.totalLoteSize} unidades</p>
                            </div>
                            <div className="space-y-2">
                                 <h3 className="font-semibold text-base mb-2">Productos a Producir</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="h-8">Producto</TableHead><TableHead className="h-8 text-right">Cantidad</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {orderSummary.products.map(p => (
                                            <TableRow key={p.name}><TableCell className="py-1">{p.name}</TableCell><TableCell className="py-1 text-right">{p.qty}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="md:col-span-1">
                                <h3 className="font-semibold text-base mb-2">Tiempo Total por Actividad (min)</h3>
                                 <ChartContainer config={{}} className="h-[250px] w-full">
                                     <BarChart data={orderSummary.timeByActivity} layout="vertical" margin={{left: 120, right: 20}}>
                                         <CartesianGrid horizontal={false} />
                                         <XAxis type="number" dataKey="time" />
                                         <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} />
                                         <Tooltip content={<ChartTooltipContent />} />
                                         <Bar dataKey="time" fill="hsl(var(--primary))" radius={4}>
                                            <LabelList dataKey="time" position="right" offset={8} className="fill-foreground text-xs" formatter={(value: number) => value.toFixed(0)} />
                                         </Bar>
                                     </BarChart>
                                 </ChartContainer>
                            </div>
                             <div className="md:col-span-1">
                                <h3 className="font-semibold text-base mb-2">Tiempo Total por Máquina (min)</h3>
                                 <ChartContainer config={{}} className="h-[250px] w-full">
                                    <BarChart data={orderSummary.timeByMachine} layout="vertical" margin={{left: 100, right: 20}}>
                                         <CartesianGrid horizontal={false} />
                                         <XAxis type="number" dataKey="time" />
                                         <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} />
                                         <Tooltip content={<ChartTooltipContent />} />
                                         <Bar dataKey="time" fill="hsl(var(--primary))" radius={4}>
                                            <LabelList dataKey="time" position="right" offset={8} className="fill-foreground text-xs" formatter={(value: number) => value.toFixed(0)} />
                                         </Bar>
                                     </BarChart>
                                 </ChartContainer>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>


            <div id="pdf-operative-summary">
                <h2 className="text-2xl font-bold font-headline pt-4">Resumen de Carga por Operario</h2>
                <Separator />
                <Card>
                    <CardContent className="pt-6">
                        <Accordion type="single" collapsible className="w-full">
                            {allOperativesWithTasks.map(opId => (
                                <AccordionItem value={opId} key={opId} className="pdf-operative-item">
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
                                                        <TableHead>Producto (Ref)</TableHead>
                                                        <TableHead>Cliente (Orden)</TableHead>
                                                        <TableHead>Operación</TableHead>
                                                        <TableHead>Máquina</TableHead>
                                                        <TableHead>SAM Unit.</TableHead>
                                                        <TableHead className="text-right">Tiempo Asignado (min)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {operativeSummary.filter(t => t.operative === opId).sort((a,b) => a.consecutivo - b.consecutivo).map((task, index) => (
                                                        <TableRow key={`${task.taskId}-${index}`}>
                                                            <TableCell>{task.consecutivo}</TableCell>
                                                            <TableCell><div>{task.product}</div><div className="text-xs text-muted-foreground">{task.productRef}</div></TableCell>
                                                            <TableCell><div>{task.client}</div><div className="text-xs text-muted-foreground">{task.orderId}</div></TableCell>
                                                            <TableCell>{task.operationName}</TableCell>
                                                            <TableCell>{task.maquina}</TableCell>
                                                            <TableCell>{task.unitSam.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">{task.assignedTime.toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-right font-bold">Tiempo Total Asignado:</TableCell>
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
            </div>
        </>
      )}
      </div>
    </div>
  );
}


    
