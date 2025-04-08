import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LuBrainCircuit, 
  LuCode, 
  LuLightbulb, 
  LuShare2, 
  LuArrowRight,
  LuZap,
  LuRocket,
  LuPlay,
  LuSave,
  LuUsers,
  LuActivity,
  LuSunMoon
} from 'react-icons/lu';
import Header from './shared/Header';

const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxValue = -scrollY * 0.2; // Parallax effect intensity
  
  return (
    <div className="relative min-h-screen bg-[#0A0F1C] text-white overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 bg-gradient-radial-to-tr from-primary-900/30 via-[#0A00F1C] to-secondary-900/20"></div>
      <div 
        className="fixed inset-0 opacity-30" 
        style={{ 
          backgroundImage: 'radial-gradient(rgba(66, 165, 245, 0.1) 1px, transparent 1px)', 
          backgroundSize: '50px 50px',
          transform: `translateY(${parallaxValue * 0.5}px)`
        }}
      ></div>
      
      {/* Animated orbs */}
      <div className="fixed -top-[300px] -right-[300px] w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[80px] animate-float-slow"></div>
      <div className="fixed -bottom-[300px] -left-[300px] w-[600px] h-[600px] rounded-full bg-secondary-500/5 blur-[100px] animate-float-slower"></div>
      
      {/* Dynamic Island-like Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center py-20 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
        <div className="absolute -top-[400px] -left-[300px] w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-[300px] -right-[200px] w-[700px] h-[700px] bg-accent-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:pr-12">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-white">Revolutionize</span>
                <br />
                <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Game Development</span>
              </h1>
              
              <p className="text-xl text-white/70 mb-10 max-w-xl">
                Transform natural language into production-ready Unreal Engine 5 Blueprints instantly. 
                <span className="text-white font-medium"> Cut development time by 80%</span> and bring your game ideas to life faster than ever before.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  to="/signup"
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium text-lg transition-transform hover:scale-105 hover:shadow-lg hover:shadow-primary-500/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Start Creating for Free
                </Link>
                <Link
                  to="/roadmap"
                  className="px-8 py-4 rounded-full bg-white/10 text-white backdrop-blur-sm font-medium text-lg hover:bg-white/15 transition-all"
                >
                  View Roadmap
                </Link>
              </div>
              
              <div className="mt-10 pt-6 border-t border-white/5">
                <p className="text-sm text-white/40 mb-4">Trusted by game developers from:</p>
                <div className="flex flex-wrap items-center gap-8">
                  <img src="/logos/studio-logo-1.svg" alt="Studio Logo" className="h-6 opacity-60 hover:opacity-100 transition-opacity" />
                  <img src="/logos/studio-logo-2.svg" alt="Studio Logo" className="h-6 opacity-60 hover:opacity-100 transition-opacity" />
                  <img src="/logos/studio-logo-3.svg" alt="Studio Logo" className="h-6 opacity-60 hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
            
            <div className="lg:pl-6 relative">
              <div className="relative z-10 bg-[#0A0F1C]/70 backdrop-blur-lg rounded-xl border border-white/5 overflow-hidden shadow-2xl shadow-primary-500/10">
                <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="px-3 py-1 bg-white/5 rounded text-white/60 text-xs">Blueprint Generator</div>
                </div>
                <div className="p-5">
                  <div className="bg-[#060A14] rounded-lg p-4 mb-4 shadow-inner border border-white/5">
                    <p className="text-white/80 font-mono text-sm">
                      <span className="text-accent-400">&gt;</span> Create a character movement system with sprint, crouch, and wall climbing abilities
                    </p>
                  </div>
                  <div className="h-[300px] bg-[#060A14] rounded-lg border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="absolute text-white/60 text-xs">Generating...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Code particles animation */}
              <div className="absolute -top-10 -right-10 w-20 h-20 text-primary-400 opacity-20 animate-float-slow">
                {`{ node: "InputAction" }`}
              </div>
              <div className="absolute bottom-20 -left-10 w-20 h-20 text-accent-400 opacity-20 animate-float">
                {`Execute("OnJump");`}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Mockup Animation Section */}
      <section className="relative py-20 bg-[#070B15] overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="bg-[#0A0F1C]/80 backdrop-blur-sm border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-10 bg-[#060A14] border-b border-white/5 flex items-center px-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs text-white/40">noder-blueprint-generator</p>
                </div>
              </div>
              
              <div className="p-8 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-[#060A14]/80 border border-white/5 rounded-lg p-4 h-[350px] max-w-md mx-auto lg:mx-0">
                  <div className="border-b border-white/10 pb-2 mb-4">
                    <h4 className="text-primary-400 text-sm font-medium">Prompt Input</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 shrink-0">U</div>
                      <div className="ml-3 bg-[#0A0F1C] rounded-lg p-3 text-sm text-white/80">
                        Create a blueprint that detects when the player overlaps with a trigger, plays a sound, and adds health to the player character.
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 shrink-0">AI</div>
                      <div className="ml-3 bg-[#0C1225] rounded-lg p-3 text-sm text-white/80">
                        <p>Generating blueprint with:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>Trigger box overlap event</li>
                          <li>Sound playback component</li>
                          <li>Health addition to player</li>
                        </ul>
                        <div className="mt-2 flex items-center text-accent-400">
                          <span className="animate-pulse mr-2">●</span>
                          <span className="text-xs">Processing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 relative h-[350px] bg-[#060A14]/50 rounded-lg border border-white/5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full max-w-sm">
                      <div className="text-white/30 text-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-primary-500/10 mx-auto flex items-center justify-center">
                          <LuBrainCircuit size={28} className="text-primary-400" />
                        </div>
                        <p className="mt-4 text-sm">Blueprint visualization will appear here</p>
                        <div className="mt-3 w-12 h-12 rounded-full mx-auto border-t-2 border-accent-500 animate-spin"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Unreal Engine Acceleration</span>
            </h2>
            <p className="text-xl text-white/70">
              Supercharge Your Development
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-primary-500 to-accent-500 mx-auto mt-6 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="group bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-primary-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/5">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <LuBrainCircuit className="text-white text-2xl" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-primary-400 transition-colors duration-300">AI-Powered Generation</h3>
              
              <p className="text-white/70 leading-relaxed mb-4">
                Our intelligent system understands complex game logic, transforming your natural language descriptions into fully-functioning blueprints - from character controllers to entire gameplay systems.
              </p>
              
              <div className="pt-4 border-t border-white/5">
                <Link to="/blueprint-editor" className="text-primary-400 group-hover:text-primary-300 inline-flex items-center text-sm font-medium">
                  <span>Try the Blueprint Editor</span>
                  <LuArrowRight className="ml-2 group-hover:ml-3 transition-all duration-300" />
                </Link>
              </div>
            </div>
            
            {/* Feature Card 2 */}
            <div className="group bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-accent-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/5">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                  <LuSave className="text-white text-2xl" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-accent-400 transition-colors duration-300">UE5 Blueprint Export</h3>
              
              <p className="text-white/70 leading-relaxed mb-4">
                Seamlessly export to Unreal Engine 5 with our native format support. Generate blueprint assets that can be directly imported into your UE projects with no compatibility issues.
              </p>
              
              <div className="pt-4 border-t border-white/5">
                <Link to="/export-formats" className="text-accent-400 group-hover:text-accent-300 inline-flex items-center text-sm font-medium">
                  <span>View Export Options</span>
                  <LuArrowRight className="ml-2 group-hover:ml-3 transition-all duration-300" />
                </Link>
              </div>
            </div>
            
            {/* Feature Card 3 */}
            <div className="group bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-secondary-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-secondary-500/5">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-secondary-500/20 to-secondary-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center">
                  <LuUsers className="text-white text-2xl" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-secondary-400 transition-colors duration-300">Team Collaboration</h3>
              
              <p className="text-white/70 leading-relaxed mb-4">
                Share blueprints with your team in real-time, manage versions, and collaborate on complex systems. Perfect for studios and teams working across multiple projects.
              </p>
              
              <div className="pt-4 border-t border-white/5">
                <Link to="/team-features" className="text-secondary-400 group-hover:text-secondary-300 inline-flex items-center text-sm font-medium">
                  <span>Explore Team Features</span>
                  <LuArrowRight className="ml-2 group-hover:ml-3 transition-all duration-300" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Blueprint Examples Section */}
      <section className="py-28 bg-[#060A14]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Blueprint Examples</span>
            </h2>
            <p className="text-xl text-white/70">
              See what Noder can generate from simple prompts
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-primary-500 to-accent-500 mx-auto mt-6 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Example 1 */}
            <div className="bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden">
              <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center">
                    <LuActivity className="text-primary-400" />
                  </div>
                  <h3 className="font-medium text-white">Player Damage & Health System</h3>
                </div>
              </div>
              
              <div className="p-5">
                <div className="bg-[#060A14] rounded-lg p-4 mb-4 shadow-inner border border-white/5">
                  <p className="text-white/80 font-mono text-sm">
                    <span className="text-accent-400">&gt;</span> Create a player health system with damage events, health regeneration, and death handling
                  </p>
                </div>
                
                <div className="aspect-video bg-[#060A14] rounded-lg border border-white/5 relative overflow-hidden">
                  <img 
                    src="/examples/health-system-blueprint.jpg" 
                    alt="Health System Blueprint" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060A14] to-transparent opacity-40"></div>
                </div>
              </div>
            </div>
            
            {/* Example 2 */}
            <div className="bg-[#0A0F1C]/70 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden">
              <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded bg-accent-500/20 flex items-center justify-center">
                    <LuSunMoon className="text-accent-400" />
                  </div>
                  <h3 className="font-medium text-white">Day/Night Cycle</h3>
                </div>
              </div>
              
              <div className="p-5">
                <div className="bg-[#060A14] rounded-lg p-4 mb-4 shadow-inner border border-white/5">
                  <p className="text-white/80 font-mono text-sm">
                    <span className="text-accent-400">&gt;</span> Build a day/night cycle system with smooth transitions, time scale control and sky color changes
                  </p>
                </div>
                
                <div className="aspect-video bg-[#060A14] rounded-lg border border-white/5 relative overflow-hidden">
                  <img 
                    src="/examples/day-night-blueprint.jpg" 
                    alt="Day Night Cycle Blueprint" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060A14] to-transparent opacity-40"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-14 text-center">
            <Link 
              to="/examples" 
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-white/10 rounded-lg text-white font-medium hover:bg-gradient-to-r hover:from-primary-500/30 hover:to-accent-500/30 transition-all duration-300 group"
            >
              <span>View More Examples</span>
              <LuArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-24">
            <h3 className="inline-flex items-center px-5 py-2 rounded-full bg-glass text-primary-400 text-sm font-medium mb-6">
              <LuRocket className="mr-2" />
              <span>Simple Process</span>
            </h3>
            <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent text-shadow-sm">
              How It Works
            </h2>
            <p className="text-xl text-white/60">
              Get from idea to implementation in three simple steps
            </p>
          </div>
          
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500/30 via-secondary-500/30 to-accent-500/30 transform -translate-y-1/2 hidden md:block"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
              <StepCard 
                number="01" 
                title="Enter Your Request" 
                description="Describe the functionality you need using natural language."
              />
              <StepCard 
                number="02" 
                title="Automatic Blueprint Generation" 
                description="Our system transforms your request into the right nodes and connections."
              />
              <StepCard 
                number="03" 
                title="Export & Use" 
                description="Copy directly into Unreal Engine or save for later use."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-6 relative z-10">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-secondary-600/20"></div>
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            
            <div className="relative bg-[#0A0F1C]/60 backdrop-blur-sm p-16 text-center">
              <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent text-shadow-sm">
                Ready to Accelerate Your Workflow?
              </h3>
              <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
                Join Noder today and transform how you create Blueprint functionality.
              </p>
              <Link 
                to="/signup" 
                className="inline-block px-8 py-4 bg-white rounded-lg text-[#0A0F1C] font-semibold hover:bg-blue-50 transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-white/25"
              >
                Sign Up for Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500/20 rounded-lg blur-md"></div>
                <div className="relative bg-[#0A0F1C] p-2 rounded-lg border border-primary-500/20">
                  <LuBrainCircuit size={24} className="text-primary-400" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Noder
              </span>
            </div>
            <div className="text-white/50 text-sm">
              &copy; {new Date().getFullYear()} Noder. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper components with enhanced designs
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, gradient }) => (
  <div className="group relative bg-glass rounded-2xl p-8 border border-white/5 transition-all duration-500 hover:border-white/10 hover:shadow-card-hover backdrop-blur-sm overflow-hidden">
    {/* Gradient background that appears on hover */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
    
    <div className="relative z-10">
      <div className={`mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} bg-opacity-10 flex items-center justify-center text-white p-3 transform group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">{title}</h4>
      <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">{description}</p>
      
      <div className="mt-8 flex items-center text-primary-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        <span className="text-sm font-medium">Learn more</span>
        <LuArrowRight className="ml-2 text-sm" />
      </div>
    </div>
  </div>
);

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

const StepCard: React.FC<StepCardProps> = ({ number, title, description }) => (
  <div className="group relative p-8 bg-glass rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-card-hover z-10 h-full">
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:left-auto md:-translate-x-0 md:-left-8 w-16 h-16 rounded-full bg-[#0A0F1C] border border-white/10 flex items-center justify-center text-xl font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-lg z-20">
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 opacity-10"></div>
      <span className="relative z-10 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent font-mono">{number}</span>
    </div>
    <div className="pt-8 md:pt-0 md:pl-8">
      <h4 className="text-xl font-bold mb-4 text-white group-hover:text-shadow transition-all duration-300">{title}</h4>
      <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300">{description}</p>
    </div>
  </div>
);

export default LandingPage; 