
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <Card className="mx-auto max-w-4xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl text-primary">
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none md:prose-base">
                <h4>1. Introduction</h4>
                <p>This Privacy Policy explains how we collect, use, store, and protect personal information on the loan management platform. By using the platform, you agree to the practices described here.</p>

                <h4>2. Information We Collect</h4>
                <p>We collect only information required to operate the platform effectively, including:</p>
                <ul>
                    <li>Personal details such as full name, phone number, email address, BVN, and identification details</li>
                    <li>Customer type information:
                        <ul>
                            <li>Bayelsa State Government (BYSG)</li>
                            <li>Private Individual</li>
                        </ul>
                    </li>
                    <li>Guarantor information for all Private Individual customers</li>
                    <li>Loan details including loan amount, repayment schedule, payment status, and outstanding balance</li>
                    <li>Uploaded documents and application data</li>
                </ul>

                <h4>3. How We Use Information</h4>
                <p>Information collected is used to:</p>
                <ul>
                    <li>Process loan applications</li>
                    <li>Approve, disburse, and manage loans</li>
                    <li>Track repayments and loan completion status</li>
                    <li>Generate internal reports and downloadable Excel files</li>
                    <li>Comply with financial and regulatory obligations</li>
                </ul>

                <h4>4. Data Storage and Security</h4>
                <ul>
                    <li>All data is securely stored using industry standard cloud infrastructure</li>
                    <li>Access to sensitive data is restricted to authorized administrators only</li>
                    <li>Only admin users can query completed or historical loan records</li>
                </ul>

                <h4>5. Data Sharing</h4>
                <p>We do not sell or share user data with third parties except where required by law or for payment processing with financial institutions.</p>

                <h4>6. Data Retention</h4>
                <p>Loan and customer records are retained for operational, legal, and audit purposes. Completed loans are archived and accessible only through authorized admin queries.</p>

                <h4>7. User Rights</h4>
                <p>Users may request updates to incorrect information through authorized administrators. Direct user deletion of financial records is not permitted.</p>

                <h4>8. Updates to This Policy</h4>
                <p>This policy may be updated periodically. Continued use of the platform indicates acceptance of any updates.</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
