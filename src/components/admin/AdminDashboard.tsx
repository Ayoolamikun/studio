
'use client';

import { LogOut, Calculator } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import Logo from '@/components/Logo';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoanManagementTab } from './LoanManagementTab';
import { ExcelImportTab } from './ExcelImportTab';
import LoanCalculator from '../LoanCalculator';


function getInitials(name: string | null | undefined) {
  if (!name) return 'A';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.toUpperCase().slice(0, 2);
}

export function AdminDashboard({ user }: { user: User }) {
  const auth = useAuth();
  
  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    // Redirect handled by auth listener in main app layout
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          {/* Main content can go here if needed, or just use the inset */}
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 w-full justify-start gap-2 px-2">
                 <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL ?? ''} />
                  <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{user.displayName || 'Admin User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Calculator className="h-4 w-4" />
                <span className="sr-only">Open Calculator</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Loan Calculator</SheetTitle>
              </SheetHeader>
              <div className="mt-8">
                <LoanCalculator />
              </div>
            </SheetContent>
          </Sheet>

        </header>

        <main className="flex-1 p-4 md:p-6">
          <Tabs defaultValue="loans">
            <TabsList>
              <TabsTrigger value="loans">Loan Management</TabsTrigger>
              <TabsTrigger value="excel">Excel Import</TabsTrigger>
            </TabsList>
            <TabsContent value="loans">
              <LoanManagementTab />
            </TabsContent>
            <TabsContent value="excel">
              <ExcelImportTab />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
