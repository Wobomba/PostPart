'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Award, Users, Globe } from 'lucide-react';

const About = () => {
  const stats = [
    { icon: Users, number: '500+', label: 'Businesses Transformed' },
    { icon: Globe, number: '50+', label: 'Countries Served' },
    { icon: Award, number: '15+', label: 'Years Experience' },
    { icon: CheckCircle, number: '98%', label: 'Client Satisfaction' },
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Your Trusted Partner in{' '}
              <span className="text-gradient">Business Growth</span>
            </h2>
            
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              We combine deep business development expertise with cutting-edge logistics solutions 
              to help companies establish, grow, and operate efficiently in today's global marketplace.
            </p>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              From startup formation to enterprise transformation, our integrated approach ensures 
              your business has the foundation, strategy, and operational capabilities to succeed.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Comprehensive business setup and legal compliance</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Digital transformation and technology roadmaps</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Global logistics and supply chain optimization</span>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 bg-gray-50 rounded-xl"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
