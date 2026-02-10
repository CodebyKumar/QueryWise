import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';
import { getDeveloperInfo } from '../utils/signatureGuard';

export function HomePage() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const devInfo = getDeveloperInfo();


  const handleGetStarted = (e) => {
    e.preventDefault();
    navigate(ROUTES.SIGNUP, { state: { email } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 flex flex-col selection:bg-orange-100 selection:text-orange-900 font-sans">
      <Header />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-gradient-to-tr from-orange-100/50 to-amber-100/40 rounded-full blur-[140px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[60%] w-[40%] h-[40%] bg-gradient-to-bl from-rose-100/30 to-pink-100/30 rounded-full blur-[120px] animate-pulse delay-500" />
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center px-6 relative z-10">
        {/* Main Hero Container */}
        <section className="max-w-7xl mx-auto pt-20 pb-32 w-full">
          <div className="flex flex-col items-center text-center">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 border border-orange-500/30 rounded-full mb-10 shadow-xl shadow-orange-500/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">AI-Powered</span>
              </div>
              <div className="w-px h-4 bg-slate-700"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Enterprise Ready</span>
            </div>

            {/* Main Heading - Enhanced */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tight mb-8 max-w-5xl">
              <span className="text-slate-900">Chat with Your</span>
              <br />
              <span className="relative inline-block mt-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-rose-600">Data Universe</span>
                <div className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-orange-400/20 to-rose-400/20 rounded-full"></div>
              </span>
            </h1>

            {/* Subheading - Enhanced */}
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl leading-relaxed font-semibold">
              Transform PDFs, Documents, and Databases into intelligent conversations.
              <span className="block mt-2 text-orange-600 font-bold">Get answers in seconds, not hours.</span>
            </p>

            {/* CTA Form / Button - Enhanced */}
            {!isAuthenticated ? (
              <form onSubmit={handleGetStarted} className="w-full max-w-xl space-y-6">
                {/* Email Input - Premium Design */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
                  <div className="relative p-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                    <input
                      type="email"
                      placeholder="Enter your work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-6 py-5 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 text-lg font-bold placeholder-slate-400 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Start Button - Premium */}
                <button
                  type="submit"
                  className="w-full group relative overflow-hidden px-10 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10">Start Free Today</span>
                  <svg className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                {/* Trust Badges */}
                <div className="mt-8 flex items-center justify-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    No Credit Card
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Free Forever
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Setup in 30s
                  </span>
                </div>
              </form>
            ) : (
              <div className="w-full max-w-xl space-y-6">
                <button
                  onClick={() => navigate(ROUTES.CHAT)}
                  className="w-full group relative overflow-hidden px-10 py-5 bg-gradient-to-r from-orange-600 to-rose-600 text-white font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-orange-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10">Launch Dashboard</span>
                  <svg className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Feature Grid - Premium Redesign */}
        <section className="w-full max-w-7xl mx-auto pb-32 pt-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Why Choose Us?</h2>
            <p className="text-lg text-slate-600 font-semibold">Enterprise-grade features that scale with your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative p-8 bg-white/80 backdrop-blur-sm border-2 border-slate-100 rounded-3xl hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Smart Upload</h3>
                <p className="text-slate-600 text-base leading-relaxed font-medium">
                  Drag & drop PDFs, DOCX, TXT, or connect databases. Our AI automatically extracts and indexes everything for instant search.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-rose-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative p-8 bg-white/80 backdrop-blur-sm border-2 border-slate-100 rounded-3xl hover:border-orange-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xlFont-black text-slate-900 mb-4">Lightning Fast</h3>
                <p className="text-slate-600 text-base leading-relaxed font-medium">
                  Powered by advanced RAG architecture with Pinecone vector search. Get accurate answers in under 2 seconds, every time.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-orange-600">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative p-8 bg-white/80 backdrop-blur-sm border-2 border-slate-100 rounded-3xl hover:border-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">100% Verified</h3>
                <p className="text-slate-600 text-base leading-relaxed font-medium">
                  Every answer includes source citations and confidence scores. No hallucinations, just facts backed by your documents.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-600">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features Row */}
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Database Intelligence</h4>
                  <p className="text-slate-600 text-sm font-medium">Ask questions in plain English. Get SQL queries, visualizations, and insights automatically generated.</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Multi-Model AI</h4>
                  <p className="text-slate-600 text-sm font-medium">Switch between Gemini 2.5 for deep reasoning and Groq Llama for ultra-fast responses. Best of both worlds.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t border-slate-200 bg-slate-50/50 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            crafted by {devInfo.developer}
          </p>
        </div>
      </footer>
    </div>
  );
}
