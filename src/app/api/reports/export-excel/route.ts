
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

// Helper to safely format dates from Firestore
const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '';
    try {
        return format(timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss');
    } catch (e) {
        return '';
    }
};

export async function GET(request: NextRequest) {
    // A more robust admin check should be here, e.g., verifying a token.
    // For now, we trust the page-level security of the admin dashboard.

    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // YYYY-MM

        if (!month) {
            return new NextResponse("Month parameter is required.", { status: 400 });
        }

        const startDate = new Date(`${month}-01T00:00:00Z`);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);

        // Fetch all data in parallel
        const [customersSnap, loansSnap, investmentsSnap] = await Promise.all([
            db.collection("Customers").get(),
            db.collection("Loans").where('createdAt', '>=', startDate).where('createdAt', '<=', endDate).get(),
            db.collection("Investments").where('createdAt', '>=', startDate).where('createdAt', '<=', endDate).get()
        ]);

        const customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const loans = loansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const investments = investmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const customersMap = new Map(customers.map(c => [c.id, c]));

        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Corporate Magnate Platform';
        workbook.created = new Date();
        
        // --- Customers Sheet ---
        const customersSheet = workbook.addWorksheet('Customers');
        customersSheet.columns = [
            { header: 'Customer ID', key: 'id', width: 30 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'BVN', key: 'bvn', width: 20 },
            { header: 'Date Joined', key: 'createdAt', width: 20 },
        ];
        customers.forEach(customer => {
            customersSheet.addRow({
                ...customer,
                createdAt: formatDate(customer.createdAt),
            });
        });

        // --- Loans Sheet ---
        const loansSheet = workbook.addWorksheet('Loans');
        loansSheet.columns = [
            { header: 'Loan ID', key: 'id', width: 30 },
            { header: 'Borrower Name', key: 'borrowerName', width: 30 },
            { header: 'Borrower Email', key: 'borrowerEmail', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Loan Amount', key: 'loanAmount', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Amount Paid', key: 'amountPaid', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Outstanding Balance', key: 'outstandingBalance', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Total Repayment', key: 'totalRepayment', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Duration (Months)', key: 'duration', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 20 },
            { header: 'Disbursed At', key: 'disbursedAt', width: 20 },
        ];
        loans.forEach(loan => {
            const customer = customersMap.get(loan.borrowerId);
            loansSheet.addRow({
                ...loan,
                borrowerName: customer?.name || 'N/A',
                borrowerEmail: customer?.email || 'N/A',
                createdAt: formatDate(loan.createdAt),
                disbursedAt: formatDate(loan.disbursedAt),
            });
        });

        // --- Investments Sheet ---
        const investmentsSheet = workbook.addWorksheet('Investments');
        investmentsSheet.columns = [
            { header: 'Investment ID', key: 'id', width: 30 },
            { header: 'Investor Name', key: 'investorName', width: 30 },
            { header: 'Investor Email', key: 'investorEmail', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Plan', key: 'plan', width: 15 },
            { header: 'Amount', key: 'amount', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Expected Return', key: 'expectedReturn', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Start Date', key: 'startDate', width: 20 },
            { header: 'Maturity Date', key: 'maturityDate', width: 20 },
            { header: 'Created At', key: 'createdAt', width: 20 },
        ];
        investments.forEach(inv => {
            const customer = customersMap.get(inv.userId);
            investmentsSheet.addRow({
                ...inv,
                investorName: customer?.name || 'N/A',
                investorEmail: customer?.email || 'N/A',
                startDate: formatDate(inv.startDate),
                maturityDate: formatDate(inv.maturityDate),
                createdAt: formatDate(inv.createdAt),
            });
        });

        // Style headers
        [customersSheet, loansSheet, investmentsSheet].forEach(sheet => {
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FF003366'}
            };
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        });

        // Write to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Return the file
        return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Corporate_Magnate_Report_${month}.xlsx"`,
            },
        });

    } catch (error: any) {
        console.error("Failed to generate Excel report:", error);
        return new NextResponse("Failed to generate Excel report: " + error.message, { status: 500 });
    }
}
