'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useUser } from '@/contexts/UserContext'

// Feature section interface for type safety
interface FeatureSection {
  title: string
  description: string
  icon: string // Emoji icons for now, can be replaced with proper SVGs
}

// Shape types for Bauhaus design
type ShapeType = 'circle' | 'triangle' | 'square' | 'rectangle' | 'diamond' | 'hexagon'

interface BauhausFeature {
  title: string
  description: string
  color: string
  shape: ShapeType
}

interface BauhausShapeProps {
  shape: ShapeType
  color: string
  className?: string
}

// Features array with engaging copy
const features: FeatureSection[] = [
  {
    title: 'Smart Ticketing',
    description: 'Automatically categorize and prioritize support requests using AI-powered analysis.',
    icon: '🎯'
  },
  {
    title: 'Team Collaboration',
    description: 'Work together seamlessly with real-time updates and shared ticket views.',
    icon: '👥'
  },
  {
    title: 'Customer Insights',
    description: 'Gain valuable insights into customer needs with detailed analytics and reporting.',
    icon: '📊'
  },
  {
    title: 'Multi-Channel Support',
    description: 'Handle requests from email, chat, and social media in one unified inbox.',
    icon: '📱'
  }
]

// Advanced features with AI focus
const advancedFeatures: BauhausFeature[] = [
  {
    title: 'AI-Powered Responses',
    description: 'Generate thoughtful, contextual responses to customer inquiries using advanced language models.',
    color: '#FF7676',
    shape: 'circle'
  },
  {
    title: 'Intelligent Routing',
    description: 'Automatically direct tickets to the most qualified agents based on expertise and workload.',
    color: '#4A90E2',
    shape: 'triangle'
  },
  {
    title: 'Agent Copilot',
    description: 'AI assistant that provides relevant information and suggests solutions in real-time.',
    color: '#50C878',
    shape: 'square'
  },
  {
    title: 'Smart Triage',
    description: 'Prioritize and categorize incoming tickets automatically using machine learning.',
    color: '#FFB347',
    shape: 'rectangle'
  },
  {
    title: 'Unified Agent Workspace',
    description: 'All the tools and information agents need in one streamlined interface.',
    color: '#9B59B6',
    shape: 'diamond'
  },
  {
    title: 'Knowledge Integration',
    description: 'Automatically surface relevant documentation and past solutions.',
    color: '#E74C3C',
    shape: 'hexagon'
  }
]

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
}

// Shape components for Bauhaus design
const BauhausShape = ({ shape, color, className = '' }: BauhausShapeProps) => {
  switch (shape) {
    case 'circle':
      return <div className={`w-16 h-16 rounded-full ${className}`} style={{ backgroundColor: color }} />
    case 'triangle':
      return (
        <div className={`w-0 h-0 border-l-[32px] border-r-[32px] border-b-[48px] ${className}`}
             style={{ borderBottomColor: color, borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
      )
    case 'square':
      return <div className={`w-16 h-16 ${className}`} style={{ backgroundColor: color }} />
    case 'rectangle':
      return <div className={`w-20 h-12 ${className}`} style={{ backgroundColor: color }} />
    case 'diamond':
      return <div className={`w-16 h-16 rotate-45 ${className}`} style={{ backgroundColor: color }} />
    case 'hexagon':
      return <div className={`w-16 h-14 relative ${className}`} style={{ backgroundColor: color }}>
        <div className="absolute top-0 left-0 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[7px]"
             style={{ borderBottomColor: color, borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
        <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[7px]"
             style={{ borderTopColor: color, borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
      </div>
    default:
      return null
  }
}

/**
 * Home/Splash Page Component
 * 
 * Landing page showcasing the product features and benefits
 * with smooth animations and clear call-to-actions
 */
export default function Home() {
  const { user, loading } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2F7] via-[#4A90E2]/10 to-[#F7F3E3]">
      {/* Hero Section */}
      <motion.section 
        className="px-6 pt-20 pb-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#2C5282]">
          Customer Support,{' '}
          <span className="text-[#FF7676]">Simplified</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-[#4A5568] max-w-2xl mx-auto">
          Streamline your customer support with our intelligent ticketing system.
          Handle requests faster, collaborate better, and make your customers happier.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!loading && (
            user ? (
              <Link 
                href="/dashboard"
                className="wave-button text-lg px-8 py-3"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link 
                href="/auth"
                className="wave-button text-lg px-8 py-3"
              >
                Start Free Trial
              </Link>
            )
          )}
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section 
        className="px-6 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-[#2C5282]">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="ocean-card"
                variants={itemVariants}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-[#2C5282]">
                  {feature.title}
                </h3>
                <p className="text-[#4A5568]">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Advanced Features Section with Bauhaus Design */}
      <motion.section
        className="px-6 py-16 bg-white/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center text-[#2C5282]">
            Powered by Intelligence
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {advancedFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Decorative line */}
                <div 
                  className="absolute -top-8 left-0 w-12 h-1"
                  style={{ backgroundColor: feature.color }}
                />
                
                {/* Shape */}
                <div className="absolute -top-4 -left-4 opacity-10">
                  <BauhausShape shape={feature.shape} color={feature.color} className="transform scale-150" />
                </div>
                
                {/* Content */}
                <div className="ocean-card relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 
                      className="text-2xl font-bold mb-3"
                      style={{ color: feature.color }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-[#4A5568] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Background shape */}
                  <div className="absolute -right-8 -bottom-8 opacity-5">
                    <BauhausShape shape={feature.shape} color={feature.color} className="transform scale-200" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Call to Action */}
      <motion.section 
        className="px-6 py-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="max-w-4xl mx-auto ocean-card">
          <h2 className="text-3xl font-bold mb-4 text-[#2C5282]">
            Ready to Transform Your Customer Support?
          </h2>
          <p className="text-lg mb-8 text-[#4A5568]">
            Join thousands of companies providing exceptional customer service.
            Start your free trial today - no credit card required.
          </p>
          {!loading && !user && (
            <Link 
              href="/auth"
              className="wave-button text-lg px-8 py-3"
            >
              Get Started Free
            </Link>
          )}
        </div>
      </motion.section>
    </div>
  )
} 