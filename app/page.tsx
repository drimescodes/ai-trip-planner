"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Hotel,
  MapPin,
  Clock,
  Info,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { mockApiResponse } from "@/lib/mock-data";

interface FlightLeg {
  origin: string;
  destination: string;
  duration: string;
  airlines: string[];
  notes?: string;
  costEstimate?: string;
  durationEstimate?: string;
}

interface FlightsInfo {
  outbound: FlightLeg;
  return?: FlightLeg;
}

interface AccommodationDetails {
  hotel?: string;
  name?: string;
  type?: string;
  location?: string;
  costEstimatePerNight?: string;
  proximity?: string;
  amenities?: string[];
  notes?: string;
}

interface Activity {
  time: string;
  description: string;
  location: string;
}

interface DayItinerary {
  day: number;
  date?: string;
  theme: string;
  activities: Activity[];
  notes?: string;
}

interface TripPlan {
  flights?: FlightsInfo;
  fl?: FlightsInfo;
  accommodation?: AccommodationDetails;
  itinerary: DayItinerary[];
}

interface SDKResponse {
  type: string;
  content?: string;
  session?: string;
  error?: string;
}

function parseLenientJson(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (e:unknown) {
    if (e instanceof Error) {
      console.warn(
        "Standard JSON.parse failed:",
        e.message,
        "Attempting advanced cleanup..."
      );
    } else {
      console.warn("Standard JSON.parse failed. Attempting advanced cleanup...");
    }
    const jsonMatch = jsonString.match(/\[[\s\S]*\]|{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error("Failed to find any JSON-like block in the response.");
    }
    let dirtyJson = jsonMatch[0];
    dirtyJson = dirtyJson.replace(/,\s*([}\]])/g, "$1");
    const lines = dirtyJson.split("\n");
    const cleanedLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      return (
        trimmedLine.startsWith("{") ||
        trimmedLine.startsWith("}") ||
        trimmedLine.startsWith("[") ||
        trimmedLine.startsWith("]") ||
        trimmedLine.startsWith('"') ||
        trimmedLine.endsWith(",") ||
        trimmedLine.length === 0
      );
    });
    const cleanedJsonString = cleanedLines.join("\n");
    console.log("Attempting to parse cleaned JSON:", cleanedJsonString);
    try {
      return JSON.parse(cleanedJsonString);
    } catch (finalError) {
      console.error("Failed to parse even after advanced cleanup.", finalError);
      throw new Error(
        "The AI response contained fatally broken JSON that could not be repaired."
      );
    }
  }
}

