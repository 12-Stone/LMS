import { createAuthPlugin } from "@agent-native/core/server";
import { signInJourneyInlineScript } from "@agent-native/core/shared";

import { isInvitedEmail } from "../access";

type BetterAuthPlugin = NonNullable<
  NonNullable<NonNullable<Parameters<typeof createAuthPlugin>[0]>["betterAuth"]>["plugins"]
>[number];

// Blocks every account-creation path (email sign-up, magic link, OAuth)
// unless the email is the administrator's or was added in People & Teams.
const inviteOnly = {
  id: "twelve-stone-invite-only",
  init() {
    return {
      options: {
        databaseHooks: {
          user: {
            create: {
              before: async (user: { email?: string }) => {
                if (!user.email || !(await isInvitedEmail(user.email))) return false;
              },
            },
          },
        },
      },
    };
  },
} as unknown as BetterAuthPlugin;

const ASSET = (id: string, width: number) =>
  `https://cdn.builder.io/api/v1/image/assets%2F6a86dc2ea12441c896975357926a568c%2F${id}?format=webp&width=${width}`;
const LOGO = ASSET("4d7566ca72bd4425ad75347e994bc852", 800);
const HERO = ASSET("24cd000f0ccf45aca6531d5588867ffc", 1600);

const loginHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in · Twelve Stone Academy</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root { --charcoal:#1F2523; --limestone:#F4F0E8; --sandstone:#ECE6DA; --slate:#2F4A5A; --gold:#C8A85D; --ink:#2C312F; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body { font-family: Inter, Arial, sans-serif; color: var(--charcoal); background: var(--limestone); }
  .wrap { display: grid; min-height: 100%; grid-template-columns: 1.1fr 1fr; }
  .art { position: relative; background: var(--charcoal) url("${HERO}") center/cover no-repeat; color: var(--limestone); display: flex; flex-direction: column; justify-content: space-between; padding: 40px 48px; }
  .art::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(31,37,35,.85) 0%, rgba(31,37,35,.35) 45%, rgba(31,37,35,.9) 100%); }
  .art > * { position: relative; }
  .logo { width: 240px; mix-blend-mode: lighten; display: block; }
  .art h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; font-size: clamp(36px, 4vw, 56px); line-height: 1.05; margin: 0 0 16px; max-width: 560px; }
  .art h1 em { color: var(--gold); }
  .art p { margin: 0; max-width: 460px; line-height: 1.6; color: rgba(244,240,232,.85); }
  .rule { width: 40px; height: 1px; background: var(--gold); margin-bottom: 20px; }
  .panel { display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
  .card { width: 100%; max-width: 400px; }
  .eyebrow { font-size: 12px; font-weight: 500; letter-spacing: .18em; text-transform: uppercase; color: var(--slate); margin: 0 0 10px; }
  h2 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; font-size: 36px; margin: 0 0 28px; }
  label { display: block; font-size: 13px; font-weight: 500; margin: 0 0 6px; }
  input { width: 100%; height: 46px; border: 1px solid #CFC7B6; background: #FBF9F5; border-radius: 3px; padding: 0 12px; font: inherit; color: var(--charcoal); }
  input:focus { outline: 2px solid var(--slate); outline-offset: 1px; border-color: var(--slate); }
  .field { margin-bottom: 18px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  button.primary { width: 100%; height: 48px; border: 0; border-radius: 3px; background: var(--charcoal); color: var(--limestone); font: 500 15px Inter, Arial, sans-serif; cursor: pointer; margin-top: 6px; }
  button.primary:hover { background: var(--ink); }
  button.primary:disabled { opacity: .6; cursor: default; }
  button.primary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  .link { background: none; border: 0; padding: 0; font: inherit; font-size: 13px; color: var(--slate); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .switch { margin-top: 24px; font-size: 14px; color: #555B58; }
  .hint { font-size: 13px; line-height: 1.5; color: #555B58; margin: -12px 0 20px; }
  .msg { min-height: 20px; margin: 14px 0 0; font-size: 13px; }
  .msg.error { color: #A83A2C; }
  .msg.ok { color: #3D5A40; }
  .foot { font-size: 12px; color: rgba(244,240,232,.7); letter-spacing: .04em; }
  [hidden] { display: none !important; }
  @media (max-width: 860px) {
    .wrap { grid-template-columns: 1fr; }
    .art { padding: 28px 24px; min-height: 260px; }
    .art h1 { font-size: 34px; }
    .art p, .foot { display: none; }
    .panel { padding: 32px 20px 48px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <section class="art">
    <img class="logo" src="${LOGO}" alt="Twelve Stone Digital" />
    <div>
      <div class="rule"></div>
      <h1>A stronger team starts with a stronger <em>foundation.</em></h1>
      <p>Your home for training, practical skills, and the processes that keep our work consistent.</p>
    </div>
    <div class="foot">Twelve Stone Academy · Training &amp; Development Hub</div>
  </section>
  <main class="panel">
    <div class="card">
      <p class="eyebrow" id="eyebrow">Twelve Stone Academy</p>
      <h2 id="title">Sign in</h2>
      <form id="form" novalidate>
        <p class="hint" id="activate-hint" hidden>Use the work email your administrator added, then choose a password of at least 8 characters. Accounts can't be created without an invitation.</p>
        <div class="field" id="name-field" hidden>
          <label for="name">Full name</label>
          <input id="name" name="name" autocomplete="name" />
        </div>
        <div class="field">
          <label for="email">Work email</label>
          <input id="email" name="email" type="email" autocomplete="email" required />
        </div>
        <div class="field" id="password-field">
          <div class="row">
            <label for="password">Password</label>
            <button type="button" class="link" id="forgot">Forgot password?</button>
          </div>
          <input id="password" name="password" type="password" autocomplete="current-password" required minlength="8" />
        </div>
        <button class="primary" id="submit" type="submit">Sign in</button>
        <p class="msg" id="msg" role="status" aria-live="polite"></p>
      </form>
      <p class="switch" id="switch-row">
        <span id="switch-text">Been added by your administrator?</span>
        <button type="button" class="link" id="switch">Activate your account</button>
      </p>
    </div>
  </main>
</div>
<script>${signInJourneyInlineScript()}</script>
<script>
(function () {
  var journey = __anCreateSignInJourney("", "/");
  var resumeHref = journey.journeyForLocation(window.location).resumeHref;
  var mode = "signin";
  var el = function (id) { return document.getElementById(id); };
  var copy = {
    signin: { title: "Sign in", submit: "Sign in", switchText: "Been added by your administrator?", switchLabel: "Activate your account" },
    signup: { title: "Activate your account", submit: "Activate account", switchText: "Already activated?", switchLabel: "Sign in" },
    reset: { title: "Reset your password", submit: "Send reset link", switchText: "Remembered it?", switchLabel: "Back to sign in" }
  };

  fetch("/_agent-native/auth/session", { credentials: "include" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) { if (s && s.email) window.location.replace(resumeHref); })
    .catch(function () {});

  function setMode(next) {
    mode = next;
    var c = copy[mode];
    el("title").textContent = c.title;
    el("submit").textContent = c.submit;
    el("switch-text").textContent = c.switchText;
    el("switch").textContent = c.switchLabel;
    el("name-field").hidden = mode !== "signup";
    el("activate-hint").hidden = mode !== "signup";
    el("password-field").hidden = mode === "reset";
    el("forgot").hidden = mode !== "signin";
    el("password").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
    say("");
  }
  function say(text, kind) {
    var m = el("msg");
    m.textContent = text || "";
    m.className = "msg" + (kind ? " " + kind : "");
  }
  function post(path, body) {
    return fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok && !data.error) data.error = "Something went wrong. Please try again.";
        return data;
      });
    });
  }

  el("switch").addEventListener("click", function () { setMode(mode === "signin" ? "signup" : "signin"); });
  el("forgot").addEventListener("click", function () { setMode("reset"); });

  el("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = el("email").value.trim();
    var password = el("password").value;
    if (!email) return say("Enter your work email.", "error");
    if (mode !== "reset" && password.length < 8) return say("Passwords are at least 8 characters.", "error");
    el("submit").disabled = true;
    say(mode === "reset" ? "Sending…" : "Signing in…");

    var done;
    if (mode === "reset") {
      done = post("/_agent-native/auth/ba/request-password-reset", { email: email, redirectTo: "/_agent-native/auth/reset" })
        .then(function (d) {
          if (d.error) throw new Error(d.error);
          say("If that email has an account, a reset link is on its way.", "ok");
        });
    } else if (mode === "signup") {
      done = post("/_agent-native/auth/register", { email: email, password: password, name: el("name").value.trim() || undefined })
        .then(function (d) {
          if (!(d && d.ok)) throw new Error("We couldn't activate that email. Check that your administrator has added it, or sign in if you've already activated.");
          return post("/_agent-native/auth/login", { email: email, password: password });
        })
        .then(function (d) {
          if (!(d && d.ok)) throw new Error((d && d.error) || "Account created. Please sign in.");
          window.location.replace(resumeHref);
        });
    } else {
      done = post("/_agent-native/auth/login", { email: email, password: password })
        .then(function (d) {
          if (!(d && d.ok)) throw new Error((d && d.error) || "That email and password don't match.");
          window.location.replace(resumeHref);
        });
    }
    done.catch(function (err) { say(err.message, "error"); })
      .then(function () { el("submit").disabled = false; });
  });
})();
</script>
</body>
</html>`;

export default createAuthPlugin({
  loginHtml,
  betterAuth: { plugins: [inviteOnly] },
});
