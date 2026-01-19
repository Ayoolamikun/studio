'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export default function FileUploadPage() {

  return (
    <div className="container py-8 md:py-12">
      <Card>
        <CardHeader className="items-center text-center">
           <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-2xl font-bold">My Files</CardTitle>
          <CardDescription>This page is currently under construction as we improve our application process.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Content can be added here later */}
        </CardContent>
      </Card>
    </div>
  );
}
