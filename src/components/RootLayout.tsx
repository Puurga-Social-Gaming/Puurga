import React from "react";
import { Outlet } from "react-router-dom";
import OnboardingAudioManager from "./Onboarding/OnboardingAudioManager";

const RootLayout: React.FC = () => {
  return (
    <>
      <OnboardingAudioManager />
      <Outlet />
    </>
  );
};

export default RootLayout;
