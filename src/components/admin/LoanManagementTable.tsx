
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
import { useCollection, useMemoFirebase, useAuth, WithId } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { MoreHorizontal, Hourglass, ShieldCheck, ShieldX, CreditCard, CheckCircle, Truck } from 'lucide-react';
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
import { toast } from 'sonner';
import { updateLoanStatusAction } from '@/app/actions';

type Loan = {
  borrowerId: string;
  loanAmount: number;
  duration?: number;
  interestRate?: number;
  totalRepayment?: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'Processing' | 'Approved' | 'Disbursed' | 'Active' | 'Completed' | 'Overdue' | 'Rejected';
  createdAt: string;
};

type Customer = {
  name: string;
  phone: string;
  email: string;
};

type CombinedLoanData = WithId<Loan> & { customer?: WithId<Customer> };

const getStatusConfig = (status: Loan['status']) => {
  switch (status) {
    case 'Processing':
      return { variant: 'secondary', icon: Hourglass, label: 'Processing', className: 'bg-yellow-500/20 text-yellow-600' };
    case 'Approved':
      return { variant: 'default', icon: CheckCircle, label: 'Approved', className: 'bg-blue-500/20 text-blue-600' };
    case 'Disbursed': // This status is transient, UI now shows Active
      return { variant: 'default', icon: Truck, label: 'Active', className: 'bg-indigo-500/20 text-indigo-600' };
    case 'Active':
      return { variant: 'default', icon: CreditCard, label: 'Active', className: 'bg-green-500/20 text-green-600' };
    case 'Completed':
      return { variant: 'default', icon: ShieldCheck, label: 'Completed', className: "bg-primary/20 text-primary" };
    case 'Overdue':
      return { variant: 'destructive', icon: ShieldX, label: 'Overdue' };
    case 'Rejected':
      return { variant: 'destructive', icon: ShieldX, label: 'Rejected' };
    default:
      return { variant: 'secondary', icon: Hourglass, label: 'Unknown' };
  }
}


export function LoanManagementTable() {
  const firestore = useFirestore();
  const auth = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'Loans'), orderBy('createdAt', 'desc'));
    
    if (statusFilter !== 'all' && statusFilter !== 'completed') {
        q = query(q, where('status', '==', statusFilter));
    }
     if (statusFilter === 'completed') {
        q = query(q, where('status', '==', 'Completed'));
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
    
    const activeOrPendingLoans = combinedData.filter(item => item.status !== 'Completed');
    const completedLoans = combinedData.filter(item => item.status === 'Completed');

    const sourceData = statusFilter === 'completed' ? completedLoans : activeOrPendingLoans;

    return sourceData.filter(item => {
      const customer = item.customer;
      const searchTermLower = searchTerm.toLowerCase();
      
      const nameMatch = customer?.name?.toLowerCase().includes(searchTermLower);
      const emailMatch = customer?.email?.toLowerCase().includes(searchTermLower);
      const phoneMatch = customer?.phone?.includes(searchTerm);
      const idMatch = item.borrowerId.toLowerCase().includes(searchTermLower);

      return searchTerm.trim() === '' || nameMatch || emailMatch || phoneMatch || idMatch;
    });
  }, [combinedData, searchTerm, statusFilter]);

  
  const handleStatusChange = async (id: string, status: Loan['status']) => {
    if (!auth?.currentUser) {
      toast.error('You must be logged in to perform this action.');
      return;
    }
    setProcessingId(id);

    try {
        const idToken = await auth.currentUser.getIdToken();
        const result = await updateLoanStatusAction(id, status, idToken);

        if (result.success) {
            toast.success('Success', {
                description: result.message,
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast.error('Update Failed', {
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setProcessingId(null);
    }
  };
  
  const isLoading = loansLoading || customersLoading;
  
  const statusFilters: {value: string, label: string}[] = [
    { value: 'all', label: 'All Active/Pending' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Active', label: 'Active' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
  ];

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
                  <Button variant="outline" disabled={isLoading} className="w-full md:w-auto">Filter: <span className="capitalize ml-2 font-bold">{statusFilters.find(f=>f.value === statusFilter)?.label}</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusFilters.map(filter => (
                    <DropdownMenuItem key={filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</DropdownMenuItem>
                  ))}
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
                          <TableCell>{formatCurrency(item.loanAmount)}</TableCell>
                          <TableCell>{formatCurrency(item.outstandingBalance)}</TableCell>
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
                                <Button variant="ghost" size="icon" disabled={processingId === item.id}>
                                    {processingId === item.id ? <Spinner size="small"/> : <MoreHorizontal />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Disbursed')}>Mark as Disbursed</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Active')}>Set to Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Overdue')}>Set to Overdue</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'Completed')}>Mark as Completed</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={() => handleStatusChange(item.id, 'Rejected')}>Reject Loan</DropdownMenuItem>
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



