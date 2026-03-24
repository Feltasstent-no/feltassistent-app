import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SummaryRequest {
  entry_id: string;
}

interface StageData {
  stage_number: number;
  field_figure: {
    code: string;
    name: string;
    distance_m: number;
  };
  clicks: number;
  clicks_to_zero: number;
  documentation?: {
    has_image: boolean;
    notes?: string;
  };
}

interface AIInput {
  competition: {
    name: string;
    type: string;
    date: string;
  };
  stages: StageData[];
}

interface AIResponse {
  summary: {
    introduction: string;
    per_hold: Array<{
      stage_number: number;
      comment: string;
      data_basis: 'notater' | 'begrenset' | 'ingen';
    }>;
    overall_observations: string[];
    improvement_suggestions: string[];
  };
  metadata: {
    generated_at: string;
    model_used: string;
    data_quality: 'complete' | 'partial' | 'minimal';
    tokens_used?: number;
  };
  disclaimers: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Parse request
    const { entry_id }: SummaryRequest = await req.json();

    if (!entry_id) {
      throw new Error("entry_id is required");
    }

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if summary already exists and is recent (less than 1 hour old)
    const { data: existingSummary } = await supabase
      .from("competition_ai_summaries")
      .select("*")
      .eq("entry_id", entry_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingSummary) {
      const generatedAt = new Date(existingSummary.generated_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (generatedAt > hourAgo) {
        // Return cached summary
        return new Response(
          JSON.stringify({
            success: true,
            summary: existingSummary.summary_json,
            cached: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch competition data
    const { data: entry, error: entryError } = await supabase
      .from("competition_entries")
      .select("*, competitions(*)")
      .eq("id", entry_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (entryError || !entry) {
      throw new Error("Entry not found or access denied");
    }

    const competition = entry.competitions as any;

    // Fetch stages
    const { data: stages, error: stagesError } = await supabase
      .from("competition_stages")
      .select("*")
      .eq("competition_id", competition.id)
      .order("stage_number");

    if (stagesError) {
      throw new Error("Failed to fetch stages");
    }

    // Fetch stage images
    const { data: stageImages, error: imagesError } = await supabase
      .from("competition_stage_images")
      .select("*")
      .eq("entry_id", entry_id)
      .order("stage_number");

    if (imagesError) {
      throw new Error("Failed to fetch stage images");
    }

    // Fetch field figures
    const { data: figures, error: figuresError } = await supabase
      .from("field_figures")
      .select("*");

    if (figuresError) {
      throw new Error("Failed to fetch field figures");
    }

    // Build AI input
    const aiInput: AIInput = {
      competition: {
        name: competition.name,
        type: competition.competition_type,
        date: new Date(entry.created_at).toLocaleDateString("nb-NO"),
      },
      stages: stages.map((stage: any) => {
        const figure = figures.find((f: any) => f.id === stage.field_figure_id);
        const stageImage = stageImages.find(
          (img: any) => img.stage_number === stage.stage_number
        );

        return {
          stage_number: stage.stage_number,
          field_figure: {
            code: figure?.code || "?",
            name: figure?.name || "Ukjent",
            distance_m: stage.distance_m,
          },
          clicks: stage.clicks || 0,
          clicks_to_zero: stage.clicks_to_zero || 0,
          documentation: stageImage
            ? {
                has_image: !!stageImage.image_url,
                notes: stageImage.notes || undefined,
              }
            : undefined,
        };
      }),
    };

    // Generate AI summary using Claude API
    const aiResponse: AIResponse = await generateClaudeSummary(aiInput);

    // Determine data quality
    const dataQuality = calculateDataQuality(aiInput.stages);

    // Deactivate old summaries
    if (existingSummary) {
      await supabase
        .from("competition_ai_summaries")
        .update({ is_active: false })
        .eq("entry_id", entry_id)
        .eq("user_id", user.id);
    }

    // Save new summary
    const { error: insertError } = await supabase
      .from("competition_ai_summaries")
      .insert({
        entry_id,
        user_id: user.id,
        summary_json: aiResponse,
        model_used: aiResponse.metadata.model_used,
        data_quality: dataQuality,
        tokens_used: aiResponse.metadata.tokens_used || 0,
        version: (existingSummary?.version || 0) + 1,
        is_active: true,
      });

    if (insertError) {
      throw new Error("Failed to save summary");
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: aiResponse,
        cached: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateDataQuality(
  stages: StageData[]
): "complete" | "partial" | "minimal" {
  const stagesWithNotes = stages.filter(
    (s) => s.documentation?.notes
  ).length;
  const ratio = stagesWithNotes / stages.length;

  if (ratio >= 0.75) return "complete";
  if (ratio >= 0.25) return "partial";
  return "minimal";
}

async function generateClaudeSummary(input: AIInput): Promise<AIResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not configured, falling back to mock");
    return generateMockSummary(input);
  }

  try {
    const prompt = buildPromptForClaude(input);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const parsed = JSON.parse(content);

    return {
      summary: {
        introduction: parsed.introduction,
        per_hold: parsed.per_hold.map((h: any) => ({
          stage_number: h.stage_number,
          comment: h.comment,
          data_basis: h.data_basis,
        })),
        overall_observations: parsed.overall_observations,
        improvement_suggestions: parsed.improvement_suggestions,
      },
      metadata: {
        generated_at: new Date().toISOString(),
        model_used: "claude-3-5-sonnet-20241022",
        data_quality: calculateDataQuality(input.stages),
        tokens_used: data.usage.input_tokens + data.usage.output_tokens,
      },
      disclaimers: [
        "Dette er en AI-generert vurdering basert på tilgjengelige data",
        "Jeg har ikke sett faktiske treffbilder eller offisiell poengsum",
        "Vurderingen erstatter ikke feedback fra instruktør eller offisiell evaluering",
      ],
    };
  } catch (error) {
    console.error("Claude API failed, falling back to mock:", error);
    return generateMockSummary(input);
  }
}

function buildPromptForClaude(input: AIInput): string {
  const { competition, stages } = input;

  const stagesDesc = stages
    .map((s) => {
      let desc = `\n**Hold ${s.stage_number}:**`;
      desc += `\n- Figur: ${s.field_figure.code} (${s.field_figure.name})`;
      desc += `\n- Avstand: ${s.field_figure.distance_m}m`;
      desc += `\n- Knepp brukt: ${s.clicks}`;

      if (s.documentation?.notes) {
        desc += `\n- Brukerens notat: "${s.documentation.notes}"`;
      } else if (s.documentation?.has_image) {
        desc += `\n- Dokumentasjon: Kun bilde, ingen tekstnotat`;
      } else {
        desc += `\n- Dokumentasjon: Ingen`;
      }

      return desc;
    })
    .join("\n");

  return `Du er en hjelpsom assistent for feltskyttere. En bruker har gjennomført et stevne og ønsker refleksjon over prestasjonen.

**Stevne:**
- Navn: ${competition.name}
- Type: ${competition.type}
- Dato: ${competition.date}
- Antall hold: ${stages.length}

**Hold-data:**
${stagesDesc}

**Din oppgave:**

Generer en refleksjon i JSON-format med følgende struktur:

\`\`\`json
{
  "introduction": "En kort intro (2-3 setninger) som oppsummerer stevnet",
  "per_hold": [
    {
      "stage_number": 1,
      "comment": "Kommentar om dette holdet",
      "data_basis": "notater" | "begrenset" | "ingen"
    }
  ],
  "overall_observations": [
    "Observasjon 1",
    "Observasjon 2"
  ],
  "improvement_suggestions": [
    "Forslag 1",
    "Forslag 2"
  ]
}
\`\`\`

**Viktige regler:**

1. **Data-forankring:**
   - Hvis bruker har skrevet notat: SITER fra notatet eksplisitt. Bruk format: "Du skrev: '[sitat]'. [analyse]"
   - Hvis kun bilde: Vær beskjeden, nevn at tekstnotat ville hjulpet
   - Hvis ingen data: Kun faktaopplysninger, ingen gjetninger

2. **Data_basis klassifisering:**
   - "notater": Hvis tekstnotat finnes
   - "begrenset": Hvis kun bilde finnes
   - "ingen": Hvis ingen dokumentasjon

3. **Tone:**
   - Støttende og konstruktiv
   - Unngå floskler og generelle råd
   - Fokus på det brukeren faktisk har dokumentert
   - Norsk språk
   - Bruk forsiktig språk: "kan tyde på", "ser ut til", "basert på notatet ditt"

4. **Ikke gjør:**
   - Ikke spekuler om treffbilder
   - Ikke gi poengsum
   - Ikke sammenlign med andre
   - Ikke kritiser hardt

5. **Output:**
   - Returner KUN valid JSON
   - Ingen markdown, ingen forklaring
   - Bare JSON-objektet

Svar nå med JSON:`;
}

function generateMockSummary(input: AIInput): AIResponse {
  const { competition, stages } = input;

  // Generate per-hold comments
  const perHold = stages.map((stage) => {
    let comment = "";
    let dataBasis: "notater" | "begrenset" | "ingen" = "ingen";

    if (stage.documentation?.notes) {
      dataBasis = "notater";
      const notes = stage.documentation.notes;
      comment = `Du skrev: "${notes.substring(0, 50)}${notes.length > 50 ? "..." : ""}". `;

      if (notes.toLowerCase().includes("vind")) {
        comment += "Bevisst vindforhold. ";
      }
      if (notes.toLowerCase().includes("bra") || notes.toLowerCase().includes("god")) {
        comment += "Positiv opplevelse.";
      }
      if (notes.toLowerCase().includes("dårlig") || notes.toLowerCase().includes("problem")) {
        comment += "Utfordringer notert.";
      }
    } else if (stage.documentation?.has_image) {
      dataBasis = "begrenset";
      comment = `Bilde dokumentert, men uten tekstnotater. ${stage.clicks} knepp på ${stage.field_figure.distance_m}m.`;
    } else {
      dataBasis = "ingen";
      comment = `Ingen dokumentasjon fra dette holdet. ${stage.clicks} knepp brukt på ${stage.field_figure.distance_m}m.`;
    }

    return {
      stage_number: stage.stage_number,
      comment: comment.trim(),
      data_basis: dataBasis,
    };
  });

  // Generate overall observations
  const observations: string[] = [];
  const stagesWithNotes = stages.filter((s) => s.documentation?.notes).length;
  const stagesWithImages = stages.filter((s) => s.documentation?.has_image).length;

  if (stagesWithNotes > 0) {
    observations.push(
      `Du dokumenterte ${stagesWithNotes} av ${stages.length} hold med tekstnotater`
    );
  }

  if (stagesWithImages > 0) {
    observations.push(
      `${stagesWithImages} hold har bildebevis`
    );
  }

  const distances = stages.map((s) => s.field_figure.distance_m);
  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);
  observations.push(
    `Avstander varierte fra ${minDist}m til ${maxDist}m`
  );

  // Generate suggestions
  const suggestions: string[] = [];
  if (stagesWithNotes < stages.length) {
    suggestions.push(
      "Dokumentér alle hold med notater - selv korte observasjoner hjelper i etteranalyse"
    );
  }

  if (stagesWithImages < stages.length) {
    suggestions.push(
      "Ta bilde av alle gravlapper for komplett dokumentasjon"
    );
  }

  // Introduction
  const introduction = `Du gjennomførte ${competition.name} (${competition.type}) med ${stages.length} hold den ${competition.date}. Dokumentasjonen varierer i detalj mellom holdene.`;

  return {
    summary: {
      introduction,
      per_hold: perHold,
      overall_observations: observations,
      improvement_suggestions: suggestions.length > 0 ? suggestions : ["Fortsett dokumenteringsvanen - du er på rett vei"],
    },
    metadata: {
      generated_at: new Date().toISOString(),
      model_used: "mock-v1",
      data_quality: calculateDataQuality(stages),
    },
    disclaimers: [
      "Dette er en AI-generert vurdering basert på tilgjengelige data",
      "Jeg har ikke sett faktiske treffbilder eller offisiell poengsum",
      "Vurderingen erstatter ikke feedback fra instruktør eller offisiell evaluering",
    ],
  };
}
