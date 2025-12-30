import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>
          Detailed analytics and reports are coming soon.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <BarChart className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground">This section is under construction.</p>
      </CardContent>
    </Card>
  );
}
