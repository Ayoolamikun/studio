
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <Card className="mx-auto max-w-4xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl text-primary">
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none md:prose-base">
                <h4>1. Acceptance of Terms</h4>
                <p>By accessing or using this platform, you agree to be bound by these Terms of Service.</p>

                <h4>2. Platform Purpose</h4>
                <p>The platform exists to manage loan applications, approvals, disbursements, repayments, and reporting for approved customers.</p>

                <h4>3. User Categories</h4>
                <p>The platform supports only the following customer types:</p>
                <ul>
                    <li>Bayelsa State Government (BYSG)</li>
                    <li>Private Individuals</li>
                    <li>A guarantor is mandatory for all Private Individual loans</li>
                    <li>Admins must be able to view and verify guarantor information</li>
                </ul>

                <h4>4. Loan Lifecycle</h4>
                <p>All loans follow a structured lifecycle:</p>
                <ul>
                    <li>Processing</li>
                    <li>Approved</li>
                    <li>Active</li>
                    <li>Completed</li>
                    <li>Rejected</li>
                    <li>Overdue</li>
                </ul>
                <p>Admins are responsible for accurately updating loan statuses.</p>

                <h4>5. Admin Responsibilities</h4>
                <p>Admins have exclusive control over:</p>
                <ul>
                    <li>Approving and rejecting applications</li>
                    <li>Marking loans as disbursed</li>
                    <li>Updating loan statuses</li>
                    <li>Uploading repayment schedules via Excel</li>
                    <li>Generating monthly reports</li>
                    <li>Querying completed and historical loans</li>
                </ul>

                <h4>6. Payments and Repayments</h4>
                <p>Repayment schedules are created manually and uploaded to the platform. The platform reflects repayment status but does not initiate bank transfers.</p>

                <h4>7. Data Accuracy</h4>
                <p>Users and administrators are responsible for ensuring that submitted information is accurate and complete.</p>

                <h4>8. Limitation of Liability</h4>
                <p>The platform is provided as a management tool. Financial decisions, approvals, and disbursements remain the responsibility of the operating organization.</p>

                <h4>9. Termination</h4>
                <p>Access may be restricted or terminated if the platform is misused or used outside its intended purpose.</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
