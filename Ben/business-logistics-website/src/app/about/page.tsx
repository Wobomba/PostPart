import { Metadata } from 'next';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'About Us | Business Development & Logistics Solutions',
  description: 'Learn about our mission to transform businesses through integrated development and logistics solutions.',
};

export default function AboutPage() {
  return (
    <>
      <div className="section-padding bg-gradient-to-br from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              About <span className="text-gradient">Freight</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pioneering the future of business development and logistics through innovation, 
              expertise, and unwavering commitment to client success.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                To empower businesses with comprehensive solutions that drive growth, 
                operational excellence, and sustainable success in an increasingly complex global marketplace.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                We believe that every business deserves access to world-class development 
                strategies and logistics capabilities, regardless of size or industry.
              </p>
            </div>
            <div className="bg-gray-100 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Core Values</h3>
              <ul className="space-y-3 text-gray-700">
                <li>• Innovation in every solution</li>
                <li>• Integrity in all relationships</li>
                <li>• Excellence in service delivery</li>
                <li>• Global perspective, local expertise</li>
                <li>• Sustainable business practices</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Why Choose Freight?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">15+</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Years Experience</h3>
                <p className="text-gray-600">Deep industry knowledge and proven track record</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">500+</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Businesses Served</h3>
                <p className="text-gray-600">Successfully transformed companies worldwide</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">50+</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Countries</h3>
                <p className="text-gray-600">Global reach and local expertise</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
