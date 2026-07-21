import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { chromium, Browser, Page } from 'playwright';
import { ChatCrawler } from './crawler';

dotenv.config();

const KEY_PATH = '/home/ajayidamilarefelix/Tryda/backend/tryda-firebase-key.json';

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(KEY_PATH),
    projectId: 'tryda-app',
  });
  console.log('Firebase Admin initialized successfully in Prospector.');
} catch (err: any) {
  // Already initialized or other error
  console.log('Firebase Admin info:', err.message || err);
}

const db = admin.firestore();

interface LeadQueueItem {
  companyName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  industry: string;
  description: string;
  status: 'pending' | 'completed';
  createdAt: string;
  chatWidget?: string;
}

/**
 * Uses Gemini to generate dynamic search queries to discover companies.
 */
async function generateSearchKeywords(ai: GoogleGenerativeAI): Promise<string[]> {
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
    You are the lead generation strategist for Tryda, an AI chatbot audit and security platform.
    Generate a list of exactly 3 distinct search queries to find business websites or SaaS platforms that are highly likely to have a customer support chatbot (e.g. Crisp, Intercom, HubSpot, Zendesk) on their site.
    
    Example queries:
    - "SaaS platform crisp chat contact"
    - "Shopify boutique live chat customer service"
    - "AI customer support automation platform"
    
    Output the queries as a raw JSON array of strings:
    ["query 1", "query 2", "query 3"]
    
    Provide ONLY the raw JSON. No markdown backticks, no comments, no formatting.
  `;

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text()?.trim() || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const queries = JSON.parse(cleaned);
    if (Array.isArray(queries) && queries.length > 0) {
      console.log('Gemini generated search keywords:', queries);
      return queries;
    }
  } catch (err: any) {
    console.error('Failed to generate search keywords, using defaults:', err.message || err);
  }
  return [
    'SaaS platform crisp chat contact',
    'Shopify boutique with live chat widget',
    'AI customer service platform for startups'
  ];
}

/**
 * Searches DuckDuckGo HTML and returns up to `limit` parsed website root URLs.
 */
async function searchWeb(query: string, limit = 5): Promise<string[]> {
  console.log(`Searching DuckDuckGo for: "${query}"...`);
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const title = await page.title();
    console.log(`DuckDuckGo page title: "${title}"`);
    
    // Extract results from .result__title a
    const links = await page.$$eval('.result__title a', elems => 
      elems.map(el => (el as HTMLAnchorElement).href).filter(href => href && href.startsWith('http'))
    );

    const rootUrls = links
      .map(url => {
        try {
          const parsed = new URL(url);
          // Return the protocol + host, e.g. https://example.com
          return `${parsed.protocol}//${parsed.hostname}`;
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    // Keep unique hostnames
    const uniqueUrls = Array.from(new Set(rootUrls)).slice(0, limit);
    console.log(`Found ${uniqueUrls.length} unique domains from search.`);
    return uniqueUrls;
  } catch (err: any) {
    console.error(`Search error for query "${query}":`, err.message || err);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Scrapes a website's home and contact page to collect text and found emails.
 */
async function scrapeWebsiteText(url: string): Promise<{ text: string; emails: string[] }> {
  console.log(`Scraping content from: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  let combinedText = '';
  const foundEmails: string[] = [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  try {
    // 1. Visit Home Page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const homeText = await page.evaluate(() => document.body.innerText || '');
    combinedText += `=== HOME PAGE ===\n${homeText}\n\n`;

    const homeEmails = homeText.match(emailRegex) || [];
    foundEmails.push(...homeEmails);

    // 2. Find Contact/About links
    const contactUrl = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const match = anchors.find((a) => {
        const anchor = a as HTMLAnchorElement;
        const text = (anchor.textContent || '').toLowerCase();
        const href = (anchor.href || '').toLowerCase();
        return text.includes('contact') || text.includes('about') || href.includes('contact') || href.includes('about');
      });
      return match ? (match as HTMLAnchorElement).href : null;
    });

    // 3. Visit Contact/About page if found
    if (contactUrl && contactUrl.startsWith('http')) {
      console.log(`Visiting discovered contact/about link: ${contactUrl}`);
      await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const contactText = await page.evaluate(() => document.body.innerText || '');
      combinedText += `=== CONTACT/ABOUT PAGE ===\n${contactText}\n\n`;

      const contactEmails = contactText.match(emailRegex) || [];
      foundEmails.push(...contactEmails);
    }
  } catch (err: any) {
    console.log(`Scraping warning for ${url}:`, err.message || err);
  } finally {
    await browser.close();
  }

  const uniqueEmails = Array.from(new Set(foundEmails)).filter(email => {
    // Basic filter to ignore common image/asset extensions showing up as false emails
    const lower = email.toLowerCase();
    return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.svg') && !lower.endsWith('.webp') && !lower.endsWith('.gif');
  });

  return {
    text: combinedText,
    emails: uniqueEmails
  };
}

/**
 * Uses Gemini to structure company metadata and select/validate the contact details.
 */
async function enrichLeadWithGemini(
  ai: GoogleGenerativeAI,
  url: string,
  scrapedText: string,
  foundEmails: string[]
): Promise<Partial<LeadQueueItem> | null> {
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  // Truncate text if it is too long to stay context-efficient
  const truncatedText = scrapedText.substring(0, 8000);

  const prompt = `
    You are an AI B2B Lead Enrichment Specialist. Your job is to analyze website text and structured data to identify company details and a contact person.
    
    Target Website: ${url}
    Emails Found via Regex: ${JSON.stringify(foundEmails)}
    
    Scraped Text Content:
    """
    ${truncatedText}
    """
    
    Extract the following details:
    1. "companyName": The name of the company or brand.
    2. "industry": A 2-4 word description of their industry/niche (e.g. "E-commerce Jewelry", "SaaS CRM Integration", "Fitness coaching").
    3. "description": A concise, 1-2 sentence description of what they do, their products, or service offerings.
    4. "contactName": The name of a relevant contact person (like Founder, CMO, Support Manager) or "Customer Support Team" if no specific individual is found.
    5. "contactEmail": Select the absolute best email address from the "Emails Found via Regex" list or text that is ideal for sending an automated chatbot evaluation report (e.g., support@, info@, hello@, or an individual contact). If no direct email address is found in the text or list, generate a highly likely fallback business email using their domain name (e.g., support@domain.com, hello@domain.com, or info@domain.com where domain.com is extracted from the website URL: ${url}). DO NOT leave this empty.
    
    Return your output STRICTLY in JSON format with this exact schema:
    {
      "companyName": "...",
      "industry": "...",
      "description": "...",
      "contactName": "...",
      "contactEmail": "..."
    }
    
    Make sure you only output valid JSON. No backticks, comments, or extra explanation.
  `;

  try {
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const text = response.response.text()?.trim() || '{}';
    const data = JSON.parse(text);

    if (data.companyName && data.contactEmail) {
      return {
        companyName: data.companyName,
        websiteUrl: url,
        contactName: data.contactName || 'Customer Support Team',
        contactEmail: data.contactEmail,
        industry: data.industry || 'Technology & Services',
        description: data.description || 'Provides products or services discovered via online automation.',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
    }
  } catch (err: any) {
    console.error(`Gemini enrichment error for ${url}:`, err.message || err);
  }
  return null;
}

/**
 * Main Prospector Orchestration.
 */
async function runProspector() {
  console.log('\n=================== Starting Tryda-Prospector Agent ===================');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }

  const ai = new GoogleGenerativeAI(apiKey);

  // Phase 1: Dynamic keyword generation
  console.log('Generating dynamic search keywords with Gemini...');
  const searchQueries = await generateSearchKeywords(ai);
  
  // Phase 1.5: Discover URLs across all search queries
  const candidateUrls: string[] = [];
  for (const query of searchQueries) {
    const urls = await searchWeb(query, 4);
    candidateUrls.push(...urls);
  }

  // Filter out duplicates
  let uniqueCandidates = Array.from(new Set(candidateUrls));
  if (uniqueCandidates.length === 0) {
    console.log('\n⚠️ Search engine requests returned 0 results (potentially blocked by Cloud IP detection/CAPTCHA).');
    console.log('Activating high-quality B2B fallback target list for testing & seeding...');
    uniqueCandidates = [
      'https://linear.app',
      'https://posthog.com',
      'https://supabase.com',
      'https://framer.com',
      'https://railway.app',
      'https://render.com',
      'https://unbounce.com'
    ];
  }

  console.log(`\nTotal unique target candidates discovered: ${uniqueCandidates.length}`);
  console.log(uniqueCandidates);

  let verifiedCount = 0;
  let addedCount = 0;

  // Phase 2: Verification (Playwright Chat heuristics check)
  for (const url of uniqueCandidates) {
    console.log(`\n--- Verification & Inspection: ${url} ---`);
    const crawler = new ChatCrawler();
    let hasChatWidget = false;
    let detectedWidget: string | null = null;

    try {
      await crawler.start(url);
      const widgetConfig = await crawler.findChatWidget();
      hasChatWidget = widgetConfig !== null;
      detectedWidget = crawler.detectedWidget;
      await crawler.close();
    } catch (err: any) {
      console.log(`Verification failed/blocked for ${url}:`, err.message || err);
      try { await crawler.close(); } catch {}
    }

    if (!hasChatWidget) {
      console.log(`No active AI/live chat widget detected on ${url}. Skipping.`);
      continue;
    }

    verifiedCount++;
    console.log(`✅ Active chatbot detected on ${url}! Starting Lead Enrichment...`);

    // Phase 3 & 4: Scraping & Gemini Enrichment
    const scrapedData = await scrapeWebsiteText(url);
    if (!scrapedData.text) {
      console.log(`Could not extract text content from ${url}. Skipping.`);
      continue;
    }

    const leadInfo = await enrichLeadWithGemini(ai, url, scrapedData.text, scrapedData.emails);
    if (!leadInfo || !leadInfo.contactEmail) {
      console.log(`Failed to extract metadata/valid email for ${url}. Skipping.`);
      continue;
    }
    leadInfo.chatWidget = detectedWidget || 'generic';

    // Phase 4.5: Queueing to Firestore
    console.log('Prospect Qualified! Adding to Firestore lead_queue...');
    console.log(`Company: ${leadInfo.companyName}`);
    console.log(`Niche: ${leadInfo.industry}`);
    console.log(`Email: ${leadInfo.contactName} <${leadInfo.contactEmail}>`);
    console.log(`Widget Detected: ${leadInfo.chatWidget}`);

    try {
      // Check if lead already exists in queue to avoid duplicates
      const existing = await db.collection('lead_queue')
        .where('websiteUrl', '==', url)
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log(`Domain ${url} already exists in lead_queue. Skipping.`);
        continue;
      }

      const queueId = db.collection('lead_queue').doc().id;
      await db.collection('lead_queue').doc(queueId).set(leadInfo);
      console.log(`Successfully queued with doc ID: ${queueId}`);
      addedCount++;
    } catch (err: any) {
      console.error('Firestore save error:', err.message || err);
    }
  }

  console.log('\n=================== Tryda-Prospector Agent Complete ===================');
  console.log(`Discovered: ${uniqueCandidates.length} domains`);
  console.log(`Verified with Chatbot: ${verifiedCount}`);
  console.log(`Newly Queued to Firestore: ${addedCount}`);
  console.log('========================================================================\n');
}

// Execute if called directly
if (require.main === module) {
  runProspector().catch(console.error);
}
