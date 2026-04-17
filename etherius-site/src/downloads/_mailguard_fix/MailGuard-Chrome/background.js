const DEFAULT_SETTINGS = {
  autoScan: true,
  protectionMode: "balanced",
  localAiEnabled: true,
  deepWebResearch: true,
  scanCount: 0,
  history: []
};

const ETHERIUS_API = "https://etherius-api.vercel.app/api/scan";
const COMPANY_INTEL_API = "https://etherius-security-site.vercel.app/api/company-intel";
const API_TIMEOUT_MS = 4800;
const COMPANY_INTEL_TIMEOUT_MS = 5200;
const HISTORY_LIMIT = 25;
const SCAN_CACHE_TTL_MS = 4 * 60 * 1000;
const DOMAIN_INTEL_TIMEOUT_MS = 2200;
const DNS_INTEL_TIMEOUT_MS = 2400;
const WEB_INTEL_TIMEOUT_MS = 3200;
const scanCache = new Map();
const domainIntelCache = new Map();
const dnsIntelCache = new Map();
const webIntelCache = new Map();
const TRUSTED_DOMAINS = [
  "google.com",
  "microsoft.com",
  "linkedin.com",
  "github.com",
  "amazon.com",
  "apple.com",
  "adobe.com",
  "oracle.com",
  "salesforce.com",
  "deloitte.com",
  "accenture.com",
  "tcs.com",
  "infosys.com",
  "wipro.com"
];

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (stored) => {
    const patch = {};
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (typeof stored[key] === "undefined") {
        patch[key] = value;
      }
    }
    if (Object.keys(patch).length) {
      chrome.storage.local.set(patch);
    }
  });

  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ success: false, error: "Invalid extension request." });
    return false;
  }

  if (message.type === "ANALYZE_EMAIL") {
    analyzeEmail(message.data)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get(["autoScan", "protectionMode", "localAiEnabled", "deepWebResearch", "scanCount", "history"], (data) => {
      sendResponse({
        success: true,
        autoScan: data.autoScan !== false,
        protectionMode: data.protectionMode || "balanced",
        localAiEnabled: data.localAiEnabled !== false,
        deepWebResearch: data.deepWebResearch !== false,
        scanCount: data.scanCount || 0,
        history: data.history || []
      });
    });
    return true;
  }

  if (message.type === "SAVE_SETTINGS") {
    const nextSettings = message.settings || {};
    chrome.storage.local.set(nextSettings, () => sendResponse({ success: true }));
    return true;
  }

  sendResponse({ success: false, error: `Unsupported message type: ${message.type}` });
  return false;
});

async function analyzeEmail(emailData) {
  const sanitized = sanitizeEmailData(emailData);
  if (!sanitized.subject && !sanitized.body) {
    throw new Error("Open an email first, then run EmailGuard.");
  }

  const cacheKey = buildCacheKey(sanitized);
  const cached = scanCache.get(cacheKey);
  if (cached && (Date.now() - cached.createdAt) < SCAN_CACHE_TTL_MS) {
    await saveToHistory(sanitized, cached.result);
    await incrementScanCount();
    return {
      ...cached.result,
      engineStatus: `${cached.result.engineStatus || "hybrid-ai"} / cached`
    };
  }

  const settings = await getSettings();
  const senderIntel = sanitized.senderDomain
    ? await collectSenderIntelligence(sanitized, settings)
    : null;
  const localResult = settings.localAiEnabled !== false
    ? runLocalDecisionEngine(sanitized, settings.protectionMode, senderIntel)
    : defaultLocalResult();

  let cloudResult = null;
  let cloudFailureReason = "";
  try {
    cloudResult = await fetchCloudDecision(sanitized);
  } catch (error) {
    cloudFailureReason = error.message;
  }

  const finalResult = combineDecisionEngines(localResult, cloudResult, settings.protectionMode, cloudFailureReason, senderIntel);
  scanCache.set(cacheKey, { createdAt: Date.now(), result: finalResult });
  await saveToHistory(sanitized, finalResult);
  await incrementScanCount();
  return finalResult;
}

async function fetchCloudDecision(sanitized) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(ETHERIUS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sanitized),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Cloud scan timed out. Local AI engine completed the review.");
    }
    throw new Error("Cloud scan is unavailable right now. Local AI engine completed the review.");
  } finally {
    clearTimeout(timeoutId);
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(data.message || "Cloud scan is busy right now. Local AI engine completed the review.");
    }
    throw new Error(data.message || `Cloud scan returned ${response.status}. Local AI engine completed the review.`);
  }

  const result = normalizeCloudResult(data.result || {});
  if (typeof data.remainingScans === "number") {
    result.remainingScans = data.remainingScans;
  }
  return result;
}

function sanitizeEmailData(emailData) {
  const input = emailData || {};
  const sender = String(input.sender || "").trim();
  const subject = String(input.subject || "").trim();
  const body = String(input.body || "").trim().slice(0, 6000);
  const senderDomain = String(input.senderDomain || getDomainFromEmail(sender)).trim().toLowerCase();
  const senderName = String(input.senderName || "").trim();
  const replyTo = String(input.replyTo || "").trim();
  const returnPath = String(input.returnPath || "").trim();
  const urls = Array.isArray(input.urls) ? input.urls.slice(0, 25).map((value) => String(value || "").trim()).filter(Boolean) : [];
  const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, 10).map((value) => String(value || "").trim()).filter(Boolean) : [];

  return {
    subject,
    sender,
    senderName,
    senderDomain,
    replyTo,
    returnPath,
    body,
    urls,
    attachments
  };
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["autoScan", "protectionMode", "localAiEnabled", "deepWebResearch"], (settings) => {
      resolve({
        autoScan: settings.autoScan !== false,
        protectionMode: settings.protectionMode || "balanced",
        localAiEnabled: settings.localAiEnabled !== false,
        deepWebResearch: settings.deepWebResearch !== false
      });
    });
  });
}

