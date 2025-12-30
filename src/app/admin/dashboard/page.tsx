'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandCoins, CheckCircle, Banknote, Hourglass, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { LoanManagementTable } from '@/components/admin/LoanManagementTable';

type Loan = {
  amountRequested: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
};

type Customer = {
  id: string;
};

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
    const firestore = useFirestore();

    const loansQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'Loans')) : null,
        [firestore]
    );
    const customersQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'Customers')) : null,
        [firestore]
    );

    const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

    const stats = useMemo(() => {
        if (!loans) return { active: 0, settled: 0, pending: 0, totalValue: 0 };
        return {
            active: loans.filter(l => l.status === 'active' || l.status === 'overdue').length,
            settled: loans.filter(l => l.status === 'paid').length,
            pending: loans.filter(l => l.status === 'pending' || l.status === 'approved').length,
            totalValue: loans.reduce((acc, l) => acc + l.amountRequested, 0),
        };
    }, [loans]);

    const isLoading = loansLoading || customersLoading;

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
                <StatCard title="Active Loans" value={stats.active} icon={HandCoins} />
                <StatCard title="Settled Loans" value={stats.settled} icon={CheckCircle} />
                <StatCard title="Pending Review" value={stats.pending} icon={Hourglass} />
                <StatCard title="Total Customers" value={customers?.length ?? 0} icon={Users} />
            </div>
            <LoanManagementTable />
        </div>
    );
}
