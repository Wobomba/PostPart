'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20" />
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Global Business Development &{' '}
            <span className="text-orange-400">Logistics Partner</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
            Harnessing advanced technology to provide end-to-end solutions, from business 
            revitalization to international freight forwarding. Experience real-time visibility 
            and unparalleled reliability.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/contact" className="btn-secondary">
              Get a Free Quote
            </Link>
            <Link href="/services" className="btn-outline">
              View Our Services
            </Link>
          </div>
        </motion.div>

        {/* Trust Element */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute bottom-8 right-8 text-center"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold text-orange-400">1K+</div>
            <div className="text-sm text-gray-200">clients trusted</div>
            <div className="flex -space-x-2 mt-2 justify-center">
              <div className="w-8 h-8 bg-orange-400 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-blue-400 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