function incrementScanCount() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["scanCount"], (data) => {
      const nextCount = (data.scanCount || 0) + 1;
      chrome.storage.local.set({ scanCount: nextCount }, resolve);
    });
  });
}

function saveToHistory(emailData, result) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["history"], (data) => {
      const history = data.history || [];
      history.unshift({
        subject: emailData.subject || "(no subject)",
        sender: emailData.sender || "",
        riskLevel: result.riskLevel,
        score: result.score,
        time: new Date().toISOString(),
        summary: result.summary || "",
        verdict: result.verdict || ""
      });
      chrome.storage.local.set({ history: history.slice(0, HISTORY_LIMIT) }, resolve);
    });
  });
}

function normalizeCloudResult(result) {
  return {
    source: "cloud",
    riskLevel: String(result.riskLevel || "suspicious").toLowerCase(),
    summary: String(result.summary || "Cloud analysis found suspicious email traits."),
    recommendation: String(result.recommendation || ""),
    flags: Array.isArray(result.flags) ? result.flags : [],
    reasons: Array.isArray(result.reasons) ? result.reasons : [],
    verdict: String(result.verdict || ""),
    score: Number.isFinite(Number(result.score)) ? Number(result.score) : 0,
    isInternshipScam: Boolean(result.isInternshipScam)
  };
}

function defaultLocalResult() {
  return {
    source: "local",
    score: 0,
    riskLevel: "safe",
    summary: "No local AI indicators were triggered.",
    recommendation: "No action needed.",
    flags: [],
    reasons: [],
    verdict: "No immediate threat pattern detected.",
    isInternshipScam: false,
    confidence: "low"
  };
}

function runLocalDecisionEngine(emailData, protectionMode, senderIntel) {
  const subject = `${emailData.subject} ${emailData.senderName}`.toLowerCase();
  const body = emailData.body.toLowerCase();
  const sender = emailData.sender.toLowerCase();
  const senderDomain = emailData.senderDomain.toLowerCase();
  const replyDomain = getDomainFromEmail(emailData.replyTo.toLowerCase());
  const returnPathDomain = getDomainFromEmail(emailData.returnPath.toLowerCase());

  const reasons = [];
  const flags = [];
  let score = 0;
  let isInternshipScam = false;

  const weightedPatterns = [
    {
      name: "credential request",
      weight: 24,
      test: /(verify (your )?(account|password)|reset your password|login to avoid|confirm your mailbox|webmail update|security alert)/i,
      detail: "Credential-harvest language detected"
    },
    {
      name: "urgent pressure",
      weight: 12,
      test: /(urgent|immediately|within 24 hours|final warning|act now|avoid suspension|limited time)/i,
      detail: "High-pressure urgency language detected"
    },
    {
      name: "payment pressure",
      weight: 22,
      test: /(pay now|make payment|payment required|submit fee|send money|processing fee|registration fee|security deposit|advance fee|wire transfer|upi id|bank account details|complete payment|purchase (course|training)|pay (the|your) fee)/i,
      detail: "Payment or fee pressure detected"
    },
    {
      name: "attachment lure",
      weight: 18,
      test: /(open the attached|download attachment|invoice attached|payment advice attached|resume attached|document attached)/i,
      detail: "Attachment lure language detected"
    },
    {
      name: "job scam",
      weight: 26,
      test: /(internship|job offer|offer letter|hr team|campus drive|training fee|joining kit|selection confirmation)/i,
      detail: "Internship or offer scam language detected"
    },
    {
      name: "credential secrecy",
      weight: 18,
      test: /(confidential|do not tell|keep this secret|share otp|verification code|one-time password|otp)/i,
      detail: "Secrecy or OTP abuse pattern detected"
    },
    {
      name: "course selling lure",
      weight: 24,
      test: /(course fee|enroll now|training program|certification required|pay for training|buy the course|program fee|mandatory course|bootcamp fee|learning package)/i,
      detail: "Course-selling or paid training language detected"
    },
    {
      name: "chat migration",
      weight: 18,
      test: /(whatsapp|telegram|signal app|move to chat|contact on whatsapp|text the recruiter)/i,
      detail: "Conversation is being pushed to untrusted chat channels"
    },
    {
      name: "financial collection",
      weight: 22,
      test: /(refundable deposit|security deposit|assessment fee|exam fee|processing charge|document verification fee|onboarding payment|pay to continue)/i,
      detail: "Financial collection language tied to progression detected"
    }
  ];

  for (const pattern of weightedPatterns) {
    if (pattern.test.test(`${subject} ${body}`)) {
      score += pattern.weight;
      reasons.push(pattern.detail);
      flags.push({ type: pattern.name, detail: pattern.detail, weight: pattern.weight });
      if (pattern.name === "job scam") {
        isInternshipScam = true;
      }
    }
  }

  if (replyDomain && senderDomain && replyDomain !== senderDomain) {
    score += 20;
    reasons.push("Reply-to domain does not match visible sender domain");
    flags.push({ type: "reply-mismatch", detail: `${replyDomain} differs from ${senderDomain}`, weight: 20 });
  }

  if (returnPathDomain && senderDomain && returnPathDomain !== senderDomain) {
    score += 16;
    reasons.push("Return-path domain differs from the displayed sender");
    flags.push({ type: "return-path-mismatch", detail: `${returnPathDomain} differs from ${senderDomain}`, weight: 16 });
  }

  if (senderDomain && looksSuspiciousDomain(senderDomain)) {
    score += 22;
    reasons.push("Sender domain looks suspicious or impersonation-oriented");
    flags.push({ type: "domain-risk", detail: `Sender domain ${senderDomain} triggered domain-risk heuristics`, weight: 22 });
  }

  if (emailData.urls.length) {
    const urlSignals = analyzeUrls(emailData.urls, senderDomain);
    score += urlSignals.score;
    reasons.push(...urlSignals.reasons);
    flags.push(...urlSignals.flags);
  }

  if (emailData.attachments.length) {
    const dangerousAttachment = emailData.attachments.find((name) => /\.(zip|exe|scr|iso|hta|js|jar|bat|cmd|xlsm|docm)$/i.test(name));
    if (dangerousAttachment) {
      score += 18;
      reasons.push("Potentially dangerous attachment type detected");
      flags.push({ type: "attachment-risk", detail: `Attachment ${dangerousAttachment} may be unsafe`, weight: 18 });
    }
  }

  if (sender.includes("no-reply") && /(reply to this email|respond with|contact recruiter)/i.test(body)) {
    score += 10;
    reasons.push("Behavior mismatch between no-reply sender and requested response action");
    flags.push({ type: "sender-behavior-mismatch", detail: "No-reply sender requests direct response", weight: 10 });
  }

  if (TRUSTED_DOMAINS.some((trusted) => senderDomain.endsWith(trusted)) === false && /(google|microsoft|linkedin|github|amazon|apple|oracle|adobe|hr team)/i.test(`${subject} ${body}`)) {
    score += 14;
    reasons.push("Brand reference detected without a trusted sender domain");
    flags.push({ type: "brand-spoof", detail: "Known brand referenced from untrusted domain", weight: 14 });
  }

  const salaryContextSignal = analyzeSalaryContext(`${subject} ${body}`);
  score += salaryContextSignal.score;
  reasons.push(...salaryContextSignal.reasons);
  flags.push(...salaryContextSignal.flags);

  const freeMailSignal = analyzeFreeMailRecruiterRisk(sender, senderNameOrFallback(emailData.senderName, sender), `${subject} ${body}`);
  score += freeMailSignal.score;
  reasons.push(...freeMailSignal.reasons);
  flags.push(...freeMailSignal.flags);

  const internshipFeeSignal = analyzeInternshipFeeRisk(`${subject} ${body}`);
  score += internshipFeeSignal.score;
  reasons.push(...internshipFeeSignal.reasons);
  flags.push(...internshipFeeSignal.flags);
  if (internshipFeeSignal.isInternshipScam) {
    isInternshipScam = true;
  }

  const companyImpersonationSignal = analyzeCompanyImpersonation(emailData.senderName, senderDomain, `${subject} ${body}`);
  score += companyImpersonationSignal.score;
  reasons.push(...companyImpersonationSignal.reasons);
  flags.push(...companyImpersonationSignal.flags);

  const senderIntelSignal = analyzeSenderIntelligence(senderIntel, `${subject} ${body}`, senderDomain);
  score += senderIntelSignal.score;
  reasons.push(...senderIntelSignal.reasons);
  flags.push(...senderIntelSignal.flags);

  const normalizedScore = clamp(adjustForMode(score, protectionMode), 0, 100);
  const riskLevel = scoreToRiskLevel(normalizedScore);
  const summary = buildSummary(riskLevel, normalizedScore, isInternshipScam, reasons);
  const recommendation = buildRecommendation(riskLevel, isInternshipScam);
  const verdict = buildVerdict(riskLevel, reasons);

  return {
    source: "local",
    score: normalizedScore,
    riskLevel,
    summary,
    recommendation,
    flags: flags.slice(0, 8),
    reasons: reasons.slice(0, 6),
    verdict,
    isInternshipScam,
    confidence: normalizedScore >= 75 ? "high" : normalizedScore >= 45 ? "medium" : "low",
    intelSummary: senderIntel?.summary || "",
    intelDetails: Array.isArray(senderIntel?.signals) ? senderIntel.signals.slice(0, 5) : [],
    researchSummary: senderIntel?.researchSummary || "",
    researchSources: Array.isArray(senderIntel?.references) ? senderIntel.references.slice(0, 6) : [],
    researchCoverage: senderIntel?.sourcesAttempted
      ? `${senderIntel.sourcesReachable || 0}/${senderIntel.sourcesAttempted}`
      : ""
  };
}

