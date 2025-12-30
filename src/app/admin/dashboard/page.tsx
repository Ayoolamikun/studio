'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Wallet, BellRing, BellPlus, TrendingUp, HandCoins, PackageCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Loan = {
  amountRequested: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  createdAt: { toDate: () => Date };
};

type LoanApplication = {
    status?: 'pending' | 'approved' | 'rejected';
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

function RecentLoans({ loans }: { loans: Loan[] }) {
    const recentLoans = loans
        .filter(l => l.status === 'paid')
        .sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
        .slice(0, 5);

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader>
                <CardTitle>Recently Settled Loans</CardTitle>
                <CardDescription>A log of the most recently completed loans.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Amount Settled</TableHead>
                            <TableHead className='text-right'>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentLoans.length > 0 ? recentLoans.map((loan, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{formatCurrency(loan.amountPaid)}</TableCell>
                                <TableCell className="capitalize text-right">{loan.status}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">No recently settled loans</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
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
    
    const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
    const { data: applications, isLoading: applicationsLoading } = useCollection<LoanApplication>(applicationsQuery);

    const stats = useMemo(() => {
        if (!loans) return { totalDebits: 0, totalCredits: 0, pendingTopups: 0, notDisbursed: 0, processingFee: 0 };
        
        const totalCredits = loans.reduce((acc, l) => acc + l.amountPaid, 0);

        return {
            totalDebits: loans.reduce((acc, l) => acc + l.amountRequested, 0),
            totalCredits: totalCredits,
            // Approvals that haven't been activated yet. Placeholder logic.
            pendingTopups: loans.filter(l => l.status === 'approved').length,
            // This is a placeholder for a real 'not-disbursed' status
            notDisbursed: 0, 
            // Processing fee is estimated as 1% of total credits, as a placeholder.
            processingFee: totalCredits * 0.01,
        };
    }, [loans]);

    const isLoading = loansLoading || applicationsLoading;

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
                <StatCard title="Total Credit(s)" value={formatCurrency(stats.totalCredits)} icon={Wallet} color="bg-green-500/10 text-green-500" description="+18% from last month" />
                <StatCard title="Processing Fee Income" value={formatCurrency(stats.processingFee)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" description="Based on collections" />
                <StatCard title="Pending Topup" value={stats.pendingTopups} icon={BellPlus} color="bg-blue-500/10 text-blue-500" description="Approved, awaiting disbursal" />
                <StatCard title="Not-Disbursed" value={stats.notDisbursed} icon={PackageCheck} color="bg-purple-500/10 text-purple-500" description="Awaiting activation" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               {loans && <RecentLoans loans={loans} />}
            </div>
        </div>
    );
}
