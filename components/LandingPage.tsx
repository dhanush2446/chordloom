import React from 'react';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { TimbreShowcase } from './landing/TimbreShowcase';
import { StatsBar } from './landing/StatsBar';
import { GallerySection } from './landing/GallerySection';
import { CTASection } from './landing/CTASection';
import { Footer } from './landing/Footer';

import { AuthUser } from '../types';

interface Props {
  onLaunch: () => void;
  user: AuthUser;
  onLogout: () => void;
}

export const LandingPage: React.FC<Props> = ({ onLaunch, user, onLogout }) => {
  return (
    <>
      <Navbar onLaunch={onLaunch} user={user} onLogout={onLogout} />
      <HeroSection onStart={onLaunch} />
      <FeaturesSection />
      <HowItWorksSection />
      <TimbreShowcase />
      <StatsBar />
      <GallerySection />
      <CTASection onLaunch={onLaunch} />
      <Footer />
    </>
  );
};