export default function TripPlannerPage() {
  const [prompt, setPrompt] = useState("");
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(true);

  const handleSubmit = async () => {

    if (!prompt.trim() && !useMockData) return;

    setTripPlan(null);
    setError(null);
    setIsLoading(true);

    try {
      let sdkResponses: SDKResponse[];
      if (useMockData) {
        console.log(" MOCK MODE: Using saved data.");
        sdkResponses = mockApiResponse as SDKResponse[];
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.log("🚀 LIVE MODE: Making a real API call for prompt:", prompt);
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, mode: "quality" }),
        });
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            const text = await response.text();
            errorMessage = `Server error (${response.status}): ${text.substring(
              0,
              100
            )}...`;
          }
          throw new Error(errorMessage);
        }
        sdkResponses = await response.json();
      }

      console.log("📦 Received raw SDK responses:", sdkResponses);
      const finalAgentResponse = sdkResponses
        .filter((r) => r.type === "agent_response")
        .pop();

      if (finalAgentResponse?.content) {
        console.log(
          "📝 Raw content from FINAL agent response:",
          finalAgentResponse.content
        );
        const parsedContent = parseLenientJson(finalAgentResponse.content);
        console.log("✅ Successfully parsed content with lenient parser.");
        console.log("🔧 Parsed content before normalization:", parsedContent);

        if (Array.isArray(parsedContent)) {
          const firstElement = parsedContent[0];
          let flightsData: FlightsInfo | undefined = undefined;
          let accommodationData: AccommodationDetails | undefined = undefined;

          if (
            firstElement &&
            (firstElement.flights ||
              firstElement.fl ||
              firstElement.accommodation)
          ) {
            console.log(
              "Found flights/accommodation object in the first element."
            );
            flightsData = firstElement.flights || firstElement.fl;
            accommodationData = firstElement.accommodation;
            parsedContent.shift();
          }

          const finalTripPlan: TripPlan = {
            flights: flightsData,
            accommodation: accommodationData,
            itinerary: parsedContent as DayItinerary[],
          };

          console.log(
            " النهائية Final trip plan object being set to state:",
            finalTripPlan
          );
          setTripPlan(finalTripPlan);
        } else {
          setError("The trip plan format was unexpected.");
        }
      } else {
        setError("Could not find a final agent response with content.");
      }
    } catch (err: any) {
      console.error("Frontend error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl w-full">
        <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm p-3 rounded-lg mb-4 shadow-sm w-fit mx-auto">
    <Switch 
    id="mock-mode"
    checked={useMockData}
    onCheckedChange={setUseMockData}
  />
  <Label htmlFor="mock-mode" className="font-medium text-gray-700 transition-colors">
    {useMockData
      ? 'Mock Mode (No API Call)'
      : 'Live API (Uses Credits)'}
  </Label>

  </div>
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-center text-blue-700">
              AI Trip Planner
            </CardTitle>
            <CardDescription className="text-center text-gray-600 mt-2">
              Tell me where you want to go, for how long, and what your
              interests are!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full space-x-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Plan a 3-day fishing trip to New York from Lagos."
                disabled={isLoading}
                className="flex-grow p-3 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading && prompt.trim()) {
                    handleSubmit();
                  }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
                className="px-6 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Planning...
                  </>
                ) : (
                  "Plan Trip"
                )}
              </Button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-4 text-center animate-fade-in">
                Error: {error}
              </p>
            )}
          </CardContent>
        </Card>

        {tripPlan && (
          <div className="space-y-6 animate-fade-in-up delay-100">
            {(tripPlan.flights || tripPlan.accommodation) && (
              <Card className="shadow-md border-l-4 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                    <Info className="w-5 h-5" /> Trip Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tripPlan.flights?.outbound ? (
                    <div>
                      <h3 className="font-semibold flex items-center gap-1 text-lg mb-2">
                        <Plane className="w-4 h-4" /> Flights
                      </h3>
                      <p className="ml-6 text-sm">
                        <strong>Outbound:</strong>{" "}
                        {tripPlan.flights.outbound.origin} to{" "}
                        {tripPlan.flights.outbound.destination}
                        {tripPlan.flights.outbound.durationEstimate}
                      </p>
                      {tripPlan.flights.return && (
                        <p className="ml-6 text-sm">
                          <strong>Return:</strong>{" "}
                          {tripPlan.flights.return.origin} to{" "}
                          {tripPlan.flights.return.destination} (~
                          {tripPlan.flights.return.durationEstimate})
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold flex items-center gap-1 text-lg mb-2">
                        <Plane className="w-4 h-4" /> Flights
                      </h3>
                      <p className="ml-6 text-sm text-gray-500">
                        No flight details provided.
                      </p>
                    </div>
                  )}

                  {tripPlan.accommodation ? (
                    <div>
                      <h3 className="font-semibold flex items-center gap-1 text-lg mb-2">
                        <Hotel className="w-4 h-4" /> Accommodation
                      </h3>
                      <p className="ml-6 text-sm">
                        <strong>Stay:</strong> {tripPlan.accommodation.name} (
                        {tripPlan.accommodation.type})
                      </p>
                      {tripPlan.accommodation.location && (
                        <p className="ml-6 text-sm">
                          <strong>Location:</strong>{" "}
                          {tripPlan.accommodation.location}
                        </p>
                      )}
                      <p className="ml-6 text-sm">
                        <strong>Est. Price:</strong>{" "}
                        {tripPlan.accommodation.costEstimatePerNight}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold flex items-center gap-1 text-lg mb-2">
                        <Hotel className="w-4 h-4" /> Accommodation
                      </h3>
                      <p className="ml-6 text-sm text-gray-500">
                        No accommodation details provided.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

           <Accordion type="single" collapsible className="w-full">
  {tripPlan.itinerary.map((dayPlan, index) => (
    <AccordionItem value={`day-${dayPlan.day}`} key={dayPlan.day} className="bg-white rounded-lg shadow-md mb-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
      <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
        <div className="flex flex-col items-start">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" /> Day {dayPlan.day}
          </h2>
          <p className="text-sm text-blue-600 font-medium">{dayPlan.theme}</p>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-6">
        <div className="space-y-4">
          {dayPlan.activities.map((activity, actIndex) => (
            <div key={actIndex} className="flex items-start space-x-3">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-gray-700">{activity.time} - {activity.description}</p>
                {activity.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {activity.location}
                    </p>
                )}
              </div>
            </div>
          ))}
          {dayPlan.notes && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start space-x-3 text-sm text-gray-600">
                <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-1" />
                <p>Notes: {dayPlan.notes}</p>
              </div>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
          </div>
        )}
      </div>
    </main>
  );
}
