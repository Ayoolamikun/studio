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
import { useCollection, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { format } from 'date-fns';
import { PlusCircle } from 'lucide-react';

type Customer = {
  name: string;
  phone: string;
  email: string;
  bvn: string;
  createdAt: string;
};

export function CustomersTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const customersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'Customers'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const filteredData = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      const matchesSearch = searchTerm.trim() === '' ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [customers, searchTerm]);
  
  const isLoading = customersLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Customers</CardTitle>
                <CardDescription>View and manage all customer records in the system.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add New Borrower
            </Button>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
            <Input 
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              disabled={isLoading}
            />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>BVN</TableHead>
                <TableHead>Date Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData && filteredData.length > 0 ? (
                filteredData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div>{item.email}</div>
                        <div className="text-muted-foreground text-sm">{item.phone}</div>
                      </TableCell>
                      <TableCell>{item.bvn || 'N/A'}</TableCell>
                      <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'PPP') : 'N/A'}</TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No customers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
