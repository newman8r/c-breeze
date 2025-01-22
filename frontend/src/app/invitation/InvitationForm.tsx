'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

// Decorative shape component
const BauhausDecoration = ({ className = '' }: { className?: string }) => (
  <div className={`absolute ${className}`}>
    {/* Circle */}
    <div className="absolute w-24 h-24 rounded-full bg-[#FF7676]/10 -top-12 -left-12" />
    {/* Triangle */}
    <div className="absolute w-0 h-0 border-l-[50px] border-r-[50px] border-b-[86.6px] 
                    border-l-transparent border-r-transparent border-b-[#4A90E2]/10 
                    top-20 -right-12 rotate-45" />
    {/* Rectangle */}
    <div className="absolute w-32 h-16 bg-[#50C878]/10 -bottom-8 left-12 rotate-12" />
  </div>
);

type InvitationStatus = 'valid' | 'pending' | 'expired' | 'invalid';

export default function InvitationForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<InvitationStatus>('valid');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '', // Will be pre-filled from the invitation
    password: '',
    confirmPassword: '',
  });

  // Placeholder organization data
  const orgName = "Ocean Breeze Corp";

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      return;
    }

    // Simulate token validation
    if (token === 'expired') {
      setStatus('expired');
    } else if (token === 'pending') {
      setStatus('pending');
    } else if (token === 'invalid') {
      setStatus('invalid');
    } else {
      setStatus('valid');
      // Simulate getting email from token
      setFormData(prev => ({ ...prev, email: 'user@example.com' }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement invitation acceptance logic using Supabase
    console.log('Form submitted:', formData);
  };

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
        <div className="max-w-md mx-auto pt-12">
          <motion.div 
            className="ocean-card relative overflow-hidden p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-4 text-center text-[#2C5282]">
              🌊 Invitation Expired
            </h1>
            <p className="text-center text-[#4A5568]">
              This invitation has expired. Please request a new invitation from your organization.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
        <div className="max-w-md mx-auto pt-12">
          <motion.div 
            className="ocean-card relative overflow-hidden p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-4 text-center text-[#2C5282]">
              🌊 Invalid Invitation
            </h1>
            <p className="text-center text-[#4A5568]">
              This invitation link appears to be invalid. Please check your email for the correct link or request a new invitation.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3] p-6">
      <div className="max-w-md mx-auto pt-12">
        <motion.div 
          className="ocean-card relative overflow-hidden p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative Bauhaus elements */}
          <BauhausDecoration />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2 text-center text-[#2C5282]">
              🌊 Welcome to {orgName}!
            </h1>
            <p className="text-center text-[#4A5568] mb-8">
              You're just a few waves away from joining the team 🏄‍♂️
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label 
                    htmlFor="firstName" 
                    className="block text-sm font-medium text-[#2C5282] mb-2"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                             focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                             bg-white/50 backdrop-blur-sm"
                    required
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label 
                    htmlFor="lastName" 
                    className="block text-sm font-medium text-[#2C5282] mb-2"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                             focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                             bg-white/50 backdrop-blur-sm"
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           bg-gray-50/50 backdrop-blur-sm cursor-not-allowed"
                />
                <p className="text-sm text-[#4A5568] mt-1">
                  Email must match the invitation
                </p>
              </div>

              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>

              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-medium text-[#2C5282] mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#4A90E2] to-[#5C6BC0] 
                         hover:from-[#5C6BC0] hover:to-[#4A90E2]
                         text-white font-medium py-3 px-4 rounded-lg
                         transform transition-all duration-200 hover:scale-[1.02]
                         focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40"
              >
                Join the Team 🎉
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 