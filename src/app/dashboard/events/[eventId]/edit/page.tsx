"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { updateEvent, clearError, fetchEvent } from "@/lib/slices/eventSlice";
import { DateTimePicker } from "@/components/dashboard/date-time-picker";
import { LayoutPreview } from "@/components/dashboard/layout-preview";
import { toast } from "sonner";
import { api } from "../../../../../../elysia/client";

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  type: z.enum(["1on1", "2on2"]),
  dateTime: z.string().min(1, "Date and time is required"),
  location: z.string().optional(),
  showTwitchChat: z.boolean().default(false),
  twitchChatApiKey: z.string().optional(),
  layoutImage: z.string().min(1, "Layout image is required"),
}).refine((data) => {
  if (data.showTwitchChat && !data.twitchChatApiKey) {
    return false;
  }
  return true;
}, {
  message: "Twitch chat API key is required when Twitch chat is enabled",
  path: ["twitchChatApiKey"],
});

type EventFormData = z.infer<typeof eventSchema>;

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.event);
  const { events } = useAppSelector((state) => state.event);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the event to edit
  const event = events.find((e) => e.id === eventId);

  // Fetch event if not in store
  useEffect(() => {
    if (!event && eventId) {
      dispatch(fetchEvent(eventId));
    }
  }, [dispatch, eventId, event]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      showTwitchChat: false,
      type: "1on1" as const,
    },
  });

  // Load event data into form when event is available
  useEffect(() => {
    if (event) {
      const formData: EventFormData = {
        name: event.name,
        type: event.type,
        dateTime: event.date,
        location: event.location || "",
        showTwitchChat: event.showTwitchChat ?? false,
        twitchChatApiKey: event.twitchChatApiKey || "",
        layoutImage: event.layoutImage || "",
      };
      reset(formData);
      if (event.layoutImage) {
        setImagePreview(event.layoutImage);
      }
    }
  }, [event, reset]);

  const showTwitchChat = watch("showTwitchChat");
  const layoutImage = watch("layoutImage");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      try {
        // Upload file first
        const result = await (api as any).upload.image.post({ file });
        
        if (result.data?.success && result.data.data) {
          const imageUrl = result.data.data.url;
          setImagePreview(imageUrl);
          setValue("layoutImage", imageUrl);
          toast.success("Image uploaded successfully!");
        } else {
          toast.error("Failed to upload image", {
            description: result.data?.error || "An error occurred while uploading the image.",
          });
        }
      } catch (error: any) {
        toast.error("Failed to upload image", {
          description: error.message || "An error occurred while uploading the image.",
        });
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const onSubmit = async (data: EventFormData) => {
    dispatch(clearError());
    
    // Format dateTime to ISO string
    const formattedData = {
      ...data,
      dateTime: new Date(data.dateTime).toISOString(),
    };

    const result = await dispatch(updateEvent({ id: eventId, data: formattedData }));
    
    if (updateEvent.fulfilled.match(result)) {
      toast.success("Event updated successfully!", {
        description: `Your event "${data.name}" has been updated.`,
      });
      router.push("/dashboard/events");
    } else if (updateEvent.rejected.match(result)) {
      toast.error("Failed to update event", {
        description: result.payload as string || "An error occurred while updating the event.",
      });
    }
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-[#ff073a]/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white">Edit Event</h1>
        </div>
        <p className="text-white/60">Update the details of your event</p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/90">
                Event Name *
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                placeholder="Enter event name"
              />
              {errors.name && (
                <p className="text-sm text-[#ff4569]">{errors.name.message}</p>
              )}
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-white/90">
                Event Type *
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full bg-white/5 border-[#ff073a]/30 text-white">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-[#ff073a]/30">
                      <SelectItem value="1on1" className="text-white hover:bg-[#ff073a]/20">
                        1v1
                      </SelectItem>
                      <SelectItem value="2on2" className="text-white hover:bg-[#ff073a]/20">
                        2v2
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-[#ff4569]">{errors.type.message}</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Date and Time *
              </Label>
              <Controller
                name="dateTime"
                control={control}
                render={({ field }) => {
                  const dateValue = field.value ? new Date(field.value) : undefined;
                  return (
                    <DateTimePicker
                      value={dateValue}
                      onChange={(date) => {
                        if (date) {
                          field.onChange(date.toISOString());
                        } else {
                          field.onChange("");
                        }
                      }}
                    />
                  );
                }}
              />
              {errors.dateTime && (
                <p className="text-sm text-[#ff4569]">{errors.dateTime.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-white/90">
                Location
              </Label>
              <Input
                id="location"
                {...register("location")}
                className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                placeholder="Enter location (optional)"
              />
            </div>

            {/* Options Section */}
            <div className="space-y-4">
              <Label className="text-white/90 text-base font-semibold">
                Options
              </Label>
              
              {/* Show Twitch Chat Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="showTwitchChat" className="text-white/90">
                  Show Twitch Chat
                </Label>
                <Controller
                  name="showTwitchChat"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      pressed={field.value}
                      onPressedChange={(pressed) => {
                        field.onChange(pressed);
                        if (!pressed) {
                          setValue("twitchChatApiKey", undefined);
                        }
                      }}
                      variant="outline"
                      className="bg-white/5 border-[#ff073a]/30 data-[state=on]:bg-[#ff073a]/20 data-[state=on]:text-white text-white/70"
                    >
                      {field.value ? "On" : "Off"}
                    </Toggle>
                  )}
                />
              </div>

              {/* Twitch Chat API Key (conditional) */}
              {showTwitchChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="twitchChatApiKey" className="text-white/90">
                    Twitch Chat API Key *
                  </Label>
                  <Input
                    id="twitchChatApiKey"
                    type="password"
                    {...register("twitchChatApiKey")}
                    className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                    placeholder="Enter Twitch chat API key"
                  />
                  {errors.twitchChatApiKey && (
                    <p className="text-sm text-[#ff4569]">
                      {errors.twitchChatApiKey.message}
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Layout Image Upload */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="layoutImage" className="text-white/90">
                  Layout Image *
                </Label>
                <p className="text-xs text-white/50 mt-1">
                  Recommended size: 1920x1080 pixels
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="layoutImage"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full bg-white/5 border-[#ff073a]/30 text-white hover:bg-[#ff073a]/10 disabled:opacity-50"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? "Change Layout Image" : "Upload Layout Image"}
                  </>
                )}
              </Button>
              {imagePreview && !uploadingImage && (
                <p className="text-xs text-white/50">Image: {imagePreview}</p>
              )}
              {errors.layoutImage && (
                <p className="text-sm text-[#ff4569]">{errors.layoutImage.message}</p>
              )}
              
              {/* Layout Preview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4"
              >
                <LayoutPreview 
                  layoutImage={layoutImage || imagePreview} 
                  showTwitchChat={showTwitchChat}
                />
              </motion.div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-[#ff073a]/20 border border-[#ff073a]/30 rounded-lg">
                <p className="text-sm text-[#ff4569]">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 bg-white/5 border-[#ff073a]/30 text-white hover:bg-[#ff073a]/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Event"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

