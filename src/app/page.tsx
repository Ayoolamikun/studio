import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import LoanServicesSection from '@/components/LoanServicesSection';
import InvestmentPlansSection from '@/components/InvestmentPlansSection';
import MembershipSection from '@/components/MembershipSection';
import ApplicationSection from '@/components/ApplicationSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import FloatingCta from '@/components/FloatingCta';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />

        <div className="space-y-24 md:space-y-32 my-24 md:my-32">
          <AboutSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700" />
          <LoanServicesSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700 delay-100" />
          <InvestmentPlansSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700 delay-200" />
          <MembershipSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700 delay-300" />
          <ApplicationSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700 delay-400" />
          <TestimonialsSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700 delay-500" />
          <ContactSection className="animate-in fade-in-0 slide-in-from-bottom-16 duration-700 delay-600" />
        </div>
        
        <FloatingCta />
      </main>
      <Footer />
    </div>
  );
}
