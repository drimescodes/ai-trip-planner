// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Agentbase from 'agentbase-sdk';

// Create Agentbase client
function createAgentbaseClient() {
  const apiKey = process.env.AGENTBASE_API_KEY;

  if (!apiKey) {
    throw new Error('AGENTBASE_API_KEY not found in environment variables');
  }

  const client = new Agentbase({
    apiKey: apiKey,
  });
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, session, mode } = body; // Keep parameters simple for now

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let agentbase: Agentbase;
    try {
      agentbase = createAgentbaseClient();
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Agentbase SDK not available' }, { status: 500 });
    }

const systemPrompt = `You are an expert travel agent that functions as a JSON API. Your response MUST be a raw JSON array and nothing else. Do not include any conversational text, introductions, or markdown formatting like \`\`\`json.

Your output MUST follow this exact structure:
1. The FIRST element in the array is an object containing "flights" and "accommodation" details.
2. All SUBSEQUENT elements are objects representing the daily itinerary.

HERE IS A PERFECT EXAMPLE OF THE REQUIRED JSON STRUCTURE. FOLLOW IT EXACTLY:
[
  {
    "flights": {
      "outbound": {
        "origin": "New York (JFK)",
        "destination": "Paris (CDG)",
        "costEstimate": "$150",
        "durationEstimate": "7h 30m"
      },
      "return": {
        "origin": "Paris (CDG)",
        "destination": "New York (JFK)",
        "costEstimate": "$180",
        "durationEstimate": "8h 15m"
      }
    },
    "accommodation": {
      "name": "Le Petit Hotel",
      "type": "Boutique Hotel",
      "costEstimatePerNight": "$200"
    }
  },
  {
    "day": 1,
    "theme": "Arrival & Local Exploration",
    "activities": [
      {
        "time": "14:00",
        "description": "Check into hotel and drop off luggage",
        "location": "Le Petit Hotel"
      },
      {
        "time": "16:00",
        "description": "Walk through the Marais district",
        "location": "Le Marais"
      }
    ]
  }
]`;


    const params = {
      message,
      ...(session && { session }),
      ...(mode && { mode }),
      system: systemPrompt, // Inject the system prompt here!
      streaming: false, // Disable streaming for complete responses
    };

    const agentStream = await agentbase.runAgent(params);

    const responses = [];
    for await (const response of agentStream) {
      responses.push(response);
    }

    // Return all responses for the frontend to process
    return NextResponse.json(responses);
  } catch (error: any) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}