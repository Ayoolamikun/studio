
'use client';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import { useCollection, useMemoFirebase, updateDocumentNonBlocking, WithId } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { MoreHorizontal, Hourglass, ShieldCheck, ShieldX, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

type Loan = {
  borrowerId: string;
  amountRequested: number;
  duration?: number;
  interestRate?: number;
  totalRepayment?: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  notes?: string;
  createdAt: string;
};

type Customer = {
  name: string;
  phone: string;
  email: string;
};

type CombinedLoanData = WithId<Loan> & { customer?: WithId<Customer> };

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'approved':
      return { variant: 'default', icon: ShieldCheck, label: 'Approved', className: 'bg-blue-500 hover:bg-blue-600' };
    case 'active':
      return { variant: 'default', icon: CreditCard, label: 'Active', className: 'bg-green-500 hover:bg-green-600' };
    case 'paid':
      return { variant: 'default', icon: ShieldCheck, label: 'Paid', className: "bg-primary" };
    case 'overdue':
      return { variant: 'destructive', icon: ShieldX, label: 'Overdue' };
    case 'rejected':
      return { variant: 'destructive', icon: ShieldX, label: 'Rejected' };
    case 'pending':
    default:
      return { variant: 'secondary', icon: Hourglass, label: 'Pending' };
  }
}


export function LoanManagementTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'Loans'), orderBy('createdAt', 'desc'));
    
    if (statusFilter !== 'all') {
        q = query(q, where('status', '==', statusFilter));
    }
    
    return q;
  }, [firestore, statusFilter]);

  const customersQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'Customers') : null,
    [firestore]
  );
  
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const customersMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  const combinedData = useMemo<CombinedLoanData[] | null>(() => {
    if (!loans) return null;
    return loans.map(loan => ({
      ...loan,
      customer: customersMap.get(loan.borrowerId)
    }));
  }, [loans, customersMap]);
  
  const filteredData = useMemo(() => {
    if (!combinedData) return [];
    
    return combinedData.filter(item => {
      const customer = item.customer;
      const searchTermLower = searchTerm.toLowerCase();
      
      const nameMatch = customer?.name?.toLowerCase().includes(searchTermLower);
      const emailMatch = customer?.email?.toLowerCase().includes(searchTermLower);
      const phoneMatch = customer?.phone?.includes(searchTerm);
      const idMatch = item.borrowerId.toLowerCase().includes(searchTermLower);

      return searchTerm.trim() === '' || nameMatch || emailMatch || phoneMatch || idMatch;
    });
  }, [combinedData, searchTerm]);

  
  const handleStatusChange = (id: string, status: Loan['status']) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'Loans', id);
    updateDocumentNonBlocking(docRef, { status });
  };
  
  const isLoading = loansLoading || customersLoading;

  return (
      <Card>
        <CardHeader>
          <CardTitle>All Loans</CardTitle>
          <CardDescription>Review, approve, and manage all loans in the system.</CardDescription>
          <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
              <Input 
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isLoading} className="w-full md:w-auto">Filter: <span className="capitalize ml-2 font-bold">{statusFilter}</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('approved')}>Approved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>Rejected</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('paid')}>Paid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('overdue')}>Overdue</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="large" />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Applicant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData && filteredData.length > 0 ? (
                    filteredData.map(item => {
                      const statusConfig = getStatusConfig(item.status);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.customer?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{item.customer?.email || item.borrowerId}</div>
                          </TableCell>
                          <TableCell>{formatCurrency(item.amountRequested)}</TableCell>
                          <TableCell>{formatCurrency(item.balance)}</TableCell>
                          <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'PPP') : 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} className={statusConfig.className}>
                              <statusConfig.icon className="mr-2 h-4 w-4" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'active')}>Set to Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'paid')}>Set to Paid</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'overdue')}>Set to Overdue</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500" onClick={() => handleStatusChange(item.id, 'rejected')}>Reject</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">No loans found matching your criteria.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
  );
}
