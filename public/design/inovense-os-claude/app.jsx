// Inovense — App orchestrator

const App = () => {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <OperatingLayerSection />
        <AgentsSection />
        <WorkflowsSection />
        <MemorySection />
        <ApprovalsSection />
        <IntegrationsSection />
        <ExecutionLogSection />
        <SecuritySection />
        <OnboardingSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
