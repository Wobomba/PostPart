import { Metadata } from 'next';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Our Services | Business Development & Logistics Solutions',
  description: 'Comprehensive business development and logistics services to drive your company\'s growth and operational excellence.',
};

export default function ServicesPage() {
  return (
    <>
      <div className="section-padding bg-gradient-to-br from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Our <span className="text-gradient">Services</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Integrated solutions that combine business development expertise with world-class 
              logistics capabilities to drive sustainable growth.
            </p>
          </div>

          {/* Business Development Services */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Business Development Solutions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Business Setup & Establishment</h3>
                <p className="text-gray-600 mb-4">
                  Complete business formation services including legal compliance, operational 
                  infrastructure, and strategic planning for new ventures.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Legal entity formation</li>
                  <li>• Regulatory compliance</li>
                  <li>• Operational infrastructure</li>
                  <li>• Strategic business planning</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Business Revitalization</h3>
                <p className="text-gray-600 mb-4">
                  Transform struggling businesses with comprehensive turnaround strategies 
                  and operational improvements.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Performance analysis</li>
                  <li>• Turnaround strategies</li>
                  <li>• Operational optimization</li>
                  <li>• Financial restructuring</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Digital Transformation</h3>
                <p className="text-gray-600 mb-4">
                  Modernize operations with cutting-edge technology and comprehensive 
                  digital roadmaps.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Technology assessment</li>
                  <li>• Digital strategy development</li>
                  <li>• Implementation planning</li>
                  <li>• Change management</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Operational Support</h3>
                <p className="text-gray-600 mb-4">
                  Comprehensive legal and operational guidance for sustainable business growth.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Legal compliance</li>
                  <li>• Operational efficiency</li>
                  <li>• Risk management</li>
                  <li>• Growth strategies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Logistics Services */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Logistics & Supply Chain Solutions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Freight Forwarding</h3>
                <p className="text-gray-600 mb-4">
                  International shipping and customs clearance services with global reach 
                  and local expertise.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Air freight services</li>
                  <li>• Ocean freight services</li>
                  <li>• Customs clearance</li>
                  <li>• Documentation handling</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Global Logistics</h3>
                <p className="text-gray-600 mb-4">
                  End-to-end supply chain management across all continents with real-time 
                  visibility and control.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Supply chain optimization</li>
                  <li>• Inventory management</li>
                  <li>• Route optimization</li>
                  <li>• Global network</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Supply Chain Security</h3>
                <p className="text-gray-600 mb-4">
                  Protected and monitored logistics with comprehensive security measures 
                  and real-time tracking.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Security protocols</li>
                  <li>• Real-time monitoring</li>
                  <li>• Risk assessment</li>
                  <li>• Compliance management</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Last-Mile Delivery</h3>
                <p className="text-gray-600 mb-4">
                  Efficient final delivery solutions designed for maximum customer 
                  satisfaction and operational efficiency.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Route optimization</li>
                  <li>• Delivery tracking</li>
                  <li>• Customer communication</li>
                  <li>• Performance analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
