'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Wallet, BellRing, BellPlus, Users, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type Loan = {
  amountRequested: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  createdAt: string;
};

type LoanApplication = {
    status?: 'pending' | 'approved' | 'rejected';
};

type Borrower = {
  id: string;
};

function StatCard({ title, value, icon: Icon, color, description }: { title: string; value: string | number; icon: React.ElementType, color?: string, description?: string }) {
  return (
    <Card className={color}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function RecentPayments({ loans }: { loans: Loan[] }) {
    const recentPayments = loans
        .filter(l => l.status === 'paid')
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>A log of the most recently settled loans.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentPayments.length > 0 ? recentPayments.map((loan, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{formatCurrency(loan.amountPaid)}</TableCell>
                                <TableCell className="capitalize">{loan.status}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">No recent payments</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function TotalUsersCard({ count }: { count: number }) {
    return (
        <Card className="col-span-1 lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Total Users Created</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4">
                 <div className="relative h-24 w-24">
                    <svg className="h-full w-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-secondary" strokeWidth="2"></circle>
                        <g className="origin-center -rotate-90 transform">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-primary" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - (count > 100 ? 100 : count)}></circle>
                        </g>
                    </svg>
                    <div className="absolute top-1/2 start-1/2 transform -translate-y-1/2 -translate-x-1/2">
                        <span className="text-center text-2xl font-bold text-gray-800 dark:text-white">{count}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


export default function AdminDashboardPage() {
    const firestore = useFirestore();

    const loansQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'Loans')) : null,
        [firestore]
    );
    const applicationsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'loanApplications'), where('status', 'in', ['pending', undefined])) : null,
        [firestore]
    );
    const borrowersQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'Borrowers')) : null,
        [firestore]
    );

    const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
    const { data: applications, isLoading: applicationsLoading } = useCollection<LoanApplication>(applicationsQuery);
    const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);

    const stats = useMemo(() => {
        if (!loans) return { totalDebits: 0, totalCredits: 0, pendingTopups: 0 };
        return {
            totalDebits: loans.reduce((acc, l) => acc + l.amountRequested, 0),
            totalCredits: loans.reduce((acc, l) => acc + l.amountPaid, 0),
            pendingTopups: loans.filter(l => l.status === 'approved').length,
        };
    }, [loans]);

    const isLoading = loansLoading || applicationsLoading || borrowersLoading;

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Debit(s)" value={formatCurrency(stats.totalDebits)} icon={Landmark} color="bg-red-500/10 text-red-500" description="+20.1% from last month" />
                <StatCard title="Total Credit(s)" value={formatCurrency(stats.totalCredits)} icon={Wallet} color="bg-green-500/10 text-green-500" description="+180.1% from last month" />
                <StatCard title="Pending Loan" value={applications?.length ?? 0} icon={BellRing} color="bg-orange-500/10 text-orange-500" description="Awaiting approval" />
                <StatCard title="Pending Topup" value={stats.pendingTopups} icon={BellPlus} color="bg-blue-500/10 text-blue-500" description="Approved, not active" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               <TotalUsersCard count={borrowers?.length ?? 0} />
               {loans && <RecentPayments loans={loans} />}
            </div>
        </div>
    );
}
