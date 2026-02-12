import { NextResponse } from 'next/server';
import { getFlash25Model } from '@/lib/gemini';
import { SYSTEM_PROMPT_TURKISH } from '@/lib/prompt-templates';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const model = getFlash25Model();

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT_TURKISH },
      { text: `User Request: ${prompt}` }
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean markdown code blocks if present
    let jsonStr = text.trim();

    // Declaring data variable in outer scope
    let data: any = null;

    // Strategy 1: Attempt to parse directly (best case)
    try {
      data = JSON.parse(jsonStr);
    } catch (e1) {
      // Strategy 2: Extract from markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
        try {
          data = JSON.parse(jsonStr);
        } catch (e2) {
          // proceed to strategy 3
        }
      }
    }

    // Strategy 3: Find first '{' and last '}' (if still no data)
    if (!data) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = text.substring(firstBrace, lastBrace + 1);
      }
    }

    // Final Attempt
    if (!data) {
      try {
        data = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[Admin Generate] JSON Parse Error. Raw text:', text);
        console.error('[Admin Generate] Extracted string:', jsonStr);
        throw new Error('AI response was not valid JSON.');
      }
    }

    console.log('[Admin Generate] Parsed data successfully.');

    // NORMALIZATION LAYER (Fixing AI & Seed Discrepancies)
    // If AI returns old "steps" format, convert it to "nodes" & "edges"
    const workflowData = data.workflow || data; // Handle if wrapped in "workflow" key or root

    if ((!workflowData.nodes || workflowData.nodes.length === 0) && workflowData.steps && workflowData.steps.length > 0) {
      console.log('[Admin Generate] converting legacy steps to nodes...');
      const newNodes: any[] = [];
      const newEdges: any[] = [];

      // 1. Add Trigger
      newNodes.push({
        id: '1',
        type: 'MANUAL_TRIGGER',
        label: 'Manually Triggered',
        position: { x: 250, y: 50 },
        config: {}
      });

      let previousNodeId = '1';
      let yPos = 150;

      // 2. Convert Steps
      workflowData.steps.forEach((step: any, index: number) => {
        const nodeId = (index + 2).toString();
        // Map old types to new types (simplified mapping)
        let newType = step.type || 'APP_LAUNCH';
        if (step.type === 'SYSTEM_ACTION') newType = 'FLASHLIGHT_CONTROL'; // Example fallback
        if (step.action === 'toggle_flashlight') newType = 'FLASHLIGHT_CONTROL';

        newNodes.push({
          id: nodeId,
          type: newType,
          label: step.action || 'Action',
          position: { x: 250, y: yPos },
          config: step.params || {}
        });

        newEdges.push({
          id: `e${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId
        });

        previousNodeId = nodeId;
        yPos += 100;
      });

      // Use the converted data
      data = {
        nodes: newNodes,
        edges: newEdges,
        name: workflowData.shortcut_name || 'Converted Shortcut'
      };
    } else if (data.workflow) {
      // Unwrap if nested
      data = data.workflow;
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
