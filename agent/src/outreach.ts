import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './conversation-driver';

export interface EmailOutreachPayload {
  companyName: string;
  contactEmail: string;
  contactName: string;
  score: number;
  issues: string[];
  reportUrl: string;
  transcript: ChatMessage[];
}

export class EmailOutreach {
  private resend: Resend | null = null;
  private ai: GoogleGenerativeAI;

  constructor() {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      this.resend = new Resend(resendKey);
    } else {
      console.log('RESEND_API_KEY is not defined. Email dispatch will operate in dry-run mode, printing to logs.');
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not defined in environment.');
    this.ai = new GoogleGenerativeAI(geminiKey);
  }

  async draftEmail(payload: EmailOutreachPayload): Promise<{ subject: string; body: string }> {
    const model = this.ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const transcriptSummary = payload.transcript
      .map(msg => `${msg.role === 'user' ? 'Customer' : 'Bot'}: ${msg.content}`)
      .slice(-4)
      .join('\n');

    const prompt = `
      Draft a highly personalized, high-converting cold outreach sales email to a prospect on behalf of "Tryda" (an AI reliability & drift monitoring platform).
      
      Here are the lead details:
      - Target Company Name: "${payload.companyName}"
      - Recipient Name: "${payload.contactName}" (Head of Customer Experience/Support or Product Lead)
      - Chatbot Quality Score: ${payload.score}/100
      - Key Issues Discovered: ${JSON.stringify(payload.issues)}
      - Generated Public Diagnostic Report URL: "${payload.reportUrl}"
      
      Last 4 messages of the test transcript:
      ${transcriptSummary}

      Goal of the Email:
      We want to share the result of an automated diagnostic test we ran on their public AI chatbot today. 
      Because we detected specific quality issues (like: ${payload.issues.join(', ')}), we want to show them how Tryda can monitor their AI assistant 24/7 to catch these slips before customers do.

      Tone of the Email:
      - Direct, professional, non-spammy, and value-first.
      - Short and punchy (under 150 words).
      - Address them by name.
      - Highlight the actual issue detected and provide the link to their complete Tryda report.

      Please output your response strictly in JSON format:
      {
        "subject": "The email subject line (make it clicky, short, e.g. 'Quick audit of your AI assistant (score: X%)')",
        "body": "The plain-text email body. Use placeholders like [Recipient Name] or refer to payload fields as appropriate, but the body itself should be fully written with real text."
      }
    `;

    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      });
      const data = JSON.parse(response.response.text() || '{}');
      return {
        subject: data.subject || `Diagnostic report for ${payload.companyName}'s AI assistant`,
        body: data.body || `Hi ${payload.contactName},\n\nWe ran a quick automated audit on your website's AI support chatbot today. It scored a ${payload.score}/100, and we detected a few potential quality gaps: ${payload.issues.join(', ')}.\n\nYou can view the full diagnostic log and our actionable recommendation report here: ${payload.reportUrl}\n\nBest regards,\nTryda Outbound Team`
      };
    } catch (err: any) {
      console.error('Error drafting email with Gemini:', err.message || err);
      return {
        subject: `Automated QA Audit for ${payload.companyName}'s Support Bot`,
        body: `Hi ${payload.contactName},\n\nWe recently analyzed the quality and policy boundaries of the AI support assistant on your landing page. While it handles basic greetings perfectly, it showed some vulnerabilities when probed on custom policies and discount eligibility.\n\nWe generated a detailed Tryda Audit Report with our specific recommended prompt adjustments: ${payload.reportUrl}\n\nLet me know if you would like us to help you wire up continuous 24/7 reliability monitoring!\n\nBest,\nTryda Outbound Team`
      };
    }
  }

  async sendEmail(payload: EmailOutreachPayload): Promise<{ success: boolean; emailId?: string }> {
    const draft = await this.draftEmail(payload);
    
    console.log('\n=== Drafted Outreach Email ===');
    console.log(`To: ${payload.contactEmail} (${payload.contactName})`);
    console.log(`Subject: ${draft.subject}`);
    console.log(`Body:\n${draft.body}\n=============================\n`);

    if (!this.resend) {
      console.log('Operating in Resend Dry-Run Mode. No actual email sent.');
      return { success: true };
    }

    try {
      const response = await this.resend.emails.send({
        from: 'Tryda Growth Team <aireports@tryda.io>', // Using the premium custom domain
        to: payload.contactEmail,
        subject: draft.subject,
        text: draft.body,
      });

      console.log(`Email dispatched successfully! ID: ${response.data?.id}`);
      return { success: true, emailId: response.data?.id };
    } catch (err: any) {
      console.error('Failed to send email via Resend API:', err.message || err);
      return { success: false };
    }
  }
}
