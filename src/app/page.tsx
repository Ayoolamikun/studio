
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
import AIAgent from '@/components/AIAgent';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />

        <div className="space-y-24 md:space-y-32 my-24 md:my-32">
          <AboutSection />
          <LoanServicesSection />
          <InvestmentPlansSection />
          <MembershipSection />
          <ApplicationSection />
          <TestimonialsSection />
          <ContactSection />
        </div>
        
      </main>
      <AIAgent />
      <FloatingCta />
      <Footer />
    </div>
  );
}
