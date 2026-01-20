'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingUp, BellPlus, PackageCheck, Banknote, Users, Briefcase, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Loan = {
  loanAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  totalRepayment: number;
  status: 'Processing' | 'Approved' | 'Disbursed' | 'Active' | 'Completed' | 'Overdue' | 'Rejected';
  createdAt: { toDate: () => Date };
};

type LoanApplication = {
    status?: 'Processing' | 'Approved' | 'Rejected';
};

type Investment = {
    plan: string;
    amount: number;
    status: 'Active' | 'Matured' | 'Withdrawn';
    maturityDate: { toDate: () => Date };
};

type InvestmentApplication = {
    status?: 'Processing' | 'Approved' | 'Rejected';
};


type Customer = {};

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
        .filter(l => l.status === 'Completed')
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
                                <TableCell className="font-medium">{formatCurrency(loan.totalRepayment)}</TableCell>
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

function RecentInvestments({ investments }: { investments: Investment[] }) {
    const recentInvestments = investments
        .filter(l => l.status === 'Matured')
        .sort((a,b) => b.maturityDate.toDate().getTime() - a.maturityDate.toDate().getTime())
        .slice(0, 5);

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader>
                <CardTitle>Recently Matured Investments</CardTitle>
                <CardDescription>A log of the most recently matured investments.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Plan</TableHead>
                            <TableHead>Amount Matured</TableHead>
                            <TableHead className='text-right'>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentInvestments.length > 0 ? recentInvestments.map((inv, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{inv.plan}</TableCell>
                                <TableCell>{formatCurrency(inv.amount)}</TableCell>
                                <TableCell className="capitalize text-right">{inv.status}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">No recently matured investments</TableCell>
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
        () => firestore ? query(collection(firestore, 'loanApplications'), where('status', '==', 'Processing')) : null,
        [firestore]
    );
    const customersQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'Customers')) : null,
        [firestore]
    );
    const investmentsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'Investments')) : null,
        [firestore]
    );
    const investmentApplicationsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'investmentApplications'), where('status', '==', 'Processing')) : null,
        [firestore]
    );
    
    const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
    const { data: applications, isLoading: applicationsLoading } = useCollection<LoanApplication>(applicationsQuery);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
    const { data: investments, isLoading: investmentsLoading } = useCollection<Investment>(investmentsQuery);
    const { data: investmentApplications, isLoading: investmentAppsLoading } = useCollection<InvestmentApplication>(investmentApplicationsQuery);


    const stats = useMemo(() => {
        if (!loans || !investments) return { totalDebits: 0, totalCredits: 0, pendingLoans: 0, outstandingBalance: 0, activeLoans: 0, totalInvested: 0, activeInvestments: 0, pendingInvestments: 0 };
        
        const totalCredits = loans.reduce((acc, l) => acc + (l.amountPaid || 0), 0);
        const totalDebits = loans.reduce((acc, l) => acc + (l.loanAmount || 0), 0);
        const activeOrOverdue = loans.filter(l => l.status === 'Active' || l.status === 'Overdue');
        const outstandingBalance = activeOrOverdue.reduce((acc, l) => acc + (l.outstandingBalance || 0), 0);

        const activeInvestmentsData = investments.filter(i => i.status === 'Active');
        const totalInvested = activeInvestmentsData.reduce((acc, i) => acc + (i.amount || 0), 0);

        return {
            totalDebits,
            totalCredits,
            pendingLoans: applications?.length ?? 0,
            outstandingBalance: outstandingBalance,
            activeLoans: activeOrOverdue.length,
            totalInvested: totalInvested,
            activeInvestments: activeInvestmentsData.length,
            pendingInvestments: investmentApplications?.length ?? 0
        };
    }, [loans, applications, investments, investmentApplications]);

    const isLoading = loansLoading || applicationsLoading || customersLoading || investmentsLoading || investmentAppsLoading;

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
                <StatCard title="Total Credit(s)" value={formatCurrency(stats.totalCredits)} icon={Wallet} color="bg-green-500/10 text-green-500" description="Total loan repayments received" />
                <StatCard title="Total Debit(s)" value={formatCurrency(stats.totalDebits)} icon={Banknote} color="bg-red-500/10 text-red-500" description="Total loans disbursed" />
                <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested)} icon={PiggyBank} color="bg-cyan-500/10 text-cyan-500" description="Total active investments"/>
                <StatCard title="Outstanding Loan Balance" value={formatCurrency(stats.outstandingBalance)} icon={TrendingUp} description="Across all active loans"/>
                
                <StatCard title="Active Loans" value={stats.activeLoans} icon={PackageCheck} description="Currently running loans" />
                <StatCard title="Active Investments" value={stats.activeInvestments} icon={Briefcase} description="Currently running investments" />
                <StatCard title="Total Customers" value={customers?.length ?? 0} icon={Users} description="Total number of borrowers" />

                <StatCard title="Pending Loan Apps" value={stats.pendingLoans} icon={BellPlus} color="bg-orange-500/10 text-orange-500" description="New loan applications" />
                <StatCard title="Pending Investment Apps" value={stats.pendingInvestments} icon={BellPlus} color="bg-purple-500/10 text-purple-500" description="New investment applications" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               {loans && <RecentLoans loans={loans} />}
               {investments && <RecentInvestments investments={investments} />}
            </div>
        </div>
    );
}
