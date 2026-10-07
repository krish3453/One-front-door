import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import InteractiveOrb from '../InteractiveOrb/InteractiveOrb';
import ScrollReveal from '../ScrollReveal/ScrollReveal';
import './HomePage.css';

gsap.registerPlugin(ScrollTrigger);

interface HomePageProps {
  onSuggestion: (suggestion: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

type TabType = 'academics' | 'campus' | 'policies' | 'petitions';

const HomePage: React.FC<HomePageProps> = ({ onSuggestion, scrollContainerRef }) => {
  const [activeTab, setActiveTab] = useState<TabType>('academics');

  const orbContainerRef = useRef<HTMLDivElement>(null);
  const orbScaleRef = useRef<HTMLDivElement>(null);
  const orbTextRef = useRef<HTMLSpanElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const scroller = scrollContainerRef?.current || window;

      // Force GSAP to strictly own transforms and zero out CSS pixel offsets
      gsap.set(orbContainerRef.current, { x: 0, y: 0, xPercent: -50, yPercent: -50 });
      gsap.set(orbTextRef.current, { x: 0, y: 0, xPercent: -50, yPercent: -50 });
      
      // Hero text wrapper also needs to be initialized if we animate its yPercent
      gsap.set(heroTextRef.current, { xPercent: -50, yPercent: -50 });

      // 1. Orb moves to top left
      // Container is anchored by its center (xPercent: -50, yPercent: -50 from CSS)
      // So top/left coordinates represent the exact center of the orb in the top bar.
      gsap.to(orbContainerRef.current, {
        top: 40, // Center of the navbar vertically
        left: 74, // 32px padding + half of scaled orb width
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: heroRef.current,
          scroller,
          start: "top top",
          end: "+=500",
          scrub: 1.5,
        }
      });

      // 2. Orb shrinks
      gsap.to(orbScaleRef.current, {
        scale: 0.28,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: heroRef.current,
          scroller,
          start: "top top",
          end: "+=500",
          scrub: 1.5,
        }
      });

