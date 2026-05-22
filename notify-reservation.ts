// ============================================================
// MAISON VIE — Edge Function: notify staff and email VIP guest on reservation
// ============================================================
// Deploy:  supabase functions deploy notify-reservation --no-verify-jwt
// Trigger: a Database Webhook on INSERT into public.reservations
//          (Supabase → Database → Webhooks → create → call this function)
// ============================================================
//
// EMAIL PROVIDER:
//   This template uses Resend (https://resend.com) — free 100 emails/day.
//   You can swap it for SendGrid, Mailgun, Postmark, etc. — just change
//   the fetch() blocks marked "EMAIL SENDING".
//
// SECRETS to set (Supabase → Project Settings → Edge Functions → Secrets):
//   RESEND_API_KEY   = re_xxxxxxxx        (from resend.com)
//   NOTIFY_TO        = info@maisonvie.vn  (where bookings are sent)
//   NOTIFY_FROM      = info@maisonvie.vn  (a verified sender on Resend)
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") ?? "info@maisonvie.vn";
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "info@maisonvie.vn";

// Maps for Concierge fields mapping
const SEATING_MAP: Record<string, Record<string, string>> = {
  en: { standard: "Standard Public Dining Room (1st Floor)", private: "Private Dining Room (Subject to Availability, 2nd Floor)", window: "Big Function Room (3rd Floor)" },
  fr: { standard: "Salle à Manger Publique Standard (1er Étage)", private: "Salon Privé (Sous réserve de disponibilité, 2ème Étage)", window: "Grande Salle de Réception (3ème Étage)" },
  vi: { standard: "Sảnh tiệc tiêu chuẩn (Tầng 1)", private: "Phòng riêng (Nếu còn trống, Tầng 2)", window: "Phòng tiệc lớn (Tầng 3)" },
  ja: { standard: "スタンダード一般ダイニング（1階）", private: "個室VIPルーム（空室状況による、2階）", window: "大型マルチファンクションルーム（3階）" }
};

const PURPOSE_MAP: Record<string, Record<string, string>> = {
  en: { fine_dining: "Culinary Appreciation", business: "Business & VIP Entertainment", anniversary: "Anniversary / Birthday Celebration", proposal: "Marriage Proposal 💍" },
  fr: { fine_dining: "Appréciation Gastronomique", business: "Repas d'Affaires & VIP", anniversary: "Célébration d'Anniversaire", proposal: "Demande en Mariage 💍" },
  vi: { fine_dining: "Thưởng Thức Ẩm Thực", business: "Tiếp Khách Quý & Đối Tác", anniversary: "Kỷ Niệm / Sinh Nhật", proposal: "Cầu Hôn 💍" },
  ja: { fine_dining: "お食事の愉しみ", business: "ご接待・ビジネス会食", anniversary: "記念日・お誕生日のお祝い", proposal: "プロポーズ 💍" }
};

