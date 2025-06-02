import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Home,
  FolderOpen,
  Users,
  RefreshCw,
  ShoppingCart,
  FileText
} from "lucide-react";

const menuItems = [
  { icon: Home, label: "Start", href: "/worker" },
  { icon: FolderOpen, label: "Sager", href: "/worker/cases" },
  { icon: Users, label: "Kunder", href: "/worker/customers" },
  { icon: RefreshCw, label: "RMA", href: "/worker/rma" },
  { icon: ShoppingCart, label: "Bestilling", href: "/worker/orders" },
  { icon: FileText, label: "Interne Sager", href: "/worker/internal" },
];

export function SidebarNav() {
  const [location] = useLocation();

  return (
    <div className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                isActive && "bg-secondary"
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
