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
    title: "BOM Management",
    href: "/bom",
    icon: FileText,
    description: "Manage Bill of Materials: products, operations, and machines.",
  },
  {
    title: "Production Orders",
    href: "/orders",
    icon: PackagePlus,
    description: "Create, view, and manage all customer production orders.",
  },
  {
    title: "Workload Scheduling",
    href: "/scheduling",
    icon: Users,
    description: "Balance workload and assign tasks to operatives.",
  },
  {
    title: "Reports & Analytics",
    href: "/reports",
    icon: BarChart3,
    description: "Visualize schedules with Gantt charts and performance KPIs.",
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
          The central hub for managing your textile production workflow.
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
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Start by populating your products and operations in <Link href="/bom" className="font-semibold text-foreground hover:underline">BOM Management</Link>.</li>
              <li>Create new production requests in <Link href="/orders" className="font-semibold text-foreground hover:underline">Production Orders</Link>.</li>
              <li>Go to <Link href="/scheduling" className="font-semibold text-foreground hover:underline">Scheduling</Link> to balance and assign the work.</li>
              <li>Finally, check results and KPIs in <Link href="/reports" className="font-semibold text-foreground hover:underline">Reports</Link>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
