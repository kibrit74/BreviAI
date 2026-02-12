import { NextRequest, NextResponse } from 'next/server';

// Feedback store (in production, use a database)
const feedbackStore: Array<{
    id: string;
    prompt: string;
    shortcut_id?: string;
    type: 'error' | 'improvement' | 'success';
    message: string;
    timestamp: Date;
}> = [];

/**
 * POST /api/feedback
 * Submit feedback for failed or improved shortcuts
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, shortcut_id, type, message } = body;

        if (!type || !['error', 'improvement', 'success'].includes(type)) {
            return NextResponse.json(
                { success: false, error: 'Geçerli tip gerekli: error, improvement, success' },
                { status: 400 }
            );
        }

        const feedback = {
            id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            prompt: prompt || '',
            shortcut_id,
            type,
            message: message || '',
            timestamp: new Date()
        };

        feedbackStore.push(feedback);

        console.log(`[Feedback] New ${type} feedback:`, feedback);

        return NextResponse.json({
            success: true,
            feedback_id: feedback.id,
            message: 'Geri bildiriminiz alındı. Teşekkürler!'
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Geçersiz istek' },
            { status: 400 }
        );
    }
}

/**
 * GET /api/feedback
 * Get feedback statistics (admin only)
 */
export async function GET(request: NextRequest) {
    // Simple admin check
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json(
            { success: false, error: 'Yetkisiz' },
            { status: 401 }
        );
    }

    const stats = {
        total: feedbackStore.length,
        by_type: {
            error: feedbackStore.filter(f => f.type === 'error').length,
            improvement: feedbackStore.filter(f => f.type === 'improvement').length,
            success: feedbackStore.filter(f => f.type === 'success').length
        },
        recent: feedbackStore.slice(-10)
    };

    return NextResponse.json({
        success: true,
        stats
    });
}