function analyzeUrls(urls, senderDomain) {
  const reasons = [];
  const flags = [];
  let score = 0;

  urls.forEach((url) => {
    let hostname = "";
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch (_error) {
      return;
    }

    if (!hostname) {
      return;
    }

    if (hostname !== senderDomain && senderDomain && !hostname.endsWith(senderDomain)) {
      score += 8;
      reasons.push(`Embedded link points to ${hostname}, not the sender domain`);
      flags.push({ type: "link-mismatch", detail: `${hostname} differs from sender domain ${senderDomain}`, weight: 8 });
    }

    if (looksSuspiciousDomain(hostname)) {
      score += 16;
      reasons.push(`Suspicious link domain detected: ${hostname}`);
      flags.push({ type: "link-risk", detail: `${hostname} triggered risky-domain heuristics`, weight: 16 });
    }

    if (/@|%40|bit\.ly|tinyurl|rb\.gy|cutt\.ly|t\.co/i.test(url)) {
      score += 10;
      reasons.push("Redirect-style or obfuscated link detected");
      flags.push({ type: "redirect-link", detail: "Shortened or obfuscated link was found", weight: 10 });
    }
  });

  return { score, reasons, flags };
}

function analyzeSalaryContext(combinedText) {
  const reasons = [];
  const flags = [];
  let score = 0;
  const looksLikeCompensation = /(salary package|salary offered|ctc|compensation package|annual package|annual salary|stipend|lpa|per annum|monthly salary|benefits package)/i.test(combinedText);
  const looksLikeRecipientPayment = /(pay now|make payment|submit fee|registration fee|processing fee|deposit amount|send money|pay the fee|purchase course|buy the course)/i.test(combinedText);

  if (looksLikeCompensation && !looksLikeRecipientPayment) {
    score -= 18;
    reasons.push("Compensation context detected; money language appears to describe salary or benefits, not a payment demand");
    flags.push({ type: "salary-context", detail: "Salary or package wording reduced scam risk", weight: -18 });
  }

  return { score, reasons, flags };
}

