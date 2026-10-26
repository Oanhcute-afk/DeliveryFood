// Màu và bố cục lấy theo màn hình login/register của app mobile
const CONTACT_EMAIL = 'oanht487@gmail.com';
const LAST_UPDATED = 'October 26, 2026';

const LOGO_SVG = `
<svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4 10.5C4 6.9 7.6 4 12 4s8 2.9 8 6.5H4Z" fill="#FFFFFF"/>
  <rect x="3" y="12" width="18" height="2.4" rx="1.2" fill="#FFFFFF"/>
  <path d="M4 16h16v.6C20 18.5 18.5 20 16.6 20H7.4C5.5 20 4 18.5 4 16.6V16Z" fill="#FFFFFF"/>
  <circle cx="9" cy="7.6" r=".7" fill="#FF6B35"/>
  <circle cx="12.5" cy="6.6" r=".7" fill="#FF6B35"/>
  <circle cx="15" cy="8.2" r=".7" fill="#FF6B35"/>
</svg>`;

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #FFF9F5;
    color: #29232A;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  a { color: #FF6B35; font-weight: 700; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .container { max-width: 760px; margin: 0 auto; padding: 40px 20px 32px; }
  .brand { display: flex; flex-direction: column; align-items: center; margin-bottom: 32px; }
  .logo {
    width: 72px; height: 72px; border-radius: 24px; background: #FF6B35;
    display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
    box-shadow: 0 8px 18px rgba(255, 107, 53, 0.25);
  }
  .brand-name { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
  .brand-name span { color: #FF6B35; }
  .caption { font-size: 10px; font-weight: 700; color: #A49AA0; letter-spacing: 3px; margin-top: 4px; }
  nav { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
  nav a {
    font-size: 13px; color: #393039; background: #FFFFFF; border: 1px solid #F0E8E3;
    border-radius: 999px; padding: 8px 16px;
  }
  nav a.active { background: #FF6B35; border-color: #FF6B35; color: #FFFFFF; }
  nav a:hover { text-decoration: none; }
  h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.8px; margin-bottom: 6px; }
  .subtitle { font-size: 14px; color: #8B8289; margin-bottom: 24px; }
  .card {
    background: #FFFFFF; border: 1px solid #F0E8E3; border-radius: 16px;
    padding: 20px 22px; margin-bottom: 14px;
  }
  .card h2 { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #29232A; }
  .card p, .card li { font-size: 14px; color: #4A4249; }
  .card p + p { margin-top: 8px; }
  .card ul { padding-left: 20px; margin-top: 6px; }
  .card li + li { margin-top: 4px; }
  .roles { display: grid; gap: 10px; margin-bottom: 24px; }
  .role {
    display: flex; align-items: center; gap: 14px; background: #FFFFFF;
    border: 1px solid #F0E8E3; border-radius: 15px; padding: 14px;
  }
  .role-icon {
    width: 44px; height: 44px; border-radius: 13px; background: #FFF0E8;
    display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
  }
  .role strong { display: block; font-size: 14px; color: #393039; }
  .role small { font-size: 12px; color: #8B8289; }
  footer {
    text-align: center; font-size: 12px; color: #A49AA0; margin-top: 32px;
  }
  footer .heart { color: #FF6B35; }
`;

type Page = 'home' | 'privacy' | 'terms';

function layout(active: Page, title: string, body: string) {
  const link = (page: Page, href: string, label: string) =>
    `<a href="${href}"${active === page ? ' class="active"' : ''}>${label}</a>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · delifood</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">
    <header class="brand">
      <div class="logo">${LOGO_SVG}</div>
      <div class="brand-name">deli<span>food</span></div>
      <div class="caption">GOOD FOOD, GOOD MOOD.</div>
    </header>
    <nav>
      ${link('home', '/', 'Home')}
      ${link('privacy', '/privacy', 'Privacy Policy')}
      ${link('terms', '/terms', 'Terms of Service')}
    </nav>
    <main>${body}</main>
    <footer>
      <p><span class="heart">&#9829;</span> Made with love for food lovers</p>
      <p>&copy; ${new Date().getFullYear()} delifood · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    </footer>
  </div>
</body>
</html>`;
}

export function homePage() {
  return layout(
    'home',
    'Home',
    `
    <h1>Welcome to delifood</h1>
    <p class="subtitle">Discover delicious food near you, delivered fast.</p>

    <div class="roles">
      <div class="role">
        <div class="role-icon">&#127828;</div>
        <div><strong>Customer</strong><small>Order delicious food from local restaurants</small></div>
      </div>
      <div class="role">
        <div class="role-icon">&#127869;</div>
        <div><strong>Restaurant Owner</strong><small>Manage your restaurant, menu and orders</small></div>
      </div>
      <div class="role">
        <div class="role-icon">&#128690;</div>
        <div><strong>Driver</strong><small>Deliver orders and earn</small></div>
      </div>
    </div>

    <div class="card">
      <h2>About the app</h2>
      <p>delifood is a food delivery mobile app connecting customers, restaurants and
      delivery drivers. You can sign in with your email and password or with your Google account.</p>
    </div>
  `,
  );
}

export function privacyPage() {
  return layout(
    'privacy',
    'Privacy Policy',
    `
    <h1>Privacy Policy</h1>
    <p class="subtitle">Last updated: ${LAST_UPDATED}</p>

    <div class="card">
      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> your first name, last name, email address and the role you choose (customer, restaurant owner or driver).</li>
        <li><strong>Google Sign-In:</strong> if you sign in with Google, we receive your name, email address and Google account ID. We do not receive your Google password.</li>
        <li><strong>Order information:</strong> items you order, delivery addresses and order history.</li>
        <li><strong>Location:</strong> drivers share their location while delivering so customers can track their order.</li>
        <li><strong>Restaurant content:</strong> restaurant details, menus and images uploaded by restaurant owners.</li>
      </ul>
    </div>

    <div class="card">
      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and manage your account and sign you in.</li>
        <li>To place, prepare, deliver and track orders.</li>
        <li>To process payments and show order history and reviews.</li>
      </ul>
      <p>We do not sell your personal information or use it for advertising.</p>
    </div>

    <div class="card">
      <h2>3. Third-party services</h2>
      <p>We use trusted providers to run the app: Google (sign-in), Stripe (payments — card details are handled by Stripe and never stored on our servers), UploadThing (image storage), Neon (database) and Render (hosting).</p>
    </div>

    <div class="card">
      <h2>4. Data security</h2>
      <p>Passwords are stored as one-way hashes, and data is transmitted over HTTPS. No method of storage or transmission is 100% secure, but we take reasonable steps to protect your data.</p>
    </div>

    <div class="card">
      <h2>5. Your rights</h2>
      <p>You can request a copy of your data or ask us to delete your account at any time by emailing
      <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
    </div>

    <div class="card">
      <h2>6. Changes to this policy</h2>
      <p>We may update this policy from time to time. Changes take effect when posted on this page.</p>
    </div>
  `,
  );
}

export function termsPage() {
  return layout(
    'terms',
    'Terms of Service',
    `
    <h1>Terms of Service</h1>
    <p class="subtitle">Last updated: ${LAST_UPDATED}</p>

    <div class="card">
      <h2>1. Acceptance of terms</h2>
      <p>By creating an account or using delifood, you agree to these Terms of Service and our
      <a href="/privacy">Privacy Policy</a>.</p>
    </div>

    <div class="card">
      <h2>2. Accounts</h2>
      <p>You are responsible for keeping your account secure and for the information you provide. Each account has one role: customer, restaurant owner or driver.</p>
    </div>

    <div class="card">
      <h2>3. Orders and payments</h2>
      <p>Prices and availability are set by restaurants. Payments are processed by Stripe. Once a restaurant confirms an order, it may not be possible to cancel it.</p>
    </div>

    <div class="card">
      <h2>4. Restaurant owners and drivers</h2>
      <ul>
        <li>Restaurant owners must provide accurate restaurant information, menus and prices.</li>
        <li>Drivers must deliver orders safely and follow local traffic laws.</li>
      </ul>
    </div>

    <div class="card">
      <h2>5. Acceptable use</h2>
      <p>You agree not to misuse the app, post false reviews, or attempt to access other users' accounts or data.</p>
    </div>

    <div class="card">
      <h2>6. Limitation of liability</h2>
      <p>The app is provided "as is". To the extent permitted by law, we are not liable for indirect damages arising from your use of the app.</p>
    </div>

    <div class="card">
      <h2>7. Contact</h2>
      <p>Questions about these terms? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
    </div>
  `,
  );
}
