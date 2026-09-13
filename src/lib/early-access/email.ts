import { AUTERIM_URL } from "@/lib/brand";
import { PLAN_LABELS } from "@/lib/plan-identity";
import { type EarlyAccessSubmission } from "./validation";

export const EARLY_ACCESS_CONFIRMATION_SUBJECT = "Your Auterim early access request";
export const EARLY_ACCESS_CONFIRMATION_PREVIEW = "We received your request. Here’s what happens next.";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function renderEarlyAccessConfirmation(submission: EarlyAccessSubmission): { subject: string; html: string; text: string } {
  const summary = submission.useCase.trim().slice(0, 1200);
  const html = `<!doctype html>
<html lang="en" style="background:#080B10"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${escapeHtml(EARLY_ACCESS_CONFIRMATION_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#080B10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#F6F8FB">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(EARLY_ACCESS_CONFIRMATION_PREVIEW)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#080B10" style="background:#080B10;padding:38px 16px"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px">
<tr><td style="padding:0 4px 20px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;padding-right:10px"><img src="${AUTERIM_URL}/brand/auterim-mark-live.svg" alt="" width="26" height="26" style="display:block;width:26px;height:26px;border:0"></td><td style="vertical-align:middle;font-size:14px;font-weight:700;letter-spacing:.12em;color:#F6F8FB">AUTERIM</td></tr></table></td></tr>
<tr><td bgcolor="#37E6D4" style="height:2px;background:#37E6D4;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td bgcolor="#0B1017" style="background:#0B1017;border:1px solid #1B222C;border-top:0;padding:34px 30px">
<p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:.16em;color:#6F7C8C">EARLY ACCESS</p>
<h1 style="margin:0 0 20px;font-size:25px;font-weight:600;line-height:1.25;letter-spacing:-.02em;color:#F6F8FB">Early access requested</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#A7B1BE">Hi ${escapeHtml(firstName(submission.name))},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#A7B1BE">Your request is in. We’re opening Auterim to a small group of teams before public launch. We’ll review your use case and reach out if it fits the current Early Access program.</p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6F7C8C">You told us you want Auterim to help with:</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 23px"><tr><td style="border-left:2px solid #37E6D4;padding:12px 15px;font-size:14px;line-height:1.65;color:#D4DCE5">“${escapeHtml(summary)}”</td></tr></table>
<p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#F6F8FB">What happens next</p>
<ol style="margin:0 0 22px;padding-left:20px;font-size:14px;line-height:1.8;color:#A7B1BE"><li>We review your use case.</li><li>If there’s a fit, we’ll invite you into Early Access.</li><li>Your trial will only begin when you explicitly choose to start it.</li></ol>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-top:1px solid #1B222C;padding-top:18px;font-size:13px;line-height:1.7;color:#6F7C8C">Auterim<br><span style="color:#A7B1BE">Find the work before your team has to.</span></td></tr></table>
</td></tr>
<tr><td style="padding:18px 5px 0;font-size:11px;line-height:1.6;color:#6F7C8C">You received this because you requested Early Access at auterim.com.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    "AUTERIM",
    "",
    "Early access requested",
    "",
    `Hi ${firstName(submission.name)},`,
    "",
    "Your request is in. We’re opening Auterim to a small group of teams before public launch. We’ll review your use case and reach out if it fits the current Early Access program.",
    "",
    "You told us you want Auterim to help with:",
    `“${summary}”`,
    "",
    "What happens next",
    "1. We review your use case.",
    "2. If there’s a fit, we’ll invite you into Early Access.",
    "3. Your trial will only begin when you explicitly choose to start it.",
    "",
    "Auterim",
    "Find the work before your team has to.",
  ].join("\n");

  return { subject: EARLY_ACCESS_CONFIRMATION_SUBJECT, html, text };
}

export function renderEarlyAccessInternalNotification(submission: EarlyAccessSubmission): { subject: string; text: string } {
  const fields = [
    `Name: ${submission.name}`,
    `Work email: ${submission.email}`,
    `Company: ${submission.company}`,
    `Team size: ${submission.teamSize}`,
    `Role: ${submission.role ?? "Not provided"}`,
    `Interested plan: ${submission.interestedPlan ? PLAN_LABELS[submission.interestedPlan] : "Not specified"}`,
    `Use case: ${submission.useCase}`,
    `Source: ${submission.source}`,
    `Path: ${submission.sourcePath}`,
    `Referrer: ${submission.referrer ?? "Not provided"}`,
    `UTM source: ${submission.utmSource ?? "Not provided"}`,
    `UTM medium: ${submission.utmMedium ?? "Not provided"}`,
    `UTM campaign: ${submission.utmCampaign ?? "Not provided"}`,
    `UTM content: ${submission.utmContent ?? "Not provided"}`,
    `UTM term: ${submission.utmTerm ?? "Not provided"}`,
  ];
  const safeCompany = submission.company.replace(/[\r\n]+/g, " ").slice(0, 160);
  return { subject: `New Early Access request: ${safeCompany}`, text: fields.join("\n") };
}