function analyzeFreeMailRecruiterRisk(sender, senderName, combinedText) {
  const reasons = [];
  const flags = [];
  let score = 0;
  const freeMailPattern = /@(gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|proton\.me|protonmail\.com|aol\.com|icloud\.com)$/i;
  const hrPattern = /(hr|human resources|recruiter|talent acquisition|hiring team|placement cell|campus recruitment)/i;
  const senderLooksFree = freeMailPattern.test(sender);
  const senderLooksHr = hrPattern.test(`${senderName} ${combinedText}`);

  if (senderLooksFree && senderLooksHr) {
    score += 20;
    reasons.push("Recruitment language is coming from a free webmail sender");
    flags.push({ type: "free-mail-recruiter", detail: "Recruiter-style sender is using free webmail instead of a company domain", weight: 20 });
  }

  return { score, reasons, flags };
}

function analyzeInternshipFeeRisk(combinedText) {
  const reasons = [];
  const flags = [];
  let score = 0;
  const hasOpportunity = /(internship|intern|job offer|offer letter|hiring|selection|campus drive|placement|training opportunity)/i.test(combinedText);
  const compensationContext = /(salary package|salary offered|ctc|compensation package|annual package|annual salary|stipend|lpa|per annum|monthly salary|benefits package)/i.test(combinedText);
  const hasFee = compensationContext
    ? /(registration fee|security deposit|processing charge|assessment fee|exam fee|pay now|purchase|send money|submit fee)/i.test(combinedText)
    : /(fee|payment|deposit|course|training fee|registration fee|security deposit|processing charge|assessment fee|exam fee|pay now|purchase|send money|submit fee)/i.test(combinedText);
  const hasProofPressure = /(limited seats|confirm immediately|complete payment|slot booking|reserve your seat|only today|deadline today)/i.test(combinedText);

  if (hasOpportunity && hasFee) {
    score += 28;
    reasons.push("Opportunity or internship language is combined with a money request");
    flags.push({ type: "opportunity-fee", detail: "Job or internship flow appears tied to payment or course purchase", weight: 28 });
  }

  if (hasOpportunity && hasFee && hasProofPressure) {
    score += 14;
    reasons.push("Urgent payment pressure is attached to the opportunity flow");
    flags.push({ type: "urgent-opportunity-fee", detail: "Payment request is being accelerated with deadline pressure", weight: 14 });
  }

  return {
    score,
    reasons,
    flags,
    isInternshipScam: hasOpportunity && hasFee
  };
}

function analyzeCompanyImpersonation(senderName, senderDomain, combinedText) {
  const reasons = [];
  const flags = [];
  let score = 0;
  const claimedBrands = extractClaimedBrands(`${senderName} ${combinedText}`);
  if (!claimedBrands.length) {
    return { score, reasons, flags };
  }

  for (const brand of claimedBrands) {
    if (!senderDomain || !senderDomain.includes(brand.domainHint)) {
      score += 12;
      reasons.push(`${brand.label} is referenced without a matching sender domain`);
      flags.push({ type: "company-claim-mismatch", detail: `${brand.label} is mentioned but sender domain does not match`, weight: 12 });
      break;
    }
  }

  return { score, reasons, flags };
}

function analyzeSenderIntelligence(senderIntel, combinedText, senderDomain) {
  const reasons = [];
  const flags = [];
  let score = 0;

  if (!senderIntel || !senderIntel.available || !senderDomain) {
    return { score, reasons, flags };
  }

  const suspiciousContext = /(internship|job offer|recruit|payment|fee|verify|login|urgent|hr|training)/i.test(combinedText);
  if (senderIntel.ageDays > -1 && senderIntel.ageDays <= 120 && suspiciousContext) {
    score += 12;
    reasons.push(`Sender domain is very new (${senderIntel.ageDays} days old) for the type of request being made`);
    flags.push({ type: "new-domain", detail: `Sender domain ${senderDomain} appears newly registered`, weight: 12 });
  }

  if (senderIntel.ageDays >= 3650 && !looksSuspiciousDomain(senderDomain)) {
    score -= 6;
    reasons.push(`Sender domain shows mature registration age (${Math.floor(senderIntel.ageDays / 365)}+ years), which slightly reduces risk`);
    flags.push({ type: "mature-domain", detail: "Long-lived sender domain reduced risk slightly", weight: -6 });
  }

  if (senderIntel.hasMx) {
    score -= 4;
    reasons.push("Sender domain has valid MX records, which supports deliverability legitimacy");
    flags.push({ type: "mx-record", detail: "Valid MX record detected", weight: -4 });
  }

  if (senderIntel.hasSpf && senderIntel.hasDmarc) {
    score -= 12;
    reasons.push("Sender domain publishes SPF + DMARC email authentication records");
    flags.push({ type: "mail-auth", detail: "SPF and DMARC records reduce impersonation risk", weight: -12 });
  } else if (!senderIntel.hasSpf && suspiciousContext) {
    score += 6;
    reasons.push("Sender domain lacks SPF authentication while requesting sensitive action");
    flags.push({ type: "spf-missing", detail: "No SPF record found in sensitive context", weight: 6 });
  }

  if (senderIntel.brandAligned) {
    score -= 14;
    reasons.push("Claimed company identity aligns with sender domain");
    flags.push({ type: "brand-match", detail: "Brand claim and sender domain align", weight: -14 });
  }

  if (senderIntel.scamSignals >= 2) {
    score += 14;
    reasons.push("Open web reputation signals mention scam/fraud concerns for this sender domain");
    flags.push({ type: "reputation-risk", detail: "Open-web reputation indicates elevated fraud risk", weight: 14 });
  }
  if (senderIntel.webScamSignals >= 3) {
    score += 16;
    reasons.push("Multiple external web research sources mention scam or fraud concerns");
    flags.push({ type: "multi-source-reputation-risk", detail: "Several independent web sources show risk for this sender", weight: 16 });
  }
  if (senderIntel.officialMatch && senderIntel.popularityScore >= 3) {
    score -= 10;
    reasons.push("Sender aligns with official company footprint and broad web presence");
    flags.push({ type: "official-web-match", detail: "Official and popular web presence reduced spoofing risk", weight: -10 });
  }

  if (senderIntel.legitimacyScore >= 75) {
    score -= 8;
    reasons.push("Multi-source sender intelligence indicates a likely legitimate organization footprint");
    flags.push({ type: "legit-footprint", detail: "Domain legitimacy confidence is high", weight: -8 });
  }

  return { score, reasons, flags };
}

