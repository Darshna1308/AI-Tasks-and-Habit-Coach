// server.js
// AI Task & Habit Coach using Hugging Face router (OpenAI-compatible API)

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const port = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai";

if (!HF_TOKEN) {
  console.warn("⚠️ HF_TOKEN is not set in .env");
}

// Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves index.html etc.

// Hugging Face router client (OpenAI-compatible)
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HF_TOKEN,
});

// Build prompts
function buildPrompts(type, goals, days, minutesPerDay, tone) {
  const goalsText = goals.join(", ");
  const safeDays = days || 7;
  const safeMinutes = minutesPerDay || 30;

  let toneLine;
  if (tone === "strict") {
    toneLine = "Be a bit strict but still kind.";
  } else if (tone === "funny") {
    toneLine = "You can be playful and slightly funny.";
  } else {
    toneLine = "Use a friendly, supportive tone.";
  }

  if (type === "plan") {
    const system = `
You are a helpful habit coach for college students.
You make realistic, simple daily plans with clear bullet points.
${toneLine}
`;
    const user = `
User's goals:
${goalsText}

The user can spend about ${safeMinutes} minutes per day for ${safeDays} days.

Create a daily plan for each day.

For each day, give:
- Day number (Day 1, Day 2, ...)
- Micro-tasks for each goal (2–4 bullet points)
- Total time roughly matching the minutes per day

Use very simple English.
Use bullet points.
Keep it practical and not too long.
`;
    return { system, user };
  }

  if (type === "motivation") {
    const system = `
You are a motivational coach writing short, non-cringe messages for students.
${toneLine}
`;
    const user = `
User's goals:
${goalsText}

Generate 5 short motivation lines (max 1 sentence each).
Make them specific to these goals and not generic quotes.
Use very simple English.
`;
    return { system, user };
  }

  if (type === "review") {
    const system = `
You are a habit coach who helps users reflect on their week honestly but kindly.
${toneLine}
`;
    const user = `
User's goals:
${goalsText}

Create 7 reflection questions for weekly review.
Include questions about:
- What went well
- What was hard
- What to change next week

Use simple language.
1–2 lines per question.
`;
    return { system, user };
  }

  return {
    system: "",
    user: "Say: Invalid type for AI Task & Habit Coach.",
  };
}

// Test route
app.get("/ping", (req, res) => {
  res.send("Server is working ✅ (HF router mode)");
});

// Main AI route
app.post("/generate", async (req, res) => {
  try {
    const { type, goals, days, minutesPerDay, tone } = req.body;

    if (!type || !goals || !Array.isArray(goals) || goals.length === 0) {
      return res
        .status(400)
        .json({ error: "type and at least one goal are required" });
    }

    if (!HF_TOKEN) {
      return res.status(500).json({
        error: "HF_TOKEN is missing. Set it in .env and restart server.",
      });
    }

    const { system, user } = buildPrompts(
      type,
      goals,
      days,
      minutesPerDay,
      tone
    );

    const response = await client.chat.completions.create({
      model: HF_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
    });

    const aiText = response.choices[0].message.content;
    res.json({ result: aiText });
  } catch (err) {
    console.error("Error from /generate (HF router):", err);
    res.status(500).json({
      error:
        "Hugging Face router error (check token/model/quota). See backend logs.",
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port} (HF router mode)`);
});
