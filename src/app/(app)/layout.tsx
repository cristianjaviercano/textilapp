"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutGrid,
  PackagePlus,
  BarChart3,
  Users,
} from "lucide-react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";


const navItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
  { href: "/bom", icon: FileText, label: "BOM" },
  { href: "/orders", icon: PackagePlus, label: "Órdenes" },
  { href: "/scheduling", icon: Users, label: "Programación" },
  { href: "/reports", icon: BarChart3, label: "Reportes" },
];

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <h1 className="font-headline font-bold text-xl group-data-[collapsible=icon]:hidden">
            TextileFlow
          </h1>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label, side: "right" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground px-2">
          © {new Date().getFullYear()}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}


function MainContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
      <SidebarTrigger className={cn("mb-4", state === 'expanded' && 'hidden')} />
      {children}
    </div>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset>
            <MainContent>
                {children}
            </MainContent>
        </SidebarInset>
    </SidebarProvider>
  );
}