async function collectSenderIntelligence(emailData, settings) {
  const senderDomain = String(emailData.senderDomain || "").toLowerCase().trim();
  if (!senderDomain) {
    return null;
  }

  const cacheKey = `${senderDomain}::${emailData.senderName || ""}`;
  const cached = webIntelCache.get(cacheKey);
  if (cached && (Date.now() - cached.createdAt) < 4 * 60 * 60 * 1000) {
    return cached.value;
  }

  const domainIntelPromise = fetchDomainIntel(senderDomain);
  const dnsIntelPromise = fetchDnsIntel(senderDomain);
  const webReputationPromise = settings.deepWebResearch === false
    ? Promise.resolve({ scamSignals: 0, references: [], searched: false, officialHintMatch: false })
    : fetchOpenWebReputation(senderDomain, `${emailData.senderName || ""} ${emailData.subject || ""}`);
  const companyResearchPromise = settings.deepWebResearch === false
    ? Promise.resolve(defaultCompanyResearch(senderDomain))
    : fetchCompanyResearchProfile(emailData);

  const [domainIntel, dnsIntel, webIntel, companyResearch] = await Promise.all([
    domainIntelPromise,
    dnsIntelPromise,
    webReputationPromise,
    companyResearchPromise
  ]);

  const brandHints = extractClaimedBrands(`${emailData.senderName || ""} ${emailData.subject || ""} ${emailData.body || ""}`);
  const brandAligned = brandHints.length
    ? brandHints.some((hint) => senderDomain.includes(hint.domainHint))
    : false;

  let legitimacyScore = 45;
  const signals = [];
  if (domainIntel?.ageDays >= 0) {
    if (domainIntel.ageDays >= 3650) {
      legitimacyScore += 20;
      signals.push(`Domain age ${Math.floor(domainIntel.ageDays / 365)}+ years`);
    } else if (domainIntel.ageDays >= 365) {
      legitimacyScore += 12;
      signals.push(`Domain age ${domainIntel.ageDays} days`);
    } else if (domainIntel.ageDays <= 120) {
      legitimacyScore -= 14;
      signals.push(`Very new domain (${domainIntel.ageDays} days)`);
    }
  }

  if (dnsIntel?.hasMx) {
    legitimacyScore += 8;
    signals.push("MX records present");
  }
  if (dnsIntel?.hasSpf) {
    legitimacyScore += 8;
    signals.push("SPF record present");
  }
  if (dnsIntel?.hasDmarc) {
    legitimacyScore += 8;
    signals.push("DMARC record present");
  }
  if (brandAligned || webIntel?.officialHintMatch) {
    legitimacyScore += 12;
    signals.push("Company claim aligns with observed domain footprint");
  }
  if (webIntel?.scamSignals >= 2) {
    legitimacyScore -= 18;
    signals.push("Open-web scam indicators found");
  } else if (webIntel?.searched) {
    signals.push("Open-web sender reputation checked");
  }

  if (companyResearch?.officialMatch) {
    legitimacyScore += 12;
    signals.push("Official company footprint detected in web research");
  }
  if (companyResearch?.reviewPositiveScore >= 2 && companyResearch?.reviewNegativeScore === 0) {
    legitimacyScore += 8;
    signals.push("Positive company reputation signals found");
  }
  if (companyResearch?.reviewNegativeScore >= 2) {
    legitimacyScore -= 12;
    signals.push("Negative complaint or scam-like review signals found");
  }
  if (companyResearch?.scamSignalScore >= 3) {
    legitimacyScore -= 16;
    signals.push("Multiple scam or fraud mentions found in web research");
  }
  if (companyResearch?.popularityScore >= 3) {
    legitimacyScore += 6;
    signals.push("Company has broad web footprint across independent sources");
  }
  if (companyResearch?.sourcesReachable >= 6) {
    legitimacyScore += 4;
    signals.push(`Deep research coverage: ${companyResearch.sourcesReachable}/${companyResearch.sourcesAttempted} sources reachable`);
  } else if (Number.isFinite(companyResearch?.sourcesAttempted) && companyResearch.sourcesAttempted > 0) {
    signals.push(`Deep research coverage: ${companyResearch.sourcesReachable || 0}/${companyResearch.sourcesAttempted} sources reachable`);
  }
  if (looksSuspiciousDomain(senderDomain)) {
    legitimacyScore -= 10;
  }

  legitimacyScore = clamp(Math.round(legitimacyScore), 0, 100);
  const result = {
    available: true,
    senderDomain,
    ageDays: Number.isFinite(domainIntel?.ageDays) ? domainIntel.ageDays : -1,
    hasMx: Boolean(dnsIntel?.hasMx),
    hasSpf: Boolean(dnsIntel?.hasSpf),
    hasDmarc: Boolean(dnsIntel?.hasDmarc),
    scamSignals: Number(webIntel?.scamSignals || 0),
    webScamSignals: Number(companyResearch?.scamSignalScore || 0),
    brandAligned: Boolean(brandAligned || webIntel?.officialHintMatch),
    officialMatch: Boolean(companyResearch?.officialMatch),
    popularityScore: Number(companyResearch?.popularityScore || 0),
    legitimacyScore,
    summary: buildIntelSummary(legitimacyScore, senderDomain),
    researchSummary: companyResearch?.summary || "",
    sourcesAttempted: Number(companyResearch?.sourcesAttempted || 0),
    sourcesReachable: Number(companyResearch?.sourcesReachable || 0),
    signals: signals.slice(0, 7),
    references: [...new Set([...(Array.isArray(webIntel?.references) ? webIntel.references : []), ...(Array.isArray(companyResearch?.sources) ? companyResearch.sources : [])])].slice(0, 6)
  };

  webIntelCache.set(cacheKey, { createdAt: Date.now(), value: result });
  return result;
}

