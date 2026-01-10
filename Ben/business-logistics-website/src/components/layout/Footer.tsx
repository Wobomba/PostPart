import Link from 'next/link';
import { Star, Mail, Phone, MapPin, Linkedin, Twitter, Facebook } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Freight</span>
            </Link>
            <p className="text-gray-300 mb-4 max-w-md">
              Your trusted partner in business development and logistics solutions. 
              We help businesses establish, grow, and operate efficiently in the global marketplace.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-300 hover:text-orange-400 transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-gray-300 hover:text-orange-400 transition-colors">About</Link></li>
              <li><Link href="/services" className="text-gray-300 hover:text-orange-400 transition-colors">Services</Link></li>
              <li><Link href="/contact" className="text-gray-300 hover:text-orange-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-gray-300">123 Business Ave, Suite 100<br />New York, NY 10001</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-gray-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-gray-300">info@freight.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © {currentYear} Freight. All rights reserved. | Business Development & Logistics Solutions
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
