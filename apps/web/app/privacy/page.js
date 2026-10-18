import Link from 'next/link';
import LegalPage, { Contact, Operator } from '@/components/legal/LegalPage';
import { LEGAL_VERSIONS, legalInfo } from '@/lib/legal';

export const metadata = { title: 'Privacy Policy — Otrelink', description: 'What data Otrelink collects, why, and the choices you have.' };

export default function PrivacyPage() {
  const info = legalInfo();
  return (
    <LegalPage path="/privacy" title="Privacy Policy" version={LEGAL_VERSIONS.privacy}
      intro="This policy explains what personal data Otrelink collects about account holders and about the people who visit Otrelink pages, why we use it, who we share it with, and the choices and rights you have. We do not sell personal data, and we do not use it for targeted advertising.">
      <h2>1. Who is responsible</h2>
      <p>Otrelink is operated by <Operator />. For your account data, we decide how it is used (we are the “controller”). For the data that your visitors send through your pages (bookings, orders, survey answers, reviews, loyalty cards), the page owner is the controller and we process it on the owner’s behalf. Contact for privacy matters: <Contact />.</p>

      <h2>2. Data we collect</h2>
      <h3>If you have an account</h3>
      <ul>
        <li><strong>Account details:</strong> email address, display name, username, your password (stored only as a secure hash), language and time zone settings.</li>
        <li><strong>Your content:</strong> everything you put on your pages, including images and files you upload.</li>
        <li><strong>Plan and payments:</strong> your plan, the status of your subscription, and a record of each payment (date, amount, provider, invoice number). Card and PayPal details are collected by Stripe and PayPal, not by us.</li>
        <li><strong>Consent records:</strong> when you accept our Terms and this policy we store the version of each document, the date and time, your IP address and your browser’s user agent, as proof of the agreement.</li>
        <li><strong>Security data:</strong> your IP address is used briefly to limit repeated sign-in or sign-up attempts and to protect the service from abuse.</li>
        <li><strong>Referrals and API tokens</strong>, if you use them, and push notification subscriptions if you turn notifications on.</li>
        <li><strong>Messages</strong> you send us.</li>
      </ul>
      <h3>If you visit an Otrelink page</h3>
      <ul>
        <li><strong>Visit statistics for the page owner:</strong> the pages you view and the links you click, the website that sent you (domain only), the type of device, operating system and browser (worked out from your browser’s user agent), your language, local time, and an approximate location (country, region, city, rounded to about 1 km). The approximate location comes from free IP geolocation services that your browser contacts directly (GeoJS, ipwho.is or ipapi.co); <strong>we never store your IP address</strong> in these statistics.</li>
        <li><strong>A random visitor ID</strong> stored in your browser so a returning visit is counted once. See the <Link href="/cookies">Cookie Policy</Link>.</li>
        <li><strong>What you choose to send:</strong> for example your name, email or phone when you book an appointment, place an order, answer a survey, write a review, get a loyalty card or ask for notifications. This information goes to the page owner.</li>
        <li><strong>Push notifications from a page, only if you subscribe:</strong> after you tick the consent box and allow notifications in your browser, we store the push address your browser gives us (a random URL from your browser’s push service, with its encryption keys), the topics you picked, your language, where you subscribed (button, link or QR code) and the date and version of your consent. We don’t ask for your name, email or phone, and the page owner never sees your push address, only how many people subscribed. We count how many people tap each notification, without recording who.</li>
        <li><strong>Reports about a page:</strong> if you report a page from its footer, we keep the reason, your comment and, only if you give it, your email to answer you. The page owner doesn’t see who sent it.</li>
      </ul>
      <p><strong>Visitors in the European Economic Area, the United Kingdom and Switzerland, and visitors whose browser sends a Global Privacy Control signal:</strong> we do not store the visitor ID or contact the geolocation services. Visits are still counted, without identifying returning visitors, and the location is estimated from the time zone only.</p>

      <h2>3. How we use data, and why</h2>
      <table>
        <thead><tr><th>Use</th><th>Legal basis (for visitors from the EU/UK)</th></tr></thead>
        <tbody>
          <tr><td>Create and run your account and pages, show them to visitors</td><td>Performing our contract with you</td></tr>
          <tr><td>Process payments, send invoices and payment notices</td><td>Contract; legal obligations (tax and accounting)</td></tr>
          <tr><td>Send account emails (confirm your email, security, changes to these documents)</td><td>Contract; legitimate interest in keeping accounts secure</td></tr>
          <tr><td>Visit statistics for page owners</td><td>Legitimate interest of the page owner in understanding their audience, using minimal data</td></tr>
          <tr><td>Features your visitors use (bookings, orders, reviews…)</td><td>On behalf of the page owner, who must have their own basis</td></tr>
          <tr><td>Deliver push notifications a visitor subscribed to</td><td>Consent, which can be withdrawn at any time</td></tr>
          <tr><td>Prevent fraud, spam and abuse; keep the service secure</td><td>Legitimate interest; legal obligations</td></tr>
          <tr><td>Keep proof of your acceptance of our Terms and policies</td><td>Legitimate interest in being able to prove the agreement</td></tr>
          <tr><td>Improve Otrelink using aggregated, non-identifying information</td><td>Legitimate interest</td></tr>
        </tbody>
      </table>
      <p>We do not use your data to make decisions that have legal or similarly significant effects on you solely by automated means.</p>

      <h2>4. Who we share data with</h2>
      <p>We share personal data only with providers that help us run Otrelink, under contracts that limit their use of it, and only as needed:</p>
      <ul>
        <li><strong>Hosting, database and file storage</strong> (Railway, Cloudflare Pages and R2, MongoDB Atlas) to store and serve the app, your pages and the files you upload.</li>
        <li><strong>Payments:</strong> Stripe and PayPal.</li>
        <li><strong>Email delivery:</strong> Resend, for account and booking emails.</li>
        <li><strong>Browser push services</strong> (Google, Apple, Mozilla, Microsoft) to deliver notifications you turned on.</li>
        <li><strong>IP geolocation services</strong> (GeoJS, ipwho.is, ipapi.co), contacted directly by the visitor’s browser, as described above.</li>
        <li><strong>Fonts and maps:</strong> Google Fonts serves the typefaces, and map tiles come from OpenStreetMap or Esri; these services receive the visitor’s IP address when the browser loads them.</li>
        <li><strong>Content added by page owners</strong> (YouTube, Spotify, Google Maps, SoundCloud and others) is loaded from those services, which may collect data under their own policies.</li>
        <li><strong>Page owners</strong> receive what their visitors send them and the visit statistics of their pages.</li>
        <li><strong>Explore:</strong> if a page owner turns on “Show my page in Explore”, the page’s name, username and profile picture appear in the Explore list in the footer of Otrelink pages.</li>
        <li><strong>Authorities</strong>, when the law requires it, or to protect the rights, safety and property of people or of Otrelink.</li>
        <li>A buyer or successor, if the business is sold or merged, under the same protections.</li>
      </ul>
      <p>We do not sell personal data and do not share it for cross-context behavioral advertising.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Account data and your pages: while your account exists. When you delete your account they are deleted right away from our database (copies in backups expire within a limited time).</li>
        <li>Visit statistics: up to 180 days. Pickup orders: up to 180 days.</li>
        <li>Our copy of your payment records and invoices is deleted with your account; Stripe and PayPal keep their own records as the law requires them to.</li>
        <li>Consent records: for 5 years after your account is closed (the time in which a contract claim can be brought under Florida law), then deleted.</li>
        <li>Push notification subscriptions: until you unsubscribe, your browser’s push service reports the address is no longer valid, or the page is deleted. Then they are deleted right away.</li>
        <li>Security records (rate limits): minutes to days.</li>
      </ul>

      <h2>6. How we protect data</h2>
      <p>We use encryption in transit (HTTPS), hashed passwords, signed sessions in secure cookies, access controls and rate limits, and we keep data collection to a minimum. No system is perfectly secure; if a breach of security affects your personal information, we will notify you and the authorities as required by law, including the Florida Information Protection Act (within 30 days where it applies).</p>

      <h2>7. Your choices and rights</h2>
      <ul>
        <li><strong>See, correct and export:</strong> you can see and edit your account details and pages in the dashboard, and export your pages.</li>
        <li><strong>Delete:</strong> you can delete your account at any time in your account settings.</li>
        <li><strong>Visitor statistics:</strong> visitors can clear site data in their browser, block storage, or turn on Global Privacy Control to stop the visitor ID and geolocation.</li>
        <li><strong>Push notifications:</strong> tap the page’s notifications button and choose “Unsubscribe”, change your topics there, or turn notifications off for the site in your browser settings.</li>
        <li><strong>Emails:</strong> we only send emails needed for your account; we will ask before sending marketing emails, and every marketing email will include a way to unsubscribe.</li>
      </ul>
      <p>Depending on where you live (for example in the European Union, the United Kingdom or certain U.S. states), you may also have the right to access, correct, delete or port your data, to object to or restrict certain processing, to withdraw consent, and to not be discriminated against for using these rights. Write to <Contact /> and we will answer within the time the law allows (normally 30 to 45 days). We may need to verify your identity. If you are in the EU or UK you can also complain to your data protection authority.</p>
      <p>If you are a visitor and your request is about data you sent to a page owner (a booking, an order, a survey), please contact the page owner first; we will help them answer.</p>

      <h2>8. Do Not Track and Global Privacy Control</h2>
      <p>Browsers’ “Do Not Track” setting has no common standard, so we do not respond to it differently. We do honor the <strong>Global Privacy Control</strong> (GPC) signal on Otrelink pages: when it is on, we do not store a visitor ID or contact IP geolocation services. Otrelink does not track you across other websites.</p>

      <h2>9. Children</h2>
      <p>Otrelink accounts are for people who are {info.minAge} or older. Otrelink is not directed to children under 13 and we do not knowingly collect personal data from them. If you believe a child has given us personal data, contact us and we will delete it.</p>

      <h2>10. International transfers</h2>
      <p>Otrelink is run from the United States and our providers may process data in the United States and other countries. When we transfer personal data from the EU, the UK or Switzerland, we rely on safeguards the law recognizes, such as the providers’ standard contractual clauses or their certification under the Data Privacy Framework.</p>

      <h2>11. Changes to this policy</h2>
      <p>We will post any change on this page with a new date. If a change is material, we will tell account holders by email or in the dashboard before it takes effect and ask them to review it.</p>

      <h2>12. Contact</h2>
      <p>Privacy questions or requests: <Contact />. Postal address: {info.address}.</p>
    </LegalPage>
  );
}
