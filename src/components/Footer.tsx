
import Link from 'next/link';
import Logo from './Logo';

const footerLinks = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/#about' },
  { name: 'Loans', href: '/#loans' },
  { name: 'Invest', href: '/invest' },
  { name: 'Contact', href: '/#contact' },
  { name: 'Login', href: '/login' },
];

const Footer = () => {
  return (
    <footer className="bg-secondary">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground">
              Empowering Nigerians through transparent loan services and fixed-rate investment opportunities.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h3 className="font-headline font-semibold text-primary">Quick Links</h3>
                <ul className="mt-4 space-y-2">
                  {footerLinks.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-primary">Services</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link href="/#loans" className="text-sm text-muted-foreground hover:text-primary">Personal Loans</Link></li>
                  <li><Link href="/#loans" className="text-sm text-muted-foreground hover:text-primary">State Government Loans</Link></li>
                  <li><Link href="/#loans" className="text-sm text-muted-foreground hover:text-primary">SME Loans</Link></li>
                  <li><Link href="/invest" className="text-sm text-muted-foreground hover:text-primary">Investment Plans</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-primary">Legal</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                  <li><Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Corporate Magnate Cooperative Society Ltd. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