const VIP_I18N: Record<string, Record<string, string>> = {
  en: {
    subject: "Maison Vie — Your Invitation to Le Voyage",
    title: "An Invitation to Le Voyage",
    greeting: "Dear {name},",
    body: "We are delighted to receive your reservation request at Maison Vie. Our culinary team, led by Executive Chef Nguyen Thanh, is already preparing to welcome you for an unforgettable dining experience.",
    detailsTitle: "Your Reservation Details",
    dateLabel: "Date",
    timeLabel: "Time",
    guestsLabel: "Number of Guests",
    seatingLabel: "Seating Preference",
    occasionLabel: "Special Occasion",
    statusLabel: "Reservation Status",
    statusPending: "Awaiting Concierge Confirmation",
    note: "Please note that our host will contact you shortly via phone or WhatsApp to finalize your preferences and confirm your reservation.",
    signature: "Warm regards,",
    signer: "The Concierge Team<br>Maison Vie Hanoi"
  },
  fr: {
    subject: "Maison Vie — Votre Invitation pour Le Voyage",
    title: "Une Invitation pour Le Voyage",
    greeting: "Cher/Chère {name},",
    body: "Nous sommes enchantés de recevoir votre demande de réservation chez Maison Vie. Notre équipe culinaire, sous la direction de Chef Exécutif Nguyen Thanh, se prépare déjà à vous accueillir pour une expérience gastronomique inoubliable.",
    detailsTitle: "Vos Détails de Réservation",
    dateLabel: "Date",
    timeLabel: "Heure",
    guestsLabel: "Nombre de Convives",
    seatingLabel: "Préférence de Table",
    occasionLabel: "Occasion",
    statusLabel: "Statut",
    statusPending: "En attente de confirmation par le Concierge",
    note: "Veuillez noter que notre hôte vous contactera sous peu par téléphone ou WhatsApp pour finaliser vos préférences et confirmer votre réservation.",
    signature: "Cordialement,",
    signer: "L'Équipe de Conciergerie<br>Maison Vie Hanoï"
  },
  vi: {
    subject: "Maison Vie — Thư Mời Hành Trình \"Le Voyage\"",
    title: "Thư Mời Hành Trình Le Voyage",
    greeting: "Kính gửi Quý khách {name},",
    body: "Maison Vie trân trọng cảm ơn yêu cầu đặt bàn của Quý khách cho hành trình khám phá tinh hoa ẩm thực Pháp. Đội ngũ phục vụ và Bếp trưởng Nguyễn Thanh của chúng tôi đang chuẩn bị những chuẩn mực cao nhất để mang lại cho Quý khách một buổi tối trọn vẹn.",
    detailsTitle: "Thông Tin Đặt Bàn",
    dateLabel: "Ngày",
    timeLabel: "Giờ",
    guestsLabel: "Số Lượng Khách",
    seatingLabel: "Vị Trí Ưu Thích",
    occasionLabel: "Dịp Đặc Biệt",
    statusLabel: "Trạng Thái",
    statusPending: "Đang Chờ Quản Gia Xác Nhận",
    note: "Quản gia của chúng tôi sẽ liên hệ trực tiếp với Quý khách qua Điện thoại hoặc WhatsApp trong thời gian sớm nhất để hoàn tất chuẩn bị.",
    signature: "Trân trọng,",
    signer: "Đội Ngũ Concierge<br>Maison Vie Hà Nội"
  },
  ja: {
    subject: "Maison Vie — 「Le Voyage」へのご招待",
    title: "Le Voyage へのご招待",
    greeting: "親愛なる {name} 様",
    body: "Maison Vie へのご予約リクエストをいただき、誠にありがとうございます。エグゼクティブ・シェフ グエン・タイン率いる料理チームは、お客様に忘れられない美食体験をお届けするため、すでに準備を進めております。",
    detailsTitle: "ご予約内容",
    dateLabel: "日付",
    timeLabel: "時間",
    guestsLabel: "人数",
    seatingLabel: "お席のご希望",
    occasionLabel: "ご利用目的",
    statusLabel: "ステータス",
    statusPending: "コンシェルジュ確認待ち",
    note: "コンシェルジュ担当より、お席の確認とお好みの詳細について、まもなくお電話またはWhatsAppにてご連絡を差し上げます。",
    signature: "敬具",
    signer: "コンシェルジュチーム一同<br>Maison Vie ハノイ"
  }
};

