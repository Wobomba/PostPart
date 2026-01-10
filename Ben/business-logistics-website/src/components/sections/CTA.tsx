'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Phone, Mail } from 'lucide-react';

const CTA = () => {
  return (
    <section className="section-padding bg-gradient-to-r from-gray-900 to-gray-800 text-white">
      <div className="container-custom text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Let's discuss how our integrated business development and logistics solutions 
            can drive your company's growth and operational excellence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link 
              href="/contact" 
              className="btn-primary text-lg px-8 py-4 flex items-center space-x-2"
            >
              <span>Get Started Today</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link 
              href="/services" 
              className="btn-outline text-lg px-8 py-4"
            >
              Explore Services
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-gray-300">
            <div className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-orange-400" />
              <span>+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-orange-400" />
              <span>info@freight.com</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
