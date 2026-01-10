import Hero from '@/components/sections/Hero';
import Services from '@/components/sections/Services';
import About from '@/components/sections/About';
import CTA from '@/components/sections/CTA';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <About />
      <CTA />
      <Footer />
    </>
  );
}
