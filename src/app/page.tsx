
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import LoanServicesSection from '@/components/LoanServicesSection';
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

        <div className="space-y-16 md:space-y-24 my-16 md:my-24">
          <AboutSection />
          <LoanServicesSection />
          <ApplicationSection />
          <TestimonialsSection />
          <ContactSection />
        </div>
        
      </main>
      <FloatingCta />
      <Footer />
    </div>
  );
}