serve(async (req) => {
  try {
    const payload = await req.json();
    // Database Webhook sends { type, table, record, old_record }
    const r = payload.record ?? payload;

    const lang = r.language && VIP_I18N[r.language] ? r.language : "en";
    const t = VIP_I18N[lang];

    const seatingText = SEATING_MAP[lang][r.seating_preference] ?? SEATING_MAP[lang]["standard"];
    const purposeText = PURPOSE_MAP[lang][r.purpose] ?? PURPOSE_MAP[lang]["fine_dining"];
    const statusText = t.statusPending;

    const dietary = Array.isArray(r.dietary) && r.dietary.length
      ? r.dietary.join(", ")
      : "None";

    // 1. Staff notification layout (simple admin-friendly table)
    const staffSubject = `New Reservation — ${r.name} · ${r.res_date} ${r.res_time}`;
    const staffHtml = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#222">
        <h2 style="color:#C5A55A;border-bottom:1px solid #eee;padding-bottom:8px">
          Maison Vie — New Reservation
        </h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px">
          <tr><td style="padding:6px 0;color:#888;width:140px">Name</td><td><b>${esc(r.name)}</b></td></tr>
          <tr><td style="padding:6px 0;color:#888">Phone</td><td>${esc(r.phone)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td>${esc(r.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Guests</td><td>${esc(String(r.guests))}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Date</td><td>${esc(r.res_date)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Time</td><td>${esc(r.res_time)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Seating Pref</td><td>${esc(seatingText)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Special Occasion</td><td>${esc(purposeText)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Dietary</td><td>${esc(dietary)}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Notes</td><td>${esc(r.notes || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Language</td><td>${esc(r.language || "en")}</td></tr>
        </table>
        <p style="margin-top:20px;font-size:13px;color:#aaa">
          Received ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })} (Hanoi)
        </p>
      </div>`;

    // 2. VIP Guest Letter Layout (Premium gold/dark design)
    const guestHtml = `
      <div style="background-color:#0A0A0A; padding:40px 20px; font-family:'Playfair Display', Georgia, serif; color:#F5F0E8; text-align:center;">
        <div style="max-width:600px; margin:0 auto; border:1px solid #C5A55A; padding:50px 30px; background-color:#121210; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size:24px; letter-spacing:0.25em; text-transform:uppercase; color:#C5A55A; margin-bottom:5px;">Maison Vie</div>
          <div style="font-size:14px; letter-spacing:0.15em; text-transform:uppercase; color:#8A8478; margin-bottom:30px; font-style:italic;">Le Voyage</div>
          <div style="width:40px; height:1px; background-color:#C5A55A; margin:0 auto 30px;"></div>
          
          <h3 style="font-size:20px; color:#C5A55A; font-weight:normal; margin-bottom:20px; letter-spacing:0.05em;">${t.title}</h3>
          
          <div style="font-size:16px; line-height:1.8; color:#B8B0A0; text-align:left; font-family:Georgia, serif; margin-bottom:30px;">
            <p style="margin-bottom:15px; font-weight:bold; color:#F5F0E8;">${t.greeting.replace("{name}", esc(r.name))}</p>
            <p>${t.body}</p>
          </div>
          
          <div style="background-color:#161614; border:1px solid #2A2824; padding:25px; margin-bottom:30px; text-align:left; font-family:Georgia, serif;">
            <h4 style="font-size:15px; color:#C5A55A; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 15px 0; border-bottom:1px solid #2A2824; padding-bottom:8px;">${t.detailsTitle}</h4>
            <table style="width:100%; border-collapse:collapse; font-size:14px; color:#B8B0A0;">
              <tr><td style="padding:6px 0; font-weight:bold; width:150px; color:#8A8478;">${t.dateLabel}</td><td style="color:#F5F0E8;">${esc(r.res_date)}</td></tr>
              <tr><td style="padding:6px 0; font-weight:bold; color:#8A8478;">${t.timeLabel}</td><td style="color:#F5F0E8;">${esc(r.res_time)}</td></tr>
              <tr><td style="padding:6px 0; font-weight:bold; color:#8A8478;">${t.guestsLabel}</td><td style="color:#F5F0E8;">${esc(String(r.guests))}</td></tr>
              <tr><td style="padding:6px 0; font-weight:bold; color:#8A8478;">${t.seatingLabel}</td><td style="color:#F5F0E8;">${esc(seatingText)}</td></tr>
              <tr><td style="padding:6px 0; font-weight:bold; color:#8A8478;">${t.occasionLabel}</td><td style="color:#F5F0E8;">${esc(purposeText)}</td></tr>
              <tr><td style="padding:6px 0; font-weight:bold; color:#8A8478;">${t.statusLabel}</td><td style="color:#C5A55A; font-weight:bold;">${esc(statusText)}</td></tr>
            </table>
          </div>
          
          <p style="font-size:13px; line-height:1.6; color:#8A8478; font-style:italic; font-family:Georgia, serif; margin-bottom:30px; text-align:left;">
            ${t.note}
          </p>
          
          <div style="font-size:15px; line-height:1.6; color:#B8B0A0; text-align:left; font-family:Georgia, serif;">
            <p style="margin-bottom:5px;">${t.signature}</p>
            <p style="font-weight:bold; color:#C5A55A;">${t.signer}</p>
          </div>
          
          <div style="width:100%; height:1px; background-color:#2A2824; margin:40px 0 20px;"></div>
          <div style="font-size:11px; color:#6E6A60; font-family:Georgia, serif;">
            Maison Vie Hanoi · 28 Tang Bat Ho, Hai Ba Trung, Hanoi<br>
            Hotline: +84 904 150 383 · Email: info@maisonvie.vn
          </div>
        </div>
      </div>
    `;

    // ---- EMAIL SENDING (Resend) ----
    if (RESEND_API_KEY) {
      // 1. Dispatch staff notification email
      const staffRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Maison Vie <${NOTIFY_FROM}>`,
          to: [NOTIFY_TO],
          reply_to: r.email,
          subject: staffSubject,
          html: staffHtml,
        }),
      });
      if (!staffRes.ok) {
        const err = await staffRes.text();
        console.error("Staff notification email send failed:", err);
      }

      // 2. Dispatch Guest Invitation Letter (if email exists)
      if (r.email) {
        const guestRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Maison Vie Concierge <${NOTIFY_FROM}>`,
            to: [r.email],
            subject: t.subject,
            html: guestHtml,
          }),
        });
        if (!guestRes.ok) {
          const err = await guestRes.text();
          console.error("VIP guest invitation email send failed:", err);
        }
      }
    } else {
      console.log("No RESEND_API_KEY set — skipping emails. Payload:", r);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
