'use client';

import { motion } from 'framer-motion';
import { 
  Building2, 
  Truck, 
  Globe, 
  BarChart3, 
  Shield, 
  Zap,
  Users,
  Target
} from 'lucide-react';

const Services = () => {
  const businessServices = [
    {
      icon: Building2,
      title: 'Business Setup & Establishment',
      description: 'Complete business formation, legal compliance, and operational infrastructure setup.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: BarChart3,
      title: 'Business Revitalization',
      description: 'Transform struggling businesses with strategic planning and operational improvements.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Zap,
      title: 'Digital Transformation',
      description: 'Modernize operations with cutting-edge technology and digital roadmaps.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Users,
      title: 'Operational Support',
      description: 'Comprehensive legal and operational guidance for business growth.',
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  const logisticsServices = [
    {
      icon: Truck,
      title: 'Freight Forwarding',
      description: 'International shipping and customs clearance services worldwide.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Globe,
      title: 'Global Logistics',
      description: 'End-to-end supply chain management across all continents.',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: Shield,
      title: 'Supply Chain Security',
      description: 'Protected and monitored logistics with real-time tracking.',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: Target,
      title: 'Last-Mile Delivery',
      description: 'Efficient final delivery solutions for customer satisfaction.',
      color: 'from-cyan-500 to-cyan-600'
    }
  ];

  return (
    <section className="section-padding bg-gray-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Our <span className="text-gradient">Services</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive solutions combining business development expertise with world-class logistics capabilities
          </p>
        </motion.div>

        {/* Business Development Services */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Business Development Solutions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {businessServices.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{service.title}</h4>
                <p className="text-gray-600">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Logistics Services */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Logistics & Supply Chain Solutions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {logisticsServices.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{service.title}</h4>
                <p className="text-gray-600">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
