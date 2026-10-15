import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, X } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State
  const [ageRange, setAgeRange] = useState("");
  const [sex, setSex] = useState("");

  // Step 2 State
  const [selectedGoal, setSelectedGoal] = useState("🍳 Learn to Cook");

  // Step 3 State
  const [pantryEnabled, setPantryEnabled] = useState(true);
  const [groceryEnabled, setGroceryEnabled] = useState(true);
  const [plannerEnabled, setPlannerEnabled] = useState(true);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Save profile to localStorage
      try {
        localStorage.setItem(
          "curation_kitchen_user_profile",
          JSON.stringify({
            ageRange,
            sex,
            goal: selectedGoal,
            pantryEnabled,
            groceryEnabled,
            plannerEnabled,
            completedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore write error
      }
      onClose();
      window.location.href = "/";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#FAF6EE] text-[#2C2A29] rounded-3xl shadow-2xl border border-[#E7E2D8] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* TOP HEADER */}
          <div className="p-6 pb-4 border-b border-[#E7E2D8]/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black tracking-widest text-[#D95338] uppercase">
                CURATION KITCHEN
              </span>
              <span className="text-xs font-bold text-[#78716C]">
                Step {currentStep} of 3
              </span>
            </div>

            {/* 3 Segmented Progress Bar */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-colors duration-300 ${
                    step <= currentStep ? "bg-[#6E8B6B]" : "bg-[#E7E2D8]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* CONTENT STEP CONTAINER */}
          <div className="p-6 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-[#2C2A29] tracking-tight">
                      Tell us about yourself
                    </h2>
                    <p className="text-sm text-[#78716C] mt-1">
                      We use this to calibrate your nutritional baselines.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2C2A29] uppercase tracking-wider mb-2">
                        Select Age Range
                      </label>
                      <select
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        className="w-full p-3.5 bg-white border border-[#E7E2D8] rounded-2xl text-sm font-semibold text-[#2C2A29] focus:outline-none focus:border-[#6E8B6B] focus:ring-2 focus:ring-[#6E8B6B]/20 transition"
                      >
                        <option value="">Select age range...</option>
                        <option value="18-25">18-25</option>
                        <option value="26-40">26-40</option>
                        <option value="41-60">41-60</option>
                        <option value="61+">61+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2C2A29] uppercase tracking-wider mb-2">
                        Select Biological Sex
                      </label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-full p-3.5 bg-white border border-[#E7E2D8] rounded-2xl text-sm font-semibold text-[#2C2A29] focus:outline-none focus:border-[#6E8B6B] focus:ring-2 focus:ring-[#6E8B6B]/20 transition"
                      >
                        <option value="">Select option...</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-[#2C2A29] tracking-tight">
                      What is your main goal?
                    </h2>
                    <p className="text-sm text-[#78716C] mt-1">
                      Choose your primary focus to personalize your daily feed.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { title: "🍳 Learn to Cook", sub: "Master kitchen fundamentals & core techniques" },
                      { title: "🌍 Explore Cultures", sub: "Discover global recipes & authentic flavors" },
                      { title: "⏱️ Quick Meals", sub: "30-minute delicious recipes for busy schedules" },
                      { title: "💪 Macro Tracking", sub: "Tailored high-protein & balanced nutrition plans" },
                    ].map((item) => {
                      const isSelected = selectedGoal === item.title;
                      return (
                        <button
                          key={item.title}
                          onClick={() => setSelectedGoal(item.title)}
                          className={`w-full p-4 rounded-2xl text-left border transition-all duration-200 flex items-center justify-between ${
                            isSelected
                              ? "bg-[#F0F4EF] border-[#6E8B6B] shadow-sm"
                              : "bg-white border-[#E7E2D8] hover:border-[#6E8B6B]/50"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-base text-[#2C2A29]">{item.title}</div>
                            <div className="text-xs text-[#78716C] mt-0.5">{item.sub}</div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-[#6E8B6B] text-white flex items-center justify-center shrink-0 ml-3">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-[#2C2A29] tracking-tight">
                      Customize your workspace
                    </h2>
                    <p className="text-sm text-[#78716C] mt-1">
                      Enable the smart modules you want active in your kitchen hub.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        icon: "🧺",
                        title: "Pantry Tracker",
                        sub: "Manage waste & track freshness",
                        enabled: pantryEnabled,
                        toggle: setPantryEnabled,
                      },
                      {
                        icon: "🛒",
                        title: "Smart Grocery List",
                        sub: "Aisle sorting & instant recipe sync",
                        enabled: groceryEnabled,
                        toggle: setGroceryEnabled,
                      },
                      {
                        icon: "📅",
                        title: "Meal Planner",
                        sub: "Weekly schedule builder & prep alerts",
                        enabled: plannerEnabled,
                        toggle: setPlannerEnabled,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          item.enabled
                            ? "bg-[#F0F4EF] border-[#6E8B6B]"
                            : "bg-white border-[#E7E2D8]"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] flex items-center justify-center text-xl shrink-0">
                            {item.icon}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#2C2A29]">{item.title}</div>
                            <div className="text-xs text-[#78716C]">{item.sub}</div>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer ml-3">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => item.toggle(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#E7E2D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6E8B6B]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BOTTOM BAR */}
          <div className="p-6 pt-4 border-t border-[#E7E2D8]/60 bg-[#FAF6EE] flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm font-semibold text-[#78716C] hover:text-[#2C2A29] px-2 py-1 transition"
            >
              Skip
            </button>

            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-[#D95338] hover:bg-[#C4462B] text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              {currentStep === 3 ? "Let's Cook!" : "Continue"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