function buildIntelSummary(legitimacyScore, senderDomain) {
  if (legitimacyScore >= 80) {
    return `Sender domain ${senderDomain} appears strongly legitimate based on age, DNS email authentication, and web reputation signals.`;
  }
  if (legitimacyScore >= 60) {
    return `Sender domain ${senderDomain} appears moderately trustworthy, but content should still be verified for social-engineering pressure.`;
  }
  if (legitimacyScore >= 40) {
    return `Sender domain ${senderDomain} has mixed trust signals. Treat requests involving money, credentials, or urgent action carefully.`;
  }
  return `Sender domain ${senderDomain} shows weak trust signals from domain and web checks. Handle this message as potentially malicious.`;
}

function defaultCompanyResearch(senderDomain) {
  return {
    senderDomain,
    officialMatch: false,
    popularityScore: 0,
    reviewPositiveScore: 0,
    reviewNegativeScore: 0,
    scamSignalScore: 0,
    sourcesAttempted: 0,
    sourcesReachable: 0,
    sources: [],
    summary: "Deep web company research is unavailable. Decision was made from local domain and content signals."
  };
}

async function fetchCompanyResearchProfile(emailData) {
  const senderDomain = String(emailData.senderDomain || "").toLowerCase().trim();
  if (!senderDomain) {
    return defaultCompanyResearch("");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPANY_INTEL_TIMEOUT_MS);
  try {
    const response = await fetch(COMPANY_INTEL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderDomain,
        senderName: String(emailData.senderName || "").trim(),
        subject: String(emailData.subject || "").trim(),
        body: String(emailData.body || "").trim().slice(0, 1200)
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      return defaultCompanyResearch(senderDomain);
    }
    const payload = await response.json();
    const report = payload?.report || defaultCompanyResearch(senderDomain);
    return {
      senderDomain,
      officialMatch: Boolean(report.officialMatch),
      popularityScore: clamp(Number(report.popularityScore || 0), 0, 5),
      reviewPositiveScore: clamp(Number(report.reviewPositiveScore || 0), 0, 5),
      reviewNegativeScore: clamp(Number(report.reviewNegativeScore || 0), 0, 5),
      scamSignalScore: clamp(Number(report.scamSignalScore || 0), 0, 5),
      sourcesAttempted: Number(report.sourcesAttempted || 0),
      sourcesReachable: Number(report.sourcesReachable || 0),
      sources: Array.isArray(report.sources) ? report.sources.slice(0, 8) : [],
      summary: String(report.summary || defaultCompanyResearch(senderDomain).summary)
    };
  } catch (_error) {
    return defaultCompanyResearch(senderDomain);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchDnsIntel(domain) {
  const cached = dnsIntelCache.get(domain);
  if (cached && (Date.now() - cached.createdAt) < 24 * 60 * 60 * 1000) {
    return cached.value;
  }

  const [mxData, txtData, dmarcData] = await Promise.all([
    fetchDnsRecord(domain, "MX"),
    fetchDnsRecord(domain, "TXT"),
    fetchDnsRecord(`_dmarc.${domain}`, "TXT")
  ]);

  const txtValues = [
    ...(Array.isArray(txtData?.Answer) ? txtData.Answer.map((item) => item.data || "") : []),
    ...(Array.isArray(dmarcData?.Answer) ? dmarcData.Answer.map((item) => item.data || "") : [])
  ].join(" ").toLowerCase();

  const result = {
    hasMx: Array.isArray(mxData?.Answer) && mxData.Answer.length > 0,
    hasSpf: txtValues.includes("v=spf1"),
    hasDmarc: txtValues.includes("v=dmarc1")
  };

  dnsIntelCache.set(domain, { createdAt: Date.now(), value: result });
  return result;
}

async function fetchDnsRecord(name, type) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DNS_INTEL_TIMEOUT_MS);
  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchOpenWebReputation(senderDomain, contextHint) {
  const query = `${senderDomain} company reviews scam phishing legitimacy`;
  const ddgData = await fetchDuckDuckGo(query);
  const officialData = await fetchDuckDuckGo(`${contextHint} official website`);

  const searchableText = [
    ddgData?.AbstractText || "",
    ddgData?.Heading || "",
    extractRelatedTopicText(ddgData),
    officialData?.AbstractURL || "",
    officialData?.AbstractText || ""
  ].join(" ").toLowerCase();

  const scamSignals = countMatches(searchableText, [
    "scam",
    "fraud",
    "phishing",
    "complaint",
    "fake recruiter",
    "advance fee"
  ]);

  const officialDomain = extractDomainFromUrl(officialData?.AbstractURL || ddgData?.AbstractURL || "");
  const officialHintMatch = Boolean(officialDomain && (senderDomain === officialDomain || senderDomain.endsWith(`.${officialDomain}`) || officialDomain.endsWith(`.${senderDomain}`)));

  const references = [ddgData?.AbstractURL, officialData?.AbstractURL].filter(Boolean);
  return {
    searched: Boolean(ddgData || officialData),
    scamSignals,
    officialHintMatch,
    references
  };
}

async function fetchDuckDuckGo(query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEB_INTEL_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractRelatedTopicText(payload) {
  if (!payload || !Array.isArray(payload.RelatedTopics)) {
    return "";
  }
  const chunks = [];
  payload.RelatedTopics.slice(0, 8).forEach((item) => {
    if (item?.Text) {
      chunks.push(item.Text);
    }
    if (Array.isArray(item?.Topics)) {
      item.Topics.slice(0, 4).forEach((nested) => {
        if (nested?.Text) {
          chunks.push(nested.Text);
        }
      });
    }
  });
  return chunks.join(" ");
}

function countMatches(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.reduce((acc, keyword) => acc + (normalized.includes(keyword) ? 1 : 0), 0);
}

function extractDomainFromUrl(urlValue) {
  if (!urlValue) {
    return "";
  }
  try {
    return new URL(urlValue).hostname.replace(/^www\./i, "").toLowerCase();
  } catch (_error) {
    return "";
  }
}

function extractClaimedBrands(text) {
  const lookup = [
    { label: "Google", domainHint: "google" },
    { label: "Microsoft", domainHint: "microsoft" },
    { label: "Amazon", domainHint: "amazon" },
    { label: "LinkedIn", domainHint: "linkedin" },
    { label: "Infosys", domainHint: "infosys" },
    { label: "TCS", domainHint: "tcs" },
    { label: "Wipro", domainHint: "wipro" },
    { label: "Accenture", domainHint: "accenture" },
    { label: "Deloitte", domainHint: "deloitte" }
  ];
  const lower = String(text || "").toLowerCase();
  return lookup.filter((brand) => lower.includes(brand.label.toLowerCase()));
}

function senderNameOrFallback(senderName, sender) {
  return String(senderName || sender || "").trim();
}

async function fetchDomainIntel(domain) {
  if (!domain) {
    return null;
  }

  const cached = domainIntelCache.get(domain);
  if (cached && (Date.now() - cached.createdAt) < 24 * 60 * 60 * 1000) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOMAIN_INTEL_TIMEOUT_MS);
  try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const events = Array.isArray(payload.events) ? payload.events : [];
    const registrationEvent = events.find((event) => /registration/i.test(String(event.eventAction || "")));
    const registeredAt = registrationEvent?.eventDate ? new Date(registrationEvent.eventDate) : null;
    const ageDays = registeredAt && !Number.isNaN(registeredAt.getTime())
      ? Math.max(0, Math.floor((Date.now() - registeredAt.getTime()) / (1000 * 60 * 60 * 24)))
      : -1;
    const result = {
      available: true,
      ageDays
    };
    domainIntelCache.set(domain, { createdAt: Date.now(), value: result });
    return result;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function looksSuspiciousDomain(domain) {
  if (!domain) {
    return false;
  }

  const suspiciousTlds = [".top", ".xyz", ".click", ".site", ".live", ".buzz", ".cam", ".shop"];
  if (suspiciousTlds.some((tld) => domain.endsWith(tld))) {
    return true;
  }

  if (/[0-9]/.test(domain) && /[-]{2,}/.test(domain)) {
    return true;
  }

  if (/(secure|verify|update|account|wallet|career|intern|hr|pay|login|support)/i.test(domain) && !TRUSTED_DOMAINS.some((trusted) => domain.endsWith(trusted))) {
    return true;
  }

  return false;
}

function adjustForMode(score, protectionMode) {
  if (protectionMode === "strict") {
    return Math.min(100, Math.round(score * 1.15));
  }
  if (protectionMode === "relaxed") {
    return Math.round(score * 0.9);
  }
  return score;
}

function scoreToRiskLevel(score) {
  if (score >= 76) {
    return "danger";
  }
  if (score >= 52) {
    return "warning";
  }
  if (score >= 26) {
    return "suspicious";
  }
  return "safe";
}

function buildSummary(riskLevel, score, isInternshipScam, reasons) {
  if (isInternshipScam) {
    return `This email strongly resembles a fake internship or fake opportunity scam. Local AI flagged ${reasons[0] || "multiple scam indicators"} with a risk score of ${score}/100.`;
  }

  if (riskLevel === "danger") {
    return `This email shows multiple high-risk phishing or fraud signals. Local AI marked it as dangerous with a score of ${score}/100.`;
  }
  if (riskLevel === "warning") {
    return `This email carries enough red-team style indicators to be treated carefully. Local AI scored it ${score}/100.`;
  }
  if (riskLevel === "suspicious") {
    return `This email contains suspicious patterns that deserve verification before clicking or replying. Local AI scored it ${score}/100.`;
  }
  return `No major phishing or scam indicators were triggered in the quick local analysis. Local AI scored it ${score}/100.`;
}

function buildRecommendation(riskLevel, isInternshipScam) {
  if (isInternshipScam) {
    return "Do not pay fees, do not share personal documents, and verify the internship or recruiter through an official company or college source.";
  }
  if (riskLevel === "danger") {
    return "Do not click links or open attachments. Verify the sender through a trusted channel and report the message immediately.";
  }
  if (riskLevel === "warning") {
    return "Verify the sender identity and inspect linked domains carefully before taking any action.";
  }
  if (riskLevel === "suspicious") {
    return "Pause before clicking. Confirm the request independently if money, passwords, or urgent action is involved.";
  }
  return "No immediate action is needed, but keep normal email caution in place.";
}

function buildVerdict(riskLevel, reasons) {
  if (riskLevel === "danger") {
    return `Red-team style indicators suggest likely fraud or phishing. Strongest signal: ${reasons[0] || "multiple coordinated risk flags"}.`;
  }
  if (riskLevel === "warning") {
    return `Email requires human verification. Strongest signal: ${reasons[0] || "moderate suspicious activity"}.`;
  }
  if (riskLevel === "suspicious") {
    return `Email is not clean enough to trust immediately. Strongest signal: ${reasons[0] || "minor suspicious pattern"}.`;
  }
  return "No critical indicators detected by the local decision engine.";
}

function combineDecisionEngines(localResult, cloudResult, protectionMode, cloudFailureReason, senderIntel) {
  if (!cloudResult) {
    const fallbackScore = applyLegitimacyCalibration(localResult.score, senderIntel, localResult);
    const fallbackRisk = scoreToRiskLevel(fallbackScore);
    return {
      ...localResult,
      source: "local-fallback",
      score: fallbackScore,
      riskLevel: fallbackRisk,
      engineStatus: senderIntel ? "local-ai-plus-intel" : "local-ai-only",
      summary: fallbackRisk === localResult.riskLevel
        ? localResult.summary
        : buildSummary(fallbackRisk, fallbackScore, localResult.isInternshipScam, localResult.reasons || []),
      recommendation: localResult.recommendation,
      verdict: `${localResult.verdict} ${cloudFailureReason ? `Cloud note: ${cloudFailureReason}` : ""}`.trim(),
      researchSummary: localResult.researchSummary || "",
      researchSources: localResult.researchSources || [],
      researchCoverage: localResult.researchCoverage || ""
    };
  }

  const localWeight = protectionMode === "strict" ? 0.58 : 0.5;
  const cloudWeight = 1 - localWeight;
  const mergedScoreRaw = clamp(Math.round((localResult.score * localWeight) + (cloudResult.score * cloudWeight)), 0, 100);
  const mergedScore = applyLegitimacyCalibration(mergedScoreRaw, senderIntel, localResult, cloudResult);
  const mergedRisk = higherRiskLevel(localResult.riskLevel, cloudResult.riskLevel, mergedScore);
  const mergedReasons = [...new Set([...(localResult.reasons || []), ...(cloudResult.reasons || []), ...extractFlagDetails(cloudResult.flags)])].slice(0, 6);
  const mergedFlags = [...localResult.flags, ...normalizeFlags(cloudResult.flags)].slice(0, 8);
  const isInternshipScam = Boolean(localResult.isInternshipScam || cloudResult.isInternshipScam);

  return {
    source: "hybrid-ai",
    engineStatus: "local-plus-cloud",
    score: mergedScore,
    riskLevel: mergedRisk,
    summary: choosePreferredSummary(localResult, cloudResult, mergedRisk, mergedScore, isInternshipScam),
    recommendation: cloudResult.recommendation || localResult.recommendation,
    flags: mergedFlags,
    reasons: mergedReasons,
    verdict: buildVerdict(mergedRisk, mergedReasons),
    isInternshipScam,
    remainingScans: cloudResult.remainingScans,
    intelSummary: localResult.intelSummary || "",
    intelDetails: localResult.intelDetails || [],
    researchSummary: localResult.researchSummary || "",
    researchSources: localResult.researchSources || [],
    researchCoverage: localResult.researchCoverage || ""
  };
}

function applyLegitimacyCalibration(score, senderIntel, localResult, cloudResult) {
  if (!senderIntel || !senderIntel.available) {
    return score;
  }

  const criticalSignals = detectCriticalSignals(localResult, cloudResult);
  if (criticalSignals) {
    return score;
  }

  let calibrated = score;
  const strongTrustedSignal =
    (senderIntel.officialMatch && senderIntel.legitimacyScore >= 75 && (senderIntel.sourcesReachable || 0) >= 2) ||
    TRUSTED_DOMAINS.some((trusted) => String(senderIntel.senderDomain || "").endsWith(trusted));

  if (strongTrustedSignal && Number(senderIntel.webScamSignals || 0) <= 1) {
    calibrated -= 28;
    calibrated = Math.min(calibrated, 42);
  } else if (senderIntel.legitimacyScore >= 80) {
    calibrated -= 14;
  } else if (senderIntel.legitimacyScore >= 65) {
    calibrated -= 8;
  } else if (senderIntel.legitimacyScore <= 35) {
    calibrated += 8;
  }

  return clamp(Math.round(calibrated), 0, 100);
}

function detectCriticalSignals(localResult, cloudResult) {
  const reasons = [
    ...(Array.isArray(localResult?.reasons) ? localResult.reasons : []),
    ...(Array.isArray(cloudResult?.reasons) ? cloudResult.reasons : [])
  ].join(" ").toLowerCase();

  const flags = [
    ...(Array.isArray(localResult?.flags) ? localResult.flags : []),
    ...(Array.isArray(cloudResult?.flags) ? cloudResult.flags : [])
  ].map((flag) => (typeof flag === "string" ? flag : `${flag?.type || ""} ${flag?.detail || ""}`).toLowerCase()).join(" ");

  return /(credential|password|otp|malware|ransomware|attachment-risk|link-risk|redirect-link|urgent-opportunity-fee|blacklisted domain|phishing campaign)/i.test(`${reasons} ${flags}`);
}

function buildCacheKey(sanitized) {
  return [
    sanitized.sender,
    sanitized.subject,
    sanitized.replyTo,
    sanitized.body.slice(0, 400),
    sanitized.urls.slice(0, 5).join("|")
  ].join("::");
}

function choosePreferredSummary(localResult, cloudResult, riskLevel, score, isInternshipScam) {
  if (isInternshipScam && localResult.summary) {
    return localResult.summary;
  }
  if (cloudResult.summary && cloudResult.summary.length > 20) {
    return `${cloudResult.summary} Hybrid score: ${score}/100.`;
  }
  return buildSummary(riskLevel, score, isInternshipScam, localResult.reasons || []);
}

function higherRiskLevel(localRisk, cloudRisk, score) {
  const order = ["safe", "suspicious", "warning", "danger"];
  const localIndex = order.indexOf(localRisk);
  const cloudIndex = order.indexOf(cloudRisk);
  const best = Math.max(localIndex, cloudIndex);
  const scoreRisk = scoreToRiskLevel(score);
  const scoreIndex = order.indexOf(scoreRisk);

  if (best < 0) {
    return scoreRisk;
  }
  if (best === 3 && scoreIndex >= 2) {
    return order[best];
  }
  return order[Math.max(scoreIndex, Math.min(best, 2))];
}

function extractFlagDetails(flags) {
  if (!Array.isArray(flags)) {
    return [];
  }
  return flags.map((flag) => {
    if (typeof flag === "string") {
      return flag;
    }
    return flag?.detail || flag?.reason || "";
  }).filter(Boolean);
}

function normalizeFlags(flags) {
  if (!Array.isArray(flags)) {
    return [];
  }
  return flags.map((flag) => {
    if (typeof flag === "string") {
      return { type: "cloud-signal", detail: flag, weight: 0 };
    }
    return {
      type: flag.type || "cloud-signal",
      detail: flag.detail || flag.reason || "Cloud analysis flag",
      weight: Number(flag.weight || 0)
    };
  });
}

function getDomainFromEmail(value) {
  const match = String(value || "").match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  return match ? match[1].toLowerCase() : "";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
