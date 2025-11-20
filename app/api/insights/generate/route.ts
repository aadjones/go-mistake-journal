import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/insights/generate
 * Generate insights from recent mistakes using Claude API
 * Query params:
 *   - limit: number of mistakes to analyze (default: 50, use 0 or 'all' for all mistakes)
 */
export async function POST(request: Request) {
  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json(
        {
          error:
            'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your .env file.',
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const useAllMistakes = limitParam === 'all' || limitParam === '0';
    const limit = useAllMistakes ? undefined : parseInt(limitParam || '50', 10);

    // Fetch recent mistakes (with game data)
    const mistakes = await prisma.mistake.findMany({
      ...(limit ? { take: limit } : {}),
      orderBy: { createdAt: 'desc' },
      include: { game: true },
    });

    if (mistakes.length === 0) {
      return NextResponse.json(
        { error: 'No mistakes found. Record some mistakes first!' },
        { status: 400 }
      );
    }

    // Format mistakes for Claude
    const mistakesSummary = mistakes
      .map((m, idx) => {
        const gameContext = `${m.game.playerColor} vs ${m.game.opponentRating || 'opponent'}, ${m.game.timeControl || 'unknown time control'}`;
        return `${idx + 1}. [${m.primaryTag}] ${m.briefDescription}
   Game: ${gameContext}
   Reflection: ${m.detailedReflection || 'No detailed reflection'}`;
      })
      .join('\n\n');

    // Call Claude API
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are analyzing Go mistakes to help a player improve. Below are ${mistakes.length} recent mistakes they've recorded:

${mistakesSummary}

Identify 3-5 recurring patterns or themes based ONLY on what the player explicitly wrote. Rules:
1. Only synthesize what they explicitly mentioned - do not invent problems
2. Quote their own words when relevant
3. Look for emotional patterns, thought process issues, or subtle themes they might not see
4. Be specific but concise
5. Focus on actionable insights
6. When referencing specific mistakes, use the format "mistakes #1, #5, #10" (with the word "mistakes" plural, followed by hash numbers)

Return your analysis as a JSON array of insight objects with this structure:
[
  {
    "title": "Brief pattern name (5-8 words)",
    "description": "Detailed explanation with quotes (2-3 sentences). When citing examples, use format: 'in mistakes #4, #10, #26 they note...'",
    "mistakeCount": number of mistakes showing this pattern
  }
]

Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from Claude response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse insights from AI response' },
        { status: 500 }
      );
    }

    let insights;
    try {
      insights = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in AI response' }, { status: 500 });
    }

    // Validate structure
    if (!Array.isArray(insights)) {
      console.error('Expected array of insights, got:', typeof insights);
      return NextResponse.json({ error: 'Expected array of insights from AI' }, { status: 500 });
    }

    // Validate each insight object
    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];
      if (!insight.title || typeof insight.title !== 'string') {
        console.error(`Insight ${i} missing or invalid title:`, insight);
        return NextResponse.json({ error: `Insight ${i + 1} has invalid title` }, { status: 500 });
      }
      if (!insight.description || typeof insight.description !== 'string') {
        console.error(`Insight ${i} missing or invalid description:`, insight);
        return NextResponse.json(
          { error: `Insight ${i + 1} has invalid description` },
          { status: 500 }
        );
      }
      if (typeof insight.mistakeCount !== 'number') {
        console.error(`Insight ${i} missing or invalid mistakeCount:`, insight);
        return NextResponse.json(
          { error: `Insight ${i + 1} has invalid mistakeCount` },
          { status: 500 }
        );
      }
    }

    // Create mistake IDs map (index 0 = mistake ID at position 0, etc.)
    const mistakeIdsMap = mistakes.map(m => m.id);

    // Save insights to database
    const savedInsight = await prisma.insight.create({
      data: {
        content: JSON.stringify(insights),
        mistakesAnalyzed: mistakes.length,
        mistakeIdsMap: JSON.stringify(mistakeIdsMap),
      },
    });

    return NextResponse.json({
      id: savedInsight.id,
      insights,
      mistakesAnalyzed: mistakes.length,
      generatedAt: savedInsight.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate insights:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
