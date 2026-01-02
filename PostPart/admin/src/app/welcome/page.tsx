'use client';

import { useRouter } from 'next/navigation';
import { ArrowForward } from '@mui/icons-material';

export default function WelcomePage() {
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-8">
        <div className="flex items-center gap-4">
          <img
            src="/postpart-logo.png"
            alt="PostPart"
            width={40}
            height={40}
            className="object-contain"
          />
          <span className="text-2xl font-bold text-gray-900">L&C PostPart</span>
        </div>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-8 py-3 rounded-lg text-white font-medium transition-colors"
          style={{ backgroundColor: '#E91E63' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C2185B'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
        >
          Sign In
          <ArrowForward sx={{ fontSize: 20 }} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-12 py-20">
        {/* Main Title */}
        <h1
          className="text-5xl md:text-6xl font-bold mb-6 text-center"
          style={{ color: '#E91E63' }}
        >
          Corporate Childcare Management
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-gray-600 mb-20 text-center max-w-2xl">
          Seamless daycare centre access for your organisation&apos;s families.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20 max-w-6xl w-full">
          {/* Card 1: Organisation Onboarding */}
          <div className="bg-gray-50 rounded-xl p-10 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-6 flex justify-center">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: '#E91E63' }}
              >
                <path
                  d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              Organisation Onboarding
            </h3>
            <p className="text-gray-600 leading-relaxed text-center">
              Onboard corporate clients and manage their employee access
            </p>
          </div>

          {/* Card 2: QR Code Access */}
          <div className="bg-gray-50 rounded-xl p-10 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-6 flex justify-center">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: '#E91E63' }}
              >
                <path
                  d="M3 3H11V11H3V3ZM5 5V9H9V5H5ZM13 3H21V11H13V3ZM15 5V9H19V5H15ZM3 13H11V21H3V13ZM5 15V19H9V15H5ZM18 13H16V15H18V17H16V19H18V21H16V19H14V21H12V19H14V17H12V15H14V13H12V15H14V17H16V15H18V13ZM21 13V15H19V17H21V19H19V21H21V19H23V17H21V15H23V13H21Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              QR Code Access
            </h3>
            <p className="text-gray-600 leading-relaxed text-center">
              Quick and secure check-ins with QR code scanning
            </p>
          </div>

          {/* Card 3: Real-time Tracking */}
          <div className="bg-gray-50 rounded-xl p-10 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-6 flex justify-center">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: '#E91E63' }}
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              Real-time Tracking
            </h3>
            <p className="text-gray-600 leading-relaxed text-center">
              Monitor check-ins and manage access across all centres
            </p>
          </div>
        </div>

        {/* Bottom Sign In Button */}
        <button
          onClick={handleSignIn}
          className="flex items-center gap-3 px-10 py-4 rounded-lg text-white font-medium text-lg transition-colors"
          style={{ backgroundColor: '#E91E63' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C2185B'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E91E63'}
        >
          Sign In
          <ArrowForward sx={{ fontSize: 24 }} />
        </button>
      </main>
    </div>
  );
}
