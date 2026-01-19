
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addCustomer } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useEffect } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Customer'}
    </Button>
  );
}

type AddCustomerFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddCustomerForm({ isOpen, onOpenChange }: AddCustomerFormProps) {

  const handleAction = async (prevState: any, formData: FormData) => {
    const result = await addCustomer(formData);
    if (result.success) {
      toast.success('Success!', {
        description: result.message,
      });
      onOpenChange(false); // Close dialog on success
    } else {
      toast.error('Error', {
        description: result.message,
      });
    }
    return result;
  };

  const [state, formAction] = useActionState(handleAction, null);

  // Reset form state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
        // Reset logic if needed, though useActionState handles most of it.
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the details for the new borrower. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" name="email" type="email" className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input id="phone" name="phone" className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bvn" className="text-right">
                BVN
              </Label>
              <Input id="bvn" name="bvn" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
