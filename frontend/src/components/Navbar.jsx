import React, { useState, useEffect } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserButton, SignInButton, SignUpButton } from "@clerk/clerk-react";
import Logo from './Logo.jsx';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  // ✅ Smooth scroll detection (no lag/jitter)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    if (location.pathname !== '/') {
      navigate('/#' + sectionId);
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handleDashboardClick = (e) => {
    if (!isSignedIn) {
      e.preventDefault();
      navigate('/sign-in', { state: { redirectUrl: '/dashboard' } });
    }
  };

  const handleFeaturesClick = (e) => {
    e.preventDefault();
    setIsOpen(false);

    if (location.pathname === '/') {
      const featuresSection = document.getElementById('features');
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/?scrollTo=features');
    }
  };

  return (
    <nav
      className={`fixed left-1/2 -translate-x-1/2 z-50 rounded-full border border-white/10
      transition-all duration-300 ease-out
      ${isScrolled
        ? "top-4 w-[85%] max-w-5xl py-2 bg-white/5 backdrop-blur-xl shadow-lg scale-[0.98]"
        : "top-6 w-[92%] max-w-6xl py-3 bg-white/10 backdrop-blur-md shadow-md scale-100"
      }`}
    >
      {/* ✨ Glass glow layer */}
      <div className="absolute inset-0 rounded-full bg-white/5 blur-xl opacity-50 pointer-events-none"></div>

      <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Logo />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6 whitespace-nowrap">
            <button
              onClick={handleFeaturesClick}
              className="text-white/90 hover:text-[#E36FFF] transition duration-200 text-sm"
            >
              Features
            </button>

            <Link
              to="/pricing"
              className="text-white/90 hover:text-[#E36FFF] transition duration-200 text-sm"
            >
              Pricing
            </Link>

            <Link
              to="/validator"
              className="text-white/90 hover:text-[#E36FFF] transition duration-200 text-sm"
            >
              Become a Validator
            </Link>

            <Link
              to="/dashboard"
              onClick={handleDashboardClick}
              className="text-white/90 hover:text-[#E36FFF] transition duration-200 text-sm"
            >
              Dashboard
            </Link>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {isSignedIn ? (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8"
                  }
                }}
              />
            ) : (
              <div className="flex items-center space-x-3">
                <SignInButton mode="modal">
                  <button className="text-white/90 hover:text-white transition duration-200 text-sm">
                    Sign In
                  </button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button className="bg-[#3868F9] text-white px-5 py-1.5 rounded-full hover:bg-[#897IFF] transition duration-200 hover:shadow-lg text-sm">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white/90"
            >
              {isOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 bg-black/80 backdrop-blur-xl rounded-xl border border-white/[0.08] p-4 absolute top-full left-0 right-0 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex flex-col space-y-4">
              
              <button
                onClick={(e) => {
                  handleFeaturesClick(e);
                  setIsOpen(false);
                }}
                className="text-white/90 hover:text-[#E36FFF] text-sm text-left"
              >
                Features
              </button>

              <Link
                to="/pricing"
                onClick={() => setIsOpen(false)}
                className="text-white/90 hover:text-[#E36FFF] text-sm"
              >
                Pricing
              </Link>

              <Link
                to="/validator"
                onClick={() => setIsOpen(false)}
                className="text-white/90 hover:text-[#E36FFF] text-sm"
              >
                Become a Validator
              </Link>

              <Link
                to="/dashboard"
                onClick={(e) => {
                  setIsOpen(false);
                  handleDashboardClick(e);
                }}
                className="text-white/90 hover:text-[#E36FFF] text-sm"
              >
                Dashboard
              </Link>

              <div className="pt-2 border-t border-white/10 flex flex-col space-y-2">
                {isSignedIn ? (
                  <div className="flex items-center">
                    <UserButton afterSignOutUrl="/" />
                    <span className="ml-2 text-white/90 text-sm">
                      Your Account
                    </span>
                  </div>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <button className="text-white/90 bg-black/30 px-4 py-1.5 rounded-full text-sm w-full">
                        Sign In
                      </button>
                    </SignInButton>

                    <SignUpButton mode="modal">
                      <button className="bg-[#3868F9] text-white px-5 py-1.5 rounded-full text-sm w-full">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
