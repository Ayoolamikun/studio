'use client';

import {
  LogOut,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';

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
import { useAuth, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import Logo from '@/components/Logo';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoanApplicationsTab } from './LoanApplicationsTab';
import { MembershipApplicationsTab } from './MembershipApplicationsTab';
import { ContactSubmissionsTab } from './ContactSubmissionsTab';


function getInitials(name: string | null | undefined) {
  if (!name) return 'A';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.toUpperCase().slice(0, 2);
}

export function AdminDashboard({ user }: { user: User }) {
  const auth = useAuth();
  const firestore = useFirestore();

  const loanApplicationsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'loanApplications'), orderBy('submissionDate', 'desc')) : null,
    [firestore]
  );
  const membershipApplicationsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'membershipApplications'), orderBy('submissionDate', 'desc')) : null,
    [firestore]
  );
  const contactSubmissionsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'contactFormSubmissions'), orderBy('submissionDate', 'desc')) : null,
    [firestore]
  );

  const { data: loanApplications, isLoading: loansLoading } = useCollection(loanApplicationsQuery);
  const { data: membershipApplications, isLoading: membershipsLoading } = useCollection(membershipApplicationsQuery);
  const { data: contactSubmissions, isLoading: contactsLoading } = useCollection(contactSubmissionsQuery);


  const handleLogout = async () => {
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
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Tabs defaultValue="loans">
            <TabsList>
              <TabsTrigger value="loans">Loan Applications</TabsTrigger>
              <TabsTrigger value="memberships">Membership Applications</TabsTrigger>
              <TabsTrigger value="contact">Contact Submissions</TabsTrigger>
            </TabsList>
            <TabsContent value="loans">
              <LoanApplicationsTab applications={loanApplications} isLoading={loansLoading} />
            </TabsContent>
            <TabsContent value="memberships">
              <MembershipApplicationsTab applications={membershipApplications} isLoading={membershipsLoading} />
            </TabsContent>
            <TabsContent value="contact">
                <ContactSubmissionsTab submissions={contactSubmissions} isLoading={contactsLoading} />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
