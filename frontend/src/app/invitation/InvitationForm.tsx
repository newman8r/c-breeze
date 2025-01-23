'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';

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

interface Invitation {
  id: string;
  organization_id: string;
  invitee_email: string;
  organization_name?: string;
  is_accepted: boolean;
  is_invalidated: boolean;
  expires_at: string;
}

export default function InvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient<Database>();
  
  const [status, setStatus] = useState<InvitationStatus>('pending');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('invalid');
      return;
    }

    const fetchInvitation = async () => {
      try {
        // Create a public client without auth
        const publicClient = createClientComponentClient<Database>({
          options: {
            global: {
              headers: {} // Clear any auth headers
            }
          }
        });

        const { data: invitation, error } = await publicClient
          .from('invitations')
          .select(`
            *,
            organizations (
              name
            )
          `)
          .eq('id', token)
          .single();

        if (error || !invitation) {
          console.error('Error fetching invitation:', error);
          setStatus('invalid');
          return;
        }

        if (invitation.is_accepted || invitation.is_invalidated) {
          setStatus('invalid');
          return;
        }

        if (new Date(invitation.expires_at) < new Date()) {
          setStatus('expired');
          return;
        }

        setInvitation(invitation);
        setFormData(prev => ({ ...prev, email: invitation.invitee_email }));
        setStatus('valid');
      } catch (err) {
        console.error('Error in fetchInvitation:', err);
        setStatus('invalid');
      }
    };

    fetchInvitation();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Accept the invitation
      const { error: acceptError } = await supabase.functions.invoke('accept-invitation', {
        body: { invitationId: invitation?.id }
      });

      if (acceptError) throw acceptError;

      // Log invitation acceptance
      const { error: acceptAuditError } = await supabase.functions.invoke('audit-logger', {
        body: {
          organization_id: invitation?.organization_id,
          actor_id: authData.user?.id,
          actor_type: 'employee',
          action_type: 'update',
          resource_type: 'invitation',
          resource_id: invitation?.id,
          action_description: 'Accepted employee invitation',
          action_meta: {
            invitee_email: formData.email,
            invitee_name: `${formData.firstName} ${formData.lastName}`
          },
          severity: 'info',
          status: 'success'
        }
      });

      if (acceptAuditError) {
        console.error('Failed to log invitation acceptance:', acceptAuditError);
        // Don't throw, continue with flow
      }

      // Wait for a short time to ensure the employee record is created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the employee record exists
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', authData.user?.id)
        .single();

      if (employeeError) {
        console.error('Error verifying employee record:', employeeError);
        // Try again after a longer delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { error: retryError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', authData.user?.id)
          .single();
        
        if (retryError) throw new Error('Failed to verify employee setup');
      }

      // Log new employee account creation
      const { error: employeeAuditError } = await supabase.functions.invoke('audit-logger', {
        body: {
          organization_id: invitation?.organization_id,
          actor_id: authData.user?.id,
          actor_type: 'employee',
          action_type: 'create',
          resource_type: 'employee',
          resource_id: employee?.id,
          action_description: 'New employee account created via invitation',
          action_meta: {
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            invitation_id: invitation?.id
          },
          severity: 'info',
          status: 'success'
        }
      });

      if (employeeAuditError) {
        console.error('Failed to log employee creation:', employeeAuditError);
        // Don't throw, continue with flow
      }

      // Get a fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        throw new Error('Failed to establish session');
      }

      // Now we can safely redirect
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
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
              🌊 Welcome to {invitation?.organization_name || 'Our Platform'}!
            </h1>
            <p className="text-center text-[#4A5568] mb-8">
              You're just a few waves away from joining the team 🏄‍♂️
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                {error}
              </div>
            )}

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
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                             focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                             bg-white/50 backdrop-blur-sm"
                    required
                    placeholder="Jane"
                    disabled={loading}
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
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                             focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                             bg-white/50 backdrop-blur-sm"
                    required
                    placeholder="Doe"
                    disabled={loading}
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
                  name="email"
                  type="email"
                  autoComplete="username email"
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
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="••••••••"
                  minLength={8}
                  disabled={loading}
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
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#4A90E2]/20 
                           focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                           bg-white/50 backdrop-blur-sm"
                  required
                  placeholder="••••••••"
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#4A90E2] to-[#5C6BC0] 
                         hover:from-[#5C6BC0] hover:to-[#4A90E2]
                         text-white font-medium py-3 px-4 rounded-lg
                         transform transition-all duration-200 hover:scale-[1.02]
                         focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/40
                         disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Setting up your account...' : 'Join the Team 🎉'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 