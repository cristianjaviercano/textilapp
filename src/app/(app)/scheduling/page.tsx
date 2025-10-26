

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { mockProducts } from '@/data/mock-data';
import type { Task, ProductionOrder, Product, ProductStats } from '@/lib/types';
import { ArrowRight, Calculator } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const ORDERS_LOCAL_STORAGE_KEY = 'productionOrders';
const SCHEDULING_STATS_KEY = 'schedulingInitialStats';
const SCHEDULING_PARAMS_KEY = 'schedulingParams';

export default function SchedulingPage() {
  const router = useRouter();
  const [numOperatives, setNumOperatives] = useState(8);
  const [workTime, setWorkTime] = useState(480);
  const [levelingUnit, setLevelingUnit] = useState(60);
  const [packageSize, setPackageSize] = useState(10);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});
  const [availableOrders, setAvailableOrders] = useState<ProductionOrder[]>([]);
  const [initialStats, setInitialStats] = useState<ProductStats[]>([]);

  useEffect(() => {
    const storedOrders = localStorage.getItem(ORDERS_LOCAL_STORAGE_KEY);
    if (storedOrders) {
      setAvailableOrders(JSON.parse(storedOrders));
    }
    const storedStats = localStorage.getItem(SCHEDULING_STATS_KEY);
    if (storedStats) {
      setInitialStats(JSON.parse(storedStats));
    }
    const storedParams = localStorage.getItem(SCHEDULING_PARAMS_KEY);
    if (storedParams) {
      const { numOperatives, workTime, levelingUnit, packageSize, selectedOrders } = JSON.parse(storedParams);
      setNumOperatives(numOperatives);
      setWorkTime(workTime);
      setLevelingUnit(levelingUnit);
      setPackageSize(packageSize);
      setSelectedOrders(selectedOrders);
    }
  }, []);

  const tasksToSchedule: Omit<Task, 'totalSam'>[] = useMemo(() => {
    const tasks: Omit<Task, 'totalSam'>[] = [];
    const selectedOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);

    availableOrders
      .filter(order => selectedOrderIds.includes(order.id))
      .forEach(order => {
        order.items.forEach(item => {
          const productOps = mockProducts.filter(p => p.referencia === item.referencia);
          productOps.forEach(op => {
            tasks.push({
              id: `${order.id}-${item.referencia}-${op.id}`,
              orderId: order.id,
              productDescription: op.descripcion,
              operation: op.operacion,
              unitSam: op.sam,
              consecutivo: op.consecutivo,
              maquina: op.maquina,
            });
          });
        });
      });
    return tasks;
  }, [selectedOrders, availableOrders]);
  
  const samTotalsByOperation = useMemo(() => {
    const totals: Record<string, number> = {};
     const selectedOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);

    availableOrders
      .filter(order => selectedOrderIds.includes(order.id))
      .forEach(order => {
          order.items.forEach(item => {
              const productOps = mockProducts.filter(p => p.referencia === item.referencia);
              productOps.forEach(op => {
                  totals[op.operacion] = (totals[op.operacion] || 0) + (op.sam * item.cantidad);
              })
          })
      });

    return Object.entries(totals).map(([operation, totalSam]) => ({ operation, totalSam }));
  }, [selectedOrders, availableOrders]);
  
  useEffect(() => {
    const stats: Record<string, { totalSam: number; loteSize: number, products: Product[] }> = {};
    const selectedOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);

    const paramsToStore = { numOperatives, workTime, levelingUnit, packageSize, selectedOrders };
    localStorage.setItem(SCHEDULING_PARAMS_KEY, JSON.stringify(paramsToStore));

    if (selectedOrderIds.length === 0) {
      setInitialStats([]);
      localStorage.removeItem(SCHEDULING_STATS_KEY);
      return;
    }

    availableOrders
      .filter(order => selectedOrderIds.includes(order.id))
      .forEach(order => {
        order.items.forEach(item => {
          const productOps = mockProducts.filter(p => p.referencia === item.referencia);
          if (productOps.length > 0) {
            const productDesc = productOps[0].descripcion;
            if (!stats[productDesc]) {
              const totalSam = productOps.reduce((acc, op) => acc + op.sam, 0);
              stats[productDesc] = { totalSam, loteSize: 0, products: productOps };
            }
            stats[productDesc].loteSize += item.cantidad;
          }
        });
      });

    const workHours = workTime / 60;

    const calculatedStats = Object.entries(stats).map(([descripcion, data]) => {
      const unitsPerHour = data.totalSam > 0 ? (numOperatives * levelingUnit) / data.totalSam : 0;
      return {
        descripcion,
        totalSam: data.totalSam,
        loteSize: data.loteSize,
        unitsPerHour: unitsPerHour,
        unitsPerDay: unitsPerHour * workHours
      };
    });

    setInitialStats(calculatedStats);
    localStorage.setItem(SCHEDULING_STATS_KEY, JSON.stringify(calculatedStats));
  }, [selectedOrders, availableOrders, numOperatives, levelingUnit, workTime, packageSize]);


  const handleSelectOrder = (orderId: string, checked: boolean | 'indeterminate') => {
    setSelectedOrders(prev => ({ ...prev, [orderId]: !!checked }));
  };

  const handleLevelJobs = () => {
    const selectedOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id]);
    
    // Save stats to selected orders
    const updatedOrders = availableOrders.map(order => {
      if (selectedOrderIds.includes(order.id)) {
        return { ...order, stats: initialStats };
      }
      return order;
    });
    localStorage.setItem(ORDERS_LOCAL_STORAGE_KEY, JSON.stringify(updatedOrders));


    const schedulingData = {
      operatives: Array.from({ length: numOperatives }, (_, i) => ({
        id: `Op ${i + 1}`,
        availableTime: workTime,
      })),
      tasks: tasksToSchedule,
      levelingUnit: levelingUnit,
      packageSize: packageSize,
      unitsPerHour: initialStats.reduce((acc, stat) => {
        acc[stat.descripcion] = stat.unitsPerHour;
        return acc;
      }, {} as Record<string, number>),
    };
    
    localStorage.setItem('schedulingData', JSON.stringify(schedulingData));
    router.push('/scheduling/assignment');
  };

  const isAnyOrderSelected = Object.values(selectedOrders).some(v => v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Nivelación de Carga de Trabajo</h1>
        <p className="text-muted-foreground">Configure operarios, seleccione órdenes y prepárese para la asignación de tareas.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="num-operatives"># Operarios</Label>
            <Input id="num-operatives" type="number" value={numOperatives} onChange={e => setNumOperatives(parseInt(e.target.value) || 0)} />
            <Label htmlFor="work-time">Tiempo por Operario (min)</Label>
            <Input id="work-time" type="number" value={workTime} onChange={e => setWorkTime(parseInt(e.target.value) || 0)} />
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-base">Nivelación</CardTitle></CardHeader>
           <CardContent className="grid gap-2">
            <Label htmlFor="leveling-unit">Unidad de Nivelación (min)</Label>
            <Input id="leveling-unit" type="number" value={levelingUnit} onChange={e => setLevelingUnit(parseInt(e.target.value) || 0)} />
            <Label htmlFor="package-size">Tamaño de Paquete</Label>
            <Input id="package-size" type="number" value={packageSize} onChange={e => setPackageSize(parseInt(e.target.value) || 0)} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Estadísticas Iniciales</CardTitle></CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    {isAnyOrderSelected && initialStats.length > 0 ? (
                        initialStats.map((stat, index) => (
                            <div key={stat.descripcion}>
                                <h3 className="font-bold">{stat.descripcion}</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm">
                                    <p>Tamaño de Lote:</p><p className="text-right font-medium">{stat.loteSize.toFixed(0)}</p>
                                    <p>SAM Total Producto:</p><p className="text-right font-medium">{stat.totalSam.toFixed(2)} min</p>
                                    <p>Unidades/Hora (est.):</p><p className="text-right font-medium">{stat.unitsPerHour.toFixed(2)}</p>
                                    <p>Unidades/Día (est.):</p><p className="text-right font-medium">{stat.unitsPerDay.toFixed(2)}</p>
                                </div>
                                 {index < initialStats.length - 1 && <Separator className="my-2"/>}
                            </div>
                        ))
                    ) : (
                       <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
                            <p>Seleccione una orden para ver las estadísticas.</p>
                       </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>1. Seleccionar Órdenes a Producir</CardTitle>
            <CardDescription>Elija las órdenes de producción que desea incluir en esta programación.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>ID Orden</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Entrega</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableOrders.map(order => (
                    <TableRow key={order.id} data-state={selectedOrders[order.id] && 'selected'}>
                      <TableCell><Checkbox checked={selectedOrders[order.id] || false} onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)} /></TableCell>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.nombreCliente}</TableCell>
                      <TableCell>{order.fechaEntrega}</TableCell>
                    </TableRow>
                  ))}
                  {availableOrders.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">No hay órdenes creadas. Ve a la sección de Órdenes.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>2. Carga de Trabajo Requerida</CardTitle>
            <CardDescription>SAM totales para las órdenes seleccionadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operación</TableHead>
                    <TableHead className="text-right">SAM Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samTotalsByOperation.length > 0 ? samTotalsByOperation.map(item => (
                    <TableRow key={item.operation}>
                      <TableCell className="font-medium">{item.operation}</TableCell>
                      <TableCell className="text-right">{item.totalSam.toFixed(2)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground h-24">No hay órdenes seleccionadas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Button className="w-full" disabled={!isAnyOrderSelected} onClick={handleLevelJobs}>
                Nivelar Trabajos <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
