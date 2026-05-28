const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const YEAR = new Date().getFullYear();

// ─── Layout commun ─────────────────────────────────────────────────────────────
function buildEmail({ title, preheader, body, footerExtra = '' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#111118;border-radius:20px;border:1px solid rgba(201,169,97,0.18);overflow:hidden;">

          <!-- Header logo -->
          <tr>
            <td style="padding:28px 40px 22px;text-align:center;border-bottom:1px solid rgba(201,169,97,0.10);">
              <span style="font-size:26px;color:#C9A961;vertical-align:middle;">⬡</span>
              <span style="display:inline-block;margin-left:8px;font-size:18px;font-weight:700;letter-spacing:4px;color:#FFFFFF;vertical-align:middle;">ONLIST</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px 26px;text-align:center;border-top:1px solid rgba(201,169,97,0.10);">
              <p style="margin:0 0 6px;color:#A0A0B0;font-size:13px;font-weight:600;">L'équipe ONLIST</p>
              <p style="margin:0;color:#505060;font-size:12px;">
                <a href="mailto:hello@onlist.club" style="color:#C9A961;text-decoration:none;">hello@onlist.club</a>
                &nbsp;|&nbsp;
                <a href="https://onlist.club" style="color:#C9A961;text-decoration:none;">onlist.club</a>
                ${footerExtra}
              </p>
              <p style="margin:12px 0 0;color:#303040;font-size:11px;">© ${YEAR} ONLIST — Email automatique</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Styles réutilisables en inline
const P = 'margin:0 0 18px;color:#B0B0C0;font-size:15px;line-height:1.75;';
const P_LAST = 'margin:0;color:#B0B0C0;font-size:15px;line-height:1.75;';
const H1 = 'margin:0 0 24px;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;';
const BADGE_GREEN = 'display:inline-block;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#4ADE80;margin-bottom:20px;';
const BADGE_RED = 'display:inline-block;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#F87171;margin-bottom:20px;';
const BULLET = 'margin:0 0 10px;color:#B0B0C0;font-size:15px;line-height:1.75;padding-left:4px;';

// ─── 1. Influenceur ACCEPTÉ ────────────────────────────────────────────────────
async function sendInfluencerValidatedEmail({ to, name }) {
  const firstName = (name || '').split(' ')[0] || 'toi';
  const html = buildEmail({
    title: 'Tu es sur la liste — ONLIST',
    preheader: 'Ton profil a été sélectionné. Tu fais désormais partie des premiers créateurs ONLIST.',
    body: `
      <div style="${BADGE_GREEN}">COMPTE ACTIVÉ</div>
      <h1 style="${H1}">Tu es sur la liste. 🔒</h1>
      <p style="${P}">Bonjour ${firstName},</p>
      <p style="${P}">
        Bonne nouvelle — ton profil a été sélectionné et tu fais désormais partie des premiers créateurs ONLIST.
      </p>
      <p style="${P}">
        Dès maintenant, tu peux accéder à la plateforme et découvrir les expériences disponibles près de chez toi.
        Restaurants gastronomiques, lounges, rooftops, spas, hôtels boutique — tu postules aux événements qui t'inspirent,
        le lieu te choisit, et tu vis l'expérience gratuitement en échange de ton contenu.
      </p>

      <!-- Encart infos -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:rgba(201,169,97,0.06);border:1px solid rgba(201,169,97,0.18);border-radius:12px;padding:20px 24px;">
            <p style="margin:0 0 12px;color:#C9A961;font-size:13px;font-weight:700;letter-spacing:0.5px;">QUELQUES INFOS POUR BIEN DÉMARRER</p>
            <p style="${BULLET}">• Complète ton profil pour maximiser tes chances d'être sélectionné</p>
            <p style="${BULLET}">• Les premières expériences sont disponibles à Paris dès le lancement</p>
            <p style="margin:0;color:#B0B0C0;font-size:15px;line-height:1.75;padding-left:4px;">• De nouvelles villes ouvrent très prochainement — Abidjan, Dakar, Marrakech, Kinshasa, Lagos</p>
          </td>
        </tr>
      </table>

      <p style="${P}">
        Une dernière chose — si tu connais des créateurs de contenu qui méritent d'être sur ONLIST, n'hésite pas à leur parler de nous.
        La plateforme grandit par cooptation et les meilleurs profils sont toujours les bienvenus.
      </p>
      <p style="${P_LAST}">Bienvenue dans le cercle. 🔒</p>
    `,
    footerExtra: '&nbsp;|&nbsp;<a href="https://instagram.com/onlist_app" style="color:#C9A961;text-decoration:none;">@onlist_app</a>',
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: 'Tu es sur la liste. 🔒',
    html,
  });
}

// ─── 2. Influenceur REFUSÉ ────────────────────────────────────────────────────
async function sendInfluencerRejectedEmail({ to, name }) {
  const firstName = (name || '').split(' ')[0] || '';
  const greet = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const html = buildEmail({
    title: 'Votre candidature ONLIST',
    preheader: 'Merci d\'avoir rejoint la communauté ONLIST.',
    body: `
      <div style="${BADGE_RED}">CANDIDATURE</div>
      <h1 style="${H1}">Votre candidature ONLIST</h1>
      <p style="${P}">${greet}</p>
      <p style="${P}">
        Merci d'avoir rejoint la communauté ONLIST et de l'intérêt que vous portez à notre plateforme.
      </p>
      <p style="${P}">
        Après examen de votre profil, nous ne sommes pas en mesure de vous accorder un accès à cette étape.
        Au vu du volume de candidatures reçues en ce moment et de nos critères de sélection actuels,
        votre profil ne correspond pas encore aux attentes que nous avons définies pour cette phase de lancement.
      </p>
      <p style="${P}">
        Cela ne remet pas en question la qualité de votre travail — ONLIST évolue, et les critères de sélection évolueront avec elle.
      </p>
      <p style="${P_LAST}">
        Vous êtes libre de soumettre à nouveau votre candidature dans les prochaines semaines. Nous serons ravis de reconsidérer votre profil.
      </p>
    `,
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: 'Votre candidature ONLIST',
    html,
  });
}

// ─── 3. Établissement ACCEPTÉ ─────────────────────────────────────────────────
async function sendBusinessValidatedEmail({ to, businessName }) {
  const name = businessName || 'votre établissement';
  const html = buildEmail({
    title: 'Votre établissement rejoint ONLIST',
    preheader: 'Votre établissement a été sélectionné et fait désormais partie du réseau ONLIST.',
    body: `
      <div style="${BADGE_GREEN}">ÉTABLISSEMENT ACTIVÉ</div>
      <h1 style="${H1}">Votre établissement rejoint ONLIST 🔒</h1>
      <p style="${P}">Bonjour,</p>
      <p style="${P}">
        <strong style="color:#FFFFFF;">${name}</strong> a été sélectionné et fait désormais partie du réseau ONLIST.
      </p>
      <p style="${P}">
        Vous pouvez dès maintenant créer votre premier événement et commencer à recevoir des candidatures de créateurs lifestyle qualifiés.
        Stories, reels, avis Google — votre établissement gagne en visibilité sans frais de production.
      </p>
      <p style="${P}">
        Pendant cette phase de lancement, votre accès est entièrement gratuit. Profitez-en pour tester la plateforme et mesurer l'impact sur votre visibilité.
      </p>

      <!-- Encart villes -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:rgba(201,169,97,0.06);border:1px solid rgba(201,169,97,0.18);border-radius:12px;padding:20px 24px;">
            <p style="margin:0 0 8px;color:#C9A961;font-size:13px;font-weight:700;letter-spacing:0.5px;">EXPANSION EN COURS</p>
            <p style="margin:0;color:#B0B0C0;font-size:15px;line-height:1.75;">
              ONLIST est actif à Paris et s'étend rapidement — Abidjan, Dakar, Marrakech, Kinshasa, Lagos.
              En rejoignant aujourd'hui vous faites partie d'un réseau premium qui grandit à l'international.
            </p>
          </td>
        </tr>
      </table>

      <p style="${P}">
        Si vous gérez d'autres établissements ou connaissez des lieux premium qui correspondraient à notre sélection, nous serions ravis d'en discuter.
      </p>
      <p style="${P_LAST}">À très bientôt sur ONLIST. 🔒</p>
    `,
    footerExtra: '&nbsp;|&nbsp;<a href="https://instagram.com/onlist_app" style="color:#C9A961;text-decoration:none;">@onlist_app</a>',
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: 'Votre établissement rejoint ONLIST 🔒',
    html,
  });
}

// ─── 4. Établissement REFUSÉ ──────────────────────────────────────────────────
async function sendBusinessRejectedEmail({ to, businessName }) {
  const name = businessName || 'votre établissement';
  const html = buildEmail({
    title: 'Votre demande de partenariat ONLIST',
    preheader: 'Merci d\'avoir soumis votre établissement sur ONLIST.',
    body: `
      <div style="${BADGE_RED}">DEMANDE DE PARTENARIAT</div>
      <h1 style="${H1}">Votre demande de partenariat ONLIST</h1>
      <p style="${P}">Bonjour,</p>
      <p style="${P}">
        Merci d'avoir soumis <strong style="color:#FFFFFF;">${name}</strong> sur ONLIST et de l'intérêt que vous portez à notre plateforme.
      </p>
      <p style="${P}">
        Après examen de votre profil, nous ne sommes pas en mesure de valider votre accès à cette étape.
        Dans le cadre de notre phase de lancement, nous constituons un cercle restreint d'établissements partenaires
        et travaillons avec un nombre limité de lieux pour garantir la meilleure expérience possible à nos créateurs.
      </p>
      <p style="${P}">
        Votre établissement pourra être reconsidéré lors de notre prochaine phase d'expansion.
        N'hésitez pas à nous recontacter ou à soumettre à nouveau votre demande ultérieurement.
      </p>
      <p style="${P_LAST}">Nous espérons avoir l'occasion de collaborer avec vous prochainement.</p>
    `,
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: 'Votre demande de partenariat ONLIST',
    html,
  });
}

// ─── Reset code ───────────────────────────────────────────────────────────────
async function sendResetCodeEmail({ to, code, name }) {
  const html = buildEmail({
    title: 'Réinitialisation de mot de passe — ONLIST',
    preheader: 'Votre code de réinitialisation ONLIST.',
    body: `
      <p style="margin:0 0 8px;color:#A0A0B0;font-size:14px;">Bonjour${name ? ' ' + name : ''},</p>
      <h1 style="${H1}">Réinitialisation de<br/>votre mot de passe</h1>
      <p style="${P}">
        Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td align="center">
            <div style="display:inline-block;background:rgba(201,169,97,0.08);border:1px solid rgba(201,169,97,0.35);border-radius:14px;padding:22px 44px;">
              <span style="font-size:44px;font-weight:700;letter-spacing:14px;color:#C9A961;font-family:'Courier New',monospace;">${code}</span>
            </div>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#505060;font-size:13px;text-align:center;">
        Ce code expire dans <strong style="color:#A0A0B0;">15 minutes</strong>.<br/>
        Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    `,
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: `${code} – Votre code de réinitialisation ONLIST`,
    html,
  });
}

// ─── 5. Bienvenue — Influenceur (en attente) ──────────────────────────────────
async function sendWelcomeInfluencerEmail({ to, name }) {
  const firstName = (name || '').split(' ')[0] || 'toi';
  const html = buildEmail({
    title: 'Ta demande est bien reçue — ONLIST',
    preheader: 'Notre équipe examine ton profil. Tu recevras une notification dès que ton accès est activé.',
    body: `
      <div style="display:inline-block;background:rgba(201,169,97,0.1);border:1px solid rgba(201,169,97,0.25);border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#C9A961;margin-bottom:20px;">DEMANDE REÇUE</div>
      <h1 style="${H1}">Ta demande est bien reçue, ${firstName} ✦</h1>
      <p style="${P}">
        Notre équipe a bien reçu ton dossier et examine ton profil en ce moment. Tu recevras un email dès que ton accès est activé — en général sous <strong style="color:#FFFFFF;">24 à 48h</strong>.
      </p>

      <!-- Timeline simple -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
        <tr>
          <td style="background:rgba(201,169,97,0.06);border:1px solid rgba(201,169,97,0.15);border-radius:14px;padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="display:inline-block;width:22px;height:22px;background:#4ADE80;border-radius:11px;text-align:center;line-height:22px;font-size:12px;vertical-align:middle;">✓</span>
                  <span style="margin-left:10px;color:#FFFFFF;font-size:14px;font-weight:600;vertical-align:middle;">Inscription complète</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="display:inline-block;width:22px;height:22px;background:rgba(201,169,97,0.3);border-radius:11px;text-align:center;line-height:22px;font-size:10px;color:#C9A961;vertical-align:middle;">●</span>
                  <span style="margin-left:10px;color:#C9A961;font-size:14px;font-weight:600;vertical-align:middle;">Vérification du profil en cours...</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style="display:inline-block;width:22px;height:22px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:11px;text-align:center;line-height:20px;font-size:10px;color:#606070;vertical-align:middle;">🔒</span>
                  <span style="margin-left:10px;color:#606070;font-size:14px;vertical-align:middle;">Accès à l'application</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="${P}">
        En attendant, prépare ton profil : plus il est complet (photos, réseaux, bio), plus tu as de chances d'être sélectionné rapidement par les établissements.
      </p>
      <p style="${P_LAST}">À très bientôt dans le cercle. 🔒</p>
    `,
    footerExtra: '&nbsp;|&nbsp;<a href="https://instagram.com/onlist_app" style="color:#C9A961;text-decoration:none;">@onlist_app</a>',
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: 'Ta demande est bien reçue ✦',
    html,
  });
}

// ─── 6. Bienvenue — Établissement (en attente) ────────────────────────────────
async function sendWelcomeBusinessEmail({ to, businessName }) {
  const name = businessName || 'votre établissement';
  const html = buildEmail({
    title: 'Votre demande a bien été reçue — ONLIST',
    preheader: 'Notre équipe examine votre dossier. Vous recevrez un email dès que votre accès est activé.',
    body: `
      <div style="display:inline-block;background:rgba(201,169,97,0.1);border:1px solid rgba(201,169,97,0.25);border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#C9A961;margin-bottom:20px;">DEMANDE REÇUE</div>
      <h1 style="${H1}">Votre demande est bien reçue</h1>
      <p style="${P}">Bonjour,</p>
      <p style="${P}">
        Votre demande de partenariat pour <strong style="color:#FFFFFF;">${name}</strong> a bien été enregistrée.
        Notre équipe examine votre dossier et reviendra vers vous sous <strong style="color:#FFFFFF;">24 à 48h</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
        <tr>
          <td style="background:rgba(201,169,97,0.06);border:1px solid rgba(201,169,97,0.15);border-radius:14px;padding:20px 24px;">
            <p style="margin:0 0 10px;color:#C9A961;font-size:13px;font-weight:700;letter-spacing:0.5px;">CE QUI VOUS ATTEND</p>
            <p style="${BULLET}">• Accédez à un vivier de créateurs lifestyle qualifiés</p>
            <p style="${BULLET}">• Créez vos événements et recevez des candidatures</p>
            <p style="margin:0;color:#B0B0C0;font-size:15px;line-height:1.75;padding-left:4px;">• Gagnez en visibilité sans frais de production (Stories, Reels, avis Google)</p>
          </td>
        </tr>
      </table>

      <p style="${P}">
        Pendant cette phase de lancement, l'accès à la plateforme est entièrement gratuit.
        Nous avons hâte de vous compter parmi nos établissements partenaires.
      </p>
      <p style="${P_LAST}">À très bientôt sur ONLIST. 🔒</p>
    `,
    footerExtra: '&nbsp;|&nbsp;<a href="https://instagram.com/onlist_app" style="color:#C9A961;text-decoration:none;">@onlist_app</a>',
  });

  await transporter.sendMail({
    from: `"ONLIST" <${process.env.SMTP_FROM || 'hello@onlist.club'}>`,
    to,
    subject: 'Votre demande de partenariat ONLIST a bien été reçue',
    html,
  });
}

module.exports = {
  sendResetCodeEmail,
  sendInfluencerValidatedEmail,
  sendInfluencerRejectedEmail,
  sendBusinessValidatedEmail,
  sendBusinessRejectedEmail,
  sendWelcomeInfluencerEmail,
  sendWelcomeBusinessEmail,
};
