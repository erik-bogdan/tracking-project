"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, Globe } from "lucide-react";
import { useAppSelector } from "@/lib/hooks";

export default function SettingsPage() {
  const { session } = useAppSelector((state) => state.auth);
  const user = session?.user;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/60">Manage your account settings and preferences</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-[#ff073a]" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-white/60">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/90">
                  Full Name
                </Label>
                <Input
                  id="name"
                  defaultValue={user?.name || ""}
                  className="bg-white/5 border-[#ff073a]/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email || ""}
                  className="bg-white/5 border-[#ff073a]/30 text-white"
                  disabled
                />
              </div>
              <Button className="w-full bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Organization Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#ff073a]" />
                Organization
              </CardTitle>
              <CardDescription className="text-white/60">
                Manage your organization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-white/90">
                  Organization Name
                </Label>
                <Input
                  id="orgName"
                  defaultValue={(user as any)?.organizationName || ""}
                  className="bg-white/5 border-[#ff073a]/30 text-white"
                />
              </div>
              <Button className="w-full bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]">
                Update Organization
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#ff073a]" />
                Preferences
              </CardTitle>
              <CardDescription className="text-white/60">
                Configure your application preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-white/90">
                  Language
                </Label>
                <select
                  id="language"
                  defaultValue={(user as any)?.lang || "en"}
                  className="w-full h-9 rounded-md bg-white/5 border border-[#ff073a]/30 text-white px-3 focus:border-[#ff073a] focus:ring-[#ff073a]/30"
                >
                  <option value="en">English</option>
                  <option value="hu">Magyar</option>
                </select>
              </div>
              <Button className="bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}