      // 3. OFD text fades in and shifts right
      gsap.fromTo(orbTextRef.current, 
        { opacity: 0, x: 0 },
        { 
          opacity: 1,
          x: 65, // slide to the right of the shrunken orb
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: heroRef.current,
            scroller,
            start: "top top",
            end: "+=500",
            scrub: 1.5,
          }
        }
      );

      // 4. Hero text fades out and moves up on scroll
      gsap.to(heroTextRef.current, {
        opacity: 0,
        y: -100, // moves up 100px relative to its starting transform
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: heroRef.current,
          scroller,
          start: "top top",
          end: "+=400",
          scrub: 1.5,
        }
      });

      // 4. Screenshot fades in from left
      gsap.fromTo(screenshotRef.current,
        { opacity: 0, x: -50, filter: "blur(10px)" },
        {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          ease: "power2.out",
          scrollTrigger: {
            trigger: screenshotRef.current,
            scroller,
            start: "top 85%",
            end: "top 45%",
            scrub: 1.5,
          }
        }
      );

    });

    return () => ctx.revert();
  }, [scrollContainerRef]);

  const tabContent = {
    academics: {
      title: "Academic Intelligence",
      desc: "Navigate your coursework, track attendance, and predict your grades.",
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
      suggestions: [
        "I have 18 out of 24 classes attended in Operating Systems. Can I bunk tomorrow?",
        "What is the complete course curriculum for B.Tech CSE 4th semester?",
        "Show me the syllabus for Data Structures.",
        "How many credits do I need to graduate?"
      ]
    },
    campus: {
      title: "Campus Life & Dining",
      desc: "Explore mess menus, food outlets, and campus facilities in real-time.",
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>,
      suggestions: [
        "What's for dinner in the main mess today?",
        "Which food outlets are open right now?",
        "Is there any non-veg option in the mess menu today?",
        "Find me a cafe that serves cold coffee on campus."
      ]
    },
    policies: {
      title: "Rules & Regulations",
      desc: "Instant access to official university policies, penalties, and hostel rules.",
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
      suggestions: [
        "What are the official penalties for hostel night curfew violation?",
        "What is the policy regarding alcohol consumption on campus?",
        "How do I appeal a disciplinary action?",
        "What are the rules for day scholars entering the hostel?"
      ]
    },
    petitions: {
      title: "Automated Petitions",
      desc: "Auto-draft formal letters with cited university regulations for the Dean or Wardens.",
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
      suggestions: [
        "Draft a formal petition to the Dean for a Makeup Mid-Term Exam due to fever.",
        "Write a letter requesting a late fee waiver for hostel dues.",
        "Draft an application for a 3-day leave for my sister's wedding.",
        "Write a request for a room change to the chief warden."
      ]
    }
  };

  return (
    <div className="home-page">
      {/* 
        FIXED HERO CONTENT:
        Both the orb and the text are fixed so they can be positioned side-by-side mathematically.
      */}
      <div className="fixed-orb-container" ref={orbContainerRef}>
        <div className="orb-scale-wrapper" ref={orbScaleRef}>
          <InteractiveOrb />
        </div>
        <span className="fixed-orb-text" ref={orbTextRef}>OFD</span>
      </div>

      <div className="hero-text-wrapper" ref={heroTextRef}>
        <h1 className="hero-title">Welcome to One Front Door</h1>
        <p className="hero-scroll-hint">Scroll down to explore</p>
      </div>

      {/* Spacer to allow scrolling past the fixed hero content */}
      <div className="hero-section" ref={heroRef}></div>

      {/* SPLIT LAYOUT: Image on Left, Animated Text on Right */}
      <div className="split-layout-section">
        <div className="split-left" ref={screenshotRef}>
          <div className="screenshot-wrapper">
            <div className="screenshot-glow"></div>
            <img src="/screenshot-coffee.png" alt="Coffee Prices Interface" className="screenshot-img" />
          </div>
        </div>
        <div className="split-right">
          <div className="hero-reveal-wrapper">
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              baseRotation={5}
              blurStrength={10}
              containerClassName="hero-reveal-container"
              textClassName="hero-reveal-text"
              scrollContainerRef={scrollContainerRef}
            >
              One Front Door is a unified Bennett University Copilot. Powered by an advanced multi-agent StateGraph architecture, it provides instant, accurate access to academics, campus life, and university rules. Stop endlessly searching through PDFs and student portals. Get immediate answers about attendance, dining menus, hostel rules, or automatically draft formal petitions to the Dean in seconds.
            </ScrollReveal>
          </div>
        </div>
      </div>

      <div className="architecture-viz">
        {/* Left side: The Agents (like the many branches in the image) */}
        <div className="viz-agents-column">
          <div className="viz-node agent-node">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Academic Agent
          </div>
          <div className="viz-node agent-node">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            Campus Agent
          </div>
          <div className="viz-node agent-node">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            General Agent
          </div>
        </div>

        {/* Center: The flowing animated lines merging into a single beam */}
        <div className="viz-flowing-streams">
          <svg preserveAspectRatio="none" viewBox="0 0 200 120" className="stream-svg">
            {/* Background tracks */}
            <path d="M 0,20 C 100,20 100,60 200,60" className="stream-track" />
            <path d="M 0,60 L 200,60" className="stream-track" />
            <path d="M 0,100 C 100,100 100,60 200,60" className="stream-track" />
            
            {/* Animated glowing lines */}
            <path d="M 0,20 C 100,20 100,60 200,60" className="stream-beam beam-top" />
            <path d="M 0,60 L 200,60" className="stream-beam beam-mid" />
            <path d="M 0,100 C 100,100 100,60 200,60" className="stream-beam beam-bot" />
          </svg>
        </div>

        {/* Right side: The Router/Main pipeline */}
        <div className="viz-main-pipeline">
          <div className="viz-node router-node">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
            Router Agent
          </div>
          <div className="viz-beam-extension">
            <div className="animated-beam"></div>
          </div>
        </div>
      </div>

      <div className="interactive-features">
        <div className="tabs-container">
          {(Object.keys(tabContent) as TabType[]).map((key) => (
            <button
              key={key}
              className={`tab-button ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {tabContent[key].icon}
              {tabContent[key].title}
            </button>
          ))}
        </div>
        
        <div className="tab-content-panel">
          <div className="tab-info">
            <h3>{tabContent[activeTab].title}</h3>
            <p>{tabContent[activeTab].desc}</p>
          </div>
          <div className="suggestions-grid">
            {tabContent[activeTab].suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-card"
                onClick={() => onSuggestion(suggestion)}
              >
                <div className="suggestion-text">"{suggestion}"</div>
                <div className="suggestion-arrow">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="data-viz-section">
        <div className="stats-card">
          <div className="stat-value">3</div>
          <div className="stat-label">Specialized Agents</div>
        </div>
        <div className="stats-card">
          <div className="stat-value">Live</div>
          <div className="stat-label">Campus Data</div>
        </div>
        <div className="stats-card">
          <div className="stat-value">RAG</div>
          <div className="stat-label">Powered Retrieval</div>
        </div>
        <div className="stats-card">
          <div className="stat-value">24/7</div>
          <div className="stat-label">Availability</div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
