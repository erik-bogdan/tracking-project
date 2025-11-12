"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createMatch, clearError, fetchMatches } from "@/lib/slices/matchSlice";
import { fetchEvents } from "@/lib/slices/eventSlice";
import { DateTimePicker } from "@/components/dashboard/date-time-picker";
import { toast } from "sonner";

// Unified schema with all optional fields - validation happens in onSubmit based on event type
const matchSchema = z.object({
  dateTime: z.string().min(1, "Date and time is required"),
  bestOf: z.number().min(1).max(21).default(1), // Best Of 1-21 (e.g., BO7 = 7)
  // All fields optional - we'll validate manually based on event type
  homePlayerName: z.string().optional(),
  awayPlayerName: z.string().optional(),
  homeTeamName: z.string().optional(),
  homePlayer1Name: z.string().optional(),
  homePlayer2Name: z.string().optional(),
  awayTeamName: z.string().optional(),
  awayPlayer1Name: z.string().optional(),
  awayPlayer2Name: z.string().optional(),
});

type MatchFormData = z.infer<typeof matchSchema>;

export default function NewMatchPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.match);
  const { events } = useAppSelector((state) => state.event);

  // Find the event to get its type
  const event = events.find((e) => e.id === eventId);

  useEffect(() => {
    if (events.length === 0) {
      dispatch(fetchEvents());
    }
  }, [dispatch, events.length]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      dateTime: "",
      bestOf: 1,
    },
    mode: 'onChange',
  });

  // Set default date when event loads
  useEffect(() => {
    if (event?.date) {
      const dateValue = new Date(event.date).toISOString();
      setValue("dateTime", dateValue);
    }
  }, [event, setValue]);

  // Debug: watch form values
  const formValues = watch();
  useEffect(() => {
    console.log('Form values:', formValues);
    console.log('Form errors:', errors);
  }, [formValues, errors]);

  const onSubmit = async (data: MatchFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Event type:', event?.type);
    
    dispatch(clearError());
    
    // Validate required fields based on event type
    if (event?.type === "1on1") {
      if (!data.homePlayerName || !data.awayPlayerName) {
        toast.error("Validation failed", {
          description: "Home player name and away player name are required for 1v1 matches.",
        });
        return;
      }
    } else {
      if (!data.homeTeamName || !data.homePlayer1Name || !data.homePlayer2Name ||
          !data.awayTeamName || !data.awayPlayer1Name || !data.awayPlayer2Name) {
        toast.error("Validation failed", {
          description: "All team and player names are required for 2v2 matches.",
        });
        return;
      }
    }
    
    // Format dateTime to ISO string - ensure it's a valid date
    if (!data.dateTime) {
      toast.error("Invalid date", {
        description: "Please select a date and time.",
      });
      return;
    }
    
    let dateTimeISO: string;
    try {
      const date = new Date(data.dateTime);
      if (isNaN(date.getTime())) {
        toast.error("Invalid date", {
          description: "Please select a valid date and time.",
        });
        return;
      }
      dateTimeISO = date.toISOString();
    } catch {
      toast.error("Invalid date", {
        description: "Please select a valid date and time.",
      });
      return;
    }
    
    const formattedData: any = {
      eventId,
      type: event?.type || "1on1",
      dateTime: dateTimeISO,
      bestOf: data.bestOf || 1,
      // Only include fields that are relevant
      homePlayerName: data.homePlayerName,
      awayPlayerName: data.awayPlayerName,
      homeTeamName: data.homeTeamName,
      homePlayer1Name: data.homePlayer1Name,
      homePlayer2Name: data.homePlayer2Name,
      awayTeamName: data.awayTeamName,
      awayPlayer1Name: data.awayPlayer1Name,
      awayPlayer2Name: data.awayPlayer2Name,
    };

    console.log('Submitting match data:', formattedData);

    try {
      const result = await dispatch(createMatch(formattedData));
      console.log('Match creation result:', result);
      
      if (createMatch.fulfilled.match(result)) {
        // Refresh matches for this event
        dispatch(fetchMatches(eventId));
        
        toast.success("Match created successfully!", {
          description: `Your match has been created.`,
        });
        router.push(`/dashboard/events`);
      } else if (createMatch.rejected.match(result)) {
        console.error('Match creation rejected:', result.payload);
        toast.error("Failed to create match", {
          description: result.payload as string || "An error occurred while creating the match.",
        });
      }
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error("Failed to create match", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    }
  };

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast.error("Form validation failed", {
      description: "Please check all required fields are filled correctly.",
    });
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff073a]" />
      </div>
    );
  }

  const is1v1 = event.type === "1on1";

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-[#ff073a]/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white">Create New Match</h1>
        </div>
        <p className="text-white/60">Add a new match to {event.name}</p>
      </motion.div>

      <form key={event.id} onSubmit={handleSubmit(onSubmit, onError)}>
        <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Match Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {/* Best Of */}
            <div className="space-y-2">
              <Label htmlFor="bestOf" className="text-white/90">
                Best Of (BO)
              </Label>
              <Controller
                name="bestOf"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() || "1"}
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  >
                    <SelectTrigger className="bg-white/5 border-[#ff073a]/30 text-white focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20">
                      <SelectValue placeholder="Select Best Of" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-[#ff073a]/30">
                      {[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21].map((bo) => {
                        const winsNeeded = Math.ceil(bo / 2);
                        return (
                          <SelectItem
                            key={bo}
                            value={bo.toString()}
                            className="text-white hover:bg-[#ff073a]/20 focus:bg-[#ff073a]/20"
                          >
                            BO{bo} ({winsNeeded} {winsNeeded === 1 ? 'win' : 'wins'} needed)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.bestOf && (
                <p className="text-sm text-[#ff4569]">{errors.bestOf.message}</p>
              )}
              <p className="text-xs text-white/60">
                Select the number of games in the match. BO7 means first to 4 wins.
              </p>
            </div>

            {is1v1 ? (
              /* 1v1 Fields */
              <>
                <div className="space-y-2">
                  <Label htmlFor="homePlayerName" className="text-white/90">
                    Home Player Name *
                  </Label>
                  <Input
                    id="homePlayerName"
                    {...register("homePlayerName")}
                    className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                    placeholder="Enter home player name"
                  />
                  {(errors as any).homePlayerName && (
                    <p className="text-sm text-[#ff4569]">{(errors as any).homePlayerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="awayPlayerName" className="text-white/90">
                    Away Player Name *
                  </Label>
                  <Input
                    id="awayPlayerName"
                    {...register("awayPlayerName")}
                    className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                    placeholder="Enter away player name"
                  />
                  {(errors as any).awayPlayerName && (
                    <p className="text-sm text-[#ff4569]">{(errors as any).awayPlayerName.message}</p>
                  )}
                </div>
              </>
            ) : (
              /* 2v2 Fields */
              <>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-[#ff073a]/20 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Home Team</h3>
                    
                    <div className="space-y-2 mb-4">
                      <Label htmlFor="homeTeamName" className="text-white/90">
                        Home Team Name *
                      </Label>
                      <Input
                        id="homeTeamName"
                        {...register("homeTeamName")}
                        className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                        placeholder="Enter home team name"
                      />
                      {(errors as any).homeTeamName && (
                        <p className="text-sm text-[#ff4569]">{(errors as any).homeTeamName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <Label htmlFor="homePlayer1Name" className="text-white/90">
                        Home Player 1 Name *
                      </Label>
                      <Input
                        id="homePlayer1Name"
                        {...register("homePlayer1Name")}
                        className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                        placeholder="Enter home player 1 name"
                      />
                      {(errors as any).homePlayer1Name && (
                        <p className="text-sm text-[#ff4569]">{(errors as any).homePlayer1Name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="homePlayer2Name" className="text-white/90">
                        Home Player 2 Name *
                      </Label>
                      <Input
                        id="homePlayer2Name"
                        {...register("homePlayer2Name")}
                        className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                        placeholder="Enter home player 2 name"
                      />
                      {(errors as any).homePlayer2Name && (
                        <p className="text-sm text-[#ff4569]">{(errors as any).homePlayer2Name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-[#ff073a]/20 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Away Team</h3>
                    
                    <div className="space-y-2 mb-4">
                      <Label htmlFor="awayTeamName" className="text-white/90">
                        Away Team Name *
                      </Label>
                      <Input
                        id="awayTeamName"
                        {...register("awayTeamName")}
                        className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                        placeholder="Enter away team name"
                      />
                      {(errors as any).awayTeamName && (
                        <p className="text-sm text-[#ff4569]">{(errors as any).awayTeamName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <Label htmlFor="awayPlayer1Name" className="text-white/90">
                        Away Player 1 Name *
                      </Label>
                      <Input
                        id="awayPlayer1Name"
                        {...register("awayPlayer1Name")}
                        className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                        placeholder="Enter away player 1 name"
                      />
                      {(errors as any).awayPlayer1Name && (
                        <p className="text-sm text-[#ff4569]">{(errors as any).awayPlayer1Name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="awayPlayer2Name" className="text-white/90">
                        Away Player 2 Name *
                      </Label>
                      <Input
                        id="awayPlayer2Name"
                        {...register("awayPlayer2Name")}
                        className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a]/40 focus:ring-[#ff073a]/20"
                        placeholder="Enter away player 2 name"
                      />
                      {(errors as any).awayPlayer2Name && (
                        <p className="text-sm text-[#ff4569]">{(errors as any).awayPlayer2Name.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

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
                disabled={isLoading || !event}
                className="flex-1 bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  console.log('Submit button clicked');
                  // Don't prevent default, let form handle it
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Match"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

