import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';

export function HomePage() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();



  const handleGetStarted = (e) => {
    e.preventDefault();
    navigate(ROUTES.SIGNUP, { state: { email } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-orange-100 selection:text-orange-900 font-sans">
      <Header />

      {/* Background Orbs/Gradients - Even more subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-indigo-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-2%] w-[50%] h-[50%] bg-amber-50/20 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center px-6 relative z-10">
        {/* Main Hero Container */}
        <section className="max-w-6xl mx-auto pt-24 pb-32 w-full">
          <div className="flex flex-col items-center text-center">
            {/* Badge - Simplified */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Enterprise AI Workspace</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-8 max-w-4xl">
              Understand your documents <br />
              <span className="text-orange-600">with absolute clarity.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl leading-relaxed font-medium">
              Transform PDFs and Databases into interactive conversations.
              Upload files and get precise, context-aware answers in seconds.
            </p>

            {/* CTA Form / Button - Logic Updated */}
            {!isAuthenticated ? (
              <form onSubmit={handleGetStarted} className="w-full max-w-lg space-y-4">
                {/* Email Input */}
                <div className="p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/5 transition-all">
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-800 font-semibold placeholder-slate-400 rounded-xl"
                    required
                  />
                </div>

                {/* Start Free Button */}
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 group flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                >
                  Start Free
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                <div className="mt-6 flex items-center justify-center gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> No credit card</span>
                  <span className="flex items-center gap-2"><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Instant Setup</span>
                </div>
              </form>
            ) : (
              <div className="w-full max-w-lg space-y-4">
                <button
                  onClick={() => navigate(ROUTES.CHAT)}
                  className="w-full px-8 py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all active:scale-95 group flex items-center justify-center gap-2 shadow-xl shadow-orange-200"
                >
                  Go to Chat
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Feature Grid - Re-styled for Simplicity */}
        <section className="w-full max-w-6xl mx-auto pb-32 pt-16 border-t border-slate-100">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="group relative">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 text-indigo-600 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Ingestion</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Native support for PDF, DOCX, Markdown, and direct database connections.</p>
            </div>

            <div className="group relative">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-6 text-orange-600 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Neural Search</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Lightning-fast RAG architecture for sub-second, context-aware responses.</p>
            </div>

            <div className="group relative">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-6 text-rose-600 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Answers</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Every response is backed by direct citations and references to your sources.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Simplified */}
      <footer className="border-t border-slate-100 bg-slate-50/50 py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="relative w-40 h-8 overflow-hidden flex items-center justify-center">
                <img src="/brand-logo.png" alt="DocuMind" className="absolute min-w-[120px] min-h-[250px] object-contain scale-[1.2] contrast-[1.1] saturate-110" />
              </div>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">© 2025 DocuMind AI • All rights reserved.</p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]">Privacy</a>
              <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]">Terms</a>
              <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]">Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
