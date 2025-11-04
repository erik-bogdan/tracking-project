"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "Up to 5 events per month",
      "Basic match tracking",
      "OBS integration",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: [
      "Unlimited events",
      "Advanced match tracking",
      "OBS integration with custom layouts",
      "Priority support",
      "Export data",
      "Team management",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated support",
      "Custom branding",
      "API access",
      "Advanced analytics",
    ],
    popular: false,
  },
];

export default function PlansPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Plans & Pricing</h1>
        <p className="text-white/60">Choose the plan that fits your needs</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
          >
            <Card
              className={cn(
                "bg-[#0a0a0a] border backdrop-blur-sm relative overflow-hidden",
                plan.popular
                  ? "border-[#ff073a] shadow-xl shadow-[#ff073a]/20 scale-105"
                  : "border-[#ff073a]/30"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white text-xs font-semibold px-4 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-white">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-white/60">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-[#ff073a] shrink-0 mt-0.5" />
                      <span className="text-sm text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full mt-6",
                    plan.popular
                      ? "bg-gradient-to-r from-[#ff073a] to-[#ff1744] hover:from-[#ff1744] hover:to-[#ff4569] text-white"
                      : "bg-white/5 text-white hover:bg-white/10 border border-white/20"
                  )}
                >
                  {plan.price === "Custom" ? "Contact Us" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

