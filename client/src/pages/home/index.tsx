import { lazy, Suspense, useState } from "react";
import { BackToTop } from "./sections/BackToTop";
import { CTA } from "./sections/CTA";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { PageLoader } from "./sections/PageLoader";
import { Process } from "./sections/Process";
import { ServicesPreview } from "./sections/ServicesPreview";
import { Stats } from "./sections/Stats";
import { Testimonial } from "./sections/Testimonial";
import { WhyUs } from "./sections/WhyUs";

const AppointmentChatBot = lazy(() =>
  import("@/components/AppointmentChatBot").then(module => ({
    default: module.AppointmentChatBot,
  }))
);

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <PageLoader />
      <main className="bg-[#FBF8F3]">
        <Hero onOpenChat={() => setChatOpen(true)} />
        <ServicesPreview />
        <Stats />
        <Process />
        <WhyUs />
        <Testimonial />
        <CTA />
        <Footer />
      </main>
      <BackToTop />
      {chatOpen && (
        <Suspense fallback={null}>
          <AppointmentChatBot
            open={chatOpen}
            onOpenChange={setChatOpen}
            mode="floating"
            title="预约咨询"
          />
        </Suspense>
      )}
    </>
  );
}
