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
import type { Task, ProductionOrder } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

const ORDERS_LOCAL_STORAGE_KEY = 'productionOrders';

export default function SchedulingPage() {
  const router = useRouter();
  const [numOperatives, setNumOperatives] = useState(8);
  const [workTime, setWorkTime] = useState(480);
  const [levelingUnit, setLevelingUnit] = useState(60);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({});
  const [availableOrders, setAvailableOrders] = useState<ProductionOrder[]>([]);

  useEffect(() => {
    const storedOrders = localStorage.getItem(ORDERS_LOCAL_STORAGE_KEY);
    if (storedOrders) {
      setAvailableOrders(JSON.parse(storedOrders));
    }
  }, []);

  const tasksToSchedule: Task[] = useMemo(() => {
    const tasks: Task[] = [];
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
              totalSam: op.sam * item.cantidad,
              unitSam: op.sam,
            });
          });
        });
      });
    return tasks;
  }, [selectedOrders, availableOrders]);
  
  const samTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    tasksToSchedule.forEach(task => {
        totals[task.operation] = (totals[task.operation] || 0) + task.totalSam;
    });
    return Object.entries(totals).map(([operation, totalSam]) => ({ operation, totalSam }));
  }, [tasksToSchedule]);

  const handleSelectOrder = (orderId: string, checked: boolean | 'indeterminate') => {
    setSelectedOrders(prev => ({ ...prev, [orderId]: !!checked }));
  };

  const handleLevelJobs = () => {
    const schedulingData = {
      operatives: Array.from({ length: numOperatives }, (_, i) => ({
        id: `Op ${i + 1}`,
        availableTime: workTime,
      })),
      tasks: tasksToSchedule,
      levelingUnit: levelingUnit,
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
          <CardHeader className="pb-2"><CardTitle className="text-base">Operarios</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="num-operatives">Número de Operarios</Label>
            <Input id="num-operatives" type="number" value={numOperatives} onChange={e => setNumOperatives(parseInt(e.target.value))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Tiempo de Trabajo</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="work-time">Tiempo por Operario (min)</Label>
            <Input id="work-time" type="number" value={workTime} onChange={e => setWorkTime(parseInt(e.target.value))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Nivelación</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="leveling-unit">Unidad de Nivelación (min)</Label>
            <Input id="leveling-unit" type="number" value={levelingUnit} onChange={e => setLevelingUnit(parseInt(e.target.value))} />
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-center bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <Button className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90" disabled={!isAnyOrderSelected} onClick={handleLevelJobs}>
              Nivelar Trabajos <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {!isAnyOrderSelected && <p className="text-xs text-center mt-2 text-primary-foreground/70">Seleccione al menos una orden</p>}
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
                      <TableCell><Checkbox checked={selectedOrders[order.id] || false} onCheckedChange={(checked) => handleSelectOrder(order.id, checked)} /></TableCell>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.nombreCliente}</TableCell>
                      <TableCell>{order.fechaEntrega}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>2. Carga de Trabajo Requerida</CardTitle>
            <CardDescription>Minutos Estándar Permitidos (SAM) totales para las órdenes seleccionadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operación</TableHead>
                    <TableHead className="text-right">SAM Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samTotals.length > 0 ? samTotals.map(item => (
                    <TableRow key={item.operation}>
                      <TableCell className="font-medium">{item.operation}</TableCell>
                      <TableCell className="text-right">{item.totalSam.toFixed(2)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No hay órdenes seleccionadas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
