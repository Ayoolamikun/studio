
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminGuidePage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to the Admin Portal</CardTitle>
          <CardDescription>
            This guide provides everything you need to know to manage the Corporate Magnate platform.
          </CardDescription>
        </CardHeader>
      </Card>

      <GuideSection
        title="0. Accessing the Admin Dashboard"
        description="How to log in and access the administrative features."
      >
        <p>The admin dashboard is restricted to a specific user account identified by a unique Firebase UID, which is configured in the application's code and security rules.</p>
        <p className="mt-4">To access the admin features, you must log in with that designated account:</p>
        <ul className="list-disc list-inside space-y-2 mt-4">
          <li>Navigate to the <Link href="/login" className="font-semibold text-primary underline">/login</Link> page.</li>
          <li>Sign in using the email and password for the account you wish to be the administrator.</li>
          <li>Upon successful login with the correct account, you will be automatically redirected to the admin dashboard.</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">If you need to change the admin user, you must provide the new user's Firebase UID to have it updated in the codebase.</p>
      </GuideSection>

      <GuideSection
        title="1. The Loan Lifecycle"
        description="Understanding and managing the journey of a loan from application to completion."
      >
        <p>The system follows a strict loan status lifecycle to ensure clarity and control. The statuses are:</p>
        <ol className="list-decimal list-inside space-y-2 mt-4">
            <li><Badge variant="secondary">Processing</Badge> - A new application submitted by a borrower.</li>
            <li><Badge className="bg-blue-500/20 text-blue-600">Approved</Badge> - You have approved the application, but funds are not yet disbursed.</li>
            <li><Badge className="bg-indigo-500/20 text-indigo-600">Active</Badge> - The loan has been disbursed and is now in the repayment phase.</li>
            <li><Badge className="bg-primary/20 text-primary">Completed</Badge> - The loan has been fully paid off.</li>
            <li><Badge variant="destructive">Rejected</Badge> - The application was denied.</li>
            <li><Badge variant="destructive">Overdue</Badge> - A repayment is late (status must be set manually for now).</li>
        </ol>
      </GuideSection>

      <GuideSection
        title="2. Approving New Loan Applications"
        description="How to review and approve new submissions."
      >
        <ol className="list-decimal list-inside space-y-4">
          <li>Navigate to the <Badge variant="outline">Approvals</Badge> page from the sidebar.</li>
          <li>This table lists all applications currently in the <Badge variant="secondary">Processing</Badge> status.</li>
          <li>Review the applicant's name, email, loan amount, and customer type.</li>
          <li>
            Click the <Badge variant="outline">Approve</Badge> button to accept the application.
            <ul className="list-disc list-inside ml-6 mt-2 text-sm text-muted-foreground">
                <li>This automatically creates a new record in the <Badge variant="outline">Customers</Badge> table if the user is new.</li>
                <li>It also creates a new record in the <Badge variant="outline">Loans</Badge> table with the status set to <Badge className="bg-blue-500/20 text-blue-600">Approved</Badge>.</li>
            </ul>
          </li>
           <li>Click the <Badge variant="destructive">Reject</Badge> button to deny the application. The application's status will be set to <Badge variant="destructive">Rejected</Badge>.</li>
        </ol>
      </GuideSection>

      <GuideSection
        title="3. Managing Active Loans & Disbursal"
        description="Marking loans as disbursed and managing their status."
      >
        <ol className="list-decimal list-inside space-y-4">
            <li>Navigate to the <Badge variant="outline">Loans</Badge> page from the sidebar.</li>
            <li>Find the loan you have just disbursed funds for. It will have an <Badge className="bg-blue-500/20 text-blue-600">Approved</Badge> status.</li>
            <li>Click the three-dot menu (•••) on the right side of the loan's row to open the actions menu.</li>
            <li>
                Select <Badge>Mark as Disbursed</Badge>.
                <ul className="list-disc list-inside ml-6 mt-2 text-sm text-muted-foreground">
                    <li>This is a critical step. It signifies that the money has been sent to the borrower.</li>
                    <li>The loan's status will automatically change to <Badge className="bg-green-500/20 text-green-600">Active</Badge>.</li>
                </ul>
            </li>
            <li>You can use this same actions menu to manually change a loan's status to <Badge variant="destructive">Overdue</Badge> or <Badge className="bg-primary/20 text-primary">Completed</Badge> if needed.</li>
        </ol>
      </GuideSection>

      <GuideSection
        title="4. Updating Repayments via Excel Upload"
        description="The primary method for updating all borrower repayment records at once."
      >
        <ol className="list-decimal list-inside space-y-4">
            <li>Navigate to the <Badge variant="outline">Excel Import</Badge> page.</li>
            <li>Prepare your monthly spreadsheet. It must contain columns for borrower identity (like BVN, or Name and Phone) and their latest repayment data (like 'Amount Paid' and 'Outstanding Balance').</li>
            <li>Click the upload area to select your Excel file, or drag and drop it.</li>
            <li>
                Click <Badge>Upload and Process File</Badge>.
                <ul className="list-disc list-inside ml-6 mt-2 text-sm text-muted-foreground">
                    <li>The system will read the file and match rows to existing borrowers in the database.</li>
                    <li>It will update the <kbd>amountPaid</kbd> and <kbd>outstandingBalance</kbd> for each matched active loan.</li>
                    <li>If a borrower's outstanding balance becomes 0 or less, their loan status will automatically be set to <Badge className="bg-primary/20 text-primary">Completed</Badge>.</li>
                </ul>
            </li>
            <li>A success or failure message will appear to confirm the result. The processing happens in the background and may take a minute.</li>
        </ol>
      </GuideSection>

      <GuideSection
        title="5. Generating Monthly Reports"
        description="How to download a report of loan data."
      >
        <ol className="list-decimal list-inside space-y-4">
            <li>Navigate to the <Badge variant="outline">Reports</Badge> page.</li>
            <li>Use the input field to select the month and year you want to generate a report for.</li>
            <li>
                Click <Badge>Generate Excel Report</Badge>.
                <ul className="list-disc list-inside ml-6 mt-2 text-sm text-muted-foreground">
                    <li>The system will gather all loan data created within that month.</li>
                    <li>An Excel file (<kbd>.xlsx</kbd>) containing the data will be automatically downloaded to your computer.</li>
                    <li>This file is fully editable and can be used for your records.</li>
                </ul>
            </li>
        </ol>
      </GuideSection>
    </div>
  );
}

function GuideSection({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
                {children}
            </CardContent>
        </Card>
    )
}
