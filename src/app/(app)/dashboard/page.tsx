import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, LayoutGrid, PackagePlus, BarChart3, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

const modules = [
  {
    title: "Gestión de BOM",
    href: "/bom",
    icon: FileText,
    description: "Gestionar lista de materiales: productos, operaciones y máquinas.",
  },
  {
    title: "Órdenes de Producción",
    href: "/orders",
    icon: PackagePlus,
    description: "Crear, ver y gestionar todas las órdenes de producción de clientes.",
  },
  {
    title: "Programación de Carga",
    href: "/scheduling",
    icon: Users,
    description: "Balancear la carga de trabajo y asignar tareas a los operarios.",
  },
  {
    title: "Reportes y Analíticas",
    href: "/reports",
    icon: BarChart3,
    description: "Visualizar programaciones con diagramas de Gantt y KPIs de rendimiento.",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          TextileFlow Scheduler
        </h1>
        <p className="text-muted-foreground mt-1">
          El centro de control para gestionar tu flujo de trabajo de producción textil.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((mod) => (
          <Link href={mod.href} key={mod.href} className="group">
            <Card className="h-full transition-all duration-200 ease-in-out group-hover:shadow-md group-hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{mod.title}</CardTitle>
                <mod.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {mod.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Para Empezar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Comienza por poblar tus productos y operaciones en <Link href="/bom" className="font-semibold text-foreground hover:underline">Gestión de BOM</Link>.</li>
              <li>Crea nuevas solicitudes de producción en <Link href="/orders" className="font-semibold text-foreground hover:underline">Órdenes de Producción</Link>.</li>
              <li>Ve a <Link href="/scheduling" className="font-semibold text-foreground hover:underline">Programación</Link> para balancear y asignar el trabajo.</li>
              <li>Finalmente, revisa los resultados y KPIs en <Link href="/reports" className="font-semibold text-foreground hover:underline">Reportes</Link>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
